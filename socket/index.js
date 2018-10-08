const cookie = require(`cookie`);
const config = require(`../config`);
const cookieParser = require(`cookie-parser`);
const sessionStore = require(`../lib/sessionStore`);

const socket = function (server) {
    const io = require('socket.io')(server);

    io.of(`/game`).use((socket, next) => {
        const handshake = socket.handshake;
        let sid = cookie.parse(handshake.headers.cookie)[config.get('session:key')];

        sid = cookieParser.signedCookie(sid, config.get('session:secret'));

        sessionStore.get(sid, (err, session) => {
            if (err || !session) next(new Error(`No session`));
            handshake.session = session;
            handshake.session.id = sid;

            socket.userId = session.userId;
            socket.username = session.username;
            next();
        });
    });

    return io;
};

module.exports = socket;

