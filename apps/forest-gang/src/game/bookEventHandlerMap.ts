import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateUi } from 'state-shared';
import { sequence } from 'utils-shared/sequence';
import { waitForTimeout } from 'utils-shared/wait';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';
import config from './config';
import { logForestDiagnostic } from '../utils/forestDiagnostics';

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	if (winLevelData?.sound?.sfx) eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	if (winLevelData?.sound?.bgm) eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	if (winLevelData?.type === 'big') eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (stateBet.activeBetModeKey === 'SUPER' || stateGame.gameType !== 'basegame') {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({ type: 'boardWithAnimateSymbols', symbolPositions: positions });
};

const getBonusModeFromScatters = (positions: Position[]) => (positions.length >= 4 ? 'superspin' : 'freegame');

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		stateGame.tempMultiplier = null;
		if (bookEvent.gameType === 'basegame') {
			stateGameDerived.resetBonusState();
		}

		// In bonus, look ahead for expansion anticipation: if 3+ reels will expand this spin,
		// inject anticipation for reels after the 3rd expanding reel
		let spinRevealEvent = bookEvent;
		if (bookEvent.gameType !== 'basegame') {
			const nextExpand = bookEvents.find(
				(e) => e.type === 'expandedSymbolReveal' && e.index > bookEvent.index,
			) as BookEventOfType<'expandedSymbolReveal'> | undefined;
			if (nextExpand && nextExpand.reels.length >= 3) {
				const sorted = [...nextExpand.reels].sort((a, b) => a - b);
				const thirdReel = sorted[2];
				const anticipation = [0, 0, 0, 0, 0];
				let counter = 1;
				for (let r = thirdReel + 1; r < 5; r++) anticipation[r] = counter++;
				spinRevealEvent = { ...bookEvent, anticipation };
			}
		}

		await stateGameDerived.enhancedBoard.spin({
			revealEvent: spinRevealEvent,
			paddingBoard: config.paddingReels[bookEvent.gameType],
		});
		// Clear expanded reels after board settles (no carry-over between spins)
		if (stateGame.expandedSymbol && bookEvent.gameType !== 'basegame') {
			stateGame.expandedSymbol = { ...stateGame.expandedSymbol, reels: [] };
		}
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });

		if (stateGame.bonusMode === 'superspin' && bookEvent.gameType !== 'basegame') {
			logForestDiagnostic('info', 'all_in_spin_complete', {
				gameType: bookEvent.gameType,
				totalWin: stateBet.winBookEventAmount,
				globalMultiplier: stateGame.globalMultiplier,
				freeSpinCurrent: stateUi.freeSpinCounterCurrent,
				freeSpinTotal: stateUi.freeSpinCounterTotal,
			});
			console.info('[forest-gang] ALL IN global multiplier after spin', stateGame.globalMultiplier);
		}
	},
	bonusSymbolSelected: async (bookEvent: BookEventOfType<'bonusSymbolSelected'>) => {
		stateGame.selectedBonusSymbol = bookEvent.symbol;
		stateGame.bonusMode = bookEvent.mode;
	},
	expandedSymbolReveal: async (bookEvent: BookEventOfType<'expandedSymbolReveal'>) => {
		const sortedReels = [...bookEvent.reels].sort((a, b) => a - b);
		stateGame.expandedSymbol = { symbol: bookEvent.symbol, reels: [], positions: bookEvent.positions };
		await Promise.all(
			sortedReels.map(async (reel, i) => {
				await waitForTimeout(i * 80);
				eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_reel_stop_1' });
				stateGame.expandedSymbol = {
					...stateGame.expandedSymbol!,
					reels: [...stateGame.expandedSymbol!.reels, reel],
				};
			}),
		);
	},
	applyTempMultiplier: async (bookEvent: BookEventOfType<'applyTempMultiplier'>) => {
		stateGame.tempMultiplier = bookEvent.multiplier;
	},
	retriggerFreeSpins: async (bookEvent: BookEventOfType<'retriggerFreeSpins'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		const newTotal = stateUi.freeSpinCounterTotal + bookEvent.amount;
		stateUi.freeSpinCounterTotal = newTotal;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: stateUi.freeSpinCounterCurrent,
			total: newTotal,
		});
	},
	updateGlobalMultiplier: async (bookEvent: BookEventOfType<'updateGlobalMultiplier'>) => {
		stateGame.globalMultiplier = bookEvent.multiplier;
		eventEmitter.broadcast({ type: 'globalMultiplierUpdate', multiplier: bookEvent.multiplier });
		console.info('[forest-gang] ALL IN global multiplier update', bookEvent.multiplier);
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		await sequence(bookEvent.wins, async (win) => {
			await animateSymbols({ positions: win.positions });
		});
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		const bonusMode = getBonusModeFromScatters(bookEvent.positions);
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({ type: 'freeSpinIntroUpdate', totalFreeSpins: bookEvent.totalFs });
		stateGame.gameType = bonusMode;
		stateGame.bonusMode = bonusMode;
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', current: undefined, total: bookEvent.totalFs });
		stateUi.freeSpinCounterTotal = bookEvent.totalFs;
		if (bonusMode === 'superspin') {
			eventEmitter.broadcast({ type: 'globalMultiplierShow' });
		}
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', current: bookEvent.amount + 1, total: bookEvent.total });
		stateUi.freeSpinCounterCurrent = bookEvent.amount + 1;
		stateUi.freeSpinCounterTotal = bookEvent.total;
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'globalMultiplierHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({ type: 'freeSpinOutroCountUp', amount: bookEvent.amount, winLevelData });
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		stateUi.freeSpinCounterShow = false;
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];
		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({ type: 'winUpdate', amount: bookEvent.amount, winLevelData });
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},
	finalWin: async () => {
		if (stateGame.gameType === 'basegame') stateGameDerived.resetBonusState();
	},
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		function findLastBookEvent<T>(type: T) {
			return _.findLast(bookEvents, (entry) => entry.type === type) as BookEventOfType<T> | undefined;
		}

		const lastFreeSpinTriggerEvent = findLastBookEvent('freeSpinTrigger' as const);
		const lastBonusSymbolSelected = findLastBookEvent('bonusSymbolSelected' as const);
		const lastExpandedSymbolReveal = findLastBookEvent('expandedSymbolReveal' as const);
		const lastUpdateGlobalMultiplier = findLastBookEvent('updateGlobalMultiplier' as const);
		const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		if (lastBonusSymbolSelected) playBookEvent(lastBonusSymbolSelected, { bookEvents });
		if (lastExpandedSymbolReveal) playBookEvent(lastExpandedSymbolReveal, { bookEvents });
		if (lastUpdateGlobalMultiplier) playBookEvent(lastUpdateGlobalMultiplier, { bookEvents });
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
	},
};
