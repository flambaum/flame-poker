module.exports = (req, res, next) => {
    if (!req.session.userId) {
        return next({status: 401, message: `Вы не авторизованы`});
    };

    next();
};