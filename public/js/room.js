const roomID = location.pathname.split(`/`)[2];

const table = document.querySelector(`.table`),
    control = document.querySelector(`.control`);

const gameSocket = io.connect(`/game`);

gameSocket.on(`expected-roomID`, () => {
    gameSocket.emit(`roomID`, roomID);
});

gameSocket.on(`deal-cards`, (data) => {
    const hand = table.querySelector(`.hand`);
    hand.innerHTML = ``;
    for (const i in data.hand) {
        const card = data.hand[i];
        hand.appendChild(Poker.getCardCanvas(40, card[1], card[0] === `T` ? `10` : card[0]));
    }
});

gameSocket.on(`public-cards`, (data) => {
    const board = table.querySelector(`.board`);
    board.innerHTML = ``;
    for (const i in data.board) {
        const card = data.board[i];
        board.appendChild(Poker.getCardCanvas(100, card[1], card[0] === `T` ? `10` : card[0]));
    }
});

gameSocket.on(`err`,(d)=>{console.log(d)});

gameSocket.on(`expected-action`,(data)=>{
    table.querySelector(`.stack-value`).textContent = data.stack;
    control.style.display = "block";
});

gameSocket.on(`new-round`, (data) => {
    console.log(`new-round`, data);
});

gameSocket.on(`new-street`, (data) => {
    console.log(`new-street`, data);
});

gameSocket.on(`player-acted`, (data) => {
    console.log(`player-acted`, data);
});

const actionResponse = {
    action: `action`,
    room: roomID,
};

control.querySelector(`.fold`).addEventListener(`click`, (e) => {
    actionResponse.options = {
        word: `fold`
    };
    gameSocket.emit(`action`, actionResponse);
    control.style.display = "none";
});

control.querySelector(`.check`).addEventListener(`click`, (e) => {
    actionResponse.options = {
        word: `check`
    };
    gameSocket.emit(`action`, actionResponse);
    control.style.display = "none";
});

control.querySelector(`.call`).addEventListener(`click`, (e) => {
    actionResponse.options = {
        word: `call`
    };
    gameSocket.emit(`action`, actionResponse);
    control.style.display = "none";
});

control.querySelector(`.bet`).addEventListener(`click`, (e) => {
    const betInput = control.querySelector(`.bet_value`);

    actionResponse.options = {
        word: `bet`,
        bet: betInput.value
    };
    gameSocket.emit(`action`, actionResponse);
    control.style.display = "none";
});
