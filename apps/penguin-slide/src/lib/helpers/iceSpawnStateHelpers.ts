import type { IceSide } from './iceFlowHelpers';

type SpawnSlot = { side: IceSide; slotIndex: number; x: number };
type SpawnHistory = { lastCycle: number; x: number; slotKey: string };

export function createIceSpawnStateManager(args: {
	jitterFrac: number;
	getViewportWidth: () => number;
}) {
	const { jitterFrac, getViewportWidth } = args;
	let dynamicSpawnSlots: SpawnSlot[] = [];
	const spawnHistory = new Map<string, SpawnHistory>();

	const updateSpawnPositions = (positions: { left: number[]; right: number[] }) => {
		dynamicSpawnSlots = [
			...positions.left.map((x, slotIndex) => ({ side: 'left' as const, slotIndex, x })),
			...positions.right.map((x, slotIndex) => ({ side: 'right' as const, slotIndex, x }))
		];
		spawnHistory.clear();
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
		}
		if (cycle > state.lastCycle) {
			state.lastCycle = cycle;
			if (sideSlots.length) {
				const candidates = sideSlots.map((slot) => ({
					slotKey: `${slot.side}:${slot.slotIndex}`,
					x: slot.x ?? fallback
				}));
				let chosen = candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];
				if (candidates.length > 1 && chosen?.slotKey === state.slotKey) {
					const reroll = candidates.filter((candidate) => candidate.slotKey !== state.slotKey);
					chosen = reroll[Math.floor(Math.random() * reroll.length)] ?? chosen;
				}
				const slotX = chosen?.x ?? fallback;
				state.slotKey = chosen?.slotKey ?? `${side}:0`;
				const jitter = (Math.random() * 2 - 1) * getViewportWidth() * jitterFrac;
				state.x = slotX + jitter;
			} else {
				state.x = fallback;
			}
		}
		return state.x;
	};

	const reset = () => {
		spawnHistory.clear();
	};

	return {
		updateSpawnPositions,
		getSpawnX,
		reset
	};
}
