type Crossing = { slot: number; offset: number; x: number; y: number; lane: number };

export function clampLaneXsHelper(args: {
	depth: number;
	laneExtents: () => { minLane: number; maxLane: number };
	lanePosition: (depth: number, offset: number) => { x: number };
}) {
	const extents = args.laneExtents();
	const left = args.lanePosition(args.depth, extents.minLane).x;
	const right = args.lanePosition(args.depth, extents.maxLane).x;
	return { minX: Math.min(left, right), maxX: Math.max(left, right) };
}

export function depthForYHelper(args: {
	targetY: number;
	sampleYForDepth: (depth: number) => number;
}) {
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 14; i += 1) {
		const mid = (lo + hi) * 0.5;
		const y = args.sampleYForDepth(mid);
		if (y < args.targetY) lo = mid;
		else hi = mid;
	}
	return (lo + hi) * 0.5;
}

export function targetLineIndexForOffsetHelper(args: { offset: number; pickupLineCrossings: Crossing[] }) {
	if (!args.pickupLineCrossings.length) return null;
	let nearest = args.pickupLineCrossings[0];
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const crossing of args.pickupLineCrossings) {
		const distance = Math.abs(crossing.offset - args.offset);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearest = crossing;
		}
	}
	return nearest?.slot ?? null;
}

export function crossingXForLaneOffsetHelper(args: {
	offset: number;
	pickupLineCrossings: Crossing[];
	clampPenguinLane: (offset: number) => number;
}) {
	if (!args.pickupLineCrossings.length) return null;
	const lane = args.clampPenguinLane(args.offset);
	const sorted = args.pickupLineCrossings.slice().sort((a, b) => a.offset - b.offset);
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	if (!first || !last) return null;
	if (lane <= first.offset) return first.x;
	if (lane >= last.offset) return last.x;
	for (let i = 1; i < sorted.length; i += 1) {
		const left = sorted[i - 1];
		const right = sorted[i];
		if (lane > right.offset) continue;
		const span = Math.max(1e-6, right.offset - left.offset);
		const t = Math.max(0, Math.min(1, (lane - left.offset) / span));
		return left.x + (right.x - left.x) * t;
	}
	return last.x;
}

export function buildPickupLineCrossingsHelper(args: {
	viewport: { w: number; h: number };
	slotToOffset: Record<number, number>;
	penguinPose: () => { y: number };
	depthForPickupPathY: (y: number) => number;
	lanePosition: (depth: number, offset: number) => { x: number; width: number };
	laneSpread: (depth: number) => number;
	pickupLanePosition: (depth: number, offset: number) => { x: number; y: number };
	itemSpawnOffset: () => number;
	clampPenguinLane: (lane: number) => number;
}) {
	if (!args.viewport.w || !args.viewport.h) return [];
	const pose = args.penguinPose();
	const depth = args.depthForPickupPathY(pose.y);
	const center = args.lanePosition(depth, 0);
	const spread = args.laneSpread(depth);
	const denom = Math.max(0.0001, center.width * spread);
	return Object.entries(args.slotToOffset)
		.map(([slotRaw, offset]) => {
			const slot = Number(slotRaw);
			const pos = args.pickupLanePosition(depth, Number(offset));
			const x = pos.x;
			const y = pos.y + args.itemSpawnOffset();
			const lane = args.clampPenguinLane((x - center.x) / denom);
			return { slot, offset: Number(offset), x, y, lane };
		})
		.sort((a, b) => a.slot - b.slot);
}

export function pickupPositionHelper(args: {
	stepIndex: number;
	lane: number;
	spawnLane?: number;
	tokenRender: (stepIndex: number) => { depth: number } | null;
	pickupLanePosition: (depth: number, offset: number) => { x: number; y: number };
	itemSpawnOffset: () => number;
}) {
	const pose = args.tokenRender(args.stepIndex);
	if (!pose) return null;
	const effectiveLane = typeof args.spawnLane === 'number' ? args.spawnLane : args.lane;
	const pos = args.pickupLanePosition(pose.depth, effectiveLane);
	return { x: pos.x, y: pos.y + args.itemSpawnOffset() };
}

export function pickupBandStateHelper(args: {
	token: { stepIndex: number; lane: number; extra?: Record<string, unknown> };
	penguin: { y: number; size: number };
	pickupPosition: (stepIndex: number, lane: number, spawnLane?: number) => { x: number; y: number } | null;
	tokenRender: (stepIndex: number) => { depth: number } | null;
}) {
	const lockLane = Number(args.token.extra?.lockLane);
	const spawnLane = Number(args.token.extra?.spawnLane ?? args.token.lane);
	const bandLane = Number.isFinite(lockLane) ? lockLane : spawnLane;
	const pos = args.pickupPosition(args.token.stepIndex, args.token.lane, bandLane);
	if (!pos) return null;
	const pose = args.tokenRender(args.token.stepIndex);
	const depth = pose ? pose.depth : 0.2;
	const yDelta = args.penguin.y - pos.y;
	const activateHalfWindow = Math.max(12, args.penguin.size * 0.09);
	const approachWindow = Math.max(34, args.penguin.size * 0.42);
	const inActivateBand = yDelta <= activateHalfWindow && yDelta >= -activateHalfWindow * 1.8;
	const passedBand = yDelta < -activateHalfWindow * 1.8;
	const approachingBand = yDelta > activateHalfWindow && yDelta <= approachWindow;
	return { pos, depth, spawnLane, yDelta, inActivateBand, passedBand, approachingBand };
}
