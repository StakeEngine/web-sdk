import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import { SYMBOL_W, SYMBOL_H, SYMBOL_SIZE, REEL_PADDING, SYMBOL_INFO_MAP, BOARD_DIMENSIONS } from './constants';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';
import type { RawSymbol, SymbolState } from './types';

export const { getEmptyBoard } = createGetEmptyPaddedBoard({ reelsDimensions: BOARD_DIMENSIONS });
export const { playBookEvent, playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });
export const playBet = async (bet: Bet) => {
	stateBet.winBookEventAmount = 0;
	await playBookEvents(bet.state);
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

// Keep ALL event types so createBonusSnapshot can replay the full bonus from scratch
const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'reveal',
	'bonusSymbolSelected',
	'updateGlobalMultiplier',
	'expandedSymbolReveal',
	'freeSpinTrigger',
	'updateFreeSpin',
	'applyTempMultiplier',
	'winInfo',
	'setWin',
	'setTotalWin',
	'retriggerFreeSpins',
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

	const stateToResume = [bookEventToCreateSnapshot, ...bookEventsAfterResume];

	return { ...betToResume, state: stateToResume };
};

export const getSymbolX = (reelIndex: number) => SYMBOL_W * (reelIndex + REEL_PADDING);
export const getSymbolY = (symbolIndexOfBoard: number) => (symbolIndexOfBoard + 0.5) * SYMBOL_H;
export const getReelCenterX = (reelIndex: number) => SYMBOL_W * (reelIndex + 0.5);

export const spriteKeyByName: Record<string, string> = {
	// Premiums use bonus art (no card-letter badge) to distinguish from card symbols in base mode
	FOX: 'foxBonusTile',
	WOLF: 'wolfBonusTile',
	BEAR: 'bearBonusTile',
	RABBIT: 'rabbitBonusTile',
	SQUIRREL: 'squirrelBonusTile',
	A: 'aTile',
	K: 'kTile',
	Q: 'qTile',
	J: 'jTile',
	T: 'tTile',
	WILD: 'wildTile',
	SCATTER: 'scatterCustom',
};

// Board sprites in bonus mode — premiums use bonus art, cards keep normal card art
export const bonusSpriteKeyByName: Record<string, string> = {
	...spriteKeyByName,
	FOX: 'foxBonusTile',
	WOLF: 'wolfBonusTile',
	BEAR: 'bearBonusTile',
	RABBIT: 'rabbitBonusTile',
	SQUIRREL: 'squirrelBonusTile',
};

// Expanded symbol overlay — premium no-badge art + card expanded art
export const expandedSpriteKeyByName: Record<string, string> = {
	FOX: 'foxExpTile',
	WOLF: 'wolfExpTile',
	BEAR: 'bearExpTile',
	RABBIT: 'rabbitExpTile',
	SQUIRREL: 'squirrelExpTile',
	A: 'aExpTile',
	K: 'kExpTile',
	Q: 'qExpTile',
	J: 'jExpTile',
	T: 'tExpTile',
	WILD: 'wildTile',
	SCATTER: 'scatterCustom',
};

// Win-state board sprites on reel (lit up when symbol wins)
export const winSpriteKeyByName: Record<string, string> = {
	FOX: 'foxWinTile',
	WOLF: 'wolfWinTile',
	BEAR: 'bearWinTile',
	RABBIT: 'rabbitWinTile',
	SQUIRREL: 'squirrelWinTile',
	A: 'aWinTile',
	K: 'kWinTile',
	Q: 'qWinTile',
	J: 'jWinTile',
	T: 'tWinTile',
	WILD: 'wildWinTile',
	SCATTER: 'scatterWin',
};

// Win-state expanded sprites — shown when the expanding symbol pays
export const expandedWinSpriteKeyByName: Record<string, string> = {
	FOX: 'foxExpWinTile',
	WOLF: 'wolfExpWinTile',
	BEAR: 'bearExpWinTile',
	RABBIT: 'rabbitExpWinTile',
	SQUIRREL: 'squirrelExpWinTile',
	A: 'aWinExpTile',
	K: 'kWinExpTile',
	Q: 'qWinExpTile',
	J: 'jWinExpTile',
	T: 'tWinExpTile',
};

// Win board asset key by win level alias
export const winBoardByAlias: Record<string, string> = {
	big: 'sweetWinBoard',
	superwin: 'wildWinBoard',
	mega: 'epicWinBoard',
	epic: 'mythicWinBoard',
	max: 'legendaryWinBoard',
};

export const getSymbolInfo = ({ rawSymbol, state }: { rawSymbol: RawSymbol; state: SymbolState }) => {
	return SYMBOL_INFO_MAP[rawSymbol.name][state];
};
