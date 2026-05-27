import _ from 'lodash';
import type { Tween } from 'svelte/motion';

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
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
} from './constants';

const onSymbolLand = ({ rawSymbol }: { rawSymbol: RawSymbol }) => {
	if (rawSymbol.name === 'SCATTER') {
		eventEmitter.broadcast({ type: 'soundScatterCounterIncrease' });
		eventEmitter.broadcast({ type: 'soundOnce', name: SCATTER_LAND_SOUND_MAP[scatterLandIndex()] });
	}

	if (rawSymbol.name === 'WILD') {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
	}
};

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
	const reel = createReelForSpinning({
		reelIndex,
		symbolHeight: SYMBOL_SIZE,
		initialSymbols: INITIAL_BOARD[reelIndex],
		initialSymbolState: INITIAL_SYMBOL_STATE,
		onReelStopping: () => {
			eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_reel_stop_1',
				forcePlay: !stateBet.isTurbo,
			});
		},
		onSymbolLand,
	});

	reel.reelState.spinOptions = () =>
		reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

export type MultiplierSymbol = {
	initX: number;
	initY: number;
	symbolX: Tween<number>;
	symbolY: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
};

export const stateGame = $state({
	board,
	gameType: 'basegame' as GameType,
	multiplierBoard: [] as (MultiplierSymbol | undefined)[][],
	scatterCounter: 0,
	selectedBonusSymbol: null as SymbolName | null,
	bonusMode: null as 'freegame' | 'superspin' | null,
	reelMultipliers: [1, 1, 1, 1, 1] as [number, number, number, number, number],
	expandedSymbol: null as null | { symbol: SymbolName; reels: number[]; positions: Position[] },
	tempMultiplier: null as number | null,
});

const getBoardOffset = () => {
	const layoutType = stateLayoutDerived.layoutType();

	if (layoutType === 'portrait') return { x: 0, y: -10 };
	if (layoutType === 'landscape') return { x: -6, y: -86 };
	if (layoutType === 'tablet') return { x: -10, y: -84 };
	return { x: -42, y: -122 };
};

const boardLayout = () => ({
	x: stateLayoutDerived.mainLayout().width * 0.5 + getBoardOffset().x,
	y: stateLayoutDerived.mainLayout().height * 0.5 + getBoardOffset().y,
	anchor: { x: 0.5, y: 0.5 },
	pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
	...BOARD_SIZES,
});

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

const resetBonusState = () => {
	stateGame.selectedBonusSymbol = null;
	stateGame.bonusMode = null;
	stateGame.reelMultipliers = [1, 1, 1, 1, 1];
	stateGame.expandedSymbol = null;
	stateGame.tempMultiplier = null;
};

const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({ board: stateGame.board });

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	onSymbolLand,
	boardLayout,
	boardRaw,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
	resetBonusState,
};
