const checkAuth = require(`../middlewares/checkAuth`);
const router = require(`express`).Router();
const checkRoomExistence = require(`../middlewares/checkRoomExistence`);

router.get(`/rooms`, checkAuth, (req, res) => {
    res.render(`rooms`);
});

router.get(`/room/:roomID`, checkRoomExistence, (req, res) => {
    res.render(`room`);
});

module.exports = router;