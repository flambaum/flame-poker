const router = require(`express`).Router();
const {singUp, singIn, logout} = require(`../controllers/auth`);

router.post(`/registration`, singUp);

router.get(`/registration`, (req, res, next) => {
    res.render(`singup`);
});

router.post(`/login`, singIn);

router.get(`/login`, (req, res, next) => {
    res.render(`login`);
});

router.post(`/logout`, logout);

module.exports = router;