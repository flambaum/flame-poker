const UserMoney = require(`../models/userMoney`);

class Player {
    constructor(socket) {
        const data = socket.handshake.session;
        this.name = data.username;
        this.socket = socket;
        this.id = data.userId;

    }

    get money() {
        return (async () => {
            return (await UserMoney.findOne({ userId: this.id }) ).money;
        })();
    }

    set money(m) {
        UserMoney.findOne({userId: this.id}, (err, userMoney) => {
            userMoney.money = m;
            userMoney.save();
        });
    }
}

module.exports = Player;