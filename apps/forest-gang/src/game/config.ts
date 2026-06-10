import type { RawSymbol, SymbolName } from './types';

const makeReel = (names: SymbolName[]): RawSymbol[] => names.map((name) => ({ name }));

const basePaddingReels = [
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'J', 'Q', 'SQUIRREL', 'RABBIT', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'J', 'SQUIRREL', 'RABBIT', 'BEAR', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'Q', 'SQUIRREL', 'RABBIT', 'BEAR', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'SQUIRREL', 'RABBIT', 'BEAR', 'WOLF', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'SQUIRREL', 'RABBIT', 'BEAR', 'WOLF', 'FOX', 'WILD', 'SCATTER']),
];

const freegamePaddingReels = [
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'J', 'Q', 'SQUIRREL', 'RABBIT', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'J', 'SQUIRREL', 'RABBIT', 'BEAR', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'Q', 'SQUIRREL', 'RABBIT', 'BEAR', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'SQUIRREL', 'RABBIT', 'BEAR', 'WOLF', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'SQUIRREL', 'RABBIT', 'BEAR', 'WOLF', 'FOX', 'WILD', 'SCATTER']),
];

const superspinPaddingReels = [
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'J', 'Q', 'SQUIRREL', 'RABBIT', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'J', 'SQUIRREL', 'RABBIT', 'BEAR', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'Q', 'SQUIRREL', 'RABBIT', 'BEAR', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'T', 'SQUIRREL', 'RABBIT', 'BEAR', 'WOLF', 'WILD', 'SCATTER']),
	makeReel(['T', 'J', 'Q', 'K', 'A', 'SQUIRREL', 'RABBIT', 'BEAR', 'WOLF', 'FOX', 'WILD', 'SCATTER']),
];

export default {
	providerName: 'sample_provider',
	gameName: 'forest_gang',
	gameID: '0_0_forest_gang',
	rtp: 0.961,
	numReels: 5,
	numRows: [4, 4, 4, 4, 4],
	betModes: {
		BASE: {
			cost: 1.0,
			feature: true,
			buyBonus: false,
			rtp: 0.961,
			max_win: 20000,
		},
		BONUS: {
			cost: 100.0,
			feature: false,
			buyBonus: true,
			rtp: 0.961,
			max_win: 30000,
		},
		SUPER: {
			cost: 400.0,
			feature: false,
			buyBonus: true,
			rtp: 0.961,
			max_win: 120000,
		},
	},
	paylines: {
		'1': [0, 0, 0, 0, 0],
		'2': [1, 1, 1, 1, 1],
		'3': [2, 2, 2, 2, 2],
		'4': [3, 3, 3, 3, 3],
		'5': [0, 1, 2, 1, 0],
		'6': [3, 2, 1, 2, 3],
		'7': [0, 0, 1, 0, 0],
		'8': [3, 3, 2, 3, 3],
		'9': [1, 2, 3, 2, 1],
		'10': [2, 1, 0, 1, 2],
		'11': [0, 1, 1, 1, 0],
		'12': [3, 2, 2, 2, 3],
		'13': [1, 1, 2, 1, 1],
		'14': [2, 2, 1, 2, 2],
		'15': [1, 0, 1, 0, 1],
		'16': [2, 3, 2, 3, 2],
		'17': [0, 1, 0, 1, 0],
		'18': [3, 2, 3, 2, 3],
		'19': [1, 2, 1, 2, 1],
		'20': [2, 1, 2, 1, 2],
	},
	symbols: {
		FOX: { paytable: [{ '5': 250 }, { '4': 20 }, { '3': 3 }] },
		WOLF: { paytable: [{ '5': 175 }, { '4': 15 }, { '3': 2.5 }] },
		BEAR: { paytable: [{ '5': 150 }, { '4': 12 }, { '3': 2 }] },
		RABBIT: { paytable: [{ '5': 100 }, { '4': 10 }, { '3': 1.5 }] },
		SQUIRREL: { paytable: [{ '5': 75 }, { '4': 8 }, { '3': 1 }] },
		A: { paytable: [{ '5': 40 }, { '4': 5 }, { '3': 0.8 }] },
		K: { paytable: [{ '5': 35 }, { '4': 4 }, { '3': 0.7 }] },
		Q: { paytable: [{ '5': 30 }, { '4': 3.5 }, { '3': 0.6 }] },
		J: { paytable: [{ '5': 25 }, { '4': 3 }, { '3': 0.5 }] },
		T: { paytable: [{ '5': 20 }, { '4': 2.5 }, { '3': 0.4 }] },
		WILD: { special_properties: ['wild'] },
		SCATTER: { special_properties: ['scatter'] },
	},
	paddingReels: {
		basegame: basePaddingReels,
		freegame: freegamePaddingReels,
		superspin: superspinPaddingReels,
		feature: freegamePaddingReels,
	},
};
