import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';

import { bookEventHandlerMap } from './bookEventHandlerMap';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import type { SymbolName, SymbolState, RawSymbol } from './types';
import { SYMBOL_INFO_MAP, SYMBOL_W } from './constants';

// CHANGE ME: maps from SymbolName → asset key for each state
// These are used by Board.svelte when NOT in bonus mode (base game)
export const spriteKeyByName: Record<SymbolName, string> = {
	H1: 'sym_h1', H2: 'sym_h2', H3: 'sym_h3', H4: 'sym_h4', H5: 'sym_h5',
	L1: 'sym_l1', L2: 'sym_l2', L3: 'sym_l3', L4: 'sym_l4', L5: 'sym_l5',
	WILD: 'sym_wild', SCATTER: 'sym_scatter',
};

// CHANGE ME: bonus mode sprite keys (can be different art — glowing, highlighted, etc.)
export const bonusSpriteKeyByName: Record<SymbolName, string> = { ...spriteKeyByName };

// CHANGE ME: win state sprite keys
export const winSpriteKeyByName: Record<SymbolName, string> = {
	H1: 'sym_h1_win', H2: 'sym_h2_win', H3: 'sym_h3_win', H4: 'sym_h4_win', H5: 'sym_h5_win',
	L1: 'sym_l1_win', L2: 'sym_l2_win', L3: 'sym_l3_win', L4: 'sym_l4_win', L5: 'sym_l5_win',
	WILD: 'sym_wild_win', SCATTER: 'sym_scatter',
};

// CHANGE ME: expanded (full-reel) sprite keys used during bonus expand animation
export const expandedSpriteKeyByName: Partial<Record<SymbolName, string>> = {
	H1: 'sym_h1_expand', H2: 'sym_h2_expand', H3: 'sym_h3_expand', H4: 'sym_h4_expand', H5: 'sym_h5_expand',
	L1: 'sym_l1_expand', L2: 'sym_l2_expand', L3: 'sym_l3_expand', L4: 'sym_l4_expand', L5: 'sym_l5_expand',
};

// CHANGE ME: win board asset keys by win level alias
export const winBoardByAlias: Record<string, string> = {
	zero: 'sweetWinBoard', standard: 'sweetWinBoard', small: 'sweetWinBoard', nice: 'sweetWinBoard',
	substantial: 'bigWinBoard', big: 'bigWinBoard', superwin: 'superWinBoard',
	mega: 'megaWinBoard', epic: 'epicWinBoard', max: 'epicWinBoard',
};

export const getReelCenterX = (reelIndex: number): number => SYMBOL_W * (reelIndex + 0.5);

export const getSymbolInfo = ({ rawSymbol, state }: { rawSymbol: RawSymbol; state: SymbolState }) =>
	SYMBOL_INFO_MAP[rawSymbol.name][state];

export const getSymbolX = (reelIndex: number): number => SYMBOL_W * (reelIndex + 0.5);

export const { playBookEvent, playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });

export const playBet = async (bet: Bet) => {
	stateBet.winBookEventAmount = 0;
	await playBookEvents(bet.state);
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'reveal',
	'bonusSymbolSelected',
	'expandedSymbolReveal',
	'freeSpinTrigger',
	'updateFreeSpin',
	'winInfo',
	'setWin',
	'setTotalWin',
];

export const convertTorResumableBet = (betToResume: Bet) => {
	const resumingIndex = Number(betToResume.event);
	const bookEventsBeforeResume = betToResume.state.filter((_, eventIndex) => eventIndex < resumingIndex);
	const bookEventsAfterResume = betToResume.state.filter((_, eventIndex) => eventIndex >= resumingIndex);

	const bookEventToCreateSnapshot: BookEventOfType<'createBonusSnapshot'> = {
		index: 0,
		type: 'createBonusSnapshot',
		bookEvents: bookEventsBeforeResume.filter((bookEvent) =>
			BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(bookEvent.type),
		),
	};

	return {
		...betToResume,
		state: [bookEventToCreateSnapshot, ...bookEventsAfterResume],
	};
};
