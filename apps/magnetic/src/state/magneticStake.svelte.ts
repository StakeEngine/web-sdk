import { stateBet, stateI18nDerived, stateModal, stateUi, stateUrlDerived } from 'state-shared';
import type { BaseBet } from 'utils-bet';
import { formatCurrencyAmountForCurrency, normalizeCurrency } from '../lib/utils/currency';
import { logMagneticDiagnostic } from '../utils/magneticDiagnostics';

type BootStatus = 'booting' | 'ready' | 'error';

export const magneticStakeState = $state({
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
	magneticStakeState.bootStatus = 'ready';
	if (!magneticStakeState.bootError) return;
	magneticStakeState.bootError = '';
};

const setBootError = (message: string) => {
	magneticStakeState.bootStatus = 'error';
	magneticStakeState.bootError = message;
	logMagneticDiagnostic('error', 'boot_error', {
		message,
		mode: stateUi.config.mode,
		replay: isReplayMode(),
		pendingRoundDetected: magneticStakeState.pendingRoundDetected,
	});
};

const captureReplaySnapshot = (bet: BaseBet | null) => {
	if (!bet) return;
	magneticStakeState.replaySnapshot = structuredClone(bet);
	magneticStakeState.replayEventId = stateUrlDerived.event() || String((bet as { event?: string | number })?.event ?? '');
	logMagneticDiagnostic('info', 'replay_snapshot_captured', {
		eventId: magneticStakeState.replayEventId,
		mode: (bet as { mode?: string })?.mode,
	});
};

const syncReplayStatus = ({ idle }: { idle: boolean }) => {
	if (!isReplayMode()) {
		magneticStakeState.replayRunning = false;
		magneticStakeState.replayStartRequested = false;
		return;
	}

	magneticStakeState.replayRunning = !idle;

	if (idle && magneticStakeState.replaySnapshot) {
		magneticStakeState.replayHasPlayed = true;
	}
};

const requestReplayStart = () => {
	if (!magneticStakeState.replaySnapshot) {
		setBootError(t('REPLAY ERROR GENERIC'));
		logMagneticDiagnostic('error', 'replay_start_missing_snapshot');
		return false;
	}

	magneticStakeState.replayStartRequested = true;
	magneticStakeState.replayHasPlayed = false;
	magneticStakeState.replayRunning = true;
	logMagneticDiagnostic('info', 'replay_start_requested', {
		eventId: magneticStakeState.replayEventId,
		mode: selectedModeLabel(),
	});
	return true;
};

const replayBetAmount = () =>
	safeAmount((magneticStakeState.replaySnapshot as { amount?: number })?.amount ?? stateBet.betAmount);

const replayCostAmount = () => {
	const replayMode = String(
		(magneticStakeState.replaySnapshot as { mode?: string })?.mode ||
			stateBet.activeBetModeKey ||
			stateUrlDerived.mode() ||
			'BASE',
	).toUpperCase();
	const multiplier = replayMode === 'CHANCE' ? 2 : replayMode === 'FEATURE' ? 50 : replayMode === 'BONUS' ? 150 : replayMode === 'SUPER' ? 400 : 1;
	return replayBetAmount() * multiplier;
};

const replayPayoutAmount = () =>
	safeAmount((magneticStakeState.replaySnapshot as { payout?: number })?.payout);

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

export const magneticStakeDerived = {
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
