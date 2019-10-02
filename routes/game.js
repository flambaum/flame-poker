const checkAuth = require(`../middlewares/checkAuth`);
const router = require(`express`).Router();
const checkRoomExistence = require(`../middlewares/checkRoomExistence`);
const path = require(`path`);

router.get(`/rooms`, checkAuth, (req, res) => {
    res.render(`rooms`);
});

router.get(`/room/:roomID`, checkRoomExistence, (req, res) => {
    res.sendFile(path.join(__approot, 'public', 'room.html'));
});

module.exports = router;