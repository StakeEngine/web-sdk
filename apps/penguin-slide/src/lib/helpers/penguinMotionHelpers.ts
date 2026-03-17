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

export function computeSmoothedLaneState(args: {
	dt: number;
	targetLane: number;
	penguinLane: number;
	laneVelocity: number;
	lockCenterStrict: boolean;
	disablePenguinSlideMotion: boolean;
	laneMotionSpeedScale: number;
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
	const diff = args.targetLane - prevLane;
	const distance = Math.abs(diff);
	let currentVelocity = args.laneVelocity;
	const steeringAwayFromTarget =
		distance > 0.001 &&
		Math.abs(currentVelocity) > 0.0001 &&
		Math.sign(currentVelocity) !== Math.sign(diff);
	if (steeringAwayFromTarget) {
		currentVelocity *= args.lockCenterStrict ? 0.08 : 0.18;
		if (Math.abs(currentVelocity) < 0.02) currentVelocity = 0;
	}
	const snapThreshold = args.lockCenterStrict ? 0.004 : 0.0075;
	if (distance <= snapThreshold) {
		const easedLane = prevLane + diff * 0.55;
		const easedVelocity = currentVelocity * 0.45;
		if (Math.abs(args.targetLane - easedLane) <= 0.0012) {
			return { lane: args.targetLane, laneVelocity: 0 };
		}
		return { lane: easedLane, laneVelocity: easedVelocity };
	}
	let rate =
		args.penguinLaneBaseFollowRate +
		Math.min(1.45, distance * args.penguinLaneDistanceFollowRate);
	if (args.lockCenterStrict) {
		const centerLockDistanceBoost = 1 + Math.min(0.2, distance * 0.35);
		rate *= args.penguinLaneCenterLockRateMult * centerLockDistanceBoost;
	}
	const motionSpeedScale = Math.max(1, args.laneMotionSpeedScale);
	rate *= 1 + (motionSpeedScale - 1) * 0.22;
	const blendDt = Math.max(1 / 240, Math.min(args.penguinMotionStepDtMax, args.dt));
	const blend = 1 - Math.exp(-rate * blendDt);
	let delta = diff * blend;
	const lockDistanceBoost = args.lockCenterStrict ? Math.min(1.35, 1 + distance * 0.32) : 1;
	const maxSpeedBase = args.lockCenterStrict
		? args.penguinLaneMaxSpeedCenterLock
		: args.penguinLaneMaxSpeed;
	const maxSpeed = maxSpeedBase * lockDistanceBoost * motionSpeedScale;
	const maxDelta = maxSpeed * blendDt;
	if (Math.abs(delta) > maxDelta) delta = Math.sign(delta) * maxDelta;
	const desiredVelocity = delta / Math.max(1 / 240, blendDt);
	const maxAcceleration = maxSpeed * (args.lockCenterStrict ? 18 : 16) * (1 + (motionSpeedScale - 1) * 0.1);
	const maxVelocityStep = maxAcceleration * blendDt;
	let laneVelocity =
		currentVelocity +
		Math.max(-maxVelocityStep, Math.min(maxVelocityStep, desiredVelocity - currentVelocity));
	if (Math.abs(laneVelocity) > maxSpeed) laneVelocity = Math.sign(laneVelocity) * maxSpeed;
	let lane = prevLane + laneVelocity * blendDt;
	const crossedTarget = diff !== 0 && Math.sign(args.targetLane - lane) !== Math.sign(diff);
	if (crossedTarget) {
		lane = args.targetLane;
		laneVelocity = 0;
	}
	if (Math.abs(args.targetLane - lane) <= snapThreshold) {
		lane = args.targetLane;
		laneVelocity = 0;
	}
	return { lane, laneVelocity };
}
