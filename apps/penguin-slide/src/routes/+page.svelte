<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	// @ts-ignore - types provided at runtime by workspace deps
	import { createApp, setContextApp, App, Text, Container, Graphics, SpineProvider, SpineTrack, SpineBone } from 'pixi-svelte';
	import PickupLayer from '../lib/components/pickups/PickupLayer.svelte';
	import PenguinSpineEvents from '../lib/components/PenguinSpineEvents.svelte';
	import PenguinSpineSkin from '../lib/components/PenguinSpineSkin.svelte';
	import SpineAutoTrack from '../lib/components/SpineAutoTrack.svelte';

	const assetPath = (path: string) => path.startsWith('/') ? path : `/${path}`;
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
const SPAWN_DELAY_STEP = 0.18;
const LEFT_SPAWN_OFFSETS = [-0.66, -0.44, -0.24];
const RIGHT_SPAWN_OFFSETS = [0.24, 0.44, 0.66];
const SPAWN_OFFSET_JITTER = 0.05;
const MIN_SPAWN_OFFSET = 0.18;
const PICKUP_SCALE_BOOST = 4.5;
const LANE_MAP: Record<string, number> = { LEFT: -1, RIGHT: 1 };
const OUTER_LANE_OFFSET = Math.max(
	1,
	...LEFT_SPAWN_OFFSETS.map((offset) => Math.abs(offset)),
	...RIGHT_SPAWN_OFFSETS.map((offset) => Math.abs(offset))
);
const PENGUIN_LANE_RANGE = OUTER_LANE_OFFSET + 0.24;
const PENGUIN_LANE_SIDE_PAD = 0.2;

function clampPenguinLane(value: number) {
	return Math.max(-PENGUIN_LANE_RANGE, Math.min(PENGUIN_LANE_RANGE, value));
}

function pickSpawnLane(lane: number) {
	const sideOffsets = lane >= 0 ? RIGHT_SPAWN_OFFSETS : LEFT_SPAWN_OFFSETS;
	const jitter = (Math.random() * 2 - 1) * SPAWN_OFFSET_JITTER;
	const base = sideOffsets[Math.floor(Math.random() * sideOffsets.length)];
	const raw = base + jitter;
	return lane >= 0
		? Math.max(MIN_SPAWN_OFFSET, Math.min(1, raw))
		: Math.min(-MIN_SPAWN_OFFSET, Math.max(-1, raw));
}

function shuffleArray<T>(array: T[]) {
	const list = array.slice();
	for (let i = list.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[list[i], list[j]] = [list[j], list[i]];
	}
	return list;
}

function splitDualPadStep(entry: any) {
	if (!entry || entry.type) return [entry];
	const pads = entry.steps || entry.pads || {};
	const padEntries = Object.entries(pads).map(([padKey, pad]) => ({
		padKey,
		pad
	}));
	if (padEntries.length <= 1) {
		return [entry];
	}
	const realPads = padEntries.filter(({ pad }) => {
		const item = String(pad?.item ?? pad?.outcome ?? '').trim().toUpperCase();
		return item && item !== 'NOTHING';
	});
	if (!realPads.length) {
		return [entry];
	}
	const chosenPad = shuffleArray(realPads)[0];
	const otherPad = padEntries.find((slot) => slot.padKey !== chosenPad.padKey);
	const placeholderLane = otherPad?.padKey ?? (chosenPad.padKey === 'LEFT' ? 'RIGHT' : 'LEFT');
	const placeholderPad = {
		...(otherPad?.pad as Record<string, unknown>),
		item: 'NOTHING',
		outcome: 'NOTHING',
		stepType: otherPad?.pad?.stepType ?? 'ICE',
		sinking: false
	};
	const baseIndex = Number(entry.stepIndex ?? entry.index ?? 0);
	const firstStep = {
		...entry,
		stepIndex: baseIndex,
		index: baseIndex,
		steps: { [chosenPad.padKey]: chosenPad.pad },
		pads: undefined,
		finish: entry.finish,
		landedStep: entry.landedStep
	};
	const secondStep = {
		...entry,
		stepIndex: baseIndex + 0.1,
		index: baseIndex + 0.1,
		steps: { [placeholderLane]: placeholderPad },
		pads: undefined,
		finish: undefined,
		landedStep: placeholderLane
	};
	return [firstStep, secondStep];
}

function normalizeRoundEvents(events: any[]) {
	if (!Array.isArray(events)) return [];
	// Keep raw RGS event payload as-is for now.
	return events;
}
const accumulatedStrokeWidth = 12;
const DEBUG_SHOW_SPAWN_MARKERS = false;
const DEBUG_SHOW_PICKUP_PATHS = true;
const DEBUG_PICKUP_OFFSETS = [
	...new Set<number>([...LEFT_SPAWN_OFFSETS, ...RIGHT_SPAWN_OFFSETS, -1, 1])
];

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
	const BET_COST_MULTIPLIER = 5;
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
	let stopRunEarly = $state(false);
	let freezeMovement = $state(false);
const betOptions = [0.5, 1, 2.5, 5, 10, 25, 50];
	let betLevels = $state<number[]>([...betOptions]);
	let betIndex = $state(0);
	let modeLabel = $state('BASE');
	let timeLabel = $state('');
	let menuOpen = $state(false);
	let menuInfoOpen = $state(false);
	let selectedMode = $state('BASE_HARD');
	let speedFactor = $state(1);
	let maxWinLabel = $state('1,000x');
	let musicMuted = $state(false);
	let hudVolume = $state(58);
	let audioUnlocked = false;
	let betButtonEl: HTMLButtonElement | null = null;
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
		return betAmount * BET_COST_MULTIPLIER;
	}

	let renderStep = $state(0);
	let targetStep = $state(0);
	let animationActive = $state(false);
	let animationStatus: 'idle' | 'running' | 'done' = $state('idle');
	let penguinLane = $state(0);
	let penguinTargetLane = $state(0);
	let penguinOffsetFrac = $state(0);
	let freeRoamTargetLane = $state(0);
	let freeRoamChangeAt = $state(0);
	let penguinSkidPhase = $state(0);
	let penguinSkidRotation = $state(0);
	let lanePath = $state<Array<{ step: number; lane: number }>>([]);
let wanderPhase1 = $state(0);
let wanderPhase2 = $state(0);
let wanderAmp = $state(2.2);
let laneVelocity = $state(0);
let ctrlTurnTilt = $state(0);
let pickupLockUntil = $state(0);
let pickupSkidScale = $state(1);
let amountWinPulse = $state(1);
let amountWinPulseToken = 0;
let bananaLossFloat = $state<{ amount: number; start: number } | null>(null);
let runStartValue = $state(0);
const baseRoamTargets = [-0.75, -0.4, 0, 0.4, 0.75];
let roamSequence = baseRoamTargets.slice();
let roamSequenceIndex = 2;
let wanderLaneTarget = $state(roamSequence[roamSequenceIndex]);
let lastPickupRenderStep = $state(0);
let lastPickupLane = $state(0);
let nextWanderAt = $state(0);
let nextCenterAt = $state(0);

function easeCurve(t: number) {
	return t * t * (3 - 2 * t);
}

function updateCtrlTurnTilt(dt: number, lockToPickup: boolean) {
	const moving = status === 'sliding' && !slipAnimationStarted && !freezeMovement;
	const steer = penguinTargetLane - penguinLane;
	const turnIntent = Math.max(-1, Math.min(1, steer * 2.2 + laneVelocity * 0.55));
	const velocityAbs = Math.abs(laneVelocity);
	const onset = Math.max(0, Math.min(1, (velocityAbs - 0.14) / 0.32));
	const targetTilt = moving ? -turnIntent * 12 * onset : 0;
	const smoothRate = moving ? (lockToPickup ? 9.5 : 14) : 8;
	const blend = 1 - Math.exp(-smoothRate * Math.max(0, dt));
	ctrlTurnTilt += (targetTilt - ctrlTurnTilt) * blend;
	if (!moving && Math.abs(ctrlTurnTilt) < 0.05) ctrlTurnTilt = 0;
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

function showBananaLossFloat(amount: number) {
	if (!(amount > 0)) return;
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
	if (token.extra?.lostHalf === true) return Math.max(0.01, base * 0.5);
	if (token.extra?.fall === true || token.extra?.sinking === true) return Math.max(0.01, base);
	// Some feeds omit explicit deltas for banana penalties; keep the popup visible with a minimal fallback.
	return Math.max(0.01, stakeAmount());
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

	let tokens = $state<Token[]>([]);
	const removalTimers = new Map<number, ReturnType<typeof setTimeout>>();

	const viewport = $state({ w: baseViewport.w, h: baseViewport.h });
const ICE_PIECES_PER_SIDE = 4;
const DEBUG_HIDE_ICE = false;
const ICE_LANE_LOCK_MS = 1200;
const ICE_SPAWN_Y_DOWN_FRAC = 0.07;
const ICE_SPAWN_X_JITTER_FRAC = 0.015;
const ICE_SPAWN_LEFT_COUNT = 4;
const ICE_SPAWN_RIGHT_COUNT = 4;
const ICE_VISIBLE_START = 4;
const ICE_RESPAWN_GAP_FRAC = 0;
type IceSide = 'left' | 'right';
let dynamicSpawnSlots: Array<{ side: IceSide; slotIndex: number; x: number }> = [];
const spawnHistory = new Map<string, { lastCycle: number; x: number; slotKey: string }>();
const spawnLaneLocks = new Map<string, number>();
let hasStartedFirstRound = $state(false);

function updateSpawnPositions() {
	const positions = iceSpawnPositions();
	dynamicSpawnSlots = [
		...positions.left.map((x, slotIndex) => ({ side: 'left' as const, slotIndex, x })),
		...positions.right.map((x, slotIndex) => ({ side: 'right' as const, slotIndex, x }))
	];
	spawnHistory.clear();
	spawnLaneLocks.clear();
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
			const now = performance.now();
			const candidates = sideSlots.map((slot) => ({
				slotKey: `${slot.side}:${slot.slotIndex}`,
				x: slot.x ?? fallback,
				unlockAt: spawnLaneLocks.get(`${slot.side}:${slot.slotIndex}`) ?? 0
			}));
			let available = candidates.filter((c) => c.unlockAt <= now);
			if (available.length > 1) {
				available = available.filter((c) => c.slotKey !== state.slotKey);
			}
			let pool = available;
			if (!pool.length) {
				const earliest = Math.min(...candidates.map((c) => c.unlockAt));
				pool = candidates.filter((c) => c.unlockAt === earliest);
			}
			const chosen = pool[Math.floor(Math.random() * pool.length)] ?? candidates[0];
			const slotX = chosen?.x ?? fallback;
			state.slotKey = chosen?.slotKey ?? `${side}:0`;
			spawnLaneLocks.set(state.slotKey, now + ICE_LANE_LOCK_MS);
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
		gameBox.w = vw;
		gameBox.h = vh;
		isMobileLandscapeUi = window.matchMedia(
			'(orientation: landscape) and (max-width: 1366px) and (max-height: 900px) and (hover: none) and (pointer: coarse)'
		).matches;
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
		renderStep = -lookaheadSteps * stepSpacing * 1.0;
		targetStep = -lookaheadSteps * stepSpacing * 1.0;
		animationStatus = 'idle';
		tokenId = 0;
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
		stopRunEarly = false;
		freezeMovement = false;
		laneFreeze = false;
		penguinAnim = 'idle';
		penguinSkin = 'base';
		autoScrollActive = false;
		penguinLane = 0;
		penguinTargetLane = 0;
		ctrlTurnTilt = 0;
		pickupLockUntil = 0;
		pickupSkidScale = 1;
		penguinOffsetFrac = 0;
		penguinSkidPhase = Math.random() * Math.PI * 2;
		penguinSkidRotation = 0;
		wanderPhase1 = Math.random() * Math.PI * 2;
		wanderPhase2 = Math.random() * Math.PI * 2;
		lanePath = [];
		iceScroll = 0;
		

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
		const enrichedExtra = { ...(extra || {}), baseStake };
		const spawnLaneVal = Number(enrichedExtra.spawnLane ?? normalizedLane);
		const spawnDelayVal = Number(enrichedExtra.spawnDelay ?? 0);

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
		currentValue = value;
		setTargetStep(stepIndex);
	}

	function scheduleTokenRemoval(id: number, delayMs = 360) {
		const existing = removalTimers.get(id);
		if (existing) clearTimeout(existing);
		const timer = setTimeout(() => {
			removalTimers.delete(id);
			tokens = tokens.filter((t) => t.id !== id);
		}, delayMs);
		removalTimers.set(id, timer);
	}

	function setTargetStep(nextStep: number) {
		targetStep = Math.max(targetStep, nextStep);
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
		const lane = Number(token.extra?.spawnLane ?? token.spawnLane ?? token.lane);
		if (!Number.isFinite(lane)) return nearestLane(token.lane);
		return clampPenguinLane(lane);
	}

	function parseOutcome(item: string, padType?: string, sinking?: boolean) {
		const normalized = String(item || '').trim().toUpperCase();
		const pad = String(padType || '').trim().toUpperCase();
		if (pad === 'STONE' || normalized === 'STONE' || normalized === 'STONE_COLLECT') {
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

	function playSequencePads(stateEvents: any[]) {
		if (!Array.isArray(stateEvents) || !stateEvents.length) return;
		runId += 1;
		const currentRun = runId;
		let summaryEvent: any = null;
		const timeline: Array<{ step: number; value: number; hasLifering: boolean; bananaCount: number }> = [];
		let timelineValue = stakeAmount();
		let timelineLifering = false;
		let lastTimelineStep: number | null = null;
		resetRun(stakeAmount());

	const laneMap = LANE_MAP;

		for (const entry of stateEvents) {
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
				let popStep = lastTimelineStep ?? 0;
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

			if (typeof entry.accumulatedWinAmount === 'number') {
				timelineValue = (stakeAmount() * entry.accumulatedWinAmount) / 100;
				currentValue = timelineValue;
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

	const pads = entry.steps || entry.pads || {};
	const padEntries = Object.entries(pads)
		.map(([padKey, pad]) => {
			const item = String(pad?.item ?? pad?.outcome ?? '').trim().toUpperCase();
			return { padKey, pad, item };
		})
		.filter(({ item }) => item !== '' && item !== 'EMPTY');
	let padSequence: Array<[string, any]> = padEntries.map(({ padKey, pad }) => [padKey, pad]);
	let padSpawnIndex = 0;
			const landedPadData = (pads as any)[landedKey] || (pads as any)[landedKey?.toUpperCase?.() ?? ''];
	for (const [padKey, pad] of padSequence) {
				const lane = laneMap[String(padKey).toUpperCase()] ?? -1;
				const padData = pad as any;
				const item = String(padData?.item ?? padData?.outcome ?? '');
				const normalized = item.trim().toUpperCase();
				const { type, extra } = parseOutcome(
					item,
					padData?.stepType ?? padData?.padType,
					padData?.sinking === true
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
				const spawnLane = pickSpawnLane(lane);
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
						lifeVests: entry.lifeVests,
						winAmount: entry.winAmount,
						accumulatedWinAmount: entry.accumulatedWinAmount,
						spawnLane,
						spawnDelay
					}
				);
			}

			if (entry.finish && applies) {
				addToken(
					stepIndex,
					'goal',
					timelineValue,
					landedLane,
					true,
					{ finish: true }
				);
				summaryEvent = {
					result: 'goal',
					steps: stepIndex + 1,
					finalValue: Math.round(timelineValue * 100)
				};
			} else if (
				applies &&
				(entry.success === false ||
					((landedPadData as any)?.sinking === true && Number(entry.lifeVests ?? 0) <= 0))
			) {
				summaryEvent = {
					result: 'slip',
					steps: stepIndex + 1,
					finalValue: 0
				};
				slipTriggered = true;
				if (slipStepIndex == null) {
					slipStepIndex = stepIndex;
				}
			}
		}

	stepStates = timeline;

	animationStatus = 'running';
	const computedMax = Math.max(6, ...tokens.map((t) => t.stepIndex));
	addCosmeticTail(computedMax);
	buildLanePath();
		const firstHit = tokens
			.filter((t) => t.hit)
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
		const baseStepPerMs = 0.117 * speedFactor * 3.4;
		const maxAccel = 1.6;
		const rampSteps = 30;
		const laneSchedule = [];
		for (const entry of stateEvents) {
			const step = Number(entry.index ?? entry.stepIndex);
			if (slipVisibleEnd != null && step > slipVisibleEnd) continue;
			const landedKey = String(entry.landedStep ?? entry.landedPad ?? '');
			const lane = laneMap[landedKey.toUpperCase()] ?? -1;
			laneSchedule.push({ t: (step * stepSpacing) / (maxStep + 1), lane });
		}
		laneSchedule.sort((a, b) => a.t - b.t);
		const leadSeconds = 1.0;
		const laneLeadSeconds = 0.6;
		const laneLeadT = 0;
		const laneTriggers: { t: number; lane: number }[] = [];
		let lastT = 0;
		for (const entry of laneSchedule) {
			const trigger = Math.max(entry.t - laneLeadT, lastT + 0.01);
			laneTriggers.push({ t: trigger, lane: entry.lane });
			lastT = entry.t;
		}

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
			const ramp = 1 - Math.exp(-Math.max(0, scrollSteps) / rampSteps);
			const stepSpeed = baseStepPerMs * (1 + maxAccel * ramp);
			slideTimeScale = 1.2 * (stepSpeed / baseStepPerMs);
			scrollSteps += (stepSpeed / stepSpacing) * dtMs;
			renderStep = Math.min(endStep, startStep + scrollSteps * stepSpacing);
			iceScroll += stepSpeed * dtMs * 1.15;
			updateIceVisibility();
			const t = Math.min(1, (renderStep - startStep) / (endStep - startStep));
			if (runEndRenderStep != null && renderStep >= runEndRenderStep) {
				stopRunEarly = true;
				freezeMovement = true;
				autoScrollActive = false;
				markRoundEnded();
			}
			const stepPerMs = stepSpeed;
			const hitLeadMs = (585 * 0.85) / speedFactor;
			const hitLeadSteps = stepPerMs * hitLeadMs;
			const laneLockWindow = stepPerMs * 1100 * 0.2;

			if (tokens.length) {
				let updated = false;
				let popupText = '';
				let popupX = viewport.w * 0.5;
				let popupY = viewport.h * 0.72;
			const next = tokens.map((token) => {
				const triggerAt = pickupTriggerAt(
					token.stepIndex,
					token.type,
					Number(token.extra?.spawnDelay ?? 0)
				);
				const sinkingPreSlipLead = stepPerMs * 300;
				const shouldPreSlip =
					!token.activate &&
					token.hit &&
					(token.type === 'coin' || token.type === 'star') &&
					token.extra?.sinking === true &&
					!slipTriggered &&
					!freezeMovement &&
					renderStep >= triggerAt - sinkingPreSlipLead &&
					renderStep < triggerAt;
				if (shouldPreSlip) {
					beginSlip(
						Number(token.stepIndex),
						token.lane,
						Number(token.extra?.offsetFrac ?? 0)
					);
					return token;
				}
					if (!token.activate && token.hit && renderStep >= triggerAt) {
							updated = true;
							playPickupSound(token);
							popupText = `HIT ${token.type.toUpperCase()}`;
						const pose = tokenRender(token.stepIndex);
						const depth = pose ? pose.depth : 0.2;
						const spawnLane = Number(token.extra?.spawnLane ?? token.lane);
						const pos = pickupLanePosition(depth, spawnLane);
						popupX = pos.x;
						popupY = pos.y;
						const stepIndex = Number(token.stepIndex);
						const prevValue = valueAtStep(stepIndex - 1);
						const currentStepValue = valueAtStep(stepIndex);
						currentValue = currentStepValue;
						displayValue = currentStepValue;
						lastDisplayStep = stepIndex;
						hitDelta = currentStepValue - prevValue;
						if (token.type !== 'empty') {
							pickupCount += 1;
							lastPickupRenderStep = renderStep;
							lastPickupLane = targetLaneForToken(token);
						}
						penguinOffsetFrac = Number(token.extra?.offsetFrac ?? 0);
						wanderLaneTarget = 0;
						penguinTargetLane = 0;
						nextWanderAt = performance.now() + 200;
						nextCenterAt = performance.now() + 600;
						if (!(token.type === 'banana' && token.extra?.fall) && token.type !== 'goal') {
							const nextToken = tokens.find(
								(next) => next.hit && !next.activate && Number(next.stepIndex) > stepIndex
							);
							if (nextToken) {
								penguinOffsetFrac = Number(nextToken.extra?.offsetFrac ?? 0);
							}
						}
						let effect = token.type;
						const sinkingSlip = token.extra?.sinking === true || token.extra?.fall === true;
						const savedByLifering = Boolean(token.extra?.savedByLifering);
						const bananaSaved = token.type === 'banana' && (savedByLifering || hasLifering);
						const slipBeforePickup =
							sinkingSlip && !bananaSaved && (token.type === 'coin' || token.type === 'star');
						if (slipBeforePickup) {
							beginSlip(
								stepIndex,
								token.lane,
								Number(token.extra?.offsetFrac ?? 0)
							);
						}
						const slipAfterPickup = sinkingSlip && !bananaSaved && !slipBeforePickup;
						if (token.type === 'banana') {
							const loss = bananaLossAmount(prevValue, currentStepValue, token, bananaSaved);
							if (loss > 0) showBananaLossFloat(loss);
						}
						const vestCount = Number(token.extra?.lifeVests ?? 0);
						if (token.type === 'banana') {
							playOneShot('pickup_banana');
						}
						if (slipAfterPickup) {
							if (token.type === 'banana') {
								wobbleBoost = Math.min(3.2, wobbleBoost + 1.35);
								}
							if (vestCount > 0 || hasLifering) {
								clearLiferingState(stepIndex, true);
							} else {
								beginSlip(
									stepIndex,
									token.lane,
									Number(token.extra?.offsetFrac ?? 0)
								);
							}
						}
						if (token.type === 'lifering') {
							hasLifering = true;
							liferingPickedStep = stepIndex;
							liferingGainStep = null;
							liferingForcedOff = false;
							liferingOverrideStep = null;
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
							const goalLane = nearestLane(token.lane);
							penguinLane = goalLane;
							penguinTargetLane = goalLane;
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
						scheduleTokenRemoval(token.id, token.type === 'goal' ? 420 : token.type === 'lifering' ? 260 : 520);
						return {
							...token,
							activate: true,
							effect,
							extra: { ...(token.extra ?? {}), activatedAt: performance.now(), activatedDepth: depth, activatedLane: spawnLane }
						};
					}
					return token;
				});
				tokens = next;
				if (updated) {
					hitPopup = { text: popupText, x: popupX, y: popupY, until: performance.now() + 3000 };
				}
			}

		let latestLane = penguinTargetLane;
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
			.filter((e) => e.trigger >= renderStep)
			.sort((a, b) => a.trigger - b.trigger);
		const pendingHit = upcoming.find((e) => e.t.hit);
		const preHitLock = false;
		const dt = Math.max(0, (now - lastNow) / 1000);
		lastNow = now;
		let lockToPickup = false;
		const lockNowMs = performance.now();
		if (!freezeMovement && status === 'sliding') {
			const lead = stepSpacing * 1.6;
			const span = lookaheadSteps * stepSpacing;
			const depth = penguinDepth();
			const pathLead = span * (1 - depth) + lead;
			const stepFloat = (renderStep + pathLead) / stepSpacing;
			const pathLane = laneAtStep(stepFloat);
			let targetLane = pathLane;
			let skidScale = 1;

			const wanderSpeed = lockToPickup ? 1.0 : 2.2;
			wanderPhase1 += dt * 0.9 * wanderSpeed;
			wanderPhase2 += dt * 1.6 * wanderSpeed;
			const wanderLane =
				(Math.sin(wanderPhase1) * 0.7 + Math.sin(wanderPhase2 + 1.1) * 0.3) * wanderAmp;

			const penguinY = penguinPose().y;
			const roamWindow = viewport.h * 0.12;
			let closeToPickup = false;
			if (pendingHit) {
				const spawnLaneForPendingHit = Number(pendingHit.t.extra?.spawnLane ?? pendingHit.t.lane);
				const tokenPos = pickupPosition(pendingHit.t.stepIndex, pendingHit.t.lane, spawnLaneForPendingHit);
				if (tokenPos) {
					const deltaY = Math.abs(tokenPos.y - penguinY);
					closeToPickup = deltaY <= roamWindow;
				}
			}
		const remainingMs = pendingHit ? Math.max(0, (pendingHit.trigger - renderStep) / stepPerMs) : Infinity;
		const earlyLockMs = 250;
		const lockSoon = pendingHit?.t.type === 'goal'
			? remainingMs <= 1200 + earlyLockMs
			: remainingMs <= 600 + earlyLockMs;
			lockToPickup = (closeToPickup || lockSoon) && !!pendingHit;
			if (lockToPickup) pickupLockUntil = lockNowMs + 180;
			const lockActive = !!pendingHit && (lockToPickup || lockNowMs < pickupLockUntil);
			if (lockActive && pendingHit) {
				targetLane = targetLaneForToken(pendingHit.t);
			} else {
				skidScale = 1;
					if (nextWanderAt === 0) nextWanderAt = lockNowMs;
					if (nextCenterAt === 0) nextCenterAt = lockNowMs;
					if (lockNowMs >= nextWanderAt) {
						nextWanderAt = lockNowMs + 220;
						if (!lockActive) {
							roamSequenceIndex = (roamSequenceIndex + 1) % roamSequence.length;
							wanderLaneTarget = roamSequence[roamSequenceIndex];
							if (roamSequenceIndex === 0) roamSequence = shuffleRoamSequence(roamSequence);
						}
					}
				if (lockNowMs >= nextCenterAt) {
					nextCenterAt = lockNowMs + 800;
					if (Math.abs(penguinLane) > 0.25 && Math.random() < 0.7) {
						wanderLaneTarget = 0;
					}
				}
				targetLane = wanderLaneTarget;
			}
			targetLane = clampPenguinLane(targetLane);
			maybePlayTurnSound(targetLane);
			const laneTargetLerp = lockActive ? 0.22 : 0.08;
			penguinTargetLane = penguinTargetLane + (targetLane - penguinTargetLane) * laneTargetLerp;
			penguinSkidPhase += dt * 2.1;
			const skid =
				Math.sin(penguinSkidPhase) * 0.55 + Math.sin(penguinSkidPhase * 2.0 + 1.1) * 0.3;
			const desiredSkidScale = lockActive ? 0.3 : 1;
			const skidBlend = lockActive ? 0.22 : 0.12;
			pickupSkidScale += (desiredSkidScale - pickupSkidScale) * skidBlend;
			penguinOffsetFrac = skid * 0.09 * skidScale * pickupSkidScale;
			if (!lockActive) {
				penguinOffsetFrac = Math.max(-0.06, Math.min(0.06, penguinOffsetFrac));
			}
			penguinSkidRotation = skid * 6.2 * skidScale * pickupSkidScale;
			lockToPickup = lockActive;
		} else {
			pickupSkidScale += (1 - pickupSkidScale) * 0.16;
			penguinSkidRotation *= 0.84;
		}
			if (status === 'sliding') {
				wobbleTime += dt;
			} else {
				wobbleTime = 0;
			}
				wobbleBoost = Math.max(0, wobbleBoost - dt * 0.35);
		const laneMaxSpeed = (lockToPickup ? 3.0 : 6.2) * speedFactor * 1.25;
		const laneAccel = (lockToPickup ? 12.8 : 8.8) * speedFactor;
		const laneDamp = lockToPickup ? 6.2 : 5.2;
		const diff = penguinTargetLane - penguinLane;
		const accel = Math.max(-laneAccel, Math.min(laneAccel, diff * laneAccel));
		laneVelocity += accel * dt;
		laneVelocity *= Math.exp(-laneDamp * dt);
		laneVelocity = Math.max(-laneMaxSpeed, Math.min(laneMaxSpeed, laneVelocity));
		penguinLane = clampPenguinLane(penguinLane + laneVelocity * dt);
		updateCtrlTurnTilt(dt, lockToPickup);
		if (!slipAnimationStarted) {
			const clampDepth = depthForPickupY(penguinPose().y);
			penguinLane = clampLaneToPickupBounds(penguinLane, clampDepth);
		}
			if (t < 1) {
				requestAnimationFrame(smoothTick);
			} else if (summaryEvent) {
				status = summaryEvent.result === 'goal' ? 'goal' : 'slip';
				penguinAnim = status === 'goal' ? 'win' : 'slide_idle';
				steps = Number(summaryEvent.steps ?? steps);
				currentValue = (summaryEvent.finalValue ?? currentValue * 100) / 100;
				displayValue = currentValue;
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
					slipStepIndex = slipStepIndex ?? Number(summaryEvent.steps ?? steps);
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
				const prevValue = currentValue;
				const hitType = String(event.hitType ?? event.tileType ?? '');
				lastHitType = hitType;
				if (event.hitType === 'banana' && event.fall === true) {
					slipTriggered = true;
					slipStepIndex = Number(event.stepIndex);
				}
				const laneOffset =
					typeof event.laneOffset === 'number' ? nearestLane(event.laneOffset) : -1;
				penguinTargetLane = laneOffset;
				if (typeof event.value === 'number') {
					timelineValue = event.value / 100;
					currentValue = timelineValue;
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
					: [{ type: event.tileType ?? 'empty', lane: laneOffset, value: event.value }];
				let itemSpawnIndex = 0;
				for (const item of baseItems) {
					const itemLane =
						typeof item.lane === 'number' ? nearestLane(item.lane) : laneOffset;
					const isHit =
						Number(itemLane ?? laneOffset) === laneOffset && String(item.type) === hitType;
					const spawnLane = pickSpawnLane(itemLane);
					const spawnDelay = itemSpawnIndex * SPAWN_DELAY_STEP;
					itemSpawnIndex += 1;
					const tokenExtra = {
						...(isHit ? { ...item, ...event } : item),
						spawnLane,
						spawnDelay
					};
					addToken(
						Number(event.stepIndex),
						String(item.type),
						(event.value ?? 0) / 100,
						Number(itemLane ?? laneOffset),
						isHit,
						tokenExtra
					);
				}
				hitDelta = currentValue - prevValue;
				if (hitType === 'lifering') hasLifering = true;
				if (event.savedByLifering) hasLifering = false;
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

	animationStatus = 'running';
	const computedMax = Math.max(6, ...tokens.map((t) => t.stepIndex));
	addCosmeticTail(computedMax);
	const firstHit = tokens
		.filter((t) => t.hit)
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
	const baseStepPerMs = 0.117 * speedFactor * 3.4;
	const maxAccel = 1.6;
	const rampSteps = 30;
	const laneSchedule = [];
	for (const event of bookEvents) {
		if (event.type === 'tileResult' && typeof event.laneOffset === 'number') {
			const step = Number(event.stepIndex);
			if (slipVisibleEnd != null && step > slipVisibleEnd) continue;
			const lane = nearestLane(Number(event.laneOffset));
			laneSchedule.push({ t: (step * stepSpacing) / (maxStep + 1), lane });
		}
	}
	laneSchedule.sort((a, b) => a.t - b.t);
const leadSeconds = 1.0;
	const laneLeadSeconds = 0.6;
	const laneLeadT = 0;
	const laneTriggers: { t: number; lane: number; }[] = [];
	let lastT = 0;
	for (const entry of laneSchedule) {
		const trigger = Math.max(entry.t - laneLeadT, lastT + 0.01);
		laneTriggers.push({ t: trigger, lane: entry.lane });
		lastT = entry.t;
	}
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
		const ramp = 1 - Math.exp(-Math.max(0, scrollSteps) / rampSteps);
		const stepSpeed = baseStepPerMs * (1 + maxAccel * ramp);
		slideTimeScale = 1.2 * (stepSpeed / baseStepPerMs);
		scrollSteps += (stepSpeed / stepSpacing) * dtMs;
		renderStep = Math.min(endStep, startStep + scrollSteps * stepSpacing);
		iceScroll += stepSpeed * dtMs * 1.15;
		updateIceVisibility();
		const t = Math.min(1, (renderStep - startStep) / (endStep - startStep));
		if (runEndRenderStep != null && renderStep >= runEndRenderStep) {
			stopRunEarly = true;
			freezeMovement = true;
			autoScrollActive = false;
			markRoundEnded();
		}
		const stepPerMs = stepSpeed;
		const hitLeadMs = (585 * 0.85) / speedFactor;
		const hitLeadSteps = stepPerMs * hitLeadMs;
		const laneLockWindow = 0;
		if (tokens.length) {
			let updated = false;
			let popupText = '';
			let popupX = viewport.w * 0.5;
			let popupY = viewport.h * 0.72;
			const logs: string[] = [];
			const next = tokens.map((token) => {
					const triggerAt = pickupTriggerAt(
						token.stepIndex,
						token.type,
						Number(token.extra?.spawnDelay ?? 0)
					);
					const sinkingPreSlipLead = stepPerMs * 300;
					const shouldPreSlip =
						!token.activate &&
						token.hit &&
						(token.type === 'coin' || token.type === 'star') &&
						token.extra?.sinking === true &&
						!slipTriggered &&
						!freezeMovement &&
						renderStep >= triggerAt - sinkingPreSlipLead &&
						renderStep < triggerAt;
					if (shouldPreSlip) {
						beginSlip(
							Number(token.stepIndex),
							token.lane,
							Number(token.extra?.offsetFrac ?? 0)
						);
						return token;
					}
					if (!token.activate && token.hit && renderStep >= triggerAt) {
						updated = true;
						playPickupSound(token);
						popupText = `HIT ${token.type.toUpperCase()}`;
					const pose = tokenRender(token.stepIndex);
					const depth = pose ? pose.depth : 0.2;
						const spawnLane = Number(token.extra?.spawnLane ?? token.lane);
						const pos = pickupLanePosition(depth, spawnLane);
					popupX = pos.x;
					popupY = pos.y;
					const stepIndex = Number(token.stepIndex);
					const prevValue = valueAtStep(stepIndex - 1);
					const currentStepValue = valueAtStep(stepIndex);
					currentValue = currentStepValue;
					displayValue = currentStepValue;
					lastDisplayStep = stepIndex;
					hitDelta = currentStepValue - prevValue;
						if (token.type !== 'empty') {
							pickupCount += 1;
							lastPickupRenderStep = renderStep;
							lastPickupLane = targetLaneForToken(token);
						}
						penguinOffsetFrac = Number(token.extra?.offsetFrac ?? 0);
					wanderLaneTarget = 0;
					penguinTargetLane = 0;
					nextWanderAt = performance.now() + 200;
					nextCenterAt = performance.now() + 600;
					let effect = token.type;
					const sinkingSlip = token.extra?.sinking === true || token.extra?.fall === true;
						const savedByLifering = Boolean(token.extra?.savedByLifering);
						const bananaSaved = token.type === 'banana' && (savedByLifering || hasLifering);
					if (token.type === 'banana') {
						const loss = bananaLossAmount(prevValue, currentStepValue, token, bananaSaved);
						if (loss > 0) showBananaLossFloat(loss);
					}
					if (token.type === 'banana') {
						playOneShot('pickup_banana');
					}
					if (sinkingSlip && !bananaSaved) {
						if (token.type === 'banana') {
							wobbleBoost = Math.min(3.2, wobbleBoost + 1.35);
							}
							beginSlip(
								stepIndex,
								token.lane,
								Number(token.extra?.offsetFrac ?? 0)
							);
						}
						if (token.type === 'goal') {
							playOneShot('penguin_finish');
							startWinAmountPulse();
							status = 'goal';
						penguinAnim = 'win';
						laneFreeze = true;
						const goalLane = nearestLane(token.lane);
						penguinLane = goalLane;
						penguinTargetLane = goalLane;
						penguinOffsetFrac = 0;
						penguinSkidRotation = 0;
						const stopStep = renderStep;
						stopRunEarly = true;
						freezeMovement = true;
						autoScrollActive = false;
						liferingPickedStep = null;
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
						vestEventArmed = 'gain';
						liferingForcedOff = false;
						liferingGainStep = stepIndex + 1;
						liferingPickedStep = stepIndex;
						hasLifering = true;
						penguinSkin = 'vest';
						
					}
					if (bananaSaved) {
						vestEventArmed = 'lose';
						clearLiferingState(stepIndex, true);
						
						setTimeout(() => {
							penguinSkin = 'base';
						}, 200);
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
					
					scheduleTokenRemoval(token.id, token.type === 'goal' ? 420 : token.type === 'lifering' ? 260 : 520);
					return {
						...token,
						activate: true,
						extra: { ...(token.extra ?? {}), activatedAt: performance.now(), activatedDepth: depth, activatedLane: spawnLane }
					};
				}
				return token;
			});
			if (updated) {
				tokens = next;
				
				hitPopup = { text: popupText, until: performance.now() + 3000, x: popupX, y: popupY };
			}
		}
			if (stepStates.length) {
				const step = Math.max(0, Math.floor(renderStep / stepSpacing + 0.001));
				let latest = stepStates[0];
				let prev = stepStates[0];
			for (const entry of stepStates) {
				if (entry.step <= step) {
					prev = latest;
					latest = entry;
				} else {
					break;
				}
			}
			currentValue = latest.value;
			wobbleRisk = Math.min(1, Math.max(0, Number(latest.bananaCount ?? 0) / 3));
			if (step >= lastDisplayStep) {
				displayValue = currentValue;
			}

			if (liferingGainStep != null && step < liferingGainStep && !liferingForcedOff && liferingOverrideStep == null) {
				hasLifering = true;
				penguinSkin = 'vest';
				if (vestAnim === 'lose') vestAnim = null;
			} else if (liferingOverrideStep != null && step <= liferingOverrideStep) {
				hasLifering = false;
				penguinSkin = 'base';
				if (vestAnim === 'gain') vestAnim = null;
			} else {
				if (liferingForcedOff) {
					if (!latest.hasLifering) {
						liferingForcedOff = false;
					}
					hasLifering = false;
					penguinSkin = 'base';
					if (vestAnim === 'gain') vestAnim = null;
				} else {
					const canApply = liferingPickedStep != null && step >= liferingPickedStep;
					hasLifering = canApply ? latest.hasLifering : false;
					penguinSkin = hasLifering ? 'vest' : 'base';
				}
				if (liferingOverrideStep != null && step > liferingOverrideStep) liferingOverrideStep = null;
			}
			if (liferingGainStep != null && step >= liferingGainStep) liferingGainStep = null;
			hitDelta = latest.value - (prev?.value ?? latest.value);
		}
		// drop tokens after they pass the penguin
		const lateHideWindow = stepSpacing * 0.3;
		tokens = tokens.filter((t) => {
			if (stopRunEarly && t.hit && t.activate) return false;
			if (t.activate) return true;
				const trigger = pickupTriggerAt(
					t.stepIndex,
					t.type,
					Number(t.extra?.spawnDelay ?? 0)
				);
			if (t.hit) return renderStep < trigger + lateHideWindow;
			return renderStep < trigger + lateHideWindow;
		});
		let latestLane = penguinTargetLane;
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
				.filter((e) => e.trigger >= renderStep)
			.sort((a, b) => a.trigger - b.trigger);
		const pendingHit = upcoming.find((e) => e.t.hit);
		const preHitLock = false;
		const dt = Math.max(0, (now - lastNow) / 1000);
		lastNow = now;
		let lockToPickup = false;
		const lockNowMs = performance.now();
		if (!freezeMovement && status === 'sliding') {
			const lead = stepSpacing * 1.6;
			const span = lookaheadSteps * stepSpacing;
			const depth = penguinDepth();
			const pathLead = span * (1 - depth) + lead;
			const stepFloat = (renderStep + pathLead) / stepSpacing;
			const pathLane = laneAtStep(stepFloat);
			let targetLane = pathLane;
			let skidScale = 1;

			const wanderSpeed = lockToPickup ? 1.0 : 2.2;
			wanderPhase1 += dt * 0.9 * wanderSpeed;
			wanderPhase2 += dt * 1.6 * wanderSpeed;
			const wanderLane =
				(Math.sin(wanderPhase1) * 0.7 + Math.sin(wanderPhase2 + 1.1) * 0.3) * wanderAmp;

			const penguinY = penguinPose().y;
			const roamWindow = viewport.h * 0.12;
			let closeToPickup = false;
			if (pendingHit) {
				const spawnLaneForPendingHit = Number(pendingHit.t.extra?.spawnLane ?? pendingHit.t.lane);
				const tokenPos = pickupPosition(pendingHit.t.stepIndex, pendingHit.t.lane, spawnLaneForPendingHit);
				if (tokenPos) {
					const deltaY = Math.abs(tokenPos.y - penguinY);
					closeToPickup = deltaY <= roamWindow;
				}
			}
				const remainingMs = pendingHit ? Math.max(0, (pendingHit.trigger - renderStep) / stepPerMs) : Infinity;
				const goalLeadAdjust = pendingHit && pendingHit.t.type === 'goal' ? 400 : 0;
				const adjustedRemainingMs = Math.max(0, remainingMs - goalLeadAdjust);
				const earlyLockMs = 250;
				const lockSoon = pendingHit?.t.type === 'goal'
					? adjustedRemainingMs <= 800 + earlyLockMs
					: adjustedRemainingMs <= 300 + earlyLockMs;
			lockToPickup = (closeToPickup || lockSoon) && !!pendingHit;
			if (lockToPickup) pickupLockUntil = lockNowMs + 180;
			const lockActive = !!pendingHit && (lockToPickup || lockNowMs < pickupLockUntil);
			if (lockActive && pendingHit) {
				targetLane = targetLaneForToken(pendingHit.t);
			} else {
				skidScale = 1;
					if (nextWanderAt === 0) nextWanderAt = lockNowMs;
					if (nextCenterAt === 0) nextCenterAt = lockNowMs;
					if (lockNowMs >= nextWanderAt) {
						nextWanderAt = lockNowMs + 220;
						if (!lockActive) {
							if (pendingHit) {
								const isGoal = pendingHit.t.type === 'goal';
								const approachMs = isGoal ? 2600 : 1800;
								const directLockMs = isGoal ? 900 : 400;
								const goalLeadAdjust = isGoal ? 400 : 0;
								const progress = approachMs > 0
									? Math.min(1, Math.max(0, (approachMs - (remainingMs - goalLeadAdjust)) / approachMs))
									: 1;
								const eased = easeCurve(progress);
								const pendingLane = targetLaneForToken(pendingHit.t);
								const noiseBase = Math.sin((wanderPhase1 + wanderPhase2) * 0.4) * 0.06;
								const noise = noiseBase * (1 - eased);
								const midpoint = (pendingLane + lastPickupLane) * 0.5;
								let base = midpoint + (pendingLane - lastPickupLane) * (eased - 0.5);
								if (remainingMs <= directLockMs) {
									base = pendingLane;
								}
								const targetLane = base + noise;
								wanderLaneTarget = clampPenguinLane(targetLane);
							} else {
								roamSequenceIndex = (roamSequenceIndex + 1) % roamSequence.length;
								wanderLaneTarget = roamSequence[roamSequenceIndex];
								if (roamSequenceIndex === 0) roamSequence = shuffleRoamSequence(roamSequence);
							}
						}
					}
				if (lockNowMs >= nextCenterAt) {
					nextCenterAt = lockNowMs + 800;
					if (Math.abs(penguinLane) > 0.25 && Math.random() < 0.7) {
						wanderLaneTarget = 0;
					}
				}
				targetLane = wanderLaneTarget;
			}
				targetLane = clampPenguinLane(targetLane);
				maybePlayTurnSound(targetLane);
				const laneTargetLerp = lockActive ? 0.22 : 0.08;
				penguinTargetLane = penguinTargetLane + (targetLane - penguinTargetLane) * laneTargetLerp;
			penguinSkidPhase += dt * 2.1;
			const skid =
				Math.sin(penguinSkidPhase) * 0.55 + Math.sin(penguinSkidPhase * 2.0 + 1.1) * 0.3;
			const desiredSkidScale = lockActive ? 0.3 : 1;
			const skidBlend = lockActive ? 0.22 : 0.12;
			pickupSkidScale += (desiredSkidScale - pickupSkidScale) * skidBlend;
			penguinOffsetFrac = skid * 0.09 * skidScale * pickupSkidScale;
			if (!lockActive) {
				penguinOffsetFrac = Math.max(-0.06, Math.min(0.06, penguinOffsetFrac));
			}
			penguinSkidRotation = skid * 6.2 * skidScale * pickupSkidScale;
			lockToPickup = lockActive;
		} else {
			pickupSkidScale += (1 - pickupSkidScale) * 0.16;
			penguinSkidRotation *= 0.84;
		}
		if (status === 'sliding') {
			wobbleTime += dt;
		} else {
			wobbleTime = 0;
		}
			wobbleBoost = Math.max(0, wobbleBoost - dt * 0.35);
		const laneMaxSpeed = (lockToPickup ? 3.0 : 6.2) * speedFactor * 1.25;
		const laneAccel = (lockToPickup ? 12.8 : 8.8) * speedFactor;
		const laneDamp = lockToPickup ? 6.2 : 5.2;
		const diff = penguinTargetLane - penguinLane;
		const accel = Math.max(-laneAccel, Math.min(laneAccel, diff * laneAccel));
		laneVelocity += accel * dt;
		laneVelocity *= Math.exp(-laneDamp * dt);
		laneVelocity = Math.max(-laneMaxSpeed, Math.min(laneMaxSpeed, laneVelocity));
		penguinLane = clampPenguinLane(penguinLane + laneVelocity * dt);
		updateCtrlTurnTilt(dt, lockToPickup);
		if (!slipTriggered) {
			const clampDepth = depthForPickupY(penguinPose().y);
			penguinLane = clampLaneToPickupBounds(penguinLane, clampDepth);
		}
		if (t < 1) {
			requestAnimationFrame(smoothTick);
		} else if (summaryEvent) {
			status = summaryEvent.result === 'goal' ? 'goal' : 'slip';
			penguinAnim = status === 'goal' ? 'win' : 'slide_idle';
			steps = Number(summaryEvent.steps ?? steps);
			currentValue = (summaryEvent.finalValue ?? currentValue * 100) / 100;
			displayValue = currentValue;
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
				slipStepIndex = slipStepIndex ?? Number(summaryEvent.steps ?? steps);
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
		const resp = await getRGSResponse('/wallet/authenticate', {
			sessionID: getParam('sessionID'),
			language: getParam('language') || 'en'
		});
		if (resp?.balance?.amount != null) {
			balance = resp.balance.amount / API_MULTIPLIER;
		}
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
			const normalizedEvents = normalizeRoundEvents(events);
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
		startSlideLoop();

		hasLifering = false;
		if (!getRgsBaseUrl()) {
			endRoundTriggered = true;
			endRoundResponse = null;
			response = { simulated: true };
			const simulatedEvents = normalizeRoundEvents(buildSimulatedLossEvents());
			processBookEvents(simulatedEvents);
			return;
		}
		const rawMode = getParam('mode') ?? 'BASE_HARD';
		const payload: Record<string, unknown> = {
			mode: String(selectedMode).toUpperCase(),
			sessionID: getParam('sessionID'),
			amount: Math.round(betAmount * API_MULTIPLIER),
			betSize: Math.round(betAmount * API_MULTIPLIER)
		};
		const currency = getParam('currency');
		if (currency) payload.currency = currency;
		const resp = await getRGSResponse('/wallet/play', payload);
		endRoundResponse = null;
		response = resp;
		if (resp?.balance?.amount != null) {
			balance = resp.balance.amount / API_MULTIPLIER;
		}
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
		if (import.meta.env.DEV) {
			console.log('[round-state]', {
				original: bookEvents,
				transformed: normalizedEvents
			});
		}
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
		}
	}

 



	const lookaheadSteps = 2.0;
const stepSpacing = 480;
	const penguinLaneScale = 1;

	function tokenRender(stepIndex: number) {
		const lookahead = lookaheadSteps;
		const span = lookahead * stepSpacing;
		const relative = stepIndex * stepSpacing - renderStep;
		if (relative < -4 || relative > span) return null;
		const clamped = Math.max(0, Math.min(span, relative));
		const passed = relative < 0;
		const drop = passed ? -relative : 0;
		const baseDepth = 1 - clamped / span;
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
	const landscapeUp = renderSize.w > renderSize.h && renderSize.h <= 500 ? viewport.h * 0.06 : 0;
	const penguinY = pos.y + size * 0.25 - viewport.h * 0.25 + portraitDown - landscapeUp;
		const clampDepth = depthForPickupY(penguinY);
		const clampPos = lanePosition(clampDepth, 0);
		const spread = laneSpread(clampDepth);
		const clampXs = clampLaneXs(clampDepth);
		const minClamp = clampXs.minX;
		const maxClamp = clampXs.maxX;
		const offsetLimit = clampPos.width * 0.04;
		const offsetXLimited = Math.max(-offsetLimit, Math.min(offsetLimit, offsetX));
		const laneX = clampPos.x + lane * clampPos.width * spread;
		const wobble = wobbleSignal();
		const sideLaneFactor = 1 + Math.min(1, Math.abs(penguinLane)) * 2.2;
		const wobbleSidePx =
			status === 'sliding' && !slipAnimationStarted
				? wobble.wave * wobble.amp * clampPos.width * 0.0045 * sideLaneFactor
				: 0;
		const baseXLimited = laneX + offsetXLimited;
		clampedX = Math.max(minClamp, Math.min(maxClamp, baseXLimited));
		const x =
			slipAnimationStarted && slipOriginX != null
				? slipOriginX + slipSlide
				: slipTriggered
					? clampedX + slipSlide
					: clampedX + wobbleSidePx;
	const y = pos.y + size * 0.25 - viewport.h * 0.25 + portraitDown - landscapeUp;
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

	function ensureAudioUnlocked() {
		if (audioUnlocked) return;
		audioUnlocked = true;
	}

	async function ensureGigalypseFont() {
		const fontUrl = gigalypseFontUrl;
		console.log('[font] ensureGigalypseFont start', { fontUrl });
		try {
			if (document.fonts.check('1em Gigalypse')) {
				console.log('[font] Gigalypse already available');
				return;
			}
			const font = new FontFace('Gigalypse', `url(${fontUrl})`);
			await font.load();
			document.fonts.add(font);
			console.log('[font] Gigalypse font loaded', { fontUrl });
		} catch (error) {
			console.warn('[font] failed to load Gigalypse', error);
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
			if (ratio <= 3) playOneShot('pickup_bronze');
			else if (ratio <= 20) playOneShot('pickup_silver');
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
		const hadLifering =
			hasLifering || penguinSkin === 'vest' || liferingPickedStep != null || liferingGainStep != null;
		hasLifering = false;
		penguinSkin = 'base';
		liferingPickedStep = null;
		liferingGainStep = null;
		if (stepIndex == null) {
			liferingForcedOff = false;
			liferingOverrideStep = null;
		} else {
			liferingForcedOff = true;
			liferingOverrideStep = stepIndex;
		}
		if (animateLose && hadLifering) {
			vestAnim = 'lose';
			vestAnimKey += 1;
		}
	}

	function beginSlip(stepIndex: number, lane: number, offsetFrac: number, playFallSound = true) {
		status = 'slip';
		penguinAnim = 'slide_idle';
		clearLiferingState(stepIndex, true);
		laneFreeze = true;
		ctrlTurnTilt = 0;
		penguinTargetLane = penguinLane;
		penguinOffsetFrac = Math.max(-0.04, Math.min(0.04, offsetFrac));
		laneVelocity = 0;
		const laneSign = Math.sign(lane) || Math.sign(penguinLane) || 1;
		slipDirection = laneSign >= 0 ? 1 : -1;
		const stopStep = renderStep;
		stopRunEarly = true;
		freezeMovement = true;
		autoScrollActive = false;
		liferingPickedStep = null;
		targetStep = renderStep;
		animationActive = false;
		markRoundEnded();
		slipTriggered = true;
		slipOriginX = null;
		if (playFallSound) {
			playOneShot('penguin_fall');
		}
		slipStepIndex = stepIndex;
		slipEndRenderStep = stopStep;
		runEndRenderStep = stopStep;
		

		const finalize = () => {
			triggerSlipAnimation();
		};

		finalize();

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
		const preDuration = 140;
		const distanceToSlipSide = dir > 0 ? Math.max(0, viewport.w - originX) : Math.max(0, originX);
		const normalizedDistanceToSlipSide = Math.max(
			0,
			Math.min(1, distanceToSlipSide / Math.max(1, viewport.w))
		);
		const slipTravel = viewport.w * (0.11 + normalizedDistanceToSlipSide * 0.08);
		const maxSlide = slipTravel * dir;
		const preSlideDistance = Math.min(Math.abs(maxSlide) * 0.24, viewport.w * 0.06);
		const preSlide = Math.min(preSlideDistance, Math.abs(maxSlide) * 0.65) * dir;
		const mainDuration = Math.max(
			380,
			Math.min(560, 380 + (Math.abs(maxSlide) / Math.max(1, viewport.w)) * 140)
		);
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
		? (isPortrait ? 0.78 : (isMobileLandscape ? 1.2 : 0.9))
		: (isMobileLandscape ? 1.0 : 0.85);
	const lead = stepSpacing * leadFactor;
	return stepIndex * stepSpacing - span * (1 - depth) - lead - spawnDelay * stepSpacing;
}

function shuffleRoamSequence(seq: number[]) {
		const shuffled = seq.slice();
		for (let i = shuffled.length - 1; i > 0; i -= 1) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
}

	function freeRoamIntervalMs(pendingHit: { trigger: number } | undefined, stepPerMs?: number) {
		if (pendingHit && stepPerMs && stepPerMs > 0) {
			const remainingMs = Math.max(0, (pendingHit.trigger - renderStep) / stepPerMs);
			return Math.max(220, remainingMs / 2);
		}
		return 700;
	}

	function addCosmeticTail(startStep: number) {
		if (tokens.some((t) => t.extra?.cosmetic)) return;
		const tailCount = 3;
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
		const upcoming = tokens
			.filter((t) => t.hit && !t.activate && !t.extra?.cosmetic)
				.map((t) => ({
					lane: targetLaneForToken(t),
					trigger: pickupTriggerAt(
						t.stepIndex,
						t.type,
						Number(t.extra?.spawnDelay ?? 0)
					)
				}))
			.filter((entry) => entry.trigger >= renderStep - stepSpacing * 0.18)
			.sort((a, b) => a.trigger - b.trigger);
		const next = upcoming[0];
		if (!next) return 0;
		const laneDelta = Math.abs(penguinLane - next.lane);
		return Math.max(0, Math.min(1, 1 - laneDelta / 0.3));
	}

	function wobbleSignal() {
		const edgeWobble = Math.pow(Math.abs(penguinLane), 1.15);
		const wobbleBase = 2.0;
		const wobbleAmp = wobbleBase + edgeWobble * 5.5 + wobbleRisk * 11.5 + wobbleBoost * 4.2;
		const wobbleSpeed = 0.8;
		const wave = Math.sin(wobbleTime * wobbleSpeed * Math.PI * 2);
		const gate = wobbleLaneGate();
		return { wave, amp: wobbleAmp * gate };
	}

function ctrlRotation() {
		if (status === 'goal' || penguinAnim === 'win') return 0;
		const edge = Math.max(0, Math.abs(penguinLane) - 0.6) / 0.4;
		const edgeLean = -Math.sign(penguinLane) * 6 * Math.min(1, edge);
		const rot = edgeLean + ctrlTurnTilt;
		const wobbleState = wobbleSignal();
		const wobble = wobbleState.wave * wobbleState.amp;
		const skid = slipAnimationStarted ? penguinSkidRotation : penguinSkidRotation * 0.35;
		const slipLean = slipAnimationStarted ? -slipDirection * 18 : 0;
		const total = rot + wobble + skid + slipLean;
	return Math.max(-24, Math.min(24, total));
}

function pickupLanePosition(depth: number, offset: number) {
	const t = Math.max(0, Math.min(1, depth));
	const laneStart = lanePosition(0, offset);
	const laneEnd = lanePosition(1, offset);
	const pos = {
		x: laneStart.x + (laneEnd.x - laneStart.x) * t,
		y: laneStart.y + (laneEnd.y - laneStart.y) * t,
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

	function pickupRenderOffset() {
		return viewport.h * (renderSize.h > renderSize.w ? 0.3 : 0.25);
	}

	function nearestDebugPickupOffset(offset: number) {
		let bestOffset = DEBUG_PICKUP_OFFSETS[0] ?? 0;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (const candidate of DEBUG_PICKUP_OFFSETS) {
			const distance = Math.abs(candidate - offset);
			if (distance < bestDistance) {
				bestDistance = distance;
				bestOffset = candidate;
			}
		}
		return bestOffset;
	}

	function activePickupDebugOffsets() {
		const active = new Set<number>();
		const yOffset = pickupRenderOffset();
		for (const token of tokens) {
			const lane = Number(token.spawnLane ?? token.extra?.spawnLane ?? token.lane);
			if (!Number.isFinite(lane)) continue;
			const pose = tokenRender(token.stepIndex);
			if (!pose) continue;
			const point = pickupLanePosition(pose.depth, lane);
			const y = point.y + yOffset;
			if (y > viewport.h + 40) continue;
			active.add(nearestDebugPickupOffset(lane));
		}
		return active;
	}

	function drawPickupDebugPaths(graphics: any) {
		const depthSteps = 32;
		const yOffset = pickupRenderOffset();
		const activeOffsets = activePickupDebugOffsets();

		for (const offset of DEBUG_PICKUP_OFFSETS) {
			const start = pickupLanePosition(0, offset);
			graphics.moveTo(start.x, start.y + yOffset);
			for (let i = 1; i <= depthSteps; i += 1) {
				const depth = i / depthSteps;
				const point = pickupLanePosition(depth, offset);
				graphics.lineTo(point.x, point.y + yOffset);
			}
			const lineColor = activeOffsets.has(offset) ? 0x00ff00 : 0xff0000;
			graphics.stroke({ width: 3, color: lineColor, alpha: 1 });
		}
	}

	function itemSpawnOffset() {
		return viewport.h * (renderSize.h > renderSize.w ? 0.35 : 0.25);
	}

	function laneSpread(depth: number) {
		const topSpread = 0.14;
		const bottomSpread = 0.7;
		return topSpread + (bottomSpread - topSpread) * depth;
	}

	function clampLaneToPickupBounds(lane: number, depth: number) {
		const bounds = laneBoundsForClamp(depth);
		return Math.max(bounds.minLane, Math.min(bounds.maxLane, lane));
	}

	function laneBoundsForClamp(depth: number) {
		const extents = laneExtents();
		return { minLane: extents.minLane, maxLane: extents.maxLane };
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

function pickupPosition(stepIndex: number, lane: number, spawnLane?: number) {
	const pose = tokenRender(stepIndex);
	if (!pose) return null;
	const effectiveLane = typeof spawnLane === 'number' ? spawnLane : lane;
	const pos = pickupLanePosition(pose.depth, effectiveLane);
	return { x: pos.x, y: pos.y + itemSpawnOffset() };
}

	function coinAssetKey(token: any) {
		const coinValue = token?.extra?.coinValue ?? token?.extra?.value ?? 0;
		const baseStake = token?.extra?.baseStake ?? stakeAmount();
		const normalized = baseStake > 0 ? coinValue / baseStake : coinValue;
		if (normalized <= 3) return 'coin_bronze';
		if (normalized <= 20) return 'coin_silver';
		return 'coin_gold';
	}

	function tokenScale(depth: number) {
	const mobileFactor = window.innerWidth < 600 ? 0.8 : 1;
	const portraitBoost = renderSize.h > renderSize.w ? 1.35 : 1;
	return (0.6 + depth * 1.4) * mobileFactor * 2.6 * portraitBoost * PICKUP_SCALE_BOOST;
}

function tokenSpineSize(depth: number) {
	const mobileFactor = window.innerWidth < 600 ? 0.75 : 1;
	const portraitBoost = renderSize.h > renderSize.w ? 1.34 : 1;
	const base = Math.max(40, viewport.w * 0.035);
	return base * (0.6 + depth * 1.4) * mobileFactor * 2.6 * portraitBoost * PICKUP_SCALE_BOOST;
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
		const timeout = setTimeout(() => { if (vestAnimKey === currentKey) vestAnim = null; }, 1600);
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

	function valueAtStep(stepIndex: number) {
		if (stepIndex < 0) return runStartValue;
		let value = runStartValue;
		for (const entry of stepStates) {
			if (entry.step <= stepIndex) {
				value = entry.value;
			} else {
				break;
			}
		}
		return value;
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
		let ro: ResizeObserver | null = null;
		let rafId: number | null = null;
		let floatId: number | null = null;
		let cancelled = false;
		let timeId: number | null = null;

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
		})().catch(() => {});
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
			if (betButtonEl) betButtonEl.click();
			else handleBetClick();
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
		autoplayTotal = count;
		autoplayRemaining = count;
		autoplay = true;
		autoplayOpen = false;
	}

	function handleBetClick() {
		ensureAudioUnlocked();
		if (!musicMuted && hudVolume > 0) {
			startBackgroundMusic();
		}
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

function cycleSpeedFactor() {
	const speeds = [1, 1.5, 2];
	const idx = speeds.findIndex((value) => Math.abs(value - speedFactor) < 0.001);
	speedFactor = speeds[(idx + 1 + speeds.length) % speeds.length] ?? 1;
}

function toggleMenuOpen() {
	menuOpen = !menuOpen;
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
	ensureAudioUnlocked();
	if (!musicMuted && hudVolume > 0) startBackgroundMusic();
	playOneShot('start_button');
	startAutoplayRun(autoplayDraftCount);
}

function increaseBet() {
	playOneShot('ui_bet_up');
	betIndex = Math.min(betLevels.length - 1, betIndex + 1);
	betAmount = betLevels[betIndex];
}

function decreaseBet() {
	playOneShot('ui_bet_down');
	betIndex = Math.max(0, betIndex - 1);
	betAmount = betLevels[betIndex];
}

function setSpeed(value: number) {
	speedFactor = value;
}

	const spineProps = (props: Record<string, unknown>) => props as any;
</script>

<svelte:head>
	<title>Penguin Slide</title>
	<meta name="color-scheme" content="light" />
	<meta name="supported-color-schemes" content="light" />
	{@html `<style>${gigalypseFontCss}</style>`}
</svelte:head>

<div class="page">
	<div class="game-body" bind:this={gameBodyEl} style={`width: ${gameBox.w}px; height: ${gameBox.h}px;`}>
		<div class="stage">
			<App>
			<Container>
				<Container x={rootOffset.x} y={rootOffset.y} scale={rootScale}>
			
		{@const showCloudsOnly = false}
		{@const bgSize = Math.max(viewport.w, viewport.h) * 1.2}
		{@const cloudsData = context.stateApp.loadedAssets?.background_clouds }
		{@const cloudsAspect = cloudsData?.width && cloudsData?.height ? cloudsData.height / cloudsData.width : 0.35}
		{@const cloudsWidth = cloudsData?.width ?? viewport.w}
		{@const cloudsHeight = cloudsData?.height ?? Math.max(1, cloudsWidth * cloudsAspect)}
		{@const icePath = pathMetrics()}
		{@const waterHeight = Math.max(1, viewport.h - icePath.topY)}
		{@const waterY = icePath.topY + waterHeight * 0.55}
		{@const skyHeight = Math.max(1, icePath.topY * 4.2)}
		{@const mountainsData = context.stateApp.loadedAssets?.background_mountains}
		{@const mountainsAspect =
			mountainsData?.width && mountainsData?.height ? mountainsData.height / mountainsData.width : 0.2}
		{@const mountainsWidth = mountainsData?.width ?? viewport.w}
		{@const mountainsHeight = mountainsData?.height ?? mountainsWidth * mountainsAspect}
		{@const scenePortrait = renderSize.h > renderSize.w}
		{@const mountainsScaleX = scenePortrait ? 0.5 : 1}
		{@const mountainsYOffset = viewport.h * (scenePortrait ? 0.599 : 0.5176)}
		{@const mountainsY = icePath.topY - mountainsHeight * 0.2 + mountainsYOffset }
		{@const cloudsNativeHeight = cloudsData?.height ?? 0}
		{@const cloudsX = viewport.w * 0.5 + (cloudsData?.width ?? 0) * 0.5}
		{@const cloudsY = cloudsNativeHeight * (scenePortrait ? 0.875 : 0.9485)}
		{@const slide = slideMetrics()}
		{@const slideVisualOffsetY = scenePortrait ? -70 : 0}
		{@const waterTimeScale = 1.4}
		{@const iceSwayScale = 0.33}
		{@const itemSpawnOffset = viewport.h * (scenePortrait ? 0.30 : 0.25)}
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
		{#if !DEBUG_HIDE_ICE}
				{#each icePieces as piece, index (piece.id)}
					{@const baseOffset = piece.baseY - spawnY}
					{@const travel = baseOffset + scrollOffset}
					{@const wrappedDistance = ((travel % loopDistance) + loopDistance) % loopDistance}
					{@const inRespawnGap = wrappedDistance > loopSpan}
					{@const wrapped = Math.min(loopSpan, wrappedDistance)}
					{@const localOffset = wrapped}
					{@const progress = Math.max(0, Math.min(1, localOffset / loopSpan))}
					{@const accelOffset = Math.min(loopSpan, localOffset * (1 + 0.3 * progress))}
					{@const yRaw = spawnY + accelOffset}
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
		{/if}
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
				<PickupLayer
					{tokens}
					{renderStep}
					{viewport}
					{tokenRender}
					lanePosition={pickupLanePosition}
					{tokenScale}
					{tokenSpineSize}
					{coinAssetKey}
					{itemSpawnOffset}
					showSteps={false}
					stepSpacing={stepSpacing}
					{pickupTriggerAt}
				/>
			</Container>
			{#if DEBUG_SHOW_PICKUP_PATHS}
				<Graphics zIndex={250} draw={(graphics) => drawPickupDebugPaths(graphics)} />
			{/if}
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
				{#key penguinSkin}
					<PenguinSpineSkin skin={penguinSkin} />
				{/key}
				<SpineBone boneName="CTRL" rotation={tiltRot} />
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
					<SpineTrack trackIndex={1} animationName="lose_L" loop={false} timeScale={1} />
				{:else if penguinAnim === 'lose_R'}
					<SpineTrack trackIndex={1} animationName="lose_R" loop={false} timeScale={1} />
				{:else}
					<SpineTrack trackIndex={1} animationName="idle" loop timeScale={1} />
				{/if}
		</SpineProvider>
	{#if slipAnimationStarted}
			<!-- splash overlay disabled -->
		{/if}
			</Container>
			<Text
				text={`$${displayValue.toFixed(2)}`}
				x={viewport.w * 0.5}
				y={viewport.h * 0.11}
				anchor={{ x: 0.5, y: 0.5 }}
				style={{
					fill: 0xFBCF00,
					fontFamily: 'Gigalypse',
					fontSize: Math.round(52 * amountWinPulse),
					fontWeight: '800',
					lineHeight: Math.round(52 * amountWinPulse),
					stroke: { color: 0x000000, alpha: 1, width: accumulatedStrokeWidth },
					align: 'center'
				}}
			/>
			{#if bananaLossFloat}
				{@const bananaLossT = Math.max(0, Math.min(1, (floatTime - bananaLossFloat.start) / 1.4))}
				{@const bananaLossEase = bananaLossT * bananaLossT * (3 - 2 * bananaLossT)}
				<Text
					text={`-$${bananaLossFloat.amount.toFixed(2)}`}
					x={viewport.w * 0.5}
					y={viewport.h * 0.145 + bananaLossEase * Math.max(34, viewport.h * 0.06)}
					anchor={{ x: 0.5, y: 0.5 }}
					style={{
						fill: 0xffffff,
						fontFamily: 'Gigalypse',
						fontSize: 42,
						fontWeight: '800',
						lineHeight: 42,
						stroke: { color: 0x000000, alpha: 0.95, width: 5 },
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
				<span class="hud-user">PENGUIN SLIDE</span>
			</div>
			<div class="hud-balance-center">
				<span class="hud-balance-label">BALANCE:</span>
				<strong>${balance.toFixed(2)}</strong>
			</div>
		</div>

		<div class="hud-left-rail" class:menu-open={menuOpen}>
			<button class="hud-round-btn hud-btn-feature" title="Features" aria-label="Features"></button>
			<button
				class="hud-round-btn menu-toggle hud-btn-menu"
				class:menu-open={menuOpen}
				onclick={toggleMenuOpen}
				title={menuOpen ? 'Close Menu' : 'Menu'}
				aria-label={menuOpen ? 'Close Menu' : 'Menu'}
			></button>
		</div>

		{#if menuOpen}
			<div class="menu-left-dock" aria-hidden="true"></div>
			<div class="hud-panel">
				<div class="hud-panel-header">
					<div class="hud-panel-title">PENGUIN RUSH</div>
					<div class="hud-panel-fade"></div>
				</div>
				<div class="panel-section">
					<div class="panel-title-row">
						<div class="panel-title">Volatility</div>
						<div class="panel-help-anchor">
							<button class="panel-help-btn" aria-label="Volatility help">?</button>
							<div class="panel-help-pop">
								<h4>Volatility</h4>
								<p>Here you can choose your playstyle.</p>
								<p>Each level changes how often and how big you can win:</p>
								<ul>
									<li>Low: More frequent wins — up to 1,000x max win.</li>
									<li>Medium: Less frequent wins, but bigger wins — up to 5,000x max win.</li>
									<li>High: High risk, high reward — up to 10,000x max win.</li>
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
							>
								Low
							</button>
							<button
								class="panel-chip"
								class:panel-active={selectedMode === 'BASE_VERY_HARD'}
								onclick={() => setMode('BASE_VERY_HARD', 'BASE VERY HARD', '5,000x')}
							>
								Medium
							</button>
							<button
								class="panel-chip"
								class:panel-active={selectedMode === 'BASE_EXTREME'}
								onclick={() => setMode('BASE_EXTREME', 'BASE EXTREME', '10,000x')}
							>
								High
							</button>
						</div>
						<div class="panel-note">Max win = {maxWinLabel}</div>
					</div>
				</div>
				<div class="panel-section">
					<div class="panel-title">Sounds</div>
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
								aria-label="Volume"
							/>
						</div>
						<div class="panel-sound-row">
							<button class="panel-switch" class:panel-switch-on={!musicMuted} onclick={toggleHudMute} aria-label="Stop Music toggle"></button>
							<span class="panel-sound-label">Stop Music</span>
						</div>
					</div>
				</div>
				<div class="panel-section panel-section-speed">
					<div class="panel-title">Speed</div>
					<div class="panel-segment-wrap">
						<div class="panel-row panel-speed-row">
							<button class="panel-chip panel-speed speed-normal" class:panel-active={speedFactor === 1} onclick={cycleSpeedFactor}>
								Normal
							</button>
							<button class="panel-chip panel-speed speed-quick" class:panel-active={speedFactor === 1.5} onclick={cycleSpeedFactor}>
								Fast
							</button>
							<button class="panel-chip panel-speed speed-turbo" class:panel-active={speedFactor === 2} onclick={cycleSpeedFactor}>
								Turbo
							</button>
						</div>
					</div>
				</div>
				<button class="panel-info-btn" onclick={() => setMenuInfoOpen(true)} aria-label="Game info"></button>
			</div>
		{/if}

		{#if menuInfoOpen}
			<div class="menu-info-modal">
				<div class="menu-info-content">
					<button class="menu-info-close" onclick={() => setMenuInfoOpen(false)} aria-label="Close"></button>
					<h3>How to play</h3>
					<p>Tap BET to start. Guide the penguin through pickups and avoid hazards. Cash out to secure your current value.</p>
					<h3>Autoplay</h3>
					<p>Choose spins and speed from Autoplay, then start. Tap BET during autoplay to stop immediately.</p>
				</div>
			</div>
		{/if}

		<div class="hud-right-rail" class:menu-open={menuOpen}>
			<div class="bet-cluster">
				<button
					class="bet-main"
					class:bet-autospin={autoplay}
					class:bet-disabled={animationStatus === 'running' && !autoplay}
					onclick={handleBetClick}
					disabled={(animationStatus === 'running' && !autoplay) || pendingRound}
					aria-label={autoplayRemaining > 0 ? `${autoplayRemaining} spins` : 'Bet'}
				>
					{#if autoplay && autoplayRemaining > 0}
						<div class="bet-autospin-card">
							<span class="bet-autospins-count">{autoplayRemaining}</span>
						</div>
					{:else}
						<span class="bet-main-label">BET</span>
					{/if}
				</button>
				<div class="bet-controls-rail">
					<button
						class="bet-control autoplay-icon-btn hud-btn-autoplay"
						class:autoplay-active={autoplay}
						class:autoplay-open={autoplayOpen}
						onclick={toggleAutoplayOpen}
						aria-label={autoplayOpen ? 'Close autoplay options' : 'Open autoplay options'}
						disabled={pendingRound}
					></button>
					<button
						class="bet-control hud-btn-plus"
						aria-label="Increase bet"
						onclick={increaseBet}
						disabled={betIndex >= betLevels.length - 1}
					></button>
					<button
						class="bet-control hud-btn-minus"
						aria-label="Decrease bet"
						onclick={decreaseBet}
						disabled={betIndex <= 0}
					></button>
				</div>
			</div>
			{#if autoplayOpen}
				<div class="autoplay-menu">
					<div class="autoplay-header">
						<div class="autoplay-main-title">AUTOPLAY</div>
						<button class="autoplay-close hud-btn-close" onclick={toggleAutoplayOpen} aria-label="Close"></button>
					</div>
					<div class="autoplay-title">Spins</div>
					<div class="autoplay-row">
						{#each autoplayOptions as count}
							<button class="autoplay-chip" class:panel-active={autoplayDraftCount === count} onclick={() => setAutoplayDraft(count)}>
								{count}
							</button>
						{/each}
					</div>
					<div class="autoplay-title">Speed</div>
					<div class="autoplay-speed">
						<button class="autoplay-chip panel-speed speed-normal" class:panel-active={speedFactor === 1} onclick={() => cycleSpeedFactor()}>Normal</button>
						<button class="autoplay-chip panel-speed speed-quick" class:panel-active={speedFactor === 1.5} onclick={() => cycleSpeedFactor()}>Fast</button>
						<button class="autoplay-chip panel-speed speed-turbo" class:panel-active={speedFactor === 2} onclick={() => cycleSpeedFactor()}>Turbo</button>
					</div>
					<button class="autoplay-start" onclick={handleStartAutoplay}>
						{isMobileLandscapeUi ? 'START' : 'START AUTOSPINS'}
					</button>
				</div>
			{/if}
			<div class="bet-info">
				<div class="bet-total">
					<strong>${(betAmount * BET_COST_MULTIPLIER).toFixed(2)}</strong>
					<span>TOTAL COST</span>
				</div>
				<div class="bet-size">
					<strong>${betAmount.toFixed(2)}</strong>
					<span>BET SIZE</span>
				</div>
			</div>
			<button
				class="hud-speed-cycle"
				class:speed-normal={speedFactor === 1}
				class:speed-quick={speedFactor === 1.5}
				class:speed-turbo={speedFactor === 2}
				onclick={cycleSpeedFactor}
				aria-label="Cycle speed"
			></button>
		</div>

		{#if errorMessage}
			<p class="error hud-error">{errorMessage}</p>
		{/if}

	{#if pendingRound}
		<div class="round-overlay">
			<div class="round-card">
				<h3>Resume last round?</h3>
				<p>
					We detected an unfinished round. Do you want to view it, or discard it?
				</p>
				<div class="round-actions">
					<button class="ghost" onclick={() => resolvePendingRound(false)}>Discard</button>
					<button class="primary" onclick={() => resolvePendingRound(true)}>View</button>
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

	.page {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #0b1220;
		color-scheme: only light;
		forced-color-adjust: none;
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
		--btn-icon: url('/assets/hud/kit/icon-features.png');
	}

	.hud-btn-menu {
		--btn-icon: url('/assets/hud/kit/icon-menu.png');
	}

	.hud-btn-menu.menu-open {
		--btn-icon: url('/assets/hud/kit/icon_close.png');
	}

	.bet-cluster {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		pointer-events: auto;
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
		background-color: rgba(148, 163, 184, 0.2);
		color: rgba(15, 23, 42, 0.7);
		box-shadow: none;
		cursor: not-allowed;
		opacity: 0.9;
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
		--btn-icon: url('/assets/hud/kit/icon-autoplay.png');
	}

	.hud-btn-autoplay.autoplay-open {
		--btn-icon: url('/assets/hud/kit/icon_close.png');
	}

	.hud-btn-plus {
		--btn-icon: url('/assets/hud/kit/icon-plus.png');
	}

	.hud-btn-minus {
		--btn-icon: url('/assets/hud/kit/icon-minus.png');
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
		--btn-icon: url('/assets/hud/kit/icon_close.png');
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
		background-image: url('/assets/hud/kit/switch-off.png');
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
			width: 78px;
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
			left: 78px;
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
			height: 44px;
			border-radius: 6px;
			background: rgba(96, 115, 129, 0.55);
			border: 1px solid rgba(124, 147, 165, 0.28);
			display: grid;
			place-items: center;
			--btn-icon: url('/assets/hud/kit/icon-help.png');
		}

		.panel-info-btn::after {
			content: '';
			width: 18px;
			height: 18px;
			background: var(--btn-icon) center/contain no-repeat;
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

	.panel-help-anchor:hover .panel-help-pop,
	.panel-help-anchor:focus-within .panel-help-pop {
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
		--btn-icon: url('/assets/hud/kit/icon_close.png');
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
			--mobile-controls-line-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
			--mobile-side-tab-size: 44px;
			--mobile-autoplay-bottom: calc(var(--mobile-controls-line-bottom) + 68px);
			--mobile-menu-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
		}

		.hud-top {
			inset: 12px 14px auto 14px;
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
			left: var(--hud-edge-margin-mobile);
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
		.hud-right-rail .bet-info,
		.hud-right-rail .hud-speed-cycle {
			pointer-events: auto;
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
			right: var(--hud-edge-margin-mobile);
			left: auto;
			top: auto;
			bottom: var(--mobile-autoplay-bottom);
			width: var(--mobile-side-tab-size);
			height: var(--mobile-side-tab-size);
			transform: none;
			border-radius: 999px;
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
			left: var(--hud-edge-margin-mobile);
			right: auto;
			top: auto;
			bottom: var(--mobile-autoplay-bottom);
			width: var(--mobile-side-tab-size);
			height: var(--mobile-side-tab-size);
			transform: none;
			border-radius: 999px;
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
			left: var(--hud-edge-margin-mobile);
			right: auto;
			top: auto;
			bottom: var(--mobile-menu-bottom);
			width: 24px;
			height: 24px;
			transform: none;
			border-radius: 999px;
			background: #000000b2 !important;
			border: 1px solid transparent !important;
			border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 100%) !important;
			box-shadow: 0 2px 0 0 #000000eb !important;
			z-index: 8;
		}

		.hud-btn-menu.menu-open {
			--btn-icon: url('/assets/hud/kit/icon-menu.png');
		}

		.hud-left-rail.menu-open .hud-btn-menu,
		.hud-left-rail.menu-open .hud-btn-menu:hover,
		.hud-left-rail.menu-open .hud-btn-menu:active,
		.hud-btn-menu:hover,
		.hud-btn-menu:active,
		.hud-btn-menu:focus,
		.hud-btn-menu:focus-visible {
			background: #000000b2 !important;
			border-color: transparent !important;
			border: 1px solid transparent !important;
			border-image-source: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 100%) !important;
			box-shadow: 0 2px 0 0 #000000eb !important;
			filter: brightness(1.08);
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
			overflow: auto;
			z-index: 30;
			box-shadow: 0 20px 36px rgba(0, 0, 0, 0.42);
			box-sizing: border-box;
			will-change: transform, opacity;
			animation: mobileMenuSheetIn 220ms ease-out both;
		}

		.hud-left-rail.menu-open .hud-btn-feature,
		.hud-right-rail.menu-open .bet-cluster {
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
			align-items: center;
			justify-content: space-between;
			gap: 8px;
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
			max-height: 58vh;
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

		.autoplay-start {
			height: 64px;
			font-size: 20px;
		}

		.hud-speed-cycle {
			position: fixed;
			right: var(--hud-edge-margin-mobile);
			bottom: var(--mobile-menu-bottom);
			width: 28px;
			height: 28px;
			display: grid;
			place-items: center;
			background: transparent;
			border: none;
			box-shadow: none;
			z-index: 9;
			--btn-icon: url('/assets/hud/kit/icon-speed-normal.png');
		}

		.hud-speed-cycle.speed-quick {
			--btn-icon: url('/assets/hud/kit/icon-speed-quick.png');
		}

		.hud-speed-cycle.speed-turbo {
			--btn-icon: url('/assets/hud/kit/icon-speed-turbo.png');
		}

		.hud-speed-cycle::after {
			content: '';
			width: 22px;
			height: 22px;
			background: var(--btn-icon) center/contain no-repeat;
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
			top: 58%;
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
			bottom: calc(74px + env(safe-area-inset-bottom, 0px));
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
			bottom: calc(10px + env(safe-area-inset-bottom, 0px));
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
			right: calc(220px + 12px + 3vw);
			top: 0;
			bottom: 0;
			width: auto;
			transform: none;
			overflow: auto;
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
			left: calc(100% + 2px);
			right: auto;
			top: 0;
			width: min(340px, 70vw);
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
			content: 'INFO';
			width: auto;
			height: auto;
			background: none;
		}

		.autoplay-menu {
			left: 50%;
			right: auto;
			bottom: 10px;
			transform: translateX(-50%);
			width: min(600px, 86vw);
			height: auto;
			max-height: 82vh;
			padding: 14px;
			gap: 10px;
			grid-template-columns: minmax(0, 1fr) 190px;
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

	@media (orientation: landscape) and (max-width: 1366px) and (max-height: 900px) and (hover: none) and (pointer: coarse) {
		.autoplay-menu {
			left: -100%;
		}
	}

</style>
