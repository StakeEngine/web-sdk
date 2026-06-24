import _ from 'lodash';
import type { SymbolName, RawSymbol, SymbolState } from './types';

// CHANGE ME: board dimensions
export const BOARD_DIMENSIONS = { x: 5, y: 3 };

// CHANGE ME: adjust symbol display size to match your art
export const SYMBOL_SIZE = 150;
export const SYMBOL_W = SYMBOL_SIZE;
export const SYMBOL_H = SYMBOL_SIZE;

export const BOARD_SIZES = {
	width: SYMBOL_W * BOARD_DIMENSIONS.x,
	height: SYMBOL_H * BOARD_DIMENSIONS.y,
};

export const BOARD_GRID_OFFSET_Y = 0;

// CHANGE ME: SYMBOL_INFO_MAP — defines how each symbol is rendered
// type 'sprite' = static PNG (no animation)
// type 'spine' = Spine animation
// type 'spineIntroLoop' = Spine with intro→loop transition
export type SymbolInfo =
	| { type: 'sprite'; assetKey: string; sizeRatios: { width: number; height: number }; animationName?: never }
	| { type: 'spine'; assetKey: string; animationName: string; sizeRatios: { width: number; height: number } }
	| { type: 'spineIntroLoop'; assetKey: string; introAnimation: string; loopAnimation: string; sizeRatios: { width: number; height: number } };

export const SYMBOL_INFO_MAP: Record<SymbolName, Record<SymbolState, SymbolInfo>> = {
	// CHANGE ME: replace assetKey with your actual asset keys (defined in assets.ts)
	H1:      { spin: { type: 'sprite', assetKey: 'sym_h1',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_h1',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_h1',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_h1_win',   sizeRatios: { width: 1, height: 1 } } },
	H2:      { spin: { type: 'sprite', assetKey: 'sym_h2',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_h2',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_h2',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_h2_win',   sizeRatios: { width: 1, height: 1 } } },
	H3:      { spin: { type: 'sprite', assetKey: 'sym_h3',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_h3',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_h3',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_h3_win',   sizeRatios: { width: 1, height: 1 } } },
	H4:      { spin: { type: 'sprite', assetKey: 'sym_h4',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_h4',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_h4',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_h4_win',   sizeRatios: { width: 1, height: 1 } } },
	H5:      { spin: { type: 'sprite', assetKey: 'sym_h5',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_h5',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_h5',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_h5_win',   sizeRatios: { width: 1, height: 1 } } },
	L1:      { spin: { type: 'sprite', assetKey: 'sym_l1',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_l1',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_l1',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_l1_win',   sizeRatios: { width: 1, height: 1 } } },
	L2:      { spin: { type: 'sprite', assetKey: 'sym_l2',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_l2',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_l2',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_l2_win',   sizeRatios: { width: 1, height: 1 } } },
	L3:      { spin: { type: 'sprite', assetKey: 'sym_l3',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_l3',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_l3',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_l3_win',   sizeRatios: { width: 1, height: 1 } } },
	L4:      { spin: { type: 'sprite', assetKey: 'sym_l4',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_l4',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_l4',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_l4_win',   sizeRatios: { width: 1, height: 1 } } },
	L5:      { spin: { type: 'sprite', assetKey: 'sym_l5',       sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_l5',       sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_l5',       sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_l5_win',   sizeRatios: { width: 1, height: 1 } } },
	WILD:    { spin: { type: 'sprite', assetKey: 'sym_wild',     sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_wild',     sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_wild',     sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_wild_win', sizeRatios: { width: 1, height: 1 } } },
	SCATTER: { spin: { type: 'sprite', assetKey: 'sym_scatter',  sizeRatios: { width: 1, height: 1 } }, land: { type: 'sprite', assetKey: 'sym_scatter',  sizeRatios: { width: 1, height: 1 } }, static: { type: 'sprite', assetKey: 'sym_scatter',  sizeRatios: { width: 1, height: 1 } }, win: { type: 'sprite', assetKey: 'sym_scatter',  sizeRatios: { width: 1, height: 1 } } },
};

// CHANGE ME: which symbols can be the expanding symbol in bonus
export const HIGH_SYMBOLS: SymbolName[] = ['H1', 'H2', 'H3', 'H4', 'H5', 'L1', 'L2', 'L3', 'L4', 'L5'];

export const INITIAL_SYMBOL_STATE = 'static' as const;

export const INITIAL_BOARD: SymbolName[][] = _.range(BOARD_DIMENSIONS.x).map((i) =>
	_.range(BOARD_DIMENSIONS.y + 4).map(() => {
		// CHANGE ME: initial board symbols to match your symbol set
		const all: SymbolName[] = ['H1', 'H2', 'H3', 'H4', 'H5', 'L1', 'L2', 'L3', 'L4', 'L5'];
		return all[Math.floor(Math.random() * all.length)];
	})
);

// CHANGE ME: scatter land sounds — indexed by how many scatters have landed (1-5)
export const SCATTER_LAND_SOUND_MAP: Record<1 | 2 | 3 | 4 | 5, string> = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
};

// Spin timing options — tune as needed
export const SPIN_OPTIONS_DEFAULT = {
	spinVelocity: 70,
	spinDuration: 700,
	bounceDistance: SYMBOL_H * 0.3,
	bounceDuration: 150,
	staggerDelay: 100,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_DEFAULT,
	spinDuration: 400,
	staggerDelay: 60,
};

export const SPIN_OPTIONS_TURBO = {
	...SPIN_OPTIONS_DEFAULT,
	spinDuration: 200,
	staggerDelay: 0,
	bounceDuration: 60,
};

export const SPIN_OPTIONS_ANTICIPATED = {
	...SPIN_OPTIONS_DEFAULT,
	spinDuration: 1200,
	staggerDelay: 100,
};

export const MOTION_BLUR_VELOCITY = SYMBOL_H * 0.7;

export const zIndexes = {
	board: 0,
	overlay: 10,
	win: 20,
	freeSpin: 30,
	hud: 40,
};
