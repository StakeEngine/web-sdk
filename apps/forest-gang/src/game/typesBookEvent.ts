import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position } from './types';

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
		symbol: SymbolName;
		kind: number;
		win: number;
		positions: Position[];
		meta: {
			lineIndex: number;
			multiplier: number;
			winWithoutMult: number;
			globalMult: number;
			lineMultiplier: number;
		};
	}[];
};

type BookEventBonusSymbolSelected = {
	index: number;
	type: 'bonusSymbolSelected';
	symbol: SymbolName;
	mode: 'freegame' | 'superspin' | 'feature';
};

type BookEventExpandedSymbolReveal = {
	index: number;
	type: 'expandedSymbolReveal';
	symbol: SymbolName;
	reels: number[];
	positions: Position[];
};

type BookEventApplyTempMultiplier = {
	index: number;
	type: 'applyTempMultiplier';
	multiplier: number;
	winBefore: number;
	winAfter: number;
};

type BookEventUpdateGlobalMultiplier = {
	index: number;
	type: 'updateGlobalMultiplier';
	multiplier: number;
};

type BookEventRetriggerFreeSpins = {
	index: number;
	type: 'retriggerFreeSpins';
	amount: number;
	scatterCount: number;
	positions: Position[];
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
	| BookEventBonusSymbolSelected
	| BookEventExpandedSymbolReveal
	| BookEventApplyTempMultiplier
	| BookEventUpdateGlobalMultiplier
	| BookEventRetriggerFreeSpins
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
