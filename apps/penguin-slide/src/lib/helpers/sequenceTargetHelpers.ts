type TokenLike = {
	id: number;
	stepIndex: number;
	lane: number;
	value?: number;
	type?: string;
	hit?: boolean;
	activate?: boolean;
	extra?: Record<string, unknown>;
};

export function targetLaneForTokenHelper(args: {
	token: { lane: number; spawnLane?: number; extra?: Record<string, unknown> };
	penguinLane: number;
	clampPenguinLane: (value: number) => number;
	nearestLane: (value: number) => number;
	slotToOffset: Record<number, number>;
}) {
	const { token } = args;
	if (token.extra?.targetLane === null) return args.clampPenguinLane(args.penguinLane);
	const explicitTargetSlot = Number(token.extra?.targetSlot);
	if (Number.isFinite(explicitTargetSlot)) {
		const mappedLane = Number(args.slotToOffset[explicitTargetSlot]);
		if (Number.isFinite(mappedLane)) return args.clampPenguinLane(mappedLane);
	}
	const explicitLockLane = Number(token.extra?.lockLane);
	if (Number.isFinite(explicitLockLane)) return args.clampPenguinLane(explicitLockLane);
	const explicitTargetLane = Number(token.extra?.targetLane);
	if (Number.isFinite(explicitTargetLane)) return args.clampPenguinLane(explicitTargetLane);
	const explicitSpawnLane = Number(token.extra?.spawnLane ?? token.spawnLane);
	if (Number.isFinite(explicitSpawnLane)) return args.clampPenguinLane(explicitSpawnLane);
	return args.nearestLane(token.lane);
}

export function nextPendingHitTokenHelper<T extends TokenLike>(args: {
	tokens: T[];
	afterStepIndex: number;
	activatedTokenId: number;
}) {
	return args.tokens
		.filter((token) => {
			if (!token.hit || token.activate || token.id === args.activatedTokenId) return false;
			if (token.stepIndex > args.afterStepIndex) return true;
			return token.stepIndex === args.afterStepIndex && token.id > args.activatedTokenId;
		})
		.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0];
}

export function nextTargetableHitTokenHelper<T extends TokenLike>(args: {
	tokens: T[];
	afterStepIndex: number;
	activatedTokenId: number;
	isTargetableHitToken: (token: T) => boolean;
}) {
	return args.tokens
		.filter((token) => {
			if (!args.isTargetableHitToken(token) || token.activate || token.id === args.activatedTokenId) return false;
			if (token.stepIndex > args.afterStepIndex) return true;
			return token.stepIndex === args.afterStepIndex && token.id > args.activatedTokenId;
		})
		.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0];
}

export function slipTriggerRenderStepForTokenHelper(args: {
	token: { stepIndex?: unknown; type?: unknown; extra?: Record<string, unknown> };
	pickupTriggerAt: (stepIndex: number, type?: string, spawnDelay?: number) => number;
	tokenShouldSlipOnPreviousStep: (token: { stepIndex?: unknown; type?: unknown; extra?: Record<string, unknown> }) => boolean;
	stepSpacing: number;
	slipTriggerDelaySteps: number;
	previousStepSlipExtraLeadSteps: number;
	firstStepSinkingExtraLeadSteps: number;
}) {
	const tokenStep = Number(args.token?.stepIndex ?? 0);
	const spawnDelay = Number(args.token?.extra?.spawnDelay ?? 0);
	const baseTrigger = args.pickupTriggerAt(tokenStep, String(args.token?.type ?? ''), spawnDelay);
	if (args.token?.extra?.proxySlip === true) {
		return baseTrigger - args.stepSpacing * 0.08;
	}
	if (!args.tokenShouldSlipOnPreviousStep(args.token)) {
		return baseTrigger + args.stepSpacing * args.slipTriggerDelaySteps;
	}
	const firstStepExtraLead = tokenStep <= 0 ? args.firstStepSinkingExtraLeadSteps : 0;
	return (
		baseTrigger -
		args.stepSpacing * (1 + args.previousStepSlipExtraLeadSteps + firstStepExtraLead) +
		args.stepSpacing * args.slipTriggerDelaySteps
	);
}
