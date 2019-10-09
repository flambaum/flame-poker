const ROOM_NAME = {
    cash: `Кэш столы`,
    tournament: `Турнирные столы`
};
const lobbySocket = io.connect(`/lobby`);

lobbySocket.on(`info`, (data) => {
    lobbySocket.playerName = data.name;
    const cashier = document.querySelector('.cashier');
    cashier.style.display = 'block';
    setCashier(data.balance);
});

lobbySocket.on(`rooms`, (data)=>{
    const container = document.getElementsByClassName(`rooms`)[0];
    for( const name in data) {
        const h2 = document.createElement(`h3`);
        h2.textContent = ROOM_NAME[name];
        const ul = document.createElement(`ul`);
        ul.classList.add('table-list');
        const rooms = data[name];
        for(let i=0; i<rooms.length; i++ ) {
            const room = rooms[i];
            const li = createRoomElement(room);
            ul.append(li);
        }
        container.innerHTML = ``;
        container.append(h2, ul);
    }
});

lobbySocket.on(`room-changed`, (room) => {
    createRoomElement(room);
});


lobbySocket.on('balance', (data) => {
    setCashier(data.value);
});

function createRoomElement(room) {
    let li;
    if (!document.getElementById(room.id)) {
        li = document.createElement(`li`);
        li.classList.add('table');
        li.id = room.id;
    } else {
        li = document.getElementById(room.id);
        li.innerHTML = ``;
    }
    const a = document.createElement(`a`);
    a.href = `/room/${room.id}`;
    a.target = `_blank`;
    a.textContent = `ID:${room.id} | players: ${room.seatsTaken}/${room.options.numSeats}`;
    if (room.id[0] === `2`) {
        a.textContent += ` | buy-in: $${room.options.buyIn} |
                        start: ${String(new Date(room.options.startTime)).slice(4,24)}`;

        const button = document.createElement(`button`);
        const inRoom = room.players.indexOf(lobbySocket.playerName);
        if (~inRoom) {
            button.textContent = `Отменить регистрацию`;
            button.onclick = (e) => {
                lobbySocket.emit(`action`, {roomID: e.target.parentNode.id, action: `unregister`});
            }
        } else {
            button.textContent = `Зарегистрироваться`;
            button.onclick = (e) => {
                lobbySocket.emit(`action`, {roomID: e.target.parentNode.id, action: `register`});
            }
        }
        li.append(a);
        li.append(button);
    }
    return li;
}

function setCashier(balance) {
    const cashier = document.getElementById('user-money');
    cashier.textContent = balance;
}