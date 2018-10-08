const mongoose = require(`../lib/mongoose`);
const {Schema} = mongoose;
const bcrypt = require(`bcrypt`);

const saltRounds = 10;

const userSchema = new Schema({
	username: {
		type: String,
		unique: true,
		index: true,
		required: true
	},
	password: {
		type: String,
		required: true
    },
	created: {
		type: Date,
		default: Date.now
	}
});

userSchema.pre(`save`, async function(next) {
	 if (!this.isModified('password')) return next();

	 this.password = await bcrypt.hash(this.password, saltRounds);
	 next();
});

userSchema.methods.comparePasswords = function(password) {
	return bcrypt.compare(password, this.password);
};

userSchema.statics.register = async function(username, password) {
	return await User.create({username, password});
};

// userSchema.statics.autorise = async function (username, password) {
//     const user = await User.findOne({ username });
//
// };

const User = mongoose.model(`User`, userSchema);
module.exports = User;