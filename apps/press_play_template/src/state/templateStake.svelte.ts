import { stateBet, stateI18nDerived, stateModal, stateUi, stateUrlDerived } from 'state-shared';
import type { BaseBet } from 'utils-bet';
import { formatCurrencyAmountForCurrency, normalizeCurrency } from '../lib/utils/currency';
import { logDiagnostic } from '../utils/diagnostics';

type BootStatus = 'booting' | 'ready' | 'error';

export const templateStakeState = $state({
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
	templateStakeState.bootStatus = 'ready';
	if (!templateStakeState.bootError) return;
	templateStakeState.bootError = '';
};

const setBootError = (message: string) => {
	templateStakeState.bootStatus = 'error';
	templateStakeState.bootError = message;
	logDiagnostic('error', 'boot_error', {
		message,
		mode: stateUi.config.mode,
		replay: isReplayMode(),
		pendingRoundDetected: templateStakeState.pendingRoundDetected,
	});
};

const captureReplaySnapshot = (bet: BaseBet | null) => {
	if (!bet) return;
	templateStakeState.replaySnapshot = structuredClone(bet);
	templateStakeState.replayEventId = stateUrlDerived.event() || String((bet as { event?: string | number })?.event ?? '');
	logDiagnostic('info', 'replay_snapshot_captured', {
		eventId: templateStakeState.replayEventId,
		mode: (bet as { mode?: string })?.mode,
	});
};

const syncReplayStatus = ({ idle }: { idle: boolean }) => {
	if (!isReplayMode()) {
		templateStakeState.replayRunning = false;
		templateStakeState.replayStartRequested = false;
		return;
	}

	templateStakeState.replayRunning = !idle;

	if (idle && templateStakeState.replaySnapshot) {
		templateStakeState.replayHasPlayed = true;
	}
};

const requestReplayStart = () => {
	if (!templateStakeState.replaySnapshot) {
		setBootError(t('REPLAY ERROR GENERIC'));
		logDiagnostic('error', 'replay_start_missing_snapshot');
		return false;
	}

	templateStakeState.replayStartRequested = true;
	templateStakeState.replayHasPlayed = false;
	templateStakeState.replayRunning = true;
	logDiagnostic('info', 'replay_start_requested', {
		eventId: templateStakeState.replayEventId,
		mode: selectedModeLabel(),
	});
	return true;
};

const replayBetAmount = () =>
	safeAmount((templateStakeState.replaySnapshot as { amount?: number })?.amount ?? stateBet.betAmount);

const replayCostAmount = () => {
	const replayMode = String(
		(templateStakeState.replaySnapshot as { mode?: string })?.mode ||
			stateBet.activeBetModeKey ||
			stateUrlDerived.mode() ||
			'BASE',
	).toUpperCase();
	const multiplier = replayMode === 'BONUS' ? 100 : 1;
	return replayBetAmount() * multiplier;
};

const replayPayoutAmount = () =>
	safeAmount((templateStakeState.replaySnapshot as { payout?: number })?.payout);

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

export const templateStakeDerived = {
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
