import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateUi } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventContext, BookEventOfType } from './typesBookEvent';
import type { Position } from './types';
import { logMagneticDiagnostic } from '../utils/magneticDiagnostics';

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
		if (isBonusGame || hasAnticipation) eventEmitter.broadcast({ type: 'stopButtonEnable' });
		if (isBonusGame) recordBookEvent({ bookEvent });

		if (bookEvent.gameType === 'basegame') {
			stateGameDerived.resetBonusState();
		} else if (!stateBet.isSuperTurbo) {
			await waitForTimeout(220);
		}

		stateGame.awaitingFirstReveal = false;
		stateGame.pendingStop = false;
		stateGame.tempMultiplier = null;
		stateGameDerived.applyReveal({ rawBoard: bookEvent.board, gameType: bookEvent.gameType });
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	magnetActivated: async (bookEvent: BookEventOfType<'magnetActivated'>) => {
		stateGame.selectedBonusSymbol = bookEvent.symbol;
		stateGame.magnetTargetSymbol = bookEvent.symbol;
		stateGame.globalMultiplier = bookEvent.totalMultiplier;
		stateGame.seriesTotalMultiplier = bookEvent.totalMultiplier;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
		if (bookEvent.persistent) {
			eventEmitter.broadcast({ type: 'globalMultiplierShow' });
			eventEmitter.broadcast({ type: 'globalMultiplierUpdate', multiplier: bookEvent.totalMultiplier });
		}
	},
	clusterSeriesUpdate: async (bookEvent: BookEventOfType<'clusterSeriesUpdate'>) => {
		stateGameDerived.setSeriesSnapshots({
			series: bookEvent.series,
			magnetTargetSymbol: bookEvent.magnetTargetSymbol,
			totalMultiplier: bookEvent.totalMultiplier,
		});
		if (stateGame.bonusMode === 'superspin') {
			eventEmitter.broadcast({ type: 'globalMultiplierShow' });
			eventEmitter.broadcast({ type: 'globalMultiplierUpdate', multiplier: bookEvent.totalMultiplier });
		}
	},
	clusterSeriesResolved: async () => {
		// marker event for replay readability; no extra UI step in proto build.
	},
	superSeriesCarry: async (bookEvent: BookEventOfType<'superSeriesCarry'>) => {
		stateGame.persistentSeries = bookEvent.series;
		stateGame.magnetTargetSymbol = bookEvent.magnetTargetSymbol;
		stateGame.globalMultiplier = bookEvent.totalMultiplier;
		stateGame.seriesTotalMultiplier = bookEvent.totalMultiplier;
		eventEmitter.broadcast({ type: 'globalMultiplierShow' });
		eventEmitter.broadcast({ type: 'globalMultiplierUpdate', multiplier: bookEvent.totalMultiplier });
		if (bookEvent.series) {
			stateGameDerived.setSeriesSnapshots({
				series: [bookEvent.series],
				magnetTargetSymbol: bookEvent.magnetTargetSymbol,
				totalMultiplier: bookEvent.totalMultiplier,
			});
		}
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		const allPositions = _.uniqBy(bookEvent.wins.flatMap((win) => win.positions), (position) => `${position.reel}:${position.row}`);
		stateGameDerived.setClusterBadgesFromWinInfo(
			bookEvent.wins.map((win) => ({
				id: win.seriesId,
				reel: win.positions[0]?.reel ?? 0,
				row: win.positions[0]?.row ?? 0,
				text: `${win.amount / 100}x`,
			})),
		);
		await animateSymbols({ positions: allPositions });
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		const isFeatureSpin = bookEvent.totalFs === 1;
		const bonusMode = isFeatureSpin ? 'feature' : getBonusModeFromScatters(bookEvent.positions);
		if (!isFeatureSpin && stateGame.stopAutoOnBonus && stateBet.autoSpinsCounter > 0) {
			stateBet.autoSpinsCounter = 0;
		}
		if (!isFeatureSpin) {
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
		if (!isFeatureSpin) eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		if (!isFeatureSpin) {
			eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
			stateUi.freeSpinCounterShow = true;
			eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', current: undefined, total: bookEvent.totalFs });
			stateUi.freeSpinCounterTotal = bookEvent.totalFs;
		}
		if (bonusMode === 'superspin') eventEmitter.broadcast({ type: 'globalMultiplierShow' });
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
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];
		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({ type: 'winUpdate', amount: bookEvent.amount, winLevelData });
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
		stateGame.clusterWinBadges = [];
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];
		const isFeatureSpin = stateGame.bonusMode === 'feature';
		stateGame.gameType = isFeatureSpin ? 'feature' : 'basegame';
		eventEmitter.broadcast({ type: 'globalMultiplierHide' });
		if (isFeatureSpin) {
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
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		logMagneticDiagnostic('info', 'round_finalized', {
			amount: bookEvent.amount,
			bonusMode: stateGame.bonusMode,
			magnetTarget: stateGame.magnetTargetSymbol,
		});
		if (stateGame.gameType === 'basegame' && stateGame.bonusMode !== 'feature') stateGameDerived.resetBonusState();
	},
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;
		for (const event of bookEvents) {
			await playBookEvent(event, { bookEvents });
		}
	},
};
