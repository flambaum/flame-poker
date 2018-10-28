const router = require(`express`).Router();
const {singUp, singIn, logout} = require(`../controllers/auth`);
const checkUserPreAuth = require(`../middlewares/checkUserPreAuth`);

router.post(`/registration`, checkUserPreAuth, singUp);

router.get(`/registration`, checkUserPreAuth, (req, res, next) => {
    res.render(`singup`);
});

router.post(`/login`, checkUserPreAuth, singIn);

router.get(`/login`, checkUserPreAuth, (req, res, next) => {
    res.render(`login`);
});

router.post(`/logout`, logout);

module.exports = router;