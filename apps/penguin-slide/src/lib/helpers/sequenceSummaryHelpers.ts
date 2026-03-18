type TokenLike = {
	id: number;
	stepIndex: number;
	lane: number;
	type: string;
	value?: number;
	hit?: boolean;
	activate?: boolean;
	extra?: Record<string, unknown>;
};

type RunStatus = 'goal' | 'idle' | 'sliding' | 'slip';
type PenguinAnim =
	| 'idle'
	| 'slide_in'
	| 'slide_idle'
	| 'slide_in_revive'
	| 'win'
	| 'lose_L'
	| 'lose_R'
	| 'lose_L_vest'
	| 'lose_R_vest';

export function buildSummarySlipTrigger(args: {
	summaryEvent: any;
	slipTriggered: boolean;
	freezeMovement: boolean;
	renderStep: number;
	stepSpacing: number;
	tokens: TokenLike[];
	penguinLane: number;
	isNothingTokenType: (type: unknown) => boolean;
}) {
	let summarySlipStepIndex = Number.NaN;
	if (args.summaryEvent?.result === 'slip') {
		const explicitTriggerStep = Number(args.summaryEvent?.triggerAtStep);
		if (Number.isFinite(explicitTriggerStep)) {
			summarySlipStepIndex = Math.max(-1, explicitTriggerStep);
		} else {
			const summarySteps = Number(args.summaryEvent?.steps);
			if (Number.isFinite(summarySteps)) {
				summarySlipStepIndex = Math.max(-1, summarySteps - 1);
			}
		}
	}

	if (
		args.slipTriggered ||
		args.freezeMovement ||
		!Number.isFinite(summarySlipStepIndex) ||
		args.renderStep < summarySlipStepIndex * args.stepSpacing
	) {
		return null;
	}

	// If terminal landed token is banana, never summary-slip before that banana is picked.
	// Banana-caused slip must originate from pickup resolution, not pre-slip summary logic.
	const pendingTerminalBanana = args.tokens
		.filter(
			(entry) =>
				entry.hit &&
				!entry.activate &&
				String(entry.type ?? '').toLowerCase() === 'banana' &&
				Number(entry.stepIndex) <= summarySlipStepIndex + 1
		);
	if (pendingTerminalBanana.length > 0) {
		return null;
	}

	// If a sinking coin/star is going to be saved by a lifering, the slip must
	// originate from that pickup resolution, not from summary slip timing.
	const pendingProtectedSinkingPickup = args.tokens.filter(
		(entry) =>
			entry.hit &&
			!entry.activate &&
			(Number(entry.stepIndex) <= summarySlipStepIndex + 1) &&
			(String(entry.type ?? '').toLowerCase() === 'coin' ||
				String(entry.type ?? '').toLowerCase() === 'star') &&
			(entry.extra?.sinking === true || entry.extra?.fall === true) &&
			(Boolean(entry.extra?.savedByLifering) || Number(entry.extra?.lifeVests ?? 0) > 0)
	);
	if (pendingProtectedSinkingPickup.length > 0) {
		return null;
	}

	const summarySlipToken = args.tokens
		.filter(
			(entry) => entry.hit && !entry.activate && Number(entry.stepIndex) <= summarySlipStepIndex + 1
		)
		.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0];
	const slipSourceLane = summarySlipToken
		? args.isNothingTokenType(summarySlipToken.type)
			? args.penguinLane
			: summarySlipToken.lane
		: args.penguinLane;
	const slipOffset = summarySlipToken ? Number(summarySlipToken.extra?.offsetFrac ?? 0) : 0;

	return {
		stepIndex: Math.floor(summarySlipStepIndex),
		slipSourceLane,
		slipOffset
	};
}

export function buildSummaryCompletionState(args: {
	summaryEvent: any;
	steps: number;
	currentValue: number;
	hasPendingValuePickup: boolean;
	endRoundTriggered: boolean;
	slipTriggered: boolean;
	slipStepIndex: number | null;
	slipAnimationStarted: boolean;
	freezeOnSummary: boolean;
}) {
	if (!args.summaryEvent) {
		return {
			kind: 'idle' as const
		};
	}

	const status: RunStatus = args.summaryEvent.result === 'goal' ? 'goal' : 'slip';
	const resolvedSteps = Number(args.summaryEvent.steps ?? args.steps);
	const shouldApplyFinalValue = !args.hasPendingValuePickup;
	const finalValue = (args.summaryEvent.finalValue ?? args.currentValue * 100) / 100;
	const shouldStartWinPulse = status === 'goal' && !args.endRoundTriggered;
	const shouldTriggerEndRound = shouldStartWinPulse;
	let nextSlipTriggered = args.slipTriggered;
	let nextSlipStepIndex = args.slipStepIndex;
	let shouldQueueSlipLossPresentation = false;
	if (status === 'slip' && !args.slipTriggered) {
		shouldQueueSlipLossPresentation = true;
		nextSlipTriggered = true;
		const triggerStep = Number(args.summaryEvent.triggerAtStep);
		nextSlipStepIndex =
			args.slipStepIndex ??
			(Number.isFinite(triggerStep) ? triggerStep : Number(args.summaryEvent.steps ?? args.steps));
	}
	const shouldClearLifering = status !== 'goal';
	const clearLiferingStep = Number.isFinite(Number(args.summaryEvent.steps))
		? Number(args.summaryEvent.steps)
		: null;
	const shouldTriggerSlipAnimation =
		status === 'slip' && nextSlipTriggered && !args.slipAnimationStarted;

	return {
		kind: 'summary' as const,
		status,
		penguinAnim: (status === 'goal' ? 'win' : 'slide_idle') as PenguinAnim,
		steps: resolvedSteps,
		shouldApplyFinalValue,
		finalValue,
		shouldStopRunEarly: true,
		shouldFreezeMovement: args.freezeOnSummary,
		shouldDisableAutoScroll: true,
		shouldStartWinPulse,
		shouldTriggerEndRound,
		shouldQueueSlipLossPresentation,
		nextSlipTriggered,
		nextSlipStepIndex,
		shouldClearLifering,
		clearLiferingStep,
		shouldTriggerSlipAnimation
	};
}
