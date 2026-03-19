import type { IceSide } from './iceFlowHelpers';

type SpawnSlot = { side: IceSide; slotIndex: number; x: number };
type SpawnHistory = { lastCycle: number; x: number; slotKey: string };

export function createIceSpawnStateManager(args: {
	jitterFrac: number;
	getViewportWidth: () => number;
	random?: () => number;
}) {
	const { jitterFrac, getViewportWidth } = args;
	const random = args.random ?? Math.random;
	let dynamicSpawnSlots: SpawnSlot[] = [];
	const spawnHistory = new Map<string, SpawnHistory>();
	const cycleSlotUsage = new Map<string, Set<string>>();

	const cycleUsageFor = (side: IceSide, cycle: number) => {
		const key = `${side}:${cycle}`;
		let usage = cycleSlotUsage.get(key);
		if (!usage) {
			usage = new Set<string>();
			cycleSlotUsage.set(key, usage);
		}
		return usage;
	};

	const updateSpawnPositions = (positions: { left: number[]; right: number[] }) => {
		dynamicSpawnSlots = [
			...positions.left.map((x, slotIndex) => ({ side: 'left' as const, slotIndex, x })),
			...positions.right.map((x, slotIndex) => ({ side: 'right' as const, slotIndex, x }))
		];
		spawnHistory.clear();
		cycleSlotUsage.clear();
	};

	const getSpawnX = (pieceId: string, cycle: number, fallback: number, side: IceSide) => {
		let state = spawnHistory.get(pieceId);
		const sideSlots = dynamicSpawnSlots.filter((slot) => slot.side === side);
		if (!state) {
			let nearestSlotKey = `${side}:0`;
			let nearestSlotDist = Number.POSITIVE_INFINITY;
			for (const slot of sideSlots) {
				const dist = Math.abs((slot.x ?? fallback) - fallback);
				if (dist < nearestSlotDist) {
					nearestSlotDist = dist;
					nearestSlotKey = `${slot.side}:${slot.slotIndex}`;
				}
			}
			state = { lastCycle: cycle, x: fallback, slotKey: nearestSlotKey };
			spawnHistory.set(pieceId, state);
			cycleUsageFor(side, cycle).add(nearestSlotKey);
		}
		if (cycle > state.lastCycle) {
			state.lastCycle = cycle;
			if (sideSlots.length) {
				const candidates = sideSlots.map((slot) => ({
					slotKey: `${slot.side}:${slot.slotIndex}`,
					x: slot.x ?? fallback
				}));
				const usage = cycleUsageFor(side, cycle);
				let available = candidates.filter((candidate) => !usage.has(candidate.slotKey));
				if (!available.length) available = candidates;
				let chosen = available[Math.floor(random() * available.length)] ?? available[0] ?? candidates[0];
				if (available.length > 1 && chosen?.slotKey === state.slotKey) {
					const reroll = available.filter((candidate) => candidate.slotKey !== state.slotKey);
					chosen = reroll[Math.floor(random() * reroll.length)] ?? chosen;
				}
				const slotX = chosen?.x ?? fallback;
				state.slotKey = chosen?.slotKey ?? `${side}:0`;
				usage.add(state.slotKey);
				const jitter = (random() * 2 - 1) * getViewportWidth() * jitterFrac;
				state.x = slotX + jitter;
			} else {
				state.x = fallback;
			}
		}
		return state.x;
	};

	const reset = () => {
		spawnHistory.clear();
		cycleSlotUsage.clear();
	};

	return {
		updateSpawnPositions,
		getSpawnX,
		reset
	};
}
