const messageCenter = require(`./messageCenter`);

class Room {
    constructor(id, options) {
        this.options = {
            numSeats: 6,

        };

        if(options && (typeof options === 'object')) {
            for(const i in options) this.options[i] = options[i];
        }
        this.id = id;
        this.seats = [];
        this.seatsTaken = 0;
        this.isFull = false;
    }

    getRoom() {
        return {id: this.id, seatsTaken: this.seatsTaken, options: this.options};
    }

    notifyAll(event, data) {
        messageCenter.notifyAll(event, data);
    }
}

module.exports = Room;