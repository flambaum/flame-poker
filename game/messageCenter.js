module.exports = new class MessageCenter {
    constructor(){}

    setupSocket(io) {
        if (this.gameIO) return;

        this.gameIO = io
            .of(`/game`)
            .on(`connection`, (socket) => {
                gameServer.newPlayer(socket);

                socket.emit(`info`, {name: socket.username});

                socket.emit(`rooms`, gameServer.getRooms());

                socket.on(`game-action`, (data)=>{

                });

                socket.on(`action`, (data)=>{
                    if (!data) return;
                    gameServer.action(socket, data);
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

        // this.gameIO = gameIO;
        this.notifyAll.bind(this);
    }

    notifyAll(event, data) {
        const io = this.gameIO;
        io.emit(event, data);
    }
};

const gameServer = require(`./gameServer`);