const RANK = [`2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `T`, `J`, `Q`, `K`, `A`];
const SUIT = [`s`, `h`, `d`, `c`];

class Poker {
    static getDeck() {
        const deck = [];
        for (let s = 0; s < SUIT.length; s++){
            for (let r=0; r<RANK.length; r++) {
                deck.push(RANK[r] + SUIT[s]);
            }
        }
        const shuffled = [];
        for (let i = 0; deck.length; i++) {
            const num = Math.floor(Math.random() * deck.length);
            shuffled[i] = deck.splice(num, 1)[0];
        }
        return shuffled;
    }
}