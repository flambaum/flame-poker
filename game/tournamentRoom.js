const Room = require(`./room`);
const Poker = require(`./poker`);

const STATE = {
    wait: 0,
    run: 1,
    pause: 2,
    finished: 3
};

const ROUND_STAGE = {
    preflop: 0,
    flop: 1,
    turn: 2,
    river: 3,
    earlyWin: 4
};

class tRoom extends Room{
    constructor(id, options) {
        super(id, options);
        this.options.startTime = Date.now() + 120000;

        this.state = STATE.wait;
        this.players = {};
        this.seats = [];
        this.seatsTaken = 0;
        this.numPlayersInGame = 0;
        this.allInCount = 0;

        this.roundStage = null;
        this.board = [];
        this.pot = 0;
        this.bet = 0;
        this.currentPlayer = null;
        console.log(this);
    }

    getRoom(detailed = true) {
        const result = super.getRoom();

        if (detailed) {
            result.players = Object.keys(this.players);
        }
        return result;
    }

    async _register(player) {
        if (this.isFull) return;

        if (player.name in this.players) return;

        let balance = await player.money;
        console.log(balance, `===1`);
        balance = balance - this.options.buyIn;
        console.log(balance, `===2`);
        if (balance >= 0) {
            this.players[player.name] = player;
            this.seatsTaken += 1;
            if (this.seatsTaken === this.options.numSeats) this.isFull = true;

            player.money = balance;
            player.socket.join(this.id);

            super.notifyAll(`room-changed`, this.getRoom(true));
        }

    }

    async _unregister(player) {
        if (! player.name in this.players) return;

        this.seatsTaken -= 1;
        this.isFull = false;
        delete this.players[player.name];

        player.socket.leave(this.id);

        let balans = await player.money;
        balans += this.options.buyIn;
        player.money = balans;

        super.notifyAll(`room-changed`, this.getRoom(true));
    }

    startTournament() {
        if (this.state !== STATE.wait) return;
        this.state = STATE.run;

        for (const name in this.players) {
            const seat = {
                player: this.players[name],
                stack: this.options.runStack,
                isActed: false,
                allIn: false,
                inGame: true,
                seatOut: false,
                hand: [],
                bet: null,
                totalBet: null
            };
            this.seats.push(seat);
        }

        this.button = 0;
        this.bigBlind = this.options.structure[1];

        this.roundGenerator = this.round();
        this.roundGenerator.next();
    }

    * round() {
        this.resetTable(true);

        if (this.numPlayersInGame < 2) return;

        let sb, bb;
        if (this.numPlayersInGame === 2) {
            sb = this.seats[this.button];
            bb = this.seats[this.button + 1];
            this.setCurrentPlayer(this.button + 1);

        } else {
            sb = this.seats[this.button + 1];
            bb = this.seats[this.button + 2];
            this.setCurrentPlayer(this.button + 2);
        }

        this.playerBet(sb, this.bigBlind / 2);
        this.playerBet(bb, this.bigBlind);

        this.deck = Poker.getDeck();
        this.dealCards();

        for (let state = 0; state <= 3; state ++) {
            this.roundStage = state;

            this.dealPublicCards(state);

            if (this.numPlayersInGame - this.allInCount < 2) {
                this.delay(3000);
                yield;
                continue;
            }

            if (state !== ROUND_STAGE.preflop) {
                this.resetTable();
                this.setCurrentPlayer(this.button);
            }

            console.log(`++++Pered krugom torgov state=`, state);

            yield* this.bettingRound();

            if (this.roundStage === ROUND_STAGE.earlyWin) {
                break;
            }

            console.log(`++++Posle kruga torgov, state=`, state);

        }

        this.findingWinner();

        this.button = (this.button + 1) % this.seatsTaken;

        this.seats = this.seats.filter((seat, i) => {
            if (seat.stack === 0) {
                if (this.button > i) this.button--;
                return false;
            }
            return true;
        });

        setTimeout(() => {
            this.roundGenerator = this.round();
            this.roundGenerator.next();
        }, 5000)

    }

    * bettingRound() {
        while (true) {
            const seat = this.seats[this.currentPlayer];
            seat.player.socket.emit(`expected-action`, {
                m: `Ваше слово?`,
                stack: seat.stack,
                bet: seat.bet,
                pot: this.pot,
            });
            this.actionTimer = setTimeout(this.timeOut.bind(this), 300*1000);

            console.log(`+++запрос ставки, таймер пошел`);

            yield;

            if (this.loopCompletionCheck()) break;

            this.setCurrentPlayer();

            console.log(this);

        }
    }

    _action(player, data) {
        if ( !(player in this.players)) return;

        const seat = this.seats[this.currentPlayer];

        if (seat.player !== player) {
            player.socket.emit(`err`, `Не твой ход`);
            return;
        }

        if (typeof data !== `object`) return;

        switch (data.word) {
            case `fold`:
                seat.inGame = false;
                this.numPlayersInGame--;
                break;

            case `check`:
                break;

            case `call`:
                this.playerBet(seat, this.bet - seat.bet);
                break;

            case `bet`:
                if (data.bet > this.bet) {
                    this.playerBet(seat, data.bet);
                }
                break;
        }

        // Добавить обработку ошибок и неверных действий до этого момента.
        clearTimeout(this.actionTimer);
        seat.isActed = true;

        this.roundGenerator.next();
    }

    findingWinner() {
        if (this.roundStage === ROUND_STAGE.earlyWin) {
            this.seats.forEach((seat) => {
                if (seat.inGame) {
                    seat.stack += this.pot;
                    return;
                }
            })
        }


    }

    resetTable(deep = false) {
        if (deep) {
            this.numPlayersInGame = 0;
            this.allInCount = 0;
            this.pot = 0;
            this.board = [];
            this.deck = [];
        }

        this.bet = 0;

        this.seats.forEach((seat) => {
            if (deep) {
                seat.inGame = !seat.seatOut;
                seat.hand = [];
                seat.allIn = false;
                if (seat.inGame) this.numPlayersInGame++;
            }
            seat.isActed = false;
            seat.bet = 0;

            console.log(`++resetTable `, seat);
        })
    }

    loopCompletionCheck() {
        if (this.numPlayersInGame === 1) {
            this.roundStage = ROUND_STAGE.earlyWin;
            return true;
        }

        return !this.seats.some((seat) => {
            return (seat.inGame && (!seat.isActed || !seat.allIn && seat.bet < this.bet));
        });
    }

    setCurrentPlayer(current = this.currentPlayer) {
        current++;
        for (let i = 0; i < this.seatsTaken; i++) {
            const seatNum = (current + i) % this.seatsTaken;
            const seat = this.seats[seatNum];
            if (seat.inGame && !seat.allIn) {
                this.currentPlayer = seatNum;
                return;
            }
        }

    }

    playerBet(seat, chips) {
        if (chips <= 0) return;
        if (chips >= seat.stack) {
            chips = seat.stack;
            seat.allIn = true;
            this.allInCount++;
        }

        seat.stack -= chips;
        seat.totalBet += chips;
        seat.bet += chips;
        if (this.bet < seat.bet) {
            this.bet = seat.bet;
        }
        this.pot += chips;
    }

    dealCards() {
        for (let i = 0; i <= 1; i++) {
            this.seats.forEach((seat) => {
                seat.hand[i] = seat.inGame ? this.deck.pop() : null;
            })
        }

        this.seats.forEach((seat) => {
            seat.player.socket.emit(`deal-cards`, {hand: seat.inGame ? seat.hand : null});
        })
    }

    dealPublicCards(state) {
        let n;

        if (state === ROUND_STAGE.flop) {
            n = 3;
        } else if (state === ROUND_STAGE.turn || state === ROUND_STAGE.river) {
            n = 1;
        } else return;

        this.deck.pop();
        this.board.push(...this.deck.splice(-n,n));

        this.seats.forEach((seat) => {
            seat.player.socket.emit(`public-cards`, {board: this.board});
        })
    }

    timeOut() {
        const seat = this.seats[this.currentPlayer];
        if (seat.bet < this.bet) {
            seat.inGame = false;
            this.numPlayersInGame--;
        } else {
            seat.isActed = true;
        }
        this.roundGenerator.next();
    }

    delay(ms) {
        setTimeout(() => {
            this.roundGenerator.next();
        }, ms);
    }

}

module.exports = tRoom;