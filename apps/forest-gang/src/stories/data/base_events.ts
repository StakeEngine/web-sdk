export default {
	reveal: {
		type: 'reveal',
		board: [
			[{ name: 'K' }, { name: 'FOX' }, { name: 'A' }, { name: 'J' }, { name: 'Q' }, { name: 'T' }],
			[{ name: 'A' }, { name: 'FOX' }, { name: 'K' }, { name: 'WOLF' }, { name: 'J' }, { name: 'Q' }],
			[{ name: 'Q' }, { name: 'FOX' }, { name: 'A' }, { name: 'BEAR' }, { name: 'K' }, { name: 'J' }],
			[{ name: 'J' }, { name: 'RABBIT' }, { name: 'Q' }, { name: 'A' }, { name: 'WOLF' }, { name: 'K' }],
			[{ name: 'T' }, { name: 'SQUIRREL' }, { name: 'J' }, { name: 'Q' }, { name: 'A' }, { name: 'K' }],
		],
		paddingPositions: [1, 3, 5, 7, 9],
		gameType: 'basegame',
		anticipation: [0, 0, 0, 0, 0],
	},
	setTotalWin: { type: 'setTotalWin', amount: 300 },
	finalWin: { type: 'finalWin', amount: 300 },
	freeSpinTrigger: {
		type: 'freeSpinTrigger',
		totalFs: 10,
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 2, row: 2 },
			{ reel: 4, row: 4 },
		],
	},
	updateFreeSpin: { type: 'updateFreeSpin', amount: 0, total: 10 },
	winInfo: {
		type: 'winInfo',
		totalWin: 300,
		wins: [
			{
				symbol: 'FOX',
				kind: 3,
				win: 300,
				positions: [
					{ reel: 0, row: 1 },
					{ reel: 1, row: 1 },
					{ reel: 2, row: 1 },
				],
				meta: { lineIndex: 1, multiplier: 1, winWithoutMult: 300, globalMult: 1, lineMultiplier: 1 },
			},
		],
	},
	setWin: { type: 'setWin', amount: 300, winLevel: 3 },
	freeSpinEnd: { type: 'freeSpinEnd', amount: 2300, winLevel: 5 },
};
