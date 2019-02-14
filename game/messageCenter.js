const REQUEST_TYPE = {
    'action': 'action',
    'get-info': 'getInfo'
};

module.exports = new class MessageCenter {
    constructor(){
        this.lobbyIO = null;
        this.gameIO = null;
        this.chatIO = null;
    }

    setupSocket(io) {
        if (this.lobbyIO) return;

        this.lobbyIO = io.of(`/lobby`)
            .on(`connection`, (socket) => {
                const id = socket.userId,
                    name = socket.username;
                const player = gameServer.newPlayer(id, name);
                if (player.sockets.lobby) {
                    player.sockets.lobby.disconnect();
                    player.sockets.lobby = socket;
                }
                socket.emit(`info`, {name: socket.username});

                socket.emit(`rooms`, gameServer.getRooms());

                socket.on(`action`, (data)=>{
                    if (!data) return;
                    gameServer.messageHandler(socket.userId, null, data);
                });
            });

        this.gameIO = io.of(`/game`)
            .on(`connection`, (socket) => {
                const roomID = socket.handshake.query.roomID;

                if (!roomID) {
                    socket.disconnect();
                    return;
                }

                let player = gameServer.getPlayer(socket.userId);
                if (!player) {
                    player = gameServer.newPlayer(socket.userId, socket.username);
                }
                socket.roomID = roomID;
                player.sockets.game[roomID] = socket.join(String(roomID));

                socket.on(`action`, (data)=>{
                    if (!data || !socket.roomID) return;
                    data.roomID = socket.roomID;
                    const type = REQUEST_TYPE[`action`];
                    gameServer.messageHandler(socket.userId, type, data);
                });

                socket.on(`get-info`, (data, callback) => {
                    if (!data || !socket.roomID) return;
                    data.roomID = socket.roomID;
                    const type = REQUEST_TYPE[`get-info`];
                    const info = gameServer.messageHandler(socket.userId, type, data);
                    callback(info);
                })
            });

        this.chatIO = io.of(`/chat`)
            .on(`connection`, (socket) => {

        });

        this.notifyAll.bind(this);
    }

    notifyAll(event, data) {
        const io = this.lobbyIO;
        io.emit(event, data);
    }

    notifyRoom(roomID, event, data, player) {
        let socket;
        if (player && player.sockets.game[roomID]) {
            socket = player.sockets.game[roomID].broadcast.to(roomID);
        } else {
            socket = this.gameIO.to(roomID);
        }
        if (socket) {
            socket.emit(event, data);
        }
    }

    notifyPlayer(player, roomID, event, data) {
        const socket = player.sockets.game[roomID];
        if (socket) {
            socket.emit(event, data);
        }
    }
};

const gameServer = require(`./gameServer`);