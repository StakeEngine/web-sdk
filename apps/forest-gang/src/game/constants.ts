import _ from 'lodash';

import type { RawSymbol, SymbolState } from './types';

// Symbol cells sized so the 5×4 grid fills the wooden frame's inner panel
export const SYMBOL_W = 121;   // cell width
export const SYMBOL_H = 103;   // cell height
export const SYMBOL_SIZE = SYMBOL_H; // kept as alias for height-based calculations
export const BOARD_GRID_OFFSET_Y = 0;
export const REEL_PADDING = 0.53;

const _BASE_SYMBOLS: RawSymbol[] = [
	{ name: 'A' }, { name: 'A' },
	{ name: 'K' }, { name: 'K' },
	{ name: 'Q' }, { name: 'Q' },
	{ name: 'J' }, { name: 'J' }, { name: 'J' },
	{ name: 'T' }, { name: 'T' }, { name: 'T' }, { name: 'T' },
];

const _makeRandomReel = (includeScatter: boolean): RawSymbol[] => {
	const pool = [..._BASE_SYMBOLS];
	const reel: RawSymbol[] = [];
	for (let i = 0; i < 6; i++) {
		const idx = Math.floor(Math.random() * pool.length);
		reel.push({ ...pool[idx] });
	}
	if (includeScatter) {
		reel[Math.floor(Math.random() * 6)] = { name: 'SCATTER', scatter: true };
	}
	return reel;
};

export const INITIAL_BOARD: RawSymbol[][] = [
	_makeRandomReel(false),
	_makeRandomReel(false),
	_makeRandomReel(false),
	_makeRandomReel(false),
	_makeRandomReel(false),
];

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };
export const BOARD_SIZES = {
	width: SYMBOL_W * BOARD_DIMENSIONS.x,   // 150 × 5 = 750
	height: SYMBOL_H * BOARD_DIMENSIONS.y,  // 105 × 4 = 420
};

export const BACKGROUND_RATIO = 2039 / 1000;
export const PORTRAIT_BACKGROUND_RATIO = 1242 / 2208;
const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;

const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = {
	width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO,
	height: LANDSCAPE_HEIGHT,
};
export const PORTRAIT_MAIN_SIZES = {
	width: PORTRAIT_HEIGHT * PORTRAIT_RATIO,
	height: PORTRAIT_HEIGHT,
};

export const HIGH_SYMBOLS = ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL'];
export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const HIGH_SYMBOL_SIZE = 0.9;
const LOW_SYMBOL_SIZE = 0.9;
const SPECIAL_SYMBOL_SIZE = 1;

const SPIN_OPTIONS_SHARED = {
	reelBounceBackSpeed: 0.15,
	reelSpinSpeedBeforeBounce: 4,
	reelPaddingMultiplierNormal: 1.2,
	reelPaddingMultiplierAnticipated: 10,
	reelSpinDelay: 145,
};

export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 2,
	reelSpinSpeed: 3,
	reelBounceSizeMulti: 0.3,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 3,
	reelSpinSpeed: 4,
	reelBounceSizeMulti: 0.15,
};

export const SPIN_OPTIONS_TURBO = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 6,
	reelSpinSpeed: 7,
	reelBounceSizeMulti: 0.1,
	reelSpinDelay: 60,
};

export const SPIN_OPTIONS_ANTICIPATED = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 3.4,
	reelSpinSpeed: 4.1,
	reelBounceSizeMulti: 0.2,
	reelPaddingMultiplierAnticipated: 6,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

const explosion = {
	type: 'spine',
	assetKey: 'explosion',
	animationName: 'explosion',
	sizeRatios: { width: 1, height: 1 },
};

const s = (key: string) => ({ type: 'sprite', assetKey: key, sizeRatios: { width: 1, height: 1 } });

const foxStatic      = s('foxTile');       const foxWin      = s('foxWinTile');
const wolfStatic     = s('wolfTile');      const wolfWin     = s('wolfWinTile');
const bearStatic     = s('bearTile');      const bearWin     = s('bearWinTile');
const rabbitStatic   = s('rabbitTile');    const rabbitWin   = s('rabbitWinTile');
const squirrelStatic = s('squirrelTile');  const squirrelWin = s('squirrelWinTile');

const aStatic = s('aTile');  const aWin = s('aWinTile');
const kStatic = s('kTile');  const kWin = s('kWinTile');
const qStatic = s('qTile');  const qWin = s('qWinTile');
const jStatic = s('jTile');
const jWin = { type: 'spineIntroLoop', assetKey: 'squirrelJAnim', introAnimation: 'intro_to_win', loopAnimation: 'win_loop', sizeRatios: { width: 1, height: 1 } };
const tStatic = s('tTile');  const tWin = s('tWinTile');

const scatterStatic = { type: 'sprite', assetKey: 'scatterCustom', sizeRatios: { width: 1.243, height: 1.243 } };
const scatterWin   = { type: 'sprite', assetKey: 'scatterWin',    sizeRatios: { width: 1.243, height: 1.243 } };
const wildStatic  = { type: 'sprite', assetKey: 'wildTile',    sizeRatios: { width: 1, height: 1 } };
const wildWin     = { type: 'sprite', assetKey: 'wildWinTile', sizeRatios: { width: 1, height: 1 } };

const wildSizeRatios = { width: 1, height: 1 };
const scatterSizeRatios = { width: 1.243, height: 1.243 };

export const SYMBOL_INFO_MAP = {
	FOX: {
		explosion,
		win: foxWin,
		postWinStatic: foxStatic,
		static: foxStatic,
		spin: foxStatic,
		land: foxStatic,
	},
	WOLF: {
		explosion,
		win: wolfWin,
		postWinStatic: wolfStatic,
		static: wolfStatic,
		spin: wolfStatic,
		land: wolfStatic,
	},
	BEAR: {
		explosion,
		win: bearWin,
		postWinStatic: bearStatic,
		static: bearStatic,
		spin: bearStatic,
		land: bearStatic,
	},
	RABBIT: {
		explosion,
		win: rabbitWin,
		postWinStatic: rabbitStatic,
		static: rabbitStatic,
		spin: rabbitStatic,
		land: rabbitStatic,
	},
	SQUIRREL: {
		explosion,
		win: squirrelWin,
		postWinStatic: squirrelStatic,
		static: squirrelStatic,
		spin: squirrelStatic,
		land: squirrelStatic,
	},
	A: {
		explosion,
		win: aWin,
		postWinStatic: aStatic,
		static: aStatic,
		spin: aStatic,
		land: aStatic,
	},
	K: {
		explosion,
		win: kWin,
		postWinStatic: kStatic,
		static: kStatic,
		spin: kStatic,
		land: kStatic,
	},
	Q: {
		explosion,
		win: qWin,
		postWinStatic: qStatic,
		static: qStatic,
		spin: qStatic,
		land: qStatic,
	},
	J: {
		explosion,
		win: jWin,
		postWinStatic: jStatic,
		static: jStatic,
		spin: jStatic,
		land: jStatic,
	},
	T: {
		explosion,
		win: tWin,
		postWinStatic: tStatic,
		static: tStatic,
		spin: tStatic,
		land: tStatic,
	},
	WILD: {
		explosion,
		postWinStatic: wildStatic,
		static: wildStatic,
		spin: wildStatic,
		win: wildWin,
		land: wildStatic,
	},
	SCATTER: {
		explosion,
		postWinStatic: scatterStatic,
		static: scatterStatic,
		spin: scatterStatic,
		win: scatterWin,
		land: scatterStatic,
	},
} as const;

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;

export const winPositionToExpandedReels = (positions: { reel: number; row: number }[]) =>
	_.uniq(positions.map((position) => position.reel));
