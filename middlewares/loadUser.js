const User = require(`../models/user`);

module.exports = (req, res, next) => {
    if (!req.session.userId) {
        res.locals.user = null;
        return next();
    };

    User.findById(req.session.userId, (err, user) => {
        if (err) return next(err);

        req.user = res.locals.user = user;
        req.session.username = user.get(`username`);
        next();
    });
};