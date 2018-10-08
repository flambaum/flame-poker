const http = require('http');

const app = require(`./app`);
const config = require(`./config`);

const port = process.env.PORT || config.get(`port`);
const server = http.createServer(app);

const io = require(`./socket`)(server);
app.set(`io`, io);

const messageCenter = require(`./game/messageCenter`);
const gameServer = require(`./game/gameServer`);

gameServer.start(config.get(`gameServerOptions`));
messageCenter.setupSocket(io);

console.log(`==server==`, gameServer);

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});