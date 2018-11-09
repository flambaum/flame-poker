const RANK = [`2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `T`, `J`, `Q`, `K`, `A`];
const SUIT = [`s`, `h`, `d`, `c`];

const COST = {};
RANK.forEach((r, i) => {
    COST[r] = i;
});

const COMBS = {
    ROYAL_FLUSH: 9,
    STRAIGHT_FLUSH: 8,
    FOUR: 7,
    FULL_HOUSE: 6,
    FLUSH: 5,
    STRAIGHT: 4,
    SET: 3,
    TWO_PAIR: 2,
    PAIR: 1,
    HIGH_CARD: 0
};

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

    static compareCombinations (comb1, comb2) {
        // Функция возвращает 1 - если первая комбинация сильнее, -1 - если вторая,
        // и 0 - если комбинации равноценны.

        if (comb1.comb > comb2.comb) {
            return 1;
        } else if (comb2.comb > comb1.comb) {
            return -1;
        }

        if (!comb1.cardCosts) return 0;

        const costs1 = comb1.cardCosts,
            costs2 = comb2.cardCosts;

        for (let i = 0; i < costs1.length; i++) {
            if (costs1[i] > costs2[i]) {
                return 1;
            } else if (costs2[i] > costs1[i]) {
                return -1;
            }
        }

        if (!comb1.kickers) return 0;

        const kickers1 = comb1.kickers,
            kickers2 = comb2.kickers;

        for (let i = 0; i < kickers1.length; i++) {
            if (kickers1[i] > kickers2[i]) {
                return 1;
            } else if (kickers2[i] > kickers1[i]) {
                return -1;
            }
        }

        return 0;
    }

    static findBestCombination (cards) {
        // cards : массив строк из двух символов (1. ранг карты, 2. масть карты)

        this.sort(cards);

        console.log(cards);

        // Преобразуем массив карт (строк) в массив цен (объектов), заменяя ранг карты но стоимость ранга.
        const costs = cards.map((card) => {
            return {
                cost: COST[card[0]],
                suit: card[1]
            }
        });

        let FLUSH = null,
            SET = null,
            suits = {s:[], h:[], d:[], c:[]},
            repetitions = {},
            noRepArr = [];

        function searchStraight(cards) {
            for (let i = 0; i <= cards.length - 5; i++) {
                if (cards[i].cost - cards[i+4].cost === 4) {
                    return i;
                }
            }
            if (cards[0].cost === COST[`A`]) {
                for (let i = 1; i <= cards.length - 4; i++) {
                    if (cards[i].cost === COST[`5`] && cards[i].cost - cards[i+3].cost === 3) {
                        return i;
                    }
                }
            }
            return -1;
        }

        for (let i = 0; i < costs.length; i++) {
            const card = costs[i];

            suits[card.suit].push(card);

            if (noRepArr.length === 0 || noRepArr[noRepArr.length-1].cost !== card.cost) {
                noRepArr.push(card);
            }

            let rep = repetitions[card.cost];
            repetitions[card.cost] = rep ? ++rep : 1;
        }

        for (const s in suits) {
            const cards = suits[s];
            if (cards.length >= 5) {
                const straight = searchStraight(cards);
                if (~straight) {
                    if (cards[straight].cost === COST[`A`]) {
                        return {comb: COMBS.ROYAL_FLUSH}
                    } else {
                        return {
                            comb: COMBS.STRAIGHT_FLUSH,
                            cardCosts: [cards[straight].cost]
                        };
                    }
                }

                const cardCosts = cards.slice(0, 5).map((card) => {
                    return card.cost;
                });
                // Запоминаем флеш, сначала проверяем каре и фулхаус
                FLUSH =  {
                    comb: COMBS.FLUSH,
                    cardCosts: cardCosts
                }
            }
        }

        const repArr = [];
        for (const cost in repetitions) {
            repArr.push({cost: +cost, n: repetitions[cost]});
        }

        repArr.sort((r1, r2) => {
            const diff = r2.n - r1.n;
            return diff !== 0 ? diff : r2.cost - r1.cost;
        });

        if (repArr[0].n === 4) {
            return {
                comb: COMBS.FOUR,
                cardCosts: [repArr[0].cost],
                kickers: [repArr[1].cost > repArr[2].cost ? repArr[1].cost : repArr[2].cost]
            }
        }

        if (repArr[0].n === 3) {
            if (repArr[1].n >= 2){
                return {
                    comb: COMBS.FULL_HOUSE,
                    cardCosts: [repArr[0].cost, repArr[1].cost]
                }
            }

            SET = {
                comb: COMBS.SET,
                cardCosts: [repArr[0].cost],
                kickers: [repArr[1].cost, repArr[2].cost]
            }
        }

        if (FLUSH) return FLUSH;

        const straight = searchStraight(noRepArr);
        if (~straight) return {
            comb: COMBS.STRAIGHT,
            cardCosts: [costs[straight].cost]
        };

        if (SET) return SET;

        if (repArr[0].n === 2) {
            if (repArr[1].n === 2) {
                return {
                    comb: COMBS.TWO_PAIR,
                    cardCosts: [repArr[0].cost, repArr[1].cost],
                    kickers: [repArr[2].cost > repArr[3].cost ? repArr[2].cost : repArr[3].cost]
                }
            }
            return {
                comb: COMBS.PAIR,
                cardCosts: [repArr[0].cost],
                kickers: [repArr[1].cost, repArr[2].cost, repArr[3].cost]
            }
        }

        const cardCosts = costs.slice(0,5).map((card) => {
            return card.cost;
        });
        return {
            comb: COMBS.HIGH_CARD,
            cardCosts: [cardCosts[0]],
            kickers: cardCosts.slice(1)
        }
    }
}

const a = Poker.getDeck().slice(0, 7);

//let a = [`3h`,`3s`,`Ah`,`3c`,`2h`,`3d`,`4h`];
//let a = [`Th`,`3h`,`2h`,`3c`,`Ah`,`Ac`,`3h`];
console.log(a);
const res = Poker.findBestCombination(a);
for (c in COMBS) if (COMBS[c] === res.comb) console.log(c);

console.log(`cardCosts: `, res.cardCosts ? res.cardCosts.map(c=>RANK[c]): null);

console.log(`kickers: `, res.kickers ? res.kickers.map(c=>RANK[c]): null);
module.exports = Poker;