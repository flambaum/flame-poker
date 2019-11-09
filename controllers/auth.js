const User = require(`../models/user`);
const UserMoney = require(`../models/userMoney`);

exports.singUp = async (req, res, next) => {
	const {username, password} = req.body;
	let user;
	try {
		user = await User.register(username, password);
		await UserMoney.create({ userId: user._id });
	} catch (err) {
		return next({
			status: 400,
			message: err.message
		});
	}

	req.session.userId = user._id;
	res.redirect(`/`);
};

exports.singIn = async (req, res, next) => {
	const {username, password} = req.body;
	const user = await User.findOne({ username });

	if (!user) {
		return next({
			status: 404,
			message: `User not found`
		});
	}

	const match = await user.comparePasswords(password);

	if (!match) return next({
		status: 400,
		message: `Wrong password`
	});

	req.session.userId = user._id;
	res.redirect(`/`);
};

exports.logout = (req, res, next) => {
	const io = req.app.get(`io`);
	const sid = req.session.id;
	const connectedSockets = io.connected;

	req.session.destroy((err) => {
		for( const id in connectedSockets) {
			const socket = connectedSockets[id];
			console.log(socket.handshake);
			if (socket.handshake.session.id === sid) {
				socket.disconnect();
			}
		}

		if(err) return next(err);
	});
	res.end();
};
