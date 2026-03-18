type AddTokenFn = (
	stepIndex: number,
	type: string,
	value: number,
	lane: number,
	hit: boolean,
	extra?: Record<string, unknown>
) => void;

type BuildPadStepTokensArgs = {
	entry: Record<string, unknown>;
	stepIndex: number;
	landedLane: number;
	landedKey: string;
	applies: boolean;
	stepTargetLane: number | null;
	stepSkipTargeting: boolean;
	timelineValue: number;
	laneMap: Record<string, number>;
	spawnDelayStep: number;
	stakeAmount: () => number;
	isNothingItemValue: (value: string) => boolean;
	parseOutcome: (item: string, padType?: string, sinking?: boolean) => {
		type: string;
		extra?: Record<string, unknown>;
	};
	pickPathHitSpawnTarget: (
		lane: number,
		stepIndex: number,
		minSlotGap?: number,
		forceOuterSinking?: boolean
	) => { slot: number; laneOffset: number; lockLaneOffset: number };
	pickSpawnTargetForStep: (
		stepIndex: number,
		lane: number,
		isHit?: boolean,
		minSlotGap?: number,
		forceOuterSinking?: boolean
	) => { slot: number; laneOffset: number; lockLaneOffset: number };
	addToken: AddTokenFn;
};

export function buildPadStepTokens({
	entry,
	stepIndex,
	landedLane,
	landedKey,
	applies,
	stepTargetLane,
	stepSkipTargeting,
	timelineValue,
	laneMap,
	spawnDelayStep,
	stakeAmount,
	isNothingItemValue,
	parseOutcome,
	pickPathHitSpawnTarget,
	pickSpawnTargetForStep,
	addToken
}: BuildPadStepTokensArgs) {
	const pads = (entry.steps || entry.pads || {}) as Record<string, unknown>;
	const padEntries = Object.entries(pads)
		.map(([padKey, pad]) => {
			const padData = pad && typeof pad === 'object' ? (pad as Record<string, unknown>) : {};
			const item = String(padData.item ?? padData.outcome ?? '').trim().toUpperCase();
			return { padKey, pad: padData, item };
		})
		.filter(({ item }) => item !== '');
	const leftItem = padEntries.find((pad) => String(pad.padKey).toUpperCase() === 'LEFT')?.item ?? '';
	const rightItem = padEntries.find((pad) => String(pad.padKey).toUpperCase() === 'RIGHT')?.item ?? '';
	const strictDualItemGap = !isNothingItemValue(leftItem) && !isNothingItemValue(rightItem);
	const minSlotGap = strictDualItemGap ? 2 : 1;
	const hasGoalPad = padEntries.some(({ item }) => item === 'GOAL');
	let padSpawnIndex = 0;

	for (const { padKey, pad: padData } of padEntries) {
		const lane = laneMap[String(padKey).toUpperCase()] ?? -1;
		const item = String(padData.item ?? padData.outcome ?? '');
		const padType =
			typeof padData.stepType === 'string'
				? padData.stepType
				: typeof padData.padType === 'string'
					? padData.padType
					: undefined;
		const normalized = item.trim().toUpperCase();
		const { type, extra } = parseOutcome(item, padType, padData.sinking === true);
		const itemNumber = normalized.startsWith('+')
			? Number(normalized.slice(1))
			: normalized.startsWith('X')
				? Number(normalized.slice(1))
				: null;
		const valueOverride =
			type === 'coin' && typeof itemNumber === 'number' && !Number.isNaN(itemNumber)
				? stakeAmount() * itemNumber
				: undefined;
		const isHit = applies && lane === landedLane;
		const forceOuterSinking = padData.sinking === true || extra?.fall === true;
		const placement = isHit
			? pickPathHitSpawnTarget(lane, stepIndex, minSlotGap, forceOuterSinking)
			: pickSpawnTargetForStep(stepIndex, lane, false, minSlotGap, forceOuterSinking);
		const exactOuterBridgeSpawn =
			entry.bridgeStep === true && isHit && forceOuterSinking;
		const spawnLaneOffset = exactOuterBridgeSpawn
			? placement.lockLaneOffset
			: placement.laneOffset;
		const targetSlot = placement.slot;
		const spawnDelay = padSpawnIndex * spawnDelayStep;
		padSpawnIndex += 1;
		addToken(stepIndex, type, timelineValue, lane, isHit, {
			...padData,
			...(extra || {}),
			...(valueOverride != null ? { coinValue: valueOverride } : null),
			padKey,
			bridgeStep: entry.bridgeStep === true,
			proxySlip: entry.proxySlip === true,
			landedPad: landedKey,
			applies,
			targetLane: stepTargetLane,
			skipTargeting: stepSkipTargeting,
			lifeVests: entry.lifeVests,
			winAmount: entry.winAmount,
			accumulatedWinAmount: entry.accumulatedWinAmount,
			targetSlot,
			lockLane: placement.lockLaneOffset,
			spawnLane: spawnLaneOffset,
			spawnDelay
		});
	}

	return { hasGoalPad };
}

type BuildTileResultTokensArgs = {
	event: Record<string, unknown>;
	hitType: string;
	laneSide: number;
	stepIndex: number;
	spawnDelayStep: number;
	isNothingItemValue: (value: string) => boolean;
	nearestLane: (value: number) => number;
	pickPathHitSpawnTarget: (
		lane: number,
		stepIndex: number,
		minSlotGap?: number,
		forceOuterSinking?: boolean
	) => { slot: number; laneOffset: number; lockLaneOffset: number };
	pickSpawnTargetForStep: (
		stepIndex: number,
		lane: number,
		isHit?: boolean,
		minSlotGap?: number,
		forceOuterSinking?: boolean
	) => { slot: number; laneOffset: number; lockLaneOffset: number };
	addToken: AddTokenFn;
};

export function buildTileResultTokens({
	event,
	hitType,
	laneSide,
	stepIndex,
	spawnDelayStep,
	isNothingItemValue,
	nearestLane,
	pickPathHitSpawnTarget,
	pickSpawnTargetForStep,
	addToken
}: BuildTileResultTokensArgs) {
	const baseItems = Array.isArray(event.items)
		? [...event.items]
		: [{ type: event.tileType ?? 'empty', lane: laneSide, value: event.value }];
	const leftBaseItem = baseItems.find((item) => Number(item?.lane) < 0);
	const rightBaseItem = baseItems.find((item) => Number(item?.lane) >= 0);
	const leftBaseType = String(leftBaseItem?.type ?? '').trim().toUpperCase();
	const rightBaseType = String(rightBaseItem?.type ?? '').trim().toUpperCase();
	const strictDualItemGap = !isNothingItemValue(leftBaseType) && !isNothingItemValue(rightBaseType);
	const minSlotGap = strictDualItemGap ? 2 : 1;
	let itemSpawnIndex = 0;

	for (const item of baseItems) {
		const itemLane = typeof item.lane === 'number' ? nearestLane(item.lane) : laneSide;
		const isHit = Number(itemLane ?? laneSide) === laneSide && String(item.type) === hitType;
		const forceOuterSinking =
			(item as Record<string, unknown> | null)?.sinking === true ||
			event.sinking === true ||
			(item as Record<string, unknown> | null)?.fall === true ||
			event.fall === true;
		const placement = isHit
			? pickPathHitSpawnTarget(Number(itemLane ?? laneSide), stepIndex, minSlotGap, forceOuterSinking)
			: pickSpawnTargetForStep(
					stepIndex,
					Number(itemLane ?? laneSide),
					false,
					minSlotGap,
					forceOuterSinking
				);
		const spawnDelay = itemSpawnIndex * spawnDelayStep;
		itemSpawnIndex += 1;
		const tokenExtra = {
			...(isHit ? { ...item, ...event } : item),
			targetSlot: placement.slot,
			lockLane: placement.lockLaneOffset,
			spawnLane: placement.laneOffset,
			spawnDelay
		};
		addToken(
			stepIndex,
			String(item.type),
			(Number(event.value ?? 0) || 0) / 100,
			Number(itemLane ?? laneSide),
			isHit,
			tokenExtra
		);
	}
}
