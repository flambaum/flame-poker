const Room = require(`./room`);
const Poker = require(`./poker`);
const messageCenter = require(`./messageCenter`);

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

        if (!options.startTime) this.options.startTime = Date.now() + 300000;

        this.state = STATE.wait;
        this.players = {};
        this.seats = [];
        this.seatsTaken = 0;

        this.button = 0;
        this.allInCount = 0;
        this.needNewPot = false;
        this.roundStage = null;
        this.numPlayersInGame = 0;
        this.board = [];
        this.pots = [];
        this.pot = 0;
        this.bet = 0;
        this.currentPlayer = null;
    }

    getRoom(detailed = true) {
        const result = super.getRoom();
        result.state = this.state;

        if (detailed) {
            result.players = Object.keys(this.players);
        }
        return result;
    }

    getRoomState() {
        let result = {
            currentPlayer: this.currentPlayer,
            roundStage: this.roundStage,
            bigBlind: this.bigBlind,
            button: this.button,
            board: this.board,
            pots: this.pots,
            bet: this.bet,
            seats: {}
        };

        for (const i in this.seats) {
            const seat = this.seats[i];
            result.seats[i] = {
                bet: seat.bet,
                name: seat.player.name,
                stack: seat.stack,
                allIn: seat.allIn,
                inGame: seat.inGame,
                seatOut: seat.seatOut
            };
        }
        return result;
    }

    getPlayersHands() {
        let result = {};
        for (const i in this.seats) {
            const seat = this.seats[i];
            result[i] = seat.inGame ? seat.hand : null;
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

            super.notifyAll(`room-changed`, this.getRoom(true));
        }

    }

    async _unregister(player) {
        if (! player.name in this.players) return;

        this.seatsTaken -= 1;
        this.isFull = false;
        delete this.players[player.name];

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

        let info = this.getRoomState();
        info.options = this.options;
        messageCenter.notifyRoom(this.id, `tournament-start`, info);

        this.roundGenerator = this.round();
        this.roundGenerator.next();
    }

    * round() {
        this.resetTable(true);

        if (this.numPlayersInGame < 2) return;

        let sb, bb;
        if (this.numPlayersInGame === 2) {
            sb = this.seats[this.button];
            bb = this.seats[(this.button + 1) % this.seatsTaken];
            this.setCurrentPlayer(this.button + 1);
        } else {
            sb = this.seats[(this.button + 1) % this.seatsTaken];
            bb = this.seats[(this.button + 2) % this.seatsTaken];
            this.setCurrentPlayer(this.button + 2);
        }

        this.playerBet(sb, this.bigBlind / 2);
        this.playerBet(bb, this.bigBlind);

        messageCenter.notifyRoom(this.id, `new-round`, this.getRoomState());

        this.deck = Poker.getDeck();
        this.dealCards();

        for (let state = 0; state <= 3; state ++) {
            this.roundStage = state;

            this.dealPublicCards(state);

            // messageCenter.notifyRoom(this.id, `new-street`, this.getRoomState());

            // Если все в оллине ставим задержку и пропускаем круг торгов.
            if (this.numPlayersInGame - this.allInCount < 2) {
                messageCenter.notifyRoom(this.id, `new-street`, this.getRoomState());
                messageCenter.notifyRoom(this.id, `all-in`, this.getPlayersHands());

                this.delay(3000);
                yield;
                continue;
            }

            if (state !== ROUND_STAGE.preflop) {
                this.resetTable();
                this.setCurrentPlayer(this.button);
            }

            messageCenter.notifyRoom(this.id, `new-street`, this.getRoomState());

            console.log(`++++Pered krugom torgov state=`, state);

            yield* this.bettingRound();

            // вернуть ставку если никто не ответил!!

            this.replenishPot();

            console.log(`++++Posle kruga torgov, state=`, state);

            if (this.roundStage === ROUND_STAGE.earlyWin) {
                break;
            }

        }

        const winnersInfo = this.rewardWinner();

        messageCenter.notifyRoom(this.id, 'round-end', {
            winners: winnersInfo,
            hands: this.getPlayersHands(),
        });

        this.button = (this.button + 1) % this.seatsTaken;

        this.seats = this.seats.filter((seat, i) => {
            if (seat.stack === 0) {
                this.seatsTaken--;
                //Двигаем фишку дилера назад, если перед ней кто-то выбыл.
                if (this.button > i) this.button--;
                return false;
            }
            return true;
        });

        if (this.seats.length > 1) {
            setTimeout(() => {
                this.roundGenerator = this.round();
                this.roundGenerator.next();
            }, 5000);
        } else {
            this.seats = STATE.finished;
        }

    }

    * bettingRound() {
        while (true) {
            this.requestAction();

            this.actionTimer = setTimeout(this.timeOut.bind(this), 20*1000);

            console.log(`+++запрос ставки, таймер пошел`);
            console.log(this);

            yield;

            if (this.loopCompletionCheck()) break;

            this.setCurrentPlayer();

            console.log(this);

        }
    }

    requestAction() {
        const seat = this.seats[this.currentPlayer];
        const data = {
            stack: seat.stack,
            bet: seat.bet,
            pots: this.pots,
            tableBet: this.bet,
            actions: {
                fold: true,
                check: false,
                call: false,
                bet: false,
                raise: false,
                allIn: true
            }
        };

        const act = data.actions;
        if (this.bet === seat.bet) {
            act.fold = false;
            act.check = true;
            if (this.bet === 0) {
                act.bet = true;
            } else {
                act.raise = true;
            }
        } else {
            act.call = true;
            if (seat.stack > this.bet - seat.bet) act.raise = true;
        }

        seat.actions = act;

        messageCenter.notifyPlayer(seat.player, this.id, `expected-action`, data);
        messageCenter.notifyRoom(this.id, `waiting-player-move`, {seat: this.currentPlayer}, seat.player);
    }

    findingWinner(players) {
        const candidates = [];
        players.forEach((player) => {
            const seat = this.seats[player];
            if (seat.inGame) {
                const cards = seat.hand.concat(this.board);
                const comb = Poker.findBestCombination(cards);
                candidates.push({players:[player], comb});
            }
        });

        candidates.sort((player1, player2) => {
            return Poker.compareCombinations(player2.comb, player1.comb);
        });

        for (let i = 1, index = 0; i < candidates.length; i++) {
            const comb1 = candidates[index],
                comb2 = candidates[index+1];
            if (Poker.compareCombinations(comb1.comb, comb2.comb) === 0) {
                comb1.players.concat(comb2.players);
                candidates.splice(index+1, 1);
            } else {
                index++;
            }
        }
    return candidates[0];
    }

    replenishPot() {
        if (this.needNewPot) {
            const allInPlrs = this.seats.filter((seat) => {
                return seat.allIn && seat.bet;
            });
            allInPlrs.sort((pl1, pl2) => {
                return pl1.bet - pl2.bet;
            });

            allInPlrs.forEach((seat) => {
                const chipsToMove = seat.bet;
                this.moveChipsToPot(chipsToMove, false);
                this.bet -= chipsToMove;
            });
        }

        this.moveChipsToPot(this.bet, true);
    }

    moveChipsToPot(bet, open) {
        if (bet <= 0) return;

        let pot = this.pots[this.pots.length - 1];
        if (!pot.open) {
            pot = {
                plrs:{},
                bet: 0,
                chips: 0,
                open: true,
                winners: null,
                comb: null
            };
            this.pots.push(pot);
        }
        pot.bet += bet;
        pot.open = open;

        this.seats.forEach((seat,i) => {
            if (seat.bet) {
                const chips = seat.bet > bet ? bet : seat.bet;
                pot.chips += chips;
                pot.plrs[i] = true;
                seat.bet -= chips;
            }
        });
    }

    rewardWinner() {
        console.log(`POTS`, this.pots);
        const result = [];

        this.pots.forEach((pot, potIndex) => {
            result[potIndex] = {
                pot: potIndex,
                winners: []
            };

            const players = Object.keys(pot.plrs).filter((i) => {
                return this.seats[i].inGame;
            });

            if (this.roundStage === ROUND_STAGE.earlyWin) {
                pot.winners = players;
                pot.comb = null;
            } else {
                const result = this.findingWinner(players);
                pot.winners = result.players;
                pot.comb = result.comb;
            }

            const winnersCount = pot.winners.length;
            if (winnersCount > 1) {
                const chips = Math.floor(pot.chips / winnersCount);
                pot.winners.forEach((i) => {
                    this.seats[i].chips += chips;
                    result[potIndex].winners.push({
                        seat: i,
                        chips: chips
                    });
                });

                const residue = pot.chips % winnersCount;

                if (residue) {
                    this.seats[pot.winners[0]].stack += residue;
                    result[potIndex].winners[0].chips += residue;
                }

            } else {
                console.log(`POT`, pot);
                const seat = this.seats[pot.winners[0]];
                seat.stack += pot.chips;

                result[potIndex].winners.push({
                    seat: pot.winners[0],
                    chips: pot.chips
                });
            }
        });

        return result;
    }

    resetTable(deep = false) {
        if (deep) {
            this.roundStage = 0;
            this.numPlayersInGame = 0;
            this.allInCount = 0;
            this.pot = 0;
            this.pots = [ {
                plrs:{},
                bet: 0,
                chips: 0,
                open: true,
                winners: null,
                comb: null
            } ];
            this.board = [];
            this.deck = [];
        }

        this.bet = 0;
        this.needNewPot = false;

        this.seats.forEach((seat) => {
            if (deep) {
                seat.inGame = !seat.seatOut;
                seat.hand = [];
                seat.totalBet = 0;
                seat.allIn = false;
                if (seat.inGame) this.numPlayersInGame++;
            }
            seat.isActed = false;
            seat.bet = 0;
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
            this.needNewPot = true;
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
            messageCenter.notifyPlayer(seat.player, this.id, `deal-cards`, {hand: seat.inGame ? seat.hand : null});
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

        messageCenter.notifyRoom(this.id, `public-cards`, {board: this.board});
    }

    timeOut() {
        const seat = this.seats[this.currentPlayer];
        let action;
        if (seat.bet < this.bet) {
            seat.inGame = false;
            this.numPlayersInGame--;
            action = 'fold';
        } else {
            seat.isActed = true;
            action = 'check';
        }

        messageCenter.notifyRoom(this.id, `player-acted`, {
            action: {
                word: action,
                bet: null
            },
            stack: seat.stack,
            bet: seat.bet,
            inGame: seat.inGame,
            player: {
                seat: this.currentPlayer,
                id: seat.player.id,
                name: seat.player.name
            }
        }, seat.player);

        messageCenter.notifyPlayer(seat.player, this.id, `action-completed`, {
            stack: seat.stack,
            bet: seat.bet,
            inGame: seat.inGame,
            player: {
                seat: this.currentPlayer,
                id: seat.player.id,
                name: seat.player.name
            }
        });

        this.roundGenerator.next();
    }

    delay(ms) {
        setTimeout(() => {
            this.roundGenerator.next();
        }, ms);
    }

    _action(player, data) {
        console.log(`_ACTION`, data);

        if ( !(player.name in this.players) ) return;

        const seat = this.seats[this.currentPlayer];

        if (seat.player !== player) {
            messageCenter.notifyPlayer(player, this.id, `err`, `Не твой ход!`);
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
                const bet = Number(data.bet);
                if (bet < this.bet - seat.bet && bet < seat.stack) return;

                this.playerBet(seat, bet);

                break;

            default:
                messageCenter.notifyPlayer(seat.player, this.id, `err`, `Неверное действие!`);
                return;
        }

        // Добавить обработку ошибок и неверных действий до этого момента.
        clearTimeout(this.actionTimer);
        seat.isActed = true;

        messageCenter.notifyPlayer(player, this.id, `action-completed`, {
            stack: seat.stack,
            bet: seat.bet,
            inGame: seat.inGame,
            player: {
                seat: this.currentPlayer,
                id: seat.player.id,
                name: seat.player.name
            }
        });

        let newData = {
            action: {
                word: data.word,
                bet: data.bet
            },
            stack: seat.stack,
            bet: seat.bet,
            inGame: seat.inGame,
            player: {
                seat: this.currentPlayer,
                id: player.id,
                name: player.name
            }
        };
        messageCenter.notifyRoom(this.id, `player-acted`, newData, player);

        this.roundGenerator.next();

        //return `ok`;
    }

    _getInfo(player, {type}) {
        switch (type) {
            case 'room-info':
                const info = this.getRoom();
                info.hero = {
                    name: player.name,
                };
                return info;
            default:
                return new Error('Неверный запрос');
        }
    }

}

module.exports = tRoom;