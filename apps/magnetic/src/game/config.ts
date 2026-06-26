const makeTierPaytable = (bands: Array<[number, number, number]>) => {
	const out: Record<string, number> = {};
	for (const [from, to, value] of bands) {
		for (let count = from; count <= to; count += 1) out[String(count)] = value;
	}
	return out;
};

export default {
	providerName: 'sample_provider',
	gameName: 'magnetic',
	gameID: '0_0_magnetic',
	rtp: 0.961,
	numReels: 7,
	numRows: [7, 7, 7, 7, 7, 7, 7],
	betModes: {
		BASE: { cost: 1.0, feature: true, buyBonus: false, rtp: 0.961, max_win: 20000 },
		CHANCE: { cost: 2.0, feature: true, buyBonus: false, rtp: 0.961, max_win: 20000 },
		FEATURE: { cost: 50.0, feature: true, buyBonus: false, rtp: 0.961, max_win: 20000 },
		BONUS: { cost: 150.0, feature: false, buyBonus: true, rtp: 0.961, max_win: 20000 },
		SUPER: { cost: 400.0, feature: false, buyBonus: true, rtp: 0.961, max_win: 20000 },
	},
	symbols: {
		FOX: { paytable: makeTierPaytable([[5, 7, 1.5], [8, 11, 4], [12, 19, 10], [20, 49, 40]]) },
		WOLF: { paytable: makeTierPaytable([[5, 7, 1.25], [8, 11, 3.5], [12, 19, 8], [20, 49, 30]]) },
		BEAR: { paytable: makeTierPaytable([[5, 7, 1], [8, 11, 3], [12, 19, 7], [20, 49, 24]]) },
		RABBIT: { paytable: makeTierPaytable([[5, 7, 0.8], [8, 11, 2.2], [12, 19, 5], [20, 49, 18]]) },
		SQUIRREL: { paytable: makeTierPaytable([[5, 7, 0.7], [8, 11, 2], [12, 19, 4.5], [20, 49, 14]]) },
		A: { paytable: makeTierPaytable([[5, 7, 0.6], [8, 11, 1.7], [12, 19, 4], [20, 49, 12]]) },
		K: { paytable: makeTierPaytable([[5, 7, 0.5], [8, 11, 1.5], [12, 19, 3.5], [20, 49, 10]]) },
		Q: { paytable: makeTierPaytable([[5, 7, 0.4], [8, 11, 1.3], [12, 19, 3], [20, 49, 8]]) },
		J: { paytable: makeTierPaytable([[5, 7, 0.35], [8, 11, 1.1], [12, 19, 2.5], [20, 49, 7]]) },
		T: { paytable: makeTierPaytable([[5, 7, 0.3], [8, 11, 1], [12, 19, 2.2], [20, 49, 6]]) },
		MAGNET: { special_properties: ['magnet', 'multiplier'] },
		SCATTER: { special_properties: ['scatter'] },
	},
} as const;
