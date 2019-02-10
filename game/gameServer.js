const Player = require(`./player`);

const TYPES_ROOM = {
    cash: require(`./cashRoom`),
    tournament: require(`./tournamentRoom`)
};

const KEYS_ROOM = {
    cash: `1`,
    1: `cash`,
    tournament: `2`,
    2: `tournament`
};

class GameServer {
    constructor() {
        this.cashRooms = {};
        this.tournamentRooms ={};
        this.roomsCount = 0;
        this.players = {};
        this.playersCount = 0;

    }

    start(options) {
        const rooms = options.rooms;
        for (let type in rooms) {
            for (let i = 0; i<rooms[type].num; i++) {
                this.addRoom(type, rooms[type].options);
            }
        }

        this.interval = setInterval(this.timeControl.bind(this), 5000);

        return this;
    }

    timeControl() {

        for (const roomId in this.tournamentRooms) {
            const room = this.tournamentRooms[roomId];
            console.log(room.options.startTime, Date.now());
            if (room.state === 0 && room.options.startTime < Date.now()) {
                console.log(`++++++ Tournament START +++++`);
                room.startTournament();
            }
        }

    }

    addRoom(type, options) {
        const id = KEYS_ROOM[type] + String(Math.random()).slice(2);
        this.roomsCount += 1;
        const room = new TYPES_ROOM[type](id, options);
        this[`${type}Rooms`][id] = room;
    }

    newPlayer(id, name) {
        if (id in this.players) {
            return this.players[id];
        }
        const player = new Player(id, name);
        this.players[id] = player;
        this.playersCount ++;
        return player;
    }

    getRooms() {
        const rooms = {};
        for (let typeName in TYPES_ROOM) {
            const roomsOfType = this[`${typeName}Rooms`];
            if (roomsOfType) {
                rooms[typeName] = [];
                for (let room in roomsOfType) {
                    rooms[typeName].push(roomsOfType[room].getRoom(true));
                }
            }
        }
        return rooms;
    }

    getRoom(id) {
        id = String(id);
        if (!id) return undefined;
        const type = KEYS_ROOM[id[0]];
        if (!type) return undefined;
        return this[`${type}Rooms`][id];
    }

    getPlayer(id) {
        return this.players[id];
    }

    messageHandler(userID, type, data) {

        const room = this.getRoom(data.roomID);

        if (!room) return;

        const funcName = type || data.action;
        const func = room[`_${funcName}`];

        if (typeof func === `function`) {
            const player = this.players[userID];
            return func.call(room, player, data.options || data);
        }
    }

    notify() {

    }
}

module.exports = new GameServer;
