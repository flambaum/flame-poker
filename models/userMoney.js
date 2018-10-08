const mongoose = require(`../lib/mongoose`);
const {Schema} = mongoose;

const userMoneySchema = new Schema({
    userId: {
        type: String,
        unique: true,
        index: true,
        required: true
    },
    money: {
        type: Number,
        default: 1000
    }
});

const UserMoney = mongoose.model(`UserMoney`, userMoneySchema);
module.exports = UserMoney;