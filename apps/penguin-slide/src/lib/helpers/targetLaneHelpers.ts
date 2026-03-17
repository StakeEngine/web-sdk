export function laneOffsetForTargetIndexHelper(args: {
	targetIndex: number | null;
	pickupLineCrossings: Array<{ slot: number; offset: number }>;
	slotToOffset: Record<number, number>;
}) {
	if (args.targetIndex == null) return null;
	const crossing = args.pickupLineCrossings.find((entry) => entry.slot === args.targetIndex);
	if (crossing) return Number(crossing.offset);
	const lane = args.slotToOffset[args.targetIndex];
	return Number.isFinite(lane) ? Number(lane) : null;
}

export function targetLaneIndexForTokenHelper(args: {
	token: { lane: number; spawnLane?: number; extra?: Record<string, unknown> };
	targetLineIndexForOffset: (offset: number) => number | null;
}) {
	const explicitTargetSlot = Number(args.token.extra?.targetSlot);
	if (Number.isFinite(explicitTargetSlot)) {
		return explicitTargetSlot;
	}
	const explicitLockLane = Number(args.token.extra?.lockLane);
	if (Number.isFinite(explicitLockLane)) {
		return args.targetLineIndexForOffset(explicitLockLane);
	}
	const spawnOffset = Number(args.token.extra?.spawnLane ?? args.token.spawnLane ?? args.token.lane);
	if (Number.isFinite(spawnOffset)) {
		return args.targetLineIndexForOffset(spawnOffset);
	}
	const explicitTargetLane = Number(args.token.extra?.targetLane);
	if (Number.isFinite(explicitTargetLane)) {
		return args.targetLineIndexForOffset(explicitTargetLane);
	}
	return null;
}

export function shouldHoldCurrentLaneForSinkingTokenHelper(args: {
	token:
		| {
				hit?: boolean;
				type: string;
				extra?: Record<string, unknown>;
		  }
		| undefined;
	isNothingTokenType: (type: string) => boolean;
}) {
	if (!args.token || !args.token.hit) return false;
	if (args.isNothingTokenType(args.token.type)) return false;
	if (String(args.token.type ?? '').toLowerCase() === 'banana') return false;
	return args.token.extra?.sinking === true || args.token.extra?.fall === true;
}

export function centerLockLeadStepsForPendingTargetHelper(args: {
	pendingLane: number;
	pendingPos: { x: number; y: number } | null;
	stepPerMs: number;
	penguinLane: number;
	clampPenguinLane: (lane: number) => number;
	penguinPose: () => { x: number; y: number };
	depthForPickupY: (y: number) => number;
	lanePosition: (depth: number, offset: number) => { x: number };
	penguinLaneMaxSpeedCenterLock: number;
	pickupCenterLockLeadMs: number;
	pickupCenterLockBufferMs: number;
	stepSpacing: number;
}) {
	const penguinNow = args.penguinPose();
	const laneDistance = Math.abs(
		args.clampPenguinLane(args.pendingLane) - args.clampPenguinLane(args.penguinLane)
	);
	const lockDistanceBoost = Math.min(1.45, 1 + laneDistance * 0.42);
	const speedLanePerS = Math.max(0.01, args.penguinLaneMaxSpeedCenterLock * lockDistanceBoost);
	const depth = args.pendingPos ? args.depthForPickupY(args.pendingPos.y) : args.depthForPickupY(penguinNow.y);
	const pxPerLane = Math.max(
		1,
		Math.abs(args.lanePosition(depth, 1).x - args.lanePosition(depth, 0).x)
	);
	const speedPxPerMs = Math.max(0.02, (pxPerLane * speedLanePerS) / 1000);
	const targetX = args.pendingPos?.x ?? args.lanePosition(depth, args.clampPenguinLane(args.pendingLane)).x;
	const xDistance = Math.abs(targetX - penguinNow.x);
	const requiredMs = xDistance / speedPxPerMs;
	const leadMs = Math.max(args.pickupCenterLockLeadMs, requiredMs + args.pickupCenterLockBufferMs);
	return Math.max(args.stepSpacing * 0.02, args.stepPerMs * leadMs);
}
