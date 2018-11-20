const gameServer = require(`../game/gameServer`);

module.exports = (req, res, next) => {
    const id = req.params.roomID;
    if (gameServer.getRoom(id)) next();
    else next({
        status: 404,
        message: `Комната не найдена`
    });
};