type RuntimeToken = {
	id: number;
	stepIndex: number;
	lane: number;
	type: string;
	value: number;
	hit: boolean;
	activate: boolean;
	offset?: number;
	spawnLane?: number;
	extra?: Record<string, unknown>;
};

type PendingHit = { t: RuntimeToken; trigger: number } | undefined;

export function planSlidingTargetLaneHelper(params: {
	nowMs: number;
	preStepFreeRoam: boolean;
	stepPerMs: number;
	pendingHit: PendingHit;
	renderStep: number;
	stepSpacing: number;
	penguinTargetLane: number;
	penguinLane: number;
	centerLockPendingTokenId: number | null;
	preStepHandoffActive: boolean;
	preStepHandoffStartRenderStep: number;
	preStepHandoffFromLane: number;
	preStepHandoffSteps: number;
	clampPenguinLane: (value: number) => number;
	preStepFreeRoamTargetLane: (nowMs: number, pendingHit: PendingHit, stepPerMs: number) => number;
	shouldHoldCurrentLaneForSinkingToken: (token: RuntimeToken | undefined) => boolean;
	targetLaneForToken: (token: RuntimeToken) => number;
}) {
	let lane = params.preStepFreeRoam
		? params.preStepFreeRoamTargetLane(params.nowMs, params.pendingHit, params.stepPerMs)
		: params.clampPenguinLane(params.penguinTargetLane);
	let shouldCenterLock = false;
	let centerLockPendingTokenId = params.centerLockPendingTokenId;
	let preStepHandoffActive = params.preStepHandoffActive;

	const targetToken = params.pendingHit?.t;
	if (targetToken && !params.preStepFreeRoam) {
		if (params.shouldHoldCurrentLaneForSinkingToken(targetToken)) {
			return {
				lane: params.clampPenguinLane(params.penguinLane),
				shouldCenterLock: false,
				centerLockPendingTokenId: null,
				preStepHandoffActive
			};
		}
		const directTargetLane = params.targetLaneForToken(targetToken);
		centerLockPendingTokenId = targetToken.id;
		const handoffDistance = Math.max(
			params.stepSpacing * 0.04,
			params.stepSpacing * params.preStepHandoffSteps
		);
		const handoffStart = Number(params.preStepHandoffStartRenderStep);
		const handoffProgress = Number.isFinite(handoffStart)
			? Math.max(0, params.renderStep - handoffStart)
			: handoffDistance;
		const handoffT = Math.max(0, Math.min(1, handoffProgress / handoffDistance));
		if (preStepHandoffActive && handoffT < 1) {
			const eased = handoffT * handoffT * (3 - 2 * handoffT);
			lane =
				params.preStepHandoffFromLane +
				(directTargetLane - params.preStepHandoffFromLane) * eased;
			shouldCenterLock = false;
		} else {
			preStepHandoffActive = false;
			lane = directTargetLane;
			shouldCenterLock = true;
		}
	}

	return {
		lane: params.clampPenguinLane(lane),
		shouldCenterLock: shouldCenterLock && !params.preStepFreeRoam,
		centerLockPendingTokenId,
		preStepHandoffActive
	};
}

function centerLockLeadStepsForPendingTargetHelper(params: {
	pendingLane: number;
	pendingPos: { x: number; y: number } | null;
	stepPerMs: number;
	penguinLane: number;
	clampPenguinLane: (value: number) => number;
	depthForPickupY: (y: number) => number;
	lanePosition: (lane: number, depth: number) => number;
	penguinLaneMaxSpeedCenterLock: number;
	pickupCenterLockLeadDistance: number;
	pickupCenterLockBufferDistance: number;
	stepSpacing: number;
}) {
	if (!params.pendingPos || !Number.isFinite(params.stepPerMs) || params.stepPerMs <= 0) return 0;
	const pendingDepth = params.depthForPickupY(params.pendingPos.y);
	const pendingLaneX = params.lanePosition(params.pendingLane, pendingDepth);
	const penguinLaneValue = params.clampPenguinLane(params.penguinLane);
	const penguinX = params.lanePosition(penguinLaneValue, pendingDepth);
	const distancePx = Math.abs(pendingLaneX - penguinX);
	const maxLaneSpeedPerMs =
		(params.penguinLaneMaxSpeedCenterLock * params.stepSpacing) / 1000;
	if (!Number.isFinite(maxLaneSpeedPerMs) || maxLaneSpeedPerMs <= 0) return 0;
	const laneTravelMs = distancePx / maxLaneSpeedPerMs;
	const laneTravelDistance = laneTravelMs * params.stepPerMs;
	const leadDistance = Math.max(
		params.pickupCenterLockLeadDistance,
		laneTravelDistance + params.pickupCenterLockBufferDistance
	);
	return Math.max(params.stepSpacing * 0.02, leadDistance);
}
