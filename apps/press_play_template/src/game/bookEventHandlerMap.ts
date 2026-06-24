import { stateBet } from 'state-shared';
import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { waitForTimeout } from 'utils-shared/wait';
import { SECOND } from 'constants-shared/time';

import type { BookEvent, BookEventContext, BookEventOfType } from './typesBookEvent';
import type { SymbolName } from './types';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import config from './config';

const getBonusModeFromScatters = (positions: { reel: number; row: number }[]) =>
	positions.length >= config.minScattersForBonus ? 'freegame' : null;

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		const hasAnticipation = bookEvent.anticipation?.some(Boolean);
		if (isBonusGame || hasAnticipation) eventEmitter.broadcast({ type: 'stopButtonEnable' });
		if (isBonusGame) recordBookEvent({ bookEvent });

		stateGame.gameType = bookEvent.gameType;
		if (bookEvent.gameType === 'basegame') stateGameDerived.resetBonusState();

		// Reset expanded symbol reels for new spin
		if (stateGame.expandedSymbol) {
			stateGame.expandedSymbol = { ...stateGame.expandedSymbol, reels: [] };
		}
		stateGame.paylineWins = [];

		const hadPendingStop = stateGame.pendingStop && stateGame.awaitingFirstReveal;
		stateGame.awaitingFirstReveal = false;
		stateGame.pendingStop = false;

		const spinPromise = stateGameDerived.enhancedBoard.spin({
			revealEvent: bookEvent,
			paddingBoard: config.paddingReels[bookEvent.gameType],
		});
		if (hadPendingStop) stateGameDerived.enhancedBoard.stop();
		await spinPromise;
	},

	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		if (bookEvent.wins.length === 0) return;

		const animatePositions = bookEvent.wins.flatMap((w) => w.positions);
		await eventEmitter.broadcastAsync({ type: 'boardWithAnimateSymbols', symbolPositions: animatePositions });

		// Show payline vines
		stateGame.paylineWins = bookEvent.wins
			.filter((w) => w.meta.lineIndex >= 0)
			.map((w) => ({
				lineIndex: w.meta.lineIndex,
				path: w.positions.map((p) => ({ reel: p.reel, row: p.row })),
			}));
	},

	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		if (!bookEvent.amount) return;
		const winLevelData = stateGameDerived.getWinLevelDataByWinLevelAlias(bookEvent.winLevel);
		await eventEmitter.broadcastAsync({
			type: 'winShow',
			amount: bookEvent.amount,
			winLevelAlias: winLevelData?.alias ?? 'standard',
		});
	},

	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},

	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
		await eventEmitter.broadcastAsync({ type: 'winHide' });
		stateGame.paylineWins = [];
	},

	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		const mode = getBonusModeFromScatters(bookEvent.positions);
		if (!mode) return;

		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win' });
		await waitForTimeout(SECOND * 0.5);

		// Show intro screen
		await eventEmitter.broadcastAsync({ type: 'freeSpinIntroShow', totalFs: bookEvent.totalFs, mode });
		eventEmitter.broadcast({ type: 'transition' });
		await waitForTimeout(300);

		stateGame.bonusMode = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', total: bookEvent.totalFs });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	},

	bonusSymbolSelected: async (bookEvent: BookEventOfType<'bonusSymbolSelected'>) => {
		stateGame.selectedBonusSymbol = bookEvent.symbol as SymbolName;
	},

	expandedSymbolReveal: async (bookEvent: BookEventOfType<'expandedSymbolReveal'>) => {
		stateGame.expandedSymbol = {
			symbol: bookEvent.symbol as SymbolName,
			reels: bookEvent.reels,
			positions: bookEvent.positions,
		};
		stateGame.expandedSymbolWon = bookEvent.positions.length > 0;
	},

	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', current: bookEvent.amount, total: bookEvent.total });
	},

	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		await waitForTimeout(SECOND * 0.5);

		const winLevelData = stateGameDerived.getWinLevelDataByWinLevelAlias(bookEvent.winLevel);
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroShow',
			amount: bookEvent.amount,
			winLevelAlias: winLevelData?.alias ?? 'standard',
		});

		eventEmitter.broadcast({ type: 'transition' });
		await waitForTimeout(300);

		stateGameDerived.resetBonusState();
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
	},

	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const triggerIndex = bookEvent.bookEvents.findIndex((event) => event.type === 'freeSpinTrigger');
		if (triggerIndex === -1) return;

		const revealBeforeTrigger = [...bookEvent.bookEvents]
			.slice(0, triggerIndex)
			.reverse()
			.find((event) => event.type === 'reveal');
		const startIndex = revealBeforeTrigger
			? bookEvent.bookEvents.indexOf(revealBeforeTrigger)
			: triggerIndex;

		for (const event of bookEvent.bookEvents.slice(startIndex)) {
			await playBookEvent(event, { bookEvents: bookEvent.bookEvents });
		}
	},
};
