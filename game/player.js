const UserMoney = require(`../models/userMoney`);

class Player {
    constructor(id, name) {
        this.name = name;
        this.sockets = {
            lobby: null,
            game: {},
            chat: {}
        };
        this.id = id;
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