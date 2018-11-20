module.exports = new class MessageCenter {
    constructor(){
        this.lobbyIO = null;
    }

    setupSocket(io) {
        if (this.gameIO) return;

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
                    gameServer.action(socket.userId, data);
                });
            });

        this.gameIO = io.of(`/game`)
            .on(`connection`, (socket) => {
                socket.emit(`expected-roomID`);

                socket.on(`roomID`, (roomID) => {
                    let player = gameServer.getPlayer(socket.userId);
                    if (!player) {
                        player = gameServer.newPlayer(socket.userId, socket.username);
                    }
                    player.sockets.game[roomID] = socket.join(String(roomID));
                });

                socket.on(`action`, (data)=>{
                    if (!data) return;
                    gameServer.action(socket.userId, data);
                });

                // socket.on(`lobby-action`, (data)=>{
                //     console.log(socket);
                //     const act = data.action;
                //     const func = gameServer[`_${act}`];
                //     if (typeof func === `function`) {
                //         func.call(gameServer, data.options);
                //     }
                // })
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
        if (player) {
            socket = player.sockets.game[roomID].broadcast.to(roomID);
        } else {
            socket = this.gameIO.to(roomID);
        }
        socket.emit(event, data);
    }



};

const gameServer = require(`./gameServer`);