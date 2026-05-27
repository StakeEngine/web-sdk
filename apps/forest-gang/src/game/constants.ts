import _ from 'lodash';

import type { RawSymbol, SymbolState } from './types';

export const SYMBOL_SIZE = 120;
export const REEL_PADDING = 0.53;

export const INITIAL_BOARD: RawSymbol[][] = [
	[{ name: 'K' }, { name: 'A' }, { name: 'FOX' }, { name: 'J' }, { name: 'SCATTER', scatter: true }, { name: 'T' }],
	[{ name: 'Q' }, { name: 'WOLF' }, { name: 'K' }, { name: 'A' }, { name: 'RABBIT' }, { name: 'J' }],
	[{ name: 'J' }, { name: 'Q' }, { name: 'BEAR' }, { name: 'WILD', wild: true }, { name: 'K' }, { name: 'A' }],
	[{ name: 'A' }, { name: 'RABBIT' }, { name: 'J' }, { name: 'Q' }, { name: 'WOLF' }, { name: 'K' }],
	[{ name: 'T' }, { name: 'SCATTER', scatter: true }, { name: 'SQUIRREL' }, { name: 'A' }, { name: 'FOX' }, { name: 'Q' }],
];

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };
export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
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
	reelPreSpinSpeed: 5,
	reelSpinSpeed: 5,
	reelBounceSizeMulti: 0.05,
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

const foxStatic = { type: 'sprite', assetKey: 'foxTile', sizeRatios: { width: 1, height: 1 } };
const wolfStatic = { type: 'sprite', assetKey: 'wolfTile', sizeRatios: { width: 1, height: 1 } };
const bearStatic = { type: 'sprite', assetKey: 'bearTile', sizeRatios: { width: 1, height: 1 } };
const rabbitStatic = { type: 'sprite', assetKey: 'rabbitTile', sizeRatios: { width: 1, height: 1 } };
const squirrelStatic = { type: 'sprite', assetKey: 'squirrelTile', sizeRatios: { width: 1, height: 1 } };

const aStatic = { type: 'sprite', assetKey: 'aTile', sizeRatios: { width: 1, height: 1 } };
const kStatic = { type: 'sprite', assetKey: 'kTile', sizeRatios: { width: 1, height: 1 } };
const qStatic = { type: 'sprite', assetKey: 'qTile', sizeRatios: { width: 1, height: 1 } };
const jStatic = { type: 'sprite', assetKey: 'jTile', sizeRatios: { width: 1, height: 1 } };
const tStatic = { type: 'sprite', assetKey: 'tTile', sizeRatios: { width: 1, height: 1 } };

const scatterStatic = { type: 'sprite', assetKey: 'scatterCustom', sizeRatios: { width: 1.243, height: 1.243 } };
const wildStatic = { type: 'sprite', assetKey: 'foxTile', sizeRatios: { width: 1, height: 1 } };

const wildSizeRatios = { width: 1, height: 1 };
const scatterSizeRatios = { width: 1.243, height: 1.243 };

export const SYMBOL_INFO_MAP = {
	FOX: {
		explosion,
		win: foxStatic,
		postWinStatic: foxStatic,
		static: foxStatic,
		spin: foxStatic,
		land: foxStatic,
	},
	WOLF: {
		explosion,
		win: wolfStatic,
		postWinStatic: wolfStatic,
		static: wolfStatic,
		spin: wolfStatic,
		land: wolfStatic,
	},
	BEAR: {
		explosion,
		win: bearStatic,
		postWinStatic: bearStatic,
		static: bearStatic,
		spin: bearStatic,
		land: bearStatic,
	},
	RABBIT: {
		explosion,
		win: rabbitStatic,
		postWinStatic: rabbitStatic,
		static: rabbitStatic,
		spin: rabbitStatic,
		land: rabbitStatic,
	},
	SQUIRREL: {
		explosion,
		win: squirrelStatic,
		postWinStatic: squirrelStatic,
		static: squirrelStatic,
		spin: squirrelStatic,
		land: squirrelStatic,
	},
	A: {
		explosion,
		win: aStatic,
		postWinStatic: aStatic,
		static: aStatic,
		spin: aStatic,
		land: aStatic,
	},
	K: {
		explosion,
		win: kStatic,
		postWinStatic: kStatic,
		static: kStatic,
		spin: kStatic,
		land: kStatic,
	},
	Q: {
		explosion,
		win: qStatic,
		postWinStatic: qStatic,
		static: qStatic,
		spin: qStatic,
		land: qStatic,
	},
	J: {
		explosion,
		win: jStatic,
		postWinStatic: jStatic,
		static: jStatic,
		spin: jStatic,
		land: jStatic,
	},
	T: {
		explosion,
		win: tStatic,
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
		win: wildStatic,
		land: wildStatic,
	},
	SCATTER: {
		explosion,
		postWinStatic: scatterStatic,
		static: scatterStatic,
		spin: scatterStatic,
		win: scatterStatic,
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
