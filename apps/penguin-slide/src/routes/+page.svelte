<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	// @ts-ignore - types provided at runtime by workspace deps
	import { createApp, setContextApp, App, Text, Container, Graphics, SpineProvider, SpineTrack, SpineBone } from 'pixi-svelte';
	import PickupLayer from '../lib/components/pickups/PickupLayer.svelte';
	import PenguinSpineEvents from '../lib/components/PenguinSpineEvents.svelte';
	import PenguinSpineSkin from '../lib/components/PenguinSpineSkin.svelte';
	import PenguinVestSlots from '../lib/components/PenguinVestSlots.svelte';
	const assetPath = (path: string) => {
		const normalized = path.startsWith('/') ? path.slice(1) : path;
		return `./${normalized}`;
	};
	const GIGALYPSE_FONT_PATH = '/fonts/gigalypsetrial-regular.otf';

	const gigalypseFontUrl = encodeURI(assetPath(GIGALYPSE_FONT_PATH));
	const gigalypseFontCss = `
@font-face {
	font-family: 'Gigalypse';
	src: url('${gigalypseFontUrl}') format('opentype');
	font-weight: 400;
	font-style: normal;
	font-display: swap;
}
`;
const SPAWN_DELAY_STEP = 0.1;
const NORMAL_PICKUP_DESTROY_DELAY_MS = 280;
const GOAL_PICKUP_DESTROY_DELAY_MS = 320;
const LIFERING_PICKUP_DESTROY_DELAY_MS = 220;
const LEFT_SPAWN_OFFSETS = [-0.76, -0.52, -0.3];
const RIGHT_SPAWN_OFFSETS = [0.3, 0.52, 0.76];
const LEFT_MISS_SPAWN_OFFSETS = [-1, -0.9, -0.78];
const RIGHT_MISS_SPAWN_OFFSETS = [0.78, 0.9, 1];
const LEFT_LANE_SLOTS = [0, 1, 2, 3] as const;
const RIGHT_LANE_SLOTS = [4, 5, 6, 7] as const;
const SLOT_TO_OFFSET: Record<number, number> = {
	0: -0.86,
	1: -0.66,
	2: -0.44,
	3: -0.24,
	4: 0.24,
	5: 0.44,
	6: 0.66,
	7: 0.86
};
const SPAWN_OFFSET_JITTER = 0.05;
const MIN_SPAWN_OFFSET = 0.24;
const PICKUP_SCALE_BOOST = 4.1;
const LANE_MAP: Record<string, number> = { LEFT: -1, RIGHT: 1 };
const OUTER_LANE_OFFSET = Math.max(
	1,
	...LEFT_SPAWN_OFFSETS.map((offset) => Math.abs(offset)),
	...RIGHT_SPAWN_OFFSETS.map((offset) => Math.abs(offset))
);
const PENGUIN_LANE_RANGE = OUTER_LANE_OFFSET + 0.24;
const PENGUIN_LANE_SIDE_PAD = 0.2;
const WOBBLE_INTENSITY = 5;
const PICKUP_LOOKAHEAD_EXTRA_STEPS = 0.025;
const PICKUP_TRAVEL_SPEED = 3.6;
const PICKUP_TOP_ENTRY_BUFFER_STEPS = 0.08;
const PICKUP_STEP_PACE_MULTIPLIER = 2.4;
const PICKUP_Y_SPACING_EXPONENT = 2.3;
const PREVIOUS_STEP_SLIP_EXTRA_LEAD_STEPS = 0.46;
const FIRST_STEP_SINKING_EXTRA_LEAD_STEPS = 0.22;
const SLIP_TRIGGER_DELAY_STEPS = 0.5;
const GOAL_CENTER_LOCK_EARLY_LEAD_STEPS = 0.34;
const PENGUIN_LANE_BASE_FOLLOW_RATE = 2.4;
const PENGUIN_LANE_DISTANCE_FOLLOW_RATE = 4.2;
const PENGUIN_LANE_CENTER_LOCK_RATE_MULT = 1.6;
const PENGUIN_LANE_MAX_SPEED = 5.8;
const PENGUIN_LANE_MAX_SPEED_CENTER_LOCK = 8.2;
const PENGUIN_MOTION_STEP_DT_MAX = 1 / 45;
const TARGET_LOCK_HYSTERESIS_MS = 130;
const PICKUP_CENTER_LOCK_LEAD_MS = 100;
const PICKUP_CENTER_LOCK_BUFFER_MS = 80;
const SLIP_ANIMATION_SPEED_MULT = 0.8;
const SLIP_ANIMATION_DURATION_MULT = 1 / SLIP_ANIMATION_SPEED_MULT;
const SLIP_PRE_DRIFT_DURATION_MULT = 0.8;
const DISABLE_PENGUIN_SLIDE_MOTION = false;
const ENABLE_POST_DESTROY_TELEPORT = false;
const DEBUG_GAME_SPEED_MULT = 1;
const PRE_STEP_SWEEP_PERIOD_MS = 3600;
const PRE_STEP_SWEEP_INSET = 0.24;
const PRE_STEP_SINGLE_SWEEP_MIN_MS = 700;
const PRE_STEP_SINGLE_SWEEP_BASE_MS = 1500;
const PRE_STEP_FIRST_LOCK_LEAD_MS = 620;
const PRE_STEP_HANDOFF_DURATION_MS = 180;

	function clampPenguinLane(value: number) {
		return Math.max(-PENGUIN_LANE_RANGE, Math.min(PENGUIN_LANE_RANGE, value));
	}

	function readAssetDimension(asset: unknown, key: 'width' | 'height', fallback = 0) {
		if (!asset || typeof asset !== 'object') return fallback;
		const value = (asset as Record<'width' | 'height', unknown>)[key];
		return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
	}

function pickSpawnLane(lane: number, isHit = false) {
	const sideOffsets = isHit
		? lane >= 0
			? RIGHT_SPAWN_OFFSETS
			: LEFT_SPAWN_OFFSETS
		: lane >= 0
			? RIGHT_MISS_SPAWN_OFFSETS
			: LEFT_MISS_SPAWN_OFFSETS;
	const jitter = (Math.random() * 2 - 1) * (isHit ? SPAWN_OFFSET_JITTER : SPAWN_OFFSET_JITTER * 0.5);
	const base = sideOffsets[Math.floor(Math.random() * sideOffsets.length)];
	const raw = base + jitter;
	return lane >= 0
		? Math.max(MIN_SPAWN_OFFSET, Math.min(1, raw))
		: Math.min(-MIN_SPAWN_OFFSET, Math.max(-1, raw));
}

const stepLaneSlots = new Map<number, { left?: number; right?: number }>();
let lastPathHitSlotBySide: { left: number | null; right: number | null } = { left: null, right: null };

function laneSide(lane: number): 'left' | 'right' {
	return lane >= 0 ? 'right' : 'left';
}

function pickFrom<T>(items: readonly T[]): T {
	return items[Math.floor(Math.random() * items.length)] as T;
}

function resolveLaneSlotForStep(
	stepIndex: number,
	side: 'left' | 'right',
	avoidPreviousPathHit = false,
	minSlotGap = 1
) {
	const slots = side === 'left' ? LEFT_LANE_SLOTS : RIGHT_LANE_SLOTS;
	const step = stepLaneSlots.get(stepIndex) ?? {};
	const oppositeSlot = side === 'left' ? step.right : step.left;
	let candidates = [...slots];

	// Enforce minimum slot gap from the opposite pad on the same step.
	if (typeof oppositeSlot === 'number') {
		const gapFiltered = candidates.filter((slot) => Math.abs(slot - oppositeSlot) > minSlotGap);
		if (gapFiltered.length) candidates = gapFiltered;
	}

	// For predetermined-path non-random picking: keep side, but avoid same exact slot as previous path hit.
	if (avoidPreviousPathHit) {
		const lastSlot = lastPathHitSlotBySide[side];
		if (typeof lastSlot === 'number' && candidates.length > 1 && Math.random() < 0.94) {
			const nonRepeat = candidates.filter((slot) => slot !== lastSlot);
			if (nonRepeat.length) candidates = nonRepeat;
		}
	}

	const chosenSlot = pickFrom(candidates.length ? candidates : slots);
	if (side === 'left') step.left = chosenSlot;
	else step.right = chosenSlot;
	stepLaneSlots.set(stepIndex, step);
	if (avoidPreviousPathHit) {
		lastPathHitSlotBySide[side] = chosenSlot;
	}
	return chosenSlot;
}

function laneOffsetForSlot(slot: number, lane: number, isHit = false) {
	const baseOffset = SLOT_TO_OFFSET[slot];
	if (!Number.isFinite(baseOffset)) return pickSpawnLane(lane, isHit);
	const jitter = (Math.random() * 2 - 1) * (isHit ? SPAWN_OFFSET_JITTER : SPAWN_OFFSET_JITTER * 0.5);
	const raw = baseOffset + jitter;
	return lane >= 0
		? Math.max(MIN_SPAWN_OFFSET, Math.min(1, raw))
		: Math.min(-MIN_SPAWN_OFFSET, Math.max(-1, raw));
}

function pickSpawnLaneForStep(stepIndex: number, lane: number, isHit = false, minSlotGap = 1) {
	const side = laneSide(lane);
	const slot = resolveLaneSlotForStep(stepIndex, side, false, minSlotGap);
	return laneOffsetForSlot(slot, lane, isHit);
}

function pickPathHitSpawnLane(preferredLane: number, stepIndex: number, minSlotGap = 1, forceOuter = false) {
	const side = laneSide(preferredLane);
	if (forceOuter) {
		const step = stepLaneSlots.get(stepIndex) ?? {};
		const outerSlot =
			side === 'left'
				? LEFT_LANE_SLOTS[0]
				: RIGHT_LANE_SLOTS[RIGHT_LANE_SLOTS.length - 1];
		if (side === 'left') step.left = outerSlot;
		else step.right = outerSlot;
		stepLaneSlots.set(stepIndex, step);
		lastPathHitSlotBySide[side] = outerSlot;
		return laneOffsetForSlot(outerSlot, preferredLane, true);
	}
	const slot = resolveLaneSlotForStep(stepIndex, side, true, minSlotGap);
	return laneOffsetForSlot(slot, preferredLane, true);
}

function laneItemValue(pad: any) {
	return String(pad?.item ?? pad?.outcome ?? '').trim().toUpperCase();
}

function isNothingItemValue(value: string) {
	const normalized = String(value ?? '').trim().toUpperCase();
	return (
		normalized === '' ||
		normalized === 'NOTHING' ||
		normalized === 'NONE' ||
		normalized === 'NULL' ||
		normalized === 'UNDEFINED' ||
		normalized === 'EMPTY'
	);
}

function laneStepTypeValue(pad: any) {
	return String(pad?.stepType ?? pad?.padType ?? '').trim().toUpperCase();
}

function makeNothingPad(pad: any) {
	return {
		...(pad ?? {}),
		item: 'NOTHING',
		outcome: 'NOTHING'
	};
}

function withStepPads(entry: any, stepPads: Record<string, any>) {
	const hadSteps = entry?.steps != null;
	const hadPads = entry?.pads != null;
	return {
		...entry,
		steps: hadSteps ? stepPads : undefined,
		pads: hadPads ? stepPads : undefined
	};
}

function splitDualPadStep(entry: any) {
	if (!entry || entry.type) return [entry];
	const pads = entry.steps || entry.pads || {};
	const leftPad = pads?.LEFT;
	const rightPad = pads?.RIGHT;
	if (!leftPad || !rightPad) {
		return [entry];
	}
	if (laneStepTypeValue(leftPad) !== 'ICE' || laneStepTypeValue(rightPad) !== 'ICE') {
		return [entry];
	}
	const leftItem = laneItemValue(leftPad);
	const rightItem = laneItemValue(rightPad);
	if (!leftItem || !rightItem || leftItem === 'NOTHING' || rightItem === 'NOTHING') {
		return [entry];
	}
	const sourceLanded = String(entry?.landedStep ?? entry?.landedPad ?? '').trim().toUpperCase();
	if (sourceLanded !== 'LEFT' && sourceLanded !== 'RIGHT') {
		return [entry];
	}
	const hasFinish = Boolean(entry?.finish);
	const itemStepPads =
		sourceLanded === 'LEFT'
			? {
				LEFT: leftPad,
				RIGHT: makeNothingPad(rightPad)
			}
			: {
				LEFT: makeNothingPad(leftPad),
				RIGHT: rightPad
			};
	const missStepPads =
		sourceLanded === 'LEFT'
			? {
				LEFT: makeNothingPad(leftPad),
				RIGHT: rightPad
			}
			: {
				LEFT: leftPad,
				RIGHT: makeNothingPad(rightPad)
			};
	const itemStep = {
		...withStepPads(entry, itemStepPads),
		landedStep: sourceLanded,
		landedPad: sourceLanded,
		finish: hasFinish
	};
	const missStep = {
		...withStepPads(entry, missStepPads),
		landedStep: sourceLanded,
		landedPad: sourceLanded,
		finish: false
	};

	return Math.random() < 0.5 ? [itemStep, missStep] : [missStep, itemStep];
}

function normalizeRoundEvents(events: any[]) {
	if (!Array.isArray(events)) return [];
	const normalized: any[] = [];
	const oldToNewStepIndex = new Map<number, number>();
	let nextStepIndex = 0;

	for (const event of events) {
		const hasStepPads = Boolean(event?.steps || event?.pads);
		if (!hasStepPads) {
			if (event?.type === 'vestPopped') {
				const raw = Number(event?.index ?? event?.stepIndex);
				if (Number.isFinite(raw) && oldToNewStepIndex.has(raw)) {
					const mapped = oldToNewStepIndex.get(raw) as number;
					normalized.push({ ...event, index: mapped, stepIndex: mapped });
					continue;
				}
				if (nextStepIndex > 0) {
					const fallback = nextStepIndex - 1;
					normalized.push({ ...event, index: fallback, stepIndex: fallback });
					continue;
				}
			}
			normalized.push(event);
			continue;
		}

		// Step splitting transformation disabled by request.
		// const splitSteps = splitDualPadStep(event);
		const splitSteps = [event];
		const rawIndex = Number(event?.index ?? event?.stepIndex);
		if (Number.isFinite(rawIndex) && !oldToNewStepIndex.has(rawIndex)) {
			oldToNewStepIndex.set(rawIndex, nextStepIndex);
		}

		for (const stepEvent of splitSteps) {
			const assignedIndex = nextStepIndex;
			nextStepIndex += 1;
			normalized.push({
				...stepEvent,
				index: assignedIndex,
				stepIndex: assignedIndex
			});
		}
	}

	return normalized;
}

const accumulatedStrokeWidth = 12;

const bitmapDigits = ['0','1','2','3','4','5','6','7','8','9'];
const bitmapAssets: Record<string, { type: 'sprite'; src: string; preload: true }> = {};
for (const d of bitmapDigits) {
	bitmapAssets[`bitmap_coins_gold_${d}`] = { type: 'sprite', src: assetPath(`/assets/bitmap/coins/gold/${d}.png`), preload: true };
	bitmapAssets[`bitmap_coins_silver_${d}`] = { type: 'sprite', src: assetPath(`/assets/bitmap/coins/silver/${d}.png`), preload: true };
	bitmapAssets[`bitmap_coins_bronze_${d}`] = { type: 'sprite', src: assetPath(`/assets/bitmap/coins/bronze/${d}.png`), preload: true };
	bitmapAssets[`bitmap_mult_${d}`] = { type: 'sprite', src: assetPath(`/assets/bitmap/multiplier/${d}.png`), preload: true };
}
bitmapAssets.bitmap_coins_gold_dot = { type: 'sprite', src: assetPath('/assets/bitmap/coins/gold/dot.png'), preload: true };
bitmapAssets.bitmap_coins_gold_comma = { type: 'sprite', src: assetPath('/assets/bitmap/coins/gold/comma.png'), preload: true };
bitmapAssets.bitmap_coins_gold_x = { type: 'sprite', src: assetPath('/assets/bitmap/coins/gold/x.png'), preload: true };
bitmapAssets.bitmap_coins_silver_dot = { type: 'sprite', src: assetPath('/assets/bitmap/coins/silver/dot.png'), preload: true };
bitmapAssets.bitmap_coins_silver_comma = { type: 'sprite', src: assetPath('/assets/bitmap/coins/silver/comma.png'), preload: true };
bitmapAssets.bitmap_coins_silver_x = { type: 'sprite', src: assetPath('/assets/bitmap/coins/silver/x.png'), preload: true };
bitmapAssets.bitmap_coins_bronze_dot = { type: 'sprite', src: assetPath('/assets/bitmap/coins/bronze/dot.png'), preload: true };
bitmapAssets.bitmap_coins_bronze_comma = { type: 'sprite', src: assetPath('/assets/bitmap/coins/bronze/comma.png'), preload: true };
bitmapAssets.bitmap_coins_bronze_x = { type: 'sprite', src: assetPath('/assets/bitmap/coins/bronze/x.png'), preload: true };
bitmapAssets.bitmap_mult_dot = { type: 'sprite', src: assetPath('/assets/bitmap/multiplier/dot.png'), preload: true };
bitmapAssets.bitmap_mult_comma = { type: 'sprite', src: assetPath('/assets/bitmap/multiplier/comma.png'), preload: true };
bitmapAssets.bitmap_mult_x = { type: 'sprite', src: assetPath('/assets/bitmap/multiplier/x.png'), preload: true };
const bitmapAssetClones: Record<string, { type: 'sprite'; src: string; preload: true }> = {};
for (const [assetKey, assetDef] of Object.entries(bitmapAssets)) {
	for (let i = 0; i <= 9; i += 1) {
		bitmapAssetClones[`${assetKey}-${i}`] = assetDef;
	}
}
const bitmapAssetsWithClones = { ...bitmapAssets, ...bitmapAssetClones };
const context = createApp({
	assets: {
		banana: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/symbols/symbols.atlas'),
				skeleton: assetPath('/assets/spine/symbols/banana.skel'),
				scale: 1
			},
			preload: true
		},
		star: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/symbols/symbols.atlas'),
				skeleton: assetPath('/assets/spine/symbols/star.skel'),
				scale: 1
			},
			preload: true
		},
		lifering: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/symbols/symbols.atlas'),
				skeleton: assetPath('/assets/spine/symbols/lifering.skel'),
				scale: 1
			},
			preload: true
		},
		goal: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/symbols/symbols.atlas'),
				skeleton: assetPath('/assets/spine/symbols/goal.skel'),
				scale: 1
			},
			preload: true
		},
		coin_bronze: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/symbols/symbols.atlas'),
				skeleton: assetPath('/assets/spine/symbols/coin_copper.skel'),
				scale: 1
			},
			preload: true
		},
		coin_silver: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/symbols/symbols.atlas'),
				skeleton: assetPath('/assets/spine/symbols/coin_silver.skel'),
				scale: 1
			},
			preload: true
		},
		coin_gold: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/symbols/symbols.atlas'),
				skeleton: assetPath('/assets/spine/symbols/coin_gold.skel'),
				scale: 1
			},
			preload: true
		},
		penguin: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/penguin/penguin.atlas'),
				skeleton: assetPath('/assets/spine/penguin/penguin.skel'),
				scale: 1
			},
			preload: true
		},
		background_water: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/background/background.atlas'),
				skeleton: assetPath('/assets/spine/background/background_water.skel'),
				scale: 1
			},
			preload: true
		},
		background_mountains: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/background/background.atlas'),
				skeleton: assetPath('/assets/spine/background/background_mountains.skel'),
				scale: 1
			},
			preload: true
		},
		background_clouds: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/background/background.atlas'),
				skeleton: assetPath('/assets/spine/background/background_clouds.skel'),
				scale: 1
			},
			preload: true
		},
		slide: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/slide/slide.atlas'),
				skeleton: assetPath('/assets/spine/slide/slide.skel'),
				scale: 1
			},
			preload: true
		},
		ice_1: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/ice/ice.atlas'),
				skeleton: assetPath('/assets/spine/ice/ice_1.skel'),
				scale: 1
			},
			preload: true
		},
		ice_2: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/ice/ice.atlas'),
				skeleton: assetPath('/assets/spine/ice/ice_2.skel'),
				scale: 1
			},
			preload: true
		},
		ice_3: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/ice/ice.atlas'),
				skeleton: assetPath('/assets/spine/ice/ice_3.skel'),
				scale: 1
			},
			preload: true
		},
		ice_4: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/ice/ice.atlas'),
				skeleton: assetPath('/assets/spine/ice/ice_4.skel'),
				scale: 1
			},
			preload: true
		},
		ice_5: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/ice/ice.atlas'),
				skeleton: assetPath('/assets/spine/ice/ice_5.skel'),
				scale: 1
			},
			preload: true
		},
		ice_6: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/ice/ice.atlas'),
				skeleton: assetPath('/assets/spine/ice/ice_6.skel'),
				scale: 1
			},
			preload: true
		},
		ice_7: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/ice/ice.atlas'),
				skeleton: assetPath('/assets/spine/ice/ice_7.skel'),
				scale: 1
			},
			preload: true
		},
		ice_8: {
			type: 'spine',
			src: {
				atlas: assetPath('/assets/spine/ice/ice.atlas'),
				skeleton: assetPath('/assets/spine/ice/ice_8.skel'),
				scale: 1
			},
			preload: true
		},
		...bitmapAssetsWithClones
	}
});
	setContextApp(context);

	let gameBodyEl: HTMLDivElement | null = null;

	const API_MULTIPLIER = 1_000_000;
	const TOTAL_COST_MULTIPLIER = 5;
	const baseViewport = { w: 1920, h: 1080 };
	let stageScale = $state(1);
	let stageOffset = $state({ x: 0, y: 0 });
	let gameBox = $state({ w: baseViewport.w, h: baseViewport.h });
	let renderSize = $state({ w: baseViewport.w, h: baseViewport.h });
	let isMobileLandscapeUi = $state(false);
	let rootScale = $state(1);
	let rootOffset = $state({ x: 0, y: 0 });
	const SKY_TARGET_RATIO = 0.1;

let response: any = $state(null);
let endRoundResponse: any = $state(null);
let balance = $state(0);
type SupportedCurrency =
	| 'USD'
	| 'CAD'
	| 'JPY'
	| 'EUR'
	| 'RUB'
	| 'CNY'
	| 'PHP'
	| 'INR'
	| 'IDR'
	| 'KRW'
	| 'BRL'
	| 'MXN'
	| 'DKK'
	| 'PLN'
	| 'VND'
	| 'TRY'
	| 'CLP'
	| 'ARS'
	| 'PEN'
	| 'XGC'
	| 'XSC';
const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
	'USD',
	'CAD',
	'JPY',
	'EUR',
	'RUB',
	'CNY',
	'PHP',
	'INR',
	'IDR',
	'KRW',
	'BRL',
	'MXN',
	'DKK',
	'PLN',
	'VND',
	'TRY',
	'CLP',
	'ARS',
	'PEN',
	'XGC',
	'XSC'
];
const CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES);
const SOCIAL_CURRENCY_SYMBOL: Record<'XGC' | 'XSC', string> = {
	XGC: 'G',
	XSC: 'SC'
};
let currentCurrency = $state<SupportedCurrency>('USD');
	
	let autoplay = $state(false);
	let autoplayOpen = $state(false);
	let autoplayRemaining = $state(0);
	let autoplayTotal = $state(0);
	let autoplayTimer: ReturnType<typeof setInterval> | null = null;
	let autoplayDraftCount = $state(25);
	const autoplayOptions = [10, 25, 50, 75, 100, 250, 500, 1000];
	let lastWin = $state(0);
	let betAmount = $state(1);
	let hitDelta = $state(0);
	let runId = $state(0);
	let slipSlide = $state(0);
	let slipDirection = $state<1 | -1>(1);
	let slipTriggered = $state(false);
	let slipAnimationStarted = $state(false);
	let slipAnimationToken = $state(0);
	let slipOriginX = $state<number | null>(null);
	let driftActive = $state(false);
	let slipStepIndex = $state<number | null>(null);
	let slipEndRenderStep = $state<number | null>(null);
	let runEndRenderStep = $state<number | null>(null);
	let slipAnimLocked = $state(false);
	let lastHitType = $state('');
	let tokenId = $state(0);
	let status = $state<'idle' | 'sliding' | 'goal' | 'slip'>('idle');
	let steps = $state(0);
	let currentValue = $state(0);
	let displayValue = $state(0);
	let roundWinDisplay = $state(0);
	let lastDisplayStep = $state(0);
	let hasLifering = $state(false);
	let errorMessage = $state('');
	let stepStates = $state<Array<{ step: number; value: number; hasLifering: boolean; bananaCount: number }>>([]);
	let endRoundTriggered = $state(false);
	
	let pickupCount = $state(0);
	let hitPopup = $state<{ text: string; until: number; x: number; y: number } | null>(null);
	let vestAnim = $state<'gain' | 'lose' | null>(null);
	let vestAnimKey = $state(0);
	let penguinAnim = $state<'idle' | 'slide_in' | 'slide_idle' | 'win' | 'lose_L' | 'lose_R'>('idle');
	let penguinSkin = $state<'base' | 'vest'>('base');
	let autoScrollActive = $state(false);
	let slideInStart = $state(0);
	let pendingRound = $state(false);
	let pendingRoundEvents = $state<any[] | null>(null);
	let liferingOverrideStep = $state<number | null>(null);
	let liferingGainStep = $state<number | null>(null);
	let liferingForcedOff = $state(false);
	let liferingPickedStep = $state<number | null>(null);
	let vestEventArmed = $state<'gain' | 'lose' | null>(null);
	let pendingVestPopSteps = $state<number[]>([]);
	let pendingVestPopCursor = $state(0);
	let stopRunEarly = $state(false);
	let freezeMovement = $state(false);
const betOptions = [0.5, 1, 2.5, 5, 10, 25, 50];
	let betLevels = $state<number[]>([...betOptions]);
	let betIndex = $state(0);
	let modeLabel = $state('BASE');
	let timeLabel = $state('');
	let menuOpen = $state(false);
	let menuInfoOpen = $state(false);
	let volatilityHelpOpen = $state(false);
	let selectedMode = $state('BASE_HARD');
	let speedFactor = $state(1);
	let maxWinLabel = $state('1,000x');
	let musicMuted = $state(false);
	let hudVolume = $state(58);
	let bootLoading = $state(true);
	let audioUnlocked = false;
	const stakeLoaderSrc = assetPath('/stake-engine-loader.gif');
	type SoundKey =
		| 'music_loop'
		| 'penguin_slide_loop'
		| 'penguin_fall'
		| 'penguin_finish'
		| 'penguin_turn'
		| 'pickup_banana'
		| 'pickup_bronze'
		| 'pickup_buy'
		| 'pickup_gold'
		| 'pickup_multi'
		| 'pickup_silver'
		| 'start_button'
		| 'ui_bet_up'
		| 'ui_bet_down';
	const SOUND_SRC: Record<SoundKey, string> = {
		music_loop: assetPath('/sounds/music_loop.wav'),
		penguin_slide_loop: assetPath('/sounds/penguin_slide_loop.wav'),
		penguin_fall: assetPath('/sounds/penguin_fall.wav'),
		penguin_finish: assetPath('/sounds/penguin_finish.wav'),
		penguin_turn: assetPath('/sounds/penguin_turn.wav'),
		pickup_banana: assetPath('/sounds/pickup_banana.wav'),
		pickup_bronze: assetPath('/sounds/pickup_bronze.wav'),
		pickup_buy: assetPath('/sounds/pickup_buy.wav'),
		pickup_gold: assetPath('/sounds/pickup_gold.wav'),
		pickup_multi: assetPath('/sounds/pickup_multi.wav'),
		pickup_silver: assetPath('/sounds/pickup_silver.wav'),
		start_button: assetPath('/sounds/start_button.wav'),
		ui_bet_up: assetPath('/sounds/ui_bet_up.wav'),
		ui_bet_down: assetPath('/sounds/ui_bet_down.wav')
	};
	const LOOP_SOUNDS = new Set<SoundKey>(['music_loop', 'penguin_slide_loop']);
	const SOUND_GAIN: Record<SoundKey, number> = {
		music_loop: 0.35,
		penguin_slide_loop: 0.6,
		penguin_fall: 1,
		penguin_finish: 1,
		penguin_turn: 0.9,
		pickup_banana: 1,
		pickup_bronze: 1,
		pickup_buy: 1,
		pickup_gold: 1,
		pickup_multi: 1,
		pickup_silver: 1,
		start_button: 1,
		ui_bet_up: 1,
		ui_bet_down: 1
	};
	type LoopAudioState = {
		gain: GainNode;
		source: AudioBufferSourceNode | null;
		buffer: AudioBuffer | null;
		loading: Promise<AudioBuffer> | null;
	};
	let audioContext: AudioContext | null = null;
	let loopAudioState: Partial<Record<SoundKey, LoopAudioState>> = {};
	let soundEnabled = false;
	let lastTurnSoundAt = $state(0);
	let lastTurnSoundLane = $state(0);

	function stakeAmount() {
		return betAmount;
	}

let renderStep = $state(0);
let targetStep = $state(0);
let animationActive = $state(false);
let animationStatus: 'idle' | 'running' | 'done' = $state('idle');
let penguinLane = $state(0);
let penguinTargetLane = $state(0);
let penguinOffsetFrac = $state(0);
let penguinSkidPhase = $state(0);
let penguinSkidRotation = $state(0);
let lanePath = $state<Array<{ step: number; lane: number }>>([]);
let laneVelocity = $state(0);
let ctrlTurnTilt = $state(0);
let pickupSkidScale = $state(1);
let amountWinPulse = $state(1);
let amountWinPulseToken = 0;
let bananaLossFloat = $state<{ amount: number; start: number } | null>(null);
let runStartValue = $state(0);
let lastPickupRenderStep = $state(0);
let lastPickupLane = $state(0);
let lockCenterStrict = $state(false);
let preStepRoamTargetLane = $state(0);
let preStepFreeRoamActive = $state(true);
let preStepSweepStartMs = $state(0);
let preStepSweepStartSide = $state(1);
let preStepSweepCompleted = $state(false);
let preStepHandoffActive = $state(false);
let preStepHandoffStartMs = $state(0);
let preStepHandoffFromLane = $state(0);
let centerLockPendingTokenId = $state<number | null>(null);
let postDestroyTeleportAtMs = $state(0);
let postDestroyTeleportLane = $state<number | null>(null);
let lockedTargetTokenId = $state<number | null>(null);
let lockedTargetHoldUntilMs = $state(0);
let ctrlTurnIntentFiltered = $state(0);
let firstApproachLockTokenId = $state<number | null>(null);

function setPenguinLane(nextLane: number) {
	penguinLane = clampPenguinLane(nextLane);
}

function setLockedTargetToken(tokenId: number | null, nowMs: number, force = false) {
	if (!force && nowMs < lockedTargetHoldUntilMs && lockedTargetTokenId != null && tokenId !== lockedTargetTokenId) {
		return;
	}
	if (lockedTargetTokenId === tokenId) return;
	lockedTargetTokenId = tokenId;
	lockedTargetHoldUntilMs = tokenId == null ? 0 : nowMs + TARGET_LOCK_HYSTERESIS_MS;
	if (tokenId == null) return;
}

function normalizeCurrency(raw: unknown): SupportedCurrency {
	const code = String(raw ?? '').trim().toUpperCase();
	return CURRENCY_SET.has(code) ? (code as SupportedCurrency) : 'USD';
}

function formatCurrencyAmount(amount: number, fractionDigits = 2) {
	const value = Number.isFinite(amount) ? amount : 0;
	if (currentCurrency === 'XGC' || currentCurrency === 'XSC') {
		const sign = value < 0 ? '-' : '';
		const abs = Math.abs(value);
		return `${sign}${SOCIAL_CURRENCY_SYMBOL[currentCurrency]}${abs.toFixed(fractionDigits)}`;
	}
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currentCurrency,
			currencyDisplay: 'symbol',
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits
		}).format(value);
	} catch {
		return `${value.toFixed(fractionDigits)} ${currentCurrency}`;
	}
}

function updateFirstApproachLock(
	pendingHit: { t: Token; trigger: number } | undefined,
	preStepFreeRoam: boolean
) {
	if (pickupCount > 0) {
		firstApproachLockTokenId = null;
		return;
	}
	if (preStepFreeRoam || !pendingHit) return;
	if (firstApproachLockTokenId == null) {
		firstApproachLockTokenId = pendingHit.t.id;
		return;
	}
	const stillExists = tokens.some((t) => t.id === firstApproachLockTokenId && !t.activate);
	if (!stillExists) {
		firstApproachLockTokenId = pendingHit.t.id;
	}
}

function updateCtrlTurnTilt(dt: number, lockToPickup: boolean) {
	const moving = status === 'sliding' && !slipAnimationStarted && !freezeMovement;
	const steer = penguinTargetLane - penguinLane;
	const turnIntentRaw = Math.max(-1, Math.min(1, steer * 2.3 + laneVelocity * 0.55));
	const intentBlend = 1 - Math.exp(-8.5 * Math.max(1 / 240, Math.min(PENGUIN_MOTION_STEP_DT_MAX, dt)));
	ctrlTurnIntentFiltered += (turnIntentRaw - ctrlTurnIntentFiltered) * intentBlend;
	const velocityAbs = Math.abs(laneVelocity);
	const onset = velocityAbs / (velocityAbs + 0.18);
	const targetTilt = moving ? -ctrlTurnIntentFiltered * 13 * onset : 0;
	const smoothRate = moving ? (lockToPickup ? 7.5 : 10.5) : 6.5;
	const blend = 1 - Math.exp(-smoothRate * Math.max(0, dt));
	ctrlTurnTilt += (targetTilt - ctrlTurnTilt) * blend;
	if (!moving) {
		ctrlTurnIntentFiltered *= Math.exp(-8 * Math.max(0, dt));
		if (Math.abs(ctrlTurnTilt) < 0.05) ctrlTurnTilt = 0;
	}
}

function smoothPenguinLaneTowardTarget(dt: number) {
	const targetLane = clampPenguinLane(penguinTargetLane);
	if (DISABLE_PENGUIN_SLIDE_MOTION) {
		laneVelocity = 0;
		return;
	}
	const prevLane = penguinLane;
	const diff = targetLane - prevLane;
	const distance = Math.abs(diff);
	const snapThreshold = lockCenterStrict ? 0.004 : 0.0075;
	if (distance <= snapThreshold) {
		setPenguinLane(targetLane);
		laneVelocity = 0;
		return;
	}
	// Use rate-based easing plus explicit speed cap to avoid frame-drop teleports/snap.
	let rate = PENGUIN_LANE_BASE_FOLLOW_RATE + Math.min(1.45, distance * PENGUIN_LANE_DISTANCE_FOLLOW_RATE);
	if (lockCenterStrict) rate *= PENGUIN_LANE_CENTER_LOCK_RATE_MULT;
	const blendDt = Math.max(1 / 240, Math.min(PENGUIN_MOTION_STEP_DT_MAX, dt));
	const blend = 1 - Math.exp(-rate * blendDt);
	let delta = diff * blend;
	const lockDistanceBoost = lockCenterStrict ? Math.min(1.45, 1 + distance * 0.42) : 1;
	const maxSpeedBase = lockCenterStrict ? PENGUIN_LANE_MAX_SPEED_CENTER_LOCK : PENGUIN_LANE_MAX_SPEED;
	const maxSpeed = maxSpeedBase * lockDistanceBoost;
	const maxDelta = maxSpeed * blendDt;
	if (Math.abs(delta) > maxDelta) delta = Math.sign(delta) * maxDelta;
	setPenguinLane(prevLane + delta);
	const velocityDt = Math.max(1 / 240, dt);
	laneVelocity = (penguinLane - prevLane) / velocityDt;
	if (Math.abs(targetLane - penguinLane) <= snapThreshold) {
		setPenguinLane(targetLane);
		laneVelocity = 0;
	}
}

function centerLockLeadStepsForPendingTarget(
	pendingLane: number,
	pendingPos: { x: number; y: number } | null,
	stepPerMs: number
) {
	const penguinNow = penguinPose();
	const laneDistance = Math.abs(clampPenguinLane(pendingLane) - clampPenguinLane(penguinLane));
	const lockDistanceBoost = Math.min(1.45, 1 + laneDistance * 0.42);
	const speedLanePerS = Math.max(0.01, PENGUIN_LANE_MAX_SPEED_CENTER_LOCK * lockDistanceBoost);
	const depth = pendingPos ? depthForPickupY(pendingPos.y) : depthForPickupY(penguinNow.y);
	const pxPerLane = Math.max(1, Math.abs(lanePosition(depth, 1).x - lanePosition(depth, 0).x));
	const speedPxPerMs = Math.max(0.02, (pxPerLane * speedLanePerS) / 1000);
	const targetX = pendingPos?.x ?? lanePosition(depth, clampPenguinLane(pendingLane)).x;
	const xDistance = Math.abs(targetX - penguinNow.x);
	const requiredMs = xDistance / speedPxPerMs;
	const leadMs = Math.max(PICKUP_CENTER_LOCK_LEAD_MS, requiredMs + PICKUP_CENTER_LOCK_BUFFER_MS);
	return Math.max(stepSpacing * 0.02, stepPerMs * leadMs);
}

function schedulePostDestroyTeleport(
	stepIndex: number,
	activatedTokenId: number,
	activatedTokenLane: number,
	destroyDelayMs: number,
	nowMs: number
) {
	if (!ENABLE_POST_DESTROY_TELEPORT) return;
	const nextToken = tokens
		.filter((t) => {
			if (!t.hit || t.activate || t.id === activatedTokenId) return false;
			if (!tokenMatchesLandedStep(t) || !tokenCanDriveTargeting(t)) return false;
			if (t.stepIndex > stepIndex) return true;
			return t.stepIndex === stepIndex && t.id > activatedTokenId;
		})
		.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0];
	const lane = nextToken ? targetLaneForToken(nextToken) : clampPenguinLane(activatedTokenLane);
	postDestroyTeleportLane = clampPenguinLane(lane);
	postDestroyTeleportAtMs = nowMs + Math.max(0, destroyDelayMs);
}

function maybeApplyPostDestroyTeleport(nowMs: number) {
	if (!ENABLE_POST_DESTROY_TELEPORT) return;
	if (!Number.isFinite(postDestroyTeleportAtMs) || postDestroyTeleportAtMs <= 0) return;
	if (postDestroyTeleportLane == null) return;
	if (nowMs < postDestroyTeleportAtMs) return;
	if (status !== 'sliding' || freezeMovement) {
		postDestroyTeleportAtMs = 0;
		postDestroyTeleportLane = null;
		return;
	}
	const lane = clampPenguinLane(postDestroyTeleportLane);
	setPenguinLane(lane);
	penguinTargetLane = lane;
	laneVelocity = 0;
	penguinOffsetFrac = 0;
	postDestroyTeleportAtMs = 0;
	postDestroyTeleportLane = null;
}

function destroyDelayForTokenType(type: string) {
	if (type === 'goal') return GOAL_PICKUP_DESTROY_DELAY_MS;
	if (type === 'lifering') return LIFERING_PICKUP_DESTROY_DELAY_MS;
	return NORMAL_PICKUP_DESTROY_DELAY_MS;
}

function laneOffsetForTargetIndex(targetIndex: number | null) {
	if (targetIndex == null) return null;
	const crossing = pickupLineCrossings.find((entry) => entry.slot === targetIndex);
	// Keep lane values in the same offset-space as token spawn lanes.
	if (crossing) return Number(crossing.offset);
	const lane = SLOT_TO_OFFSET[targetIndex];
	return Number.isFinite(lane) ? Number(lane) : null;
}

function targetLaneIndexForToken(token: { lane: number; spawnLane?: number; extra?: Record<string, unknown> }) {
	const spawnOffset = Number(token.extra?.spawnLane ?? token.spawnLane ?? token.lane);
	if (Number.isFinite(spawnOffset)) {
		return targetLineIndexForOffset(spawnOffset);
	}
	const explicitTargetLane = Number(token.extra?.targetLane);
	if (Number.isFinite(explicitTargetLane)) {
		return targetLineIndexForOffset(explicitTargetLane);
	}
	return null;
}

function shouldHoldCurrentLaneForSinkingToken(token: Token | undefined) {
	if (!token || !token.hit) return false;
	if (isNothingTokenType(token.type)) return false;
	return token.extra?.sinking === true || token.extra?.fall === true;
}

function planSlidingTargetLane(
	nowMs: number,
	dt: number,
	pendingHit: { t: Token; trigger: number } | undefined,
	preStepFreeRoam: boolean,
	stepPerMs: number
) {
	void dt;
	let lane = preStepFreeRoam
		? preStepFreeRoamTargetLane(nowMs, pendingHit, stepPerMs)
		: clampPenguinLane(penguinTargetLane);
	let shouldCenterLock = false;
	const targetToken = pendingHit?.t;
	const targetTrigger = pendingHit?.trigger ?? null;
	if (targetToken && !preStepFreeRoam) {
		if (shouldHoldCurrentLaneForSinkingToken(targetToken)) {
			centerLockPendingTokenId = null;
			return {
				lane: clampPenguinLane(penguinLane),
				shouldCenterLock: false
			};
		}
		const targetIndex = targetLaneIndexForToken(targetToken);
		const mappedLane = laneOffsetForTargetIndex(targetIndex);
		const directTargetLane = mappedLane != null ? mappedLane : targetLaneForToken(targetToken);
		if (preStepHandoffActive) {
			const elapsedMs = Math.max(0, nowMs - preStepHandoffStartMs);
			const blend = Math.max(0, Math.min(1, elapsedMs / PRE_STEP_HANDOFF_DURATION_MS));
			const eased = blend * blend * (3 - 2 * blend);
			lane = preStepHandoffFromLane + (directTargetLane - preStepHandoffFromLane) * eased;
			if (blend >= 1) preStepHandoffActive = false;
		} else {
			lane = directTargetLane;
		}
		const firstApproachActive =
			pickupCount === 0 &&
			firstApproachLockTokenId != null &&
			targetToken.id === firstApproachLockTokenId;
		if (firstApproachActive) shouldCenterLock = true;
		const targetSpawnLane = Number(targetToken.extra?.spawnLane ?? targetToken.lane);
		const pendingPos = pickupPosition(targetToken.stepIndex, targetToken.lane, targetSpawnLane);
		const centerLockLeadSteps = centerLockLeadStepsForPendingTarget(lane, pendingPos, stepPerMs);
		const trigger = targetTrigger ?? renderStep;
		const centerLockEntered = renderStep >= trigger - centerLockLeadSteps;
		if (centerLockEntered) centerLockPendingTokenId = targetToken.id;
		const earlyPickupCenterLockActive =
			centerLockPendingTokenId === targetToken.id || centerLockEntered;
		if (earlyPickupCenterLockActive) shouldCenterLock = true;
		const isGoalPending = targetToken.type === 'goal';
		const goalEarlyLockActive =
			isGoalPending &&
			renderStep >= trigger - stepSpacing * GOAL_CENTER_LOCK_EARLY_LEAD_STEPS;
		if (goalEarlyLockActive) shouldCenterLock = true;
		const centerLockWindow = isGoalPending ? Math.max(62, viewport.h * 0.36) : Math.max(34, viewport.h * 0.18);
		const penguinNow = penguinPose();
		const yDelta = pendingPos ? Math.abs(pendingPos.y - penguinNow.y) : Number.POSITIVE_INFINITY;
		if (pendingPos && yDelta <= centerLockWindow) shouldCenterLock = true;
	}
	return {
		lane: clampPenguinLane(lane),
		shouldCenterLock: shouldCenterLock && !preStepFreeRoam
	};
}


function startWinAmountPulse() {
	amountWinPulseToken += 1;
	const token = amountWinPulseToken;
	const start = performance.now();
	const durationMs = 520;
	const peakAt = 0.35;
	const tick = (now: number) => {
		if (token !== amountWinPulseToken) return;
		const t = Math.max(0, Math.min(1, (now - start) / durationMs));
		const envelope = t < peakAt ? t / peakAt : 1 - (t - peakAt) / (1 - peakAt);
		const eased = Math.sin(Math.max(0, envelope) * Math.PI * 0.5);
		amountWinPulse = 1 + 0.36 * eased;
		if (t < 1) requestAnimationFrame(tick);
		else amountWinPulse = 1;
	};
	requestAnimationFrame(tick);
}

function updateRoundWinDisplay(value: number) {
	roundWinDisplay = Math.max(0, value - runStartValue);
}

function showBananaLossFloat(amount: number) {
	if (!Number.isFinite(amount) || amount < 0) return;
	bananaLossFloat = { amount, start: floatTime };
}

function bananaLossAmount(
	prevValue: number,
	currentStepValue: number,
	token: { extra?: Record<string, unknown> },
	bananaSaved: boolean
) {
	if (bananaSaved) return 0;
	const directLoss = Math.max(0, prevValue - currentStepValue);
	if (directLoss > 0.0001) return directLoss;
	const winAmountRaw = Number(token.extra?.winAmount ?? 0);
	if (Number.isFinite(winAmountRaw) && winAmountRaw < 0) {
		const inferred = (stakeAmount() * Math.abs(winAmountRaw)) / 100;
		if (inferred > 0) return inferred;
	}
	const base = Math.max(prevValue, currentStepValue, stakeAmount(), 0.01);
	if (token.extra?.lostHalf === true) return Math.max(0, base * 0.5);
	if (token.extra?.fall === true || token.extra?.sinking === true) return Math.max(0, base);
	// Some feeds omit explicit deltas for banana penalties; keep the popup visible with a minimal fallback.
	return 0;
}

	let wobbleTime = $state(0);
	let wobbleRisk = $state(0);
	let wobbleBoost = $state(0);
	let lastRoundEndAt = $state(0);
	const autoplayCooldownMs = 1400;
	let laneFreeze = $state(false);

type Token = {
	id: number;
	stepIndex: number;
	type: string;
	value: number;
	lane: number;
	hit: boolean;
	activate: boolean;
	offset?: number;
	spawnLane?: number;
	extra?: Record<string, unknown>;
};

type PickupLineCrossing = {
	slot: number;
	offset: number;
	x: number;
	y: number;
	lane: number;
};

function tokenHasSlipProtection(token: Token) {
	const vestCount = Number(token.extra?.lifeVests ?? 0);
	return Boolean(token.extra?.savedByLifering) || vestCount > 0 || hasLifering;
}

function tokenCanDriveTargeting(token: Token) {
	if (token.extra?.targetLane === null) return false;
	if (token.extra?.skipTargeting === true) return false;
	return !shouldSkipPositioningForHitToken(token);
}

function isTargetableHitToken(token: Token) {
	return token.hit && tokenMatchesLandedStep(token) && tokenCanDriveTargeting(token);
}

function tokenMatchesLandedStep(token: Token) {
	const landed = String(token.extra?.landedStep ?? token.extra?.landedPad ?? '').trim().toUpperCase();
	const padKey = String(token.extra?.padKey ?? '').trim().toUpperCase();
	if ((landed === 'LEFT' || landed === 'RIGHT') && (padKey === 'LEFT' || padKey === 'RIGHT')) {
		return landed === padKey;
	}
	if (landed === 'LEFT' || landed === 'RIGHT') {
		const tokenSide = nearestLane(Number(token.lane)) >= 0 ? 'RIGHT' : 'LEFT';
		return tokenSide === landed;
	}
	return true;
}

function setPendingVestPopSteps(steps: number[]) {
	pendingVestPopSteps = [...steps].sort((a, b) => a - b);
	pendingVestPopCursor = 0;
}

function consumePendingVestPops(currentStep: number) {
	while (
		pendingVestPopCursor < pendingVestPopSteps.length &&
		currentStep > pendingVestPopSteps[pendingVestPopCursor]
	) {
		const popStep = pendingVestPopSteps[pendingVestPopCursor];
		if (hasLifering) {
			clearLiferingState(popStep, true);
		}
		pendingVestPopCursor += 1;
	}
}

function tokenUpdatesAccumulatedValue(token: Token) {
	return token.type === 'coin' || token.type === 'star' || token.type === 'banana';
}

function hasPendingValuePickup() {
	return tokens.some(
		(token) =>
			token.hit &&
			!token.activate &&
			!token.extra?.cosmetic &&
			tokenUpdatesAccumulatedValue(token)
	);
}

	let tokens = $state<Token[]>([]);
	const removalTimers = new Map<number, ReturnType<typeof setTimeout>>();

	const viewport = $state({ w: baseViewport.w, h: baseViewport.h });
const ICE_PIECES_PER_SIDE = 4;
const ICE_SPAWN_Y_DOWN_FRAC = 0.07;
const ICE_SPAWN_X_JITTER_FRAC = 0.015;
const ICE_SPAWN_LEFT_COUNT = 4;
const ICE_SPAWN_RIGHT_COUNT = 4;
const ICE_VISIBLE_START = 4;
const ICE_RESPAWN_GAP_FRAC = 0;
type IceSide = 'left' | 'right';
let dynamicSpawnSlots: Array<{ side: IceSide; slotIndex: number; x: number }> = [];
const spawnHistory = new Map<string, { lastCycle: number; x: number; slotKey: string }>();
let hasStartedFirstRound = $state(false);

function updateSpawnPositions() {
	const positions = iceSpawnPositions();
	dynamicSpawnSlots = [
		...positions.left.map((x, slotIndex) => ({ side: 'left' as const, slotIndex, x })),
		...positions.right.map((x, slotIndex) => ({ side: 'right' as const, slotIndex, x }))
	];
	spawnHistory.clear();
}

function getSpawnX(pieceId: string, cycle: number, fallback: number, side: IceSide) {
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
			const jitter = (Math.random() * 2 - 1) * viewport.w * ICE_SPAWN_X_JITTER_FRAC;
			state.x = slotX + jitter;
		} else {
			state.x = fallback;
		}
	}
	return state.x;
}
let icePieces = $state<
		Array<{
			baseX: number;
			baseY: number;
			scale: number;
			key: string;
			animName: string;
			yAmp: number;
			rAmp: number;
			seed: number;
			id: string;
			spawnIndex: number;
			side: IceSide;
			sideGuard: boolean;
		}>
	>([]);
	let floatTime = $state(0);
	let iceScroll = $state(0);
	let slideTimeScale = $state(1.2);

	const getParam = (key: string) => new URLSearchParams(window.location.search).get(key);
	const SUPPORTED_LANGUAGES = [
		'ar',
		'de',
		'en',
		'es',
		'fi',
		'fr',
		'hi',
		'id',
		'ja',
		'ko',
		'pl',
		'pt',
		'ru',
		'tr',
		'vi',
		'zh'
	] as const;
	type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
	const LANGUAGE_SET = new Set<string>(SUPPORTED_LANGUAGES);

	const I18N_EN = {
		game_title: 'PENGUIN SLIDE',
		balance_label: 'BALANCE:',
		features: 'Features',
		close_menu: 'Close Menu',
		menu: 'Menu',
		volatility: 'Volatility',
		volatility_help_label: 'Volatility help',
		volatility_help_title: 'Volatility',
		volatility_help_intro: 'Here you can choose your playstyle.',
		volatility_help_desc: 'Each level changes how often and how big you can win:',
		volatility_low_desc: 'Low: More frequent wins - up to 1,000x max win.',
		volatility_medium_desc: 'Medium: Less frequent wins, but bigger wins - up to 5,000x max win.',
		volatility_high_desc: 'High: High risk, high reward - up to 10,000x max win.',
		low: 'Low',
		medium: 'Medium',
		high: 'High',
		max_win_equals: 'Max win = {value}',
		sounds: 'Sounds',
		volume: 'Volume',
		stop_music_toggle: 'Stop Music toggle',
		stop_music: 'Stop Music',
		speed: 'Speed',
		normal: 'Normal',
		fast: 'Fast',
		turbo: 'Turbo',
		info: 'INFO',
		game_info: 'Game info',
		close: 'Close',
		how_to_play: 'How to play',
		how_to_play_text: 'Tap BET to start. Guide the penguin through pickups and avoid hazards. Cash out to secure your current value.',
		autoplay: 'Autoplay',
		autoplay_text: 'Choose spins and speed from Autoplay, then start. Tap BET during autoplay to stop immediately.',
		decrease_bet: 'Decrease bet',
		increase_bet: 'Increase bet',
		bet: 'Bet',
		open_autoplay_options: 'Open autoplay options',
		close_autoplay_options: 'Close autoplay options',
		autoplay_title: 'AUTOPLAY',
		spins: 'Spins',
		start: 'START',
		start_autospins: 'START AUTOSPINS',
		total_cost: 'TOTAL COST',
		bet_size: 'BET SIZE',
		change_speed: 'Change speed',
		resume_last_round: 'Resume last round?',
		resume_last_round_desc: 'We detected an unfinished round. Do you want to view it, or discard it?',
		discard: 'Discard',
		view: 'View',
		life_vest_lost: 'LIFE VEST LOST',
		hit: 'HIT {token}',
		spins_count: '{count} spins'
	} as const;
	type I18nKey = keyof typeof I18N_EN;
	const I18N: Record<SupportedLanguage, Partial<Record<I18nKey, string>>> = {
		ar: {
			game_title: 'بطريق الانزلاق',
			balance_label: 'الرصيد:',
			features: 'الميزات',
			close_menu: 'إغلاق القائمة',
			menu: 'القائمة',
			volatility: 'التقلب',
			volatility_help_label: 'مساعدة التقلب',
			volatility_help_title: 'التقلب',
			volatility_help_intro: 'هنا يمكنك اختيار أسلوب اللعب.',
			volatility_help_desc: 'كل مستوى يغير تكرار وحجم الفوز:',
			volatility_low_desc: 'منخفض: أرباح أكثر تكرارا - حتى 1,000x كحد أقصى.',
			volatility_medium_desc: 'متوسط: أرباح أقل تكرارا لكن أكبر - حتى 5,000x كحد أقصى.',
			volatility_high_desc: 'مرتفع: مخاطرة عالية ومكافأة عالية - حتى 10,000x كحد أقصى.',
			low: 'منخفض',
			medium: 'متوسط',
			high: 'مرتفع',
			max_win_equals: 'الحد الأقصى للفوز = {value}',
			sounds: 'الأصوات',
			volume: 'مستوى الصوت',
			stop_music_toggle: 'تبديل إيقاف الموسيقى',
			stop_music: 'إيقاف الموسيقى',
			speed: 'السرعة',
			normal: 'عادي',
			fast: 'سريع',
			turbo: 'توربو',
			info: 'معلومات',
			game_info: 'معلومات اللعبة',
			close: 'إغلاق',
			how_to_play: 'طريقة اللعب',
			how_to_play_text: 'اضغط BET للبدء. وجّه البطريق عبر المكافآت وتجنب المخاطر. اسحب الأرباح لتثبيت قيمتك الحالية.',
			autoplay: 'تشغيل تلقائي',
			autoplay_text: 'اختر عدد الدورات والسرعة من التشغيل التلقائي ثم ابدأ. اضغط BET أثناء التشغيل التلقائي للإيقاف فورا.',
			decrease_bet: 'تقليل الرهان',
			increase_bet: 'زيادة الرهان',
			bet: 'رهان',
			open_autoplay_options: 'فتح خيارات التشغيل التلقائي',
			close_autoplay_options: 'إغلاق خيارات التشغيل التلقائي',
			autoplay_title: 'تشغيل تلقائي',
			spins: 'الدورات',
			start: 'ابدأ',
			start_autospins: 'ابدأ الدورات التلقائية',
			total_cost: 'التكلفة الإجمالية',
			bet_size: 'حجم الرهان',
			change_speed: 'تغيير السرعة',
			resume_last_round: 'استئناف الجولة الأخيرة؟',
			resume_last_round_desc: 'تم اكتشاف جولة غير مكتملة. هل تريد عرضها أم تجاهلها؟',
			discard: 'تجاهل',
			view: 'عرض',
			life_vest_lost: 'تم فقدان سترة النجاة',
			hit: 'إصابة {token}',
			spins_count: '{count} دورات'
		},
		de: {
			...I18N_EN,
			game_title: 'Pinguin Rutsch',
			balance_label: 'GUTHABEN:',
			features: 'Funktionen',
			close_menu: 'Menü schließen',
			menu: 'Menü',
			volatility: 'Volatilität',
			low: 'Niedrig',
			medium: 'Mittel',
			high: 'Hoch',
			max_win_equals: 'Maximalgewinn = {value}',
			sounds: 'Sounds',
			volume: 'Lautstärke',
			stop_music: 'Musik stoppen',
			speed: 'Geschwindigkeit',
			normal: 'Normal',
			fast: 'Schnell',
			turbo: 'Turbo',
			game_info: 'Spielinfo',
			close: 'Schließen',
			how_to_play: 'So spielt man',
			autoplay: 'Autoplay',
			decrease_bet: 'Einsatz verringern',
			increase_bet: 'Einsatz erhöhen',
			bet: 'Einsatz',
			spins: 'Spins',
			start: 'START',
			start_autospins: 'AUTOSPINS STARTEN',
			total_cost: 'GESAMTKOSTEN',
			bet_size: 'EINSATZGRÖSSE',
			change_speed: 'Geschwindigkeit ändern',
			resume_last_round: 'Letzte Runde fortsetzen?',
			resume_last_round_desc: 'Wir haben eine nicht beendete Runde erkannt. Möchtest du sie ansehen oder verwerfen?',
			discard: 'Verwerfen',
			view: 'Ansehen',
			life_vest_lost: 'RETTUNGSWESTE VERLOREN',
			hit: 'TREFFER {token}',
			spins_count: '{count} Spins'
		},
		en: I18N_EN,
		es: {
			...I18N_EN,
			game_title: 'Pingüino Deslizante',
			balance_label: 'SALDO:',
			features: 'Funciones',
			close_menu: 'Cerrar menú',
			menu: 'Menú',
			volatility: 'Volatilidad',
			low: 'Baja',
			medium: 'Media',
			high: 'Alta',
			max_win_equals: 'Ganancia máxima = {value}',
			sounds: 'Sonidos',
			volume: 'Volumen',
			stop_music: 'Detener música',
			speed: 'Velocidad',
			normal: 'Normal',
			fast: 'Rápida',
			turbo: 'Turbo',
			game_info: 'Información del juego',
			close: 'Cerrar',
			how_to_play: 'Cómo jugar',
			autoplay: 'Autoplay',
			decrease_bet: 'Disminuir apuesta',
			increase_bet: 'Aumentar apuesta',
			bet: 'Apuesta',
			spins: 'Tiradas',
			start: 'INICIAR',
			start_autospins: 'INICIAR AUTOTIRADAS',
			total_cost: 'COSTE TOTAL',
			bet_size: 'TAMAÑO DE APUESTA',
			change_speed: 'Cambiar velocidad',
			resume_last_round: '¿Reanudar la última ronda?',
			resume_last_round_desc: 'Detectamos una ronda sin terminar. ¿Quieres verla o descartarla?',
			discard: 'Descartar',
			view: 'Ver',
			life_vest_lost: 'CHALECO SALVAVIDAS PERDIDO',
			hit: 'GOLPE {token}',
			spins_count: '{count} tiradas'
		},
		fi: {
			...I18N_EN,
			game_title: 'Pingviiniliuku',
			balance_label: 'SALDO:',
			features: 'Ominaisuudet',
			close_menu: 'Sulje valikko',
			menu: 'Valikko',
			volatility: 'Volatiliteetti',
			low: 'Matala',
			medium: 'Keskitaso',
			high: 'Korkea',
			max_win_equals: 'Maksimivoitto = {value}',
			sounds: 'Äänet',
			volume: 'Äänenvoimakkuus',
			stop_music: 'Pysäytä musiikki',
			speed: 'Nopeus',
			normal: 'Normaali',
			fast: 'Nopea',
			game_info: 'Pelitiedot',
			close: 'Sulje',
			how_to_play: 'Kuinka pelata',
			autoplay: 'Autoplay',
			decrease_bet: 'Vähennä panosta',
			increase_bet: 'Lisää panosta',
			bet: 'Panos',
			spins: 'Pyöräytykset',
			start: 'ALOITA',
			start_autospins: 'ALOITA AUTOPYÖRÄYTYKSET',
			total_cost: 'KOKONAISKUSTANNUS',
			bet_size: 'PANOKSEN KOKO',
			change_speed: 'Vaihda nopeutta',
			resume_last_round: 'Jatketaanko viimeistä kierrosta?',
			resume_last_round_desc: 'Havaitsimme keskeneräisen kierroksen. Haluatko katsoa sen vai hylätä?',
			discard: 'Hylkää',
			view: 'Katso',
			life_vest_lost: 'PELASTUSLIIVI MENETETTY',
			hit: 'OSUMA {token}',
			spins_count: '{count} pyöräytystä'
		},
		fr: {
			...I18N_EN,
			game_title: 'Glisse Pingouin',
			balance_label: 'SOLDE :',
			features: 'Fonctionnalités',
			close_menu: 'Fermer le menu',
			menu: 'Menu',
			volatility: 'Volatilité',
			low: 'Faible',
			medium: 'Moyenne',
			high: 'Élevée',
			max_win_equals: 'Gain max = {value}',
			sounds: 'Sons',
			volume: 'Volume',
			stop_music: 'Arrêter la musique',
			speed: 'Vitesse',
			normal: 'Normale',
			fast: 'Rapide',
			game_info: 'Infos du jeu',
			close: 'Fermer',
			how_to_play: 'Comment jouer',
			autoplay: 'Autoplay',
			decrease_bet: 'Diminuer la mise',
			increase_bet: 'Augmenter la mise',
			bet: 'Mise',
			spins: 'Tours',
			start: 'DÉMARRER',
			start_autospins: 'DÉMARRER AUTOSPINS',
			total_cost: 'COÛT TOTAL',
			bet_size: 'TAILLE DE MISE',
			change_speed: 'Changer la vitesse',
			resume_last_round: 'Reprendre la dernière manche ?',
			resume_last_round_desc: 'Nous avons détecté une manche inachevée. Voulez-vous la voir ou l ignorer ?',
			discard: 'Ignorer',
			view: 'Voir',
			life_vest_lost: 'GILET DE SAUVETAGE PERDU',
			hit: 'TOUCHÉ {token}',
			spins_count: '{count} tours'
		},
		hi: {
			...I18N_EN,
			game_title: 'पेंगुइन स्लाइड',
			balance_label: 'बैलेंस:',
			features: 'फीचर्स',
			close_menu: 'मेनू बंद करें',
			menu: 'मेनू',
			volatility: 'वोलैटिलिटी',
			low: 'लो',
			medium: 'मीडियम',
			high: 'हाई',
			max_win_equals: 'अधिकतम जीत = {value}',
			sounds: 'साउंड्स',
			volume: 'वॉल्यूम',
			stop_music: 'म्यूजिक बंद करें',
			speed: 'स्पीड',
			normal: 'नॉर्मल',
			fast: 'फास्ट',
			turbo: 'टर्बो',
			info: 'जानकारी',
			game_info: 'गेम जानकारी',
			close: 'बंद करें',
			how_to_play: 'कैसे खेलें',
			autoplay: 'ऑटोप्ले',
			decrease_bet: 'बेट घटाएं',
			increase_bet: 'बेट बढ़ाएं',
			bet: 'बेट',
			spins: 'स्पिन्स',
			start: 'शुरू करें',
			start_autospins: 'ऑटोस्पिन शुरू करें',
			total_cost: 'कुल लागत',
			bet_size: 'बेट साइज़',
			change_speed: 'स्पीड बदलें',
			resume_last_round: 'पिछला राउंड फिर शुरू करें?',
			resume_last_round_desc: 'हमें एक अधूरा राउंड मिला। क्या आप उसे देखना चाहते हैं या हटाना चाहते हैं?',
			discard: 'हटाएं',
			view: 'देखें',
			life_vest_lost: 'लाइफ वेस्ट खो गई',
			hit: 'हिट {token}',
			spins_count: '{count} स्पिन'
		},
		id: {
			...I18N_EN,
			game_title: 'Seluncur Penguin',
			balance_label: 'SALDO:',
			features: 'Fitur',
			close_menu: 'Tutup Menu',
			menu: 'Menu',
			volatility: 'Volatilitas',
			low: 'Rendah',
			medium: 'Sedang',
			high: 'Tinggi',
			max_win_equals: 'Maks menang = {value}',
			sounds: 'Suara',
			volume: 'Volume',
			stop_music: 'Hentikan Musik',
			speed: 'Kecepatan',
			normal: 'Normal',
			fast: 'Cepat',
			game_info: 'Info game',
			close: 'Tutup',
			how_to_play: 'Cara bermain',
			autoplay: 'Autoplay',
			decrease_bet: 'Kurangi bet',
			increase_bet: 'Tambah bet',
			bet: 'Bet',
			start: 'MULAI',
			start_autospins: 'MULAI AUTOSPIN',
			total_cost: 'TOTAL BIAYA',
			bet_size: 'UKURAN BET',
			change_speed: 'Ubah kecepatan',
			resume_last_round: 'Lanjutkan ronde terakhir?',
			resume_last_round_desc: 'Kami mendeteksi ronde yang belum selesai. Mau lihat atau buang?',
			discard: 'Buang',
			view: 'Lihat',
			life_vest_lost: 'PELAMPUNG HILANG',
			hit: 'KENA {token}',
			spins_count: '{count} spin'
		},
		ja: {
			...I18N_EN,
			game_title: 'ペンギンスライド',
			balance_label: '残高:',
			features: '機能',
			close_menu: 'メニューを閉じる',
			menu: 'メニュー',
			volatility: 'ボラティリティ',
			low: '低',
			medium: '中',
			high: '高',
			max_win_equals: '最大配当 = {value}',
			sounds: 'サウンド',
			volume: '音量',
			stop_music: '音楽を止める',
			speed: '速度',
			normal: '通常',
			fast: '高速',
			game_info: 'ゲーム情報',
			close: '閉じる',
			how_to_play: '遊び方',
			autoplay: 'オートプレイ',
			decrease_bet: 'ベットを減らす',
			increase_bet: 'ベットを増やす',
			bet: 'ベット',
			spins: '回転',
			start: '開始',
			start_autospins: '自動回転開始',
			total_cost: '合計コスト',
			bet_size: 'ベット額',
			change_speed: '速度変更',
			resume_last_round: '前回のラウンドを再開しますか？',
			resume_last_round_desc: '未完了のラウンドが見つかりました。表示しますか、それとも破棄しますか？',
			discard: '破棄',
			view: '表示',
			life_vest_lost: 'ライフベストを失いました',
			hit: 'ヒット {token}',
			spins_count: '{count} 回'
		},
		ko: {
			...I18N_EN,
			game_title: '펭귄 슬라이드',
			balance_label: '잔액:',
			features: '기능',
			close_menu: '메뉴 닫기',
			menu: '메뉴',
			volatility: '변동성',
			low: '낮음',
			medium: '중간',
			high: '높음',
			max_win_equals: '최대 당첨 = {value}',
			sounds: '사운드',
			volume: '볼륨',
			stop_music: '음악 중지',
			speed: '속도',
			normal: '보통',
			fast: '빠름',
			game_info: '게임 정보',
			close: '닫기',
			how_to_play: '플레이 방법',
			autoplay: '자동 플레이',
			decrease_bet: '베팅 감소',
			increase_bet: '베팅 증가',
			bet: '베팅',
			spins: '스핀',
			start: '시작',
			start_autospins: '자동 스핀 시작',
			total_cost: '총 비용',
			bet_size: '베팅 금액',
			change_speed: '속도 변경',
			resume_last_round: '이전 라운드를 이어서 하시겠습니까?',
			resume_last_round_desc: '완료되지 않은 라운드를 감지했습니다. 보시겠습니까 아니면 버리시겠습니까?',
			discard: '버리기',
			view: '보기',
			life_vest_lost: '구명조끼를 잃었습니다',
			hit: '히트 {token}',
			spins_count: '{count} 스핀'
		},
		pl: {
			...I18N_EN,
			game_title: 'Ślizg Pingwina',
			balance_label: 'SALDO:',
			features: 'Funkcje',
			close_menu: 'Zamknij menu',
			menu: 'Menu',
			volatility: 'Zmienność',
			low: 'Niska',
			medium: 'Średnia',
			high: 'Wysoka',
			max_win_equals: 'Maks wygrana = {value}',
			sounds: 'Dźwięki',
			volume: 'Głośność',
			stop_music: 'Zatrzymaj muzykę',
			speed: 'Prędkość',
			normal: 'Normalna',
			fast: 'Szybka',
			game_info: 'Informacje o grze',
			close: 'Zamknij',
			how_to_play: 'Jak grać',
			autoplay: 'Autoodtwarzanie',
			decrease_bet: 'Zmniejsz zakład',
			increase_bet: 'Zwiększ zakład',
			bet: 'Zakład',
			start: 'START',
			start_autospins: 'START AUTOSPINÓW',
			total_cost: 'CAŁKOWITY KOSZT',
			bet_size: 'WIELKOŚĆ ZAKŁADU',
			change_speed: 'Zmień prędkość',
			resume_last_round: 'Wznowić ostatnią rundę?',
			resume_last_round_desc: 'Wykryto niedokończoną rundę. Chcesz ją obejrzeć czy odrzucić?',
			discard: 'Odrzuć',
			view: 'Pokaż',
			life_vest_lost: 'UTRACONO KAMIZELKĘ RATUNKOWĄ',
			hit: 'TRAFIENIE {token}',
			spins_count: '{count} spinów'
		},
		pt: {
			...I18N_EN,
			game_title: 'Deslize do Pinguim',
			balance_label: 'SALDO:',
			features: 'Recursos',
			close_menu: 'Fechar Menu',
			menu: 'Menu',
			volatility: 'Volatilidade',
			low: 'Baixa',
			medium: 'Média',
			high: 'Alta',
			max_win_equals: 'Ganho máximo = {value}',
			sounds: 'Sons',
			volume: 'Volume',
			stop_music: 'Parar música',
			speed: 'Velocidade',
			normal: 'Normal',
			fast: 'Rápida',
			game_info: 'Informações do jogo',
			close: 'Fechar',
			how_to_play: 'Como jogar',
			autoplay: 'Autoplay',
			decrease_bet: 'Diminuir aposta',
			increase_bet: 'Aumentar aposta',
			bet: 'Aposta',
			spins: 'Giros',
			start: 'INICIAR',
			start_autospins: 'INICIAR AUTOGIROS',
			total_cost: 'CUSTO TOTAL',
			bet_size: 'VALOR DA APOSTA',
			change_speed: 'Alterar velocidade',
			resume_last_round: 'Retomar a última rodada?',
			resume_last_round_desc: 'Detectamos uma rodada inacabada. Deseja ver ou descartar?',
			discard: 'Descartar',
			view: 'Ver',
			life_vest_lost: 'COLETE SALVA-VIDAS PERDIDO',
			hit: 'ACERTO {token}',
			spins_count: '{count} giros'
		},
		ru: {
			...I18N_EN,
			game_title: 'Скользящий Пингвин',
			balance_label: 'БАЛАНС:',
			features: 'Функции',
			close_menu: 'Закрыть меню',
			menu: 'Меню',
			volatility: 'Волатильность',
			low: 'Низкая',
			medium: 'Средняя',
			high: 'Высокая',
			max_win_equals: 'Макс выигрыш = {value}',
			sounds: 'Звуки',
			volume: 'Громкость',
			stop_music: 'Выключить музыку',
			speed: 'Скорость',
			normal: 'Обычная',
			fast: 'Быстрая',
			game_info: 'Информация об игре',
			close: 'Закрыть',
			how_to_play: 'Как играть',
			autoplay: 'Автоигра',
			decrease_bet: 'Уменьшить ставку',
			increase_bet: 'Увеличить ставку',
			bet: 'Ставка',
			spins: 'Спины',
			start: 'СТАРТ',
			start_autospins: 'ЗАПУСТИТЬ АВТОСПИНЫ',
			total_cost: 'ОБЩАЯ СТОИМОСТЬ',
			bet_size: 'РАЗМЕР СТАВКИ',
			change_speed: 'Изменить скорость',
			resume_last_round: 'Возобновить последний раунд?',
			resume_last_round_desc: 'Обнаружен незавершенный раунд. Показать его или отклонить?',
			discard: 'Отклонить',
			view: 'Просмотр',
			life_vest_lost: 'СПАСАТЕЛЬНЫЙ ЖИЛЕТ ПОТЕРЯН',
			hit: 'ПОПАДАНИЕ {token}',
			spins_count: '{count} спинов'
		},
		tr: {
			...I18N_EN,
			game_title: 'Penguen Kaydırak',
			balance_label: 'BAKİYE:',
			features: 'Özellikler',
			close_menu: 'Menüyü Kapat',
			menu: 'Menü',
			volatility: 'Volatilite',
			low: 'Düşük',
			medium: 'Orta',
			high: 'Yüksek',
			max_win_equals: 'Maks kazanç = {value}',
			sounds: 'Sesler',
			volume: 'Ses',
			stop_music: 'Müziği Durdur',
			speed: 'Hız',
			normal: 'Normal',
			fast: 'Hızlı',
			game_info: 'Oyun bilgisi',
			close: 'Kapat',
			how_to_play: 'Nasıl oynanır',
			autoplay: 'Otomatik Oynatma',
			decrease_bet: 'Bahsi azalt',
			increase_bet: 'Bahsi artır',
			bet: 'Bahis',
			spins: 'Spin',
			start: 'BAŞLAT',
			start_autospins: 'OTOSPİN BAŞLAT',
			total_cost: 'TOPLAM MALİYET',
			bet_size: 'BAHİS TUTARI',
			change_speed: 'Hızı değiştir',
			resume_last_round: 'Son tur devam etsin mi?',
			resume_last_round_desc: 'Tamamlanmamış bir tur tespit edildi. Görmek ister misin yoksa atılsın mı?',
			discard: 'At',
			view: 'Görüntüle',
			life_vest_lost: 'CAN YELEĞİ KAYBEDİLDİ',
			hit: 'VURUŞ {token}',
			spins_count: '{count} spin'
		},
		vi: {
			...I18N_EN,
			game_title: 'Trượt Cánh Cụt',
			balance_label: 'SỐ DƯ:',
			features: 'Tính năng',
			close_menu: 'Đóng menu',
			menu: 'Menu',
			volatility: 'Độ biến động',
			low: 'Thấp',
			medium: 'Trung bình',
			high: 'Cao',
			max_win_equals: 'Thắng tối đa = {value}',
			sounds: 'Âm thanh',
			volume: 'Âm lượng',
			stop_music: 'Dừng nhạc',
			speed: 'Tốc độ',
			normal: 'Thường',
			fast: 'Nhanh',
			game_info: 'Thông tin trò chơi',
			close: 'Đóng',
			how_to_play: 'Cách chơi',
			autoplay: 'Tự động chơi',
			decrease_bet: 'Giảm cược',
			increase_bet: 'Tăng cược',
			bet: 'Cược',
			spins: 'Vòng',
			start: 'BẮT ĐẦU',
			start_autospins: 'BẮT ĐẦU TỰ ĐỘNG',
			total_cost: 'TỔNG CHI PHÍ',
			bet_size: 'MỨC CƯỢC',
			change_speed: 'Đổi tốc độ',
			resume_last_round: 'Tiếp tục vòng trước?',
			resume_last_round_desc: 'Chúng tôi phát hiện một vòng chưa hoàn tất. Bạn muốn xem hay bỏ?',
			discard: 'Bỏ',
			view: 'Xem',
			life_vest_lost: 'MẤT ÁO PHAO',
			hit: 'TRÚNG {token}',
			spins_count: '{count} vòng'
		},
		zh: {
			...I18N_EN,
			game_title: '企鹅滑行',
			balance_label: '余额:',
			features: '功能',
			close_menu: '关闭菜单',
			menu: '菜单',
			volatility: '波动性',
			low: '低',
			medium: '中',
			high: '高',
			max_win_equals: '最高赢取 = {value}',
			sounds: '声音',
			volume: '音量',
			stop_music: '停止音乐',
			speed: '速度',
			normal: '普通',
			fast: '快速',
			turbo: '涡轮',
			info: '信息',
			game_info: '游戏信息',
			close: '关闭',
			how_to_play: '玩法说明',
			autoplay: '自动游戏',
			decrease_bet: '减少下注',
			increase_bet: '增加下注',
			bet: '下注',
			spins: '转数',
			start: '开始',
			start_autospins: '开始自动转',
			total_cost: '总成本',
			bet_size: '下注金额',
			change_speed: '切换速度',
			resume_last_round: '继续上一局？',
			resume_last_round_desc: '检测到未完成的回合。你想查看还是丢弃？',
			discard: '丢弃',
			view: '查看',
			life_vest_lost: '救生衣已丢失',
			hit: '命中 {token}',
			spins_count: '{count} 转'
		}
	};
	let currentLanguage = $state<SupportedLanguage>('en');

	function normalizeLanguage(raw: string | null | undefined): SupportedLanguage {
		const base = String(raw ?? '').trim().toLowerCase().split('-')[0] ?? '';
		return LANGUAGE_SET.has(base) ? (base as SupportedLanguage) : 'en';
	}

	function t(key: I18nKey, vars?: Record<string, string | number>) {
		const template = I18N[currentLanguage][key] ?? I18N_EN[key];
		if (!vars) return template;
		return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(vars[name] ?? ''));
	}

	function getRgsBaseUrl(): string | null {
		const raw = getParam('rgs_url');
		if (!raw) return null;
		return raw.startsWith('http') ? raw : `https://${raw}`;
	}

	async function getRGSResponse(endpoint: string, body: any): Promise<any> {
		const base = getRgsBaseUrl();
		if (!base) {
			errorMessage = 'Missing rgs_url query param.';
			return null;
		}
		const res = await fetch(`${base}${endpoint}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		const data = await res.json();
		return data;
	}

	function updateViewport() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const isLandscape = vw > vh;
		const isCoarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
		const desktopLandscapeRef = { w: 1200, h: 675 };
		isMobileLandscapeUi = window.matchMedia(
			'(orientation: landscape) and (max-width: 1366px) and (max-height: 900px) and (hover: none) and (pointer: coarse)'
		).matches;
		if (isLandscape && !isCoarsePointer) {
			const fitScale = Math.min(vw / desktopLandscapeRef.w, vh / desktopLandscapeRef.h);
			if (fitScale < 1) {
				gameBox.w = desktopLandscapeRef.w;
				gameBox.h = desktopLandscapeRef.h;
				stageScale = fitScale;
				stageOffset.x = Math.round((vw - desktopLandscapeRef.w * fitScale) * 0.5);
				stageOffset.y = Math.round((vh - desktopLandscapeRef.h * fitScale) * 0.5);
				return;
			}
		}
		gameBox.w = vw;
		gameBox.h = vh;
		stageScale = 1;
		stageOffset.x = 0;
		stageOffset.y = 0;
	}

	function updateIceVisibility() {}

	

function iceSpawnPositions() {
	return getIceSpawnXs();
}

function getIceSpawnXs() {
	if (!viewport.w) return { left: [], right: [] };
	const isPortrait = renderSize.h > renderSize.w;
	const leftStart = viewport.w * (isPortrait ? 0.31 : 0.08);
	const leftEnd = viewport.w * (isPortrait ? 0.44 : 0.38);
	const rightStart = viewport.w * (isPortrait ? 0.55 : 0.62);
	const rightEnd = viewport.w * (isPortrait ? 0.68 : 0.92);
	const leftStep = (leftEnd - leftStart) / Math.max(1, ICE_SPAWN_LEFT_COUNT - 1);
	const rightStep = (rightEnd - rightStart) / Math.max(1, ICE_SPAWN_RIGHT_COUNT - 1);
	const left = Array.from({ length: ICE_SPAWN_LEFT_COUNT }, (_, i) => leftStart + leftStep * i);
	const right = Array.from({ length: ICE_SPAWN_RIGHT_COUNT }, (_, i) => rightStart + rightStep * i);
	return { left, right };
}

function buildFloes() {
	updateSpawnPositions();
	const pieces: Array<{
			baseX: number;
			baseY: number;
			scale: number;
			key: string;
			animName: string;
			yAmp: number;
			rAmp: number;
			seed: number;
			id: string;
			spawnIndex: number;
			side: IceSide;
			sideGuard: boolean;
		}> = [];
		const { topY, bottomY } = pathMetrics();
		const isPortrait = renderSize.h > renderSize.w;
		const portraitSpawnOffset = isPortrait ? 0.04 : 0;
		const spawnY = topY + viewport.h * (0.25 + ICE_SPAWN_Y_DOWN_FRAC + portraitSpawnOffset);
		const spanY = Math.max(1, bottomY - spawnY);
		const keys = ['ice_1','ice_2','ice_3','ice_4','ice_5','ice_6','ice_7','ice_8'];
		const iceAnim = 'activate';
		const scale = window.innerWidth < 600 ? 0.72 : 0.88;
		const countPerSide = Number(ICE_PIECES_PER_SIDE);
		const spawnSlots = iceSpawnPositions();
			const yBands =
				countPerSide === 1
					? [0.24]
					: countPerSide === 2
						? [0.12, 0.28]
						: countPerSide === 4
							? [0.06, 0.18, 0.30, 0.42]
						: Array.from({ length: countPerSide }, (_, i) =>
							0.05 + (0.9 * (countPerSide === 1 ? 0 : i / (countPerSide - 1)))
						);
	const isDynamicSpawn = hasStartedFirstRound && animationStatus === 'running';
	const placeSide = (side: IceSide) => {
		const slots = side === 'left' ? spawnSlots.left : spawnSlots.right;
		for (let i = 0; i < countPerSide; i++) {
			const key = keys[Math.floor(Math.random() * keys.length)];
			const spawnX =
				slots[Math.floor(Math.random() * Math.max(1, slots.length))] ??
				(side === 'left' ? viewport.w * 0.2 : viewport.w * 0.8);
			const jitterX = (Math.random() - 0.5) * viewport.w * 0.01;
			let y = spawnY + spanY * yBands[i];
			if (i >= ICE_VISIBLE_START) y += spanY;
			const yAmp = viewport.h * (0.0012 + Math.random() * 0.0012);
			const rAmp = 0.003 + Math.random() * 0.002;
			const animName = iceAnim;
			pieces.push({
				baseX: spawnX + jitterX,
				baseY: y,
				scale,
				key,
				animName,
				yAmp,
				rAmp,
				seed: Math.random() * 1000,
					id: `${key}-${side}-${i}-${Math.random().toString(36).slice(2, 8)}`,
					spawnIndex: i,
					side,
					sideGuard: i < 2
				});
		}
	};
		const fixedInitialLayout: Array<{ side: 'left' | 'right'; slot: number; band: number; key: string }> = [
			{ side: 'left', slot: 1, band: 0.04, key: 'ice_3' },
			{ side: 'right', slot: 1, band: 0.08, key: 'ice_7' },
			{ side: 'left', slot: 0, band: 0.1, key: 'ice_1' },
			{ side: 'right', slot: 2, band: 0.20, key: 'ice_5' },
			{ side: 'left', slot: 2, band: 0.44, key: 'ice_4' },
			{ side: 'right', slot: 0, band: 0.44, key: 'ice_2' },
			{ side: 'left', slot: 3, band: 0.17, key: 'ice_6' },
			{ side: 'right', slot: 3, band: 0.07, key: 'ice_8' }
		];
		if (!isDynamicSpawn) {
			const total = Math.max(1, countPerSide * 2);
			let leftCount = 0;
			let rightCount = 0;
			for (let i = 0; i < total; i++) {
				const layout = fixedInitialLayout[i % fixedInitialLayout.length];
				const slots = layout.side === 'left' ? spawnSlots.left : spawnSlots.right;
				const slotIndex = Math.max(0, Math.min(slots.length - 1, layout.slot));
				const spawnX = slots[slotIndex] ?? (layout.side === 'left' ? viewport.w * 0.2 : viewport.w * 0.8);
				const key = layout.key;
				const y = spawnY + spanY * layout.band;
				const yAmp = viewport.h * 0.0018;
				const rAmp = 0.004;
				const sideIndex = layout.side === 'left' ? leftCount++ : rightCount++;
				pieces.push({
					baseX: spawnX,
					baseY: y,
					scale,
					key,
					animName: iceAnim,
					yAmp,
					rAmp,
					seed: 100 + i * 17,
					id: `${key}-fixed-${i}`,
					spawnIndex: sideIndex,
					side: layout.side,
					sideGuard: sideIndex === 0
				});
			}
		} else {
			placeSide('left');
			placeSide('right');
		}
		icePieces = pieces;
	}

	function resetRun(startValue = 1) {
		for (const timer of removalTimers.values()) clearTimeout(timer);
		removalTimers.clear();
		runStartValue = startValue;
		tokens = [];
		steps = 0;
		currentValue = startValue;
		displayValue = startValue;
		updateRoundWinDisplay(startValue);
		lastDisplayStep = 0;
		pickupCount = 0;
		hasLifering = false;
		status = 'sliding';
		lastWin = 0;
		hitDelta = 0;
		stepStates = [];
		wobbleTime = 0;
		wobbleRisk = 0;
		wobbleBoost = 0;
		const initialPickupLookahead = lookaheadSteps + PICKUP_LOOKAHEAD_EXTRA_STEPS;
		const initialRenderStep = -initialPickupLookahead * stepSpacing;
		renderStep = initialRenderStep;
		targetStep = initialRenderStep;
		animationStatus = 'idle';
		// Keep token IDs monotonic across rounds so keyed pickup/glyph rendering never reuses stale nodes.
		slipSlide = 0;
		slipDirection = 1;
		slipTriggered = false;
		slipAnimationStarted = false;
		slipAnimationToken += 1;
		slipOriginX = null;
		slipStepIndex = null;
		slipEndRenderStep = null;
		runEndRenderStep = null;
		slipAnimLocked = false;
		lastHitType = '';
		endRoundTriggered = false;
		lastTurnSoundLane = 0;
		lastTurnSoundAt = 0;
		
		hitPopup = null;
		vestAnim = null;
		vestAnimKey = 0;
		hasLifering = false;
		liferingOverrideStep = null;
		liferingGainStep = null;
		liferingForcedOff = false;
		liferingPickedStep = null;
		pendingVestPopSteps = [];
		pendingVestPopCursor = 0;
		stopRunEarly = false;
		freezeMovement = false;
		laneFreeze = false;
		penguinAnim = 'idle';
		penguinSkin = 'base';
		autoScrollActive = false;
		setPenguinLane(0);
		penguinTargetLane = 0;
		ctrlTurnTilt = 0;
		ctrlTurnIntentFiltered = 0;
		firstApproachLockTokenId = null;
		pickupSkidScale = 1;
		penguinOffsetFrac = 0;
		penguinSkidPhase = Math.random() * Math.PI * 2;
		penguinSkidRotation = 0;
		lockCenterStrict = false;
		lanePath = [];
		iceScroll = 0;
		preStepRoamTargetLane = 0;
		preStepFreeRoamActive = true;
		preStepSweepStartMs = 0;
		preStepSweepStartSide = Math.random() < 0.5 ? -1 : 1;
		preStepSweepCompleted = false;
		preStepHandoffActive = false;
		preStepHandoffStartMs = 0;
		preStepHandoffFromLane = 0;
		lockedTargetTokenId = null;
		lockedTargetHoldUntilMs = 0;
		centerLockPendingTokenId = null;
		postDestroyTeleportAtMs = 0;
		postDestroyTeleportLane = null;
		stepLaneSlots.clear();
		lastPathHitSlotBySide = { left: null, right: null };
		// Reset per-piece respawn history so each run gets a fresh random ice sequence.
		spawnHistory.clear();
		

	}

	function markRoundEnded() {
		animationStatus = 'done';
		lastRoundEndAt = performance.now();
		stopSlideLoop();
	}

	function startAutoplay() {
		if (autoplayTimer) return;
		autoplayTimer = setInterval(() => {
			if (!autoplay || autoplayRemaining <= 0) return;
			if (animationStatus === 'running' || pendingRound || menuOpen) return;
			if (status === 'sliding') return;
			if (lastRoundEndAt && performance.now() - lastRoundEndAt < autoplayCooldownMs) return;
			autoplayRemaining = Math.max(0, autoplayRemaining - 1);
			if (autoplayRemaining <= 0) {
				autoplay = false;
			}
			play();
		}, 600);
	}

	function stopAutoplay() {
		if (!autoplayTimer) return;
		clearInterval(autoplayTimer);
		autoplayTimer = null;
	}

	function addToken(
		stepIndex: number,
		type: string,
		value: number,
		lane: number,
		hit: boolean,
		extra?: Record<string, unknown>
	) {
		const normalizedLane = nearestLane(lane);
		const baseStake = extra?.baseStake ?? stakeAmount();
		const enrichedExtra: Record<string, unknown> = { ...(extra || {}), baseStake };
		const spawnLaneVal = Number(enrichedExtra['spawnLane'] ?? normalizedLane);
		const spawnDelayVal = Number(enrichedExtra['spawnDelay'] ?? 0);

		const existingIndex = tokens.findIndex(
			(t) =>
				t.stepIndex === stepIndex &&
				t.lane === normalizedLane &&
				Number(t.extra?.spawnLane ?? normalizedLane) === spawnLaneVal &&
				Number(t.extra?.spawnDelay ?? 0) === spawnDelayVal &&
				!t.extra?.cosmetic
		);

		if (existingIndex !== -1) {
			const existing = tokens[existingIndex];
			const replace =
				(existing.type === 'empty' && type !== 'empty') || (hit && !existing.hit);
			if (!replace) {
				return;
			}
			tokens = tokens.filter((_, i) => i !== existingIndex);
		}

		tokenId += 1;
		tokens = [
			...tokens,
			{
				id: tokenId,
				stepIndex,
				type,
				value,
				lane: normalizedLane,
				spawnLane: spawnLaneVal,
				hit,
				activate: false,
				extra: enrichedExtra
			}
		];
		steps = Math.max(steps, stepIndex);
		setTargetStep(stepIndex * stepSpacing);
	}

	function scheduleTokenRemoval(id: number, delayMs = NORMAL_PICKUP_DESTROY_DELAY_MS) {
		const existing = removalTimers.get(id);
		if (existing) clearTimeout(existing);
		const timer = setTimeout(() => {
			removalTimers.delete(id);
			tokens = tokens.filter((t) => t.id !== id);
		}, delayMs);
		removalTimers.set(id, timer);
	}

	function setTargetStep(nextRenderStep: number) {
		targetStep = Math.max(targetStep, nextRenderStep);
		if (!animationActive) {
			animationActive = true;
			animationStatus = 'running';
			requestAnimationFrame(tickAnimation);
		}
	}

	function tickAnimation() {
		if (!animationActive) return;
		if (freezeMovement) {
			animationActive = false;
			return;
		}
		const delta = targetStep - renderStep;
		if (Math.abs(delta) < 0.01) {
			renderStep = targetStep;
			if (animationStatus === 'done') {
				animationActive = false;
				return;
			}
		} else {
			renderStep = renderStep + delta * 0.035;
		}
		requestAnimationFrame(tickAnimation);
	}

	function nearestLane(value: number) {
		if (Math.abs(value) < 0.5) return 0;
		return value >= 0 ? 1 : -1;
	}

function targetLaneForToken(token: { lane: number; spawnLane?: number; extra?: Record<string, unknown> }) {
	if (token.extra?.targetLane === null) return clampPenguinLane(penguinLane);
	const explicitTargetLane = Number(token.extra?.targetLane);
	const targetIndex = targetLaneIndexForToken(token);
	if (targetIndex != null) {
		const mappedLane = laneOffsetForTargetIndex(targetIndex);
		if (mappedLane != null) return clampPenguinLane(mappedLane);
	}
	if (Number.isFinite(explicitTargetLane)) return clampPenguinLane(explicitTargetLane);
	return nearestLane(token.lane);
}

	function nextPendingHitToken(afterStepIndex: number, activatedTokenId: number) {
		return tokens
			.filter((t) => {
				if (!t.hit || t.activate || t.id === activatedTokenId) return false;
				if (t.stepIndex > afterStepIndex) return true;
				return t.stepIndex === afterStepIndex && t.id > activatedTokenId;
			})
			.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0];
	}

	function nextTargetableHitToken(afterStepIndex: number, activatedTokenId: number) {
		return tokens
			.filter((t) => {
				if (!isTargetableHitToken(t) || t.activate || t.id === activatedTokenId) return false;
				if (t.stepIndex > afterStepIndex) return true;
				return t.stepIndex === afterStepIndex && t.id > activatedTokenId;
			})
			.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0];
	}

	function parseOutcome(item: string, padType?: string, sinking?: boolean) {
		const normalized = String(item || '').trim().toUpperCase();
		const pad = String(padType || '').trim().toUpperCase();
		if (
			pad === 'STONE' ||
			normalized === 'STONE' ||
			normalized === 'STONE_COLLECT' ||
			normalized === 'GOAL'
		) {
			return { type: 'goal', extra: {} };
		}
		if (pad === 'LILY' && normalized === 'BANANA') {
			return { type: 'banana', extra: { fall: true } };
		}
		if (pad === 'LILY' && (normalized === 'LIFE_VEST' || normalized === 'LIFE_RING')) {
			return { type: 'lifering', extra: {} };
		}
		if (normalized === 'LIFE_VEST' || normalized === 'LIFE_RING') {
			return { type: 'lifering', extra: {} };
		}
		if (normalized.startsWith('X')) {
			const multiplier = Number(normalized.slice(1));
			return { type: 'star', extra: { multiplier } };
		}
		if (normalized.startsWith('+')) {
			const coinValue = Number(normalized.slice(1));
			return { type: 'coin', extra: { coinValue } };
		}
		if (normalized === 'GHOST') {
			return randomGhostOutcome();
		}
		if (normalized === 'SLIP' || normalized === 'SINK') {
			return { type: 'banana', extra: { fall: true } };
		}
		if (normalized === 'BANANA') {
			return { type: 'banana', extra: {} };
		}
		return { type: 'empty', extra: {} };
	}

	function randomGhostOutcome() {
		const options = ['coin', 'star', 'lifering', 'banana'] as const;
		const pick = options[Math.floor(Math.random() * options.length)];
		if (pick === 'coin') {
			const coinValue = 1 + Math.floor(Math.random() * 5);
			return { type: 'coin', extra: { cosmetic: true, coinValue } };
		}
		if (pick === 'star') {
			const multiplier = 2 + Math.floor(Math.random() * 4);
			return { type: 'star', extra: { cosmetic: true, multiplier } };
		}
		if (pick === 'lifering') {
			return { type: 'lifering', extra: { cosmetic: true } };
		}
		return { type: 'banana', extra: { cosmetic: true } };
	}

	function isGameplayRoundEntry(entry: any) {
		return Boolean(entry && (entry.steps || entry.pads));
	}

	function oppositeLandedStep(step: string) {
		return String(step).toUpperCase() === 'RIGHT' ? 'LEFT' : 'RIGHT';
	}

	function landedPadData(entry: any) {
		const landed = String(entry?.landedStep ?? entry?.landedPad ?? '').toUpperCase();
		const pads = (entry?.steps || entry?.pads || {}) as Record<string, any>;
		const pad = pads[landed] ?? {};
		const item = String(pad?.item ?? pad?.outcome ?? '').toUpperCase();
		return { landed, item, sinking: Boolean(pad?.sinking) };
	}

	function isSinkingCoinOrStarOnLandedPad(entry: any) {
		const landed = landedPadData(entry);
		if (!landed.sinking) return false;
		return landed.item.startsWith('+') || landed.item.startsWith('X');
	}

	function tokenShouldSlipOnPreviousStep(token: { type?: unknown; extra?: Record<string, unknown> }) {
		const type = String(token?.type ?? '').trim().toLowerCase();
		const isCoinOrStar = type === 'coin' || type === 'star';
		const sinking = token?.extra?.sinking === true || token?.extra?.fall === true;
		return isCoinOrStar && sinking;
	}

	function slipTriggerStepForToken(token: { stepIndex?: unknown; type?: unknown; extra?: Record<string, unknown> }) {
		const tokenStep = Number(token?.stepIndex ?? 0);
		if (!Number.isFinite(tokenStep)) return 0;
		return tokenShouldSlipOnPreviousStep(token) ? tokenStep - 1 : tokenStep;
	}

	function slipTriggerRenderStepForToken(token: { stepIndex?: unknown; type?: unknown; extra?: Record<string, unknown> }) {
		const tokenStep = Number(token?.stepIndex ?? 0);
		const spawnDelay = Number(token?.extra?.spawnDelay ?? 0);
		const baseTrigger = pickupTriggerAt(tokenStep, String(token?.type ?? ''), spawnDelay);
		if (!tokenShouldSlipOnPreviousStep(token)) return baseTrigger + stepSpacing * SLIP_TRIGGER_DELAY_STEPS;
		const firstStepExtraLead = tokenStep <= 0 ? FIRST_STEP_SINKING_EXTRA_LEAD_STEPS : 0;
		return (
			baseTrigger -
			stepSpacing * (1 + PREVIOUS_STEP_SLIP_EXTRA_LEAD_STEPS + firstStepExtraLead) +
			stepSpacing * SLIP_TRIGGER_DELAY_STEPS
		);
	}

	function terminalSlipTriggerAtStep(entry: any, stepIndex: number) {
		return isSinkingCoinOrStarOnLandedPad(entry) ? stepIndex - 1 : stepIndex;
	}

	function createEmptyBridgeStep(previous: any, next: any, index: number) {
		const landedStep = oppositeLandedStep(previous?.landedStep ?? previous?.landedPad ?? 'LEFT');
		const shouldProxySlip = isSinkingCoinOrStarOnLandedPad(next);
		const leftPad = { stepType: 'ICE', item: 'NOTHING', sinking: false };
		const rightPad = { stepType: 'ICE', item: 'NOTHING', sinking: false };
		if (shouldProxySlip) {
			if (landedStep === 'LEFT') leftPad.sinking = true;
			else rightPad.sinking = true;
		}
	return {
		index,
		landedStep,
		steps: { LEFT: leftPad, RIGHT: rightPad },
		targetLane: null,
		skipTargeting: true,
		accumulatedWinAmount: Number(previous?.accumulatedWinAmount ?? 0),
		winAmount: 0,
		lifeVests: Number(previous?.lifeVests ?? 0),
			bananaCount: Number(previous?.bananaCount ?? 0),
			success: true,
			applies: true
		};
	}

	function transformRoundWithEmptyBridgeSteps(stateEvents: any[]) {
		const cloneRoundEntry = (entry: any) =>
			entry && typeof entry === 'object'
				? { ...entry }
				: entry;
		const gameplay = stateEvents.filter(isGameplayRoundEntry);
		const extras = stateEvents.filter((entry) => !isGameplayRoundEntry(entry));
		const transformed: any[] = [];
		for (let i = 0; i < gameplay.length; i += 1) {
			const current = cloneRoundEntry(gameplay[i]);
			current.index = transformed.length;
			transformed.push(current);
			const next = gameplay[i + 1];
			if (!next) continue;
			transformed.push(createEmptyBridgeStep(current, next, transformed.length));
		}
		for (const extra of extras) {
			const copy = cloneRoundEntry(extra);
			copy.index = transformed.length;
			transformed.push(copy);
		}
		return transformed;
	}


	function playSequencePads(stateEvents: any[]) {
		if (!Array.isArray(stateEvents) || !stateEvents.length) return;
		const transformedStateEvents = transformRoundWithEmptyBridgeSteps(stateEvents);
		runId += 1;
		const currentRun = runId;
		let summaryEvent: any = null;
		const vestPopSteps: number[] = [];
		const timeline: Array<{ step: number; value: number; hasLifering: boolean; bananaCount: number }> = [];
		let timelineValue = stakeAmount();
		let timelineLifering = false;
		let lastTimelineStep: number | null = null;
		resetRun(stakeAmount());

	const laneMap = LANE_MAP;

		for (const entry of transformedStateEvents) {
			if (entry?.type === 'finish') {
				summaryEvent = {
					result: entry.success === false ? 'slip' : 'goal',
					steps: Number(entry.totalSteps ?? steps),
					finalValue: Number(entry.totalWinAmount ?? currentValue * 100)
				};
				continue;
			}
			if (entry?.type === 'vestPopped') {
				const explicitStep = Number(entry.index ?? entry.stepIndex);
				let popStep: number = lastTimelineStep ?? 0;
				if (Number.isFinite(explicitStep)) {
					popStep =
						lastTimelineStep != null && explicitStep > lastTimelineStep
							? explicitStep - 1
							: explicitStep;
				}
				popStep = Math.max(0, popStep);
				timelineLifering = false;
				const previousBananaCount =
					timeline.length > 0 ? Number(timeline[timeline.length - 1]?.bananaCount ?? 0) : 0;
				timeline.push({
					step: popStep,
					value: timelineValue,
					hasLifering: false,
					bananaCount: previousBananaCount
				});
				vestPopSteps.push(popStep);
				lastTimelineStep = popStep;
				continue;
			}
			if (!entry.steps && !entry.pads) {
				continue;
			}
			const stepIndex = Number(entry.index ?? entry.stepIndex ?? 0);
			const landedKey = String(entry.landedStep ?? entry.landedPad ?? '');
			const landedLane = laneMap[landedKey.toUpperCase()] ?? -1;
			const applies = entry.applies !== false;
			const stepTargetLane = entry?.targetLane === null ? null : landedLane;
			const stepSkipTargeting = entry?.skipTargeting === true || stepTargetLane == null;

			if (typeof entry.accumulatedWinAmount === 'number') {
				// RGS accumulatedWinAmount is win-only; include base stake for total-round-value timeline.
				timelineValue = runStartValue + (stakeAmount() * entry.accumulatedWinAmount) / 100;
			}
			if (typeof entry.lifeVests === 'number') {
				timelineLifering = entry.lifeVests > 0;
			}

			timeline.push({
				step: stepIndex,
				value: timelineValue,
				hasLifering: timelineLifering,
				bananaCount: Number(entry.bananaCount ?? 0)
			});
			lastTimelineStep = stepIndex;

	const pads = (entry.steps || entry.pads || {}) as Record<string, unknown>;
	const padEntries = Object.entries(pads)
		.map(([padKey, pad]) => {
			const padData = pad && typeof pad === 'object' ? (pad as Record<string, unknown>) : {};
			const item = String(padData.item ?? padData.outcome ?? '').trim().toUpperCase();
			return { padKey, pad: padData, item };
		})
		.filter(({ item }) => item !== '');
	let padSequence: Array<[string, Record<string, unknown>]> = padEntries.map(({ padKey, pad }) => [padKey, pad]);
	let padSpawnIndex = 0;
	const leftItem = padEntries.find((entry) => String(entry.padKey).toUpperCase() === 'LEFT')?.item ?? '';
	const rightItem = padEntries.find((entry) => String(entry.padKey).toUpperCase() === 'RIGHT')?.item ?? '';
	const strictDualItemGap = !isNothingItemValue(leftItem) && !isNothingItemValue(rightItem);
	const minSlotGap = strictDualItemGap ? 2 : 1;
				const hasGoalPad = padEntries.some(({ item }) => item === 'GOAL');
	for (const [padKey, padData] of padSequence) {
					const lane = laneMap[String(padKey).toUpperCase()] ?? -1;
					const item = String(padData.item ?? padData.outcome ?? '');
					const padType =
						typeof padData.stepType === 'string'
							? padData.stepType
							: typeof padData.padType === 'string'
								? padData.padType
								: undefined;
					const normalized = item.trim().toUpperCase();
					const { type, extra } = parseOutcome(
						item,
						padType,
						padData.sinking === true
					);
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
				const forceOuterSinking = isHit && padData.sinking === true;
				const spawnLane = isHit
					? pickPathHitSpawnLane(lane, stepIndex, minSlotGap, forceOuterSinking)
					: pickSpawnLaneForStep(stepIndex, lane, false, minSlotGap);
				const spawnDelay = padSpawnIndex * SPAWN_DELAY_STEP;
				padSpawnIndex += 1;
				addToken(
					stepIndex,
					type,
					timelineValue,
					lane,
					isHit,
					{
						...padData,
						...(extra || {}),
						...(valueOverride != null ? { coinValue: valueOverride } : null),
						padKey,
						landedPad: landedKey,
						applies,
						targetLane: stepTargetLane,
						skipTargeting: stepSkipTargeting,
						lifeVests: entry.lifeVests,
						winAmount: entry.winAmount,
						accumulatedWinAmount: entry.accumulatedWinAmount,
						spawnLane,
						spawnDelay
					}
				);
			}

			if (entry.finish && applies) {
				if (!hasGoalPad) {
				addToken(
					stepIndex,
					'goal',
					timelineValue,
					landedLane,
					true,
					{ finish: true }
				);
				}
				summaryEvent = {
					result: 'goal',
					steps: stepIndex + 1,
					finalValue: Math.round(timelineValue * 100)
				};
			}
			if (entry.terminal === true && applies) {
				const terminalSuccess = entry.success === true || hasGoalPad;
				summaryEvent = summaryEvent ?? {
					result: terminalSuccess ? 'goal' : 'slip',
					steps: stepIndex + 1,
					triggerAtStep: terminalSuccess ? stepIndex : terminalSlipTriggerAtStep(entry, stepIndex),
					finalValue: Math.round(timelineValue * 100)
				};
			}
		}

	stepStates = timeline;
	setPendingVestPopSteps(vestPopSteps);

		animationActive = false;
		animationStatus = 'running';
		const computedMax = Math.max(6, ...tokens.map((t) => t.stepIndex));
		addCosmeticTail(computedMax);
		buildLanePath();
		const firstHit = tokens
			.filter((t) => t.hit && tokenMatchesLandedStep(t) && tokenCanDriveTargeting(t))
			.sort((a, b) => a.stepIndex - b.stepIndex)[0];
		if (firstHit) {
			penguinTargetLane = targetLaneForToken(firstHit);
			penguinOffsetFrac = Number(firstHit.extra?.offsetFrac ?? 0);
		}
		const slipVisibleEnd = slipStepIndex != null ? slipStepIndex + 1 : null;
		const endStepTarget =
			slipVisibleEnd != null
				? slipVisibleEnd
				: summaryEvent?.steps != null
					? summaryEvent.steps + 1
					: computedMax;
		const maxStep = Math.max(2, endStepTarget * stepSpacing);
		const startStep = renderStep;
		const endStep = maxStep + 0.2;
		let scrollStart: number | null = null;
			let lastNow = performance.now();
			let lastScrollNow = lastNow;
			let scrollSteps = 0;
			const baseStepPerMs = 0.117 * speedFactor * PICKUP_STEP_PACE_MULTIPLIER * PICKUP_TRAVEL_SPEED * DEBUG_GAME_SPEED_MULT;

		function smoothTick(now: number) {
			if (currentRun != runId) return;
			if (stopRunEarly || freezeMovement) {
				markRoundEnded();
				return;
			}
			if (!autoScrollActive && animationStatus === 'running') {
				const slideInElapsed = performance.now() - slideInStart;
				if (penguinAnim !== 'slide_in' || slideInElapsed > 700) {
					startAutoScroll();
				}
			}
			if (scrollStart === null) {
				if (!autoScrollActive) {
					lastNow = now;
					requestAnimationFrame(smoothTick);
					return;
				}
				scrollStart = now;
				lastScrollNow = now;
			}
			const dtMs = Math.min(40, Math.max(0, now - lastScrollNow));
			lastScrollNow = now;
			const stepSpeed = baseStepPerMs;
			slideTimeScale = 1.2;
				scrollSteps += (stepSpeed / stepSpacing) * dtMs;
				renderStep = Math.min(endStep, startStep + scrollSteps * stepSpacing);
				iceScroll += (stepSpeed / Math.max(0.01, PICKUP_TRAVEL_SPEED)) * dtMs * 1.15;
				updateIceVisibility();
				const currentStep = Math.max(0, Math.floor(renderStep / stepSpacing + 0.001));
				consumePendingVestPops(currentStep);
				updateWobbleRiskForStep(currentStep);
				const runProgress = Math.min(1, (renderStep - startStep) / (endStep - startStep));
			if (runEndRenderStep != null && renderStep >= runEndRenderStep) {
				stopRunEarly = true;
				freezeMovement = true;
				autoScrollActive = false;
				markRoundEnded();
			}
			const stepPerMs = stepSpeed;

			if (tokens.length) {
				let updated = false;
				let popupText = '';
				let popupX = viewport.w * 0.5;
				let popupY = viewport.h * 0.72;
			const currentPenguinPose = penguinPose();
			const pendingGoalStep = tokens
				.filter((entry) => entry.hit && !entry.activate && entry.type === 'goal')
				.map((entry) => Number(entry.stepIndex))
				.sort((a, b) => a - b)[0];
			const next = tokens.map((token) => {
				const band = pickupBandState(token, currentPenguinPose);
				const autoCollectNothing = shouldAutoCollectNothing(token, band, currentPenguinPose);
				const hasVestProtection = tokenHasSlipProtection(token);
				const goalPriorityActive =
					Number.isFinite(pendingGoalStep) &&
					token.type !== 'goal' &&
					Number(token.stepIndex) >= Number(pendingGoalStep);
				const shouldPreSlip =
					status === 'sliding' &&
					!hasVestProtection &&
					!slipTriggered &&
					!freezeMovement &&
					!goalPriorityActive &&
					shouldPreSlipBeforePickup(token, band, currentPenguinPose);
				const forcePreviousStepCoinStarSlip =
					status === 'sliding' &&
					!hasVestProtection &&
					!slipTriggered &&
					!freezeMovement &&
					!goalPriorityActive &&
					tokenShouldSlipOnPreviousStep(token) &&
					renderStep >= slipTriggerRenderStepForToken(token);
				if (forcePreviousStepCoinStarSlip) {
					const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
					beginSlip(
						slipTriggerStepForToken(token),
						slipSourceLane,
						Number(token.extra?.offsetFrac ?? 0),
						true,
						true
					);
					return token;
				}
				if (shouldPreSlip) {
					const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
					beginSlip(
						slipTriggerStepForToken(token),
						slipSourceLane,
						Number(token.extra?.offsetFrac ?? 0),
						true,
						true
					);
					return token;
				}
					const meetsPenguinBand = Boolean(band?.inActivateBand ?? false) || Boolean(band?.passedBand ?? false);
					const isNothingToken = isNothingTokenType(token.type);
					const triggerReached =
						renderStep >=
						pickupTriggerAt(
							Number(token.stepIndex),
							String(token.type ?? ''),
							Number(token.extra?.spawnDelay ?? 0)
						);
					const forceResolveStaleHit =
						!isNothingToken &&
						token.hit &&
						renderStep >=
							pickupTriggerAt(
								Number(token.stepIndex),
								String(token.type ?? ''),
								Number(token.extra?.spawnDelay ?? 0)
							) +
								Math.max(14, stepSpacing * 0.04);
					const forceActivateOnTargetLane =
						!isNothingToken &&
						token.hit &&
						tokenMatchesLandedStep(token) &&
						(meetsPenguinBand || triggerReached);
					const canActivateThisToken = isNothingToken
						? autoCollectNothing || Boolean(band?.passedBand)
						: meetsPenguinBand || forceActivateOnTargetLane || forceResolveStaleHit;
					if (
						status === 'sliding' &&
						!token.activate &&
						token.hit &&
						canActivateThisToken
					) {
						const stepIndex = Number(token.stepIndex);
						const depth = band?.depth ?? 0.2;
						const spawnLane = band?.spawnLane ?? Number(token.extra?.spawnLane ?? token.lane);
						const pos = band?.pos ?? pickupPosition(token.stepIndex, token.lane, spawnLane);
						const sinkingSlip = token.extra?.sinking === true || token.extra?.fall === true;
							const shouldSlipBeforePickup =
								sinkingSlip &&
								!hasVestProtection &&
								!goalPriorityActive &&
								(token.type === 'coin' || token.type === 'star') &&
								(band?.approachingBand ?? false);
							if (shouldSlipBeforePickup) {
								const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
								beginSlip(
									slipTriggerStepForToken(token),
									slipSourceLane,
									Number(token.extra?.offsetFrac ?? 0),
									true,
									true
								);
								return token;
							}
							updated = true;
							playPickupSound(token);
							popupText = t('hit', { token: token.type.toUpperCase() });
						popupX = pos?.x ?? viewport.w * 0.5;
						popupY = pos?.y ?? viewport.h * 0.72;
					const shouldApplyValue = tokenUpdatesAccumulatedValue(token);
					const prevValue = shouldApplyValue ? valueAtStep(stepIndex - 1) : currentValue;
					const currentStepValue = shouldApplyValue ? valueAtStep(stepIndex) : currentValue;
						if (shouldApplyValue) {
							currentValue = currentStepValue;
							displayValue = currentStepValue;
							updateRoundWinDisplay(currentStepValue);
							lastDisplayStep = stepIndex;
							hitDelta = currentStepValue - prevValue;
					} else {
						hitDelta = 0;
					}
						if (token.type !== 'empty') {
							pickupCount += 1;
							lastPickupRenderStep = renderStep;
							lastPickupLane = targetLaneForToken(token);
						}
						penguinOffsetFrac = Number(token.extra?.offsetFrac ?? 0);
						const nextToken = nextPendingHitToken(stepIndex, token.id);
						if (nextToken) {
							penguinOffsetFrac = Number(nextToken.extra?.offsetFrac ?? 0);
						}
						const nextTargetToken = nextTargetableHitToken(stepIndex, token.id);
						setLockedTargetToken(nextTargetToken?.id ?? null, performance.now(), true);
						let effect = token.type;
						const bananaSaved = token.type === 'banana' && hasVestProtection;
						const terminalSlipAtThisHit =
							summaryEvent?.result === 'slip' &&
							Number(summaryEvent?.steps ?? Number.NaN) === stepIndex + 1;
						const slipAfterPickup =
							sinkingSlip &&
							!hasVestProtection &&
							!goalPriorityActive &&
							isNearEdgeForSlip(band, currentPenguinPose);
						if (token.type === 'banana') {
							const loss = bananaLossAmount(prevValue, currentStepValue, token, bananaSaved);
							if (loss >= 0) showBananaLossFloat(loss);
						}
						if (token.type === 'banana') {
							playOneShot('pickup_banana');
						}
						if (terminalSlipAtThisHit && !slipTriggered && !freezeMovement) {
							const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
							beginSlip(
								slipTriggerStepForToken(token),
								slipSourceLane,
								Number(token.extra?.offsetFrac ?? 0),
								true,
								false
							);
						} else if (slipAfterPickup) {
							if (token.type === 'banana') {
								wobbleBoost = Math.min(1.4, wobbleBoost + 0.55);
								}
						const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
						beginSlip(
							slipTriggerStepForToken(token),
							slipSourceLane,
							Number(token.extra?.offsetFrac ?? 0),
							true,
							false
						);
						} else if (sinkingSlip && hasVestProtection) {
							clearLiferingState(stepIndex, true);
						}
						if (token.type === 'lifering') {
							hasLifering = true;
							penguinSkin = 'vest';
							vestAnim = 'gain';
							vestAnimKey += 1;
						}
							if (token.type === 'goal') {
								playOneShot('penguin_finish');
								startWinAmountPulse();
								status = 'goal';
								penguinAnim = 'win';
								laneFreeze = true;
								penguinOffsetFrac = 0;
								penguinSkidRotation = 0;
								const stopStep = renderStep;
								stopRunEarly = true;
								freezeMovement = true;
								autoScrollActive = false;
								targetStep = renderStep;
								animationActive = false;
								markRoundEnded();
								runEndRenderStep = stopStep;
								if (!endRoundTriggered) {
									endRoundTriggered = true;
									endRound();
								}
							}
						const destroyDelay = destroyDelayForTokenType(token.type);
						const activationNow = performance.now();
						const lockReleaseAt = isNothingTokenType(token.type)
							? activationNow
							: activationNow + destroyDelay;
						schedulePostDestroyTeleport(
							stepIndex,
							token.id,
							targetLaneForToken(token),
							destroyDelay,
							activationNow
						);
						scheduleTokenRemoval(token.id, destroyDelay);
						return {
							...token,
							activate: true,
							effect,
							extra: {
								...(token.extra ?? {}),
								activatedAt: activationNow,
								activatedDepth: depth,
								activatedLane: spawnLane,
								lockReleaseAt
							}
						};
					}
					return token;
				});
				tokens = next;
				if (updated) {
					hitPopup = { text: popupText, x: popupX, y: popupY, until: performance.now() + 3000 };
				}
			}

		const upcoming = tokens
			.filter((t) => !t.activate)
			.map((t) => ({
				t,
				trigger: pickupTriggerAt(
					t.stepIndex,
					t.type,
					Number(t.extra?.spawnDelay ?? 0)
				)
			}))
			.sort((a, b) => (a.t.stepIndex === b.t.stepIndex ? a.t.id - b.t.id : a.t.stepIndex - b.t.stepIndex));
			const hitUpcoming = upcoming.filter((e) => isTargetableHitToken(e.t));
			const candidateHits = hitUpcoming;
			const nowMs = performance.now();
			const pendingHit = candidateHits[0];
			const preStepFreeRoam = shouldUsePreStepFreeRoam(pendingHit);
			updateFirstApproachLock(pendingHit, preStepFreeRoam);
			if (!preStepFreeRoam) {
				setLockedTargetToken(pendingHit ? pendingHit.t.id : null, nowMs, true);
			}
			if (!pendingHit) centerLockPendingTokenId = null;
				const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
				lastNow = now;
				maybeApplyPostDestroyTeleport(nowMs);

			if (!freezeMovement && status === 'sliding') {
					const targetPlan = planSlidingTargetLane(
						nowMs,
						dt,
						pendingHit,
						preStepFreeRoam,
						stepPerMs
					);
				penguinTargetLane = targetPlan.lane;
				if (DISABLE_PENGUIN_SLIDE_MOTION && preStepFreeRoam) {
					setPenguinLane(targetPlan.lane);
					laneVelocity = 0;
				}
				penguinOffsetFrac = 0;
				penguinSkidRotation = 0;
				lockCenterStrict = targetPlan.shouldCenterLock;
				maybePlayTurnSound(penguinTargetLane);
				smoothPenguinLaneTowardTarget(dt);
			} else {
				lockCenterStrict = false;
				laneVelocity = 0;
			pickupSkidScale = 1;
			penguinSkidRotation = 0;
		}
			wobbleTime += dt;
			wobbleBoost = Math.max(0, wobbleBoost - dt * 0.7);
		updateCtrlTurnTilt(dt, false);
			let summarySlipStepIndex = Number.NaN;
			if (summaryEvent?.result === 'slip') {
				const explicitTriggerStep = Number(summaryEvent?.triggerAtStep);
				if (Number.isFinite(explicitTriggerStep)) {
					summarySlipStepIndex = Math.max(-1, explicitTriggerStep);
				} else {
					const summarySteps = Number(summaryEvent?.steps);
					if (Number.isFinite(summarySteps)) {
						summarySlipStepIndex = Math.max(-1, summarySteps - 1);
					}
				}
			}
			if (
				!slipTriggered &&
				!freezeMovement &&
				Number.isFinite(summarySlipStepIndex) &&
				renderStep >= summarySlipStepIndex * stepSpacing
			) {
				const summarySlipToken = tokens
					.filter((entry) => entry.hit && !entry.activate && Number(entry.stepIndex) <= summarySlipStepIndex + 1)
					.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0];
				const slipSourceLane = summarySlipToken
					? isNothingTokenType(summarySlipToken.type)
						? penguinLane
						: summarySlipToken.lane
					: penguinLane;
				const slipOffset = summarySlipToken ? Number(summarySlipToken.extra?.offsetFrac ?? 0) : 0;
				beginSlip(Math.floor(summarySlipStepIndex), slipSourceLane, slipOffset, true, false);
				return;
			}
			if (runProgress < 1) {
				requestAnimationFrame(smoothTick);
			} else if (summaryEvent) {
				status = summaryEvent.result === 'goal' ? 'goal' : 'slip';
				penguinAnim = status === 'goal' ? 'win' : 'slide_idle';
				steps = Number(summaryEvent.steps ?? steps);
					if (!hasPendingValuePickup()) {
						currentValue = (summaryEvent.finalValue ?? currentValue * 100) / 100;
						displayValue = currentValue;
						updateRoundWinDisplay(currentValue);
					}
				markRoundEnded();
				stopRunEarly = true;
				freezeMovement = true;
				autoScrollActive = false;
				if (summaryEvent.result === 'goal' && !endRoundTriggered) {
					startWinAmountPulse();
					endRoundTriggered = true;
					endRound();
				}
				if (summaryEvent.result === 'slip' && !slipTriggered) {
					slipTriggered = true;
					const triggerStep = Number(summaryEvent.triggerAtStep);
					slipStepIndex =
						slipStepIndex ??
						(Number.isFinite(triggerStep) ? triggerStep : Number(summaryEvent.steps ?? steps));
				}
				if (summaryEvent.result !== 'goal') {
					clearLiferingState(
						Number.isFinite(Number(summaryEvent.steps)) ? Number(summaryEvent.steps) : null,
						true
					);
				}
				if (summaryEvent.result === 'slip' && slipTriggered && !slipAnimationStarted) {
					triggerSlipAnimation();
				}
			} else {
				status = 'idle';
				markRoundEnded();
				autoScrollActive = false;
			}
		}
		requestAnimationFrame(smoothTick);
	}

	function playSequence(bookEvents: any[]) {
		if (!Array.isArray(bookEvents)) return;
		if (bookEvents.length && (bookEvents[0]?.pads || bookEvents[0]?.steps)) {
			playSequencePads(bookEvents);
			return;
		}
		runId += 1;
		const currentRun = runId;
		let summaryEvent: any = null;
		const vestPopSteps: number[] = [];
		const timeline: Array<{ step: number; value: number; hasLifering: boolean; bananaCount: number }> = [];
		let timelineValue = 1;
		let timelineLifering = false;
		resetRun(1);
		for (const event of bookEvents) {
			if (event.type === 'slideStart') {
				const startValue = (event.startingValue ?? 100) / 100;
				resetRun(startValue);
				timelineValue = startValue;
				timelineLifering = false
				continue;
			}
			if (event.type === 'tileResult') {
				const hitType = String(event.hitType ?? event.tileType ?? '');
				lastHitType = hitType;
				const eventSavedByVest =
					Boolean(event.savedByLifering) || Number(event.lifeVests ?? 0) > 0;
				if (event.hitType === 'banana' && event.fall === true && !eventSavedByVest) {
					slipTriggered = true;
					slipStepIndex = Number(event.stepIndex);
				}
					const laneOffsetRaw =
						typeof event.laneOffset === 'number' ? Number(event.laneOffset) : -1;
					const laneSide = nearestLane(laneOffsetRaw);
					const laneIndex = targetLineIndexForOffset(laneOffsetRaw);
					const mappedLane = laneOffsetForTargetIndex(laneIndex);
					const laneOffset = mappedLane ?? nearestLane(laneOffsetRaw);
					penguinTargetLane = clampPenguinLane(laneOffset);
			if (typeof event.value === 'number') {
				timelineValue = event.value / 100;
			}
				if (hitType === 'lifering') timelineLifering = true;
				if (event.savedByLifering) timelineLifering = false;
				timeline.push({
					step: Number(event.stepIndex),
					value: timelineValue,
					hasLifering: timelineLifering,
					bananaCount: Number(event.bananaCount ?? 0)
					});
					const baseItems = Array.isArray(event.items)
						? [...event.items]
						: [{ type: event.tileType ?? 'empty', lane: laneSide, value: event.value }];
				const leftBaseItem = baseItems.find((item) => Number(item?.lane) < 0);
				const rightBaseItem = baseItems.find((item) => Number(item?.lane) >= 0);
				const leftBaseType = String(leftBaseItem?.type ?? '').trim().toUpperCase();
				const rightBaseType = String(rightBaseItem?.type ?? '').trim().toUpperCase();
				const strictDualItemGap = !isNothingItemValue(leftBaseType) && !isNothingItemValue(rightBaseType);
				const minSlotGap = strictDualItemGap ? 2 : 1;
				const eventStepIndex = Number(event.stepIndex);
				let itemSpawnIndex = 0;
					for (const item of baseItems) {
						const itemLane =
							typeof item.lane === 'number' ? nearestLane(item.lane) : laneSide;
						const isHit =
							Number(itemLane ?? laneSide) === laneSide && String(item.type) === hitType;
					const forceOuterSinking =
						isHit &&
						((item as Record<string, unknown> | null)?.sinking === true || event.sinking === true);
						const spawnLane = isHit
							? pickPathHitSpawnLane(
								Number(itemLane ?? laneSide),
								eventStepIndex,
								minSlotGap,
								forceOuterSinking
							)
							: pickSpawnLaneForStep(eventStepIndex, Number(itemLane ?? laneSide), false, minSlotGap);
					const spawnDelay = itemSpawnIndex * SPAWN_DELAY_STEP;
					itemSpawnIndex += 1;
					const tokenExtra = {
						...(isHit ? { ...item, ...event } : item),
						spawnLane,
						spawnDelay
					};
					addToken(
							eventStepIndex,
							String(item.type),
							(event.value ?? 0) / 100,
							Number(itemLane ?? laneSide),
							isHit,
							tokenExtra
						);
				}
				continue;
			}
			if (event.type === 'vestPopped') {
				const popStep = Number(event.index ?? event.stepIndex);
				if (Number.isFinite(popStep)) vestPopSteps.push(popStep);
				continue;
			}
			if (event.type === 'slideSummary') {
				summaryEvent = event;
				continue;
			}
			if (event.type === 'winInfo') {
				if (event.totalWin != null) lastWin = event.totalWin / 100;
				continue;
			}
			if (event.type === 'finalWin') {
				if (typeof event.amount === 'number') lastWin = event.amount / 100;
				continue;
			}
		}
		stepStates = timeline;
		setPendingVestPopSteps(vestPopSteps);

		animationActive = false;
		animationStatus = 'running';
		const computedMax = Math.max(6, ...tokens.map((t) => t.stepIndex));
		addCosmeticTail(computedMax);
	const firstHit = tokens
		.filter((t) => t.hit && tokenMatchesLandedStep(t) && tokenCanDriveTargeting(t))
		.sort((a, b) => a.stepIndex - b.stepIndex)[0];
	if (firstHit) {
		penguinTargetLane = targetLaneForToken(firstHit);
		penguinOffsetFrac = Number(firstHit.extra?.offsetFrac ?? 0);
	}
		const slipVisibleEnd = slipStepIndex != null ? slipStepIndex + 1 : null;
		const endStepTarget =
			slipVisibleEnd != null
				? slipVisibleEnd
				: summaryEvent?.steps != null
					? summaryEvent.steps + 1
					: computedMax;
	const maxStep = Math.max(2, endStepTarget * stepSpacing);
	const startStep = renderStep;
	const endStep = maxStep + 0.2;
	let scrollStart: number | null = null;
	let lastNow = performance.now();
	let lastScrollNow = lastNow;
	let scrollSteps = 0;
	const baseStepPerMs = 0.117 * speedFactor * PICKUP_STEP_PACE_MULTIPLIER * PICKUP_TRAVEL_SPEED * DEBUG_GAME_SPEED_MULT;
	function smoothTick(now: number) {
		if (currentRun != runId) return;
		if (stopRunEarly || freezeMovement) {
			markRoundEnded();
			return;
		}
		if (!autoScrollActive && animationStatus === 'running') {
			const slideInElapsed = performance.now() - slideInStart;
			if (penguinAnim !== 'slide_in' || slideInElapsed > 700) {
				startAutoScroll();
			}
		}
		if (scrollStart === null) {
			if (!autoScrollActive) {
				lastNow = now;
				requestAnimationFrame(smoothTick);
				return;
			}
			scrollStart = now;
			lastScrollNow = now;
		}
		const dtMs = Math.min(40, Math.max(0, now - lastScrollNow));
		lastScrollNow = now;
		const stepSpeed = baseStepPerMs;
		slideTimeScale = 1.2;
		scrollSteps += (stepSpeed / stepSpacing) * dtMs;
		renderStep = Math.min(endStep, startStep + scrollSteps * stepSpacing);
		iceScroll += (stepSpeed / Math.max(0.01, PICKUP_TRAVEL_SPEED)) * dtMs * 1.15;
		updateIceVisibility();
		const currentStep = Math.max(0, Math.floor(renderStep / stepSpacing + 0.001));
		consumePendingVestPops(currentStep);
		const runProgress = Math.min(1, (renderStep - startStep) / (endStep - startStep));
		if (runEndRenderStep != null && renderStep >= runEndRenderStep) {
			stopRunEarly = true;
			freezeMovement = true;
			autoScrollActive = false;
			markRoundEnded();
		}
		const stepPerMs = stepSpeed;
		if (tokens.length) {
			let updated = false;
			let popupText = '';
			let popupX = viewport.w * 0.5;
			let popupY = viewport.h * 0.72;
			const currentPenguinPose = penguinPose();
			const pendingGoalStep = tokens
				.filter((entry) => entry.hit && !entry.activate && entry.type === 'goal')
				.map((entry) => Number(entry.stepIndex))
				.sort((a, b) => a - b)[0];
			const next = tokens.map((token) => {
					const band = pickupBandState(token, currentPenguinPose);
					const autoCollectNothing = shouldAutoCollectNothing(token, band, currentPenguinPose);
					const hasVestProtection = tokenHasSlipProtection(token);
					const goalPriorityActive =
						Number.isFinite(pendingGoalStep) &&
						token.type !== 'goal' &&
						Number(token.stepIndex) >= Number(pendingGoalStep);
					const shouldPreSlip =
						status === 'sliding' &&
						!hasVestProtection &&
						!slipTriggered &&
						!freezeMovement &&
						!goalPriorityActive &&
							shouldPreSlipBeforePickup(token, band, currentPenguinPose);
					const forcePreviousStepCoinStarSlip =
						status === 'sliding' &&
						!hasVestProtection &&
						!slipTriggered &&
						!freezeMovement &&
						!goalPriorityActive &&
						tokenShouldSlipOnPreviousStep(token) &&
						renderStep >= slipTriggerRenderStepForToken(token);
					if (forcePreviousStepCoinStarSlip) {
						const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
						beginSlip(
							slipTriggerStepForToken(token),
							slipSourceLane,
							Number(token.extra?.offsetFrac ?? 0),
							true,
							true
						);
						return token;
					}
					if (shouldPreSlip) {
						const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
						beginSlip(
							slipTriggerStepForToken(token),
							slipSourceLane,
							Number(token.extra?.offsetFrac ?? 0),
							true,
							true
						);
						return token;
					}
						const meetsPenguinBand = Boolean(band?.inActivateBand ?? false) || Boolean(band?.passedBand ?? false);
						const isNothingToken = isNothingTokenType(token.type);
						const triggerReached =
							renderStep >=
							pickupTriggerAt(
								Number(token.stepIndex),
								String(token.type ?? ''),
								Number(token.extra?.spawnDelay ?? 0)
							);
						const forceResolveStaleHit =
							!isNothingToken &&
							token.hit &&
							renderStep >=
								pickupTriggerAt(
									Number(token.stepIndex),
									String(token.type ?? ''),
									Number(token.extra?.spawnDelay ?? 0)
								) +
									Math.max(14, stepSpacing * 0.04);
						const forceActivateOnTargetLane =
							!isNothingToken &&
							token.hit &&
							tokenMatchesLandedStep(token) &&
							(meetsPenguinBand || triggerReached);
						const canActivateThisToken = isNothingToken
							? autoCollectNothing || Boolean(band?.passedBand)
							: meetsPenguinBand || forceActivateOnTargetLane || forceResolveStaleHit;
						if (
							status === 'sliding' &&
							!token.activate &&
							token.hit &&
							canActivateThisToken
						) {
						const stepIndex = Number(token.stepIndex);
						const depth = band?.depth ?? 0.2;
						const spawnLane = band?.spawnLane ?? Number(token.extra?.spawnLane ?? token.lane);
						const pos = band?.pos ?? pickupPosition(token.stepIndex, token.lane, spawnLane);
						const sinkingSlip = token.extra?.sinking === true || token.extra?.fall === true;
							const shouldSlipBeforePickup =
								sinkingSlip &&
								!hasVestProtection &&
								!goalPriorityActive &&
								(token.type === 'coin' || token.type === 'star') &&
								(band?.approachingBand ?? false);
						if (shouldSlipBeforePickup) {
							const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
							beginSlip(
								slipTriggerStepForToken(token),
								slipSourceLane,
								Number(token.extra?.offsetFrac ?? 0),
								true,
								true
							);
							return token;
						}
						updated = true;
						playPickupSound(token);
						popupText = t('hit', { token: token.type.toUpperCase() });
					popupX = pos?.x ?? viewport.w * 0.5;
					popupY = pos?.y ?? viewport.h * 0.72;
					const shouldApplyValue = tokenUpdatesAccumulatedValue(token);
					const prevValue = shouldApplyValue ? valueAtStep(stepIndex - 1) : currentValue;
					const currentStepValue = shouldApplyValue ? valueAtStep(stepIndex) : currentValue;
						if (shouldApplyValue) {
							currentValue = currentStepValue;
							displayValue = currentStepValue;
							updateRoundWinDisplay(currentStepValue);
							lastDisplayStep = stepIndex;
							hitDelta = currentStepValue - prevValue;
					} else {
						hitDelta = 0;
					}
						if (token.type !== 'empty') {
							pickupCount += 1;
							lastPickupRenderStep = renderStep;
							lastPickupLane = targetLaneForToken(token);
						}
						penguinOffsetFrac = Number(token.extra?.offsetFrac ?? 0);
					const nextToken = nextPendingHitToken(stepIndex, token.id);
					if (nextToken) {
						penguinOffsetFrac = Number(nextToken.extra?.offsetFrac ?? 0);
					}
					const nextTargetToken = nextTargetableHitToken(stepIndex, token.id);
					setLockedTargetToken(nextTargetToken?.id ?? null, performance.now(), true);
					let effect = token.type;
						const bananaSaved = token.type === 'banana' && hasVestProtection;
					const terminalSlipAtThisHit =
						summaryEvent?.result === 'slip' &&
						Number(summaryEvent?.steps ?? Number.NaN) === stepIndex + 1;
					if (token.type === 'banana') {
						const loss = bananaLossAmount(prevValue, currentStepValue, token, bananaSaved);
						if (loss >= 0) showBananaLossFloat(loss);
					}
					if (token.type === 'banana') {
						playOneShot('pickup_banana');
					}
					if (terminalSlipAtThisHit && !slipTriggered && !freezeMovement) {
						const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
						beginSlip(
							slipTriggerStepForToken(token),
							slipSourceLane,
							Number(token.extra?.offsetFrac ?? 0),
							true,
							false
						);
					} else if (sinkingSlip && !goalPriorityActive && isNearEdgeForSlip(band, currentPenguinPose)) {
							if (token.type === 'banana') {
								wobbleBoost = Math.min(1.4, wobbleBoost + 0.55);
								}
						if (hasVestProtection) {
							clearLiferingState(stepIndex, true);
						} else {
							const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
							beginSlip(
								slipTriggerStepForToken(token),
								slipSourceLane,
								Number(token.extra?.offsetFrac ?? 0),
								true,
								false
							);
						}
					}
						if (token.type === 'goal') {
							playOneShot('penguin_finish');
							startWinAmountPulse();
							status = 'goal';
							penguinAnim = 'win';
							laneFreeze = true;
							penguinOffsetFrac = 0;
							penguinSkidRotation = 0;
							liferingPickedStep = null;
							const stopStep = renderStep;
							stopRunEarly = true;
							freezeMovement = true;
							autoScrollActive = false;
							targetStep = renderStep;
							animationActive = false;
							markRoundEnded();
							runEndRenderStep = stopStep;
							if (!endRoundTriggered) {
								endRoundTriggered = true;
								endRound();
							}
						}
					if (token.type === 'lifering') {
						vestAnim = 'gain';
						vestAnimKey += 1;
						hasLifering = true;
						penguinSkin = 'vest';
						
					}
					if (bananaSaved) {
						clearLiferingState(stepIndex, true);
					}
					if (token.type === 'coin') {
						const cv = token.extra?.coinValue ?? token.extra?.value ?? 0;
						effect = `coin +${cv}`;
					} else if (token.type === 'star') {
						const mult = token.extra?.multiplier ?? 1;
						effect = `star x${mult}`;
					} else if (token.type === 'banana') {
						if (bananaSaved) effect = 'banana (saved)';
						else if (token.extra?.fall) effect = 'banana slip';
						else if (token.extra?.lostHalf) effect = 'banana -50%';
					}
					
					const destroyDelay = destroyDelayForTokenType(token.type);
					const activationNow = performance.now();
					const lockReleaseAt = isNothingTokenType(token.type)
						? activationNow
						: activationNow + destroyDelay;
					schedulePostDestroyTeleport(
						stepIndex,
						token.id,
						targetLaneForToken(token),
						destroyDelay,
						activationNow
					);
					scheduleTokenRemoval(token.id, destroyDelay);
					return {
						...token,
						activate: true,
						extra: {
							...(token.extra ?? {}),
							activatedAt: activationNow,
							activatedDepth: depth,
							activatedLane: spawnLane,
							lockReleaseAt
						}
					};
				}
				return token;
			});
			if (updated) {
				tokens = next;
				
				hitPopup = { text: popupText, until: performance.now() + 3000, x: popupX, y: popupY };
			}
		}
			if (stepStates.length) updateWobbleRiskForStep(currentStep);
		// Keep non-hit pickups visible until they are truly out of the play area.
		// Trigger-based cleanup removes early steps too soon because trigger lead is intentionally early.
		const lateHideWindow = stepSpacing * 0.2;
		tokens = tokens.filter((t) => {
			if (t.activate) return true;
			const relative = t.stepIndex * stepSpacing - renderStep;
			return relative >= -lateHideWindow;
		});
				const upcoming = tokens
					.filter((t) => !t.activate)
					.map((t) => ({
					t,
					trigger: pickupTriggerAt(
						t.stepIndex,
						t.type,
						Number(t.extra?.spawnDelay ?? 0)
					)
				}))
				.sort((a, b) => (a.t.stepIndex === b.t.stepIndex ? a.t.id - b.t.id : a.t.stepIndex - b.t.stepIndex));
		const hitUpcoming = upcoming.filter((e) => isTargetableHitToken(e.t));
		const candidateHits = hitUpcoming;
		const nowMs = performance.now();
		const pendingHit = candidateHits[0];
		const preStepFreeRoam = shouldUsePreStepFreeRoam(pendingHit);
		updateFirstApproachLock(pendingHit, preStepFreeRoam);
		if (!preStepFreeRoam) {
			setLockedTargetToken(pendingHit ? pendingHit.t.id : null, nowMs, true);
		}
		if (!pendingHit) centerLockPendingTokenId = null;
		const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
		lastNow = now;
		maybeApplyPostDestroyTeleport(nowMs);
		if (!freezeMovement && status === 'sliding') {
			const targetPlan = planSlidingTargetLane(
				nowMs,
				dt,
				pendingHit,
				preStepFreeRoam,
				stepPerMs
			);
			penguinTargetLane = targetPlan.lane;
			if (DISABLE_PENGUIN_SLIDE_MOTION && preStepFreeRoam) {
				setPenguinLane(targetPlan.lane);
				laneVelocity = 0;
			}
			penguinOffsetFrac = 0;
			penguinSkidRotation = 0;
			lockCenterStrict = targetPlan.shouldCenterLock;
			maybePlayTurnSound(penguinTargetLane);
			smoothPenguinLaneTowardTarget(dt);
		} else {
			lockCenterStrict = false;
			laneVelocity = 0;
			pickupSkidScale = 1;
			penguinSkidRotation = 0;
		}
		wobbleTime += dt;
		wobbleBoost = Math.max(0, wobbleBoost - dt * 0.7);
		updateCtrlTurnTilt(dt, false);
		let summarySlipStepIndex = Number.NaN;
		if (summaryEvent?.result === 'slip') {
			const explicitTriggerStep = Number(summaryEvent?.triggerAtStep);
			if (Number.isFinite(explicitTriggerStep)) {
				summarySlipStepIndex = Math.max(-1, explicitTriggerStep);
			} else {
				const summarySteps = Number(summaryEvent?.steps);
				if (Number.isFinite(summarySteps)) {
					summarySlipStepIndex = Math.max(-1, summarySteps - 1);
				}
			}
		}
		if (
			!slipTriggered &&
			!freezeMovement &&
			Number.isFinite(summarySlipStepIndex) &&
			renderStep >= summarySlipStepIndex * stepSpacing
		) {
			const summarySlipToken = tokens
				.filter((entry) => entry.hit && !entry.activate && Number(entry.stepIndex) <= summarySlipStepIndex + 1)
				.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0];
			const slipSourceLane = summarySlipToken
				? isNothingTokenType(summarySlipToken.type)
					? penguinLane
					: summarySlipToken.lane
				: penguinLane;
			const slipOffset = summarySlipToken ? Number(summarySlipToken.extra?.offsetFrac ?? 0) : 0;
			beginSlip(Math.floor(summarySlipStepIndex), slipSourceLane, slipOffset, true, false);
			return;
		}
		if (runProgress < 1) {
			requestAnimationFrame(smoothTick);
		} else if (summaryEvent) {
			status = summaryEvent.result === 'goal' ? 'goal' : 'slip';
			penguinAnim = status === 'goal' ? 'win' : 'slide_idle';
			steps = Number(summaryEvent.steps ?? steps);
				if (!hasPendingValuePickup()) {
					currentValue = (summaryEvent.finalValue ?? currentValue * 100) / 100;
					displayValue = currentValue;
					updateRoundWinDisplay(currentValue);
				}
			markRoundEnded();
			stopRunEarly = true;
			autoScrollActive = false;
			if (summaryEvent.result === 'goal' && !endRoundTriggered) {
				startWinAmountPulse();
				endRoundTriggered = true;
				endRound();
			}
			if (summaryEvent.result === 'slip' && !slipTriggered) {
				slipTriggered = true;
				const triggerStep = Number(summaryEvent.triggerAtStep);
				slipStepIndex =
					slipStepIndex ??
					(Number.isFinite(triggerStep) ? triggerStep : Number(summaryEvent.steps ?? steps));
			}
				if (summaryEvent.result !== 'goal') {
					clearLiferingState(
						Number.isFinite(Number(summaryEvent.steps)) ? Number(summaryEvent.steps) : null,
						true
					);
				}
			if (summaryEvent.result === 'slip' && slipTriggered && !slipAnimationStarted) {
				triggerSlipAnimation();
			}
		} else {
			status = 'idle';
			markRoundEnded();
			autoScrollActive = false;
		}
	}
	requestAnimationFrame(smoothTick);
	}

function processBookEvents(bookEvents: any[]) {
	playSequence(bookEvents);
}

	const FORCE_TEST_ROUND = false;
	const FORCED_TEST_ROUND_STATE = [
		{
			index: 0,
			landedStep: 'RIGHT',
			steps: {
				LEFT: { stepType: 'ICE', item: 'NOTHING', sinking: false },
				RIGHT: { stepType: 'ICE', item: '+1', sinking: true }
			},
			accumulatedWinAmount: 0,
			winAmount: 0,
			lifeVests: 0,
			bananaCount: 0,
			success: false,
			applies: true,
			terminal: true
		},
		{
			index: 1,
			landedStep: 'RIGHT',
			steps: {
				LEFT: { stepType: 'ICE', item: 'NOTHING', sinking: false },
				RIGHT: { stepType: 'ICE', item: '+3', sinking: false }
			},
			accumulatedWinAmount: 0,
			winAmount: 0,
			lifeVests: 0,
			bananaCount: 0,
			success: false,
			applies: false
		},
		{
			index: 2,
			landedStep: 'LEFT',
			steps: {
				LEFT: { stepType: 'ICE', item: 'NOTHING', sinking: false },
				RIGHT: { stepType: 'ICE', item: '+3', sinking: false }
			},
			accumulatedWinAmount: 0,
			winAmount: 0,
			lifeVests: 0,
			bananaCount: 0,
			success: false,
			applies: false
		},
		{
			index: 3,
			landedStep: 'RIGHT',
			steps: {
				LEFT: { stepType: 'ICE', item: '+3', sinking: false },
				RIGHT: { stepType: 'ICE', item: 'NOTHING', sinking: false }
			},
			accumulatedWinAmount: 0,
			winAmount: 0,
			lifeVests: 0,
			bananaCount: 0,
			success: false,
			applies: false
		},
		{
			index: 4,
			landedStep: 'LEFT',
			steps: {
				LEFT: { stepType: 'ICE', item: 'NOTHING', sinking: false },
				RIGHT: { stepType: 'ICE', item: '+5', sinking: false }
			},
			accumulatedWinAmount: 0,
			winAmount: 0,
			lifeVests: 0,
			bananaCount: 0,
			success: false,
			applies: false
		},
		{
			index: 5,
			landedStep: 'RIGHT',
			steps: {
				LEFT: { stepType: 'ICE', item: 'NOTHING', sinking: false },
				RIGHT: { stepType: 'ICE', item: '+2', sinking: false }
			},
			accumulatedWinAmount: 0,
			winAmount: 0,
			lifeVests: 0,
			bananaCount: 0,
			success: false,
			applies: false
		},
		{
			index: 6,
			type: 'setTotalWin',
			amount: 0
		},
		{
			index: 7,
			type: 'finalWin',
			amount: 0
		}
	];

	function buildSimulatedLossEvents() {
		const startValue = Math.round(stakeAmount() * 100);
		return [
			{
				stepIndex: 0,
				landedStep: 'RIGHT',
				steps: {
					LEFT: { item: '+5', sinking: false },
					RIGHT: { item: 'x4', sinking: true }
				},
				accumulatedWinAmount: 0,
				winAmount: -startValue,
				lifeVests: 0,
				success: false,
				applies: true,
				terminal: true
			},
			{
				stepIndex: 1,
				landedStep: 'RIGHT',
				steps: {
					LEFT: { item: '+1', sinking: false },
					RIGHT: { item: '+2', sinking: false }
				},
				accumulatedWinAmount: 0,
				winAmount: 0,
				lifeVests: 0,
				success: false,
				applies: false
			},
			{
				stepIndex: 2,
				landedStep: 'LEFT',
				steps: {
					LEFT: { item: 'GHOST', sinking: false },
					RIGHT: { item: 'GHOST', sinking: false }
				},
				accumulatedWinAmount: startValue + 300,
				winAmount: 0,
				lifeVests: 0,
				success: false,
				applies: false
			},
			{
				stepIndex: 3,
				landedStep: 'RIGHT',
				steps: {
					LEFT: { item: 'GHOST', sinking: false },
					RIGHT: { item: 'GHOST', sinking: false }
				},
				accumulatedWinAmount: 0,
				winAmount: 0,
				lifeVests: 0,
				success: true,
				applies: false
			},
			{
				stepIndex: 4,
				landedStep: 'LEFT',
				steps: {
					LEFT: { item: 'GHOST', sinking: false },
					RIGHT: { item: 'GHOST', sinking: false }
				},
				accumulatedWinAmount: 0,
				winAmount: 0,
				lifeVests: 0,
				success: true,
				applies: false
			},
			{
				type: 'finish',
				totalSteps: 1,
				totalWinAmount: 0,
				betAmount: startValue,
				multiplier: 0,
				success: false
			}
		];
	}

function setMode(mode: string, label?: string, maxWin?: string) {
		if (animationStatus === 'running') return;
		selectedMode = mode;
		modeLabel = label ?? mode.replace(/_/g, ' ');
		if (maxWin) {
			maxWinLabel = maxWin;
			return;
		}
		switch (mode) {
			case 'BASE_EXTREME':
				maxWinLabel = '10,000x';
				break;
			case 'BASE_VERY_HARD':
				maxWinLabel = '5,000x';
				break;
			default:
				maxWinLabel = '1,000x';
		}
	}

async function authenticate() {
		errorMessage = '';
		currentLanguage = normalizeLanguage(getParam('language'));
		currentCurrency = normalizeCurrency(getParam('currency'));
		const resp = await getRGSResponse('/wallet/authenticate', {
			sessionID: getParam('sessionID'),
			language: currentLanguage
		});
		if (resp?.balance?.amount != null) {
			balance = resp.balance.amount / API_MULTIPLIER;
			if (resp?.balance?.currency) currentCurrency = normalizeCurrency(resp.balance.currency);
		}
		if (resp?.currency) currentCurrency = normalizeCurrency(resp.currency);
		if (resp?.round?.mode) {
			setMode(String(resp.round.mode));
		} else if (getParam('mode')) {
			setMode(String(getParam('mode') ?? 'BASE_HARD'));
		}
		if (resp?.config?.betLevels?.length) {
			betLevels = resp.config.betLevels.map((v: number) => v / API_MULTIPLIER);
			const defaultBet = resp.config.defaultBetLevel
				? resp.config.defaultBetLevel / API_MULTIPLIER
				: betLevels[0];
			betAmount = defaultBet;
			const idx = betLevels.findIndex((v) => v === defaultBet);
			betIndex = idx >= 0 ? idx : Math.max(0, betLevels.length - 1);
		} else {
			betLevels = [...betOptions];
			betIndex = Math.max(0, betLevels.findIndex((v) => v === betAmount));
		}
		const roundState = resp?.round?.state ?? resp?.round?.events ?? null;
		if (resp?.round && Array.isArray(roundState) && roundState.length) {
			pendingRoundEvents = roundState;
			pendingRound = true;
			return;
		}
		if (resp?.balance?.amount != null || resp?.config) {
			errorMessage = '';
			return;
		}
		if (!resp) {
			errorMessage = 'Authenticate failed. Check sessionID/rgs_url.';
			return;
		}
		if (resp?.error) {
			errorMessage = 'Authenticate failed. Check sessionID/rgs_url.';
			return;
		}
	}

	async function resolvePendingRound(view: boolean) {
		if (!pendingRoundEvents) {
			pendingRound = false;
			return;
		}
		pendingRound = false;
		const events = pendingRoundEvents;
		pendingRoundEvents = null;
		if (view) {
			startRoundAudio();
			const normalizedEvents = normalizeRoundEvents(events);
			// logWsTransformedResponse('pending-round', events, normalizedEvents);
			processBookEvents(normalizedEvents);
			return;
		}
		if (getRgsBaseUrl() && !endRoundTriggered) {
			endRoundTriggered = true;
			endRound();
		}
	}

	async function play() {
		if (animationStatus === 'running') return;
		errorMessage = '';
		hasStartedFirstRound = true;
		startRoundAudio();
		startSlideLoop();

		hasLifering = false;
		if (FORCE_TEST_ROUND) {
			endRoundTriggered = true;
			endRoundResponse = null;
			response = {
				simulated: true,
				round: {
					state: FORCED_TEST_ROUND_STATE
				}
			};
			const forcedEvents = normalizeRoundEvents(FORCED_TEST_ROUND_STATE);
			processBookEvents(forcedEvents);
			return;
		}
		if (!getRgsBaseUrl()) {
			endRoundTriggered = true;
			endRoundResponse = null;
			response = { simulated: true };
			const simulatedEvents = normalizeRoundEvents(buildSimulatedLossEvents());
			processBookEvents(simulatedEvents);
			return;
		}
		const payload: Record<string, unknown> = {
			mode: String(selectedMode).toUpperCase(),
			sessionID: getParam('sessionID'),
			amount: Math.round(stakeAmount() * API_MULTIPLIER),
			betSize: Math.round(betAmount * API_MULTIPLIER)
		};
		const currency = getParam('currency');
		if (currency) payload.currency = currency;
		const resp = await getRGSResponse('/wallet/play', payload);
		endRoundResponse = null;
		response = resp;
		if (resp?.balance?.amount != null) {
			balance = resp.balance.amount / API_MULTIPLIER;
			if (resp?.balance?.currency) currentCurrency = normalizeCurrency(resp.balance.currency);
		}
		if (resp?.currency) currentCurrency = normalizeCurrency(resp.currency);
			if (resp?.error) {
				stopSlideLoop();
				errorMessage = resp?.message ? String(resp.message) : 'Play failed.';
				return;
			}
		const bookEvents = resp?.round?.state ?? resp?.round?.events ?? [];
		if (!bookEvents.length) {
			stopSlideLoop();
			errorMessage = 'Play returned no round events.';
			return;
		}
		const normalizedEvents = normalizeRoundEvents(bookEvents);
		// logWsTransformedResponse('/wallet/play', bookEvents, normalizedEvents);
		processBookEvents(normalizedEvents);
		if (resp?.round?.payoutMultiplier != null) {
			lastWin = resp.round.payoutMultiplier / 100;
		}
	}

	async function endRound() {
		const confirmation = await getRGSResponse('/wallet/end-round', {
			sessionID: getParam('sessionID')
		});
		endRoundResponse = confirmation;
		if (confirmation?.balance?.amount != null) {
			balance = confirmation.balance.amount / API_MULTIPLIER;
			if (confirmation?.balance?.currency) currentCurrency = normalizeCurrency(confirmation.balance.currency);
		}
		if (confirmation?.currency) currentCurrency = normalizeCurrency(confirmation.currency);
	}

 



	const lookaheadSteps = 8.9;
const stepSpacing = 420;
	const penguinLaneScale = 1;

	function tokenRender(stepIndex: number) {
		const lookahead = lookaheadSteps + PICKUP_LOOKAHEAD_EXTRA_STEPS;
		const span = lookahead * stepSpacing;
		const relative = stepIndex * stepSpacing - renderStep;
		const topEntryCutoff = span - stepSpacing * PICKUP_TOP_ENTRY_BUFFER_STEPS;
		if (relative < -4 || relative > topEntryCutoff) return null;
		const clamped = Math.max(0, Math.min(span, relative));
		const passed = relative < 0;
		const drop = passed ? -relative : 0;
		const baseDepth = 1 - clamped / Math.max(1e-6, span);
		const passedDepthDecay = passed ? Math.min(0.5, drop / (stepSpacing * 0.9)) : 0;
		const depth = passed ? Math.max(0, 1 - passedDepthDecay) : baseDepth;
		return { depth: Math.max(0, Math.min(1, depth)), passed, drop };
	}

	function penguinDepth() {
		const { topY, bottomY } = pathMetrics();
		const baseY = bottomY - Math.max(28, viewport.h * 0.18);
		const t = Math.max(0, Math.min(1, (baseY - topY) / (bottomY - topY)));
		const inv = 1 / 1.35;
		return Math.max(0, Math.min(1, Math.pow(t, inv)));
	}

	function penguinSizeAtDepth(depth: number) {
		const mobileFactor = window.innerWidth < 600 ? 0.6 : 1;
		const portraitBoost = renderSize.h > renderSize.w ? 1.6 : 1;
		return Math.max(110, viewport.w * 0.12) * (0.7 + depth * 0.6) * 0.63 * mobileFactor * 1.25 * 1.25 * 0.85 * 1.3 * 0.8 * portraitBoost;
	}

	function penguinPose() {
		const depth = penguinDepth();
		const lane = (slipAnimationStarted ? penguinLane : clampPenguinLane(penguinLane)) * penguinLaneScale;
		const pos = lanePosition(depth, lane);
		const mobileFactor = window.innerWidth < 600 ? 0.6 : 1;
		const size = penguinSizeAtDepth(depth);
		const maxOffset = Math.min(0.35, Math.max(0, 1 - Math.abs(penguinLane)));
		const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, penguinOffsetFrac || 0));
		const offsetX = clampedOffset * pos.width;
		const baseX = pos.x + offsetX;
		let clampedX = baseX;
		const halfWidth = pos.width * 0.5;
		const edgeMargin = size * 0.35;
		const minX = pos.x - halfWidth + edgeMargin;
	const maxX = pos.x + halfWidth - edgeMargin;
	clampedX = Math.max(minX, Math.min(maxX, baseX));
	const portraitDown = renderSize.h > renderSize.w ? viewport.h * -0.08 : 0;
	const isMobilePortrait = renderSize.h > renderSize.w && renderSize.w <= 500;
	const mobilePortraitUp = isMobilePortrait ? viewport.h * 0.1 : 0;
	const landscapeUp = renderSize.w > renderSize.h && renderSize.h <= 500 ? viewport.h * 0.06 : 0;
	const basePenguinY = pos.y + size * 0.25 - viewport.h * 0.25 + portraitDown - landscapeUp;
	const penguinY = basePenguinY + viewport.h * 0.055 - mobilePortraitUp;
		const clampDepth = depthForPickupPathY(penguinY);
		const clampPos = lanePosition(clampDepth, 0);
		const followLanePrecisely =
			(status === 'sliding' || status === 'goal') &&
			!slipAnimationStarted &&
			!slipTriggered;
		const clampXs = clampLaneXs(clampDepth);
		const minClamp = clampXs.minX;
		const maxClamp = clampXs.maxX;
		const offsetLimit = clampPos.width * 0.04;
		const offsetXLimited = followLanePrecisely
			? 0
			: lockCenterStrict
				? 0
				: Math.max(-offsetLimit, Math.min(offsetLimit, offsetX));
		const laneX = followLanePrecisely
			? crossingXForLaneOffset(lane) ?? pickupLanePosition(clampDepth, lane).x
			: clampPos.x + lane * clampPos.width * laneSpread(clampDepth);
		const wobble = wobbleSignal();
		const laneNorm = Math.min(1, Math.abs(penguinLane) / Math.max(0.01, PENGUIN_LANE_RANGE));
		const sideLaneFactor = Math.max(0.28, 1.5 - laneNorm * 1.05 - laneNorm * laneNorm * 0.35 + wobbleRisk * 0.24);
		const wobbleSidePx =
			!slipAnimationStarted && !followLanePrecisely
				? wobble.wave * wobble.amp * clampPos.width * 0.0062 * sideLaneFactor * (lockCenterStrict ? 0.35 : 1)
				: 0;
		const turnIntent = (penguinTargetLane - penguinLane) + laneVelocity * 0.34;
		const turnDirection = Math.sign(turnIntent);
		const turnDriftPx =
			!slipAnimationStarted && !followLanePrecisely
				? turnDirection *
					Math.min(clampPos.width * 0.055, Math.abs(turnIntent) * clampPos.width * 0.085) *
					(lockCenterStrict ? 0.55 : 1)
				: 0;
		const baseXLimited = laneX + offsetXLimited;
		clampedX = Math.max(minClamp, Math.min(maxClamp, baseXLimited));
		const x =
			slipAnimationStarted && slipOriginX != null
				? slipOriginX + slipSlide
				: slipTriggered
					? clampedX + slipSlide
					: clampedX + wobbleSidePx + turnDriftPx;
	const y = penguinY;
	return { x, y, size, depth };
}

	function startAutoScroll() {
		autoScrollActive = true;
		if (penguinAnim !== 'slide_idle') penguinAnim = 'slide_idle';
	}

	function soundMasterVolume() {
		if (!soundEnabled) return 0;
		return Math.max(0, Math.min(1, hudVolume / 100));
	}

	function loopVolume(key: SoundKey) {
		if (key === 'music_loop' && musicMuted) return 0;
		return soundMasterVolume() * SOUND_GAIN[key];
	}

	function ensureAudioContext() {
		if (!soundEnabled) return null;
		if (!audioContext) {
			const Ctx = window.AudioContext || (window as any).webkitAudioContext;
			if (!Ctx) return null;
			audioContext = new Ctx();
		}
		if (audioContext.state === 'suspended') {
			void audioContext.resume().catch(() => {});
		}
		return audioContext;
	}

	function ensureLoopState(key: SoundKey) {
		if (!LOOP_SOUNDS.has(key)) return null;
		const ctx = ensureAudioContext();
		if (!ctx) return null;
		let state = loopAudioState[key];
		if (!state) {
			const gain = ctx.createGain();
			gain.connect(ctx.destination);
			state = { gain, source: null, buffer: null, loading: null };
			loopAudioState[key] = state;
		}
		return state;
	}

	async function ensureLoopBuffer(key: SoundKey) {
		const ctx = ensureAudioContext();
		const state = ensureLoopState(key);
		if (!ctx || !state) return null;
		if (state.buffer) return state.buffer;
		if (!state.loading) {
			state.loading = (async () => {
				const response = await fetch(SOUND_SRC[key]);
				const arrayBuffer = await response.arrayBuffer();
				return await ctx.decodeAudioData(arrayBuffer.slice(0));
			})();
		}
		try {
			state.buffer = await state.loading;
			return state.buffer;
		} catch {
			return null;
		} finally {
			state.loading = null;
		}
	}

	function setLoopGain(key: SoundKey) {
		const state = loopAudioState[key];
		if (!state) return;
		state.gain.gain.value = loopVolume(key);
	}

	function updateAudioMix() {
		setLoopGain('music_loop');
		setLoopGain('penguin_slide_loop');
	}

	async function playLoop(key: SoundKey, restart = false) {
		if (!LOOP_SOUNDS.has(key)) return;
		const state = ensureLoopState(key);
		const buffer = await ensureLoopBuffer(key);
		if (!state || !buffer) return;
		if (restart && state.source) {
			try {
				state.source.stop();
			} catch {}
			state.source.disconnect();
			state.source = null;
		}
		if (state.source) {
			setLoopGain(key);
			return;
		}
		const ctx = ensureAudioContext();
		if (!ctx) return;
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		source.connect(state.gain);
		state.source = source;
		setLoopGain(key);
		source.onended = () => {
			if (state.source === source) state.source = null;
		};
		source.start(0);
	}

	function stopLoop(key: SoundKey, reset = false) {
		void reset;
		const state = loopAudioState[key];
		if (!state?.source) return;
		try {
			state.source.stop();
		} catch {}
		state.source.disconnect();
		state.source = null;
	}

	function playOneShot(key: SoundKey) {
		const master = soundMasterVolume();
		if (master <= 0) return;
		const audio = new Audio(SOUND_SRC[key]);
		audio.preload = 'auto';
		audio.volume = master * SOUND_GAIN[key];
		void audio.play().catch(() => {});
	}

	function startBackgroundMusic() {
		playLoop('music_loop');
	}

	function ensureBackgroundMusic() {
		ensureAudioUnlocked();
		if (!musicMuted && hudVolume > 0) {
			startBackgroundMusic();
		}
	}

	function startRoundAudio() {
		ensureBackgroundMusic();
	}

	function ensureAudioUnlocked() {
		const ctx = ensureAudioContext();
		if (!ctx) {
			audioUnlocked = false;
			return;
		}
		if (ctx.state === 'suspended') {
			void ctx
				.resume()
				.then(() => {
					audioUnlocked = ctx.state === 'running';
					if (audioUnlocked && !musicMuted && hudVolume > 0) {
						startBackgroundMusic();
					}
				})
				.catch(() => {
					audioUnlocked = false;
				});
			return;
		}
		audioUnlocked = ctx.state === 'running';
	}

	async function ensureGigalypseFont() {
		const fontUrl = gigalypseFontUrl;
		try {
			if (document.fonts.check('1em Gigalypse')) {
				return;
			}
			const font = new FontFace('Gigalypse', `url(${fontUrl})`);
			await font.load();
			document.fonts.add(font);
		} catch (error) {
			void error;
			// keep fallback font stack if loading fails
		}
	}

	function startSlideLoop() {
		playLoop('penguin_slide_loop', true);
	}

	function stopSlideLoop() {
		stopLoop('penguin_slide_loop', true);
	}

	function playPickupSound(token: { type: string; extra?: Record<string, unknown> }) {
		if (token.type === 'coin') {
			const coinValue = Number(token.extra?.coinValue ?? token.extra?.value ?? 0);
			const baseStake = stakeAmount();
			const ratio = baseStake > 0 ? coinValue / baseStake : 0;
			if (ratio <= 3 ) playOneShot('pickup_bronze');
			else if (ratio <= 20 ) playOneShot('pickup_silver');
			else playOneShot('pickup_gold');
			return;
		}
		if (token.type === 'star') {
			playOneShot('pickup_multi');
			return;
		}
		if (token.type === 'lifering') {
			playOneShot('pickup_buy');
		}
	}

	function maybePlayTurnSound(nextTargetLane: number) {
		if (!soundEnabled || status !== 'sliding') return;
		const steerDelta = nextTargetLane - penguinLane;
		const visibleTurn = Math.abs(laneVelocity) >= 0.288 || Math.abs(steerDelta) >= 0.576;
		if (!visibleTurn) return;
		const nextDir = Math.sign(nextTargetLane);
		const lastDir = Math.sign(lastTurnSoundLane);
		const dirFlip = nextDir !== 0 && lastDir !== 0 && nextDir !== lastDir;
		const leavingCenter = lastDir === 0 && Math.abs(nextTargetLane) >= 0.672;
		const significantSteer = Math.abs(steerDelta) >= 0.528;
		if (!(dirFlip || leavingCenter)) return;
		if (Math.abs(nextTargetLane) < 0.576) return;
		if (!significantSteer) return;
		const now = performance.now();
		if (now - lastTurnSoundAt < 260) return;
		lastTurnSoundAt = now;
		lastTurnSoundLane = nextTargetLane;
		playOneShot('penguin_turn');
	}

	function handlePenguinEvent(name: string) {
		if (name === 'start') {
			startAutoScroll();
			return;
		}
		if (name === 'stop') {
			autoScrollActive = false;
			return;
		}
		if (name === 'vest_gain') {
			penguinSkin = 'vest';
			return;
		}
		if (name === 'vest_lose') {
			penguinSkin = 'base';
			return;
		}
	}

	function clearLiferingState(stepIndex: number | null = null, animateLose = false) {
		const hadLifering = hasLifering || penguinSkin === 'vest';
		hasLifering = false;
		const playLoseAnim = animateLose && hadLifering;
		if (!playLoseAnim) {
			penguinSkin = 'base';
		}
		liferingPickedStep = null;
		liferingGainStep = null;
		liferingForcedOff = false;
		liferingOverrideStep = null;
	if (playLoseAnim) {
		vestAnim = 'lose';
		vestAnimKey += 1;
		playOneShot('pickup_banana');
		const pose = penguinPose();
		hitPopup = {
			text: t('life_vest_lost'),
			until: performance.now() + 1200,
			x: pose.x,
			y: pose.y - Math.max(24, viewport.h * 0.05)
		};
	}
}

	function beginSlip(
		stepIndex: number,
		lane: number,
		offsetFrac: number,
		playFallSound = true,
		withPreDrift = false
	) {
		status = 'slip';
		penguinAnim = 'slide_idle';
		clearLiferingState(stepIndex, true);
		laneFreeze = true;
		ctrlTurnTilt = 0;
		const currentPose = penguinPose();
		const leftDistance = Math.abs(currentPose.x);
		const rightDistance = Math.abs(viewport.w - currentPose.x);
		const xBasedDirection = rightDistance < leftDistance ? 1 : leftDistance < rightDistance ? -1 : 0;
		const laneSign = Math.sign(lane) || Math.sign(penguinLane) || 1;
		penguinTargetLane = penguinLane;
		penguinOffsetFrac = Math.max(-0.04, Math.min(0.04, offsetFrac));
		laneVelocity = 0;
		slipDirection = xBasedDirection === 0 ? (laneSign >= 0 ? 1 : -1) : xBasedDirection;
		liferingPickedStep = null;
		slipTriggered = true;
		slipOriginX = null;
		slipStepIndex = stepIndex;

		const finalize = () => {
			const stopStep = renderStep;
			stopRunEarly = true;
			freezeMovement = true;
			autoScrollActive = false;
			targetStep = renderStep;
			animationActive = false;
			markRoundEnded();
			if (playFallSound) {
				playOneShot('penguin_fall');
			}
			slipEndRenderStep = stopStep;
			runEndRenderStep = stopStep;
			triggerSlipAnimation();
		};

		if (!withPreDrift) {
			finalize();
			return;
		}

		const driftDurationMs = 190 * SLIP_ANIMATION_DURATION_MULT * SLIP_PRE_DRIFT_DURATION_MULT;
		const driftStart = performance.now();
		const driftFromLane = penguinLane;
		const driftToLane = clampPenguinLane(slipDirection * Math.max(0.82, PENGUIN_LANE_RANGE * 0.84));
		const activeRunId = runId;
		const tickDrift = (now: number) => {
			if (activeRunId !== runId || !slipTriggered || freezeMovement) return;
			const t = Math.max(0, Math.min(1, (now - driftStart) / driftDurationMs));
			const eased = t * t * (3 - 2 * t);
			penguinTargetLane = driftToLane;
			setPenguinLane(driftFromLane + (driftToLane - driftFromLane) * eased);
			penguinOffsetFrac = slipDirection * 0.03 * (1 - eased);
			penguinSkidRotation = -slipDirection * (4 + 8 * eased);
			if (t < 1) {
				requestAnimationFrame(tickDrift);
				return;
			}
			setPenguinLane(driftToLane);
			penguinTargetLane = driftToLane;
			laneVelocity = 0;
			penguinSkidRotation = -slipDirection * 12;
			finalize();
		};
		requestAnimationFrame(tickDrift);

	}

	function triggerSlipAnimation() {
		if (slipAnimationStarted) return;
		const slipStartPose = penguinPose();
		const originX = slipStartPose.x;
		slipOriginX = originX;
		slipAnimationStarted = true;
		slipAnimationToken += 1;
		const activeSlipToken = slipAnimationToken;
		const activeRunId = runId;
		stopRunEarly = true;
		autoScrollActive = false;
		const dirSign = Math.sign(penguinLane);
		const dir = dirSign === 0 ? slipDirection : (dirSign > 0 ? 1 : -1);
		const start = performance.now();
		const preDuration = 140 * SLIP_ANIMATION_DURATION_MULT;
		const slipDepth = depthForPickupY(slipStartPose.y);
		const baselineLane = dir > 0 ? 1 : -1;
		const baselineX = lanePosition(slipDepth, baselineLane).x;
		const baselineDistanceToSlipSide =
			dir > 0 ? Math.max(0, viewport.w - baselineX) : Math.max(0, baselineX);
		const baselineDistanceNorm = Math.max(
			0,
			Math.min(1, baselineDistanceToSlipSide / Math.max(1, viewport.w))
		);
		const baselineTravel = viewport.w * (0.11 + baselineDistanceNorm * 0.08);
		const baselineSlide = baselineTravel * dir;
		const baselineGap = Math.max(0, (baselineX - originX) * dir);
		const maxSlide = baselineSlide + baselineGap * dir;
		const preSlideDistance = Math.min(Math.abs(maxSlide) * 0.24, viewport.w * 0.06);
		const preSlide = Math.min(preSlideDistance, Math.abs(maxSlide) * 0.65) * dir;
		const mainDurationBase = Math.max(
			380,
			Math.min(560, 380 + (Math.abs(maxSlide) / Math.max(1, viewport.w)) * 140)
		);
		const mainDuration = mainDurationBase * SLIP_ANIMATION_DURATION_MULT;
		const duration = preDuration + mainDuration;
		penguinAnim = 'slide_idle';
		const animateSlip = (now: number) => {
			if (
				activeSlipToken !== slipAnimationToken ||
				activeRunId !== runId ||
				!slipAnimationStarted ||
				!slipTriggered
			) {
				return;
			}
			const t = Math.min(1, Math.max(0, (now - start) / duration));
			const elapsed = now - start;
				if (elapsed < preDuration) {
					const p = Math.max(0, Math.min(1, elapsed / preDuration));
					const easedPre = p * p * (3 - 2 * p);
					slipSlide = preSlide * easedPre;
					penguinSkidRotation = -dir * (6 + 8 * easedPre);
				} else {
					if (penguinAnim === 'slide_idle') {
						penguinAnim = dir > 0 ? 'lose_R' : 'lose_L';
					}
					const p = Math.max(0, Math.min(1, (elapsed - preDuration) / mainDuration));
					const easedMain = p * p * (3 - 2 * p);
					slipSlide = preSlide + (maxSlide - preSlide) * easedMain;
					penguinSkidRotation = -dir * (14 + 10 * easedMain);
				}
				if (t < 1) requestAnimationFrame(animateSlip);
				else penguinSkidRotation = 0;
			};
		slipSlide = 0;
		requestAnimationFrame(animateSlip);
	}

	

function pickupTriggerAt(stepIndex: number, type = '', spawnDelay = 0) {
	const span = lookaheadSteps * stepSpacing;
	const depth = penguinDepth();
	const isMobileLandscape =
		renderSize.w > renderSize.h &&
		window.innerHeight <= 500 &&
		window.matchMedia('(pointer: coarse)').matches;
	const isPortrait = renderSize.h > renderSize.w;
	const leadFactor = type === 'goal'
		? (isPortrait ? 1.34 : (isMobileLandscape ? 1.64 : 1.46))
		: (isPortrait ? 1.3 : (isMobileLandscape ? 1.42 : 1.28));
	const earlyStepScale = stepIndex <= 1 ? 0.72 : stepIndex === 2 ? 0.86 : 1;
	const lead = stepSpacing * leadFactor * earlyStepScale;
	const activationAdvance = type === 'goal' ? stepSpacing * 0.04 : stepSpacing * 0.11;
	const nonGoalLeadCompensation =
		type === 'goal'
			? 0
			: stepSpacing * (isPortrait ? 0.16 : isMobileLandscape ? 0.2 : 0.18);
	return (
		stepIndex * stepSpacing -
		span * (1 - depth) -
		lead -
		spawnDelay * stepSpacing +
		activationAdvance -
		nonGoalLeadCompensation
	);
}

function shouldUsePreStepFreeRoam(pendingHit: { trigger: number } | undefined) {
	const wasFreeRoamActive = preStepFreeRoamActive;
	const startHandoffFromCurrentLane = () => {
		if (wasFreeRoamActive && !preStepHandoffActive) {
			preStepHandoffActive = true;
			preStepHandoffStartMs = performance.now();
			preStepHandoffFromLane = clampPenguinLane(penguinLane);
		}
	};
	if (pickupCount > 0) {
		startHandoffFromCurrentLane();
			preStepFreeRoamActive = false;
			return false;
	}
	if (lockedTargetTokenId != null) {
		startHandoffFromCurrentLane();
		preStepFreeRoamActive = false;
		return false;
	}
		if (renderStep >= stepSpacing * 0.02) {
			startHandoffFromCurrentLane();
			preStepFreeRoamActive = false;
			return false;
		}
		if (!pendingHit) {
			preStepFreeRoamActive = true;
			return true;
		}
		preStepFreeRoamActive = !preStepSweepCompleted;
		if (!preStepFreeRoamActive) startHandoffFromCurrentLane();
		return preStepFreeRoamActive;
	}

	function preStepSweepLane(nowMs: number) {
		const extents = laneExtents();
		const minLane = clampPenguinLane(extents.minLane + PRE_STEP_SWEEP_INSET);
		const maxLane = clampPenguinLane(extents.maxLane - PRE_STEP_SWEEP_INSET);
		if (maxLane <= minLane) return minLane;
		const periodMs = PRE_STEP_SWEEP_PERIOD_MS;
		const phase = ((nowMs % periodMs) + periodMs) % periodMs;
		const t = phase / periodMs;
		const tri = t < 0.5 ? t * 2 : (1 - t) * 2;
		return minLane + (maxLane - minLane) * tri;
	}

	function preStepFreeRoamTargetLane(
		nowMs: number,
		pendingHit: { trigger: number } | undefined,
		stepPerMs?: number
	) {
		if (DISABLE_PENGUIN_SLIDE_MOTION) return preStepSweepLane(nowMs);
		const extents = laneExtents();
		const minLane = clampPenguinLane(extents.minLane + PRE_STEP_SWEEP_INSET);
		const maxLane = clampPenguinLane(extents.maxLane - PRE_STEP_SWEEP_INSET);
		if (maxLane <= minLane) return minLane;
		if (preStepSweepStartMs <= 0) {
			preStepSweepStartMs = nowMs;
			preStepSweepCompleted = false;
			if (preStepSweepStartSide !== -1 && preStepSweepStartSide !== 1) {
				preStepSweepStartSide = Math.random() < 0.5 ? -1 : 1;
			}
		}
		const startLane = preStepSweepStartSide < 0 ? minLane : maxLane;
		const endLane = preStepSweepStartSide < 0 ? maxLane : minLane;
		let durationMs = PRE_STEP_SINGLE_SWEEP_BASE_MS;
		if (pendingHit && stepPerMs && stepPerMs > 0) {
			const remainingMs = Math.max(0, (pendingHit.trigger - renderStep) / stepPerMs);
			const lockBudgetMs = Math.max(PRE_STEP_SINGLE_SWEEP_MIN_MS, remainingMs - PRE_STEP_FIRST_LOCK_LEAD_MS);
			durationMs = Math.max(PRE_STEP_SINGLE_SWEEP_MIN_MS, Math.min(PRE_STEP_SINGLE_SWEEP_BASE_MS, lockBudgetMs));
		}
		const elapsed = Math.max(0, nowMs - preStepSweepStartMs);
		const t = Math.max(0, Math.min(1, elapsed / Math.max(1, durationMs)));
		const eased = t * t * (3 - 2 * t);
		if (t >= 1) {
			preStepSweepCompleted = true;
			preStepRoamTargetLane = endLane;
			return clampPenguinLane(endLane);
		}
		preStepRoamTargetLane = startLane + (endLane - startLane) * eased;
		return clampPenguinLane(preStepRoamTargetLane);
	}

	function addCosmeticTail(startStep: number) {
		if (tokens.some((t) => t.extra?.cosmetic)) return;
		const tailCount = 5;
		const types = ['coin', 'star', 'banana'];
		for (let i = 1; i <= tailCount; i += 1) {
			const type = types[(startStep + i) % types.length];
			const lane = [-1, 1][(startStep + i) % 2];
			const extra =
				type === 'star'
					? { cosmetic: true, multiplier: 2 }
					: type === 'coin'
						? { cosmetic: true, coinValue: 1 }
						: { cosmetic: true };
			tokenId += 1;
			tokens = [
				...tokens,
				{
					id: tokenId,
					stepIndex: startStep + i,
					type,
					value: currentValue,
					lane,
					hit: false,
					activate: false,
					extra
				}
			];
		}
	}

function wobbleLaneGate() {
	const laneNorm = Math.min(1, Math.abs(penguinLane) / Math.max(0.01, PENGUIN_LANE_RANGE));
	const bananaNorm = Math.max(0, Math.min(2.4, wobbleRisk)) / 2.4;
	return Math.min(1.3, 0.36 + laneNorm * 0.62 + bananaNorm * 0.24);
}

function nearestPickupSlotIndex(lane: number) {
	let nearestIndex = 0;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const [slotRaw, offset] of Object.entries(SLOT_TO_OFFSET)) {
		const slot = Number(slotRaw);
		const distance = Math.abs(lane - offset);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = slot;
		}
	}
	return nearestIndex;
}

		function wobbleSignal() {
			const laneNorm = Math.min(1, Math.abs(penguinLane) / Math.max(0.01, PENGUIN_LANE_RANGE));
			const bananaBoost = Math.max(0, wobbleRisk);
			const slipDamp = slipTriggered || status === 'slip' ? 0.22 : 1;
			const slot = nearestPickupSlotIndex(penguinLane);
			const outerLane = slot === 0 || slot === 1 || slot === 6 || slot === 7;
			const wobbleLaneMultiplier = outerLane ? 3.4 : 1.12;
			const wobbleAmp = Math.max(0.12, (1.7 - laneNorm * 1.05 + wobbleBoost * 0.7) * (1 + bananaBoost * 0.12)) * slipDamp;
			const wobbleSpeed = Math.max(0.9, (0.76 - laneNorm * 0.1 + bananaBoost * 0.03) * 2.1);
			const waveA = Math.sin(wobbleTime * wobbleSpeed * Math.PI * 2);
			const waveB = Math.sin(wobbleTime * wobbleSpeed * Math.PI + 1.1);
			const wave = waveA * 0.75 + waveB * 0.25;
			const gate = wobbleLaneGate();
			return { wave, amp: wobbleAmp * gate * WOBBLE_INTENSITY * wobbleLaneMultiplier };
		}

function ctrlRotation() {
		if (status === 'goal' || penguinAnim === 'win') return 0;
	const edge = Math.max(0, Math.abs(penguinLane) - 0.6) / 0.4;
	const edgeLean = -Math.sign(penguinLane) * 7.5 * Math.min(1, edge);
	const rot = edgeLean + ctrlTurnTilt;
	const wobbleState = wobbleSignal();
	const wobble = wobbleState.wave * wobbleState.amp * 0.72;
		const skid = slipAnimationStarted ? penguinSkidRotation : penguinSkidRotation * 0.35;
		const slipLean = slipAnimationStarted ? -slipDirection * 18 : 0;
		const total = rot + wobble + skid + slipLean;
	return Math.max(-28, Math.min(28, total));
}

function pickupLanePosition(depth: number, offset: number) {
	const t = Math.max(0, Math.min(1, depth));
	const tY = Math.pow(t, PICKUP_Y_SPACING_EXPONENT);
	const laneStart = lanePosition(0, offset);
	const laneEnd = lanePosition(1, offset);
	const pos = {
		x: laneStart.x + (laneEnd.x - laneStart.x) * tY,
		y: laneStart.y + (laneEnd.y - laneStart.y) * tY,
		width: laneStart.width + (laneEnd.width - laneStart.width) * t
	};
	const centerX = viewport.w * 0.5;
	const centerPull = 0.68;
	const sideSpread = Math.max(0, Math.min(1, Math.abs(offset)));
	const sidePull = centerPull + sideSpread * 0.18;
	return {
		...pos,
		x: centerX + (pos.x - centerX) * sidePull
	};
}

function lanePosition(depth: number, offset: number) {
		const { centerX, topY, bottomY, widthTop, widthBottom } = pathMetrics();
		const y = topY + (bottomY - topY) * depth;
		const width = widthTop + (widthBottom - widthTop) * depth;
		const topSpread = 0.14;
		const bottomSpread = 0.7;
		const spread = topSpread + (bottomSpread - topSpread) * depth;
		const x = centerX + offset * width * spread;
		return { x, y, width };
	}

function itemSpawnOffset() {
		return viewport.h * (renderSize.h > renderSize.w ? 0.33 : 0.25);
	}

	function laneSpread(depth: number) {
		const topSpread = 0.14;
		const bottomSpread = 0.7;
		return topSpread + (bottomSpread - topSpread) * depth;
	}

	function laneExtents() {
		if (!tokens.length) {
			return { minLane: -PENGUIN_LANE_RANGE, maxLane: PENGUIN_LANE_RANGE };
		}
		let minLane = PENGUIN_LANE_RANGE;
		let maxLane = -PENGUIN_LANE_RANGE;
		for (const token of tokens) {
			const lane = Number(token.spawnLane ?? token.extra?.spawnLane ?? token.lane);
			if (!Number.isFinite(lane)) continue;
			if (lane < minLane) minLane = lane;
			if (lane > maxLane) maxLane = lane;
		}
		minLane = clampPenguinLane(minLane);
		maxLane = clampPenguinLane(maxLane);
		const paddedMinLane = clampPenguinLane(minLane - PENGUIN_LANE_SIDE_PAD);
		const paddedMaxLane = clampPenguinLane(maxLane + PENGUIN_LANE_SIDE_PAD);
		if (paddedMinLane >= paddedMaxLane) {
			return { minLane: -PENGUIN_LANE_RANGE, maxLane: PENGUIN_LANE_RANGE };
		}
		return { minLane: paddedMinLane, maxLane: paddedMaxLane };
	}

function clampLaneXs(depth: number) {
	const extents = laneExtents();
	const left = lanePosition(depth, extents.minLane).x;
	const right = lanePosition(depth, extents.maxLane).x;
		return {
			minX: Math.min(left, right),
			maxX: Math.max(left, right)
		};
	}

function depthForPickupY(targetY: number) {
		let lo = 0;
		let hi = 1;
		for (let i = 0; i < 14; i += 1) {
			const mid = (lo + hi) * 0.5;
			const y = lanePosition(mid, 0).y + itemSpawnOffset();
			if (y < targetY) lo = mid;
			else hi = mid;
		}
	return (lo + hi) * 0.5;
}

function depthForPickupPathY(targetY: number) {
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 14; i += 1) {
		const mid = (lo + hi) * 0.5;
		const y = pickupLanePosition(mid, 0).y + itemSpawnOffset();
		if (y < targetY) lo = mid;
		else hi = mid;
	}
	return (lo + hi) * 0.5;
}

let pickupLineCrossings = $state<PickupLineCrossing[]>([]);

function targetLineIndexForOffset(offset: number) {
	if (!pickupLineCrossings.length) return null;
	let nearest = pickupLineCrossings[0];
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const crossing of pickupLineCrossings) {
		const distance = Math.abs(crossing.offset - offset);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearest = crossing;
		}
	}
	return nearest?.slot ?? null;
}

function crossingXForLaneOffset(offset: number) {
	if (!pickupLineCrossings.length) return null;
	const lane = clampPenguinLane(offset);
	const sorted = pickupLineCrossings.slice().sort((a, b) => a.offset - b.offset);
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

function rebuildPickupLineCrossings() {
	if (!viewport.w || !viewport.h) {
		pickupLineCrossings = [];
		return;
	}
	const pose = penguinPose();
	const depth = depthForPickupPathY(pose.y);
	const center = lanePosition(depth, 0);
	const spread = laneSpread(depth);
	const denom = Math.max(0.0001, center.width * spread);
	const entries = Object.entries(SLOT_TO_OFFSET)
		.map(([slotRaw, offset]) => {
			const slot = Number(slotRaw);
			const pos = pickupLanePosition(depth, Number(offset));
			const x = pos.x;
			const y = pos.y + itemSpawnOffset();
			const lane = clampPenguinLane((x - center.x) / denom);
			return { slot, offset: Number(offset), x, y, lane };
		})
		.sort((a, b) => a.slot - b.slot);
	pickupLineCrossings = entries;
}

function pickupPosition(stepIndex: number, lane: number, spawnLane?: number) {
	const pose = tokenRender(stepIndex);
	if (!pose) return null;
	const effectiveLane = typeof spawnLane === 'number' ? spawnLane : lane;
	const pos = pickupLanePosition(pose.depth, effectiveLane);
	return { x: pos.x, y: pos.y + itemSpawnOffset() };
}

function pickupBandState(token: Token, penguin = penguinPose()) {
	const spawnLane = Number(token.extra?.spawnLane ?? token.lane);
	const pos = pickupPosition(token.stepIndex, token.lane, spawnLane);
	if (!pos) return null;
	const pose = tokenRender(token.stepIndex);
	const depth = pose ? pose.depth : 0.2;
	const yDelta = penguin.y - pos.y;
	const activateHalfWindow = Math.max(12, penguin.size * 0.09);
	const approachWindow = Math.max(34, penguin.size * 0.42);
	const inActivateBand = yDelta <= activateHalfWindow && yDelta >= -activateHalfWindow * 1.8;
	const passedBand = yDelta < -activateHalfWindow * 1.8;
	const approachingBand = yDelta > activateHalfWindow && yDelta <= approachWindow;
	return { pos, depth, spawnLane, yDelta, inActivateBand, passedBand, approachingBand };
}

function isNearEdgeForSlip(
	band: ReturnType<typeof pickupBandState>,
	penguin: { x: number; y: number; size: number }
) {
	if (!band) return false;
	const bounds = clampLaneXs(band.depth);
	const leftDist = penguin.x - bounds.minX;
	const rightDist = bounds.maxX - penguin.x;
	const edgeWindow = Math.max(16, penguin.size * 0.24);
	return leftDist <= edgeWindow || rightDist <= edgeWindow;
}

function shouldGoalCollectNow(
	token: Token,
	band: ReturnType<typeof pickupBandState>,
	penguin: { x: number; y: number; size: number }
) {
	if (token.type !== 'goal' || !band?.pos) return true;
	const xDelta = Math.abs(penguin.x - band.pos.x);
	const yDelta = Math.abs(band.yDelta);
	const laneDelta = Math.abs(clampPenguinLane(penguinLane) - clampPenguinLane(targetLaneForToken(token)));
	const maxXDelta = Math.max(34, penguin.size * 0.34);
	const maxYDelta = Math.max(18, penguin.size * 0.14);
	if (xDelta <= maxXDelta && yDelta <= maxYDelta) return true;
	if (band.passedBand) {
		return (
			xDelta <= Math.max(44, penguin.size * 0.44) &&
			yDelta <= Math.max(34, penguin.size * 0.26) &&
			laneDelta <= 0.3
		);
	}
	return false;
}

function shouldPreSlipBeforePickup(
	token: Token,
	band: ReturnType<typeof pickupBandState>,
	penguin: { x: number; y: number; size: number }
) {
	if (!band) return false;
	if (token.activate || !token.hit) return false;
	const sinkingNothing = isNothingTokenType(token.type) && (token.extra?.sinking === true || token.extra?.fall === true);
	if (!(token.type === 'coin' || token.type === 'star' || sinkingNothing)) return false;
	const sinkingSlip = token.extra?.sinking === true || token.extra?.fall === true;
	if (!sinkingSlip) return false;
	if (!isNearEdgeForSlip(band, penguin)) return false;
	// Trigger before the pickup band so the slip happens between steps.
	if (!band.approachingBand) return false;
	const trigger = slipTriggerRenderStepForToken(token);
	const firstSinkingPickupStep = tokens
		.filter((entry) => entry.hit && (entry.extra?.sinking === true || entry.extra?.fall === true))
		.reduce((minStep, entry) => Math.min(minStep, Number(entry.stepIndex)), Number.POSITIVE_INFINITY);
	const isFirstSinkingPickup = Number(token.stepIndex) === firstSinkingPickupStep;
	const preSlipStart = trigger - stepSpacing * (sinkingNothing ? (isFirstSinkingPickup ? 0.62 : 0.46) : (isFirstSinkingPickup ? 0.45 : 0.3));
	const preSlipEnd = trigger - stepSpacing * (sinkingNothing ? (isFirstSinkingPickup ? 0.2 : 0.1) : (isFirstSinkingPickup ? 0.14 : 0.06));
	const inStepWindow = renderStep >= preSlipStart && renderStep <= preSlipEnd;
	const earlyYWindow = band.yDelta > Math.max(sinkingNothing ? (isFirstSinkingPickup ? 16 : 12) : (isFirstSinkingPickup ? 24 : 18), stepSpacing * (sinkingNothing ? 0.01 : 0.015));
	return inStepWindow || earlyYWindow;
}

function isNothingTokenType(type: unknown) {
	const normalized = String(type ?? '').trim().toLowerCase();
	return (
		normalized === 'empty' ||
		normalized === 'nothing' ||
		normalized === 'none' ||
		normalized === 'null' ||
		normalized === 'undefined'
	);
}

function isDoubleNothingStep(stepIndex: number) {
	const stepTokens = tokens.filter(
		(entry) =>
			Number(entry.stepIndex) === Number(stepIndex) &&
			!entry.extra?.cosmetic
	);
	if (stepTokens.length < 2) return false;
	return stepTokens.every((entry) => isNothingTokenType(entry.type));
}

function shouldSkipPositioningForHitToken(token: Token | undefined) {
	if (!token?.hit) return false;
	if (!isNothingTokenType(token.type)) return false;
	return isDoubleNothingStep(Number(token.stepIndex));
}

function shouldAutoCollectNothing(
	token: Token,
	band: ReturnType<typeof pickupBandState>,
	penguin: { y: number; size: number }
) {
	if (!token.hit || token.activate || !isNothingTokenType(token.type)) return false;
	if (!band?.pos) return false;
	// NOTHING tokens should still count as a passed step even with no visible sprite text/content.
	const yWindow = Math.max(8, penguin.size * 0.08);
	return band.pos.y >= penguin.y - yWindow;
}

function isLaneAlignedForPickup(
	token: Token,
	band: ReturnType<typeof pickupBandState>,
	penguin: { x: number; y: number; size: number }
) {
	if (!band?.pos) return false;
	const xDelta = Math.abs(penguin.x - band.pos.x);
	const laneDelta = Math.abs(clampPenguinLane(penguinLane) - clampPenguinLane(targetLaneForToken(token)));
	const isNothing = isNothingTokenType(token.type);
	const isGoal = token.type === 'goal';
	const maxXDelta = isGoal
		? Math.max(40, penguin.size * 0.38)
		: isNothing
			? Math.max(20, penguin.size * 0.28)
			: Math.max(16, penguin.size * 0.22);
	const maxLaneDelta = isGoal ? 0.42 : isNothing ? 0.34 : 0.22;
	return xDelta <= maxXDelta && laneDelta <= maxLaneDelta;
}

function isLaneCloserToNearestEdge(candidateLane: number, currentLane: number) {
	const extents = laneExtents();
	const currentToLeft = Math.abs(currentLane - extents.minLane);
	const currentToRight = Math.abs(extents.maxLane - currentLane);
	const nearestEdgeLane = currentToLeft <= currentToRight ? extents.minLane : extents.maxLane;
	return Math.abs(candidateLane - nearestEdgeLane) + 1e-4 < Math.abs(currentLane - nearestEdgeLane);
}

	function coinAssetKey(token: any) {
		const coinValue = token?.extra?.coinValue ?? token?.extra?.value ?? 0;
		const baseStake = token?.extra?.baseStake ?? stakeAmount();
		const normalized = baseStake > 0 ? coinValue / baseStake : coinValue;
		if (normalized <= 3) return 'coin_bronze';
		if (normalized <= 20 ) return 'coin_silver';
		return 'coin_gold';
	}

	function tokenScale(depth: number) {
	const mobileFactor = window.innerWidth < 600 ? 0.8 : 1;
	const isPortrait = renderSize.h > renderSize.w;
	const portraitBoost = isPortrait ? 1.38 : 1;
	const depthScale = isPortrait ? 0.5 + depth * 1.54 : 0.6 + depth * 1.4;
	return depthScale * mobileFactor * 2.6 * portraitBoost * PICKUP_SCALE_BOOST;
}

function tokenSpineSize(depth: number) {
	const mobileFactor = window.innerWidth < 600 ? 0.75 : 1;
	const isPortrait = renderSize.h > renderSize.w;
	const portraitBoost = isPortrait ? 1.56 : 1;
	const depthT = Math.max(0, Math.min(1, depth));
	const depthExp = Math.pow(depthT, 2.35);
	const depthScale = isPortrait ? 0.42 + depthExp * 2.2 : 0.42 + depthExp * 1.7;
	const descentScaleBoost = 1 + Math.pow(Math.max(0, Math.min(1, depth)), 1.25) * 0.62;
	const base = Math.max(40, viewport.w * 0.035);
	return base * depthScale * descentScaleBoost * mobileFactor * 2.6 * portraitBoost * PICKUP_SCALE_BOOST;
}

function accumulatedAmountY() {
	const desktopAccumulatedOffset =
		renderSize.w >= 1024 && renderSize.h >= 600 && renderSize.w > renderSize.h ? viewport.h * 0.022 : 0;
	return viewport.h * 0.11 + desktopAccumulatedOffset;
}

type StepDebugGuide = {
	step: number;
	y: number;
	leftX: number;
	rightX: number;
	distanceToNext: number | null;
};

function stepDebugGuides(): StepDebugGuide[] {
	const currentStep = Math.max(0, Math.floor(renderStep / stepSpacing) - 1);
	const stepCount = Math.ceil(lookaheadSteps) + 3;
	const centerX = viewport.w * 0.5;
	const halfWidth = Math.max(120, viewport.w * 0.12);
	const rows: Array<Omit<StepDebugGuide, 'distanceToNext'>> = [];
	for (let i = 0; i < stepCount; i += 1) {
		const step = currentStep + i;
		const pose = tokenRender(step);
		if (!pose) continue;
		const centerPos = pickupLanePosition(pose.depth, 0);
		rows.push({
			step,
			y: centerPos.y + itemSpawnOffset(),
			leftX: centerX - halfWidth,
			rightX: centerX + halfWidth
		});
	}
	rows.sort((a, b) => a.step - b.step);
	return rows.map((row, index) => {
		const next = rows[index + 1];
		return {
			...row,
			distanceToNext: next ? Math.abs(next.y - row.y) : null
		};
	});
}

	type PathMetrics = {
		centerX: number;
		topY: number;
		bottomY: number;
		widthTop: number;
		widthBottom: number;
	};

	function pathMetrics(): PathMetrics {
		const w = viewport.w;
		const h = viewport.h;
		const slide = slideMetrics();
		return {
			centerX: w / 2,
			topY: slide.top,
			bottomY: slide.top + slide.height,
			widthTop: Math.max(110, slide.width * 0.22),
			widthBottom: Math.max(320, slide.width * 0.78)
		};
	}

	function pointOnPath(stepIndex: number) {
		animationStatus = 'running';
	const maxStep = Math.max(6, ...tokens.map((t) => t.stepIndex));
		const t = Math.min(1, stepIndex / (maxStep + 1));
		const { centerX, topY, bottomY, widthTop, widthBottom } = pathMetrics();
		const y = bottomY - (bottomY - topY) * t;
		const width = widthBottom - (widthBottom - widthTop) * t;
		return { x: centerX, y, width };
	}

	function slideMetrics() {
		const w = viewport.w;
		const h = viewport.h;
		const isPortrait = renderSize.h > renderSize.w;
		const width = (window.innerWidth < 600 ? w * (isPortrait ? 0.3888 : 0.28) : w * 0.55) * 0.75 * 1.1 * 1.2 * 1.15;
		const height = h * (isPortrait ? 1.64 : 1.05);
		const top = h * (isPortrait ? -0.045 : 0.1);
		return { width, height, top, y: top + height * 0.5 };
	}

	$effect(() => {
		if (!hitPopup) return;
		const now = performance.now();
		if (now >= hitPopup.until) hitPopup = null;
	});

	$effect(() => {
		if (!vestAnim) return;
		const currentKey = vestAnimKey;
		const timeout = setTimeout(() => {
			if (vestAnimKey === currentKey) {
				vestAnim = null;
			}
		}, 1600);
		return () => clearTimeout(timeout);
	});

	$effect(() => {
		if (!bananaLossFloat) return;
		if (floatTime - bananaLossFloat.start >= 1.4) {
			bananaLossFloat = null;
		}
	});

	$effect(() => {
		if (vestAnim) return;
		penguinSkin = hasLifering ? 'vest' : 'base';
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.lang = currentLanguage;
		document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
	});

	function stepStateAt(stepIndex: number) {
		if (!stepStates.length) return null;
		let latest = stepStates[0];
		for (const entry of stepStates) {
			if (entry.step <= stepIndex) {
				latest = entry;
			} else {
				break;
			}
		}
		return latest;
	}

	function updateWobbleRiskForStep(stepIndex: number) {
		const latest = stepStateAt(stepIndex);
		wobbleRisk = latest
			? Math.max(0, Math.min(2.4, Number(latest.bananaCount ?? 0) / 2.4))
			: 0;
	}

	function valueAtStep(stepIndex: number) {
		if (stepIndex < 0) return runStartValue;
		const latest = stepStateAt(stepIndex);
		return latest ? latest.value : runStartValue;
	}

	function buildLanePath() {
		const hits = tokens
			.filter((t) => t.hit && !t.extra?.cosmetic)
			.map((t) => ({ step: Number(t.stepIndex), lane: targetLaneForToken(t) }))
			.sort((a, b) => a.step - b.step);
		const path: Array<{ step: number; lane: number }> = [{ step: 0, lane: 0 }, ...hits];
		lanePath = path;
	}

	function laneAtStep(step: number) {
		if (!lanePath.length) return 0;
		if (step <= lanePath[0].step) return lanePath[0].lane;
		for (let i = 0; i < lanePath.length - 1; i += 1) {
			const a = lanePath[i];
			const b = lanePath[i + 1];
			if (step >= a.step && step <= b.step) {
				const span = Math.max(1e-6, b.step - a.step);
				const t = Math.max(0, Math.min(1, (step - a.step) / span));
				const smooth = t * t * (3 - 2 * t);
				return a.lane + (b.lane - a.lane) * smooth;
			}
		}
		return lanePath[lanePath.length - 1].lane;
	}

	onMount(() => {
		soundEnabled = true;
		void ensureGigalypseFont();
		updateAudioMix();
		ensureBackgroundMusic();
		let ro: ResizeObserver | null = null;
		let rafId: number | null = null;
		let floatId: number | null = null;
		let cancelled = false;
		let timeId: number | null = null;
		const unlockAudioOnInteraction = () => ensureBackgroundMusic();

		const syncRendererSize = () => {
			if (!gameBodyEl) return;
			const app = context.stateApp.pixiApplication;
			if (!app || !app.renderer) return;
			const w = Math.max(1, Math.round(gameBodyEl.clientWidth));
			const h = Math.max(1, Math.round(gameBodyEl.clientHeight));
			const dpr = Math.max(1, window.devicePixelRatio || 1);
			try {
				app.renderer.resolution = dpr;
			} catch {}
			app.renderer.resize(w, h);
			app.canvas.style.width = '100%';
			app.canvas.style.height = '100%';
			try {
				app.stage.sortableChildren = true;
			} catch {}
			renderSize.w = w;
			renderSize.h = h;
			const coverScale = Math.max(renderSize.w / baseViewport.w, renderSize.h / baseViewport.h);
			const isPortrait = renderSize.h > renderSize.w;
			const isMobileLandscape = !isPortrait && renderSize.h <= 500;
			const portraitScaleFactor = isPortrait ? 0.6 : 1;
			rootScale = coverScale * portraitScaleFactor;
			rootOffset.x = (renderSize.w - baseViewport.w * rootScale) * 0.5;
			rootOffset.y = isPortrait
				? renderSize.h * SKY_TARGET_RATIO
				: (renderSize.h - baseViewport.h * rootScale) * 0.5;
			if (isMobileLandscape) {
				rootOffset.y -= renderSize.h * -0.14;
			}
			viewport.w = baseViewport.w;
			viewport.h = baseViewport.h;
			buildFloes();
			rebuildPickupLineCrossings();
		};

		const waitForApp = () =>
			new Promise<void>((resolve) => {
				const tick = () => {
					if (context.stateApp.pixiApplication) return resolve();
					rafId = requestAnimationFrame(tick);
				};
				tick();
			});

		updateViewport();
		window.addEventListener('resize', updateViewport);
		window.addEventListener('resize', syncRendererSize);
		window.addEventListener('pointerdown', unlockAudioOnInteraction);
		window.addEventListener('keydown', unlockAudioOnInteraction);
		window.addEventListener('touchstart', unlockAudioOnInteraction);
		if (gameBodyEl) {
			ro = new ResizeObserver(() => syncRendererSize());
			ro.observe(gameBodyEl);
		}
		hasLifering = false;

		(async () => {
			if (getRgsBaseUrl() && getParam('sessionID')) {
				await authenticate();
			}

			await waitForApp();
			if (cancelled) return;
			syncRendererSize();
			
			requestAnimationFrame(syncRendererSize);
			setTimeout(syncRendererSize, 50);
			setTimeout(() => {
				if (!cancelled) bootLoading = false;
			}, 120);
		})().catch(() => {
			if (!cancelled) bootLoading = false;
		});
		const updateTime = () => {
			timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		};
		updateTime();
		timeId = window.setInterval(updateTime, 30_000);
		const floatTick = () => {
			floatTime = performance.now() / 1000;
			floatId = requestAnimationFrame(floatTick);
		};
		floatTick();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code !== 'Space') return;
			if ((event.target as HTMLElement | null)?.tagName === 'INPUT') return;
			event.preventDefault();
			if (pendingRound) return;
			handleBetClick();
		};
		window.addEventListener('keydown', onKeyDown);

			return () => {
				cancelled = true;
			if (rafId) cancelAnimationFrame(rafId);
			if (floatId) cancelAnimationFrame(floatId);
			if (timeId) clearInterval(timeId);
			if (ro) ro.disconnect();
			driftActive = false;
			window.removeEventListener('resize', updateViewport);
				window.removeEventListener('resize', syncRendererSize);
				window.removeEventListener('pointerdown', unlockAudioOnInteraction);
				window.removeEventListener('keydown', unlockAudioOnInteraction);
				window.removeEventListener('touchstart', unlockAudioOnInteraction);
				window.removeEventListener('keydown', onKeyDown);
				stopSlideLoop();
				stopLoop('music_loop');
				loopAudioState = {};
				if (audioContext) {
					void audioContext.close().catch(() => {});
					audioContext = null;
				}
				soundEnabled = false;
			};
		});
	onDestroy(() => {
		stopAutoplay();
		for (const timer of removalTimers.values()) clearTimeout(timer);
		removalTimers.clear();
	});

	$effect(() => {
		if (autoplay) startAutoplay();
		else stopAutoplay();
	});
	$effect(() => {
		hudVolume;
		musicMuted;
		updateAudioMix();
		if (audioUnlocked && !musicMuted && hudVolume > 0) startBackgroundMusic();
	});


	

	function startAutoplayRun(count: number) {
		if (animationStatus === 'running' || status === 'sliding' || pendingRound) return;
		autoplayTotal = count;
		autoplayRemaining = count;
		autoplay = true;
		autoplayOpen = false;
	}

	function handleBetClick() {
		startRoundAudio();
		playOneShot('start_button');
		if (autoplay) {
			autoplay = false;
			autoplayRemaining = 0;
		}
		play();
	}

	function setHudVolume(value: number) {
		const next = Math.max(0, Math.min(100, Math.round(value)));
		hudVolume = next;
	}

	function toggleHudMute() {
		musicMuted = !musicMuted;
		if (!musicMuted && hudVolume > 0) {
			ensureAudioUnlocked();
			startBackgroundMusic();
		}
	}

function toggleMenuOpen() {
	menuOpen = !menuOpen;
	if (!menuOpen) volatilityHelpOpen = false;
}

function toggleVolatilityHelp(event?: MouseEvent) {
	event?.stopPropagation();
	volatilityHelpOpen = !volatilityHelpOpen;
}

function setMenuInfoOpen(value: boolean) {
	menuInfoOpen = value;
}

function toggleAutoplayOpen() {
	autoplayOpen = !autoplayOpen;
}

function setAutoplayDraft(count: number) {
	autoplayDraftCount = count;
}

function handleStartAutoplay() {
	if (animationStatus === 'running' || status === 'sliding' || pendingRound) return;
	startRoundAudio();
	playOneShot('start_button');
	startAutoplayRun(autoplayDraftCount);
}

function increaseBet() {
	if (animationStatus === 'running') return;
	playOneShot('ui_bet_up');
	betIndex = Math.min(betLevels.length - 1, betIndex + 1);
	betAmount = betLevels[betIndex];
}

function decreaseBet() {
	if (animationStatus === 'running') return;
	playOneShot('ui_bet_down');
	betIndex = Math.max(0, betIndex - 1);
	betAmount = betLevels[betIndex];
}

function setSpeed(value: number) {
	speedFactor = value;
}

function cycleSpeed() {
	const order = [1, 2, 4] as const;
	const currentIndex = order.indexOf(speedFactor as (typeof order)[number]);
	const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % order.length;
	setSpeed(order[nextIndex]);
}

	const spineProps = (props: Record<string, unknown>) => props as any;
</script>

<svelte:head>
	<title>{t('game_title')}</title>
	<link rel="icon" href={assetPath('/favicon.svg')} type="image/svg+xml" />
	<link rel="shortcut icon" href={assetPath('/favicon.svg')} />
	<meta name="color-scheme" content="light" />
	<meta name="supported-color-schemes" content="light" />
	{@html `<style>${gigalypseFontCss}</style>`}
</svelte:head>

<div class="page">
	{#if bootLoading}
		<div class="boot-loader">
			<img class="boot-loader-image" src={stakeLoaderSrc} alt="Loading game" />
		</div>
	{/if}
	<div
		class="game-body"
		bind:this={gameBodyEl}
		style={`width: ${gameBox.w}px; height: ${gameBox.h}px; transform: translate(${stageOffset.x}px, ${stageOffset.y}px) scale(${stageScale}); transform-origin: top left;`}
	>
		<div class="stage">
			<App>
			<Container>
				<Container x={rootOffset.x} y={rootOffset.y} scale={rootScale}>
			
		{@const showCloudsOnly = false}
		{@const bgSize = Math.max(viewport.w, viewport.h) * 1.2}
		{@const cloudsData = context.stateApp.loadedAssets?.background_clouds }
		{@const cloudsAssetWidth = readAssetDimension(cloudsData, 'width')}
		{@const cloudsAssetHeight = readAssetDimension(cloudsData, 'height')}
		{@const cloudsAspect = cloudsAssetWidth > 0 && cloudsAssetHeight > 0 ? cloudsAssetHeight / cloudsAssetWidth : 0.35}
		{@const cloudsWidth = cloudsAssetWidth || viewport.w}
		{@const cloudsHeight = cloudsAssetHeight || Math.max(1, cloudsWidth * cloudsAspect)}
		{@const icePath = pathMetrics()}
		{@const waterHeight = Math.max(1, viewport.h - icePath.topY)}
		{@const waterY = icePath.topY + waterHeight * 0.55}
		{@const skyHeight = Math.max(1, icePath.topY * 4.2)}
		{@const mountainsData = context.stateApp.loadedAssets?.background_mountains}
		{@const mountainsAssetWidth = readAssetDimension(mountainsData, 'width')}
		{@const mountainsAssetHeight = readAssetDimension(mountainsData, 'height')}
		{@const mountainsAspect =
			mountainsAssetWidth > 0 && mountainsAssetHeight > 0 ? mountainsAssetHeight / mountainsAssetWidth : 0.2}
		{@const mountainsWidth = mountainsAssetWidth || viewport.w}
		{@const mountainsHeight = mountainsAssetHeight || mountainsWidth * mountainsAspect}
		{@const scenePortrait = renderSize.h > renderSize.w}
		{@const mountainsScaleX = scenePortrait ? 0.5 : 1}
		{@const mountainsYOffset = viewport.h * (scenePortrait ? 0.599 : 0.5176)}
		{@const mountainsY = icePath.topY - mountainsHeight * 0.2 + mountainsYOffset }
		{@const cloudsNativeHeight = cloudsAssetHeight}
		{@const cloudsX = viewport.w * 0.5 + cloudsAssetWidth * 0.5}
		{@const cloudsY = cloudsNativeHeight * (scenePortrait ? 0.875 : 0.9485)}
		{@const slide = slideMetrics()}
		{@const slideVisualOffsetY = scenePortrait ? -70 : 0}
		{@const waterTimeScale = 1.4}
		{@const iceSwayScale = 0.33}
		{@const roundActive = animationStatus === 'running' || status === 'sliding'}
		{@const bgAnim = 'idle'}
		{@const bgTimeScale = roundActive ? 1 : 0}
		<Container y={viewport.h * (scenePortrait ? -0.02 : -0.1)} sortableChildren>
			<SpineProvider {...spineProps({ key: 'background_water', x: viewport.w * 0.5, y: waterY })}>
			<SpineTrack trackIndex={0} animationName={bgAnim} loop timeScale={bgTimeScale} />
			</SpineProvider>
		
		
		
			<SpineProvider
				{...spineProps({
					key: 'background_clouds',
					x: cloudsX,
					y: cloudsY,
					anchor: { x: 0.5, y: 0.5 }
				})}
			>
				<SpineTrack trackIndex={0} animationName={bgAnim} loop timeScale={bgTimeScale} />
			</SpineProvider>
			<SpineProvider {...spineProps({ key: 'background_mountains', x: viewport.w * 0.5, y: mountainsY, scaleX: mountainsScaleX })}>
				<SpineTrack trackIndex={0} animationName={bgAnim} loop timeScale={bgTimeScale} />
			</SpineProvider>
			{@const spawnY = icePath.topY + viewport.h * (0.25 + ICE_SPAWN_Y_DOWN_FRAC + (scenePortrait ? 0.04 : 0))}
			{@const spawnOffset = viewport.h * 0.25}
			{@const scrollOffset = iceScroll * 0.715}
			{@const bottomLimit = icePath.bottomY + stepSpacing * 0.2}
			{@const loopSpan = Math.max(1, bottomLimit - spawnY)}
			{@const loopGap = viewport.h * ICE_RESPAWN_GAP_FRAC}
			{@const loopDistance = loopSpan + loopGap}
			{@const slopeDepthA = 0.2}
			{@const slopeDepthB = 0.8}
			{@const leftA = lanePosition(slopeDepthA, -1)}
			{@const leftB = lanePosition(slopeDepthB, -1)}
		{@const rightA = lanePosition(slopeDepthA, 1)}
		{@const rightB = lanePosition(slopeDepthB, 1)}
		{@const leftLaneSlope = (leftB.x - leftA.x) / Math.max(1, (leftB.y + spawnOffset) - (leftA.y + spawnOffset))}
		{@const rightLaneSlope = (rightB.x - rightA.x) / Math.max(1, (rightB.y + spawnOffset) - (rightA.y + spawnOffset))}
				{#each icePieces as piece, index (piece.id)}
					{@const baseOffset = piece.baseY - spawnY}
					{@const travel = baseOffset + scrollOffset}
					{@const wrappedDistance = ((travel % loopDistance) + loopDistance) % loopDistance}
					{@const inRespawnGap = wrappedDistance > loopSpan}
					{@const wrapped = Math.min(loopSpan, wrappedDistance)}
					{@const localOffset = wrapped}
					{@const progress = Math.max(0, Math.min(1, localOffset / loopSpan))}
					{@const yRaw = spawnY + localOffset}
					{@const cycle = Math.floor(travel / loopDistance)}
					{@const fullLoops = Math.floor(travel / loopDistance)}
				{@const spawnBaseX = hasStartedFirstRound
					? getSpawnX(piece.id, cycle, piece.baseX, piece.side)
					: piece.baseX}
				{@const slope = spawnBaseX < viewport.w * 0.5 ? leftLaneSlope : rightLaneSlope}
			{@const slopeOffset = slope * (yRaw - spawnY) * 1.6}
			{@const rawX = spawnBaseX + slopeOffset}
				{@const centerGuard = viewport.w * 0.02}
				{@const x = spawnBaseX < viewport.w * 0.5
					? Math.min(viewport.w * 0.5 - centerGuard, rawX)
					: Math.max(viewport.w * 0.5 + centerGuard, rawX)}
				{@const y = yRaw}
				{@const depth = Math.max(0, Math.min(1, (y - spawnY) / Math.max(1, icePath.bottomY - spawnY)))}
				{@const scale = piece.scale * (0.5 + depth * 1.5)}
				{@const phaseOffset = (x / viewport.w - 0.5) * Math.PI}
				{@const sway = Math.sin(floatTime * waterTimeScale * iceSwayScale * Math.PI * 2 + phaseOffset)}
					{@const allowSpawn = piece.spawnIndex < ICE_VISIBLE_START || (iceScroll > 0 && fullLoops > 0)}
					{@const visible = allowSpawn && y <= bottomLimit}
					{@const canRender = visible && (piece.sideGuard || !inRespawnGap)}
					{#if canRender}
					<SpineProvider
						{...spineProps({
							key: piece.key,
							x,
							y: y + sway * piece.yAmp,
							rotation: sway * piece.rAmp,
							scale
						})}
					>
						<SpineTrack trackIndex={0} animationName={piece.animName} loop timeScale={2.5} />
					</SpineProvider>
				{/if}
			{/each}
			<SpineProvider
				{...spineProps({
					key: 'slide',
					x: viewport.w * 0.5,
					y: slide.y + slideVisualOffsetY,
					width: slide.width,
					height: slide.height
				})}
			>
				<SpineTrack trackIndex={0} animationName="init" loop={false} timeScale={1} />
				<SpineTrack trackIndex={1} animationName="idle" loop timeScale={status === 'sliding' ? slideTimeScale : 0} />
			</SpineProvider>
				<Container zIndex={200}>
					{#if false}
					{@const debugGuides = stepDebugGuides()}
					{@const debugMeasureX = viewport.w * 0.5}
					{@const debugPose = penguinPose()}
					{@const debugTargetLaneIndex = targetLineIndexForOffset(clampPenguinLane(penguinTargetLane))}
					{@const debugTargetCrossing = debugTargetLaneIndex != null
						? pickupLineCrossings.find((entry) => entry.slot === debugTargetLaneIndex)
						: null}
					{@const debugTargetPos = debugTargetCrossing
						? { x: debugTargetCrossing.x, y: debugPose.y }
						: { x: pickupLanePosition(depthForPickupPathY(debugPose.y), clampPenguinLane(penguinTargetLane)).x, y: debugPose.y }}
					{@const debugCandidateHits = tokens
						.filter((t) => isTargetableHitToken(t) && !t.activate)
						.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))}
					{@const debugPendingHit = lockedTargetTokenId != null
						? debugCandidateHits.find((t) => t.id === lockedTargetTokenId) ?? debugCandidateHits[0]
						: debugCandidateHits[0]}
					{@const debugPendingPos = debugPendingHit
						? pickupPosition(
							debugPendingHit.stepIndex,
							debugPendingHit.lane,
							Number(debugPendingHit.extra?.spawnLane ?? debugPendingHit.lane)
						)
						: null}
					{@const debugActiveLockHit = tokens
						.filter(
							(t) =>
								isTargetableHitToken(t) &&
								t.activate &&
								Number.isFinite(Number(t.extra?.lockReleaseAt)) &&
								Number(t.extra?.lockReleaseAt) > performance.now()
						)
						.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0]}
					{@const debugPendingBand = debugPendingHit ? pickupBandState(debugPendingHit, debugPose) : null}
					{@const debugPendingGoal = tokens
						.filter((t) => t.hit && !t.activate && t.type === 'goal')
						.sort((a, b) => (a.stepIndex === b.stepIndex ? a.id - b.id : a.stepIndex - b.stepIndex))[0]}
					{@const debugGoalPos = debugPendingGoal
						? pickupPosition(
							debugPendingGoal.stepIndex,
							debugPendingGoal.lane,
							Number(debugPendingGoal.extra?.spawnLane ?? debugPendingGoal.lane)
						)
						: null}
					{@const debugPendingTrigger = debugPendingHit
						? pickupTriggerAt(
							debugPendingHit.stepIndex,
							debugPendingHit.type,
							Number(debugPendingHit.extra?.spawnDelay ?? 0)
						)
						: 0}
					{@const debugPendingLaneMatch = debugPendingHit
						? Math.abs(clampPenguinLane(targetLaneForToken(debugPendingHit)) - clampPenguinLane(penguinTargetLane)) <= 0.12
						: false}
					{@const debugPendingMeetsBand = debugPendingHit
						? Boolean(debugPendingBand?.inActivateBand ?? false) || Boolean(debugPendingBand?.passedBand ?? false)
						: false}
					{@const debugPendingTriggerReached = debugPendingHit ? renderStep >= debugPendingTrigger : false}
					{@const debugPickupPathOffsets = Object.values(SLOT_TO_OFFSET)}
					{@const debugLineCrossings = pickupLineCrossings}
				<Graphics
					draw={(graphics) => {
						for (const guide of debugGuides) {
							graphics.moveTo(guide.leftX, guide.y);
							graphics.lineTo(guide.rightX, guide.y);
						}
						graphics.stroke({ width: 2, color: 0x31E7FF, alpha: 0.7 });
					}}
				/>
				<Graphics
					draw={(graphics) => {
						graphics.moveTo(0, debugPose.y);
						graphics.lineTo(viewport.w, debugPose.y);
						graphics.moveTo(debugTargetPos.x, Math.max(0, debugPose.y - 220));
						graphics.lineTo(debugTargetPos.x, Math.min(viewport.h, debugPose.y + 220));
						if (debugPendingPos) {
							graphics.moveTo(debugPendingPos.x, debugPendingPos.y);
							graphics.lineTo(debugTargetPos.x, debugPose.y);
						}
						graphics.stroke({ width: 3, color: 0x00ff66, alpha: 0.95 });
					}}
				/>
				<Graphics
					draw={(graphics) => {
						const samples = 26;
						const spawnYOffset = itemSpawnOffset();
						for (const offset of debugPickupPathOffsets) {
							for (let i = 0; i <= samples; i += 1) {
								const t = i / samples;
								const pos = pickupLanePosition(t, Number(offset));
								const x = pos.x;
								const y = pos.y + spawnYOffset;
								if (i === 0) graphics.moveTo(x, y);
								else graphics.lineTo(x, y);
							}
						}
						graphics.stroke({ width: 2, color: 0xff3b3b, alpha: 0.65 });
					}}
				/>
				<Graphics
					draw={(graphics) => {
						for (const crossing of debugLineCrossings) {
							graphics.circle(crossing.x, crossing.y, Math.max(7, viewport.w * 0.005));
						}
						graphics.stroke({ width: 3, color: 0x2f8fff, alpha: 0.95 });
					}}
				/>
				<Graphics
					draw={(graphics) => {
						if (!debugGoalPos) return;
						const markerSize = 12;
						graphics.moveTo(debugGoalPos.x - markerSize, debugGoalPos.y);
						graphics.lineTo(debugGoalPos.x + markerSize, debugGoalPos.y);
						graphics.moveTo(debugGoalPos.x, debugGoalPos.y - markerSize);
						graphics.lineTo(debugGoalPos.x, debugGoalPos.y + markerSize);
						graphics.moveTo(debugPose.x, debugPose.y);
						graphics.lineTo(debugGoalPos.x, debugGoalPos.y);
						graphics.stroke({ width: 3, color: 0xFF2D95, alpha: 0.95 });
					}}
				/>
				<Graphics
					draw={(graphics) => {
						for (let i = 0; i < debugGuides.length - 1; i += 1) {
							const current = debugGuides[i];
							const next = debugGuides[i + 1];
							if (!current || !next) continue;
							graphics.moveTo(debugMeasureX, current.y);
							graphics.lineTo(debugMeasureX, next.y);
							graphics.moveTo(debugMeasureX - 7, current.y);
							graphics.lineTo(debugMeasureX + 7, current.y);
							graphics.moveTo(debugMeasureX - 7, next.y);
							graphics.lineTo(debugMeasureX + 7, next.y);
						}
						graphics.stroke({ width: 2, color: 0xFFD64A, alpha: 0.85 });
					}}
				/>
				{#each debugGuides as guide, idx (guide.step)}
					{#if guide.distanceToNext != null && debugGuides[idx + 1]}
						{@const nextGuide = debugGuides[idx + 1]}
						<Text
							text={`${Math.round(guide.distanceToNext)}px`}
							x={debugMeasureX + Math.max(16, viewport.w * 0.008)}
							y={(guide.y + nextGuide.y) * 0.5}
							anchor={{ x: 0, y: 0.5 }}
							style={{
								fill: 0xFFD64A,
								fontFamily: 'Poppins',
								fontSize: Math.max(12, Math.round(viewport.w * 0.008)),
								fontWeight: '700',
								stroke: { color: 0x000000, alpha: 0.95, width: 3 }
							}}
						/>
					{/if}
				{/each}
				{#each debugLineCrossings as crossing (crossing.slot)}
					<Text
						text={`${crossing.slot}`}
						x={crossing.x}
						y={crossing.y - Math.max(16, viewport.h * 0.018)}
						anchor={{ x: 0.5, y: 0.5 }}
						style={{
							fill: 0x2f8fff,
							fontFamily: 'Poppins',
							fontSize: Math.max(10, Math.round(viewport.w * 0.0062)),
							fontWeight: '700',
							stroke: { color: 0x000000, alpha: 0.95, width: 3 }
						}}
					/>
				{/each}
					<Text
						text={`TARGET LANE ${penguinTargetLane.toFixed(2)}`}
						x={Math.min(viewport.w - 20, debugTargetPos.x + 12)}
						y={Math.max(20, debugPose.y - 230)}
						anchor={{ x: 0, y: 0.5 }}
						style={{
							fill: 0x00ff66,
							fontFamily: 'Poppins',
							fontSize: Math.max(11, Math.round(viewport.w * 0.007)),
							fontWeight: '700',
							stroke: { color: 0x000000, alpha: 0.95, width: 3 }
						}}
					/>
					{#if debugPendingHit}
						<Text
							text={`NEXT HIT S${debugPendingHit.stepIndex} L${targetLaneForToken(debugPendingHit).toFixed(2)}`}
							x={16}
							y={Math.max(20, debugPose.y - 230)}
							anchor={{ x: 0, y: 0.5 }}
							style={{
								fill: 0x31E7FF,
								fontFamily: 'Poppins',
								fontSize: Math.max(11, Math.round(viewport.w * 0.007)),
								fontWeight: '700',
								stroke: { color: 0x000000, alpha: 0.95, width: 3 }
							}}
						/>
						<Text
							text={`BAND:${debugPendingMeetsBand ? 1 : 0} PASS:${debugPendingBand?.passedBand ? 1 : 0} TRG:${debugPendingTriggerReached ? 1 : 0} MATCH:${debugPendingLaneMatch ? 1 : 0}`}
							x={16}
							y={Math.max(44, debugPose.y - 204)}
							anchor={{ x: 0, y: 0.5 }}
							style={{
								fill: 0xffffff,
								fontFamily: 'Poppins',
								fontSize: Math.max(10, Math.round(viewport.w * 0.0065)),
								fontWeight: '700',
								stroke: { color: 0x000000, alpha: 0.95, width: 3 }
							}}
						/>
						<Text
							text={`yΔ:${(debugPendingBand?.yDelta ?? 0).toFixed(1)} step:${renderStep.toFixed(1)} trig:${debugPendingTrigger.toFixed(1)} lock:${debugActiveLockHit ? `S${debugActiveLockHit.stepIndex}` : 'none'}`}
							x={16}
							y={Math.max(68, debugPose.y - 180)}
							anchor={{ x: 0, y: 0.5 }}
							style={{
								fill: 0xffb86b,
								fontFamily: 'Poppins',
								fontSize: Math.max(10, Math.round(viewport.w * 0.0065)),
								fontWeight: '700',
								stroke: { color: 0x000000, alpha: 0.95, width: 3 }
							}}
						/>
						{#if debugGoalPos}
							<Text
								text={`GOAL TARGET xΔ:${(debugGoalPos.x - debugPose.x).toFixed(1)} yΔ:${(debugGoalPos.y - debugPose.y).toFixed(1)} S${debugPendingGoal?.stepIndex ?? '-'}`}
								x={16}
								y={Math.max(92, debugPose.y - 156)}
								anchor={{ x: 0, y: 0.5 }}
								style={{
									fill: 0xFF2D95,
									fontFamily: 'Poppins',
									fontSize: Math.max(10, Math.round(viewport.w * 0.0065)),
									fontWeight: '700',
									stroke: { color: 0x000000, alpha: 0.95, width: 3 }
								}}
							/>
						{/if}
					{/if}
					{/if}
				<PickupLayer
					{tokens}
					{renderStep}
					{viewport}
					{tokenRender}
					lanePosition={pickupLanePosition}
					{tokenSpineSize}
					{coinAssetKey}
					{itemSpawnOffset}
					showSteps={false}
					stepSpacing={stepSpacing}
					{pickupTriggerAt}
				/>
			</Container>
			{@const pose = penguinPose()}
			{@const tiltRot = ctrlRotation()}
		<SpineProvider
			{...spineProps({
				key: 'penguin',
				x: pose.x,
					y: pose.y,
					width: pose.size,
					height: pose.size,
					zIndex: 400
				})}
			>
				<PenguinSpineEvents onEvent={handlePenguinEvent} />
				<PenguinSpineSkin skin={penguinSkin} />
				<PenguinVestSlots enabled={penguinSkin === 'vest' || hasLifering} />
				{#key vestAnimKey}
					{#if vestAnim === 'gain'}
						<SpineTrack trackIndex={0} animationName="slide_vest_gain" loop={false} timeScale={1} />
					{:else if vestAnim === 'lose'}
						<SpineTrack trackIndex={0} animationName="slide_vest_lose" loop={false} timeScale={1} />
					{/if}
				{/key}
				{#if penguinAnim === 'slide_in'}
					<SpineTrack trackIndex={1} animationName="slide_in" loop={false} timeScale={0.65} />
				{:else if penguinAnim === 'slide_idle'}
					<SpineTrack trackIndex={1} animationName="slide_idle" loop timeScale={1} />
				{:else if penguinAnim === 'win'}
					<SpineTrack trackIndex={1} animationName="win" loop={false} timeScale={1} />
				{:else if penguinAnim === 'lose_L'}
					<SpineTrack trackIndex={1} animationName="lose_L" loop={false} timeScale={SLIP_ANIMATION_SPEED_MULT} />
				{:else if penguinAnim === 'lose_R'}
					<SpineTrack trackIndex={1} animationName="lose_R" loop={false} timeScale={SLIP_ANIMATION_SPEED_MULT} />
					{:else}
						<SpineTrack trackIndex={1} animationName="idle" loop timeScale={1} />
					{/if}
				<SpineBone boneName="CTRL" rotation={tiltRot} />
		</SpineProvider>
	{#if slipAnimationStarted}
			<!-- splash overlay disabled -->
		{/if}
			</Container>
			<Text
				text={formatCurrencyAmount(roundWinDisplay)}
				x={viewport.w * 0.5}
				y={accumulatedAmountY()}
				anchor={{ x: 0.5, y: 0.5 }}
				style={{
					fill: 0x000000,
					fontFamily: 'Gigalypse',
					fontSize: Math.round(52 * amountWinPulse),
					fontWeight: '800',
					lineHeight: Math.round(52 * amountWinPulse),
					padding: Math.max(8, Math.round(accumulatedStrokeWidth * 1.6)),
					stroke: {
						color: 0x000000,
						alpha: 1,
						width: Math.max(4, Math.round(accumulatedStrokeWidth * 0.55)),
						alignment: 0,
						join: 'round',
						miterLimit: 2
					},
					align: 'center'
				}}
			/>
			<Text
				text={formatCurrencyAmount(roundWinDisplay)}
				x={viewport.w * 0.5}
				y={accumulatedAmountY()}
				anchor={{ x: 0.5, y: 0.5 }}
				style={{
					fill: 0xFBCF00,
					fontFamily: 'Gigalypse',
					fontSize: Math.round(52 * amountWinPulse),
					fontWeight: '800',
					lineHeight: Math.round(52 * amountWinPulse),
					padding: Math.max(8, Math.round(accumulatedStrokeWidth * 1.6)),
					stroke: {
						color: 0x000000,
						alpha: 1,
						width: accumulatedStrokeWidth,
						alignment: 0.5,
						join: 'round',
						miterLimit: 2
					},
					align: 'center'
				}}
			/>
			{#if bananaLossFloat}
				{@const bananaLossT = Math.max(0, Math.min(1, (floatTime - bananaLossFloat.start) / 1.4))}
				{@const bananaLossEase = bananaLossT * bananaLossT * (3 - 2 * bananaLossT)}
				<Text
					text={formatCurrencyAmount(-bananaLossFloat.amount)}
					x={viewport.w * 0.5}
					y={accumulatedAmountY() + viewport.h * 0.035 + bananaLossEase * Math.max(34, viewport.h * 0.06)}
					anchor={{ x: 0.5, y: 0.5 }}
					style={{
						fill: 0xffffff,
						fontFamily: 'Gigalypse',
						fontSize: 42,
						fontWeight: '800',
						lineHeight: 42,
						stroke: { color: 0x000000, alpha: 0.95, width: 5, alignment: 0.5, join: 'round', miterLimit: 2 },
						align: 'center'
					}}
					alpha={Math.max(0, 1 - bananaLossT * 0.85)}
				/>
			{/if}

				</Container>
			</Container>
			</App>

		<div class="hud-top" class:menu-open={menuOpen}>
			<div class="hud-left">
				<span class="hud-time">{timeLabel}</span>
				<span class="hud-divider">|</span>
				<span class="hud-user">{t('game_title')}</span>
			</div>
			<div class="hud-balance-center">
				<span class="hud-balance-label">{t('balance_label')}</span>
				<strong>{formatCurrencyAmount(balance)}</strong>
			</div>
		</div>

		<div class="hud-left-rail" class:menu-open={menuOpen}>
			<button class="hud-round-btn hud-btn-feature" title={t('features')} aria-label={t('features')}></button>
			<button
				class="hud-round-btn menu-toggle hud-btn-menu"
				class:menu-open={menuOpen}
				onclick={toggleMenuOpen}
				title={menuOpen ? t('close_menu') : t('menu')}
				aria-label={menuOpen ? t('close_menu') : t('menu')}
			></button>
		</div>

		{#if menuOpen}
			<div class="menu-left-dock" aria-hidden="true"></div>
			<div class="hud-panel">
				<div class="hud-panel-header">
					<div class="hud-panel-fade"></div>
				</div>
				<div class="panel-section">
					<div class="panel-title-row">
						<div class="panel-title">{t('volatility')}</div>
						<div class="panel-help-anchor" class:panel-help-open={volatilityHelpOpen}>
							<button
								class="panel-help-btn"
								aria-label={t('volatility_help_label')}
								aria-expanded={volatilityHelpOpen ? 'true' : 'false'}
								onclick={(event) => toggleVolatilityHelp(event)}
							>
								?
							</button>
							<div class="panel-help-pop">
								<h4>{t('volatility_help_title')}</h4>
								<p>{t('volatility_help_intro')}</p>
								<p>{t('volatility_help_desc')}</p>
								<ul>
									<li>{t('volatility_low_desc')}</li>
									<li>{t('volatility_medium_desc')}</li>
									<li>{t('volatility_high_desc')}</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="panel-segment-wrap">
						<div class="panel-row panel-volatility">
							<button
								class="panel-chip"
								class:panel-active={selectedMode === 'BASE_HARD'}
								onclick={() => setMode('BASE_HARD', 'BASE HARD', '1,000x')}
								disabled={animationStatus === 'running'}
							>
								{t('low')}
							</button>
							<button
								class="panel-chip"
								class:panel-active={selectedMode === 'BASE_VERY_HARD'}
								onclick={() => setMode('BASE_VERY_HARD', 'BASE VERY HARD', '5,000x')}
								disabled={animationStatus === 'running'}
							>
								{t('medium')}
							</button>
							<button
								class="panel-chip"
								class:panel-active={selectedMode === 'BASE_EXTREME'}
								onclick={() => setMode('BASE_EXTREME', 'BASE EXTREME', '10,000x')}
								disabled={animationStatus === 'running'}
							>
								{t('high')}
							</button>
						</div>
						<div class="panel-note">{t('max_win_equals', { value: maxWinLabel })}</div>
					</div>
				</div>
				<div class="panel-section">
					<div class="panel-title">{t('sounds')}</div>
					<div class="panel-segment-wrap panel-sounds-wrap">
						<div class="panel-slider">
							<div class="panel-slider-fill" style={`width: ${hudVolume}%`}></div>
							<input
								class="panel-slider-input"
								type="range"
								min="0"
								max="100"
								step="1"
								value={hudVolume}
								oninput={(event) => setHudVolume((event.currentTarget as HTMLInputElement).valueAsNumber)}
								aria-label={t('volume')}
							/>
						</div>
						<div class="panel-sound-row">
							<button class="panel-switch" class:panel-switch-on={musicMuted} onclick={toggleHudMute} aria-label={t('stop_music_toggle')}></button>
							<span class="panel-sound-label">{t('stop_music')}</span>
						</div>
					</div>
				</div>
				<div class="panel-section panel-section-speed">
					<div class="panel-title">{t('speed')}</div>
					<div class="panel-segment-wrap">
						<div class="panel-row panel-speed-row">
							<button class="panel-chip panel-speed speed-normal" class:panel-active={speedFactor === 1} onclick={() => setSpeed(1)}>
								{t('normal')}
							</button>
								<button class="panel-chip panel-speed speed-quick" class:panel-active={speedFactor === 2} onclick={() => setSpeed(2)}>
									{t('fast')}
								</button>
								<button class="panel-chip panel-speed speed-turbo" class:panel-active={speedFactor === 4} onclick={() => setSpeed(4)}>
									{t('turbo')}
								</button>
						</div>
					</div>
				</div>
				<button class="panel-info-btn" data-info-label={t('info')} onclick={() => setMenuInfoOpen(true)} aria-label={t('game_info')}>{t('info')}</button>
			</div>
		{/if}

		{#if menuInfoOpen}
			<div class="menu-info-modal">
				<div class="menu-info-content">
					<button class="menu-info-close" onclick={() => setMenuInfoOpen(false)} aria-label={t('close')}></button>
					<h3>{t('how_to_play')}</h3>
					<p>{t('how_to_play_text')}</p>
					<h3>{t('autoplay')}</h3>
					<p>{t('autoplay_text')}</p>
				</div>
			</div>
		{/if}

			<div class="hud-right-rail" class:menu-open={menuOpen}>
				<div class="hud-mobile-controls-row">
					<button class="hud-round-btn hud-btn-feature hud-btn-feature-mobile" title={t('features')} aria-label={t('features')}></button>
					<div class="hud-mobile-bet-triplet">
						<button
							class="bet-control hud-btn-minus"
							aria-label={t('decrease_bet')}
							onclick={decreaseBet}
							disabled={animationStatus === 'running' || betIndex <= 0}
						></button>
						<button
							class="bet-main"
							class:bet-autospin={autoplay}
							class:bet-disabled={animationStatus === 'running' && !autoplay}
							onclick={handleBetClick}
							disabled={(animationStatus === 'running' && !autoplay) || pendingRound}
							aria-label={autoplayRemaining > 0 ? t('spins_count', { count: autoplayRemaining }) : t('bet')}
						>
							{#if autoplay && autoplayRemaining > 0}
								<div class="bet-autospin-card">
									<span class="bet-autospins-count">{autoplayRemaining}</span>
								</div>
							{:else}
								<span class="bet-main-label">{t('bet')}</span>
							{/if}
						</button>
						<button
							class="bet-control hud-btn-plus"
							aria-label={t('increase_bet')}
							onclick={increaseBet}
							disabled={animationStatus === 'running' || betIndex >= betLevels.length - 1}
						></button>
					</div>
					<button
						class="bet-control autoplay-icon-btn hud-btn-autoplay hud-btn-autoplay-mobile"
						class:autoplay-active={autoplay}
						class:autoplay-open={autoplayOpen}
						onclick={toggleAutoplayOpen}
						aria-label={autoplayOpen ? t('close_autoplay_options') : t('open_autoplay_options')}
						disabled={pendingRound}
					></button>
				</div>
				<div class="bet-cluster">
					<button
						class="bet-main"
					class:bet-autospin={autoplay}
					class:bet-disabled={animationStatus === 'running' && !autoplay}
					onclick={handleBetClick}
					disabled={(animationStatus === 'running' && !autoplay) || pendingRound}
					aria-label={autoplayRemaining > 0 ? t('spins_count', { count: autoplayRemaining }) : t('bet')}
				>
					{#if autoplay && autoplayRemaining > 0}
						<div class="bet-autospin-card">
							<span class="bet-autospins-count">{autoplayRemaining}</span>
						</div>
					{:else}
						<span class="bet-main-label">{t('bet')}</span>
					{/if}
				</button>
				<div class="bet-controls-rail">
					<button
						class="bet-control autoplay-icon-btn hud-btn-autoplay"
						class:autoplay-active={autoplay}
						class:autoplay-open={autoplayOpen}
						onclick={toggleAutoplayOpen}
						aria-label={autoplayOpen ? t('close_autoplay_options') : t('open_autoplay_options')}
						disabled={pendingRound}
					></button>
					<button
						class="bet-control hud-btn-plus"
						aria-label={t('increase_bet')}
						onclick={increaseBet}
						disabled={animationStatus === 'running' || betIndex >= betLevels.length - 1}
					></button>
					<button
						class="bet-control hud-btn-minus"
						aria-label={t('decrease_bet')}
						onclick={decreaseBet}
						disabled={animationStatus === 'running' || betIndex <= 0}
					></button>
				</div>
			</div>
			{#if autoplayOpen}
				<div class="autoplay-menu">
					<div class="autoplay-header">
						<div class="autoplay-main-title">{t('autoplay_title')}</div>
						<button class="autoplay-close hud-btn-close" onclick={toggleAutoplayOpen} aria-label={t('close')}></button>
					</div>
					<div class="autoplay-title">{t('spins')}</div>
					<div class="autoplay-row">
						{#each autoplayOptions as count}
							<button class="autoplay-chip" class:panel-active={autoplayDraftCount === count} onclick={() => setAutoplayDraft(count)}>
								{count}
							</button>
						{/each}
					</div>
					<div class="autoplay-title">{t('speed')}</div>
					<div class="autoplay-speed">
						<button class="autoplay-chip panel-speed speed-normal" class:panel-active={speedFactor === 1} onclick={() => setSpeed(1)}>{t('normal')}</button>
							<button class="autoplay-chip panel-speed speed-quick" class:panel-active={speedFactor === 2} onclick={() => setSpeed(2)}>{t('fast')}</button>
							<button class="autoplay-chip panel-speed speed-turbo" class:panel-active={speedFactor === 4} onclick={() => setSpeed(4)}>{t('turbo')}</button>
						</div>
						<button class="autoplay-start" onclick={handleStartAutoplay} disabled={animationStatus === 'running' || status === 'sliding' || pendingRound}>
							{isMobileLandscapeUi ? t('start') : t('start_autospins')}
						</button>
				</div>
			{/if}
			<div class="bet-info">
				<div class="bet-total">
					<strong>{formatCurrencyAmount(betAmount * TOTAL_COST_MULTIPLIER)}</strong>
					<span>{t('total_cost')}</span>
				</div>
				<div class="bet-size">
					<strong>{formatCurrencyAmount(betAmount)}</strong>
					<span>{t('bet_size')}</span>
				</div>
			</div>
					<button
						class="hud-speed-cycle"
						class:speed-normal={speedFactor === 1}
						class:speed-quick={speedFactor === 2}
						class:speed-turbo={speedFactor === 4}
						onclick={cycleSpeed}
						aria-label={t('change_speed')}
					></button>
		</div>

		{#if errorMessage}
			<p class="error hud-error">{errorMessage}</p>
		{/if}

	{#if pendingRound}
		<div class="round-overlay">
			<div class="round-card">
				<h3>{t('resume_last_round')}</h3>
				<p>
					{t('resume_last_round_desc')}
				</p>
				<div class="round-actions">
					<button class="ghost" onclick={() => resolvePendingRound(false)}>{t('discard')}</button>
					<button class="primary" onclick={() => resolvePendingRound(true)}>{t('view')}</button>
				</div>
			</div>
		</div>
	{/if}

		</div>
	</div>
</div>

<style global>
	@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

	:global(body) {
		font-family: var(--font-poppins);
		font-size: var(--type-p1-size);
		line-height: var(--type-p1-line);
    color-scheme: only light;
    background: #0b1220;
    overflow: hidden;
}

    :global(html) {
    color-scheme: only light;
    overflow: hidden;
}

	:root {
		--font-gigalypse: 'Gigalypse', 'Poppins', sans-serif;
		--font-poppins: 'Poppins', sans-serif;
		--type-label-large-size: 40px;
		--type-label-medium-size: 16px;
		--type-label-small-size: 12px;
		--type-h1-size: 32px;
		--type-h2-size: 24px;
		--type-h3-size: 16px;
		--type-tag-size: 20px;
		--type-p1-size: 16px;
		--type-p1-line: 24px;
		--type-cta-size: 24px;
		--hud-panel-bg: rgba(6, 20, 32, 0.88);
		--hud-panel-border: rgba(120, 180, 220, 0.28);
		--hud-yellow: #ffcc00;
		--accent-green-gradient: linear-gradient(180deg, #FBCF00 0%, #E3AC00 100%);
		--hud-text: #e9f3ff;
		--hud-muted: #94abc0;
		--hud-text-stroke-width: 1.2px;
		--hud-edge-margin-x: 30px;
		--hud-edge-margin-y: 28px;
		--hud-edge-margin-mobile: 12px;
	}

	:global(body) {
		margin: 0;
	}

	.page {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #0b1220;
		color-scheme: only light;
		forced-color-adjust: none;
	}

	.boot-loader {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: #0b1220;
		z-index: 20000;
		pointer-events: all;
	}

	.boot-loader-image {
		width: 100vw;
		height: 100vh;
		object-fit: cover;
		image-rendering: auto;
	}

	.game-body {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		forced-color-adjust: none;
	}

	.hud-round-btn::after,
	.bet-control::after,
	.hud-speed-cycle::after,
	.menu-info-close::after,
	.autoplay-close::after,
	.panel-info-btn::after {
		filter: none !important;
		-webkit-filter: none !important;
		forced-color-adjust: none;
	}

	.stage {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		transform-origin: top left;
		overflow: hidden;
		z-index: 1;
	}

	button {
		border: none;
		border-radius: 999px;
		padding: 0;
		font-weight: 700;
		background: transparent;
		color: #e2e8f0;
		cursor: pointer;
		box-shadow: none;
		transition: background-color 0.2s ease;
		touch-action: manipulation;
	}

	button:hover {
		transform: none;
	}

	.hud-top {
		position: fixed;
		inset: var(--hud-edge-margin-y) var(--hud-edge-margin-x) auto var(--hud-edge-margin-x);
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		color: var(--hud-text);
		z-index: 1001;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		pointer-events: none;
		font-size: var(--type-label-small-size);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8);
		font-family: var(--font-gigalypse);
	}

	.hud-left {
		display: flex;
		gap: 6px;
		align-items: center;
		font-size: var(--type-label-small-size);
		opacity: 0.96;
		justify-self: start;
	}

	.hud-divider {
		opacity: 0.6;
	}

	.hud-balance-center {
		display: flex;
		gap: 8px;
		align-items: center;
		justify-self: center;
		text-shadow: none;
		font-family: var(--font-gigalypse);
	}

	.hud-balance-label,
	.hud-balance-center strong {
		font-family: var(--font-gigalypse);
		font-weight: 800;
		font-size: 16px;
		line-height: 100%;
		letter-spacing: 0;
		text-transform: uppercase;
		text-shadow: none;
		-webkit-text-stroke: var(--hud-text-stroke-width) #000;
		text-rendering: geometricPrecision;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}
	.hud-balance-label {
		color: #fbcf00;
	}
	.hud-balance-center strong {
		color: #ffffff;
	}

	.hud-right-rail {
		position: fixed;
		right: var(--hud-edge-margin-x);
		bottom: var(--hud-edge-margin-y);
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		z-index: 1001;
		pointer-events: none;
	}

	.hud-left-rail {
		position: fixed;
		left: var(--hud-edge-margin-x);
		bottom: calc(var(--hud-edge-margin-y) + 20px);
		display: flex;
		flex-direction: column;
		gap: 10px;
		z-index: 6;
	}

	.hud-round-btn {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		border: 1px solid transparent;
		border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 100%);
		padding: 0;
		display: grid;
		place-items: center;
		background: #000000b2;
		box-shadow: 0 2px 0 0 #000000eb;
		pointer-events: auto;
		--btn-icon: none;
	}

	.hud-left-rail.menu-open .hud-round-btn {
		background: #000000b2;
	}

	.hud-left-rail.menu-open .hud-round-btn:hover,
	.hud-left-rail.menu-open .hud-round-btn:active {
		background: #000000b2;
	}

	.hud-round-btn:hover {
		filter: brightness(1.08);
	}

	.hud-round-btn:active {
		filter: brightness(0.92);
	}

	.hud-round-btn::after {
		content: '';
		width: 22px;
		height: 22px;
		background-image: var(--btn-icon);
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
	}

	.hud-btn-feature::after {
		width: 28px;
		height: 28px;
	}

	.hud-btn-feature {
		--btn-icon: url('./assets/hud/kit/icon-features.png');
	}

	.hud-btn-menu {
		--btn-icon: url('./assets/hud/kit/icon-menu.png');
	}

	.hud-btn-menu.menu-open {
		--btn-icon: url('./assets/hud/kit/icon_close.png');
	}

	.bet-cluster {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		pointer-events: auto;
	}

	.hud-mobile-controls-row {
		display: none;
	}

	.bet-main {
		width: 132px;
		height: 132px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--accent-green-gradient);
		color: #000000cc;
		font-size: 36px;
		font-weight: 800;
		font-family: var(--font-gigalypse);
		box-shadow: 0 2px 0 0 #000000eb;
		border: 2px solid rgba(0, 0, 0, 0.32);
		pointer-events: auto;
		padding: 0;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		margin-right: 0;
	}

	.bet-main:hover {
		filter: brightness(1.05);
	}

	.bet-main:active {
		filter: brightness(0.94);
	}

	.bet-main-label {
		font-family: var(--font-gigalypse);
		font-size: 36px;
		font-weight: 800;
		line-height: 1;
		color: #000000cc;
	}

	.bet-main.bet-autospin {
		background-image: none;
		background-color: rgba(0, 0, 0, 0.62);
		border: 1px solid rgba(255, 255, 255, 0.16);
		box-shadow: none;
	}

	.bet-autospin-card {
		width: 56%;
		height: 56%;
		border-radius: 10px;
		background: rgba(148, 163, 184, 0.45);
		display: grid;
		place-items: center;
	}

	.bet-autospins-count {
		font-family: var(--font-gigalypse);
		font-size: 34px;
		line-height: 1;
		font-weight: 800;
		color: #ffffff;
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}

	.bet-main.bet-disabled {
		background-color: rgba(145, 151, 161, 0.72);
		box-shadow: none;
		cursor: not-allowed;
		opacity: 1;
		filter: none;
	}

	.bet-main:disabled {
		background-color: rgba(145, 151, 161, 0.72);
		opacity: 1;
		filter: none;
	}

	.autoplay-menu {
		position: absolute;
		right: 35%;
		bottom: 20%;
		width: min(520px, 78vw);
		height: 60vh;
		display: grid;
		gap: 18px;
		padding: 22px;
		border-radius: 14px;
		background: rgba(0, 0, 0, 0.95);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
		pointer-events: auto;
		overflow-y: auto;
		overflow-x: hidden;
		align-content: start;
	}

	.autoplay-title {
		font-family: var(--font-poppins);
		font-weight: 600;
		font-size: 16px;
		line-height: 100%;
		letter-spacing: 0;
		color: #FFFFFFE5;
		text-align: left;
		text-transform: none;
	}

	.autoplay-title + .autoplay-row,
	.autoplay-title + .autoplay-speed {
		margin-top: -8px;
	}

	.autoplay-main-title {
		font-family: var(--font-gigalypse);
		font-weight: 800;
		font-size: 32px;
		line-height: 100%;
		letter-spacing: 0;
		color: var(--hud-text);
		text-transform: uppercase;
	}

	.autoplay-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.autoplay-close {
		width: 46px;
		height: 46px;
		padding: 0;
		border-radius: 999px;
		background: #000000b2;
		border: 1px solid transparent;
		border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 100%);
		box-shadow: 0 2px 0 0 #000000eb;
		color: #fff;
		font-size: 20px;
		line-height: 1;
		display: grid;
		place-items: center;
	}

	.autoplay-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 7px;
	}

	.autoplay-speed {
		margin-top: 6px;
		margin-bottom: 10px;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
		padding: 4px;
		border: 1px solid #FFFFFF33;
		border-radius: 8px;
		background: transparent;
	}

	.autoplay-chip {
		padding: 8px 0;
		border-radius: 6px;
		font-size: var(--type-p1-size);
		line-height: var(--type-p1-line);
		font-weight: 600;
		background: rgba(30, 41, 59, 0.5);
		border: 1px solid rgba(148, 163, 184, 0.2);
		color: var(--hud-text);
		font-family: var(--font-poppins);
	}

	.autoplay-chip:hover {
		background: rgba(51, 65, 85, 0.95);
	}

	.autoplay-row .autoplay-chip.panel-active {
		background: #ffffff;
		border-color: #ffffff;
		color: #111827;
	}

	.autoplay-speed .autoplay-chip {
		background: transparent;
		border-color: transparent;
	}

	.autoplay-speed .autoplay-chip.panel-active {
		background: #FFFFFF33;
		border-color: #FFFFFF33;
		color: #ffffff;
	}

	.autoplay-start {
		margin-top: 12px;
		width: 100%;
		height: 80px;
		border-radius: 8px;
		padding: 16px 12px;
		display: grid;
		place-items: center;
		background: linear-gradient(180deg, #FBCF00 0%, #E3AC00 100%);
		color: #000000;
		font-family: var(--font-gigalypse);
		font-weight: 800;
		font-size: 24px;
		line-height: 100%;
		letter-spacing: 0;
		text-transform: uppercase;
		gap: 8px;
	}

	.autoplay-start:hover {
		background: linear-gradient(180deg, #FFD940 0%, #EDB800 100%);
	}

	.autoplay-start:active {
		background: linear-gradient(180deg, #E3AC00 0%, #C89400 100%);
	}

	.bet-controls-rail {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
		pointer-events: auto;
		padding-bottom: 6px;
	}

	.bet-control {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: #000000b2;
		border: 1px solid transparent;
		border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 100%);
		font-size: 19px;
		line-height: 0;
		padding: 0;
		font-weight: 700;
		box-shadow: 0 2px 0 0 #000000eb;
		--btn-icon: none;
	}

	.bet-control:hover {
		filter: brightness(1.08);
	}

	.bet-control:active {
		filter: brightness(0.92);
	}

	.bet-control:disabled {
		background: #0000008c;
		opacity: 0.65;
		box-shadow: 0 2px 0 0 #000000eb;
	}

	.bet-control::after {
		content: '';
		width: 22px;
		height: 22px;
		background-image: var(--btn-icon);
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
	}

	.autoplay-icon-btn.autoplay-active {
		filter: saturate(1.35);
	}

	.hud-btn-autoplay {
		--btn-icon: url('./assets/hud/kit/icon-autoplay.png');
	}

	.hud-btn-autoplay.autoplay-open {
		--btn-icon: url('./assets/hud/kit/icon_close.png');
	}

	.hud-btn-plus {
		--btn-icon: url('./assets/hud/kit/icon-plus.png');
	}

	.hud-btn-minus {
		--btn-icon: url('./assets/hud/kit/icon-minus.png');
	}

	.hud-speed-cycle {
		display: none;
	}

	.bet-info {
		text-align: right;
		font-size: var(--type-label-medium-size);
		font-weight: 400;
		color: var(--hud-yellow);
		text-shadow:
			-1px 0 0 rgba(0, 0, 0, 0.9),
			1px 0 0 rgba(0, 0, 0, 0.9),
			0 -1px 0 rgba(0, 0, 0, 0.9),
			0 1px 0 rgba(0, 0, 0, 0.9);
		margin-top: 8px;
		margin-right: 4px;
		font-family: var(--font-gigalypse);
		letter-spacing: 0.02em;
		text-transform: uppercase;
		display: grid;
		grid-template-columns: 1fr;
		gap: 6px;
	}

	.bet-total,
	.bet-size {
		display: inline-flex;
		align-items: baseline;
		justify-content: flex-end;
		gap: 6px;
		color: var(--hud-yellow);
	}

	.bet-size span,
	.bet-total span,
	.bet-size strong,
	.bet-total strong {
		font-family: var(--font-gigalypse);
		font-weight: 800;
		font-style: normal;
		font-size: 16px;
		line-height: 100%;
		letter-spacing: 0;
		text-align: center;
		text-transform: uppercase;
		-webkit-text-stroke: var(--hud-text-stroke-width) #000;
		text-shadow: none;
		text-rendering: geometricPrecision;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.bet-total span,
	.bet-total strong {
		color: #fbcf00;
	}

	.bet-size span,
	.bet-size strong {
		color: #ffffff;
	}

	.bet-size span,
	.bet-total span {
		order: 0;
	}

	.bet-size strong,
	.bet-total strong {
		order: 1;
	}

	.error {
		color: #fb7185;
		margin: 0;
	}

	.hud-error {
		position: absolute;
		left: 50%;
		bottom: 120px;
		transform: translateX(-50%);
		z-index: 6;
		background: rgba(17, 24, 39, 0.7);
		padding: 8px 12px;
		border-radius: 10px;
		border: 1px solid rgba(248, 113, 113, 0.4);
	}

	.menu-toggle {
		font-size: 17px;
	}

	.hud-panel {
		position: absolute;
		left: 46px;
		top: 50%;
		transform: translateY(-50%);
		width: min(330px, 76vw);
		padding: 14px;
		border-radius: 10px;
		background: var(--hud-panel-bg);
		border: 1px solid var(--hud-panel-border);
		color: var(--hud-text);
		z-index: 6;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
		display: grid;
		gap: 12px;
	}

	.hud-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2px;
	}

	.hud-panel-title {
		font-size: var(--type-h2-size);
		font-weight: 700;
		color: var(--hud-text);
		letter-spacing: 0.04em;
		font-family: var(--font-poppins);
	}

	.autoplay-close::after {
		content: '';
		width: 12px;
		height: 12px;
		background-image: var(--btn-icon);
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
	}

	.autoplay-close {
		--btn-icon: url('./assets/hud/kit/icon_close.png');
	}

	.autoplay-close::after {
		width: 16px;
		height: 16px;
	}

	.panel-section {
		display: grid;
		gap: 10px;
	}

	.panel-title {
		font-size: var(--type-h3-size);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--hud-muted);
		font-family: var(--font-poppins);
		font-weight: 600;
	}

	.panel-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
	}

	.panel-chip {
		padding: 8px 12px;
		border-radius: 5px;
		background: rgba(30, 41, 59, 0.5);
		color: var(--hud-text);
		font-size: var(--type-p1-size);
		line-height: var(--type-p1-line);
		border: 1px solid rgba(148, 163, 184, 0.2);
		font-family: var(--font-poppins);
		font-weight: 600;
		cursor: pointer;
	}

	.panel-chip:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.panel-chip.panel-active {
		background: rgba(255, 204, 0, 0.2);
		border-color: rgba(255, 204, 0, 0.75);
		color: #ffe47f;
	}

	.panel-note {
		font-size: var(--type-p1-size);
		line-height: var(--type-p1-line);
		color: var(--hud-muted);
		font-family: var(--font-poppins);
		font-weight: 400;
	}

	.panel-slider {
		flex: 1;
		height: 8px;
		border-radius: 999px;
		background: rgba(148, 163, 184, 0.24);
		background-image: url('./assets/hud/kit/switch-off.png');
		background-size: auto 100%;
		background-repeat: no-repeat;
		background-position: left center;
	}

	.panel-speed {
		padding-left: 0;
	}

	@media (min-width: 701px) {
		.menu-left-dock {
			position: absolute;
			left: 0;
			top: 0;
			bottom: 0;
			width: 88px;
			background: rgba(0, 0, 0, 0.88);
			border-right: 1px solid rgba(106, 155, 194, 0.16);
			z-index: 24;
		}

		.hud-left-rail {
			left: 18px;
			bottom: calc(var(--hud-edge-margin-y) + 26px);
			z-index: 26;
		}

		.hud-panel {
			left: 88px;
			top: 0;
			bottom: 0;
			transform: none;
			width: 340px;
			padding: 34px 16px 18px;
			border-radius: 0;
			background:
				linear-gradient(90deg, rgba(2, 14, 22, 0.96) 0%, rgba(2, 18, 30, 0.95) 72%, rgba(2, 18, 30, 0.82) 100%);
			border: 1px solid rgba(102, 162, 202, 0.22);
			border-left: none;
			gap: 12px;
			z-index: 25;
			animation: hudPanelSlideIn 220ms ease-out both;
			align-content: start;
		}

		.hud-panel-header {
			min-height: 18px;
			margin-bottom: 0;
			justify-content: flex-start;
		}

		.hud-panel-title {
			font-family: var(--font-gigalypse);
			font-size: 11px;
			font-weight: 800;
			letter-spacing: 0.06em;
			color: rgba(235, 248, 255, 0.95);
			text-transform: uppercase;
		}

		.hud-panel-fade {
			flex: 1;
		}

		.panel-title-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 8px;
		}

		.panel-segment-wrap {
			border: 1px solid #FFFFFF33;
			border-radius: 6px;
			padding: 6px;
			display: grid;
			gap: 8px;
		}

		.panel-help-btn {
			width: 18px;
			height: 18px;
			border-radius: 999px;
			border: 1px solid rgba(179, 209, 229, 0.45);
			background: rgba(14, 33, 50, 0.75);
			font-family: var(--font-poppins);
			font-weight: 700;
			font-size: 12px;
			line-height: 1;
			color: rgba(231, 244, 255, 0.95);
		}

		.panel-help-anchor {
			position: relative;
			display: inline-grid;
			place-items: center;
		}

		.panel-title {
			font-size: 16px;
			letter-spacing: 0;
			text-transform: none;
			color: rgba(240, 248, 255, 0.9);
		}

		.panel-row.panel-volatility,
		.panel-row.panel-speed-row {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 5px;
		}

		.panel-chip {
			padding: 9px 0;
			text-align: center;
			font-size: 18px;
			line-height: 1;
			border-radius: 4px;
			background: transparent;
			border: 1px solid transparent;
			color: rgba(238, 245, 250, 0.94);
		}

		.panel-chip.panel-active {
			background: #FFFFFF33;
			border-color: #FFFFFF33;
			color: #ffffff;
		}

		.panel-note {
			font-size: 13px;
			line-height: 1;
			color: rgba(173, 200, 219, 0.9);
			text-align: center;
		}

		.panel-slider {
			height: 28px;
			border-radius: 5px;
			background: rgba(17, 33, 47, 0.88);
			border: none;
			position: relative;
			overflow: visible;
		}

		.panel-slider-fill {
			position: absolute;
			inset: 0 auto 0 0;
			width: 58%;
			background: rgba(205, 214, 224, 0.92);
			pointer-events: none;
		}

		.panel-slider-input {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			appearance: none;
			-webkit-appearance: none;
			background: transparent;
			margin: 0;
			cursor: pointer;
		}

		.panel-slider-input::-webkit-slider-runnable-track {
			height: 100%;
			background: transparent;
		}

		.panel-slider-input::-webkit-slider-thumb {
			-webkit-appearance: none;
			width: 12px;
			height: 36px;
			border-radius: 2px;
			background: #d4dde6;
			border: 1px solid rgba(43, 54, 64, 0.75);
			margin-top: -4px;
		}

		.panel-slider-input::-moz-range-track {
			height: 100%;
			background: transparent;
			border: none;
		}

		.panel-slider-input::-moz-range-thumb {
			width: 12px;
			height: 36px;
			border-radius: 2px;
			background: #d4dde6;
			border: 1px solid rgba(43, 54, 64, 0.75);
		}

		.panel-sounds-wrap {
			gap: 9px;
		}

		.panel-sound-row {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.panel-switch {
			width: 42px;
			height: 22px;
			border-radius: 999px;
			border: 1px solid rgba(97, 133, 159, 0.45);
			background: rgba(4, 20, 32, 0.92);
			position: relative;
		}

		.panel-switch::after {
			content: '';
			position: absolute;
			top: 2px;
			left: 2px;
			width: 16px;
			height: 16px;
			border-radius: 50%;
			background: #dce8f2;
			transition: left 0.18s ease;
		}

		.panel-switch.panel-switch-on::after {
			left: 22px;
		}

		.panel-sound-label {
			font-family: var(--font-poppins);
			font-size: 13px;
			font-weight: 600;
			color: rgba(234, 245, 255, 0.95);
		}

			.panel-info-btn {
				width: 100%;
				height: 44px;
				border-radius: 6px;
				background: rgba(96, 115, 129, 0.55);
				border: 1px solid rgba(124, 147, 165, 0.28);
				display: grid;
				place-items: center;
				color: #f3f8ff;
				font-family: var(--font-gigalypse);
				font-size: 24px;
				line-height: 1;
				letter-spacing: 0.04em;
				text-transform: uppercase;
			}

			.panel-info-btn::after {
				display: none;
			}
	}

	.panel-help-pop {
		position: absolute;
		left: calc(100% + 8px);
		top: 0;
		width: 280px;
		padding: 14px 16px;
		border-radius: 12px;
		background: rgba(242, 246, 250, 0.97);
		color: #0f1820;
		box-shadow: 0 20px 44px rgba(0, 0, 0, 0.34);
		z-index: 40;
		display: none;
	}

	.panel-help-anchor.panel-help-open .panel-help-pop {
		display: block;
	}

	.panel-help-pop h4 {
		margin: 0 0 8px;
		font-family: var(--font-poppins);
		font-size: 28px;
		line-height: 1;
	}

	.panel-help-pop p {
		margin: 0 0 8px;
		font-size: 16px;
		line-height: 1.25;
	}

	.panel-help-pop ul {
		margin: 0;
		padding-left: 18px;
		font-size: 15px;
		line-height: 1.35;
	}

	.menu-info-modal {
		position: absolute;
		inset: 0;
		z-index: 10020;
		background: rgba(5, 10, 17, 0.72);
		backdrop-filter: blur(4px);
		display: grid;
		place-items: center;
	}

	.menu-info-content {
		position: relative;
		width: min(1020px, 94vw);
		max-height: 88vh;
		overflow: auto;
		padding: 34px 34px 30px;
		border-radius: 6px;
		background:
			linear-gradient(90deg, rgba(1, 12, 21, 0.97) 0%, rgba(2, 18, 30, 0.96) 68%, rgba(19, 16, 7, 0.9) 100%);
		border: 1px solid rgba(104, 155, 191, 0.24);
		color: #e8f3ff;
	}

	.menu-info-content h3 {
		margin: 0 0 14px;
		font-family: var(--font-poppins);
		font-size: 40px;
		line-height: 1;
		text-align: center;
	}

	.menu-info-content p {
		margin: 0 0 18px;
		font-size: 20px;
		line-height: 1.35;
	}

	.menu-info-close {
		position: absolute;
		top: 14px;
		right: 14px;
		width: 34px;
		height: 34px;
		border-radius: 999px;
		border: 1px solid transparent;
		border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 100%);
		background: #000000b2;
		box-shadow: 0 2px 0 0 #000000eb;
		--btn-icon: url('./assets/hud/kit/icon_close.png');
	}

	.menu-info-close::after {
		content: '';
		display: block;
		width: 18px;
		height: 18px;
		margin: auto;
		background: var(--btn-icon) center/contain no-repeat;
	}

	@keyframes hudPanelSlideIn {
		from {
			transform: translateX(-18px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.round-overlay {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgba(6, 10, 20, 0.7);
		backdrop-filter: blur(6px);
		z-index: 10;
	}

	.round-card {
		width: min(520px, 90vw);
		padding: 24px 28px;
		border-radius: 16px;
		background: rgba(12, 18, 32, 0.95);
		color: #e2e8f0;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
		text-align: center;
	}

	.round-card h3 {
		margin: 0 0 8px;
		font-size: 22px;
	}

	.round-card p {
		margin: 0 0 20px;
		color: #cbd5f5;
	}

	.round-actions {
		display: flex;
		gap: 22px;
		justify-content: center;
	}

	.round-actions button {
		min-width: 102px;
		height: 40px;
		padding: 0 14px;
		border-radius: 10px;
		border: 1px solid rgba(166, 195, 224, 0.35);
		background: rgba(16, 30, 47, 0.55);
		color: #e6f1ff;
		font-family: var(--font-poppins);
		font-size: 18px;
		font-weight: 700;
	}

	.round-actions button:hover {
		background: rgba(23, 41, 62, 0.72);
	}

	@media (max-width: 700px) and (orientation: portrait) {
		:root {
			--mobile-controls-line-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
			--mobile-side-tab-size: 44px;
			--mobile-autoplay-bottom: calc(var(--mobile-controls-line-bottom) + 24px);
			--mobile-menu-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
		}

		.hud-top {
			inset: 8px 8px auto 8px;
			grid-template-columns: 1fr;
			gap: 2px;
			justify-items: center;
			font-size: 10px;
		}

		.hud-left {
			justify-self: center;
			font-size: 10px;
			gap: 4px;
		}

		.hud-balance-center {
			gap: 4px;
		}

		.hud-left-rail {
			left: 0;
			bottom: var(--mobile-controls-line-bottom);
			gap: 8px;
			z-index: 32;
		}

		.hud-left-rail.menu-open .hud-btn-feature,
		.hud-left-rail.menu-open .hud-btn-feature:hover,
		.hud-left-rail.menu-open .hud-btn-feature:active {
			background: #0b2f50;
			border-color: rgba(125, 170, 204, 0.35);
		}

		.hud-round-btn {
			width: 46px;
			height: 46px;
		}

		.hud-round-btn::after {
			width: 18px;
			height: 18px;
		}

		.hud-right-rail {
			left: 0;
			right: 0;
			bottom: var(--mobile-controls-line-bottom);
			align-items: center;
			pointer-events: none;
			z-index: 32;
		}

		.hud-right-rail .bet-cluster,
		.hud-right-rail .hud-mobile-controls-row,
		.hud-right-rail .bet-info,
		.hud-right-rail .hud-speed-cycle {
			pointer-events: auto;
		}

		.hud-right-rail .bet-cluster {
			display: none;
		}

		.hud-left-rail .hud-btn-feature {
			display: none;
		}

		.hud-mobile-controls-row {
			display: grid;
			align-items: center;
			grid-template-columns: auto 1fr auto;
			column-gap: 0;
			width: 100vw;
			padding: 0;
			box-sizing: border-box;
			margin: 0;
		}

		.hud-mobile-bet-triplet {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 10px;
		}

		.hud-mobile-controls-row .hud-round-btn,
		.hud-mobile-controls-row .bet-control {
			position: relative;
			left: auto;
			right: auto;
			top: auto;
			bottom: auto;
			width: 46px;
			height: 46px;
			border-radius: 50%;
			transform: none;
		}

		.hud-mobile-controls-row .hud-btn-feature {
			width: 42px;
			height: 44px;
			border-radius: 0 14px 14px 0;
			background: #000000b2;
			border: 1px solid transparent;
			border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 100%);
			box-shadow: 0 2px 0 0 #000000eb;
			border-left: none;
			margin-left: -8px;
		}

		.hud-mobile-controls-row .hud-btn-autoplay {
			width: 42px;
			height: 44px;
			border-radius: 14px 0 0 14px;
			background: #000000b2;
			border: 1px solid transparent;
			border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 100%);
			box-shadow: 0 2px 0 0 #000000eb;
			border-right: none;
			margin-right: -8px;
		}

		.hud-mobile-controls-row .bet-control:hover,
		.hud-mobile-controls-row .bet-control:active,
		.hud-mobile-controls-row .bet-control:focus,
		.hud-mobile-controls-row .bet-control:focus-visible {
			transform: none;
		}

		.hud-mobile-controls-row .bet-main {
			position: relative;
			left: auto;
			right: auto;
			top: auto;
			bottom: auto;
			transform: none;
			width: 92px;
			height: 92px;
			z-index: 2;
		}

		.hud-mobile-controls-row .bet-main:hover,
		.hud-mobile-controls-row .bet-main:active,
		.hud-mobile-controls-row .bet-main:focus,
		.hud-mobile-controls-row .bet-main:focus-visible {
			transform: none;
		}

		.hud-mobile-controls-row .hud-btn-feature::after,
		.hud-mobile-controls-row .hud-btn-autoplay::after {
			width: 20px;
			height: 20px;
		}

		.bet-cluster {
			position: relative;
			width: min(340px, 96vw);
			height: 92px;
			display: block;
		}

		.bet-main {
			width: 92px;
			height: 92px;
			position: absolute;
			left: 50%;
			bottom: 0;
			transform: translateX(-50%);
			z-index: 2;
		}

		.bet-main:hover,
		.bet-main:active,
		.bet-main:focus,
		.bet-main:focus-visible {
			transform: translateX(-50%);
		}

		.bet-main-label {
			font-size: 30px;
		}

		.bet-controls-rail {
			position: absolute;
			inset: 0;
			padding-bottom: 0;
			display: block;
			pointer-events: none;
			z-index: 3;
		}

		.bet-control {
			position: absolute;
			width: 46px;
			height: 46px;
			top: 50%;
			transform: translateY(-50%);
			pointer-events: auto;
			z-index: 4;
		}

		.bet-control:hover,
		.bet-control:active,
		.bet-control:focus,
		.bet-control:focus-visible {
			transform: translateY(-50%);
		}

		.bet-control::after {
			width: 18px;
			height: 18px;
		}

		.hud-btn-autoplay {
			position: fixed;
			right: 0;
			left: auto;
			top: auto;
			bottom: var(--mobile-autoplay-bottom);
			width: var(--mobile-side-tab-size);
			height: var(--mobile-side-tab-size);
			transform: none;
			border-radius: 14px 0 0 14px;
			border-right: none;
			z-index: 8;
		}
		.hud-btn-autoplay::after {
			width: 22px;
			height: 22px;
		}

		.hud-btn-autoplay:hover,
		.hud-btn-autoplay:active,
		.hud-btn-autoplay:focus,
		.hud-btn-autoplay:focus-visible {
			transform: none;
		}

		.hud-btn-plus {
			left: calc(50% + 66px);
		}

		/* Third control is minus -> left of BET */
		.hud-btn-minus {
			left: calc(50% - 112px);
		}

		.hud-btn-feature {
			position: fixed;
			left: 0;
			right: auto;
			top: auto;
			bottom: var(--mobile-autoplay-bottom);
			width: var(--mobile-side-tab-size);
			height: var(--mobile-side-tab-size);
			transform: none;
			border-radius: 0 14px 14px 0;
			border-left: none;
			z-index: 8;
		}
		.hud-btn-feature::after {
			width: 26px;
			height: 26px;
		}

		.hud-btn-feature:hover,
		.hud-btn-feature:active,
		.hud-btn-feature:focus,
		.hud-btn-feature:focus-visible {
			transform: none;
		}

		.hud-btn-menu {
			position: fixed;
			left: 6px;
			right: auto;
			top: auto;
			bottom: var(--mobile-menu-bottom);
			width: 24px;
			height: 24px;
			transform: none;
			border-radius: 0;
			background: transparent !important;
			border: none !important;
			box-shadow: none !important;
			z-index: 8;
		}

		.hud-btn-menu.menu-open {
			--btn-icon: url('./assets/hud/kit/icon-menu.png');
		}

		.hud-left-rail.menu-open .hud-btn-menu,
		.hud-left-rail.menu-open .hud-btn-menu:hover,
		.hud-left-rail.menu-open .hud-btn-menu:active,
		.hud-btn-menu:hover,
		.hud-btn-menu:active,
		.hud-btn-menu:focus,
		.hud-btn-menu:focus-visible {
			background: transparent !important;
			border-color: transparent !important;
			border: none !important;
			box-shadow: none !important;
		}
		.hud-btn-menu::after {
			width: 20px;
			height: 20px;
		}

		.hud-btn-menu:hover,
		.hud-btn-menu:active,
		.hud-btn-menu:focus,
		.hud-btn-menu:focus-visible {
			transform: none;
		}

		.bet-info {
			position: static;
			margin: 10px 0 0;
			width: min(220px, 70vw);
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 6px;
			text-align: center;
			font-size: 12px;
			line-height: 1;
		}

		.bet-total,
		.bet-size {
			margin: 0;
			display: grid;
			grid-template-columns: 1fr;
			gap: 2px;
			justify-items: center;
		}

		.bet-total strong,
		.bet-size strong {
			order: 0;
		}

		.bet-total span,
		.bet-size span {
			order: 1;
		}

		.bet-total span {
			white-space: nowrap;
		}

		.menu-left-dock {
			display: none;
		}

		.hud-panel {
			position: fixed;
			left: 0;
			right: 0;
			top: auto;
			bottom: 0;
			transform: none;
			width: 100vw;
			max-height: 52vh;
			padding: 12px 12px calc(104px + env(safe-area-inset-bottom, 0px));
			border-radius: 14px 14px 0 0;
			background: linear-gradient(180deg, rgba(1, 10, 18, 0.96) 0%, rgba(1, 9, 16, 0.95) 74%, rgba(0, 0, 0, 0.98) 100%);
			border: 1px solid rgba(126, 165, 196, 0.22);
			border-bottom: none;
			gap: 12px;
			overflow: visible;
			z-index: 30;
			box-shadow: 0 20px 36px rgba(0, 0, 0, 0.42);
			box-sizing: border-box;
			will-change: transform, opacity;
			animation: mobileMenuSheetIn 220ms ease-out both;
		}

		.hud-left-rail.menu-open .hud-btn-feature,
		.hud-right-rail.menu-open .bet-cluster,
		.hud-right-rail.menu-open .hud-mobile-controls-row {
			opacity: 0;
			pointer-events: none;
		}

		.hud-panel-header {
			min-height: 18px;
			margin-bottom: 0;
			justify-content: flex-start;
		}

		.hud-panel-title {
			font-family: var(--font-gigalypse);
			font-size: 11px;
			font-weight: 800;
			letter-spacing: 0.06em;
			color: rgba(235, 248, 255, 0.95);
			text-transform: uppercase;
		}

		.hud-panel-fade {
			flex: 1;
		}

		.panel-title {
			font-size: 16px;
			letter-spacing: 0;
			text-transform: none;
			color: rgba(240, 248, 255, 0.9);
		}

		.panel-section {
			gap: 10px;
		}

		.panel-segment-wrap {
			border: 1px solid #FFFFFF33;
			border-radius: 6px;
			padding: 6px;
			display: grid;
			gap: 8px;
		}

		.panel-title-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 8px;
			width: 100%;
		}

		.panel-title-row .panel-title {
			margin-right: auto;
		}

		.panel-row.panel-volatility,
		.panel-row.panel-speed-row {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 5px;
		}

		.panel-section-speed {
			display: none;
		}

		.panel-chip {
			padding: 9px 0;
			border-radius: 4px;
			text-align: center;
			font-size: 18px;
			line-height: 1;
			background: transparent;
			border: 1px solid transparent;
			color: rgba(238, 245, 250, 0.94);
		}

		.panel-chip.panel-active {
			background: #FFFFFF33;
			border-color: #FFFFFF33;
			color: #ffffff;
		}

		.panel-note {
			text-align: center;
			font-size: 13px;
			line-height: 1;
			color: rgba(173, 200, 219, 0.9);
		}

		.panel-help-btn {
			width: 18px;
			height: 18px;
			border-radius: 999px;
			border: 1px solid rgba(179, 209, 229, 0.45);
			background: rgba(14, 33, 50, 0.75);
			font-family: var(--font-poppins);
			font-weight: 700;
			font-size: 12px;
			line-height: 1;
			color: rgba(231, 244, 255, 0.95);
		}

		.panel-help-anchor {
			position: relative;
			display: inline-grid;
			place-items: center;
			margin-left: auto;
		}

		.panel-help-pop {
			left: auto;
			right: 6vw;
			top: -4vh;
			bottom: calc(100% + 2px);
			width: min(320px, 86vw);
			height: min(240px, 56vh);
		}

		.panel-slider {
			height: 28px;
			border-radius: 5px;
			background: rgba(17, 33, 47, 0.88);
			border: none;
			position: relative;
			overflow: visible;
		}

		.panel-slider-fill {
			position: absolute;
			inset: 0 auto 0 0;
			width: 58%;
			background: rgba(205, 214, 224, 0.92);
			pointer-events: none;
		}

		.panel-slider-input {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			appearance: none;
			-webkit-appearance: none;
			background: transparent;
			margin: 0;
			cursor: pointer;
		}

		.panel-slider-input::-webkit-slider-runnable-track {
			height: 100%;
			background: transparent;
		}

		.panel-slider-input::-webkit-slider-thumb {
			-webkit-appearance: none;
			width: 12px;
			height: 36px;
			border-radius: 2px;
			background: #d4dde6;
			border: 1px solid rgba(43, 54, 64, 0.75);
			margin-top: -4px;
		}

		.panel-slider-input::-moz-range-track {
			height: 100%;
			background: transparent;
			border: none;
		}

		.panel-slider-input::-moz-range-thumb {
			width: 12px;
			height: 36px;
			border-radius: 2px;
			background: #d4dde6;
			border: 1px solid rgba(43, 54, 64, 0.75);
		}

		.panel-sounds-wrap {
			gap: 9px;
		}

		.panel-sound-row {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.panel-switch {
			width: 42px;
			height: 22px;
			border-radius: 999px;
			border: 1px solid rgba(97, 133, 159, 0.45);
			background: rgba(4, 20, 32, 0.92);
			position: relative;
		}

		.panel-switch::after {
			content: '';
			position: absolute;
			top: 2px;
			left: 2px;
			width: 16px;
			height: 16px;
			border-radius: 50%;
			background: #dce8f2;
			transition: left 0.18s ease;
		}

		.panel-switch.panel-switch-on::after {
			left: 22px;
		}

		.panel-info-btn {
			width: 100%;
			height: 44px;
			border-radius: 6px;
			background: rgba(96, 115, 129, 0.55);
			border: 1px solid rgba(124, 147, 165, 0.28);
			color: #f3f8ff;
			font-family: var(--font-gigalypse);
			font-size: 24px;
			line-height: 1;
			letter-spacing: 0.04em;
			display: grid;
			place-items: center;
			text-transform: uppercase;
		}

		.panel-info-btn::after {
			display: none;
		}

		.autoplay-menu {
			position: fixed;
			left: 50%;
			right: auto;
			bottom: calc(var(--mobile-controls-line-bottom) + 76px);
			transform: translateX(-50%);
			width: min(390px, 92vw);
			height: auto;
			max-height: 72vh;
			padding: 12px 12px 14px;
			gap: 10px;
			border-radius: 14px;
			background: linear-gradient(180deg, rgba(1, 5, 10, 0.97) 0%, rgba(2, 12, 20, 0.96) 100%);
			border: 1px solid rgba(146, 170, 190, 0.24);
			box-shadow: 0 24px 44px rgba(0, 0, 0, 0.52);
			z-index: 5;
			box-sizing: border-box;
			overflow-x: hidden;
		}

		.autoplay-header,
		.autoplay-title,
		.autoplay-row,
		.autoplay-speed,
		.autoplay-start {
			margin-left: 2px;
			margin-right: 2px;
			box-sizing: border-box;
			max-width: 100%;
		}

		.autoplay-main-title {
			font-size: 46px;
			line-height: 0.92;
		}

		.autoplay-title {
			font-size: 14px;
			margin-bottom: 6px;
		}

		.autoplay-row {
			gap: 6px;
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		.autoplay-chip {
			padding: 10px 0;
			min-width: 0;
		}

		.autoplay-speed .panel-speed,
		.panel-row.panel-speed-row .panel-speed {
			position: relative;
			display: grid;
			place-items: center;
			min-height: 44px;
			font-size: 0;
			line-height: 0;
			color: transparent;
		}

		.autoplay-speed .panel-speed::after,
		.panel-row.panel-speed-row .panel-speed::after {
			content: '';
			width: 24px;
			height: 24px;
			background: var(--speed-option-icon) center / contain no-repeat;
		}

		.autoplay-speed .speed-normal,
		.panel-row.panel-speed-row .speed-normal {
			--speed-option-icon: url('./assets/hud/kit/icon-normal.png');
		}

		.autoplay-speed .speed-quick,
		.panel-row.panel-speed-row .speed-quick {
			--speed-option-icon: url('./assets/hud/kit/icon-quick.png');
		}

		.autoplay-speed .speed-turbo,
		.panel-row.panel-speed-row .speed-turbo {
			--speed-option-icon: url('./assets/hud/kit/icon-turbo.png');
		}

		.autoplay-start {
			height: 64px;
			font-size: 20px;
		}

		.hud-speed-cycle {
			position: fixed;
			right: 8px;
			bottom: var(--mobile-menu-bottom);
			width: 28px;
			height: 28px;
			display: grid;
			place-items: center;
			background: transparent;
			border: none;
			box-shadow: none;
			z-index: 9;
			--btn-icon: url('./assets/hud/kit/icon-normal.png');
		}

		.hud-speed-cycle.speed-quick {
			--btn-icon: url('./assets/hud/kit/icon-quick.png');
		}

		.hud-speed-cycle.speed-turbo {
			--btn-icon: url('./assets/hud/kit/icon-turbo.png');
		}

		.hud-speed-cycle::after {
			content: '';
			width: 22px;
			height: 22px;
			background: var(--btn-icon) center/contain no-repeat;
		}

		/* Force mobile side controls to match tabbed portrait HUD layout */
		.hud-left-rail .hud-btn-feature {
			position: fixed !important;
			left: -8px !important;
			right: auto !important;
			bottom: var(--mobile-autoplay-bottom) !important;
			width: var(--mobile-side-tab-size) !important;
			height: var(--mobile-side-tab-size) !important;
			border-radius: 0 14px 14px 0 !important;
			border-left: none !important;
		}

		.hud-right-rail .hud-btn-autoplay {
			position: fixed !important;
			right: -8px !important;
			left: auto !important;
			bottom: var(--mobile-autoplay-bottom) !important;
			width: var(--mobile-side-tab-size) !important;
			height: var(--mobile-side-tab-size) !important;
			border-radius: 14px 0 0 14px !important;
			border-right: none !important;
		}

		.hud-left-rail .hud-btn-menu {
			position: fixed !important;
			left: 4px !important;
			right: auto !important;
			bottom: var(--mobile-menu-bottom) !important;
			width: 24px !important;
			height: 24px !important;
			border-radius: 0 !important;
			background: transparent !important;
			border: none !important;
			box-shadow: none !important;
		}

		@keyframes mobileMenuSheetIn {
			from {
				transform: translateY(26px);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}
	}

	@media (orientation: landscape) and (max-width: 1366px) and (max-height: 900px) and (hover: none) and (pointer: coarse) {
		.stage {
			z-index: 1 !important;
		}

		.hud-top,
		.hud-left-rail,
		.hud-right-rail,
		.hud-panel,
		.autoplay-menu,
		.hud-error {
			z-index: 9999 !important;
		}

		.hud-top {
			position: fixed;
			inset: 10px 14px auto 14px;
			font-size: 9px;
			grid-template-columns: 1fr auto 1fr;
			z-index: 10003 !important;
		}

		.hud-top.menu-open .hud-balance-center {
			display: none;
		}

		.hud-left {
			gap: 3px;
			font-size: 9px;
		}

		.hud-balance-label,
		.hud-balance-center strong {
			font-size: 12px;
		}

		.hud-left-rail {
			position: fixed;
			left: 18px;
			top: 70%;
			bottom: auto;
			transform: translateY(-50%);
			gap: 10px;
			z-index: 10003 !important;
		}

		.hud-round-btn {
			width: 40px;
			height: 40px;
		}

		.hud-round-btn::after {
			width: 16px;
			height: 16px;
		}

		.hud-right-rail {
			position: fixed;
			left: auto;
			right: 18px;
			bottom: calc(112px + env(safe-area-inset-bottom, 0px));
			top: auto;
			transform: none;
			align-items: flex-end;
		}

		.bet-cluster {
			position: relative;
			width: 220px;
			height: 170px;
			display: block;
		}

		.bet-main {
			width: 96px;
			height: 96px;
			position: absolute;
			right: 58px;
			bottom: 46px;
			transform: none;
		}

		.bet-main:hover,
		.bet-main:active,
		.bet-main:focus,
		.bet-main:focus-visible {
			transform: none;
		}

		.bet-controls-rail {
			position: absolute;
			inset: 0;
			padding-bottom: 0;
			display: block;
			pointer-events: none;
		}

		.bet-control {
			width: 48px;
			height: 48px;
			position: absolute;
			pointer-events: auto;
			transform: none;
		}

		.bet-control:hover,
		.bet-control:active,
		.bet-control:focus,
		.bet-control:focus-visible {
			transform: none;
		}

		.bet-control::after {
			width: 18px;
			height: 18px;
		}

		.hud-btn-autoplay {
			right: 6px;
			top: 2px;
			left: auto;
		}

		.hud-btn-plus {
			right: 6px;
			top: 58px;
			left: auto;
		}

		.hud-btn-minus {
			right: 6px;
			top: 114px;
			left: auto;
		}

		.bet-info {
			position: fixed;
			right: 18px;
			bottom: calc(14px + env(safe-area-inset-bottom, 0px));
			transform: none;
			display: grid;
			grid-template-columns: 1fr;
			gap: 6px;
			margin: 0;
			font-size: 12px;
			line-height: 1;
			text-align: right;
		}

		.hud-speed-cycle {
			display: none;
		}

		.menu-left-dock {
			display: block;
			position: fixed;
			left: 0;
			top: 0;
			bottom: 0;
			width: 78px;
			background: rgba(0, 0, 0, 0.88);
			border-right: 1px solid rgba(106, 155, 194, 0.16);
			z-index: 10000;
		}

		.hud-panel {
			position: fixed;
			left: 78px;
			right: calc(172px + 2vw);
			top: 0;
			bottom: 0;
			width: auto;
			transform: none;
			overflow: visible;
			padding: 34px 16px 18px;
			border-radius: 0;
			box-sizing: border-box;
			z-index: 10001 !important;
		}

		.panel-title-row {
			justify-content: flex-start;
			gap: 8px;
		}

		.panel-help-anchor {
			order: -1;
		}

		.panel-section-speed {
			display: none;
		}

		.panel-help-pop {
			left: calc(100% + 10px);
			right: auto;
			top: -10px;
			width: min(380px, 76vw);
			max-height: 72vh;
			overflow: auto;
		}

		.panel-info-btn {
			display: grid;
			place-items: center;
			font-family: var(--font-gigalypse);
			font-size: 24px;
			line-height: 1;
			letter-spacing: 0.04em;
			text-transform: uppercase;
			color: #f3f8ff;
		}

		.panel-info-btn::after {
			content: attr(data-info-label);
			width: auto;
			height: auto;
			background: none;
		}

		.autoplay-menu {
			left: 50% !important;
			right: auto !important;
			top: 50% !important;
			bottom: auto !important;
			transform: translate3d(-50%, -50%, 0) !important;
			width: min(700px, 92vw);
			height: auto;
			max-height: 88vh;
			padding: 18px;
			gap: 10px;
			grid-template-columns: minmax(0, 1fr) 220px;
			grid-template-areas:
				'header header'
				'spinsLabel spinsLabel'
				'spins spins'
				'speedLabel speedLabel'
				'speed start';
		}

		.autoplay-menu > .autoplay-header {
			grid-area: header;
		}

		.autoplay-menu > .autoplay-title:nth-of-type(1) {
			grid-area: spinsLabel;
		}

		.autoplay-menu > .autoplay-row {
			grid-area: spins;
		}

		.autoplay-menu > .autoplay-title:nth-of-type(2) {
			grid-area: speedLabel;
		}

		.autoplay-menu > .autoplay-speed {
			grid-area: speed;
			margin: 0;
		}

		.autoplay-menu > .autoplay-start {
			grid-area: start;
			margin-top: 0;
			height: auto;
			min-height: 64px;
			padding: 16px 10px;
			font-size: 24px;
		}

		.autoplay-main-title {
			font-size: 48px;
		}

		.autoplay-title {
			font-size: 14px;
		}

		.autoplay-row {
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 5px;
		}

		.autoplay-chip {
			padding: 8px 0;
			font-size: 16px;
		}
	}

	/* Desktop/Laptop compact landscape: 1200x675, 1024x576 */
	@media (orientation: landscape) and (max-height: 700px) and (hover: none) and (pointer: coarse) {
		.hud-top {
			inset: 12px 16px auto 16px;
			font-size: 11px;
		}

		.hud-left {
			font-size: 11px;
			gap: 4px;
		}

		.hud-balance-label,
		.hud-balance-center strong {
			font-size: 14px;
		}

		.hud-left-rail {
			left: 16px;
			bottom: 10px;
			gap: 8px;
		}

		.hud-round-btn,
		.bet-control {
			width: 48px;
			height: 48px;
		}

		.hud-round-btn::after,
		.bet-control::after {
			width: 18px;
			height: 18px;
		}

		.hud-right-rail {
			right: 16px;
			bottom: 44px;
		}

		.bet-main {
			width: 108px;
			height: 108px;
		}

		.bet-main-label {
			font-size: 30px;
		}

		.bet-controls-rail {
			gap: 6px;
			padding-bottom: 2px;
		}

		.bet-size span,
		.bet-total span,
		.bet-size strong,
		.bet-total strong {
			font-size: 14px;
		}

		.menu-left-dock {
			width: 78px;
		}

		.hud-panel {
			left: 78px;
			right: calc(172px + 2vw);
			width: auto;
			padding: 20px 14px 12px;
		}

		.panel-title {
			font-size: 15px;
		}

		.panel-chip {
			font-size: 16px;
		}

		.autoplay-menu {
			width: min(640px, 90vw);
			max-height: 86vh;
			padding: 16px;
		}
	}

	/* Popup L and tighter laptop heights: 800x450 class */
	@media (orientation: landscape) and (max-height: 500px) and (hover: none) and (pointer: coarse) {
		.hud-top {
			inset: 8px 12px auto 12px;
			font-size: 9px;
		}

		.hud-left {
			font-size: 9px;
			gap: 3px;
		}

		.hud-balance-label,
		.hud-balance-center strong {
			font-size: 12px;
		}

		.hud-left-rail {
			left: 12px;
			bottom: 4px;
			gap: 6px;
		}

		.hud-round-btn,
		.bet-control {
			width: 40px;
			height: 40px;
		}

		.hud-round-btn::after,
		.bet-control::after {
			width: 15px;
			height: 15px;
		}

		.hud-right-rail {
			right: 12px;
			bottom: 34px;
		}

		.bet-main {
			width: 88px;
			height: 88px;
		}

		.bet-main-label {
			font-size: 26px;
		}

		.bet-controls-rail {
			gap: 5px;
		}

		.bet-info {
			gap: 4px;
			margin-top: 6px;
		}

		.bet-size span,
		.bet-total span,
		.bet-size strong,
		.bet-total strong {
			font-size: 12px;
		}

		.menu-left-dock {
			width: 78px;
		}

		.hud-panel {
			left: 78px;
			right: calc(166px + 2vw);
			width: auto;
			padding: 12px 12px 10px;
			gap: 8px;
		}

		.panel-title {
			font-size: 14px;
		}

		.panel-chip {
			font-size: 14px;
			padding: 7px 0;
		}

		.panel-note {
			font-size: 12px;
		}

		.autoplay-menu {
			width: min(560px, 94vw);
			max-height: 88vh;
			padding: 12px;
			gap: 8px;
		}

		.autoplay-main-title {
			font-size: 28px;
		}

		.autoplay-chip {
			padding: 7px 0;
			font-size: 14px;
		}

		.autoplay-start {
			height: 52px;
			font-size: 18px;
		}
	}

	/* Popup S: 400x225 class */
	@media (orientation: landscape) and (max-width: 500px) and (max-height: 260px) and (hover: none) and (pointer: coarse) {
		.round-overlay {
			padding: 8px;
			box-sizing: border-box;
		}

		.round-card {
			width: min(300px, 94vw);
			padding: 12px 14px;
			border-radius: 12px;
		}

		.round-card h3 {
			font-size: 16px;
			margin-bottom: 6px;
		}

		.round-card p {
			margin-bottom: 12px;
			font-size: 12px;
			line-height: 1.25;
		}

		.round-actions {
			gap: 10px;
		}

		.round-actions button {
			min-width: 80px;
			height: 32px;
			padding: 0 10px;
			font-size: 14px;
			border-radius: 8px;
		}

		.hud-top {
			display: none;
		}

		.hud-left-rail {
			left: 8px;
			bottom: 4px;
			gap: 5px;
		}

		.hud-round-btn {
			width: 30px;
			height: 30px;
		}

		.hud-round-btn::after {
			width: 12px;
			height: 12px;
		}

		.hud-right-rail {
			right: 8px;
			bottom: 6px;
		}

		.bet-main {
			width: 64px;
			height: 64px;
		}

		.bet-main-label {
			font-size: 18px;
		}

		.bet-control {
			width: 30px;
			height: 30px;
		}

		.bet-control::after {
			width: 12px;
			height: 12px;
		}

		.bet-controls-rail {
			gap: 4px;
		}

		.bet-info {
			display: none;
		}

		.menu-left-dock {
			width: 44px;
		}

		.hud-panel {
			left: 44px;
			width: min(240px, calc(100vw - 52px));
			padding: 8px;
			gap: 6px;
		}

		.panel-title {
			font-size: 12px;
		}

		.panel-chip {
			font-size: 12px;
			padding: 5px 0;
		}

		.panel-note {
			font-size: 10px;
		}

		.autoplay-menu {
			width: 96vw;
			max-height: 90vh;
			padding: 8px;
			gap: 6px;
		}

		.autoplay-main-title {
			font-size: 20px;
		}

		.autoplay-title {
			font-size: 11px;
		}

		.autoplay-chip {
			font-size: 11px;
			padding: 5px 0;
		}

		.autoplay-start {
			height: 40px;
			font-size: 13px;
		}
	}

	/* Final mobile portrait HUD normalization */
	@media (max-width: 700px) and (orientation: portrait) {
		.hud-mobile-controls-row .hud-btn-plus,
		.hud-mobile-controls-row .hud-btn-minus {
			position: relative !important;
			left: auto !important;
			right: auto !important;
			top: auto !important;
			bottom: auto !important;
			width: 46px !important;
			height: 46px !important;
			border-radius: 50% !important;
			border: 1px solid transparent !important;
			transform: none !important;
		}

		.hud-mobile-controls-row .hud-btn-feature,
		.hud-mobile-controls-row .hud-btn-autoplay {
			position: relative !important;
			left: auto !important;
			right: auto !important;
			top: auto !important;
			bottom: auto !important;
			width: 42px !important;
			height: 44px !important;
			border-radius: 0 14px 14px 0 !important;
			background: #000000b2 !important;
			border: 1px solid transparent !important;
			border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 100%) !important;
			box-shadow: 0 2px 0 0 #000000eb !important;
			border-left: none !important;
			transform: none !important;
		}

		.hud-mobile-controls-row .hud-btn-autoplay {
			border-radius: 14px 0 0 14px !important;
			border-left: 1px solid transparent !important;
			border-right: none !important;
		}

		.hud-mobile-controls-row .hud-btn-feature {
			margin-left: -8px !important;
		}

		.hud-mobile-controls-row .hud-btn-autoplay {
			margin-right: -8px !important;
		}

		.hud-left-rail .hud-btn-menu {
			position: fixed !important;
			left: 6px !important;
			right: auto !important;
			top: auto !important;
			bottom: var(--mobile-menu-bottom) !important;
			width: 24px !important;
			height: 24px !important;
			border-radius: 0 !important;
			background: transparent !important;
			border: none !important;
			box-shadow: none !important;
			transform: none !important;
			z-index: 41 !important;
		}

		.hud-left-rail .hud-btn-menu::after {
			width: 20px !important;
			height: 20px !important;
		}

		.hud-mobile-controls-row {
			display: grid !important;
			align-items: center !important;
			grid-template-columns: auto 1fr auto !important;
			column-gap: 0 !important;
			width: 100vw !important;
			padding: 0 !important;
			box-sizing: border-box !important;
			margin: 0 !important;
		}

		.hud-mobile-bet-triplet {
			display: flex !important;
			align-items: center !important;
			justify-content: center !important;
			gap: 10px !important;
		}

		.bet-main-label {
			font-size: 30px !important;
		}
	}

</style>
