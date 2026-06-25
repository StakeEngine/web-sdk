// CHANGE ME: update symbol paytable values for your game
import type { SymbolName, BetMode, GameType } from './types';

export type SymbolConfig = {
	name: SymbolName;
	payouts: Partial<Record<2 | 3 | 4 | 5, number>>;
};

const symbols: SymbolConfig[] = [
	// CHANGE ME: update payouts to match your game math
	{ name: 'H1',      payouts: { 3: 3.0,  4: 20.0,  5: 250.0 } },
	{ name: 'H2',      payouts: { 3: 2.5,  4: 15.0,  5: 175.0 } },
	{ name: 'H3',      payouts: { 3: 2.0,  4: 12.0,  5: 150.0 } },
	{ name: 'H4',      payouts: { 3: 1.5,  4: 10.0,  5: 100.0 } },
	{ name: 'H5',      payouts: { 3: 1.0,  4: 8.0,   5: 80.0  } },
	{ name: 'L1',      payouts: { 3: 0.5,  4: 4.0,   5: 40.0  } },
	{ name: 'L2',      payouts: { 3: 0.4,  4: 3.0,   5: 30.0  } },
	{ name: 'L3',      payouts: { 3: 0.3,  4: 2.5,   5: 25.0  } },
	{ name: 'L4',      payouts: { 3: 0.3,  4: 2.0,   5: 20.0  } },
	{ name: 'L5',      payouts: { 3: 0.2,  4: 1.5,   5: 15.0  } },
	{ name: 'WILD',    payouts: {} },
	{ name: 'SCATTER', payouts: {} },
];

// CHANGE ME: update paylines for your game (these are 20 standard 5x3 paylines)
export const PAYLINES: number[][] = [
	[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
	[0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 0, 0],
	[2, 2, 1, 2, 2], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1],
	[0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [1, 0, 1, 0, 1],
	[1, 2, 1, 2, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2],
	[1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 2, 0, 2, 0],
	[2, 0, 2, 0, 2], [0, 2, 2, 2, 0],
];

export type GameConfig = {
	freegame_type: string;
	basegame_type: string;
	paddingReels: Record<GameType, number[]>;
	symbols: SymbolConfig[];
	paylines: number[][];
	totalFreeSpins: number;
	minScattersForBonus: number;
};

const config: GameConfig = {
	freegame_type: 'freegame',
	basegame_type: 'basegame',
	// CHANGE ME: padding defines extra symbols above/below visible board for reel spin feel
	paddingReels: {
		basegame: [4, 4, 4, 4, 4],
		freegame: [2, 2, 2, 2, 2],
	},
	symbols,
	paylines: PAYLINES,
	// CHANGE ME: adjust free spin count and scatter trigger threshold
	totalFreeSpins: 10,
	minScattersForBonus: 3,
};

export default config;
