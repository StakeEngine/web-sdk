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
	const baseStepPerMs =
		0.117 *
		args.speedFactor *
		args.pickupStepPaceMultiplier *
		args.pickupTravelSpeed *
		args.debugGameSpeedMult;
	return { computedMax, maxStep, startStep, endStep, baseStepPerMs };
}
