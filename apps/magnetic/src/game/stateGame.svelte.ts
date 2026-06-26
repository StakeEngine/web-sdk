import { stateBet } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type {
	BoardCell,
	ClusterSeriesSnapshot,
	GameType,
	PaySymbolName,
	Position,
	RawSymbol,
	SymbolState,
} from './types';
import { stateLayoutDerived } from './stateLayout';
import { winLevelMap } from './winLevelMap';
import {
	BOARD_DIMENSIONS,
	BOARD_SIZES,
	INITIAL_BOARD,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
	SYMBOL_H,
	SYMBOL_W,
} from './constants';
import { eventEmitter } from './eventEmitter';

let boardSeed = 0;

const nextKey = (reel: number, row: number) => `${boardSeed}:${reel}:${row}`;

const positionsKey = ({ reel, row }: Position) => `${reel}:${row}`;

const createBoardCells = (rawBoard: RawSymbol[][]): BoardCell[][] => {
	boardSeed += 1;
	return rawBoard.map((reel, reelIndex) =>
		reel.map((rawSymbol, rowIndex) => ({
			...rawSymbol,
			key: nextKey(reelIndex, rowIndex),
			position: { reel: reelIndex, row: rowIndex },
			symbolState: INITIAL_SYMBOL_STATE,
			locked: false,
			highlighted: false,
			anchor: false,
			target: false,
			persistent: false,
			fresh: false,
		})),
	);
};

const cloneBoardRaw = (board: RawSymbol[][]) => board.map((reel) => reel.map((cell) => ({ ...cell })));

const applySeriesDecorations = ({
	board,
	series,
	magnetTargetSymbol,
}: {
	board: BoardCell[][];
	series: ClusterSeriesSnapshot[];
	magnetTargetSymbol: PaySymbolName | null;
}) => {
	const locked = new Set(series.flatMap((entry) => entry.lockedPositions.map(positionsKey)));
	const anchors = new Set(series.flatMap((entry) => entry.anchorPositions.map(positionsKey)));
	const persistent = new Set(
		series.filter((entry) => entry.persistent).flatMap((entry) => entry.lockedPositions.map(positionsKey)),
	);
	const fresh = new Set(series.flatMap((entry) => entry.lockedPositions.slice(entry.anchorPositions.length).map(positionsKey)));

	for (const reel of board) {
		for (const cell of reel) {
			const key = positionsKey(cell.position);
			cell.locked = locked.has(key);
			cell.anchor = anchors.has(key);
			cell.persistent = persistent.has(key);
			cell.fresh = fresh.has(key);
			cell.target = magnetTargetSymbol != null && cell.name === magnetTargetSymbol && cell.name !== 'MAGNET';
			cell.symbolState = cell.highlighted
				? 'win'
				: cell.locked
					? 'locked'
					: cell.name === 'MAGNET'
						? 'magnet'
						: 'static';
		}
	}
};

const getBoardViewportPadding = () => {
	const layoutType = stateLayoutDerived.layoutType();
	if (layoutType === 'portrait') return { top: 10, right: 10, bottom: 170, left: 10 };
	if (layoutType === 'landscape') return { top: 10, right: 20, bottom: 34, left: 12 };
	if (layoutType === 'tablet') return { top: 24, right: 28, bottom: 100, left: 28 };
	return { top: 110, right: 230, bottom: 170, left: 210 };
};

const getBoardViewportMetrics = () => {
	const mainLayout = stateLayoutDerived.mainLayout();
	const canvasSizes = stateLayoutDerived.canvasSizes();
	const padding = getBoardViewportPadding();
	const availableCanvasWidth = Math.max(BOARD_SIZES.width * mainLayout.scale, canvasSizes.width - padding.left - padding.right);
	const availableCanvasHeight = Math.max(BOARD_SIZES.height * mainLayout.scale, canvasSizes.height - padding.top - padding.bottom);
	return { mainLayout, canvasSizes, padding, availableCanvasWidth, availableCanvasHeight };
};

const getBoardScale = () => {
	const { mainLayout, availableCanvasHeight, availableCanvasWidth } = getBoardViewportMetrics();
	return Math.max(
		0.74,
		Math.min(
			availableCanvasHeight / (BOARD_SIZES.height * (mainLayout.scale || 1)),
			availableCanvasWidth / (BOARD_SIZES.width * (mainLayout.scale || 1)),
		),
	);
};

const getBoardOffset = () => {
	const { mainLayout, canvasSizes, padding, availableCanvasHeight, availableCanvasWidth } = getBoardViewportMetrics();
	const layoutType = stateLayoutDerived.layoutType();
	const extraLeftShiftPx = layoutType === 'desktop' ? 50 : layoutType === 'landscape' ? 30 : 0;
	const centeredCanvasX = padding.left + availableCanvasWidth * 0.5 - canvasSizes.width * 0.5;
	const centeredCanvasY = padding.top + availableCanvasHeight * 0.5 - canvasSizes.height * 0.5;
	return {
		x: (centeredCanvasX - extraLeftShiftPx + 80) / (mainLayout.scale || 1),
		y: (centeredCanvasY + 18) / (mainLayout.scale || 1),
	};
};

const boardLayout = () => {
	const boardScale = getBoardScale() * 0.92;
	const frameW = (BOARD_SIZES.width * boardScale * 1.04 * (1.3 / 1.15)) / 0.64;
	const frameH = frameW * (2528 / 3616);
	return {
		x: stateLayoutDerived.mainLayout().width * 0.5 + getBoardOffset().x,
		y: frameH * 0.45,
		boardScale,
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
		...BOARD_SIZES,
	};
};

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

const boardRaw = () => stateGame.board.map((reel) => reel.map(({ key, position, symbolState, locked, highlighted, anchor, target, persistent, fresh, ...raw }) => raw));

export const stateGame = $state({
	board: createBoardCells(cloneBoardRaw(INITIAL_BOARD)),
	gameType: 'basegame' as GameType,
	bonusMode: null as 'freegame' | 'superspin' | 'feature' | null,
	globalMultiplier: 1,
	seriesTotalMultiplier: 1,
	magnetTargetSymbol: null as PaySymbolName | null,
	activeSeries: [] as ClusterSeriesSnapshot[],
	persistentSeries: null as ClusterSeriesSnapshot | null,
	clusterWinBadges: [] as Array<{ id: string; reel: number; row: number; text: string }>,
	boardSpinning: false,
	scatterCounter: 0,
	pendingStop: false,
	awaitingFirstReveal: false,
	stopAutoOnBonus: false,
	selectedBonusSymbol: null as PaySymbolName | null,
	tempMultiplier: null as number | null,
});

const resetBoardVisuals = () => {
	for (const reel of stateGame.board) {
		for (const cell of reel) {
			cell.highlighted = false;
			cell.symbolState = cell.locked ? 'locked' : cell.name === 'MAGNET' ? 'magnet' : 'static';
		}
	}
	stateGame.clusterWinBadges = [];
};

const setBoardFromRaw = ({
	rawBoard,
	series = stateGame.activeSeries,
	magnetTargetSymbol = stateGame.magnetTargetSymbol,
}: {
	rawBoard: RawSymbol[][];
	series?: ClusterSeriesSnapshot[];
	magnetTargetSymbol?: PaySymbolName | null;
}) => {
	stateGame.board = createBoardCells(cloneBoardRaw(rawBoard));
	applySeriesDecorations({ board: stateGame.board, series, magnetTargetSymbol });
};

const setSeriesSnapshots = ({
	series,
	magnetTargetSymbol,
	totalMultiplier,
}: {
	series: ClusterSeriesSnapshot[];
	magnetTargetSymbol: PaySymbolName | null;
	totalMultiplier: number;
}) => {
	stateGame.activeSeries = series;
	stateGame.seriesTotalMultiplier = totalMultiplier;
	stateGame.globalMultiplier = totalMultiplier;
	stateGame.magnetTargetSymbol = magnetTargetSymbol;
	stateGame.selectedBonusSymbol = magnetTargetSymbol;
	stateGame.persistentSeries = series.find((entry) => entry.persistent) ?? null;
	applySeriesDecorations({ board: stateGame.board, series, magnetTargetSymbol });
};

const setClusterBadgesFromWinInfo = (wins: Array<{ id: string; reel: number; row: number; text: string }>) => {
	stateGame.clusterWinBadges = wins;
};

const animateWinningPositions = async (positions: Position[]) => {
	const keys = new Set(positions.map(positionsKey));
	for (const reel of stateGame.board) {
		for (const cell of reel) {
			if (!keys.has(positionsKey(cell.position))) continue;
			cell.highlighted = true;
			cell.symbolState = 'win';
		}
	}
	await waitForTimeout((stateBet.isTurbo || stateBet.isSuperTurbo) ? 120 : 480);
	for (const reel of stateGame.board) {
		for (const cell of reel) {
			if (!keys.has(positionsKey(cell.position))) continue;
			cell.highlighted = false;
			cell.symbolState = cell.locked ? 'locked' : cell.name === 'MAGNET' ? 'magnet' : 'static';
		}
	}
};

const applyReveal = ({ rawBoard, gameType }: { rawBoard: RawSymbol[][]; gameType: GameType }) => {
	stateGame.gameType = gameType;
	stateGame.boardSpinning = false;
	setBoardFromRaw({ rawBoard });
	for (const reel of rawBoard) {
		for (const cell of reel) {
			if (cell.name === 'SCATTER') {
				eventEmitter.broadcast({ type: 'soundScatterCounterIncrease' });
				eventEmitter.broadcast({ type: 'soundOnce', name: SCATTER_LAND_SOUND_MAP[scatterLandIndex()] });
			}
			if (cell.name === 'MAGNET') {
				eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
			}
		}
	}
};

const beginSpin = () => {
	stateGame.boardSpinning = true;
	resetBoardVisuals();
};

const resetBonusState = () => {
	stateGame.bonusMode = null;
	stateGame.globalMultiplier = 1;
	stateGame.seriesTotalMultiplier = 1;
	stateGame.magnetTargetSymbol = null;
	stateGame.activeSeries = [];
	stateGame.persistentSeries = null;
	stateGame.clusterWinBadges = [];
	stateGame.selectedBonusSymbol = null;
	stateGame.tempMultiplier = null;
	applySeriesDecorations({ board: stateGame.board, series: [], magnetTargetSymbol: null });
};

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	boardLayout,
	boardRaw,
	scatterLandIndex,
	resetBoardVisuals,
	setBoardFromRaw,
	setSeriesSnapshots,
	setClusterBadgesFromWinInfo,
	animateWinningPositions,
	applyReveal,
	beginSpin,
	resetBonusState,
	getWinLevelDataByWinLevelAlias,
};
