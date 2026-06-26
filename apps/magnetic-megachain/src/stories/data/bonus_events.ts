export default {
	reveal: {
		type: 'reveal',
		board: [
			[{ name: 'A' }, { name: 'FOX' }, { name: 'FOX' }, { name: 'FOX' }, { name: 'FOX' }, { name: 'Q' }],
			[{ name: 'K' }, { name: 'FOX' }, { name: 'A' }, { name: 'RABBIT' }, { name: 'WOLF' }, { name: 'J' }],
			[{ name: 'Q' }, { name: 'FOX' }, { name: 'A' }, { name: 'BEAR' }, { name: 'K' }, { name: 'T' }],
			[{ name: 'J' }, { name: 'FOX' }, { name: 'Q' }, { name: 'A' }, { name: 'WOLF' }, { name: 'K' }],
			[{ name: 'T' }, { name: 'FOX' }, { name: 'J' }, { name: 'Q' }, { name: 'A' }, { name: 'K' }],
		],
		paddingPositions: [2, 4, 6, 8, 10],
		gameType: 'freegame',
		anticipation: [0, 0, 0, 0, 0],
	},
	setTotalWin: { type: 'setTotalWin', amount: 4500 },
	finalWin: { type: 'finalWin', amount: 4500 },
	freeSpinTrigger: {
		type: 'freeSpinTrigger',
		totalFs: 10,
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 1, row: 2 },
			{ reel: 2, row: 3 },
			{ reel: 4, row: 4 },
		],
	},
	bonusSymbolSelected: { type: 'bonusSymbolSelected', symbol: 'FOX', mode: 'freegame' },
	expandedSymbolReveal: {
		type: 'expandedSymbolReveal',
		symbol: 'FOX',
		reels: [0, 2, 3, 4],
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 2, row: 1 },
			{ reel: 3, row: 1 },
			{ reel: 4, row: 1 },
		],
	},
	applyTempMultiplier: { type: 'applyTempMultiplier', multiplier: 3, winBefore: 1500, winAfter: 4500 },
	updateReelMultipliers: { type: 'updateReelMultipliers', multipliers: [1, 2, 4, 1, 8], changedReels: [1, 2, 4] },
	updateFreeSpin: { type: 'updateFreeSpin', amount: 2, total: 10 },
	winInfo: {
		type: 'winInfo',
		totalWin: 1500,
		wins: [
			{
				symbol: 'FOX',
				kind: 5,
				win: 1500,
				positions: [
					{ reel: 0, row: 1 },
					{ reel: 1, row: 1 },
					{ reel: 2, row: 1 },
					{ reel: 3, row: 1 },
					{ reel: 4, row: 1 },
				],
				meta: { lineIndex: 1, multiplier: 1, winWithoutMult: 1500, globalMult: 1, lineMultiplier: 1 },
			},
		],
	},
	setWin: { type: 'setWin', amount: 4500, winLevel: 6 },
	freeSpinEnd: { type: 'freeSpinEnd', amount: 12000, winLevel: 8 },
};
