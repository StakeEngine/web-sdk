type Size = { w: number; h: number };

export type IceSide = 'left' | 'right';

export type IcePiece = {
	baseX: number;
	baseY: number;
	spawnTravelOffset?: number;
	slotIndex?: number;
	oneShot?: boolean;
	continuousFlow?: boolean;
	flowStartOffset?: number;
	flowDelayDistance?: number;
	scale: number;
	key: string;
	animName: string;
	yAmp: number;
	rAmp: number;
	swayRate: number;
	swayPhase: number;
	seed: number;
	id: string;
	spawnIndex: number;
	side: IceSide;
	sideGuard: boolean;
};

export function getIceSpawnXs(
	viewport: Size,
	renderSize: Size,
	iceSpawnLeftCount: number,
	iceSpawnRightCount: number
) {
	if (!viewport.w) return { left: [], right: [] };
	const isPortrait = renderSize.h > renderSize.w;
	const leftStart = viewport.w * (isPortrait ? 0.31 : 0.08);
	const leftEnd = viewport.w * (isPortrait ? 0.44 : 0.38);
	const rightStart = viewport.w * (isPortrait ? 0.55 : 0.62);
	const rightEnd = viewport.w * (isPortrait ? 0.68 : 0.92);
	const leftStep = (leftEnd - leftStart) / Math.max(1, iceSpawnLeftCount - 1);
	const rightStep = (rightEnd - rightStart) / Math.max(1, iceSpawnRightCount - 1);
	const left = Array.from({ length: iceSpawnLeftCount }, (_, i) => leftStart + leftStep * i);
	const right = Array.from({ length: iceSpawnRightCount }, (_, i) => rightStart + rightStep * i);
	return { left, right };
}

export function buildIcePieces(args: {
	viewport: Size;
	renderSize: Size;
	topY: number;
	bottomY: number;
	hasStartedFirstRound: boolean;
	continuousFlowActive?: boolean;
	scrollOffset?: number;
	animationStatus: 'idle' | 'running' | 'done';
	icePiecesPerSide: number;
	iceVisibleStart: number;
	iceSpawnYDownFrac: number;
	iceSpawnLeftCount: number;
	iceSpawnRightCount: number;
	innerWidth: number;
	random?: () => number;
}): IcePiece[] {
	const {
		viewport,
		renderSize,
		topY,
		bottomY,
		icePiecesPerSide,
		iceSpawnYDownFrac,
		iceSpawnLeftCount,
		iceSpawnRightCount,
		innerWidth
	} = args;
	const random = args.random ?? Math.random;
	const pieces: IcePiece[] = [];
	const isPortrait = renderSize.h > renderSize.w;
	const portraitSpawnOffset = isPortrait ? 0.04 : 0;
	const spawnY = topY + viewport.h * (0.25 + iceSpawnYDownFrac + portraitSpawnOffset);
	const spanY = Math.max(1, bottomY - spawnY);
	const keys = ['ice_1', 'ice_2', 'ice_3', 'ice_4', 'ice_5', 'ice_6', 'ice_7', 'ice_8'];
	const iceAnim = 'activate';
	const scale = innerWidth < 600 ? 0.72 : 0.88;
	const countPerSide = Number(icePiecesPerSide);
	const spawnSlots = getIceSpawnXs(viewport, renderSize, iceSpawnLeftCount, iceSpawnRightCount);
	const fixedInitialLayout: Array<{ side: 'left' | 'right'; slot: number; band: number; key: string }> = [
		{ side: 'left', slot: 1, band: 0.04, key: 'ice_3' },
		{ side: 'right', slot: 1, band: 0.08, key: 'ice_7' },
		{ side: 'left', slot: 0, band: 0.1, key: 'ice_1' },
		{ side: 'right', slot: 2, band: 0.2, key: 'ice_5' },
		{ side: 'left', slot: 2, band: 0.44, key: 'ice_4' },
		{ side: 'right', slot: 0, band: 0.44, key: 'ice_2' },
		{ side: 'left', slot: 3, band: 0.17, key: 'ice_6' },
		{ side: 'right', slot: 3, band: 0.07, key: 'ice_8' }
	];
	const total = Math.max(1, countPerSide * 2);
	let leftCount = 0;
	let rightCount = 0;
	for (let i = 0; i < total; i++) {
		const layout = fixedInitialLayout[i % fixedInitialLayout.length];
		const slots = layout.side === 'left' ? spawnSlots.left : spawnSlots.right;
		const slotIndex = Math.max(0, Math.min(slots.length - 1, layout.slot));
		const spawnX =
			slots[slotIndex] ?? (layout.side === 'left' ? viewport.w * 0.2 : viewport.w * 0.8);
		const y = spawnY + spanY * layout.band;
		const yAmp = viewport.h * 0.0018;
		const rAmp = 0.004;
		const sideIndex = layout.side === 'left' ? leftCount++ : rightCount++;
		pieces.push({
			baseX: spawnX,
			baseY: y,
			slotIndex,
			oneShot: true,
			scale,
			key: layout.key,
			animName: iceAnim,
			yAmp,
			rAmp,
			swayRate: 0.9 + random() * 0.24,
			swayPhase: random() * Math.PI * 2,
			seed: 100 + i * 17,
			id: `${layout.key}-fixed-${i}`,
			spawnIndex: sideIndex,
			side: layout.side,
			sideGuard: sideIndex === 0
		});
	}
	return pieces;
}
