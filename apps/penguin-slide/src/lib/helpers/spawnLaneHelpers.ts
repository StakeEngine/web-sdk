import { laneSide, pickFrom } from './gameHelpers';

type StepLaneEntry = { left?: number; right?: number };
type LaneSideState = { left: number | null; right: number | null };

export type SpawnLaneConfig = {
	LEFT_SPAWN_OFFSETS: readonly number[];
	RIGHT_SPAWN_OFFSETS: readonly number[];
	LEFT_MISS_SPAWN_OFFSETS: readonly number[];
	RIGHT_MISS_SPAWN_OFFSETS: readonly number[];
	SPAWN_OFFSET_JITTER: number;
	MIN_SPAWN_OFFSET: number;
	SLOT_TO_OFFSET: Record<number, number>;
	LEFT_LANE_SLOTS: readonly number[];
	RIGHT_LANE_SLOTS: readonly number[];
};

export type SpawnLaneState = {
	stepLaneSlots: Map<number, StepLaneEntry>;
	lastPathHitSlotBySide: LaneSideState;
};

export function createSpawnLaneHelpers(config: SpawnLaneConfig, state: SpawnLaneState) {
	type SpawnTarget = { slot: number; laneOffset: number; lockLaneOffset: number };

	function outerSlotForSide(side: 'left' | 'right') {
		return side === 'left'
			? config.LEFT_LANE_SLOTS[0]
			: config.RIGHT_LANE_SLOTS[config.RIGHT_LANE_SLOTS.length - 1];
	}

	function applyOuterSlot(stepIndex: number, side: 'left' | 'right') {
		const step = state.stepLaneSlots.get(stepIndex) ?? {};
		const outerSlot = outerSlotForSide(side);
		if (side === 'left') step.left = outerSlot;
		else step.right = outerSlot;
		state.stepLaneSlots.set(stepIndex, step);
		return outerSlot;
	}

	function pickSpawnLane(lane: number, isHit = false) {
		const sideOffsets = isHit
			? lane >= 0
				? config.RIGHT_SPAWN_OFFSETS
				: config.LEFT_SPAWN_OFFSETS
			: lane >= 0
				? config.RIGHT_MISS_SPAWN_OFFSETS
				: config.LEFT_MISS_SPAWN_OFFSETS;
		const jitter = (Math.random() * 2 - 1) * (isHit ? config.SPAWN_OFFSET_JITTER : config.SPAWN_OFFSET_JITTER * 0.5);
		const base = sideOffsets[Math.floor(Math.random() * sideOffsets.length)];
		const raw = base + jitter;
		return lane >= 0
			? Math.max(config.MIN_SPAWN_OFFSET, Math.min(1, raw))
			: Math.min(-config.MIN_SPAWN_OFFSET, Math.max(-1, raw));
	}

	function resolveLaneSlotForStep(
		stepIndex: number,
		side: 'left' | 'right',
		avoidPreviousPathHit = false,
		minSlotGap = 1
	) {
		const slots = side === 'left' ? config.LEFT_LANE_SLOTS : config.RIGHT_LANE_SLOTS;
		const step = state.stepLaneSlots.get(stepIndex) ?? {};
		const oppositeSlot = side === 'left' ? step.right : step.left;
		let candidates = [...slots];

		if (typeof oppositeSlot === 'number') {
			const gapFiltered = candidates.filter((slot) => Math.abs(slot - oppositeSlot) > minSlotGap);
			if (gapFiltered.length) candidates = gapFiltered;
		}

		if (avoidPreviousPathHit) {
			const lastSlot = state.lastPathHitSlotBySide[side];
			if (typeof lastSlot === 'number' && candidates.length > 1 && Math.random() < 0.94) {
				const nonRepeat = candidates.filter((slot) => slot !== lastSlot);
				if (nonRepeat.length) candidates = nonRepeat;
			}
		}

		const chosenSlot = pickFrom(candidates.length ? candidates : slots);
		if (side === 'left') step.left = chosenSlot;
		else step.right = chosenSlot;
		state.stepLaneSlots.set(stepIndex, step);
		if (avoidPreviousPathHit) {
			state.lastPathHitSlotBySide[side] = chosenSlot;
		}
		return chosenSlot;
	}

	function laneOffsetForSlot(slot: number, lane: number, isHit = false) {
		const baseOffset = config.SLOT_TO_OFFSET[slot];
		if (!Number.isFinite(baseOffset)) return pickSpawnLane(lane, isHit);
		const jitter = (Math.random() * 2 - 1) * (isHit ? config.SPAWN_OFFSET_JITTER : config.SPAWN_OFFSET_JITTER * 0.5);
		const raw = baseOffset + jitter;
		return lane >= 0
			? Math.max(config.MIN_SPAWN_OFFSET, Math.min(1, raw))
			: Math.min(-config.MIN_SPAWN_OFFSET, Math.max(-1, raw));
	}

	function pickSpawnLaneForStep(stepIndex: number, lane: number, isHit = false, minSlotGap = 1) {
		const side = laneSide(lane);
		const slot = resolveLaneSlotForStep(stepIndex, side, false, minSlotGap);
		return laneOffsetForSlot(slot, lane, isHit);
	}

	function pickSpawnTargetForStep(
		stepIndex: number,
		lane: number,
		isHit = false,
		minSlotGap = 1,
		forceOuter = false
	): SpawnTarget {
		const side = laneSide(lane);
		if (forceOuter) {
			const slot = applyOuterSlot(stepIndex, side);
			const exactOffset = config.SLOT_TO_OFFSET[slot];
			return {
				slot,
				laneOffset: laneOffsetForSlot(slot, lane, isHit),
				lockLaneOffset:
					Number.isFinite(exactOffset) ? exactOffset : laneOffsetForSlot(slot, lane, false)
			};
		}
		const slot = resolveLaneSlotForStep(stepIndex, side, false, minSlotGap);
		const exactOffset = config.SLOT_TO_OFFSET[slot];
		return {
			slot,
			laneOffset: laneOffsetForSlot(slot, lane, isHit),
			lockLaneOffset: Number.isFinite(exactOffset) ? exactOffset : laneOffsetForSlot(slot, lane, false)
		};
	}

	function pickPathHitSpawnLane(preferredLane: number, stepIndex: number, minSlotGap = 1, forceOuter = false) {
		const side = laneSide(preferredLane);
		if (forceOuter) {
			const outerSlot = applyOuterSlot(stepIndex, side);
			state.lastPathHitSlotBySide[side] = outerSlot;
			return laneOffsetForSlot(outerSlot, preferredLane, true);
		}
		const slot = resolveLaneSlotForStep(stepIndex, side, true, minSlotGap);
		return laneOffsetForSlot(slot, preferredLane, true);
	}

	function pickPathHitSpawnTarget(
		preferredLane: number,
		stepIndex: number,
		minSlotGap = 1,
		forceOuter = false
	): SpawnTarget {
		const side = laneSide(preferredLane);
		if (forceOuter) {
			const outerSlot = applyOuterSlot(stepIndex, side);
			state.lastPathHitSlotBySide[side] = outerSlot;
			const exactOffset = config.SLOT_TO_OFFSET[outerSlot];
			return {
				slot: outerSlot,
				laneOffset: laneOffsetForSlot(outerSlot, preferredLane, true),
				lockLaneOffset:
					Number.isFinite(exactOffset) ? exactOffset : laneOffsetForSlot(outerSlot, preferredLane, false)
			};
		}
		const slot = resolveLaneSlotForStep(stepIndex, side, true, minSlotGap);
		const exactOffset = config.SLOT_TO_OFFSET[slot];
		return {
			slot,
			laneOffset: laneOffsetForSlot(slot, preferredLane, true),
			lockLaneOffset: Number.isFinite(exactOffset) ? exactOffset : laneOffsetForSlot(slot, preferredLane, false)
		};
	}

	return {
		pickSpawnLane,
		resolveLaneSlotForStep,
		laneOffsetForSlot,
		pickSpawnLaneForStep,
		pickSpawnTargetForStep,
		pickPathHitSpawnLane,
		pickPathHitSpawnTarget
	};
}
