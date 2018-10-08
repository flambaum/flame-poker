const Room = require(`./room`);

class tRoom extends Room{
    constructor(id, options) {
        super(id, options);

        this.players = [];
        this.seats = [];
        this.seatsTaken = 0;
    }

    getRoom(detailed = true) {
        const result = super.getRoom();

        if (detailed) {
            result.players = this.players;
        }
        return result;
    }

    async _register(player) {
        if (this.isFull) return;

        const index = this.players.indexOf(player.name);
        if (~index) return;

        let balance = await player.money;
        console.log(balance, `===1`);
        balance = balance - this.options.buyIn;
        console.log(balance, `===2`);
        if (balance >= 0) {
            this.players.push(player.name);
            // this.seats.push(player);
            this.seatsTaken += 1;
            if (this.seatsTaken === this.options.numSeats) this.isFull = true;

            player.money = balance;
            player.socket.join(this.id);

            super.notifyAll(`room-changed`, this.getRoom(true));
        }

    }

    async _unregister(player) {
        const index = this.players.indexOf(player.name);
        if (! ~index) return;

        this.seatsTaken -= 1;
        this.isFull = false;
        this.players.splice(index, 1);

        player.socket.leave(this.id);

        let balans = await player.money;
        balans += this.options.buyIn;
        player.money = balans;

        super.notifyAll(`room-changed`, this.getRoom(true));
    }
}

module.exports = tRoom;