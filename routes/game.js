const checkAuth = require(`../middlewares/checkAuth`);
const router = require(`express`).Router();

router.get(`/rooms`, checkAuth, (req, res, next) => {
    res.render(`rooms`);
});

module.exports = router;