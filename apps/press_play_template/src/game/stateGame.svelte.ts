import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createEnhanceBoard, createReelForSpinning } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { GameType, RawSymbol, SymbolState, Position, SymbolName } from './types';
import { stateLayoutDerived } from './stateLayout';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import {
	SYMBOL_SIZE,
	BOARD_SIZES,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	BOARD_GRID_OFFSET_Y,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	SPIN_OPTIONS_TURBO,
	SPIN_OPTIONS_ANTICIPATED,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
} from './constants';

const onSymbolLand = ({ rawSymbol }: { rawSymbol: RawSymbol }) => {
	if (rawSymbol.name === 'SCATTER') {
		eventEmitter.broadcast({ type: 'soundScatterCounterIncrease' });
		eventEmitter.broadcast({ type: 'soundOnce', name: SCATTER_LAND_SOUND_MAP[scatterLandIndex()] });
	}
};

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
	const reel = createReelForSpinning({
		reelIndex,
		symbolHeight: SYMBOL_SIZE,
		initialSymbols: INITIAL_BOARD[reelIndex],
		initialSymbolState: INITIAL_SYMBOL_STATE,
		onReelStopping: () => {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_reel_stop_1', forcePlay: !(stateBet.isTurbo || stateBet.isSuperTurbo) });
		},
		onSymbolLand,
	});

	reel.reelState.spinOptions = () => {
		if ((stateBet.isTurbo || stateBet.isSuperTurbo) && !stateGame.bonusMode) return SPIN_OPTIONS_TURBO;
		if (reel.reelState.spinType === 'fast') return stateGame.bonusMode ? SPIN_OPTIONS_DEFAULT : SPIN_OPTIONS_FAST;
		if (reel.reelState.spinType === 'anticipated') return stateGame.bonusMode ? SPIN_OPTIONS_DEFAULT : SPIN_OPTIONS_ANTICIPATED;
		return SPIN_OPTIONS_DEFAULT;
	};

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

export const stateGame = $state({
	board,
	gameType: 'basegame' as GameType,
	scatterCounter: 0,
	selectedBonusSymbol: null as SymbolName | null,
	bonusMode: null as 'freegame' | null,
	expandedSymbol: null as null | { symbol: SymbolName; reels: number[]; positions: Position[] },
	expandedSymbolWon: false,
	paylineWins: [] as Array<{ lineIndex: number; path: Array<{ reel: number; row: number }> }>,
	endRoundOnly: false,
	pendingStop: false,
	awaitingFirstReveal: false,
	stopAutoOnBonus: false,
});

const getBoardViewportPadding = () => {
	const layoutType = stateLayoutDerived.layoutType();
	if (layoutType === 'portrait')  return { top: 8,   right: 6,   bottom: 146, left: 6 };
	if (layoutType === 'landscape') return { top: 4,   right: 16,  bottom: 22,  left: 8 };
	if (layoutType === 'tablet')    return { top: 10,  right: 20,  bottom: 86,  left: 20 };
	return                                 { top: 108, right: 220, bottom: 172, left: 208 };
};

const getBoardViewportMetrics = () => {
	const mainLayout = stateLayoutDerived.mainLayout();
	const canvasSizes = stateLayoutDerived.canvasSizes();
	const padding = getBoardViewportPadding();
	const availableCanvasWidth  = Math.max(BOARD_SIZES.width  * mainLayout.scale, canvasSizes.width  - padding.left - padding.right);
	const availableCanvasHeight = Math.max(BOARD_SIZES.height * mainLayout.scale, canvasSizes.height - padding.top  - padding.bottom);
	return { mainLayout, canvasSizes, padding, availableCanvasWidth, availableCanvasHeight };
};

const getBoardScale = () => {
	const { mainLayout, availableCanvasHeight, availableCanvasWidth } = getBoardViewportMetrics();
	return Math.max(1, Math.min(
		availableCanvasHeight / (BOARD_SIZES.height * (mainLayout.scale || 1)),
		availableCanvasWidth  / (BOARD_SIZES.width  * (mainLayout.scale || 1)),
	));
};

const getBoardOffset = () => {
	const { mainLayout, canvasSizes, padding, availableCanvasHeight, availableCanvasWidth } = getBoardViewportMetrics();
	const layoutType = stateLayoutDerived.layoutType();
	const extraLeftShiftPx = layoutType === 'desktop' ? 75 : layoutType === 'landscape' ? 55 : 0;
	const centeredCanvasX = padding.left + availableCanvasWidth  * 0.5 - canvasSizes.width  * 0.5;
	const centeredCanvasY = padding.top  + availableCanvasHeight * 0.5 - canvasSizes.height * 0.5;
	return {
		x: (centeredCanvasX - extraLeftShiftPx + 90) / (mainLayout.scale || 1),
		y: (centeredCanvasY + 10) / (mainLayout.scale || 1),
	};
};

const _FRAME_MARGIN      = 1.04;
const _FRAME_INNER_W_FRAC = 0.64;
const _FRAME_ASPECT_H_W  = 2528 / 3616;
const _FRAME_ANCHOR_Y    = 0.45;
const _FRAME_EXTRA_SCALE = 1.35 / 1.15;

const boardLayout = () => {
	const boardScale = getBoardScale() * 0.72 * 1.15;
	const frameW = (BOARD_SIZES.width * boardScale * _FRAME_MARGIN * _FRAME_EXTRA_SCALE) / _FRAME_INNER_W_FRAC;
	const frameH = frameW * _FRAME_ASPECT_H_W;
	return {
		x: stateLayoutDerived.mainLayout().width * 0.5 + getBoardOffset().x,
		y: frameH * _FRAME_ANCHOR_Y,
		boardScale,
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
		...BOARD_SIZES,
	};
};

const boardRaw = () => board.map((reel) => reel.reelState.symbols.map((s) => s.rawSymbol));

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

const resetBonusState = () => {
	stateGame.selectedBonusSymbol = null;
	stateGame.bonusMode = null;
	stateGame.expandedSymbol = null;
	stateGame.expandedSymbolWon = false;
	stateGame.paylineWins = [];
};

const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({ board: stateGame.board });

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({ winLevelMap });

export const stateGameDerived = {
	onSymbolLand,
	boardLayout,
	boardRaw,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
	resetBonusState,
};
