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
		const hasAnticipation = bookEvent.anticipation?.some(Boolean);
		if (isBonusGame || hasAnticipation) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
		}
		if (isBonusGame) {
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		stateGame.tempMultiplier = null;
		if (bookEvent.gameType === 'basegame') {
			stateGameDerived.resetBonusState();
		}

		// Clear expanded overlay BEFORE spin starts so it doesn't persist into the next round
		if (stateGame.expandedSymbol && bookEvent.gameType !== 'basegame') {
			stateGame.expandedSymbol = { ...stateGame.expandedSymbol, reels: [] };
		}
		stateGame.expandedSymbolWon = false;
		stateGame.paylineWins = [];

		// Add a brief pause between bonus spins so players can read the result
		if (isBonusGame && bookEvent.gameType !== 'basegame' && !stateBet.isSuperTurbo) {
			await waitForTimeout(600);
		}

		const hadPendingStop = stateGame.pendingStop && stateGame.awaitingFirstReveal;
		// Close the buffer window — only works for the first reveal of the round
		stateGame.awaitingFirstReveal = false;
		stateGame.pendingStop = false;

		const spinPromise = stateGameDerived.enhancedBoard.spin({
			revealEvent: bookEvent,
			paddingBoard: config.paddingReels[bookEvent.gameType],
		});
		// Apply buffered stop immediately after spin starts
		if (hadPendingStop) stateGameDerived.enhancedBoard.stop();
		await spinPromise;
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });

		if (stateGame.bonusMode === 'superspin' && bookEvent.gameType !== 'basegame') {
			logForestDiagnostic('info', 'all_in_spin_complete', {
				gameType: bookEvent.gameType,
				totalWin: stateBet.winBookEventAmount,
				globalMultiplier: stateGame.globalMultiplier,
				freeSpinCurrent: stateUi.freeSpinCounterCurrent,
				freeSpinTotal: stateUi.freeSpinCounterTotal,
			});
			console.info('[magnetic-megachain] ALL IN global multiplier after spin', stateGame.globalMultiplier);
		}
	},
	bonusSymbolSelected: async (bookEvent: BookEventOfType<'bonusSymbolSelected'>) => {
		stateGame.selectedBonusSymbol = bookEvent.symbol;
		stateGame.bonusMode = bookEvent.mode;
		// Deer presenter reveals the chosen expanding symbol at the start of the round
		eventEmitter.broadcast({ type: 'expandedPresenterShow', symbol: bookEvent.symbol });
		await eventEmitter.broadcastAsync({ type: 'bonusSymbolRollAwait' });
		await waitForTimeout(1100);
		eventEmitter.broadcast({ type: 'expandedPresenterHide' });
	},
	expandedSymbolReveal: async (bookEvent: BookEventOfType<'expandedSymbolReveal'>) => {
		// Clear any win states from the previous spin before expanding starts
		for (const reel of stateGame.board) {
			for (const sym of reel.reelState.symbols) {
				if (sym.symbolState === 'win' || sym.symbolState === 'postWinStatic') {
					sym.symbolState = 'static';
				}
			}
		}
		stateGame.expandedSymbol = { symbol: bookEvent.symbol, reels: [], positions: bookEvent.positions };

		// Find origin reel: leftmost reel that had the symbol in the original positions
		const originReel = bookEvent.positions.length > 0
			? Math.min(...bookEvent.positions.map((p) => p.reel))
			: bookEvent.reels[0] ?? 0;

		// Sort winning reels by distance from origin so they expand outward
		const reelsByDistance = [...bookEvent.reels].sort((a, b) => {
			const dA = Math.abs(a - originReel);
			const dB = Math.abs(b - originReel);
			return dA !== dB ? dA - dB : a - b;
		});

		// Reveal one by one in distance order (origin first, then outward)
		for (let i = 0; i < reelsByDistance.length; i++) {
			await waitForTimeout(i * 90);
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_reel_stop_1' });
			const reel = reelsByDistance[i];
			stateGame.expandedSymbol = {
				...stateGame.expandedSymbol!,
				reels: [...stateGame.expandedSymbol!.reels, reel],
			};
		}
		// Brief pause after final reel expands before win state flips in
		await waitForTimeout(320);
	},
	applyTempMultiplier: async (bookEvent: BookEventOfType<'applyTempMultiplier'>) => {
		stateGame.tempMultiplier = bookEvent.multiplier;
		// Update the landing target — cycling already running, will land here instead of 1x
		eventEmitter.broadcast({ type: 'dealItMultiplierSetTarget', multiplier: bookEvent.multiplier });
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
		console.info('[magnetic-megachain] ALL IN global multiplier update', bookEvent.multiplier);
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		// Start Deal It multiplier cycling for every winning bonus spin — always spins, lands on 1x unless multiplier fires
		if ((stateGame.bonusMode === 'freegame' || stateGame.bonusMode === 'feature')) {
			eventEmitter.broadcast({ type: 'dealItMultiplierStart' });
		}
		// Only filter to expanded symbol wins when the overlay is actually showing (reels.length > 0)
		// A cleared expandedSymbol {reels:[]} means a non-expanding spin — show all payline wins normally
		const isExpandedOverlayShowing = (stateGame.expandedSymbol?.reels.length ?? 0) > 0;
		const wins = isExpandedOverlayShowing
			? bookEvent.wins.filter((w) => w.symbol === stateGame.expandedSymbol!.symbol)
			: bookEvent.wins;
		// Store full 5-reel payline paths for vine animation using lineIndex lookup
		const paylines = config.paylines as Record<string, number[]>;
		if (isExpandedOverlayShowing && wins.length > 0) {
			// Expanding symbol wins all 20 paylines — show all
			stateGame.paylineWins = Object.entries(paylines).map(([key, rows]) => ({
				lineIndex: Number(key),
				path: rows.map((row, reel) => ({ reel, row })),
			}));
		} else {
			stateGame.paylineWins = wins
				.map((w) => {
					const rows = paylines[String(w.meta.lineIndex)];
					if (!rows) return null;
					return { lineIndex: w.meta.lineIndex, path: rows.map((row, reel) => ({ reel, row })) };
				})
				.filter((p): p is { lineIndex: number; path: Array<{ reel: number; row: number }> } => p !== null);
		}
		// Deduplicate positions across all wins and animate once — prevents 5-10s freeze
		const seen = new Set<string>();
		const allPositions = wins.flatMap((win) => win.positions).filter((pos) => {
			const key = `${pos.reel},${pos.row}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
		await animateSymbols({ positions: allPositions });
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		const isFeatureSpin = bookEvent.totalFs === 1;
		const bonusMode = isFeatureSpin ? 'feature' : getBonusModeFromScatters(bookEvent.positions);
		// Stop on Bonus: stop autoplay when a multi-spin bonus triggers (Deal It / All In)
		if (!isFeatureSpin && stateGame.stopAutoOnBonus && stateBet.autoSpinsCounter > 0) {
			stateBet.autoSpinsCounter = 0;
		}
		if (!isFeatureSpin) {
			// Full bonus intro sequence — only for Deal It / All In (multi-spin)
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
			await animateSymbols({ positions: bookEvent.positions });
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
			await eventEmitter.broadcastAsync({ type: 'uiHide' });
			await eventEmitter.broadcastAsync({ type: 'transition' });
			eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
			eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
			eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
			await eventEmitter.broadcastAsync({ type: 'freeSpinIntroUpdate', totalFreeSpins: bookEvent.totalFs });
		}
		stateGame.gameType = bonusMode;
		stateGame.bonusMode = bonusMode;
		if (!isFeatureSpin) {
			eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		}
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		if (!isFeatureSpin) {
			eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
			stateUi.freeSpinCounterShow = true;
			eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', current: undefined, total: bookEvent.totalFs });
			stateUi.freeSpinCounterTotal = bookEvent.totalFs;
		}
		if (bonusMode === 'superspin') {
			eventEmitter.broadcast({ type: 'dealItMultiplierHide' });
			eventEmitter.broadcast({ type: 'globalMultiplierShow' });
		}
		if (!isFeatureSpin) {
			await eventEmitter.broadcastAsync({ type: 'uiShow' });
			await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
			eventEmitter.broadcast({ type: 'drawerFold' });
		}
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		if (stateGame.bonusMode === 'feature') {
			stateUi.freeSpinCounterShow = false;
			eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
			return;
		}
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', current: bookEvent.amount + 1, total: bookEvent.total });
		stateUi.freeSpinCounterCurrent = bookEvent.amount + 1;
		stateUi.freeSpinCounterTotal = bookEvent.total;
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];
		const isFeatureSpin = stateGame.bonusMode === 'feature';
		// Clear expanding symbol overlay before total board shows
		stateGame.expandedSymbol = null;
		stateGame.paylineWins = [];
		stateGame.gameType = isFeatureSpin ? 'feature' : 'basegame';
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'globalMultiplierHide' });
		eventEmitter.broadcast({ type: 'dealItMultiplierHide' });
		if (isFeatureSpin) {
			// Feature spin: no outro panel, just let the win animate naturally
			stateUi.freeSpinCounterShow = false;
			await eventEmitter.broadcastAsync({ type: 'uiShow' });
		} else {
			await eventEmitter.broadcastAsync({ type: 'uiHide' });
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
		}
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		// Trigger win-state animation on the expanded symbol overlay if active
		if (stateGame.expandedSymbol) {
			stateGame.expandedSymbolWon = true;
		}
		// Wait for Deal It multiplier cycling to finish before showing win amount
		if ((stateGame.bonusMode === 'freegame' || stateGame.bonusMode === 'feature')) {
			await eventEmitter.broadcastAsync({ type: 'dealItMultiplierAwaitCycle' });
		}
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];
		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({ type: 'winUpdate', amount: bookEvent.amount, winLevelData });
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
		// Hide Deal It multiplier panel after win animation
		if ((stateGame.bonusMode === 'freegame' || stateGame.bonusMode === 'feature')) {
			eventEmitter.broadcast({ type: 'dealItMultiplierHide' });
		}
	},
	finalWin: async () => {
		if (stateGame.gameType === 'basegame' && stateGame.bonusMode !== 'feature') stateGameDerived.resetBonusState();
	},
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		const triggerIndex = bookEvents.findIndex((e) => e.type === 'freeSpinTrigger');
		if (triggerIndex === -1) return;

		// Find the reveal (scatter spin) just before the freeSpinTrigger so scatters are shown
		const revealBeforeTrigger = [...bookEvents]
			.slice(0, triggerIndex)
			.reverse()
			.find((e) => e.type === 'reveal');
		const startIndex = revealBeforeTrigger
			? bookEvents.indexOf(revealBeforeTrigger)
			: triggerIndex;

		for (const event of bookEvents.slice(startIndex)) {
			await playBookEvent(event, { bookEvents });
		}
	},
};
