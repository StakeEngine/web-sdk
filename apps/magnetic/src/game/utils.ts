import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';

import { bookEventHandlerMap } from './bookEventHandlerMap';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import type { RawSymbol, SymbolName, SymbolState } from './types';
import { SYMBOL_INFO_MAP, SYMBOL_W } from './constants';

export const spriteKeyByName: Record<SymbolName, string> = {
	FOX: 'foxTile',
	WOLF: 'wolfTile',
	BEAR: 'bearTile',
	RABBIT: 'rabbitTile',
	SQUIRREL: 'squirrelTile',
	A: 'aTile',
	K: 'kTile',
	Q: 'qTile',
	J: 'jTile',
	T: 'tTile',
	MAGNET: 'wildTile',
	SCATTER: 'scatterCustom',
};

export const bonusSpriteKeyByName: Record<SymbolName, string> = {
	...spriteKeyByName,
	MAGNET: 'wildWinTile',
};

export const winSpriteKeyByName: Record<SymbolName, string> = {
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
	MAGNET: 'wildWinTile',
	SCATTER: 'scatterWin',
};

export const winBoardByAlias: Record<string, string> = {
	zero: 'sweetWinBoard',
	standard: 'sweetWinBoard',
	small: 'sweetWinBoard',
	nice: 'sweetWinBoard',
	substantial: 'wildWinBoard',
	big: 'wildWinBoard',
	superwin: 'epicWinBoard',
	mega: 'mythicWinBoard',
	epic: 'legendaryWinBoard',
	max: 'legendaryWinBoard',
};

export const getReelCenterX = (reelIndex: number): number => SYMBOL_W * (reelIndex + 0.5);
export const getSymbolX = (reelIndex: number): number => SYMBOL_W * (reelIndex + 0.5);

export const getSymbolInfo = ({ rawSymbol, state }: { rawSymbol: RawSymbol; state: SymbolState }) =>
	SYMBOL_INFO_MAP[rawSymbol.name][state];

export const { playBookEvent, playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });

export const playBet = async (bet: Bet) => {
	stateBet.winBookEventAmount = 0;
	await playBookEvents(bet.state);
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'reveal',
	'magnetActivated',
	'clusterSeriesUpdate',
	'superSeriesCarry',
	'freeSpinTrigger',
	'updateFreeSpin',
	'setTotalWin',
] as const;

export const convertTorResumableBet = (betToResume: Bet) => {
	const resumingIndex = Number(betToResume.event);
	const bookEventsBeforeResume = betToResume.state.filter((_, eventIndex) => eventIndex < resumingIndex);
	const bookEventsAfterResume = betToResume.state.filter((_, eventIndex) => eventIndex >= resumingIndex);

	const bookEventToCreateSnapshot: BookEventOfType<'createBonusSnapshot'> = {
		index: 0,
		type: 'createBonusSnapshot',
		bookEvents: bookEventsBeforeResume.filter((bookEvent) =>
			BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(bookEvent.type as (typeof BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT)[number]),
		),
	};

	return {
		...betToResume,
		state: [bookEventToCreateSnapshot, ...bookEventsAfterResume],
	};
};
