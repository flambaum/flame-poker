const UserMoney = require(`../models/userMoney`);
const messageCenter = require(`./messageCenter`);

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

    // async getMoney() {
    //     const data = await UserMoney.findOne({ userId: this.id });
    //     return data.money;
    // }

    set money(m) {
        UserMoney.findOne({userId: this.id}, (err, userMoney) => {
            userMoney.money = m;
            userMoney.save();
        });
    }

    async changeBalance(value) {
        value = Number(value);
        const balance = await this.money;
        const newBalance = balance + value;
        if (newBalance >= 0) {
            this.money = newBalance;
            messageCenter.notifyPlayer(this, null, 'balance', {value: newBalance});
            return true;
        }
        return false;
    }
}

module.exports = Player;