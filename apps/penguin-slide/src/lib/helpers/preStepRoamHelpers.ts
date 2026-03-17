export type PreStepRoamState = {
	preStepRoamTargetLane: number;
	preStepFreeRoamActive: boolean;
	preStepSweepStartRenderStep: number;
	preStepSweepStartSide: number;
	preStepSweepCompleted: boolean;
	preStepHandoffActive: boolean;
	preStepHandoffStartRenderStep: number;
	preStepHandoffFromLane: number;
};

export function pickupTriggerAtHelper(args: {
	stepIndex: number;
	type: string;
	spawnDelay: number;
	lookaheadSteps: number;
	stepSpacing: number;
	penguinDepth: number;
	renderSize: { w: number; h: number };
	isMobileLandscape: boolean;
	isPortrait: boolean;
}) {
	const span = args.lookaheadSteps * args.stepSpacing;
	const depth = args.penguinDepth;
	const earlyStepLeadScale =
		args.stepIndex === 0 ? 1.18 : args.stepIndex === 1 ? 1.08 : args.stepIndex === 2 ? 0.93 : 1;
	const leadFactor =
		args.type === 'goal'
			? args.isPortrait
				? 1.42
				: args.isMobileLandscape
					? 1.72
					: 1.54
			: args.isPortrait
				? 1.34
				: args.isMobileLandscape
					? 1.46
					: 1.32;
	const lead = args.stepSpacing * leadFactor * earlyStepLeadScale;
	const activationAdvance = args.type === 'goal' ? args.stepSpacing * 0.04 : args.stepSpacing * 0.11;
	const nonGoalLeadCompensation =
		args.type === 'goal' ? 0 : args.stepSpacing * (args.isPortrait ? 0.16 : args.isMobileLandscape ? 0.2 : 0.18);
	return (
		args.stepIndex * args.stepSpacing -
		span * (1 - depth) -
		lead -
		args.spawnDelay * args.stepSpacing +
		activationAdvance -
		nonGoalLeadCompensation
	);
}

export function shouldUsePreStepFreeRoamHelper(args: {
	state: PreStepRoamState;
	pickupCount: number;
	lockedTargetTokenId: number | null;
	pendingHit: { trigger: number; t?: { stepIndex?: number } } | undefined;
	renderStep: number;
	stepSpacing: number;
	openingFreeRoamSteps?: number;
	preStepLockLeadSteps?: number;
	penguinLane: number;
	clampPenguinLane: (lane: number) => number;
}) {
	let state = { ...args.state };
	const wasFreeRoamActive = state.preStepFreeRoamActive;
	const openingFreeRoamDistance =
		args.stepSpacing *
		(Number.isFinite(args.openingFreeRoamSteps) ? Number(args.openingFreeRoamSteps) : 1.5);
	const startHandoffFromCurrentLane = () => {
		if (wasFreeRoamActive && !state.preStepHandoffActive) {
			state.preStepHandoffActive = true;
			state.preStepHandoffStartRenderStep = args.renderStep;
			state.preStepHandoffFromLane = args.clampPenguinLane(args.penguinLane);
		}
	};
	if (args.pickupCount > 0) {
		startHandoffFromCurrentLane();
		state.preStepFreeRoamActive = false;
		return { state, useFreeRoam: false };
	}
	if (!args.pendingHit) {
		state.preStepFreeRoamActive = true;
		return { state, useFreeRoam: true };
	}
	const pendingStepIndex = Number(args.pendingHit?.t?.stepIndex ?? Number.NaN);
	const sweepDistance = Number.isFinite(args.state.preStepSweepStartRenderStep)
		? Math.max(0, args.renderStep - args.state.preStepSweepStartRenderStep)
		: 0;
	const isOpeningTarget = args.pickupCount === 0 && pendingStepIndex === 0;
	const isSecondStepTarget = pendingStepIndex === 1;
	if (isOpeningTarget) {
		if (sweepDistance < openingFreeRoamDistance) {
			state.preStepFreeRoamActive = true;
			return { state, useFreeRoam: true };
		}
		startHandoffFromCurrentLane();
		state.preStepFreeRoamActive = false;
		return { state, useFreeRoam: false };
	}
	if (args.renderStep >= args.stepSpacing * 0.02) {
		startHandoffFromCurrentLane();
		state.preStepFreeRoamActive = false;
		return { state, useFreeRoam: false };
	}
	const preStepLockLeadStepsBase = Number.isFinite(args.preStepLockLeadSteps)
		? Number(args.preStepLockLeadSteps)
		: 0.08;
	const preStepLockLeadSteps =
		preStepLockLeadStepsBase + (isSecondStepTarget ? 0.22 : pendingStepIndex === 2 ? 0.05 : 0);
	const shouldDelayLockForPendingHit =
		args.renderStep < Number(args.pendingHit.trigger) - args.stepSpacing * preStepLockLeadSteps;
	if (shouldDelayLockForPendingHit) {
		state.preStepFreeRoamActive = true;
		return { state, useFreeRoam: true };
	}
	if (isSecondStepTarget) {
		startHandoffFromCurrentLane();
		state.preStepFreeRoamActive = false;
		return { state, useFreeRoam: false };
	}
	state.preStepFreeRoamActive = !state.preStepSweepCompleted;
	if (!state.preStepFreeRoamActive) startHandoffFromCurrentLane();
	return { state, useFreeRoam: state.preStepFreeRoamActive };
}

export function preStepSweepLaneHelper(args: {
	renderStep: number;
	stepSpacing: number;
	laneExtents: () => { minLane: number; maxLane: number };
	clampPenguinLane: (lane: number) => number;
	preStepSweepInset: number;
	preStepSweepPeriodSteps: number;
}) {
	const extents = args.laneExtents();
	const minLane = args.clampPenguinLane(extents.minLane + args.preStepSweepInset);
	const maxLane = args.clampPenguinLane(extents.maxLane - args.preStepSweepInset);
	if (maxLane <= minLane) return minLane;
	const sweepDistance = Math.max(args.stepSpacing * 0.25, args.stepSpacing * args.preStepSweepPeriodSteps);
	const phaseDistance = ((args.renderStep % sweepDistance) + sweepDistance) % sweepDistance;
	const t = phaseDistance / sweepDistance;
	const tri = t < 0.5 ? t * 2 : (1 - t) * 2;
	return minLane + (maxLane - minLane) * tri;
}

export function preStepFreeRoamTargetLaneHelper(args: {
	state: PreStepRoamState;
	nowMs: number;
	pendingHit: { trigger: number; t?: { stepIndex?: number } } | undefined;
	stepPerMs?: number;
	disablePenguinSlideMotion: boolean;
	laneExtents: () => { minLane: number; maxLane: number };
	clampPenguinLane: (lane: number) => number;
	renderStep: number;
	stepSpacing: number;
	openingFreeRoamSteps?: number;
	preStepSweepInset: number;
	preStepSingleSweepBaseSteps: number;
	preStepSingleSweepMinSteps: number;
	preStepFirstLockLeadSteps: number;
	preStepSweepPeriodSteps: number;
}) {
	let state = { ...args.state };
	const centerLane = args.clampPenguinLane(0);
	const openingFreeRoamDistance =
		args.stepSpacing *
		(Number.isFinite(args.openingFreeRoamSteps) ? Number(args.openingFreeRoamSteps) : 1.5);
	if (args.disablePenguinSlideMotion) {
		return { state, lane: centerLane };
	}
	if (!Number.isFinite(state.preStepSweepStartRenderStep)) {
		state.preStepSweepStartRenderStep = args.renderStep;
		state.preStepSweepCompleted = false;
	}
	let sweepDistance = args.stepSpacing * args.preStepSingleSweepBaseSteps;
	const pendingStepIndex = Number(args.pendingHit?.t?.stepIndex ?? Number.NaN);
	const isOpeningTarget = pendingStepIndex === 0;
	if (args.pendingHit) {
		const remainingDistance = Math.max(0, args.pendingHit.trigger - args.renderStep);
		const lockBudgetDistance = Math.max(
			args.stepSpacing * args.preStepSingleSweepMinSteps,
			remainingDistance - args.stepSpacing * args.preStepFirstLockLeadSteps
		);
		sweepDistance = Math.max(
			args.stepSpacing * args.preStepSingleSweepMinSteps,
			Math.min(args.stepSpacing * args.preStepSingleSweepBaseSteps, lockBudgetDistance)
		);
	}
	if (isOpeningTarget) {
		sweepDistance = Math.max(args.stepSpacing * 0.02, openingFreeRoamDistance);
	}
	const traveledDistance = Math.max(0, args.renderStep - state.preStepSweepStartRenderStep);
	const t = Math.max(0, Math.min(1, traveledDistance / Math.max(args.stepSpacing * 0.02, sweepDistance)));
	if (t >= 1) {
		state.preStepSweepCompleted = true;
		state.preStepRoamTargetLane = centerLane;
		return { state, lane: centerLane };
	}
	state.preStepRoamTargetLane = centerLane;
	return { state, lane: centerLane };
}
