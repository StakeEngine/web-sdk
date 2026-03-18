type Token = {
	stepIndex: number;
	hit: boolean;
	extra?: Record<string, unknown>;
};

export function findFirstTargetableHitToken<T extends Token>(args: {
	tokens: T[];
	tokenMatchesLandedStep: (token: T) => boolean;
	tokenCanDriveTargeting: (token: T) => boolean;
}) {
	return args.tokens
		.filter((token) => token.hit && args.tokenMatchesLandedStep(token) && args.tokenCanDriveTargeting(token))
		.sort((a, b) => a.stepIndex - b.stepIndex)[0];
}

export function computeSequenceScrollWindow(args: {
	tokens: Array<{ stepIndex: number }>;
	slipStepIndex: number | null;
	summarySteps?: number | null;
	stepSpacing: number;
	renderStep: number;
	speedFactor: number;
	pickupStepPaceMultiplier: number;
	pickupTravelSpeed: number;
	debugGameSpeedMult: number;
}) {
	const baseStepPerMs = computeBaseStepPerMs({
		speedFactor: args.speedFactor,
		pickupStepPaceMultiplier: args.pickupStepPaceMultiplier,
		pickupTravelSpeed: args.pickupTravelSpeed,
		debugGameSpeedMult: args.debugGameSpeedMult,
	});
	const computedMax = Math.max(6, ...args.tokens.map((token) => token.stepIndex));
	const slipVisibleEnd = args.slipStepIndex != null ? args.slipStepIndex + 1 : null;
	const endStepTarget =
		slipVisibleEnd != null
			? slipVisibleEnd
			: args.summarySteps != null
				? args.summarySteps + 1
				: computedMax;
	const maxStep = Math.max(2, endStepTarget * args.stepSpacing);
	const startStep = args.renderStep;
	const endStep = maxStep + 0.2;
	return { computedMax, maxStep, startStep, endStep, baseStepPerMs };
}

export function effectiveSpeedFactor(speedFactor: number) {
	return speedFactor === 2 ? speedFactor * 1.2 : speedFactor;
}

export function computeBaseStepPerMs(args: {
	speedFactor: number;
	pickupStepPaceMultiplier: number;
	pickupTravelSpeed: number;
	debugGameSpeedMult: number;
}) {
	const adjustedSpeedFactor = effectiveSpeedFactor(args.speedFactor);
	return (
		0.117 *
		0.891 *
		adjustedSpeedFactor *
		args.pickupStepPaceMultiplier *
		args.pickupTravelSpeed *
		args.debugGameSpeedMult
	);
}
