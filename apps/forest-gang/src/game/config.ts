import type { RawSymbol, SymbolName } from './types';

const makeReel = (names: SymbolName[]): RawSymbol[] => names.map((name) => ({ name }));

const basePaddingReels = [
	makeReel(['A', 'FOX', 'J', 'SCATTER', 'BEAR', 'K', 'WILD', 'Q', 'RABBIT', 'T', 'WOLF', 'A']),
	makeReel(['K', 'Q', 'FOX', 'J', 'SCATTER', 'SQUIRREL', 'A', 'WILD', 'BEAR', 'T', 'RABBIT', 'K']),
	makeReel(['Q', 'A', 'WOLF', 'SCATTER', 'J', 'FOX', 'T', 'BEAR', 'K', 'WILD', 'RABBIT', 'Q']),
	makeReel(['J', 'BEAR', 'K', 'Q', 'SCATTER', 'WOLF', 'A', 'RABBIT', 'T', 'FOX', 'WILD', 'J']),
	makeReel(['T', 'RABBIT', 'A', 'K', 'SCATTER', 'FOX', 'Q', 'WOLF', 'J', 'SQUIRREL', 'WILD', 'T']),
];

const freegamePaddingReels = [
	makeReel(['FOX', 'A', 'J', 'BEAR', 'SCATTER', 'FOX', 'K', 'RABBIT', 'WILD', 'Q', 'WOLF', 'A']),
	makeReel(['K', 'FOX', 'Q', 'J', 'SCATTER', 'BEAR', 'A', 'WOLF', 'T', 'FOX', 'RABBIT', 'K']),
	makeReel(['Q', 'A', 'FOX', 'SCATTER', 'J', 'FOX', 'T', 'BEAR', 'K', 'WILD', 'RABBIT', 'Q']),
	makeReel(['J', 'BEAR', 'K', 'FOX', 'SCATTER', 'WOLF', 'A', 'RABBIT', 'T', 'FOX', 'WILD', 'J']),
	makeReel(['T', 'FOX', 'A', 'K', 'SCATTER', 'FOX', 'Q', 'WOLF', 'J', 'SQUIRREL', 'WILD', 'T']),
];

const superspinPaddingReels = [
	makeReel(['WOLF', 'A', 'J', 'BEAR', 'SCATTER', 'FOX', 'K', 'RABBIT', 'WILD', 'Q', 'WOLF', 'A']),
	makeReel(['K', 'FOX', 'Q', 'J', 'SCATTER', 'BEAR', 'A', 'WOLF', 'T', 'FOX', 'RABBIT', 'K']),
	makeReel(['Q', 'A', 'WOLF', 'SCATTER', 'J', 'FOX', 'T', 'BEAR', 'K', 'WILD', 'RABBIT', 'Q']),
	makeReel(['J', 'BEAR', 'K', 'WOLF', 'SCATTER', 'WOLF', 'A', 'RABBIT', 'T', 'FOX', 'WILD', 'J']),
	makeReel(['T', 'FOX', 'A', 'K', 'SCATTER', 'WOLF', 'Q', 'WOLF', 'J', 'SQUIRREL', 'WILD', 'T']),
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
			max_win: 20000,
		},
		SUPER: {
			cost: 400.0,
			feature: false,
			buyBonus: true,
			rtp: 0.961,
			max_win: 20000,
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
	},
};
