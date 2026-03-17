export type SequenceToken = {
	id: number;
	stepIndex: number;
	lane: number;
	type: string;
	value?: number;
	hit: boolean;
	activate?: boolean;
	extra?: Record<string, unknown>;
};

export function findPendingGoalStep<T extends SequenceToken>(tokens: T[]) {
	return tokens
		.filter((entry) => entry.hit && !entry.activate && entry.type === 'goal')
		.map((entry) => Number(entry.stepIndex))
		.sort((a, b) => a - b)[0];
}

export function buildUpcomingTokens<T extends SequenceToken>(args: {
	tokens: T[];
	pickupTriggerAt: (stepIndex: number, type: string, spawnDelay: number) => number;
}) {
	return args.tokens
		.filter((token) => !token.activate)
		.map((token) => ({
			t: token,
			trigger: args.pickupTriggerAt(
				token.stepIndex,
				token.type,
				Number(token.extra?.spawnDelay ?? 0)
			)
		}))
		.sort((a, b) =>
			a.t.stepIndex === b.t.stepIndex ? a.t.id - b.t.id : a.t.stepIndex - b.t.stepIndex
		);
}

export function firstPendingTargetableHit<T extends SequenceToken>(
	upcoming: Array<{ t: T; trigger: number }>,
	isTargetableHitToken: (token: T) => boolean,
	options?: {
		renderStep?: number;
		stepSpacing?: number;
		staleTriggerWindowSteps?: number;
	}
) {
	const renderStep = Number(options?.renderStep ?? Number.NaN);
	const stepSpacing = Number(options?.stepSpacing ?? Number.NaN);
	const staleTriggerWindowSteps = Number(options?.staleTriggerWindowSteps ?? 0.38);
	const staleTriggerWindow =
		Number.isFinite(stepSpacing) && stepSpacing > 0
			? stepSpacing * Math.max(0, staleTriggerWindowSteps)
			: 0;
	const candidates = upcoming.filter((entry) => isTargetableHitToken(entry.t));
	if (!Number.isFinite(renderStep) || staleTriggerWindow <= 0) {
		return candidates[0];
	}
	const nonStale = candidates.find((entry) => entry.trigger >= renderStep - staleTriggerWindow);
	return nonStale ?? candidates[0];
}

export function computeSummarySlipStepIndex(summaryEvent: any) {
	let summarySlipStepIndex = Number.NaN;
	if (summaryEvent?.result === 'slip') {
		const explicitTriggerStep = Number(summaryEvent?.triggerAtStep);
		if (Number.isFinite(explicitTriggerStep)) {
			summarySlipStepIndex = Math.max(-1, explicitTriggerStep);
		} else {
			const summarySteps = Number(summaryEvent?.steps);
			if (Number.isFinite(summarySteps)) {
				summarySlipStepIndex = Math.max(-1, summarySteps - 1);
			}
		}
	}
	return summarySlipStepIndex;
}

export function findSummarySlipToken(tokens: SequenceToken[], summarySlipStepIndex: number) {
	return tokens
		.filter(
			(entry) => entry.hit && !entry.activate && Number(entry.stepIndex) <= summarySlipStepIndex + 1
		)
		.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0];
}

export function filterVisibleUnactivatedTokens<T extends SequenceToken>(args: {
	tokens: T[];
	renderStep: number;
	stepSpacing: number;
	lateHideWindowFactor?: number;
}) {
	const lateHideWindow = args.stepSpacing * (args.lateHideWindowFactor ?? 0.2);
	return args.tokens.filter((token) => {
		if (token.activate) return true;
		const relative = token.stepIndex * args.stepSpacing - args.renderStep;
		return relative >= -lateHideWindow;
	});
}
