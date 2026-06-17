import { stateBet, stateI18nDerived, stateModal, stateUi, stateUrlDerived } from 'state-shared';
import type { BaseBet } from 'utils-bet';
import { formatCurrencyAmountForCurrency, normalizeCurrency } from '../lib/utils/currency';
import { logForestDiagnostic } from '../utils/forestDiagnostics';

type BootStatus = 'booting' | 'ready' | 'error';

export const forestStakeState = $state({
	bootStatus: 'booting' as BootStatus,
	bootError: '',
	replaySnapshot: null as BaseBet | null,
	replayEventId: '',
	replayHasPlayed: false,
	replayRunning: false,
	replayStartRequested: false,
	pendingRoundDetected: false,
});

const safeAmount = (value: unknown) => {
	const amount = Number(value);
	return Number.isFinite(amount) ? amount : 0;
};

const isReplayMode = () => stateUi.config.mode === 'replay' || stateUrlDerived.replay();

const selectedModeLabel = () => String(stateBet.activeBetModeKey || stateUrlDerived.mode() || 'BASE').toUpperCase();

const bootReady = () => {
	forestStakeState.bootStatus = 'ready';
	if (!forestStakeState.bootError) return;
	forestStakeState.bootError = '';
};

const setBootError = (message: string) => {
	forestStakeState.bootStatus = 'error';
	forestStakeState.bootError = message;
	logForestDiagnostic('error', 'boot_error', {
		message,
		mode: stateUi.config.mode,
		replay: isReplayMode(),
		pendingRoundDetected: forestStakeState.pendingRoundDetected,
	});
};

const captureReplaySnapshot = (bet: BaseBet | null) => {
	if (!bet) return;
	forestStakeState.replaySnapshot = structuredClone(bet);
	forestStakeState.replayEventId = stateUrlDerived.event() || String((bet as { event?: string | number })?.event ?? '');
	logForestDiagnostic('info', 'replay_snapshot_captured', {
		eventId: forestStakeState.replayEventId,
		mode: (bet as { mode?: string })?.mode,
	});
};

const syncReplayStatus = ({ idle }: { idle: boolean }) => {
	if (!isReplayMode()) {
		forestStakeState.replayRunning = false;
		forestStakeState.replayStartRequested = false;
		return;
	}

	forestStakeState.replayRunning = !idle;

	if (idle && forestStakeState.replaySnapshot) {
		forestStakeState.replayHasPlayed = true;
	}
};

const requestReplayStart = () => {
	if (!forestStakeState.replaySnapshot) {
		setBootError(t('REPLAY ERROR GENERIC'));
		logForestDiagnostic('error', 'replay_start_missing_snapshot');
		return false;
	}

	forestStakeState.replayStartRequested = true;
	forestStakeState.replayHasPlayed = false;
	forestStakeState.replayRunning = true;
	logForestDiagnostic('info', 'replay_start_requested', {
		eventId: forestStakeState.replayEventId,
		mode: selectedModeLabel(),
	});
	return true;
};

const replayBetAmount = () =>
	safeAmount((forestStakeState.replaySnapshot as { amount?: number })?.amount ?? stateBet.betAmount);

const replayCostAmount = () => {
	const replayMode = String(
		(forestStakeState.replaySnapshot as { mode?: string })?.mode ||
			stateBet.activeBetModeKey ||
			stateUrlDerived.mode() ||
			'BASE',
	).toUpperCase();
	const multiplier = replayMode === 'FEATURE' ? 20 : replayMode === 'BONUS' ? 100 : replayMode === 'SUPER' ? 400 : 1;
	return replayBetAmount() * multiplier;
};

const replayPayoutAmount = () =>
	safeAmount((forestStakeState.replaySnapshot as { payout?: number })?.payout);

const replayWinAmount = () => {
	const payout = replayPayoutAmount();
	return payout > 0 ? payout : safeAmount(stateBet.winBookEventAmount);
};

const formatCurrencyAmount = (amount: number, fractionDigits = 2) =>
	formatCurrencyAmountForCurrency(normalizeCurrency(stateBet.currency), safeAmount(amount), fractionDigits);

const t = (key: string) => stateI18nDerived.translate(key);

const syncModalError = () => {
	if (stateModal.modal?.name !== 'error') return;
	const message =
		(stateModal.modal.error as { message?: string; error?: string } | undefined)?.message ||
		(stateModal.modal.error as { error?: string } | undefined)?.error ||
		t('REPLAY_ERROR_GENERIC');
	setBootError(String(message));
};

export const forestStakeDerived = {
	isReplayMode,
	selectedModeLabel,
	bootReady,
	setBootError,
	captureReplaySnapshot,
	syncReplayStatus,
	requestReplayStart,
	syncModalError,
	replayBetAmount,
	replayCostAmount,
	replayPayoutAmount,
	replayWinAmount,
	formatCurrencyAmount,
	t,
};
