type TokenLike = {
	lane: number;
	type: string;
	hit: boolean;
	activate?: boolean;
	stepIndex?: number;
	extra?: Record<string, unknown>;
};

type BandLike = {
	pos?: { x: number; y: number } | null;
	depth: number;
	spawnLane?: number;
	yDelta: number;
	inActivateBand?: boolean;
	passedBand: boolean;
	approachingBand: boolean;
};

export function isNearEdgeForSlipHelper(args: {
	band: BandLike | null;
	penguin: { x: number; y: number; size: number };
	clampLaneXs: (depth: number) => { minX: number; maxX: number };
}) {
	if (!args.band) return false;
	const bounds = args.clampLaneXs(args.band.depth);
	const leftDist = args.penguin.x - bounds.minX;
	const rightDist = bounds.maxX - args.penguin.x;
	const edgeWindow = Math.max(16, args.penguin.size * 0.24);
	return leftDist <= edgeWindow || rightDist <= edgeWindow;
}

export function shouldGoalCollectNowHelper(args: {
	token: TokenLike;
	band: BandLike | null;
	penguin: { x: number; y: number; size: number };
	penguinLane: number;
	targetLaneForToken: (token: TokenLike) => number;
	clampPenguinLane: (value: number) => number;
}) {
	if (args.token.type !== 'goal' || !args.band?.pos) return true;
	const xDelta = Math.abs(args.penguin.x - args.band.pos.x);
	const yDelta = Math.abs(args.band.yDelta);
	const laneDelta = Math.abs(
		args.clampPenguinLane(args.penguinLane) -
			args.clampPenguinLane(args.targetLaneForToken(args.token))
	);
	const maxXDelta = Math.max(34, args.penguin.size * 0.34);
	const maxYDelta = Math.max(18, args.penguin.size * 0.14);
	if (xDelta <= maxXDelta && yDelta <= maxYDelta) return true;
	if (args.band.passedBand) {
		return (
			xDelta <= Math.max(44, args.penguin.size * 0.44) &&
			yDelta <= Math.max(34, args.penguin.size * 0.26) &&
			laneDelta <= 0.3
		);
	}
	return false;
}

export function shouldPreSlipBeforePickupHelper(args: {
	token: TokenLike;
	band: BandLike | null;
	penguin: { x: number; y: number; size: number };
	isNothingTokenType: (type: string) => boolean;
	isNearEdgeForSlip: (band: BandLike | null, penguin: { x: number; y: number; size: number }) => boolean;
	slipTriggerRenderStepForToken: (token: TokenLike) => number;
	tokens: TokenLike[];
	stepSpacing: number;
	renderStep: number;
}) {
	if (!args.band) return false;
	if (args.token.activate || !args.token.hit) return false;
	const sinkingNothing =
		args.isNothingTokenType(args.token.type) &&
		(args.token.extra?.sinking === true || args.token.extra?.fall === true);
	if (!(args.token.type === 'coin' || args.token.type === 'star' || sinkingNothing)) return false;
	const sinkingSlip = args.token.extra?.sinking === true || args.token.extra?.fall === true;
	if (!sinkingSlip) return false;
	if (!args.isNearEdgeForSlip(args.band, args.penguin)) return false;
	if (!args.band.approachingBand) return false;
	const trigger = args.slipTriggerRenderStepForToken(args.token);
	const firstSinkingPickupStep = args.tokens
		.filter((entry) => entry.hit && (entry.extra?.sinking === true || entry.extra?.fall === true))
		.reduce((minStep, entry) => Math.min(minStep, Number(entry.stepIndex)), Number.POSITIVE_INFINITY);
	const isFirstSinkingPickup = Number(args.token.stepIndex) === firstSinkingPickupStep;
	const preSlipStart =
		trigger -
		args.stepSpacing *
			(sinkingNothing
				? isFirstSinkingPickup
					? 0.62
					: 0.46
				: isFirstSinkingPickup
					? 0.45
					: 0.3);
	const preSlipEnd =
		trigger -
		args.stepSpacing *
			(sinkingNothing
				? isFirstSinkingPickup
					? 0.2
					: 0.1
				: isFirstSinkingPickup
					? 0.14
					: 0.06);
	const inStepWindow = args.renderStep >= preSlipStart && args.renderStep <= preSlipEnd;
	const earlyYWindow =
		args.band.yDelta >
		Math.max(
			sinkingNothing
				? isFirstSinkingPickup
					? 16
					: 12
				: isFirstSinkingPickup
					? 24
					: 18,
			args.stepSpacing * (sinkingNothing ? 0.01 : 0.015)
		);
	return inStepWindow || earlyYWindow;
}

export function isDoubleNothingStepHelper(args: {
	stepIndex: number;
	tokens: TokenLike[];
	isNothingTokenType: (type: string) => boolean;
}) {
	const stepTokens = args.tokens.filter(
		(entry) => Number(entry.stepIndex) === Number(args.stepIndex) && !entry.extra?.cosmetic
	);
	if (stepTokens.length < 2) return false;
	return stepTokens.every((entry) => args.isNothingTokenType(entry.type));
}

export function shouldSkipPositioningForHitTokenHelper(args: {
	token: TokenLike | undefined;
	isNothingTokenType: (type: string) => boolean;
	isDoubleNothingStep: (stepIndex: number) => boolean;
}) {
	if (!args.token?.hit) return false;
	if (!args.isNothingTokenType(args.token.type)) return false;
	if (args.token.extra?.sinking === true || args.token.extra?.fall === true) return false;
	return args.isDoubleNothingStep(Number(args.token.stepIndex));
}

export function shouldAutoCollectNothingHelper(args: {
	token: TokenLike;
	band: BandLike | null;
	penguin: { y: number; size: number };
	isNothingTokenType: (type: string) => boolean;
}) {
	if (!args.token.hit || args.token.activate || !args.isNothingTokenType(args.token.type)) return false;
	if (!args.band?.pos) return false;
	const yWindow = Math.max(8, args.penguin.size * 0.08);
	return args.band.pos.y >= args.penguin.y - yWindow;
}

export function isLaneAlignedForPickupHelper(args: {
	token: TokenLike;
	band: BandLike | null;
	penguin: { x: number; y: number; size: number };
	penguinLane: number;
	targetLaneForToken: (token: TokenLike) => number;
	clampPenguinLane: (value: number) => number;
	isNothingTokenType: (type: string) => boolean;
}) {
	if (!args.band?.pos) return false;
	const xDelta = Math.abs(args.penguin.x - args.band.pos.x);
	const laneDelta = Math.abs(
		args.clampPenguinLane(args.penguinLane) -
			args.clampPenguinLane(args.targetLaneForToken(args.token))
	);
	const isNothing = args.isNothingTokenType(args.token.type);
	const isGoal = args.token.type === 'goal';
	const maxXDelta = isGoal
		? Math.max(40, args.penguin.size * 0.38)
		: isNothing
			? Math.max(20, args.penguin.size * 0.28)
			: Math.max(16, args.penguin.size * 0.22);
	const maxLaneDelta = isGoal ? 0.42 : isNothing ? 0.34 : 0.22;
	return xDelta <= maxXDelta && laneDelta <= maxLaneDelta;
}

export function isLaneCloserToNearestEdgeHelper(args: {
	candidateLane: number;
	currentLane: number;
	laneExtents: () => { minLane: number; maxLane: number };
}) {
	const extents = args.laneExtents();
	const currentToLeft = Math.abs(args.currentLane - extents.minLane);
	const currentToRight = Math.abs(extents.maxLane - args.currentLane);
	const nearestEdgeLane = currentToLeft <= currentToRight ? extents.minLane : extents.maxLane;
	return (
		Math.abs(args.candidateLane - nearestEdgeLane) + 1e-4 <
		Math.abs(args.currentLane - nearestEdgeLane)
	);
}
