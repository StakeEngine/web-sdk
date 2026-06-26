import type { BetType } from 'rgs-requests';

import type { SymbolName, PaySymbolName, RawSymbol, GameType, Position, ClusterSeriesSnapshot, SeriesKind } from './types';

type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number;
	winLevel: number;
};

type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: {
		seriesId: string;
		symbol: PaySymbolName;
		size: number;
		positions: Position[];
		amount: number;
		meta: {
			baseAmount: number;
			totalMultiplier: number;
			seriesKind: SeriesKind;
			anchors: Position[];
		};
	}[];
};

type BookEventMagnetActivated = {
	index: number;
	type: 'magnetActivated';
	seriesId: string;
	symbol: PaySymbolName;
	positions: Position[];
	multiplier: number;
	totalMultiplier: number;
	persistent: boolean;
};

type BookEventClusterSeriesUpdate = {
	index: number;
	type: 'clusterSeriesUpdate';
	series: ClusterSeriesSnapshot[];
	magnetTargetSymbol: PaySymbolName | null;
	totalMultiplier: number;
};

type BookEventClusterSeriesResolved = {
	index: number;
	type: 'clusterSeriesResolved';
	seriesId: string;
	symbol: PaySymbolName;
	positions: Position[];
	amount: number;
	multiplier: number;
};

type BookEventSuperSeriesCarry = {
	index: number;
	type: 'superSeriesCarry';
	series: ClusterSeriesSnapshot | null;
	magnetTargetSymbol: PaySymbolName | null;
	totalMultiplier: number;
};

type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

export type BookEvent =
	| BookEventReveal
	| BookEventWinInfo
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventUpdateFreeSpin
	| BookEventFinalWin
	| BookEventSetWin
	| BookEventFreeSpinEnd
	| BookEventMagnetActivated
	| BookEventClusterSeriesUpdate
	| BookEventClusterSeriesResolved
	| BookEventSuperSeriesCarry
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
