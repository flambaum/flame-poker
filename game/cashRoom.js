const Room = require(`./room`);

class cRoom extends Room{
    constructor(id, options) {
        super(id, options);

        this.seats = [];
        this.seatsTaken = 0;
    }
}

module.exports = cRoom;