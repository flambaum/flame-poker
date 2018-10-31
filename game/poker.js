const RANK = [`2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `T`, `J`, `Q`, `K`, `A`];
const SUIT = [`s`, `h`, `d`, `c`];

const COST = {};
RANK.forEach((r, i) => {
    COST[r] = i;
});

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

    static sort(cards) {
        cards.sort((c1, c2) => {
            return COST[ c2[0] ] - COST[ c1[0] ];
        });
    }

    static findBestCombination (cards) {
        this.sort(cards);
        console.log(cards);
        const costs = cards.map((card) => {
            return {
                cost: COST[card[0]],
                suit: card[1]
            }
        });

        let ROYAL_FLUSH = false,
            STRAIGHT_FLUSH = false,
            FLUSH = false,
            STRAIGHT = false,
            straightLen = 0,
            straightTop = null,
            straightFlushSuit = null,
            straightFlushLen = 0,
            suits = {s:0, h:0, d:0, c:0},
            repetitions = {},
            searchDone = false;

        for (let i = 0; i < costs.length; i++) {
            const card = costs[i];

            suits[card.suit] ++;

            let rep = repetitions[card.cost];
            repetitions[card.cost] = rep ? ++rep : 1;

            let nextCard = costs[i+1];
            if (i !== costs.length - 1 && !searchDone) {
                if (card.cost - nextCard.cost === 1 ) {
                    if (!straightTop) {
                        straightLen = 1;
                        straightTop = RANK[card.cost];
                        straightFlushSuit = card.suit;
                        straightFlushLen = 1;
                    }
                    straightLen++;
                    if (card.suit === nextCard.suit) straightFlushLen++;
                } else if (card.cost - nextCard.cost !== 0) {
                    if (straightLen >= 4) {
                        searchDone = true;
                    } else {
                        straightTop = null;
                    }
                }
            }
        }

        if (straightLen >= 5 || straightTop === `5` && costs[0].cost === COST[`A`]) {
            STRAIGHT = true;

            if (straightFlushLen >= 5) {

                if (straightTop === `A`) {
                    //Bingo!!
                    ROYAL_FLUSH = true;
                } else {
                    STRAIGHT_FLUSH = true;
                }

            } else {
                let i = 0;
                while (costs[i].cost === COST[`A`]) {
                    if (costs[i].suit === straightFlushSuit) {
                        STRAIGHT_FLUSH = true;
                        break;
                    }
                    i++;
                }
            }
        }

        for (const s in suits) {
            if (suits[s] >= 5) FLUSH = true;
        }


        console.log(`suits `, suits);
        console.log(`rep `, repetitions);
        console.log(`strL `, straightLen);
        console.log(`strT `, straightTop);
        console.log(`RF `, ROYAL_FLUSH);
        console.log(`SF `, STRAIGHT_FLUSH);
        console.log(`FL `, FLUSH);
        console.log(`ST `, STRAIGHT);
        return costs;
    }

}

// const a = Poker.getDeck().slice(0, 7);

let a = [`3h`,`5h`,`7c`,`6h`,`2h`,`Jc`,`4h`];

console.log(a);
console.log(Poker.findBestCombination(a));

module.exports = Poker;