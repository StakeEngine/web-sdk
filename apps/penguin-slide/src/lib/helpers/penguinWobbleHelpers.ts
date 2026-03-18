export function laneExtentsForTokens(args: {
	tokens: Array<{ spawnLane?: number; lane: number; extra?: Record<string, unknown> }>;
	penguinLaneRange: number;
	penguinLaneSidePad: number;
	clampPenguinLane: (value: number) => number;
}) {
	if (!args.tokens.length) {
		return { minLane: -args.penguinLaneRange, maxLane: args.penguinLaneRange };
	}
	let minLane = args.penguinLaneRange;
	let maxLane = -args.penguinLaneRange;
	for (const token of args.tokens) {
		const lane = Number(token.spawnLane ?? token.extra?.spawnLane ?? token.lane);
		if (!Number.isFinite(lane)) continue;
		if (lane < minLane) minLane = lane;
		if (lane > maxLane) maxLane = lane;
	}
	minLane = args.clampPenguinLane(minLane);
	maxLane = args.clampPenguinLane(maxLane);
	const paddedMinLane = args.clampPenguinLane(minLane - args.penguinLaneSidePad);
	const paddedMaxLane = args.clampPenguinLane(maxLane + args.penguinLaneSidePad);
	if (paddedMinLane >= paddedMaxLane) {
		return { minLane: -args.penguinLaneRange, maxLane: args.penguinLaneRange };
	}
	return { minLane: paddedMinLane, maxLane: paddedMaxLane };
}

export function nearestPickupSlotIndexForLane(args: {
	lane: number;
	slotToOffset: Record<number, number>;
}) {
	let nearestIndex = 0;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const [slotRaw, offset] of Object.entries(args.slotToOffset)) {
		const slot = Number(slotRaw);
		const distance = Math.abs(args.lane - offset);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = slot;
		}
	}
	return nearestIndex;
}

export function wobbleLaneGateForState(args: {
	penguinLane: number;
	penguinLaneRange: number;
	wobbleRisk: number;
}) {
	const laneNorm = Math.min(1, Math.abs(args.penguinLane) / Math.max(0.01, args.penguinLaneRange));
	const bananaNorm = Math.max(0, Math.min(1.6, args.wobbleRisk)) / 1.6;
	return Math.min(1.18, 0.36 + laneNorm * 0.62 + bananaNorm * 0.14);
}

export function computeWobbleSignal(args: {
	penguinLane: number;
	penguinLaneRange: number;
	wobbleRisk: number;
	wobbleBoost: number;
	wobbleTime: number;
	slipTriggered: boolean;
	status: string;
	wobbleIntensity: number;
	slotToOffset: Record<number, number>;
}) {
	const laneNorm = Math.min(1, Math.abs(args.penguinLane) / Math.max(0.01, args.penguinLaneRange));
	const bananaBoost = Math.max(0, args.wobbleRisk);
	const slipDamp = args.slipTriggered || args.status === 'slip' ? 0.22 : 1;
	const slot = nearestPickupSlotIndexForLane({
		lane: args.penguinLane,
		slotToOffset: args.slotToOffset
	});
	const outerLane = slot === 0 || slot === 1 || slot === 6 || slot === 7;
	const wobbleLaneMultiplier = outerLane ? 3.4 : 1.12;
	const wobbleAmp =
		Math.max(0.1, (1.35 - laneNorm * 0.82 + args.wobbleBoost * 0.34) * (1 + bananaBoost * 0.08)) *
		slipDamp;
	const wobbleSpeed = Math.max(0.78, (0.7 - laneNorm * 0.08 + bananaBoost * 0.02) * 1.9);
	const waveA = Math.sin(args.wobbleTime * wobbleSpeed * Math.PI * 2);
	const waveB = Math.sin(args.wobbleTime * wobbleSpeed * Math.PI + 1.1);
	const wave = waveA * 0.75 + waveB * 0.25;
	const gate = wobbleLaneGateForState({
		penguinLane: args.penguinLane,
		penguinLaneRange: args.penguinLaneRange,
		wobbleRisk: args.wobbleRisk
	});
	return { wave, amp: wobbleAmp * gate * args.wobbleIntensity * wobbleLaneMultiplier };
}

export function computeCtrlRotationValue(args: {
	status: string;
	penguinAnim: string;
	penguinLane: number;
	penguinLaneRange: number;
	ctrlTurnTilt: number;
	wobbleSignal: { wave: number; amp: number };
	penguinSkidRotation: number;
	slipAnimationStarted: boolean;
	slipSlide: number;
	viewportWidth: number;
	slipDirection: 1 | -1;
}) {
	if (args.status === 'goal' || args.penguinAnim === 'win') return 0;
	const laneNorm = Math.min(1, Math.abs(args.penguinLane) / Math.max(0.0001, args.penguinLaneRange));
	const edgeLean = -Math.sign(args.penguinLane) * 8 * Math.pow(laneNorm, 1.18);
	const rot = edgeLean + args.ctrlTurnTilt;
	const wobble = args.wobbleSignal.wave * args.wobbleSignal.amp * 0.72;
	const skid = args.slipAnimationStarted ? args.penguinSkidRotation : args.penguinSkidRotation * 0.35;
	const slipStartProgress = Math.max(
		0,
		Math.min(1, Math.abs(args.slipSlide) / Math.max(1, args.viewportWidth * 0.08))
	);
	const slipStartEase = slipStartProgress * slipStartProgress * (3 - 2 * slipStartProgress);
	const slipLean = args.slipAnimationStarted ? -args.slipDirection * 18 * slipStartEase : 0;
	const total = rot + wobble + skid + slipLean;
	return Math.max(-28, Math.min(28, total));
}
