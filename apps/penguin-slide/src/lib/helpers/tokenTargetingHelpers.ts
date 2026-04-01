export type TargetingToken = {
	stepIndex: number;
	lane: number;
	type: string;
	hit: boolean;
	extra?: Record<string, unknown>;
};

export function isNothingTokenType(type: unknown) {
	const normalized = String(type ?? '').trim().toLowerCase();
	return (
		normalized === 'empty' ||
		normalized === 'nothing' ||
		normalized === 'none' ||
		normalized === 'null' ||
		normalized === 'undefined'
	);
}

export function tokenMatchesLandedStep(
	token: Pick<TargetingToken, 'lane' | 'extra'>,
	nearestLane: (value: number) => number
) {
	const landed = String(token.extra?.landedStep ?? token.extra?.landedPad ?? '')
		.trim()
		.toUpperCase();
	const padKey = String(token.extra?.padKey ?? '')
		.trim()
		.toUpperCase();
	if ((landed === 'LEFT' || landed === 'RIGHT') && (padKey === 'LEFT' || padKey === 'RIGHT')) {
		return landed === padKey;
	}
	if (landed === 'LEFT' || landed === 'RIGHT') {
		const tokenSide = nearestLane(Number(token.lane)) >= 0 ? 'RIGHT' : 'LEFT';
		return tokenSide === landed;
	}
	return true;
}

export function tokenCanDriveTargeting(
	token: TargetingToken,
	shouldSkipPositioningForHitToken: (token: TargetingToken | undefined) => boolean
) {
	if (token.extra?.bridgeStep === true && token.extra?.cosmetic === true) return false;
	if (token.extra?.targetLane === null) return false;
	if (token.extra?.skipTargeting === true) return false;
	return !shouldSkipPositioningForHitToken(token);
}

export function isTargetableHitToken(
	token: TargetingToken,
	deps: {
		nearestLane: (value: number) => number;
		shouldSkipPositioningForHitToken: (token: TargetingToken | undefined) => boolean;
	}
) {
	return (
		token.hit &&
		tokenMatchesLandedStep(token, deps.nearestLane) &&
		tokenCanDriveTargeting(token, deps.shouldSkipPositioningForHitToken)
	);
}
