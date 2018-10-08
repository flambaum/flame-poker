const session = require(`express-session`);
const MongoStore = require(`connect-mongo`)(session);
const mongoose = require(`./mongoose`);

module.exports = new MongoStore({mongooseConnection: mongoose.connection});