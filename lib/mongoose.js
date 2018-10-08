const mongoose = require(`mongoose`);
const config = require(`../config`);

mongoose.connect(config.get(`database:uri`), config.get(`database:options`));
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;

db.on(`error`, (err) => {
    console.log(`connection error:`);
    throw err;
});

db.once(`open`, () => console.log(`Mongo connected!`));

module.exports = mongoose;