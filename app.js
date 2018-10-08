const express = require(`express`);
const session = require(`express-session`);
const bodyParser = require(`body-parser`);
const cookieParser = require('cookie-parser');
const morgan = require(`morgan`);
const favicon = require('serve-favicon');
const path = require(`path`);

const config = require('./config');
const errorHandler = require(`./middlewares/errorHandler`);
const authRoute = require(`./routes/auth`);
const gameRoute = require(`./routes/game`);


const app = express();

app.engine(`ejs`, require(`ejs-locals`));
app.set('views', path.join(__dirname, 'template'));
app.set('view engine', 'ejs');

app.use(morgan('dev'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.use(session({
    secret: config.get(`session:secret`),
    resave: false,
    saveUninitialized: true,
    key: config.get('session:key'),
    cookie: config.get(`session:cookie`),
    store: require(`./lib/sessionStore`)
}));

app.use(require(`./middlewares/loadUser`));

app.use((req, res, next) => {
    req.session.n = (req.session.n || 0) + 1;
    next();
});

app.use(`/`, authRoute);
app.use(`/`, gameRoute);

app.get(`/`, (req, res, next) => {
    res.render(`index`);
});

app.get(`/err/:code`, (req,res,next) => {
    next(+req.params.code);
});

app.get(`/coffee`, (req, res, next) => {
    next(418);
});

app.use(errorHandler);

module.exports = app;