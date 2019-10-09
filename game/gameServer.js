const Player = require(`./player`);
const MessageCenter = require(`./messageCenter`);

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

const TOURNAMENT_ROOM_STATE = TYPES_ROOM.tournament.STATE;

const TIME_TO_START = 300*1000,
      UPDATE_TIME = 5*1000;

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
            const num = rooms[type].num;
            for (let i = 0; i < num; i++) {
                const options = rooms[type].options;
                if (!options) continue;
                if ( type in TYPES_ROOM && type === `tournament` ) {
                    options.startTime = Date.now() + 60000;
                }
                this.addRoom(type, options);
            }
        }

        this.interval = setInterval(this.timeControl.bind(this), UPDATE_TIME);

        return this;
    }

    timeControl() {
        let isRoomsChanged = false;
        for (const roomId in this.tournamentRooms) {
            const room = this.tournamentRooms[roomId];

            if (room.state === TOURNAMENT_ROOM_STATE.wait && room.options.startTime < Date.now()) {
                isRoomsChanged = true;

                console.log(`++++++ Tournament START +++++`);
                room.startTournament();

                const newOptions = Object.assign({}, room.options);
                newOptions.startTime = Date.now() + TIME_TO_START;

                this.addRoom(`tournament`, newOptions);
            }

            if (room.state === TOURNAMENT_ROOM_STATE.canceled ||
                room.state === TOURNAMENT_ROOM_STATE.finished) {
                isRoomsChanged = true;
                delete this.tournamentRooms[roomId];
            }
        }
        if (isRoomsChanged) MessageCenter.notifyAll('rooms', this.getRooms());
    }

    addRoom(type, options) {
        if ( !(type in TYPES_ROOM) ) return;

        const id = KEYS_ROOM[type] + String(Math.random()).slice(2, 8);
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

}

module.exports = new GameServer;