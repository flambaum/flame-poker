module.exports = (req, res, next) => {
    if (req.session.userId) {
        return next({status: 403, message: `Вы уже авторизованы`});
    }

    next();
};