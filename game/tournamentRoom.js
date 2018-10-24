const Room = require(`./room`);
const Poker = require(`./poker`);

const STATE = {
    wait: 0,
    run: 1,
    pause: 2,
    finished: 3
};

const ROUND_STATE = {
    preflop: 0,
    flop: 1,
    turn: 2,
    river: 3
};

class tRoom extends Room{
    constructor(id, options) {
        super(id, options);
        this.options.startTime = +new Date() + 6000;

        this.state = STATE.wait;
        this.players = {};
        this.seats = [];
        this.seatsTaken = 0;
        this.numPlayersInGame = 0;

        this.roundState = null;
        this.board = [];
        this.pot = 0;
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
            const seat = {player: this.players[name]};
            seat.stack = this.options.runStack;
            seat.isActed = false;
            seat.inGame = true;
            seat.hand = [];
            seat.bet = null;
            this.seats.push(seat);
        }

        this.numPlayersInGame = this.seatsTaken;

        this.button = 0;
        this.bigBlind = this.options.structure[1];

        console.log(this);

        this.roundGenerator = this.round();
    }

    * round() {
        const sb = this.seats[this.button + 1];
        const bb = this.seats[this.button + 2];

        this.playerBet(sb, this.bigBlind / 2);
        this.playerBet(bb, this.bigBlind);

        this.deck = Poker.getDeck;
        this.dealCards();

        this.setCurrentPlayer(this.button + 2);

        for (let state = 0; state <= 4; state ++) {
            this.roundState = state;

            this.dealPublicCards(state);

            yield* this.bettingRound();

        }
    }

    * bettingRound() {

    }

    setCurrentPlayer(current = this.currentPlayer) {
        current++;
        for (let i = 0; i < this.seatsTaken; i++) {
            const seatNum = (current + i) % this.seatsTaken;
            if (this.seats[seatNum].inGame) {
                this.currentPlayer = seatNum;
                return;
            }
        }

    }

    playerBet(seat, value) {
        if (seat.stack >= value) {
            seat.bet = value;
            seat.stack -= value;
        } else {
            seat.bet = seat.stack;
            seat.stack = 0;
        }
        if (seat.stack === 0) seat.allIn = true;
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

        if (state === ROUND_STATE.flop) {
            n = 3;
        } else if (state === ROUND_STATE.turn || state === ROUND_STATE.river) {
            n = 1;
        } else return;

        this.deck.pop();
        this.board.push(this.deck.splice(-n,n));

        this.seats.forEach((seat) => {
            seat.player.socket.emit(`public-cards`, {board: this.board});
        })
    }

}

module.exports = tRoom;