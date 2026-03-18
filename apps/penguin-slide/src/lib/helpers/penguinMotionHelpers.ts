export function computeTurnTiltState(args: {
	dt: number;
	lockToPickup: boolean;
	status: 'idle' | 'sliding' | 'goal' | 'slip';
	slipAnimationStarted: boolean;
	freezeMovement: boolean;
	penguinTargetLane: number;
	penguinLane: number;
	laneVelocity: number;
	ctrlTurnTilt: number;
	ctrlTurnIntentFiltered: number;
	penguinMotionStepDtMax: number;
}) {
	const moving = args.status === 'sliding' && !args.slipAnimationStarted && !args.freezeMovement;
	const steer = args.penguinTargetLane - args.penguinLane;
	const turnIntentRaw = Math.max(-1, Math.min(1, steer * 2.05 + args.laneVelocity * 0.46));
	const intentFlip = turnIntentRaw * args.ctrlTurnIntentFiltered < 0;
	const intentBlendScale = intentFlip ? 0.55 : 1;
	const intentBlend =
		(1 - Math.exp(-8.5 * Math.max(1 / 240, Math.min(args.penguinMotionStepDtMax, args.dt)))) *
		intentBlendScale;
	let nextIntent = args.ctrlTurnIntentFiltered + (turnIntentRaw - args.ctrlTurnIntentFiltered) * intentBlend;
	const velocityAbs = Math.abs(args.laneVelocity);
	const onset = velocityAbs / (velocityAbs + 0.22);
	const targetTilt = moving ? -nextIntent * 13 * onset : 0;
	const smoothRate = moving ? (intentFlip ? 7.2 : args.lockToPickup ? 7.5 : 10.5) : 6.5;
	const blend = 1 - Math.exp(-smoothRate * Math.max(0, args.dt));
	let nextTilt = args.ctrlTurnTilt + (targetTilt - args.ctrlTurnTilt) * blend;
	if (!moving) {
		nextIntent *= Math.exp(-8 * Math.max(0, args.dt));
		if (Math.abs(nextTilt) < 0.05) nextTilt = 0;
	}
	return { ctrlTurnTilt: nextTilt, ctrlTurnIntentFiltered: nextIntent };
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function sortedSlotOffsets(slotOffsets: number[]) {
	return [...slotOffsets].sort((a, b) => a - b);
}

function slotSegmentIndex(slot: number, slotOffsets: number[]) {
	if (slotOffsets.length < 2) return 0;
	if (slot <= 0) return 0;
	if (slot >= slotOffsets.length - 1) return slotOffsets.length - 2;
	return Math.max(0, Math.min(slotOffsets.length - 2, Math.floor(slot)));
}

function laneSlopeAtSlot(slot: number, slotOffsets: number[]) {
	const index = slotSegmentIndex(slot, slotOffsets);
	return Math.max(0.0001, Math.abs(slotOffsets[index + 1] - slotOffsets[index]));
}

export function laneToSlotPosition(lane: number, slotOffsetsInput: number[]) {
	const slotOffsets = sortedSlotOffsets(slotOffsetsInput);
	if (!slotOffsets.length) return 0;
	if (slotOffsets.length === 1) return 0;
	if (lane <= slotOffsets[0]) {
		const slope = slotOffsets[1] - slotOffsets[0];
		return (lane - slotOffsets[0]) / Math.max(0.0001, slope);
	}
	for (let i = 0; i < slotOffsets.length - 1; i += 1) {
		const start = slotOffsets[i];
		const end = slotOffsets[i + 1];
		if (lane <= end) {
			const t = (lane - start) / Math.max(0.0001, end - start);
			return i + clamp(t, 0, 1);
		}
	}
	const lastIndex = slotOffsets.length - 1;
	const slope = slotOffsets[lastIndex] - slotOffsets[lastIndex - 1];
	return lastIndex + (lane - slotOffsets[lastIndex]) / Math.max(0.0001, slope);
}

export function slotPositionToLane(slot: number, slotOffsetsInput: number[]) {
	const slotOffsets = sortedSlotOffsets(slotOffsetsInput);
	if (!slotOffsets.length) return 0;
	if (slotOffsets.length === 1) return slotOffsets[0];
	const index = slotSegmentIndex(slot, slotOffsets);
	const localT = clamp(slot - index, 0, 1);
	if (slot <= 0) {
		const slope = slotOffsets[1] - slotOffsets[0];
		return slotOffsets[0] + slope * slot;
	}
	if (slot >= slotOffsets.length - 1) {
		const lastIndex = slotOffsets.length - 1;
		const slope = slotOffsets[lastIndex] - slotOffsets[lastIndex - 1];
		return slotOffsets[lastIndex] + slope * (slot - lastIndex);
	}
	return slotOffsets[index] + (slotOffsets[index + 1] - slotOffsets[index]) * localT;
}

export function computeLaneTravelDurationMs(args: {
	fromLane: number;
	toLane: number;
	slotOffsets: number[];
	stepSpacing: number;
	stepPerMs: number;
	minDurationMs: number;
	maxDurationMs: number;
	durationMultiplier?: number;
}) {
	const fromSlot = laneToSlotPosition(args.fromLane, args.slotOffsets);
	const toSlot = laneToSlotPosition(args.toLane, args.slotOffsets);
	const distanceSlots = Math.abs(toSlot - fromSlot);
	const stepIntervalMs = args.stepSpacing / Math.max(0.0001, args.stepPerMs);
	const rawDurationMs =
		distanceSlots * stepIntervalMs * Math.max(0.01, args.durationMultiplier ?? 1);
	return clamp(rawDurationMs, args.minDurationMs, args.maxDurationMs);
}

export function computeSmoothedLaneState(args: {
	dt: number;
	targetLane: number;
	penguinLane: number;
	laneVelocity: number;
	lockCenterStrict: boolean;
	disablePenguinSlideMotion: boolean;
	laneMotionSpeedScale: number;
	stepPerMs: number;
	stepSpacing: number;
	slotOffsets: number[];
	availableTravelSteps?: number | null;
	penguinMotionStepDtMax: number;
	penguinLaneBaseFollowRate: number;
	penguinLaneDistanceFollowRate: number;
	penguinLaneCenterLockRateMult: number;
	penguinLaneMaxSpeed: number;
	penguinLaneMaxSpeedCenterLock: number;
}) {
	if (args.disablePenguinSlideMotion) {
		return { lane: args.penguinLane, laneVelocity: 0 };
	}
	const prevLane = args.penguinLane;
	const slotOffsets = sortedSlotOffsets(args.slotOffsets);
	const prevSlot = laneToSlotPosition(prevLane, slotOffsets);
	const targetSlot = laneToSlotPosition(args.targetLane, slotOffsets);
	const diffSlots = targetSlot - prevSlot;
	const distanceSlots = Math.abs(diffSlots);
	const laneSlope = laneSlopeAtSlot(prevSlot, slotOffsets);
	let currentVelocity = args.laneVelocity / laneSlope;
	const steeringAwayFromTarget =
		distanceSlots > 0.001 &&
		Math.abs(currentVelocity) > 0.0001 &&
		Math.sign(currentVelocity) !== Math.sign(diffSlots);
	if (steeringAwayFromTarget) {
		currentVelocity *= args.lockCenterStrict ? 0.08 : 0.18;
		if (Math.abs(currentVelocity) < 0.02) currentVelocity = 0;
	}
	const snapThreshold = args.lockCenterStrict ? 0.02 : 0.03;
	if (distanceSlots <= snapThreshold) {
		const easedSlot = prevSlot + diffSlots * 0.55;
		const easedLane = slotPositionToLane(easedSlot, slotOffsets);
		const easedVelocity = currentVelocity * 0.45;
		if (Math.abs(targetSlot - easedSlot) <= 0.004) {
			return { lane: args.targetLane, laneVelocity: 0 };
		}
		return {
			lane: easedLane,
			laneVelocity: (easedLane - prevLane) / Math.max(1 / 240, args.dt)
		};
	}
	const blendDt = Math.max(1 / 240, Math.min(args.penguinMotionStepDtMax, args.dt));
	const stepIntervalSec = args.stepSpacing / Math.max(0.0001, args.stepPerMs * 1000);
	const slotSpeedPerSec = 1 / Math.max(1 / 240, stepIntervalSec);
	const availableSteps = Number.isFinite(Number(args.availableTravelSteps))
		? Math.max(0.12, Number(args.availableTravelSteps))
		: null;
	const availableTravelSec = availableSteps != null ? availableSteps * stepIntervalSec : null;
	const overshootSlots =
		args.lockCenterStrict && distanceSlots > 0.35 ? Math.min(0.075, 0.03 + distanceSlots * 0.02) : 0;
	const overshootTargetSlot =
		distanceSlots > 0.16 ? targetSlot + Math.sign(diffSlots) * overshootSlots : targetSlot;
	const effectiveDiffSlots = overshootTargetSlot - prevSlot;
	const baseDesiredSpeed = slotSpeedPerSec * (args.lockCenterStrict ? 1.42 : 1.2);
	const requiredCatchupSpeed =
		availableTravelSec != null
			? Math.abs(effectiveDiffSlots) / Math.max(1 / 240, availableTravelSec)
			: 0;
	const desiredSpeed = Math.max(
		baseDesiredSpeed,
		Math.min(requiredCatchupSpeed, slotSpeedPerSec * 2.25)
	);
	const desiredVelocity = Math.sign(effectiveDiffSlots) * desiredSpeed;
	const maxAcceleration =
		Math.max(slotSpeedPerSec, desiredSpeed) *
		(args.lockCenterStrict ? 40 : 29) *
		Math.max(1, args.laneMotionSpeedScale * 0.32);
	const maxVelocityStep = maxAcceleration * blendDt;
	let slotVelocity =
		currentVelocity +
		Math.max(-maxVelocityStep, Math.min(maxVelocityStep, desiredVelocity - currentVelocity));
	const maxSpeed = Math.max(
		slotSpeedPerSec * (args.lockCenterStrict ? 1.48 : 1.22),
		desiredSpeed * 1.16
	);
	if (Math.abs(slotVelocity) > maxSpeed) slotVelocity = Math.sign(slotVelocity) * maxSpeed;
	let slot = prevSlot + slotVelocity * blendDt;
	const crossedTarget =
		effectiveDiffSlots !== 0 && Math.sign(overshootTargetSlot - slot) !== Math.sign(effectiveDiffSlots);
	if (crossedTarget) {
		slot = overshootTargetSlot;
		slotVelocity = 0;
	}
	let lane = slotPositionToLane(slot, slotOffsets);
	let laneVelocity = (lane - prevLane) / blendDt;
	if (Math.abs(targetSlot - slot) <= snapThreshold) {
		slot = targetSlot;
		lane = args.targetLane;
		laneVelocity = 0;
	}
	return { lane, laneVelocity };
}
