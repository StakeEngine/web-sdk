import type { RawSymbol, SymbolState, SymbolName } from './types';

export const SYMBOL_W = 94;
export const SYMBOL_H = 94;
export const SYMBOL_SIZE = SYMBOL_H;
export const BOARD_GRID_OFFSET_Y = 0;
export const BOARD_DIMENSIONS = { x: 7, y: 7 };
export const BOARD_SIZES = {
	width: SYMBOL_W * BOARD_DIMENSIONS.x,
	height: SYMBOL_H * BOARD_DIMENSIONS.y,
};

export const BACKGROUND_RATIO = 1920 / 1080;
export const PORTRAIT_BACKGROUND_RATIO = 1242 / 2208;
const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;
const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = { width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO, height: LANDSCAPE_HEIGHT };
export const PORTRAIT_MAIN_SIZES = { width: PORTRAIT_HEIGHT * PORTRAIT_RATIO, height: PORTRAIT_HEIGHT };

export const PAY_SYMBOLS: SymbolName[] = ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL', 'A', 'K', 'Q', 'J', 'T'];
export const PREMIUM_SYMBOLS: SymbolName[] = ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL'];
export const LOW_SYMBOLS: SymbolName[] = ['A', 'K', 'Q', 'J', 'T'];

const baseRows: RawSymbol[][] = [
	['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL', 'A', 'K'],
	['Q', 'J', 'T', 'FOX', 'WOLF', 'BEAR', 'RABBIT'],
	['SQUIRREL', 'A', 'K', 'Q', 'J', 'T', 'FOX'],
	['WOLF', 'BEAR', 'RABBIT', 'SQUIRREL', 'A', 'K', 'Q'],
	['J', 'T', 'FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL'],
	['A', 'K', 'Q', 'J', 'T', 'FOX', 'WOLF'],
	['BEAR', 'RABBIT', 'SQUIRREL', 'A', 'K', 'Q', 'MAGNET'],
].map((row) => row.map((name) => ({ name: name as SymbolName, magnet: name === 'MAGNET', scatter: name === 'SCATTER' })));

export const INITIAL_BOARD = baseRows.map((row) => [...row]);
export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const sprite = (assetKey: string) => ({ type: 'sprite', assetKey, sizeRatios: { width: 1, height: 1 } });
const special = (assetKey: string) => ({ type: 'sprite', assetKey, sizeRatios: { width: 1.04, height: 1.04 } });

export const SYMBOL_INFO_MAP = {
	FOX: { static: sprite('foxTile'), spin: sprite('foxTile'), land: sprite('foxTile'), win: sprite('foxWinTile'), locked: sprite('foxWinTile'), magnet: sprite('foxWinTile') },
	WOLF: { static: sprite('wolfTile'), spin: sprite('wolfTile'), land: sprite('wolfTile'), win: sprite('wolfWinTile'), locked: sprite('wolfWinTile'), magnet: sprite('wolfWinTile') },
	BEAR: { static: sprite('bearTile'), spin: sprite('bearTile'), land: sprite('bearTile'), win: sprite('bearWinTile'), locked: sprite('bearWinTile'), magnet: sprite('bearWinTile') },
	RABBIT: { static: sprite('rabbitTile'), spin: sprite('rabbitTile'), land: sprite('rabbitTile'), win: sprite('rabbitWinTile'), locked: sprite('rabbitWinTile'), magnet: sprite('rabbitWinTile') },
	SQUIRREL: { static: sprite('squirrelTile'), spin: sprite('squirrelTile'), land: sprite('squirrelTile'), win: sprite('squirrelWinTile'), locked: sprite('squirrelWinTile'), magnet: sprite('squirrelWinTile') },
	A: { static: sprite('aTile'), spin: sprite('aTile'), land: sprite('aTile'), win: sprite('aWinTile'), locked: sprite('aWinTile'), magnet: sprite('aWinTile') },
	K: { static: sprite('kTile'), spin: sprite('kTile'), land: sprite('kTile'), win: sprite('kWinTile'), locked: sprite('kWinTile'), magnet: sprite('kWinTile') },
	Q: { static: sprite('qTile'), spin: sprite('qTile'), land: sprite('qTile'), win: sprite('qWinTile'), locked: sprite('qWinTile'), magnet: sprite('qWinTile') },
	J: { static: sprite('jTile'), spin: sprite('jTile'), land: sprite('jTile'), win: sprite('jWinTile'), locked: sprite('jWinTile'), magnet: sprite('jWinTile') },
	T: { static: sprite('tTile'), spin: sprite('tTile'), land: sprite('tTile'), win: sprite('tWinTile'), locked: sprite('tWinTile'), magnet: sprite('tWinTile') },
	MAGNET: { static: special('wildTile'), spin: special('wildTile'), land: special('wildTile'), win: special('wildWinTile'), locked: special('wildWinTile'), magnet: special('wildWinTile') },
	SCATTER: { static: special('scatterCustom'), spin: special('scatterCustom'), land: special('scatterCustom'), win: special('scatterWin'), locked: special('scatterWin'), magnet: special('scatterWin') },
} as const;

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
