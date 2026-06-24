<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import './+page.css';

	import {
		readAssetDimension,
		isNothingItemValue
	} from '../lib/helpers/gameHelpers';
	import { createSpawnLaneHelpers } from '../lib/helpers/spawnLaneHelpers';
	import { normalizeRoundEvents } from '../lib/helpers/roundEventHelpers';
	import {
		tokenShouldSlipOnPreviousStep,
		slipTriggerStepForToken,
		terminalSlipTriggerAtStep
	} from '../lib/helpers/roundLogicHelpers';
	import {
		computeSlipAnimationConfig,
		computeSlipAnimationFrame
	} from '../lib/helpers/slipAnimationHelpers';
	import {
		slideMetricsForStage,
		pathMetricsForStage,
		laneSpreadForDepth,
		lanePositionForStage,
		pickupLanePositionForStage
	} from '../lib/helpers/stageGeometryHelpers';
	import {
		getIceSpawnXs as getIceSpawnXsHelper,
		buildIcePieces as buildIcePiecesHelper
	} from '../lib/helpers/iceFlowHelpers';
	import type { IcePiece, IceSide } from '../lib/helpers/iceFlowHelpers';
	import {
		FORCE_TEST_ROUND,
		FORCED_TEST_ROUND_BET_ID,
		FORCED_TEST_ROUND_STATE,
		buildSimulatedLossBetId,
		buildSimulatedLossEvents
	} from '../lib/helpers/testRoundFixtures';
	import {
		computeTurnTiltState,
		computeSmoothedLaneState,
		laneToSlotPosition,
		slotPositionToLane
	} from '../lib/helpers/penguinMotionHelpers';
	import { createAudioEngine } from '../lib/helpers/audioEngineHelpers';
	import { buildBitmapAssetsWithClones } from '../lib/helpers/bitmapAssetHelpers';
	import { buildPenguinSlidePixiAssets } from '../lib/helpers/penguinSlidePixiAssets';
	import {
		createAutoplayController,
		createHudControlHandlers
	} from '../lib/helpers/hudControlHelpers';
	import {
		pickupTriggerAtHelper,
		shouldUsePreStepFreeRoamHelper,
		preStepSweepLaneHelper,
		preStepFreeRoamTargetLaneHelper,
		type PreStepRoamState
	} from '../lib/helpers/preStepRoamHelpers';
	import {
		coinAssetKeyForToken,
		tokenSpineSizeForDepth,
		accumulatedAmountYForViewport
	} from '../lib/helpers/pickupVisualHelpers';
	import {
		isNearEdgeForSlipHelper,
		shouldGoalCollectNowHelper,
		shouldPreSlipBeforePickupHelper,
		isDoubleNothingStepHelper,
		shouldSkipPositioningForHitTokenHelper,
		shouldAutoCollectNothingHelper,
		isLaneAlignedForPickupHelper,
		isLaneCloserToNearestEdgeHelper
	} from '../lib/helpers/pickupDecisionHelpers';
	import {
		clampLaneXsHelper,
		depthForYHelper,
		targetLineIndexForOffsetHelper,
		crossingXForLaneOffsetHelper,
		buildPickupLineCrossingsHelper,
		pickupPositionHelper,
		pickupBandStateHelper
	} from '../lib/helpers/pickupPathHelpers';
	import {
		laneExtentsForTokens,
		nearestPickupSlotIndexForLane,
		wobbleLaneGateForState,
		computeWobbleSignal,
		computeCtrlRotationValue
	} from '../lib/helpers/penguinWobbleHelpers';
	import {
		laneOffsetForTargetIndexHelper,
		targetLaneIndexForTokenHelper,
		shouldHoldCurrentLaneForSinkingTokenHelper
	} from '../lib/helpers/targetLaneHelpers';
	import {
		planSlidingTargetLaneHelper
	} from '../lib/helpers/slidingLaneRuntimeHelpers';
	import {
		isNothingTokenType,
		tokenMatchesLandedStep as tokenMatchesLandedStepHelper,
		tokenCanDriveTargeting as tokenCanDriveTargetingHelper,
		isTargetableHitToken as isTargetableHitTokenHelper
	} from '../lib/helpers/tokenTargetingHelpers';
	import type { TargetingToken } from '../lib/helpers/tokenTargetingHelpers';
	import {
		SUPPORTED_LANGUAGES,
		createLanguageSet,
		loadI18nCatalog as loadI18nCatalogHelper,
		normalizeLanguage as normalizeLanguageHelper
	} from '../lib/helpers/i18nCatalogHelpers';
	import {
		getQueryParamFromSearch,
		getRgsBaseUrlFromSearch,
		isReplayModeSearch
	} from '../lib/services/penguinSlideApiService';
	import {
		runAuthenticateFlow,
		runPlayFlow,
		runEndRoundFlow,
		runReplayFlow
	} from '../lib/services/roundFlowService';
	import type { SupportedLanguage } from '../lib/helpers/i18nCatalogHelpers';
	import { normalizeCurrency, formatCurrencyAmountForCurrency } from '../lib/utils/currency';
	import type { SupportedCurrency } from '../lib/utils/currency';
	import {
		I18N as BUILTIN_I18N,
		I18N_EN as BUILTIN_I18N_EN
	} from '../lib/utils/i18n';
	import { parseOutcome } from '../lib/helpers/outcomeHelpers';
	import { createFrontendRandomStreams } from '../lib/helpers/seededRandomHelpers';
	import { transformRoundWithEmptyBridgeSteps } from '../lib/helpers/roundTransformHelpers';
	import {
		buildPadStepTokens,
		buildTileResultTokens
	} from '../lib/helpers/sequenceTokenBuildHelpers';
	import {
		parsePadSequenceEvents,
		parseBookSequenceEvents
	} from '../lib/helpers/sequenceEventParseHelpers';
	import {
		findFirstTargetableHitToken,
		computeBaseStepPerMs,
		computeRoundSpeedScale,
		computeSequenceScrollWindow
	} from '../lib/helpers/sequencePlaybackSetupHelpers';
	import {
		findPendingGoalStep,
		buildUpcomingTokens,
		firstPendingTargetableHit,
		filterVisibleUnactivatedTokens
	} from '../lib/helpers/sequenceTickHelpers';
	import {
		targetLaneForTokenHelper,
		nextTargetableHitTokenHelper,
		slipTriggerRenderStepForTokenHelper
	} from '../lib/helpers/sequenceTargetHelpers';
	import {
		buildSummarySlipTrigger,
		buildSummaryCompletionState
	} from '../lib/helpers/sequenceSummaryHelpers';
	import {
		maxWinLabelForMode,
		resolveAuthenticateOutcome,
		preparePlayRound
	} from '../lib/helpers/roundUiFlowHelpers';
	import { resolveErrorPresentation } from '../lib/helpers/errorPresentationHelpers';
	import {
		buildSoundSrc,
		SOUND_GAIN,
		LOOP_SOUNDS
	} from '../lib/constants/penguinSlideAudioConstants';
	import type { SoundKey } from '../lib/constants/penguinSlideAudioConstants';
	import {
		SPAWN_DELAY_STEP,
		NORMAL_PICKUP_DESTROY_DELAY_MS,
		GOAL_PICKUP_DESTROY_DELAY_MS,
		LIFERING_PICKUP_DESTROY_DELAY_MS,
		LEFT_SPAWN_OFFSETS,
		RIGHT_SPAWN_OFFSETS,
		LEFT_MISS_SPAWN_OFFSETS,
		RIGHT_MISS_SPAWN_OFFSETS,
		LEFT_LANE_SLOTS,
		RIGHT_LANE_SLOTS,
		SLOT_TO_OFFSET,
		SPAWN_OFFSET_JITTER,
		MIN_SPAWN_OFFSET,
		PICKUP_SCALE_BOOST,
		LANE_MAP,
		PENGUIN_LANE_RANGE,
		PENGUIN_LANE_SIDE_PAD,
		WOBBLE_INTENSITY,
		PICKUP_LOOKAHEAD_EXTRA_STEPS,
		PICKUP_TRAVEL_SPEED,
		PICKUP_TOP_ENTRY_BUFFER_STEPS,
		PICKUP_STEP_PACE_MULTIPLIER,
		PICKUP_Y_SPACING_EXPONENT,
		PREVIOUS_STEP_SLIP_EXTRA_LEAD_STEPS,
		FIRST_STEP_SINKING_EXTRA_LEAD_STEPS,
		SLIP_TRIGGER_DELAY_STEPS,
		PENGUIN_LANE_BASE_FOLLOW_RATE,
		PENGUIN_LANE_DISTANCE_FOLLOW_RATE,
		PENGUIN_LANE_CENTER_LOCK_RATE_MULT,
		PENGUIN_LANE_MAX_SPEED,
		PENGUIN_LANE_MAX_SPEED_CENTER_LOCK,
		PENGUIN_MOTION_STEP_DT_MAX,
		PENGUIN_SLIDE_TIME_SCALE,
		SLIP_ANIMATION_SPEED_MULT,
		SLIP_ANIMATION_DURATION_MULT,
		SLIP_EDGE_ALIGN_MIN_DELTA,
		SLIP_EDGE_ALIGN_MIN_DURATION_MS,
		SLIP_EDGE_ALIGN_MAX_DURATION_MS,
		SLIP_EDGE_ALIGN_LIFT_FRAC,
		DISABLE_PENGUIN_SLIDE_MOTION,
		DEBUG_GAME_SPEED_MULT,
		PRE_STEP_SWEEP_PERIOD_STEPS,
		PRE_STEP_SWEEP_INSET,
		PRE_STEP_OPENING_FREE_ROAM_STEPS,
		PRE_STEP_SINGLE_SWEEP_MIN_STEPS,
		PRE_STEP_SINGLE_SWEEP_BASE_STEPS,
		PRE_STEP_FIRST_LOCK_LEAD_STEPS,
		PRE_STEP_HANDOFF_STEPS,
		accumulatedStrokeWidth,
		betOptions,
		ICE_PIECES_PER_SIDE,
		ICE_SPAWN_Y_DOWN_FRAC,
		ICE_SPAWN_X_JITTER_FRAC,
		ICE_SPAWN_LEFT_COUNT,
		ICE_SPAWN_RIGHT_COUNT,
		ICE_VISIBLE_START
	} from '../lib/constants/penguinSlideConstants';

	// @ts-ignore - types provided at runtime by workspace deps
	import { createApp, setContextApp } from 'pixi-svelte';
	import GameStageScene from '../lib/components/GameStageScene.svelte';
	import BootLoader from '../lib/components/BootLoader.svelte';
	import EntrySplash from '../lib/components/EntrySplash.svelte';
	import GameHud from '../lib/components/GameHud.svelte';
	import ReplayHud from '../lib/components/ReplayHud.svelte';
	import PendingRoundModal from '../lib/components/PendingRoundModal.svelte';
	import GameErrorModal from '../lib/components/GameErrorModal.svelte';
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
	function clampPenguinLane(value: number) {
		return Math.max(-PENGUIN_LANE_RANGE, Math.min(PENGUIN_LANE_RANGE, value));
	}

	let frontendRandomStreams = createFrontendRandomStreams('penguin-slide-bootstrap');
	const nextRouteRandom = () => frontendRandomStreams.route();
	const nextLaneRandom = () => frontendRandomStreams.lane();
	const nextGhostRandom = () => frontendRandomStreams.ghost();
	const nextIceLayoutRandom = () => frontendRandomStreams.iceLayout();
	const nextIceSpawnRandom = () => frontendRandomStreams.iceSpawn();
	const DYNAMIC_ICE_START_STEPS = 0.8;
	const DYNAMIC_ICE_BATCH_INTERVAL_STEPS = 0.8;
	const DYNAMIC_ICE_SAME_SLOT_MIN_GAP_STEPS = 1.25;
	const DYNAMIC_ICE_SLIP_BLOCK_STEPS = 1.5;
	const DYNAMIC_ICE_TWO_PIECE_CHANCE = 0.35;
	const DYNAMIC_ICE_KEYS = ['ice_1', 'ice_2', 'ice_3', 'ice_4', 'ice_5', 'ice_6', 'ice_7', 'ice_8'];

	function reseedFrontendRandomness(seedInput: unknown, fallbackKey: string) {
		const seedKey = seedInput ?? fallbackKey;
		frontendRandomStreams = createFrontendRandomStreams(seedKey);
	}

	function parseOutcomeForRound(item: string, padType?: string, sinking?: boolean) {
		return parseOutcome(item, padType, sinking, stakeAmount(), nextGhostRandom);
	}

const stepLaneSlots = new Map<number, { left?: number; right?: number }>();
const lastPathHitSlotBySide: { left: number | null; right: number | null } = { left: null, right: null };
const {
	pickSpawnTargetForStep,
	pickPathHitSpawnTarget
} = createSpawnLaneHelpers(
	{
		LEFT_SPAWN_OFFSETS,
		RIGHT_SPAWN_OFFSETS,
		LEFT_MISS_SPAWN_OFFSETS,
		RIGHT_MISS_SPAWN_OFFSETS,
		SPAWN_OFFSET_JITTER,
		MIN_SPAWN_OFFSET,
		SLOT_TO_OFFSET,
		LEFT_LANE_SLOTS,
		RIGHT_LANE_SLOTS,
		random: nextLaneRandom
	},
	{
		stepLaneSlots,
		lastPathHitSlotBySide
	}
);

const bitmapAssetsWithClones = buildBitmapAssetsWithClones(assetPath);
const context = createApp({
	assets: buildPenguinSlidePixiAssets(assetPath, bitmapAssetsWithClones)
});
	setContextApp(context);

	let gameBodyEl: HTMLDivElement | null = null;

	const API_MULTIPLIER = 1_000_000;
	const TOTAL_COST_MULTIPLIER = 5;
	const baseViewport = { w: 1920, h: 1080 };
	const CANVAS_LAYOUT_DEBUG = false;
	const LOW_POWER_MOBILE_MAX_DPR = 1.25;
	const LOW_POWER_ICE_PIECES_PER_SIDE = 2;
	const LOW_POWER_ICE_SPAWN_COUNT = 2;
	let stageScale = $state(1);
	let stageOffset = $state({ x: 0, y: 0 });
	let gameBox = $state({ w: baseViewport.w, h: baseViewport.h });
	let renderSize = $state({ w: baseViewport.w, h: baseViewport.h });
	let isMobileLandscapeUi = $state(false);
	let isMobilePortraitUi = $state(false);
	let lowPowerMobile = $state(false);
	let rootScale = $state(1);
	let rootOffset = $state({ x: 0, y: 0 });
	const SKY_TARGET_RATIO = 0.1;

let response: any = $state(null);
let endRoundResponse: any = $state(null);
let balance = $state(0);
let fatalError = $state<{ titleKey: string; descKey: string } | null>(null);
let currentCurrency = $state<SupportedCurrency>(
	typeof window !== 'undefined' ? normalizeCurrency(getQueryParamFromSearch(window.location.search, 'currency')) : 'USD'
);
let gigalypseFontReady = $state(false);
	let replayMode = $state(false);
	let replayLoading = $state(false);
	let replayReady = $state(false);
	let replayHasPlayed = $state(false);
	let replayEvents = $state<any[] | null>(null);
	let replayBetId = $state<string | null>(null);
	let replayEventId = $state('');
	let replayCostMultiplier = $state(1);
	let replayPayoutMultiplier = $state(0);
	
	let autoplay = $state(false);
	let autoplayOpen = $state(false);
	let autoplayRemaining = $state(0);
	let autoplayTotal = $state(0);
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
let slipHandoffOriginX = $state<number | null>(null);
let slipProxyImmediateActive = $state(false);
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
	let stepStateCursor = 0;
	let stepStateCursorStep = Number.NEGATIVE_INFINITY;
	let endRoundTriggered = $state(false);
	
	let pickupCount = $state(0);
	let hitPopup = $state<{ text: string; until: number; x: number; y: number } | null>(null);
	let vestAnim = $state<'gain' | null>(null);
	let vestAnimKey = $state(0);
	let penguinAnim = $state<
		| 'idle'
		| 'slide_in'
		| 'slide_idle'
		| 'slide_in_revive'
		| 'win'
		| 'lose_L'
		| 'lose_R'
		| 'lose_L_vest'
		| 'lose_R_vest'
	>('idle');
	let penguinSkin = $state<'base' | 'vest'>('base');
let invincibleLoop = $state(false);
let vestReviveActive = $state(false);
let revivePauseActive = $state(false);
let loseStopFreezeActive = $state(false);
let autoScrollActive = $state(false);
	let slideInStart = $state(0);
	let pendingRound = $state(false);
	let pendingRoundEvents = $state<any[] | null>(null);
	let pendingRoundBetId = $state<string | null>(null);
	let liferingOverrideStep = $state<number | null>(null);
	let liferingGainStep = $state<number | null>(null);
	let liferingForcedOff = $state(false);
	let liferingPickedStep = $state<number | null>(null);
	let lastVestGainStep = $state<number | null>(null);
	let lastVestLoseStep = $state<number | null>(null);
	let pendingVestLossStep = $state<number | null>(null);
	let lastVestAnimAtMs = $state(0);
	let vestGainAnimStartedAtMs = $state(0);
	let pendingVestPopSteps = $state<number[]>([]);
	let pendingVestPopCursor = $state(0);
	let reviveRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
	let reviveFlashTimer: ReturnType<typeof setTimeout> | null = null;
	let reviveBlinkStepsRemaining = $state(0);
	let vestLoseFallbackTimer: ReturnType<typeof setTimeout> | null = null;
	let vestLoseEventSeen = $state(false);
	let vestLossMotionComplete = $state(false);
	let reviveRingVisible = $state(false);
	let reviveStartGhostStepIndex = $state<number | null>(null);
	let reviveStartGhostPassed = $state(true);
	let stopRunEarly = $state(false);
	let freezeMovement = $state(false);
	let betLevels = $state<number[]>([...betOptions]);
	let betIndex = $state(0);
	let timeLabel = $state('');
	let menuOpen = $state(false);
	let menuInfoOpen = $state(false);
	let volatilityHelpOpen = $state(false);
	let selectedMode = $state('BASE_HARD');
let speedFactor = $state(2);
	let maxWinLabel = $state('1,000x');
	let musicMuted = $state(false);
	let hudVolume = $state(58);
	let bootLoading = $state(true);
	let entrySplashVisible = $state(true);
	let audioUnlocked = false;
	const stakeLoaderSrc = assetPath('/stake-engine-loader.gif');
	const splashBackgroundSrc = assetPath('/assets/splash/custom/background.png');
	const splashLogoSrc = assetPath('/assets/splash/custom/logo.png');
	const splashPartnerLogoSrc = assetPath('/assets/splash/custom/easy-games-white.png');
	const splashCenterLandscapeSrc = assetPath('/assets/splash/penguin_1280x675.png');
	const splashCenterPortraitSrc = assetPath('/assets/splash/penguin_1080x1920.png');
	const SOUND_SRC: Record<SoundKey, string> = buildSoundSrc(assetPath);
	let soundEnabled = false;
	const audioEngine = createAudioEngine<SoundKey>({
		soundSrc: SOUND_SRC,
		soundGain: SOUND_GAIN,
		loopSounds: LOOP_SOUNDS,
		getSoundEnabled: () => soundEnabled,
		getMasterVolume: () => soundMasterVolume(),
		getLoopVolume: (key) => loopVolume(key),
		setAudioUnlocked: (value) => {
			audioUnlocked = value;
		},
		onAudioUnlocked: () => {
			if (!bootLoading && !entrySplashVisible && !musicMuted && hudVolume > 0) {
				startBackgroundMusic();
			}
		}
	});
	let lastTurnSoundAt = $state(0);
	let lastTurnSoundLane = $state(0);

	function stakeAmount() {
		return betAmount;
	}

	function currentReplayCostAmount() {
		return Math.max(0, stakeAmount() * replayCostMultiplier);
	}

	function currentReplayPayoutAmount() {
		return Math.max(0, stakeAmount() * replayPayoutMultiplier);
	}

	function currentReplayWinAmount() {
		if (animationStatus === 'done' || animationStatus === 'running') {
			return Math.max(0, roundWinDisplay);
		}
		return currentReplayPayoutAmount();
	}

let renderStep = $state(0);
let targetStep = $state(0);
let animationActive = $state(false);
let animationStatus: 'idle' | 'running' | 'done' = $state('idle');
let penguinLane = $state(0);
let penguinTargetLane = $state(0);
let penguinOffsetFrac = $state(0);
let lastApproachLaneSpeedAbs = $state(0);
let penguinSkidPhase = $state(0);
let penguinSkidRotation = $state(0);
let slipDropY = $state(0);
let vestLossMotionActive = $state(false);
let vestLossMotionToken = $state(0);
let laneVelocity = $state(0);
let laneTravelPlanTokenId = $state<number | null>(null);
let laneTravelPlanOriginSlot = $state(0);
let laneTravelPlanTargetSlot = $state(0);
let laneTravelPlanStartRenderStep = $state(Number.NaN);
let laneTravelPlanTriggerRenderStep = $state(Number.NaN);
let ctrlTurnTilt = $state(0);
let pickupSkidScale = $state(1);
let amountWinPulse = $state(1);
let amountWinPulseToken = 0;
let bananaLossFloat = $state<{ amount: number; start: number } | null>(null);
let queuedSlipLossPresentation = $state(false);
let runStartValue = $state(0);
let lastPickupRenderStep = $state(0);
let lastPickupLane = $state(0);
let lockCenterStrict = $state(false);
let preStepRoamTargetLane = $state(0);
let preStepFreeRoamActive = $state(true);
let preStepSweepStartRenderStep = $state(Number.NaN);
let preStepSweepStartSide = $state(1);
let preStepSweepCompleted = $state(false);
let preStepHandoffActive = $state(false);
let preStepHandoffStartRenderStep = $state(Number.NaN);
let preStepHandoffFromLane = $state(0);
let centerLockPendingTokenId = $state<number | null>(null);
let lockedTargetTokenId = $state<number | null>(null);
let ctrlTurnIntentFiltered = $state(0);
function setPenguinLane(nextLane: number, source = 'unknown') {
	const clampedNextLane = clampPenguinLane(nextLane);
	void source;
	penguinLane = clampedNextLane;
}

function setPenguinTargetLane(nextLane: number) {
	penguinTargetLane = clampPenguinLane(nextLane);
}

function setLockedTargetToken(
	tokenId: number | null,
	nowMs: number,
	force = false,
	preserveMotion = false
) {
	void nowMs;
	void force;
	if (lockedTargetTokenId === tokenId) return;
	lockedTargetTokenId = tokenId;
	laneTravelPlanTokenId = null;
	laneTravelPlanOriginSlot = laneToSlotPosition(penguinLane, SLOT_OFFSETS);
	laneTravelPlanTargetSlot = laneTravelPlanOriginSlot;
	laneTravelPlanStartRenderStep = Number.NaN;
	laneTravelPlanTriggerRenderStep = Number.NaN;
	if (!preserveMotion) {
		laneVelocity = 0;
		ctrlTurnIntentFiltered = 0;
	}
}

function resetPickupTargetingState() {
	setLockedTargetToken(null, performance.now(), true, true);
	centerLockPendingTokenId = null;
	lockCenterStrict = false;
	laneTravelPlanTokenId = null;
	laneTravelPlanOriginSlot = laneToSlotPosition(penguinLane, SLOT_OFFSETS);
	laneTravelPlanTargetSlot = laneTravelPlanOriginSlot;
	laneTravelPlanStartRenderStep = Number.NaN;
	laneTravelPlanTriggerRenderStep = Number.NaN;
}

function formatCurrencyAmount(amount: number, fractionDigits = 2) {
	return formatCurrencyAmountForCurrency(currentCurrency, amount, fractionDigits);
}

function updateCtrlTurnTilt(dt: number, lockToPickup: boolean) {
	const next = computeTurnTiltState({
		dt,
		lockToPickup,
		status,
		slipAnimationStarted,
		freezeMovement,
		penguinTargetLane,
		penguinLane,
		laneVelocity,
		ctrlTurnTilt,
		ctrlTurnIntentFiltered,
		penguinMotionStepDtMax: PENGUIN_MOTION_STEP_DT_MAX
	});
	ctrlTurnTilt = next.ctrlTurnTilt;
	ctrlTurnIntentFiltered = next.ctrlTurnIntentFiltered;
}

function currentBaseStepPerMs() {
	return computeBaseStepPerMs({
		speedFactor,
		pickupStepPaceMultiplier: PICKUP_STEP_PACE_MULTIPLIER,
		pickupTravelSpeed: PICKUP_TRAVEL_SPEED,
		debugGameSpeedMult: DEBUG_GAME_SPEED_MULT
	});
}

function currentRoundSpeedScale() {
	return computeRoundSpeedScale({
		speedFactor,
		pickupStepPaceMultiplier: PICKUP_STEP_PACE_MULTIPLIER,
		pickupTravelSpeed: PICKUP_TRAVEL_SPEED,
		debugGameSpeedMult: DEBUG_GAME_SPEED_MULT
	});
}

function scaleRoundMs(ms: number) {
	return ms / Math.max(0.0001, currentRoundSpeedScale());
}

function currentRoundPresentationActive() {
	return (
		animationStatus === 'running' ||
		status !== 'idle' ||
		hitPopup != null ||
		bananaLossFloat != null ||
		vestAnim != null ||
		vestReviveActive ||
		amountWinPulse !== 1
	);
}

function currentRoundAnimationTimeScale() {
	return currentRoundPresentationActive() ? currentRoundSpeedScale() : 1;
}

function currentSceneAnimationTimeScale() {
	if (revivePauseActive || loseStopFreezeActive) return 0;
	return (animationStatus === 'running' || status !== 'idle') ? currentRoundSpeedScale() : 1;
}

function currentPenguinAnimationTimeScale() {
	return (
		animationStatus === 'running' ||
		status !== 'idle' ||
		penguinAnim === 'slide_in' ||
		penguinAnim === 'slide_in_revive' ||
		vestAnim != null
	)
		? currentRoundSpeedScale()
		: 1;
}

function currentRoundClockMs() {
	return floatTime * 1000;
}

function durationMsForSteps(stepCount: number) {
	return (stepSpacing * stepCount) / Math.max(0.0001, currentBaseStepPerMs());
}

function currentReviveDurationSteps() {
	return 10.74;
}

function currentReviveRingDurationSteps() {
	return 2.7;
}

function currentLinearSpeedScale() {
	return currentRoundSpeedScale();
}

function smoothPenguinLaneTowardTarget(
	dt: number,
	stepPerMs: number,
	pendingHit?:
		| {
				trigger: number;
				t: { id: number; stepIndex: number; type?: string; extra?: Record<string, unknown> };
		  }
		| undefined
) {
	const targetLane = clampPenguinLane(penguinTargetLane);
	const targetArrivalBufferSteps = pendingHit?.t?.type === 'goal' ? 0.04 : 0.06;
	const smoothBridgeApproach = pendingHit?.t?.extra?.bridgeStep === true;
	if (lockCenterStrict && pendingHit && laneTravelPlanTokenId === pendingHit.t.id) {
		const totalSlotDistance = Math.abs(laneTravelPlanTargetSlot - laneTravelPlanOriginSlot);
		const totalTravelSteps = Math.max(
			0.08,
			(Number(laneTravelPlanTriggerRenderStep) - Number(laneTravelPlanStartRenderStep)) /
				stepSpacing -
				targetArrivalBufferSteps
		);
		const elapsedSteps = Math.max(
			0,
			(renderStep - Number(laneTravelPlanStartRenderStep)) / stepSpacing
		);
		const travelT = Math.max(0, Math.min(1, elapsedSteps / totalTravelSteps));
		const direction = Math.sign(laneTravelPlanTargetSlot - laneTravelPlanOriginSlot);
		const overshootSlots =
			totalSlotDistance > 0.18 && direction !== 0
				? Math.min(0.18, 0.04 + totalSlotDistance * 0.03)
				: 0;
		const overshootTargetSlot = laneTravelPlanTargetSlot + direction * overshootSlots;
		const overshootPhaseT = overshootSlots > 0 ? 0.78 : 1;
		let desiredSlot = laneTravelPlanTargetSlot;
		if (totalSlotDistance > 0.0001) {
			if (travelT <= overshootPhaseT) {
				const phaseT = Math.max(0, Math.min(1, travelT / Math.max(0.001, overshootPhaseT)));
				const eased = phaseT * phaseT * (3 - 2 * phaseT);
				desiredSlot =
					laneTravelPlanOriginSlot +
					(overshootTargetSlot - laneTravelPlanOriginSlot) * eased;
			} else {
				const phaseT = Math.max(
					0,
					Math.min(1, (travelT - overshootPhaseT) / Math.max(0.001, 1 - overshootPhaseT))
				);
				const eased = phaseT * phaseT * (3 - 2 * phaseT);
				desiredSlot =
					overshootTargetSlot +
					(laneTravelPlanTargetSlot - overshootTargetSlot) * eased;
			}
		}
		const prevSlot = laneToSlotPosition(penguinLane, SLOT_OFFSETS);
		const motionDt = Math.max(1 / 240, Math.min(PENGUIN_MOTION_STEP_DT_MAX, dt));
		const stepIntervalSec = stepSpacing / Math.max(0.0001, stepPerMs * 1000);
		const totalTravelSec = Math.max(1 / 240, totalTravelSteps * stepIntervalSec);
		const plannedSlotSpeedPerSec = (totalSlotDistance / totalTravelSec) * 1.18;
		const maxSlotDelta = plannedSlotSpeedPerSec * motionDt;
		const slotDelta = desiredSlot - prevSlot;
		const nextSlot =
			Math.abs(slotDelta) <= maxSlotDelta
				? desiredSlot
				: prevSlot + Math.sign(slotDelta) * maxSlotDelta;
		const nextLane = clampPenguinLane(slotPositionToLane(nextSlot, SLOT_OFFSETS));
		const prevLane = penguinLane;
		setPenguinLane(nextLane, 'smooth_plan');
		laneVelocity = (nextLane - prevLane) / motionDt;
		rememberApproachLaneSpeed(laneVelocity);
		return;
	}
	const laneMotionSpeedScale = currentLinearSpeedScale();
	const availableTravelSteps =
		pendingHit && !smoothBridgeApproach && Number.isFinite(Number(pendingHit.trigger))
			? Math.max(
					0.08,
					(Number(pendingHit.trigger) - renderStep) / stepSpacing -
						targetArrivalBufferSteps
				)
			: null;
	const next = computeSmoothedLaneState({
		dt,
		targetLane,
		penguinLane,
		laneVelocity,
		lockCenterStrict,
		disablePenguinSlideMotion: DISABLE_PENGUIN_SLIDE_MOTION,
		laneMotionSpeedScale,
		stepPerMs,
		stepSpacing,
		slotOffsets: SLOT_OFFSETS,
		availableTravelSteps,
		penguinMotionStepDtMax: PENGUIN_MOTION_STEP_DT_MAX,
		penguinLaneBaseFollowRate: PENGUIN_LANE_BASE_FOLLOW_RATE,
		penguinLaneDistanceFollowRate: PENGUIN_LANE_DISTANCE_FOLLOW_RATE,
		penguinLaneCenterLockRateMult: PENGUIN_LANE_CENTER_LOCK_RATE_MULT,
		penguinLaneMaxSpeed: PENGUIN_LANE_MAX_SPEED,
		penguinLaneMaxSpeedCenterLock: PENGUIN_LANE_MAX_SPEED_CENTER_LOCK
	});
	setPenguinLane(next.lane, 'smooth_solver');
	laneVelocity = next.laneVelocity;
	rememberApproachLaneSpeed(laneVelocity);
}

function destroyDelayForTokenType(type: string) {
	if (type === 'goal') return GOAL_PICKUP_DESTROY_DELAY_MS;
	if (type === 'lifering') return LIFERING_PICKUP_DESTROY_DELAY_MS;
	return NORMAL_PICKUP_DESTROY_DELAY_MS;
}

function currentSlipSpeedScale() {
	return currentLinearSpeedScale();
}

function currentRespawnSpeedScale() {
	return currentLinearSpeedScale();
}

function currentRespawnAnimationSpeedScale() {
	return currentLinearSpeedScale();
}

function currentVestLossSpeedScale() {
	return currentSlipSpeedScale();
}

function rememberApproachLaneSpeed(sampleLaneVelocity: number) {
	if (
		status !== 'sliding' ||
		slipTriggered ||
		slipAnimationStarted ||
		revivePauseActive ||
		loseStopFreezeActive ||
		vestLossMotionActive
	) {
		return;
	}
	const absVelocity = Math.abs(sampleLaneVelocity);
	if (absVelocity >= 0.08) {
		lastApproachLaneSpeedAbs = absVelocity;
	}
}

function currentEdgeDriftLaneSpeedAbs(fromLane: number, toLane: number) {
	const liveSpeedAbs = Math.max(Math.abs(laneVelocity), lastApproachLaneSpeedAbs);
	if (liveSpeedAbs >= 0.08) return liveSpeedAbs;
	const fromSlot = laneToSlotPosition(fromLane, SLOT_OFFSETS);
	const toSlot = laneToSlotPosition(toLane, SLOT_OFFSETS);
	const distanceSlots = Math.abs(toSlot - fromSlot);
	const stepIntervalMs = stepSpacing / Math.max(0.0001, currentBaseStepPerMs());
	const rawDurationSec = (distanceSlots * stepIntervalMs) / 1000;
	const durationSec = Math.max(
		SLIP_EDGE_ALIGN_MIN_DURATION_MS / 1000,
		Math.min(SLIP_EDGE_ALIGN_MAX_DURATION_MS / 1000, rawDurationSec)
	);
	const laneDistance = Math.abs(toLane - fromLane);
	return laneDistance / Math.max(1 / 240, durationSec);
}

function vestLossVisualDelayMs(type: string) {
	return scaleRoundMs(destroyDelayForTokenType(type) * 0.18);
}

function laneOffsetForTargetIndex(targetIndex: number | null) {
	return laneOffsetForTargetIndexHelper({
		targetIndex,
		pickupLineCrossings,
		slotToOffset: SLOT_TO_OFFSET
	});
}

function targetLaneIndexForToken(token: { lane: number; spawnLane?: number; extra?: Record<string, unknown> }) {
	return targetLaneIndexForTokenHelper({ token, targetLineIndexForOffset });
}

function shouldHoldCurrentLaneForSinkingToken(token: Token | undefined) {
	if (token && tokenHasSlipProtection(token)) return false;
	return shouldHoldCurrentLaneForSinkingTokenHelper({ token, isNothingTokenType });
}

function planSlidingTargetLane(
	nowMs: number,
	dt: number,
	pendingHit: { t: Token; trigger: number } | undefined,
	preStepFreeRoam: boolean,
	stepPerMs: number
) {
	void dt;
	const next = planSlidingTargetLaneHelper({
		nowMs,
		preStepFreeRoam,
		stepPerMs,
		pendingHit,
		renderStep,
		stepSpacing,
		penguinTargetLane,
		penguinLane,
		centerLockPendingTokenId,
		preStepHandoffActive,
		preStepHandoffStartRenderStep,
		preStepHandoffFromLane,
		preStepHandoffSteps: PRE_STEP_HANDOFF_STEPS,
		clampPenguinLane,
		preStepFreeRoamTargetLane,
		shouldHoldCurrentLaneForSinkingToken,
		targetLaneForToken
	});
	centerLockPendingTokenId = next.centerLockPendingTokenId;
	preStepHandoffActive = next.preStepHandoffActive;
	return {
		lane: next.lane,
		shouldCenterLock: next.shouldCenterLock
	};
}


function startWinAmountPulse() {
	amountWinPulseToken += 1;
	const token = amountWinPulseToken;
	const start = currentRoundClockMs();
	const durationMs = 520;
	const peakAt = 0.35;
	const tick = () => {
		if (token !== amountWinPulseToken) return;
		const t = Math.max(0, Math.min(1, (currentRoundClockMs() - start) / durationMs));
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

function applySlipLossPresentation() {
	const currentWin = Math.max(0, roundWinDisplay);
	if (currentWin > 0.0001) {
		showBananaLossFloat(currentWin);
	}
	currentValue = runStartValue;
	displayValue = runStartValue;
	updateRoundWinDisplay(runStartValue);
	hitDelta = -currentWin;
}

function queueSlipLossPresentation() {
	if (queuedSlipLossPresentation) return;
	queuedSlipLossPresentation = true;
}

function flushSlipLossPresentation() {
	if (!queuedSlipLossPresentation) return;
	queuedSlipLossPresentation = false;
	applySlipLossPresentation();
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
	const autoplayCooldownMsBySpeed: Record<number, number> = {
		2: 900,
		4: 500,
		6: 180
	};
	let laneFreeze = $state(false);
	const autoplayController = createAutoplayController({
		getAutoplay: () => autoplay,
		getAutoplayRemaining: () => autoplayRemaining,
		setAutoplayRemaining: (value) => {
			autoplayRemaining = value;
		},
		setAutoplay: (value) => {
			autoplay = value;
		},
		isRoundBusy: () => animationStatus === 'running' || pendingRound,
		isSliding: () => status === 'sliding',
		getLastRoundEndAt: () => lastRoundEndAt,
		getAutoplayCooldownMs: () => autoplayCooldownMsBySpeed[speedFactor] ?? 900,
		play
	});
	const startAutoplay = autoplayController.start;
	const stopAutoplay = autoplayController.stop;
	const {
		startAutoplayRun,
		handleBetClick,
		setHudVolume,
		toggleHudMute,
		toggleMenuOpen,
		toggleVolatilityHelp,
		setMenuInfoOpen,
		toggleAutoplayOpen,
		setAutoplayDraft,
		handleStartAutoplay,
		increaseBet,
		decreaseBet,
		setSpeed,
		cycleSpeed
	} = createHudControlHandlers({
		isRoundBusy: () => animationStatus === 'running' || status === 'sliding' || pendingRound,
		isRoundRunning: () => animationStatus === 'running',
		getAutoplay: () => autoplay,
		getAutoplayOpen: () => autoplayOpen,
		setAutoplay: (value) => {
			autoplay = value;
		},
		setAutoplayRemaining: (value) => {
			autoplayRemaining = value;
		},
		setAutoplayTotal: (value) => {
			autoplayTotal = value;
		},
		setAutoplayOpen: (value) => {
			autoplayOpen = value;
		},
		getAutoplayDraftCount: () => autoplayDraftCount,
		setAutoplayDraftCount: (value) => {
			autoplayDraftCount = value;
		},
		startRoundAudio,
		playOneShot,
		play,
		getHudVolume: () => hudVolume,
		setHudVolumeValue: (value) => {
			hudVolume = value;
		},
		getMusicMuted: () => musicMuted,
		setMusicMuted: (value) => {
			musicMuted = value;
		},
		ensureAudioUnlocked,
		startBackgroundMusic,
		getMenuOpen: () => menuOpen,
		setMenuOpen: (value) => {
			menuOpen = value;
		},
		getVolatilityHelpOpen: () => volatilityHelpOpen,
		setVolatilityHelpOpen: (value) => {
			volatilityHelpOpen = value;
		},
		setMenuInfoOpenValue: (value) => {
			menuInfoOpen = value;
		},
		getBetIndex: () => betIndex,
		setBetIndex: (value) => {
			betIndex = value;
		},
		getBetLevels: () => betLevels,
		setBetAmount: (value) => {
			betAmount = value;
		},
		getSpeedFactor: () => speedFactor,
		setSpeedFactor: (value) => {
			speedFactor = value;
		}
	});

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
	return tokenCanDriveTargetingHelper(token, shouldSkipPositioningForHitToken);
}

function isTargetableHitToken(token: Token) {
	return isTargetableHitTokenHelper(token, {
		nearestLane,
		shouldSkipPositioningForHitToken
	});
}

function tokenMatchesLandedStep(token: Token) {
	return tokenMatchesLandedStepHelper(token, nearestLane);
}

function shouldForceCollectProtectedSinkingHit(args: {
	token: Token;
	hasVestProtection: boolean;
	triggerReached: boolean;
	band: { passedBand?: boolean } | null;
}) {
	const sinkingSlip = args.token.extra?.sinking === true || args.token.extra?.fall === true;
	if (!sinkingSlip || !args.hasVestProtection) return false;
	if (!(args.token.type === 'coin' || args.token.type === 'star')) return false;
	return tokenMatchesLandedStep(args.token) && (args.triggerReached || Boolean(args.band?.passedBand));
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
		// Visual vest-loss must start from the actual protected sinking pickup,
		// not from the parsed vestPopped timeline marker, otherwise it can fire
		// before the saving pickup resolves and then restart after collection.
		pendingVestPopCursor += 1;
	}
}

function isCosmeticBridgeGhostToken(token: Token) {
	return token.extra?.bridgeStep === true && token.extra?.cosmetic === true;
}

function standardPenguinBandPose() {
	const pose = penguinPose();
	return {
		...pose,
		y: pose.y - slipDropY
	};
}

function thirdRespawnGhostStepAfter(stepIndex: number | null) {
	if (!Number.isFinite(Number(stepIndex))) return null;
	const uniqueStepIndices = [...new Set(
		tokens
			.filter(
				(token) =>
					isCosmeticBridgeGhostToken(token) &&
					Number(token.stepIndex) > Number(stepIndex)
			)
			.map((token) => Number(token.stepIndex))
			.filter((value) => Number.isFinite(value))
	)].sort((a, b) => a - b);
	return uniqueStepIndices[2] ?? null;
}

function hasGhostStepPassedPenguin(stepIndex: number | null) {
	if (!Number.isFinite(Number(stepIndex))) return true;
	const earlyRespawnGateStep = Number(stepIndex) - 0.5;
	if (renderStep >= earlyRespawnGateStep * stepSpacing) {
		return true;
	}
	const ghostStepTokens = tokens.filter(
		(token) =>
			isCosmeticBridgeGhostToken(token) &&
			Number(token.stepIndex) === Number(stepIndex)
	);
	if (!ghostStepTokens.length) {
		return renderStep >= Number(stepIndex) * stepSpacing;
	}
	const referencePose = standardPenguinBandPose();
	return ghostStepTokens.every((token) => {
		const band = pickupBandState(token, referencePose);
		return band?.passedBand ?? renderStep >= Number(stepIndex) * stepSpacing;
	});
}

function tokenUpdatesAccumulatedValue(token: Token) {
	return token.type === 'coin' || token.type === 'star' || token.type === 'banana';
}

function tokenAdvancesPathProgress(token: Token) {
	return token.hit && token.extra?.bridgeStep !== true;
}

function tokenCountsForRespawnBlink(token: Token) {
	return tokenAdvancesPathProgress(token) && token.extra?.cosmetic !== true;
}

function consumeRespawnBlinkStep(token: Token) {
	if (!tokenCountsForRespawnBlink(token) || reviveBlinkStepsRemaining <= 0) return;
	reviveBlinkStepsRemaining = Math.max(0, reviveBlinkStepsRemaining - 1);
	if (reviveBlinkStepsRemaining === 0) {
		invincibleLoop = false;
	}
}

function stopRespawnBlinkOnWin() {
	cancelReviveRecovery();
	cancelReviveFlash();
	cancelVestLoseFallback();
	reviveBlinkStepsRemaining = 0;
	invincibleLoop = false;
	reviveStartGhostStepIndex = null;
	reviveStartGhostPassed = true;
	vestLoseEventSeen = false;
	vestLossMotionComplete = false;
	clearReviveVestVisual();
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
	let liferingVisualClearTimer: ReturnType<typeof setTimeout> | null = null;

const viewport = $state({ w: baseViewport.w, h: baseViewport.h });
let hasStartedFirstRound = $state(false);
let runStartRenderStep = $state(0);
let fixedIcePieces = $state<IcePiece[]>([]);
let dynamicIcePieces = $state<IcePiece[]>([]);
let nextDynamicIceBatchProgressSteps = $state(DYNAMIC_ICE_START_STEPS);
let dynamicIceBlockedSide = $state<IceSide | null>(null);
let dynamicIceBlockedUntilProgressSteps = $state(0);
let icePieces = $state<IcePiece[]>([]);
	let floatTime = $state(0);
	let sceneFloatTime = $state(0);
	let iceScroll = $state(0);
	let slideTimeScale = $state(PENGUIN_SLIDE_TIME_SCALE);
let dynamicIceSerial = 0;
const dynamicIceLastSpawnProgressBySlot = new Map<string, number>();

const getParam = (key: string) => getQueryParamFromSearch(window.location.search, key);
const getLanguageParam = () => getParam('language') ?? getParam('lang');
type I18nKey = string;
const LANGUAGE_SET = createLanguageSet(SUPPORTED_LANGUAGES);
const I18N_PATH = assetPath('/i18n/penguin-slide.i18n.json');
const SOCIAL_EN_US_FALLBACK: Record<string, string> = {
	volatility_high_desc: 'High: High challenge, high reward - up to 10 000x max win.',
	how_to_play_text:
		'Tap PLAY to start. Guide the penguin through pickups and avoid hazards. Collect to secure your current value.',
	autoplay_text: 'Choose spins and speed from Autoplay, then start. Tap PLAY during autoplay to stop immediately.',
	decrease_bet: 'Decrease play amount',
	increase_bet: 'Increase play amount',
	bet: 'Play',
	total_cost: 'TOTAL PLAY AMOUNT',
	bet_size: 'BASE PLAY AMOUNT',
	insufficient_funds_title: 'INSUFFICIENT BALANCE',
	insufficient_funds_desc: 'You do not have enough balance. Please get more coins and try again.',
	payout_label: 'PAYOUT'
};
let I18N_EN = $state<Record<string, string>>({ ...BUILTIN_I18N_EN });
let I18N = $state<Record<string, Record<string, string>>>(
	Object.fromEntries(
		Object.entries(BUILTIN_I18N).map(([lang, messages]) => [lang, { ...messages }])
	) as Record<string, Record<string, string>>
);
let SOCIAL_I18N_EN = $state<Record<string, string>>({ ...SOCIAL_EN_US_FALLBACK });
let currentLanguage = $state<SupportedLanguage>('en');
let socialEnUsMode = $state(false);

function updateSocialEnUsMode() {
	const normalizedLanguageTag = String(getLanguageParam() ?? '')
		.trim()
		.toLowerCase()
		.replace(/_/g, '-');
	const socialQueryEnabled = String(getParam('social') ?? '').trim().toLowerCase() === 'true';
	const socialCurrencyEnabled = currentCurrency === 'XGC' || currentCurrency === 'XSC';
	const englishUi = currentLanguage === 'en' || normalizedLanguageTag === 'en-us' || normalizedLanguageTag === 'en';
	socialEnUsMode = englishUi && (socialQueryEnabled || socialCurrencyEnabled);
}

async function loadI18nCatalog() {
	const catalog = await loadI18nCatalogHelper(I18N_PATH, LANGUAGE_SET);
	if (!catalog) return;
	I18N_EN = { ...BUILTIN_I18N_EN, ...(catalog.en ?? {}) };
	SOCIAL_I18N_EN = {
		...SOCIAL_EN_US_FALLBACK,
		...(catalog.messages?.sweeps_en ?? {})
	};
	I18N = Object.fromEntries(
		Object.entries(BUILTIN_I18N).map(([lang, messages]) => [
			lang,
			{
				...messages,
				...(lang === 'en' ? I18N_EN : catalog.messages?.[lang] ?? {})
			}
		])
	) as Record<string, Record<string, string>>;
}

function normalizeLanguage(raw: string | null | undefined): SupportedLanguage {
	return normalizeLanguageHelper(raw, LANGUAGE_SET);
}

function t(key: I18nKey, vars?: Record<string, string | number>) {
	const template =
		(socialEnUsMode ? SOCIAL_I18N_EN[key] : undefined) ??
		I18N[currentLanguage]?.[key] ??
		I18N_EN[key] ??
		key;
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(vars[name] ?? ''));
}

function dismissFatalError() {
	const shouldReload =
		fatalError?.titleKey === 'general_error_title' &&
		(fatalError?.descKey === 'general_error_desc' || fatalError?.descKey === 'no_internet_desc');
	fatalError = null;
	errorMessage = '';
	if (shouldReload) {
		window.location.reload();
	}
}

function cancelAutoplayOnError() {
	stopAutoplay();
	autoplay = false;
	autoplayOpen = false;
	autoplayRemaining = 0;
	autoplayTotal = 0;
}

function showFatalError(responseLike: any) {
	cancelAutoplayOnError();
	fatalError = resolveErrorPresentation(responseLike);
	errorMessage = '';
}

	function getRgsBaseUrl(): string | null {
		return getRgsBaseUrlFromSearch(window.location.search);
	}

	function updateViewport() {
		const viewportMetrics = window.visualViewport;
		const docEl = document.documentElement;
		const vw = Math.max(
			1,
			Math.round(viewportMetrics?.width ?? 0) ||
				Math.round(docEl.clientWidth || 0) ||
				Math.round(window.innerWidth || 0)
		);
		const vh = Math.max(
			1,
			Math.round(viewportMetrics?.height ?? 0) ||
				Math.round(docEl.clientHeight || 0) ||
				Math.round(window.innerHeight || 0)
		);
		docEl.style.setProperty('--app-vw', `${vw}px`);
		docEl.style.setProperty('--app-vh', `${vh}px`);
		docEl.style.setProperty('--game-body-w', `${vw}px`);
		docEl.style.setProperty('--game-body-h', `${vh}px`);
		docEl.style.setProperty('--game-body-left', '0px');
		docEl.style.setProperty('--game-body-top', '0px');
		docEl.style.setProperty('--game-body-right-inset', '0px');
		docEl.style.setProperty('--game-body-bottom-inset', '0px');
		const mobileLandscapeMatch = window.matchMedia(
			'(orientation: landscape) and (max-width: 1366px) and (max-height: 900px) and (hover: none) and (pointer: coarse)'
		).matches;
		lowPowerMobile = window.matchMedia(
			'(max-width: 1024px) and (hover: none) and (pointer: coarse)'
		).matches;
		isMobileLandscapeUi = mobileLandscapeMatch;
		isMobilePortraitUi = window.matchMedia(
			'(orientation: portrait) and (max-width: 700px) and (hover: none) and (pointer: coarse)'
		).matches;
		gameBox.w = vw;
		gameBox.h = vh;
		stageScale = 1;
		stageOffset.x = 0;
		stageOffset.y = 0;
		logCanvasLayout('updateViewport');
	}

	function logCanvasLayout(label: string) {
		if (!CANVAS_LAYOUT_DEBUG || typeof window === 'undefined') return;
		const app = context.stateApp.pixiApplication;
		const viewportMetrics = window.visualViewport;
		const docEl = document.documentElement;
		const canvas = app?.canvas as HTMLCanvasElement | undefined;
		const renderer = app?.renderer as any;
		const gameRect = gameBodyEl?.getBoundingClientRect();
		const canvasRect = canvas?.getBoundingClientRect();
		console.info('[penguin-slide][canvas]', label, {
			window: {
				innerWidth: window.innerWidth,
				innerHeight: window.innerHeight,
				devicePixelRatio: window.devicePixelRatio,
				screenWidth: window.screen?.width,
				screenHeight: window.screen?.height,
				orientationType: (window.screen.orientation as ScreenOrientation | undefined)?.type ?? 'unknown'
			},
			visualViewport: viewportMetrics
				? {
						width: viewportMetrics.width,
						height: viewportMetrics.height,
						offsetLeft: viewportMetrics.offsetLeft,
						offsetTop: viewportMetrics.offsetTop,
						pageLeft: viewportMetrics.pageLeft,
						pageTop: viewportMetrics.pageTop,
						scale: viewportMetrics.scale
					}
				: null,
			document: {
				clientWidth: docEl.clientWidth,
				clientHeight: docEl.clientHeight,
				appVw: getComputedStyle(docEl).getPropertyValue('--app-vw').trim(),
				appVh: getComputedStyle(docEl).getPropertyValue('--app-vh').trim()
			},
			gameBox: { ...gameBox },
			renderSize: { ...renderSize },
			viewport: { ...viewport },
			stage: {
				rootScale,
				rootOffset: { ...rootOffset },
				stageScale,
				stageOffset: { ...stageOffset }
			},
			gameBody: gameBodyEl
				? {
						clientWidth: gameBodyEl.clientWidth,
						clientHeight: gameBodyEl.clientHeight,
						offsetWidth: gameBodyEl.offsetWidth,
						offsetHeight: gameBodyEl.offsetHeight,
						rect: gameRect ? { width: gameRect.width, height: gameRect.height, left: gameRect.left, top: gameRect.top } : null
					}
				: null,
			canvas: canvas
				? {
						width: canvas.width,
						height: canvas.height,
						clientWidth: canvas.clientWidth,
						clientHeight: canvas.clientHeight,
						styleWidth: canvas.style.width,
						styleHeight: canvas.style.height,
						rect: canvasRect
							? { width: canvasRect.width, height: canvasRect.height, left: canvasRect.left, top: canvasRect.top }
							: null
					}
				: null,
			renderer: renderer
				? {
						width: renderer.width,
						height: renderer.height,
						resolution: renderer.resolution,
						screenWidth: renderer.screen?.width,
						screenHeight: renderer.screen?.height
					}
				: null
		});
	}

function currentIceSpawnSlots() {
	return getIceSpawnXsHelper(viewport, renderSize, ICE_SPAWN_LEFT_COUNT, ICE_SPAWN_RIGHT_COUNT);
}

function currentIceSpawnY(topY: number) {
	const portraitSpawnOffset = renderSize.h > renderSize.w ? 0.04 : 0;
	return topY + viewport.h * (0.25 + ICE_SPAWN_Y_DOWN_FRAC + portraitSpawnOffset);
}

function currentIceTravelOffset() {
	return iceScroll * 0.715;
}

function currentRoundProgressSteps() {
	return Math.max(0, (renderStep - runStartRenderStep) / Math.max(1, stepSpacing));
}

function dynamicIceTravelDistancePerStep() {
	return (stepSpacing * 1.15 * 0.715) / Math.max(0.01, PICKUP_TRAVEL_SPEED);
}

function currentDynamicIceMaxTravel() {
	const { topY, bottomY } = pathMetrics();
	const spawnY = currentIceSpawnY(topY);
	const splashSafeBottom = bottomY - viewport.h * 0.1;
	return Math.max(1, splashSafeBottom - spawnY);
}

function remapDynamicIcePiece(piece: IcePiece) {
	const slots = currentIceSpawnSlots();
	const slotXs = piece.side === 'left' ? slots.left : slots.right;
	const slotIndex = Math.max(0, Math.min(slotXs.length - 1, Number(piece.slotIndex ?? 0)));
	const { topY } = pathMetrics();
	return {
		...piece,
		baseX: slotXs[slotIndex] ?? piece.baseX,
		baseY: currentIceSpawnY(topY)
	};
}

function refreshIcePieces() {
	icePieces = [...fixedIcePieces, ...dynamicIcePieces.map(remapDynamicIcePiece)];
}

function rebuildFixedFloes() {
	const { topY, bottomY } = pathMetrics();
	const icePiecesPerSide = lowPowerMobile ? LOW_POWER_ICE_PIECES_PER_SIDE : ICE_PIECES_PER_SIDE;
	const iceSpawnLeftCount = lowPowerMobile ? LOW_POWER_ICE_SPAWN_COUNT : ICE_SPAWN_LEFT_COUNT;
	const iceSpawnRightCount = lowPowerMobile ? LOW_POWER_ICE_SPAWN_COUNT : ICE_SPAWN_RIGHT_COUNT;
	fixedIcePieces = buildIcePiecesHelper({
		viewport,
		renderSize,
		topY,
		bottomY,
		hasStartedFirstRound,
		animationStatus,
		icePiecesPerSide,
		iceVisibleStart: ICE_VISIBLE_START,
		iceSpawnYDownFrac: ICE_SPAWN_Y_DOWN_FRAC,
		iceSpawnLeftCount,
		iceSpawnRightCount,
		innerWidth: window.innerWidth,
		random: nextIceLayoutRandom
	});
	refreshIcePieces();
}

function chooseDynamicIceSlot(
	side: IceSide,
	progressSteps: number,
	blockedKeys: Set<string>
) {
	const slotCount = side === 'left'
		? lowPowerMobile
			? LOW_POWER_ICE_SPAWN_COUNT
			: ICE_SPAWN_LEFT_COUNT
		: lowPowerMobile
			? LOW_POWER_ICE_SPAWN_COUNT
			: ICE_SPAWN_RIGHT_COUNT;
	const candidates = Array.from({ length: slotCount }, (_, slotIndex) => slotIndex).filter(
		(slotIndex) => !blockedKeys.has(`${side}:${slotIndex}`)
	);
	if (!candidates.length) return null;
	const cooled = candidates.filter((slotIndex) => {
		const slotKey = `${side}:${slotIndex}`;
		const lastProgress = dynamicIceLastSpawnProgressBySlot.get(slotKey);
		return lastProgress == null || progressSteps - lastProgress >= DYNAMIC_ICE_SAME_SLOT_MIN_GAP_STEPS;
	});
	const available = cooled.length ? cooled : candidates;
	return available[Math.floor(nextIceSpawnRandom() * available.length)] ?? null;
}

function dynamicIceBlockedSideAt(progressSteps: number) {
	if (dynamicIceBlockedSide == null) return null;
	return progressSteps < dynamicIceBlockedUntilProgressSteps ? dynamicIceBlockedSide : null;
}

function spawnDynamicIceBatch(progressSteps: number) {
	const blockedSide = dynamicIceBlockedSideAt(progressSteps);
	const batchCount = lowPowerMobile ? 1 : nextIceSpawnRandom() < DYNAMIC_ICE_TWO_PIECE_CHANCE ? 2 : 1;
	const sideOrder: IceSide[] = nextIceSpawnRandom() < 0.5 ? ['left', 'right'] : ['right', 'left'];
	const requestedSides =
		batchCount === 2
			? sideOrder
			: [sideOrder[0]];
	const sides = requestedSides.filter((side, index) => {
		if (side === blockedSide) return false;
		return batchCount === 1 || index === 0 || side !== requestedSides[index - 1];
	});
	if (!sides.length) {
		const fallbackSide: IceSide = blockedSide === 'left' ? 'right' : 'left';
		sides.push(fallbackSide);
	}
	const blockedKeys = new Set<string>();
	const slots = currentIceSpawnSlots();
	const spawnTravelOffset = progressSteps * dynamicIceTravelDistancePerStep();
	const scale = lowPowerMobile ? 0.66 : window.innerWidth < 600 ? 0.72 : 0.88;
	const nextPieces: IcePiece[] = [];
	for (const side of sides) {
		const slotIndex = chooseDynamicIceSlot(side, progressSteps, blockedKeys);
		if (slotIndex == null) continue;
		const slotKey = `${side}:${slotIndex}`;
		blockedKeys.add(slotKey);
		dynamicIceLastSpawnProgressBySlot.set(slotKey, progressSteps);
		const sideSlots = side === 'left' ? slots.left : slots.right;
		const baseX = sideSlots[slotIndex] ?? (side === 'left' ? viewport.w * 0.2 : viewport.w * 0.8);
		const key = DYNAMIC_ICE_KEYS[Math.floor(nextIceSpawnRandom() * DYNAMIC_ICE_KEYS.length)] ?? 'ice_1';
		nextPieces.push({
			baseX,
			baseY: currentIceSpawnY(pathMetrics().topY),
			spawnTravelOffset,
			slotIndex,
			oneShot: true,
			scale,
			key,
			animName: 'activate',
			yAmp: viewport.h * 0.0018,
			rAmp: 0.004,
			swayRate: 0.9 + nextIceSpawnRandom() * 0.24,
			swayPhase: nextIceSpawnRandom() * Math.PI * 2,
			seed: nextIceSpawnRandom() * 1000,
			id: `${key}-dynamic-${dynamicIceSerial++}`,
			spawnIndex: slotIndex,
			side,
			sideGuard: false
		});
	}
	if (!nextPieces.length) return;
	dynamicIcePieces = [...dynamicIcePieces, ...nextPieces];
	refreshIcePieces();
}

function pruneDynamicIcePieces() {
	if (!dynamicIcePieces.length) return;
	const currentTravel = currentIceTravelOffset();
	const maxTravel = currentDynamicIceMaxTravel();
	const nextPieces = dynamicIcePieces.filter((piece) => {
		if (!Number.isFinite(Number(piece.spawnTravelOffset))) return true;
		return currentTravel - Number(piece.spawnTravelOffset) <= maxTravel;
	});
	if (nextPieces.length === dynamicIcePieces.length) return;
	dynamicIcePieces = nextPieces;
	refreshIcePieces();
}

function updateDynamicIceFlow() {
	if (animationStatus !== 'running') return;
	const progressSteps = currentRoundProgressSteps();
	if (progressSteps < DYNAMIC_ICE_START_STEPS) {
		pruneDynamicIcePieces();
		return;
	}
	while (progressSteps >= nextDynamicIceBatchProgressSteps) {
		spawnDynamicIceBatch(nextDynamicIceBatchProgressSteps);
		nextDynamicIceBatchProgressSteps += DYNAMIC_ICE_BATCH_INTERVAL_STEPS;
	}
	pruneDynamicIcePieces();
}

	function resetRun(startValue = 1) {
		for (const timer of removalTimers.values()) clearTimeout(timer);
		removalTimers.clear();
		animationActive = false;
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
		runStartRenderStep = initialRenderStep;
		renderStep = initialRenderStep;
		targetStep = initialRenderStep;
		lastPickupRenderStep = initialRenderStep;
		lastPickupLane = 0;
		lastApproachLaneSpeedAbs = 0;
		animationStatus = 'idle';
		// Keep token IDs monotonic across rounds so keyed pickup/glyph rendering never reuses stale nodes.
		slipSlide = 0;
		slipDirection = 1;
		slipTriggered = false;
		slipAnimationStarted = false;
		slipAnimationToken += 1;
		slipOriginX = null;
		slipHandoffOriginX = null;
		slipProxyImmediateActive = false;
		driftActive = false;
		slipStepIndex = null;
		slipEndRenderStep = null;
		runEndRenderStep = null;
		slipAnimLocked = false;
		queuedSlipLossPresentation = false;
		lastHitType = '';
		endRoundTriggered = false;
		lastTurnSoundLane = 0;
		lastTurnSoundAt = 0;
		hitPopup = null;
		slideInStart = performance.now();
		vestAnim = null;
		vestAnimKey = 0;
		cancelReviveRecovery();
		cancelReviveFlash();
		cancelVestLoseFallback();
		invincibleLoop = false;
		reviveBlinkStepsRemaining = 0;
		reviveRingVisible = false;
		vestReviveActive = false;
		revivePauseActive = false;
		loseStopFreezeActive = false;
		vestLoseEventSeen = false;
		vestLossMotionComplete = false;
		reviveStartGhostStepIndex = null;
		reviveStartGhostPassed = true;
		vestLossMotionActive = false;
		vestLossMotionToken += 1;
		cancelLiferingVisualClear();
		hasLifering = false;
		liferingOverrideStep = null;
		liferingGainStep = null;
		liferingForcedOff = false;
		liferingPickedStep = null;
		lastVestGainStep = null;
		lastVestLoseStep = null;
		pendingVestLossStep = null;
		lastVestAnimAtMs = 0;
		vestGainAnimStartedAtMs = 0;
		pendingVestPopSteps = [];
		pendingVestPopCursor = 0;
		stepStateCursor = 0;
		stepStateCursorStep = Number.NEGATIVE_INFINITY;
		reviveStartGhostStepIndex = null;
		reviveStartGhostPassed = true;
		reviveRecoveryTimer = null;
		reviveFlashTimer = null;
		stopRunEarly = false;
		freezeMovement = false;
		laneFreeze = false;
		penguinAnim = 'slide_in';
		penguinSkin = 'base';
		autoScrollActive = false;
		setPenguinLane(0, 'reset');
		setPenguinTargetLane(0);
		laneVelocity = 0;
		laneTravelPlanTokenId = null;
		laneTravelPlanOriginSlot = 0;
		laneTravelPlanTargetSlot = 0;
		laneTravelPlanStartRenderStep = Number.NaN;
		laneTravelPlanTriggerRenderStep = Number.NaN;
		ctrlTurnTilt = 0;
		ctrlTurnIntentFiltered = 0;
		pickupSkidScale = 1;
		penguinOffsetFrac = 0;
		penguinSkidPhase = nextRouteRandom() * Math.PI * 2;
		slipOriginX = null;
		slipHandoffOriginX = null;
		slipSlide = 0;
		slipDropY = 0;
		penguinSkidRotation = 0;
		penguinSkidRotation = 0;
		slipDropY = 0;
		lockCenterStrict = false;
		iceScroll = 0;
		preStepRoamTargetLane = 0;
		preStepFreeRoamActive = true;
		preStepSweepStartRenderStep = Number.NaN;
		preStepSweepStartSide = nextRouteRandom() < 0.5 ? -1 : 1;
		preStepSweepCompleted = false;
		preStepHandoffActive = false;
		preStepHandoffStartRenderStep = Number.NaN;
		preStepHandoffFromLane = 0;
		lockedTargetTokenId = null;
		centerLockPendingTokenId = null;
		stepLaneSlots.clear();
		lastPathHitSlotBySide.left = null;
		lastPathHitSlotBySide.right = null;
		dynamicIcePieces = [];
		nextDynamicIceBatchProgressSteps = DYNAMIC_ICE_START_STEPS;
		dynamicIceBlockedSide = null;
		dynamicIceBlockedUntilProgressSteps = 0;
		dynamicIceSerial = 0;
		dynamicIceLastSpawnProgressBySlot.clear();
		rebuildFixedFloes();
		

	}

	function markRoundEnded() {
		cancelReviveRecovery();
		cancelReviveFlash();
		cancelVestLoseFallback();
		animationStatus = 'done';
		lastRoundEndAt = performance.now();
		invincibleLoop = false;
		reviveBlinkStepsRemaining = 0;
		clearReviveVestVisual();
		reviveStartGhostStepIndex = null;
		reviveStartGhostPassed = true;
		stopSlideLoop();
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
		const scaledDelayMs = scaleRoundMs(delayMs);
		const timer = setTimeout(() => {
			removalTimers.delete(id);
			tokens = tokens.filter((t) => t.id !== id);
		}, scaledDelayMs);
		removalTimers.set(id, timer);
	}

	function setTargetStep(nextRenderStep: number) {
		targetStep = Math.max(targetStep, nextRenderStep);
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
	return targetLaneForTokenHelper({
		token,
		penguinLane,
		clampPenguinLane,
		nearestLane,
		slotToOffset: SLOT_TO_OFFSET
	});
}

	function resolvePendingTargetableHit(upcoming: Array<{ t: Token; trigger: number }>) {
		if (lockedTargetTokenId != null) {
			const lockedEntry = upcoming.find(
				(entry) => entry.t.id === lockedTargetTokenId && isTargetableHitToken(entry.t)
			);
			if (lockedEntry) return lockedEntry;
		}
		return firstPendingTargetableHit(upcoming, isTargetableHitToken, {
			renderStep,
			stepSpacing,
			staleTriggerWindowSteps: 0.38
		});
	}

function nextRespawnPendingHit() {
	const upcoming = buildUpcomingTokens<Token>({ tokens, pickupTriggerAt });
	return resolvePendingTargetableHit(upcoming);
}

function nextRespawnPickupLane() {
	const pendingHit = nextRespawnPendingHit();
	if (!pendingHit) return null;
	return targetLaneForToken(pendingHit.t);
}

function handoffToImmediateBridgeTarget(activatedTokenId: number, afterStepIndex: number) {
	const nextTarget = nextTargetableHitTokenHelper({
		tokens,
		afterStepIndex,
		activatedTokenId,
		isTargetableHitToken
	});
	if (!nextTarget || nextTarget.extra?.bridgeStep !== true) return false;
	const nextTargetLane = targetLaneForToken(nextTarget);
	setLockedTargetToken(nextTarget.id, performance.now(), true, true);
	centerLockPendingTokenId = null;
	lockCenterStrict = false;
	laneTravelPlanTokenId = null;
	laneTravelPlanOriginSlot = laneToSlotPosition(penguinLane, SLOT_OFFSETS);
	laneTravelPlanTargetSlot = laneToSlotPosition(nextTargetLane, SLOT_OFFSETS);
	laneTravelPlanStartRenderStep = Number.NaN;
	laneTravelPlanTriggerRenderStep = Number.NaN;
	const handoffDirection = Math.sign(nextTargetLane - penguinLane);
	if (handoffDirection !== 0) {
		const preservedSpeedAbs = Math.max(Math.abs(laneVelocity), lastApproachLaneSpeedAbs);
		if (preservedSpeedAbs >= 0.08) {
			laneVelocity = handoffDirection * preservedSpeedAbs;
		}
	}
	setPenguinTargetLane(nextTargetLane);
	return true;
}

function resetTargetingForRespawn(resumeLane: number, respawnPendingHit?: { t: Token; trigger: number }) {
	pickupCount = 0;
	lastPickupRenderStep =
		respawnPendingHit != null
			? Number(respawnPendingHit.trigger) - stepSpacing * 0.5
			: renderStep - stepSpacing * 0.5;
	lastPickupLane = resumeLane;
	setLockedTargetToken(null, performance.now(), true);
	centerLockPendingTokenId = null;
	laneTravelPlanTokenId = null;
	laneTravelPlanOriginSlot = laneToSlotPosition(resumeLane, SLOT_OFFSETS);
	laneTravelPlanTargetSlot = laneTravelPlanOriginSlot;
	laneTravelPlanStartRenderStep = Number.NaN;
	laneTravelPlanTriggerRenderStep = Number.NaN;
	lockCenterStrict = false;
	preStepRoamTargetLane = resumeLane;
	preStepFreeRoamActive = false;
	preStepSweepStartRenderStep = renderStep;
	preStepSweepCompleted = true;
	preStepHandoffActive = false;
	preStepHandoffStartRenderStep = Number.NaN;
	preStepHandoffFromLane = resumeLane;
	if (respawnPendingHit) {
		setLockedTargetToken(respawnPendingHit.t.id, performance.now(), true);
		penguinOffsetFrac = Number(respawnPendingHit.t.extra?.offsetFrac ?? 0);
	}
}

	function updateSlidingPenguinTarget(
		nowMs: number,
		dt: number,
		stepPerMs: number,
		upcoming: Array<{ t: Token; trigger: number }>
	) {
	let pendingHit = resolvePendingTargetableHit(upcoming);
	if (lockedTargetTokenId == null && pendingHit) {
		setLockedTargetToken(pendingHit.t.id, nowMs, true, pendingHit.t.extra?.bridgeStep === true);
		pendingHit = resolvePendingTargetableHit(upcoming);
	}
	const preStepFreeRoam = shouldUsePreStepFreeRoam(pendingHit);
	if (!preStepFreeRoam) {
		setLockedTargetToken(
			pendingHit ? pendingHit.t.id : null,
			nowMs,
			true,
			pendingHit?.t.extra?.bridgeStep === true
		);
		pendingHit = resolvePendingTargetableHit(upcoming);
	}
		if (!pendingHit) {
			setLockedTargetToken(null, nowMs, true);
			centerLockPendingTokenId = null;
		}
		if (!freezeMovement && status === 'sliding') {
			const targetPlan = planSlidingTargetLane(nowMs, dt, pendingHit, preStepFreeRoam, stepPerMs);
			setPenguinTargetLane(targetPlan.lane);
			if (targetPlan.shouldCenterLock && pendingHit) {
				const directTargetLane = clampPenguinLane(targetLaneForToken(pendingHit.t));
				const targetSlot = laneToSlotPosition(directTargetLane, SLOT_OFFSETS);
				if (laneTravelPlanTokenId !== pendingHit.t.id) {
					laneTravelPlanTokenId = pendingHit.t.id;
					const seededOriginLane =
						Number.isFinite(lastPickupLane) ? lastPickupLane : penguinLane;
					laneTravelPlanOriginSlot = laneToSlotPosition(seededOriginLane, SLOT_OFFSETS);
					laneTravelPlanStartRenderStep = Number.isFinite(lastPickupRenderStep)
						? Math.min(renderStep, lastPickupRenderStep)
						: renderStep;
					const direction = Math.sign(targetSlot - laneTravelPlanOriginSlot);
					if (direction !== 0) {
						penguinOffsetFrac =
							direction * Math.min(0.16, 0.06 + Math.abs(targetSlot - laneTravelPlanOriginSlot) * 0.02);
					}
				}
				laneTravelPlanTargetSlot = targetSlot;
				laneTravelPlanTriggerRenderStep = Number(pendingHit.trigger);
			} else {
				laneTravelPlanTokenId = null;
				laneTravelPlanStartRenderStep = Number.NaN;
				laneTravelPlanTriggerRenderStep = Number.NaN;
			}
			if (DISABLE_PENGUIN_SLIDE_MOTION && preStepFreeRoam) {
				setPenguinLane(targetPlan.lane, 'prestep_snap');
				laneVelocity = 0;
			}
			penguinOffsetFrac *= Math.exp(-dt * 8);
			if (Math.abs(penguinOffsetFrac) < 0.002) penguinOffsetFrac = 0;
			if (!slipTriggered) penguinSkidRotation = 0;
			lockCenterStrict = targetPlan.shouldCenterLock;
			maybePlayTurnSound(penguinTargetLane);
			smoothPenguinLaneTowardTarget(dt, stepPerMs, pendingHit);
			return;
		}
		lockCenterStrict = false;
		laneVelocity = 0;
		pickupSkidScale = 1;
		if (!slipTriggered) penguinSkidRotation = 0;
	}


	function slipTriggerRenderStepForToken(token: { stepIndex?: unknown; type?: unknown; extra?: Record<string, unknown> }) {
		return slipTriggerRenderStepForTokenHelper({
			token,
			pickupTriggerAt,
			tokenShouldSlipOnPreviousStep,
			stepSpacing,
			slipTriggerDelaySteps: SLIP_TRIGGER_DELAY_STEPS,
			previousStepSlipExtraLeadSteps: PREVIOUS_STEP_SLIP_EXTRA_LEAD_STEPS,
			firstStepSinkingExtraLeadSteps: FIRST_STEP_SINKING_EXTRA_LEAD_STEPS
		});
	}

	function playSequencePads(stateEvents: any[]) {
		if (!Array.isArray(stateEvents) || !stateEvents.length) return;
		const transformedStateEvents = transformRoundWithEmptyBridgeSteps(stateEvents);
		runId += 1;
		const currentRun = runId;
		resetRun(stakeAmount());
		const parsed = parsePadSequenceEvents({
			events: transformedStateEvents,
			steps,
			currentValue,
			runStartValue,
			stakeAmount,
			laneMap: LANE_MAP,
			addToken,
			buildPadStepTokens: ({ entry, stepIndex, landedLane, landedKey, applies, stepTargetLane, stepSkipTargeting, timelineValue, laneMap, addToken }) =>
				buildPadStepTokens({
					entry,
					stepIndex,
					landedLane,
					landedKey,
					applies,
					stepTargetLane,
					stepSkipTargeting,
					timelineValue,
					laneMap,
					spawnDelayStep: SPAWN_DELAY_STEP,
					stakeAmount,
					isNothingItemValue,
					parseOutcome: parseOutcomeForRound,
					pickPathHitSpawnTarget,
					pickSpawnTargetForStep,
					addToken
				}),
			terminalSlipTriggerAtStep
		});
		let summaryEvent = parsed.summaryEvent;
		stepStates = parsed.timeline;
		stepStateCursor = 0;
		stepStateCursorStep = Number.NEGATIVE_INFINITY;
		setPendingVestPopSteps(parsed.vestPopSteps);

		animationActive = false;
		animationStatus = 'running';
		const { computedMax, startStep, endStep, baseStepPerMs } = computeSequenceScrollWindow({
			tokens,
			slipStepIndex,
			summarySteps: Number(summaryEvent?.steps ?? Number.NaN),
			stepSpacing,
			renderStep,
			speedFactor,
			pickupStepPaceMultiplier: PICKUP_STEP_PACE_MULTIPLIER,
			pickupTravelSpeed: PICKUP_TRAVEL_SPEED,
			debugGameSpeedMult: DEBUG_GAME_SPEED_MULT
		});
		addCosmeticTail(computedMax);
		const firstHit = findFirstTargetableHitToken({
			tokens,
			tokenMatchesLandedStep,
			tokenCanDriveTargeting
		});
		if (firstHit) {
			setLockedTargetToken(firstHit.id, performance.now(), true);
			penguinOffsetFrac = Number(firstHit.extra?.offsetFrac ?? 0);
		}
		let scrollStart: number | null = null;
			let lastNow = performance.now();
			let lastScrollNow = lastNow;
			let scrollSteps = 0;

		function smoothTick(now: number) {
			if (currentRun != runId) return;
			if (stopRunEarly || freezeMovement) {
				markRoundEnded();
				return;
			}
			if (!revivePauseActive && !autoScrollActive && animationStatus === 'running') {
				if (penguinAnim !== 'slide_in' || slideInAutoScrollReady()) {
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
			if (revivePauseActive) {
				slideTimeScale = 0;
				requestAnimationFrame(smoothTick);
				return;
			}
			const stepSpeed = baseStepPerMs;
			slideTimeScale = PENGUIN_SLIDE_TIME_SCALE;
				scrollSteps += (stepSpeed / stepSpacing) * dtMs;
				renderStep = Math.min(endStep, startStep + scrollSteps * stepSpacing);
				iceScroll += (stepSpeed / Math.max(0.01, PICKUP_TRAVEL_SPEED)) * dtMs * 1.15;
				updateDynamicIceFlow();
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

			let updated = false;
			if (tokens.length) {
				let popupText = '';
				let popupX = viewport.w * 0.5;
				let popupY = viewport.h * 0.72;
			const currentPenguinPose = penguinPose();
			const pendingGoalStep = findPendingGoalStep(tokens);
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
					(tokenShouldSlipOnPreviousStep(token) || token.extra?.proxySlip === true) &&
					renderStep >= slipTriggerRenderStepForToken(token);
				if (forcePreviousStepCoinStarSlip) {
					const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
					beginSlip(
						slipTriggerStepForToken(token),
						slipSourceLane,
						Number(token.extra?.offsetFrac ?? 0),
						true,
						true,
						'force_previous_step_slip',
						{
							currentStep,
							tokenId: token.id,
							tokenStepIndex: Number(token.stepIndex),
							tokenType: String(token.type ?? ''),
							tokenLane: Number(token.lane),
							tokenProxySlip: token.extra?.proxySlip === true,
							tokenSinking: token.extra?.sinking === true || token.extra?.fall === true,
							triggerRenderStep: Number(slipTriggerRenderStepForToken(token).toFixed(3))
						}
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
						true,
						'pre_slip_before_pickup',
						{
							currentStep,
							tokenId: token.id,
							tokenStepIndex: Number(token.stepIndex),
							tokenType: String(token.type ?? ''),
							tokenLane: Number(token.lane),
							tokenSinking: token.extra?.sinking === true || token.extra?.fall === true,
							triggerRenderStep: Number(slipTriggerRenderStepForToken(token).toFixed(3))
						}
					);
					return token;
				}
					const meetsPenguinBand = Boolean(band?.inActivateBand ?? false) || Boolean(band?.passedBand ?? false);
					const isNothingToken = isNothingTokenType(token.type);
					const laneAlignedForPickup = isLaneAlignedForPickup(token, band, currentPenguinPose);
					const triggerReached =
						renderStep >=
						pickupTriggerAt(
							Number(token.stepIndex),
							String(token.type ?? ''),
							Number(token.extra?.spawnDelay ?? 0)
						);
					const isTerminalBananaHit =
						summaryEvent?.result === 'slip' &&
						String(token.type ?? '').toLowerCase() === 'banana' &&
						token.hit &&
						tokenMatchesLandedStep(token) &&
						Number(summaryEvent?.steps ?? Number.NaN) === Number(token.stepIndex) + 1;
					const terminalBananaTriggerReached =
						renderStep >=
						Math.min(
							pickupTriggerAt(
								Number(token.stepIndex),
								String(token.type ?? ''),
								Number(token.extra?.spawnDelay ?? 0)
							),
							Number(token.stepIndex) * stepSpacing - stepSpacing * 0.04
						);
					const terminalBananaLaneDelta = Math.abs(
						clampPenguinLane(penguinLane) - clampPenguinLane(targetLaneForToken(token))
					);
					const terminalBananaXDelta = band?.pos
						? Math.abs(currentPenguinPose.x - band.pos.x)
						: Number.POSITIVE_INFINITY;
					const terminalBananaAligned =
						laneAlignedForPickup ||
						(terminalBananaLaneDelta <= 0.56 &&
							terminalBananaXDelta <= Math.max(34, currentPenguinPose.size * 0.34));
					const forceActivateTerminalBanana =
						isTerminalBananaHit &&
						terminalBananaTriggerReached &&
						terminalBananaAligned;
					const forceResolveStaleHit =
						!isNothingToken &&
						token.hit &&
						laneAlignedForPickup &&
						Boolean(band?.passedBand) &&
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
						laneAlignedForPickup &&
						tokenMatchesLandedStep(token) &&
						(meetsPenguinBand || triggerReached);
					const forceActivateLockedHit =
						!isNothingToken &&
						token.hit &&
						tokenMatchesLandedStep(token) &&
						lockedTargetTokenId === token.id &&
						triggerReached;
					const forceCollectProtectedSinkingHit = shouldForceCollectProtectedSinkingHit({
						token,
						hasVestProtection,
						triggerReached,
						band
					});
					const canActivateThisToken = token.extra?.proxySlip === true
						? false
						: isNothingToken
						? autoCollectNothing || Boolean(band?.passedBand)
						: (meetsPenguinBand && laneAlignedForPickup) ||
							forceActivateOnTargetLane ||
							forceActivateLockedHit ||
							forceCollectProtectedSinkingHit ||
							forceResolveStaleHit ||
							forceActivateTerminalBanana;
					if (
						status === 'sliding' &&
						!token.activate &&
						token.hit &&
						canActivateThisToken
					) {
						const stepIndex = Number(token.stepIndex);
						const depth = band?.depth ?? 0.2;
						const spawnLane = band?.bandLane ?? band?.spawnLane ?? Number(token.extra?.spawnLane ?? token.lane);
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
									true,
									'should_slip_before_pickup',
									{
										currentStep,
										tokenId: token.id,
										tokenStepIndex: Number(token.stepIndex),
										tokenType: String(token.type ?? ''),
										tokenLane: Number(token.lane),
										tokenSinking: true,
										triggerRenderStep: Number(slipTriggerRenderStepForToken(token).toFixed(3))
									}
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
						if (tokenAdvancesPathProgress(token)) {
							pickupCount += 1;
							lastPickupRenderStep = pickupTriggerAt(
								stepIndex,
								String(token.type ?? ''),
								Number(token.extra?.spawnDelay ?? 0)
							);
							lastPickupLane = targetLaneForToken(token);
							consumeRespawnBlinkStep(token);
							if (!handoffToImmediateBridgeTarget(token.id, stepIndex)) {
								resetPickupTargetingState();
							}
						}
						penguinOffsetFrac = Number(token.extra?.offsetFrac ?? 0);
						let effect = token.type;
						// Temporarily disable local "bananaSaved" override; rely on RGS timeline values.
						const bananaSaved = false;
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
									true,
									'terminal_slip_at_hit',
									{
										currentStep,
										tokenId: token.id,
										tokenStepIndex: Number(token.stepIndex),
										tokenType: String(token.type ?? ''),
										tokenLane: Number(token.lane)
									}
								);
						} else if (slipAfterPickup) {
							if (token.type === 'banana') {
								wobbleBoost = Math.min(0.8, wobbleBoost + 0.22);
								}
						const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
						beginSlip(
							slipTriggerStepForToken(token),
							slipSourceLane,
							Number(token.extra?.offsetFrac ?? 0),
							true,
							true,
							'slip_after_pickup',
							{
								currentStep,
								tokenId: token.id,
								tokenStepIndex: Number(token.stepIndex),
								tokenType: String(token.type ?? ''),
								tokenLane: Number(token.lane),
								tokenSinking: true
							}
						);
						} else if (sinkingSlip && hasVestProtection) {
							clearLiferingState(stepIndex, true, vestLossVisualDelayMs(token.type));
						}
						if (token.type === 'lifering') {
							hasLifering = true;
							triggerVestGain(stepIndex);
						}
							if (token.type === 'goal') {
								playOneShot('penguin_finish');
								startWinAmountPulse();
								status = 'goal';
								penguinAnim = 'win';
								stopRespawnBlinkOnWin();
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
							: activationNow + scaleRoundMs(destroyDelay);
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
					hitPopup = { text: popupText, x: popupX, y: popupY, until: currentRoundClockMs() + 3000 };
				}
			}

			const upcoming = buildUpcomingTokens<Token>({ tokens, pickupTriggerAt });
			const nowMs = performance.now();
			const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
			lastNow = now;
			updateSlidingPenguinTarget(nowMs, dt, stepPerMs, upcoming);
			const wobbleDt = dt * currentRoundSpeedScale();
			wobbleTime += wobbleDt;
			wobbleBoost = Math.max(0, wobbleBoost - wobbleDt * 0.24);
			updateCtrlTurnTilt(dt, false);
			const summarySlipTrigger = buildSummarySlipTrigger({
				summaryEvent,
				slipTriggered,
				freezeMovement,
				renderStep,
				stepSpacing,
				tokens,
				penguinLane,
				isNothingTokenType
			});
			if (summarySlipTrigger) {
				beginSlip(
					summarySlipTrigger.stepIndex,
					summarySlipTrigger.slipSourceLane,
					summarySlipTrigger.slipOffset,
					true,
					true,
					'summary_slip_trigger',
					{
						currentStep,
						summarySteps: Number(summaryEvent?.steps ?? Number.NaN),
						summaryTriggerAtStep: Number(summaryEvent?.triggerAtStep ?? Number.NaN)
					}
				);
				return;
			}
			if (runProgress < 1) {
				requestAnimationFrame(smoothTick);
			} else if (slipTriggered && !loseStopFreezeActive) {
				requestAnimationFrame(smoothTick);
			} else {
				const summaryCompletion = buildSummaryCompletionState({
					summaryEvent,
					steps,
					currentValue,
					hasPendingValuePickup: hasPendingValuePickup(),
					endRoundTriggered,
					slipTriggered,
					slipStepIndex,
					slipAnimationStarted,
					freezeOnSummary: true
				});
				if (summaryCompletion.kind === 'idle') {
					status = 'idle';
					markRoundEnded();
					autoScrollActive = false;
				} else {
					status = summaryCompletion.status;
					penguinAnim = summaryCompletion.penguinAnim;
					steps = summaryCompletion.steps;
					if (summaryCompletion.shouldApplyFinalValue) {
						currentValue = summaryCompletion.finalValue;
						displayValue = summaryCompletion.finalValue;
						updateRoundWinDisplay(summaryCompletion.finalValue);
					}
					if (summaryCompletion.shouldTriggerSlipAnimation) {
						if (summaryCompletion.shouldClearLifering) {
							clearLiferingState(summaryCompletion.clearLiferingStep, true);
						}
						const fallbackSlipStep = Number.isFinite(Number(summaryCompletion.nextSlipStepIndex))
							? Number(summaryCompletion.nextSlipStepIndex)
							: Math.max(0, Math.floor(renderStep / stepSpacing));
						beginSlip(
							Math.floor(fallbackSlipStep),
							penguinLane,
							Number(penguinOffsetFrac ?? 0),
							true,
							true,
							'summary_completion_slip',
							{
								currentStep,
								summarySteps: Number(summaryEvent?.steps ?? Number.NaN),
								summaryTriggerAtStep: Number(summaryEvent?.triggerAtStep ?? Number.NaN)
							}
						);
						return;
					}
					markRoundEnded();
					if (summaryCompletion.shouldStopRunEarly) stopRunEarly = true;
					if (summaryCompletion.shouldFreezeMovement && !summaryCompletion.shouldTriggerSlipAnimation) {
						freezeMovement = true;
					}
					if (summaryCompletion.shouldDisableAutoScroll) autoScrollActive = false;
					if (summaryCompletion.shouldStartWinPulse) startWinAmountPulse();
					if (summaryCompletion.shouldTriggerEndRound) {
						endRoundTriggered = true;
						endRound();
					}
					if (summaryCompletion.shouldQueueSlipLossPresentation) {
						queueSlipLossPresentation();
					}
					slipTriggered = summaryCompletion.nextSlipTriggered;
					slipStepIndex = summaryCompletion.nextSlipStepIndex;
					if (summaryCompletion.shouldClearLifering) {
						clearLiferingState(summaryCompletion.clearLiferingStep, true);
					}
				}
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
		const parsed = parseBookSequenceEvents({
			bookEvents,
			resetRun,
			onSetLastHitType: (hitType) => {
				lastHitType = hitType;
			},
			onSlipLossQueued: (stepIndex) => {
				queueSlipLossPresentation();
				slipTriggered = true;
				slipStepIndex = stepIndex;
			},
			onSetLastWin: (value) => {
				lastWin = value;
			},
			nearestLane,
			buildTileResultTokens: ({ event, hitType, laneSide, stepIndex, addToken }) =>
				buildTileResultTokens({
					event,
					hitType,
					laneSide,
					stepIndex,
					spawnDelayStep: SPAWN_DELAY_STEP,
					isNothingItemValue,
					nearestLane,
					pickPathHitSpawnTarget,
					pickSpawnTargetForStep,
					addToken
				}),
			addToken
		});
		let summaryEvent = parsed.summaryEvent;
		stepStates = parsed.timeline;
		stepStateCursor = 0;
		stepStateCursorStep = Number.NEGATIVE_INFINITY;
		setPendingVestPopSteps(parsed.vestPopSteps);

		animationActive = false;
		animationStatus = 'running';
		const { computedMax, startStep, endStep, baseStepPerMs } = computeSequenceScrollWindow({
			tokens,
			slipStepIndex,
			summarySteps: Number(summaryEvent?.steps ?? Number.NaN),
			stepSpacing,
			renderStep,
			speedFactor,
			pickupStepPaceMultiplier: PICKUP_STEP_PACE_MULTIPLIER,
			pickupTravelSpeed: PICKUP_TRAVEL_SPEED,
			debugGameSpeedMult: DEBUG_GAME_SPEED_MULT
		});
		addCosmeticTail(computedMax);
		const firstHit = findFirstTargetableHitToken({
			tokens,
			tokenMatchesLandedStep,
			tokenCanDriveTargeting
		});
		if (firstHit) {
			setLockedTargetToken(firstHit.id, performance.now(), true);
			penguinOffsetFrac = Number(firstHit.extra?.offsetFrac ?? 0);
		}
		let scrollStart: number | null = null;
		let lastNow = performance.now();
		let lastScrollNow = lastNow;
		let scrollSteps = 0;
	function smoothTick(now: number) {
		if (currentRun != runId) return;
		if (stopRunEarly || freezeMovement) {
			markRoundEnded();
			return;
		}
		if (!revivePauseActive && !autoScrollActive && animationStatus === 'running') {
			if (penguinAnim !== 'slide_in' || slideInAutoScrollReady()) {
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
		if (revivePauseActive) {
			slideTimeScale = 0;
			requestAnimationFrame(smoothTick);
			return;
		}
		const stepSpeed = baseStepPerMs;
		slideTimeScale = PENGUIN_SLIDE_TIME_SCALE;
		scrollSteps += (stepSpeed / stepSpacing) * dtMs;
		renderStep = Math.min(endStep, startStep + scrollSteps * stepSpacing);
		iceScroll += (stepSpeed / Math.max(0.01, PICKUP_TRAVEL_SPEED)) * dtMs * 1.15;
		updateDynamicIceFlow();
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
		let updated = false;
		if (tokens.length) {
			let popupText = '';
			let popupX = viewport.w * 0.5;
			let popupY = viewport.h * 0.72;
			const currentPenguinPose = penguinPose();
			const pendingGoalStep = findPendingGoalStep(tokens);
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
						(tokenShouldSlipOnPreviousStep(token) || token.extra?.proxySlip === true) &&
						renderStep >= slipTriggerRenderStepForToken(token);
					if (forcePreviousStepCoinStarSlip) {
						const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
						beginSlip(
							slipTriggerStepForToken(token),
							slipSourceLane,
							Number(token.extra?.offsetFrac ?? 0),
							true,
							true,
							'force_previous_step_slip',
							{
								currentStep,
								tokenId: token.id,
								tokenStepIndex: Number(token.stepIndex),
								tokenType: String(token.type ?? ''),
								tokenLane: Number(token.lane),
								tokenProxySlip: token.extra?.proxySlip === true,
								tokenSinking: token.extra?.sinking === true || token.extra?.fall === true,
								triggerRenderStep: Number(slipTriggerRenderStepForToken(token).toFixed(3))
							}
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
							true,
							'pre_slip_before_pickup',
							{
								currentStep,
								tokenId: token.id,
								tokenStepIndex: Number(token.stepIndex),
								tokenType: String(token.type ?? ''),
								tokenLane: Number(token.lane),
								tokenSinking: token.extra?.sinking === true || token.extra?.fall === true,
								triggerRenderStep: Number(slipTriggerRenderStepForToken(token).toFixed(3))
							}
						);
						return token;
					}
						const meetsPenguinBand = Boolean(band?.inActivateBand ?? false) || Boolean(band?.passedBand ?? false);
						const isNothingToken = isNothingTokenType(token.type);
						const laneAlignedForPickup = isLaneAlignedForPickup(token, band, currentPenguinPose);
						const triggerReached =
							renderStep >=
							pickupTriggerAt(
								Number(token.stepIndex),
								String(token.type ?? ''),
								Number(token.extra?.spawnDelay ?? 0)
							);
						const isTerminalBananaHit =
							summaryEvent?.result === 'slip' &&
							String(token.type ?? '').toLowerCase() === 'banana' &&
							token.hit &&
							tokenMatchesLandedStep(token) &&
							Number(summaryEvent?.steps ?? Number.NaN) === Number(token.stepIndex) + 1;
						const terminalBananaTriggerReached =
							renderStep >=
							Math.min(
								pickupTriggerAt(
									Number(token.stepIndex),
									String(token.type ?? ''),
									Number(token.extra?.spawnDelay ?? 0)
								),
								Number(token.stepIndex) * stepSpacing - stepSpacing * 0.04
							);
						const terminalBananaLaneDelta = Math.abs(
							clampPenguinLane(penguinLane) - clampPenguinLane(targetLaneForToken(token))
						);
						const terminalBananaXDelta = band?.pos
							? Math.abs(currentPenguinPose.x - band.pos.x)
							: Number.POSITIVE_INFINITY;
						const terminalBananaAligned =
							laneAlignedForPickup ||
							(terminalBananaLaneDelta <= 0.56 &&
								terminalBananaXDelta <= Math.max(34, currentPenguinPose.size * 0.34));
						const forceActivateTerminalBanana =
							isTerminalBananaHit &&
							terminalBananaTriggerReached &&
							terminalBananaAligned;
						const forceResolveStaleHit =
							!isNothingToken &&
							token.hit &&
							laneAlignedForPickup &&
							Boolean(band?.passedBand) &&
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
							laneAlignedForPickup &&
							tokenMatchesLandedStep(token) &&
							(meetsPenguinBand || triggerReached);
						const forceActivateLockedHit =
							!isNothingToken &&
							token.hit &&
							tokenMatchesLandedStep(token) &&
							lockedTargetTokenId === token.id &&
							triggerReached;
						const forceCollectProtectedSinkingHit = shouldForceCollectProtectedSinkingHit({
							token,
							hasVestProtection,
							triggerReached,
							band
						});
						const canActivateThisToken = token.extra?.proxySlip === true
							? false
							: isNothingToken
							? autoCollectNothing || Boolean(band?.passedBand)
							: (meetsPenguinBand && laneAlignedForPickup) ||
								forceActivateOnTargetLane ||
								forceActivateLockedHit ||
								forceCollectProtectedSinkingHit ||
								forceResolveStaleHit ||
								forceActivateTerminalBanana;
						if (
							status === 'sliding' &&
							!token.activate &&
							token.hit &&
							canActivateThisToken
						) {
						const stepIndex = Number(token.stepIndex);
						const depth = band?.depth ?? 0.2;
						const spawnLane = band?.bandLane ?? band?.spawnLane ?? Number(token.extra?.spawnLane ?? token.lane);
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
								true,
								'should_slip_before_pickup',
								{
									currentStep,
									tokenId: token.id,
									tokenStepIndex: Number(token.stepIndex),
									tokenType: String(token.type ?? ''),
									tokenLane: Number(token.lane),
									tokenSinking: true,
									triggerRenderStep: Number(slipTriggerRenderStepForToken(token).toFixed(3))
								}
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
						if (tokenAdvancesPathProgress(token)) {
							pickupCount += 1;
							lastPickupRenderStep = pickupTriggerAt(
								stepIndex,
								String(token.type ?? ''),
								Number(token.extra?.spawnDelay ?? 0)
							);
							lastPickupLane = targetLaneForToken(token);
							consumeRespawnBlinkStep(token);
							if (!handoffToImmediateBridgeTarget(token.id, stepIndex)) {
								resetPickupTargetingState();
							}
						}
						penguinOffsetFrac = Number(token.extra?.offsetFrac ?? 0);
					let effect = token.type;
						// Temporarily disable local "bananaSaved" override; rely on RGS timeline values.
						const bananaSaved = false;
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
							true,
							'terminal_slip_at_hit',
							{
								currentStep,
								tokenId: token.id,
								tokenStepIndex: Number(token.stepIndex),
								tokenType: String(token.type ?? ''),
								tokenLane: Number(token.lane)
							}
						);
					} else if (sinkingSlip && !goalPriorityActive && isNearEdgeForSlip(band, currentPenguinPose)) {
							if (token.type === 'banana') {
									wobbleBoost = Math.min(0.8, wobbleBoost + 0.22);
								}
						if (hasVestProtection) {
							clearLiferingState(stepIndex, true, vestLossVisualDelayMs(token.type));
						} else {
							const slipSourceLane = isNothingTokenType(token.type) ? penguinLane : token.lane;
							beginSlip(
								slipTriggerStepForToken(token),
								slipSourceLane,
								Number(token.extra?.offsetFrac ?? 0),
								true,
								true,
								'slip_after_pickup',
								{
									currentStep,
									tokenId: token.id,
									tokenStepIndex: Number(token.stepIndex),
									tokenType: String(token.type ?? ''),
									tokenLane: Number(token.lane),
									tokenSinking: true
								}
							);
						}
					}
					if (token.type === 'goal') {
						playOneShot('penguin_finish');
						startWinAmountPulse();
						status = 'goal';
							penguinAnim = 'win';
							stopRespawnBlinkOnWin();
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
						hasLifering = true;
						triggerVestGain(stepIndex);
					}
					if (bananaSaved) {
						clearLiferingState(stepIndex, true, vestLossVisualDelayMs(token.type));
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
						: activationNow + scaleRoundMs(destroyDelay);
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
				
				hitPopup = { text: popupText, until: currentRoundClockMs() + 3000, x: popupX, y: popupY };
			}
		}
			if (stepStates.length) updateWobbleRiskForStep(currentStep);
		// Keep non-hit pickups visible until they are truly out of the play area.
		// Trigger-based cleanup removes early steps too soon because trigger lead is intentionally early.
		tokens = filterVisibleUnactivatedTokens({ tokens, renderStep, stepSpacing });
		const upcoming = buildUpcomingTokens<Token>({ tokens, pickupTriggerAt });
		const nowMs = performance.now();
		const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
		lastNow = now;
		updateSlidingPenguinTarget(nowMs, dt, stepPerMs, upcoming);
		const wobbleDt = dt * currentRoundSpeedScale();
		wobbleTime += wobbleDt;
		wobbleBoost = Math.max(0, wobbleBoost - wobbleDt * 0.24);
		updateCtrlTurnTilt(dt, false);
		const summarySlipTrigger = buildSummarySlipTrigger({
			summaryEvent,
			slipTriggered,
			freezeMovement,
			renderStep,
			stepSpacing,
			tokens,
			penguinLane,
			isNothingTokenType
		});
		if (summarySlipTrigger) {
			beginSlip(
				summarySlipTrigger.stepIndex,
				summarySlipTrigger.slipSourceLane,
				summarySlipTrigger.slipOffset,
				true,
				true,
				'summary_slip_trigger',
				{
					currentStep,
					summarySteps: Number(summaryEvent?.steps ?? Number.NaN),
					summaryTriggerAtStep: Number(summaryEvent?.triggerAtStep ?? Number.NaN)
				}
			);
			return;
		}
		if (runProgress < 1) {
			requestAnimationFrame(smoothTick);
		} else if (slipTriggered && !loseStopFreezeActive) {
			requestAnimationFrame(smoothTick);
		} else {
			const summaryCompletion = buildSummaryCompletionState({
				summaryEvent,
				steps,
				currentValue,
				hasPendingValuePickup: hasPendingValuePickup(),
				endRoundTriggered,
				slipTriggered,
				slipStepIndex,
				slipAnimationStarted,
				freezeOnSummary: false
			});
			if (summaryCompletion.kind === 'idle') {
				status = 'idle';
				markRoundEnded();
				autoScrollActive = false;
			} else {
				status = summaryCompletion.status;
				penguinAnim = summaryCompletion.penguinAnim;
				steps = summaryCompletion.steps;
				if (summaryCompletion.shouldApplyFinalValue) {
					currentValue = summaryCompletion.finalValue;
					displayValue = summaryCompletion.finalValue;
					updateRoundWinDisplay(summaryCompletion.finalValue);
				}
				if (summaryCompletion.shouldTriggerSlipAnimation) {
					if (summaryCompletion.shouldClearLifering) {
						clearLiferingState(summaryCompletion.clearLiferingStep, true);
					}
					const fallbackSlipStep = Number.isFinite(Number(summaryCompletion.nextSlipStepIndex))
						? Number(summaryCompletion.nextSlipStepIndex)
						: Math.max(0, Math.floor(renderStep / stepSpacing));
					beginSlip(
						Math.floor(fallbackSlipStep),
						penguinLane,
						Number(penguinOffsetFrac ?? 0),
						true,
						true,
						'summary_completion_slip',
						{
							currentStep,
							summarySteps: Number(summaryEvent?.steps ?? Number.NaN),
							summaryTriggerAtStep: Number(summaryEvent?.triggerAtStep ?? Number.NaN)
						}
					);
					return;
				}
				markRoundEnded();
				if (summaryCompletion.shouldStopRunEarly) stopRunEarly = true;
				if (summaryCompletion.shouldFreezeMovement && !summaryCompletion.shouldTriggerSlipAnimation) {
					freezeMovement = true;
				}
				if (summaryCompletion.shouldDisableAutoScroll) autoScrollActive = false;
				if (summaryCompletion.shouldStartWinPulse) startWinAmountPulse();
				if (summaryCompletion.shouldTriggerEndRound) {
					endRoundTriggered = true;
					endRound();
				}
				if (summaryCompletion.shouldQueueSlipLossPresentation) {
					queueSlipLossPresentation();
				}
				slipTriggered = summaryCompletion.nextSlipTriggered;
				slipStepIndex = summaryCompletion.nextSlipStepIndex;
				if (summaryCompletion.shouldClearLifering) {
					clearLiferingState(summaryCompletion.clearLiferingStep, true);
				}
			}
		}
	}
	requestAnimationFrame(smoothTick);
	}

function processBookEvents(bookEvents: any[]) {
	playSequence(bookEvents);
}

function setMode(mode: string, label?: string, maxWin?: string) {
			void label;
			if (animationStatus === 'running' || autoplay) return;
			selectedMode = mode;
			maxWinLabel = maxWinLabelForMode(mode, maxWin);
		}

async function authenticate() {
		if (replayMode) return;
		errorMessage = '';
		fatalError = null;
		currentLanguage = normalizeLanguage(getLanguageParam());
		updateSocialEnUsMode();
		currentCurrency = normalizeCurrency(getParam('currency'));
		const authFlow = await runAuthenticateFlow({
			search: window.location.search,
			language: currentLanguage,
			apiMultiplier: API_MULTIPLIER,
			fallbackBetOptions: betOptions,
			currentBetAmount: betAmount,
			modeFromQuery: getParam('mode')
		});
		if (authFlow.wallet.balance != null) balance = authFlow.wallet.balance;
		if (authFlow.wallet.currency) currentCurrency = normalizeCurrency(authFlow.wallet.currency);
		if (authFlow.mode) setMode(authFlow.mode);
		const authBetConfig = authFlow.betConfig;
		betLevels = authBetConfig.betLevels;
		betAmount = authBetConfig.betAmount;
		betIndex = authBetConfig.betIndex;
		const pendingState = authFlow.pendingRoundEvents;
		const authOutcome = resolveAuthenticateOutcome(authFlow);
		if (authOutcome.action === 'pending') {
			pendingRoundEvents = pendingState;
			pendingRoundBetId = authFlow.betId ?? null;
			pendingRound = true;
			errorMessage = authOutcome.errorMessage;
			return;
		}
		pendingRoundBetId = null;
		if (authOutcome.action === 'clear_error' || authOutcome.action === 'failed') {
			if (authOutcome.action === 'failed') showFatalError(authFlow.response);
			else errorMessage = authOutcome.errorMessage;
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
		const pendingBetId = pendingRoundBetId;
		pendingRoundBetId = null;
		if (view) {
			await startRoundAudio();
			reseedFrontendRandomness(
				pendingBetId ?? { source: 'pending-round', events },
				'pending-round'
			);
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
		if (replayMode) return;
		if (animationStatus === 'running') return;
		errorMessage = '';
		fatalError = null;
		autoplayOpen = false;
		hasStartedFirstRound = true;
		await startRoundAudio();
		startSlideLoop();

		hasLifering = false;
		const preparedPlay = await preparePlayRound({
			forceTestRound: FORCE_TEST_ROUND,
			forcedTestRoundBetId: FORCED_TEST_ROUND_BET_ID,
			forcedTestRoundState: FORCED_TEST_ROUND_STATE,
			hasRgsBaseUrl: Boolean(getRgsBaseUrl()),
			selectedMode,
			stakeAmount: stakeAmount(),
			betAmount,
			apiMultiplier: API_MULTIPLIER,
			search: window.location.search,
			buildSimulatedLossBetId,
			buildSimulatedLossEvents,
			runPlayFlow
		});
		endRoundResponse = null;
		response = preparedPlay.response;
		if (preparedPlay.wallet?.balance != null) balance = preparedPlay.wallet.balance;
		if (preparedPlay.wallet?.currency) currentCurrency = normalizeCurrency(preparedPlay.wallet.currency);
		if (preparedPlay.kind === 'error') {
			stopSlideLoop();
			showFatalError(preparedPlay.response);
			return;
		}
		endRoundTriggered = preparedPlay.shouldTriggerEndRoundNow;
		const bookEvents = preparedPlay.events;
		reseedFrontendRandomness(
			preparedPlay.betId ?? { source: 'play-round', events: bookEvents },
			'play-round'
		);
		const normalizedEvents = normalizeRoundEvents(bookEvents);
		// logWsTransformedResponse('/wallet/play', bookEvents, normalizedEvents);
		processBookEvents(normalizedEvents);
		if (preparedPlay.payoutMultiplier != null) lastWin = preparedPlay.payoutMultiplier;
	}

	async function endRound() {
		if (replayMode) return;
		const endFlow = await runEndRoundFlow({
			search: window.location.search,
			apiMultiplier: API_MULTIPLIER
		});
		endRoundResponse = endFlow.response;
		if (endFlow.wallet.balance != null) balance = endFlow.wallet.balance;
		if (endFlow.wallet.currency) currentCurrency = normalizeCurrency(endFlow.wallet.currency);
	}

	function configureReplayStakeFromQuery() {
		const amountRaw = getParam('amount');
		const parsedAmount = amountRaw != null ? Number(amountRaw) : Number.NaN;
		if (Number.isFinite(parsedAmount) && parsedAmount >= 0) {
			const normalizedReplayBetAmount = parsedAmount / API_MULTIPLIER;
			betAmount = normalizedReplayBetAmount;
			betLevels = [normalizedReplayBetAmount];
			betIndex = 0;
		}
		const modeFromQuery = getParam('mode');
		if (modeFromQuery) setMode(String(modeFromQuery));
		replayEventId = getParam('event') ?? '';
	}

	async function loadReplayRound() {
		replayLoading = true;
		replayReady = false;
		replayHasPlayed = false;
		replayEvents = null;
		replayBetId = null;
		replayCostMultiplier = 1;
		replayPayoutMultiplier = 0;
		errorMessage = '';
		fatalError = null;
		autoplay = false;
		autoplayOpen = false;
		autoplayRemaining = 0;
		configureReplayStakeFromQuery();
		const replayFlow = await runReplayFlow({ search: window.location.search });
		replayLoading = false;
		response = replayFlow.response;
		if (replayFlow.errorMessage) {
			errorMessage = replayFlow.errorMessage;
			return;
		}
		replayEvents = replayFlow.events;
		replayCostMultiplier =
			replayFlow.costMultiplier != null ? replayFlow.costMultiplier : TOTAL_COST_MULTIPLIER;
		replayPayoutMultiplier = replayFlow.payoutMultiplier ?? 0;
		replayBetId = getParam('event') ?? null;
		replayReady = replayFlow.events.length > 0;
	}

	async function startReplayRound() {
		if (!replayMode || replayLoading || !replayReady || !replayEvents?.length) return;
		if (animationStatus === 'running') return;
		errorMessage = '';
		hasStartedFirstRound = true;
		await startRoundAudio();
		startSlideLoop();
		hasLifering = false;
		replayHasPlayed = true;
		reseedFrontendRandomness(
			replayBetId ?? { source: 'replay-round', event: replayEventId, events: replayEvents },
			'replay-round'
		);
		const normalizedEvents = normalizeRoundEvents(replayEvents);
		processBookEvents(normalizedEvents);
	}

 



const lookaheadSteps = 8.9;
const stepSpacing = 420;
const SLOT_OFFSETS = Object.keys(SLOT_TO_OFFSET)
	.map((key) => Number(key))
	.sort((a, b) => a - b)
	.map((key) => SLOT_TO_OFFSET[key]);
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
		const mobilePortraitBoost = renderSize.h > renderSize.w && renderSize.w <= 500 ? 1.15 : 1;
		return Math.max(110, viewport.w * 0.12) * (0.7 + depth * 0.6) * 0.63 * mobileFactor * 1.25 * 1.25 * 0.85 * 1.3 * 0.8 * portraitBoost * mobilePortraitBoost;
	}

	function slipDriftAnchorXForLane(rawLane: number, offsetFracValue = 0) {
		const depth = penguinDepth();
		const lane = rawLane * penguinLaneScale;
		const pos = lanePosition(depth, lane);
		const size = penguinSizeAtDepth(depth);
		const maxOffset = Math.min(0.35, Math.max(0, 1 - Math.abs(rawLane)));
		const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, offsetFracValue || 0));
		const offsetX = clampedOffset * pos.width;
		const portraitDown = renderSize.h > renderSize.w ? viewport.h * -0.08 : 0;
		const isMobilePortrait = renderSize.h > renderSize.w && renderSize.w <= 500;
		const mobilePortraitUp = isMobilePortrait ? viewport.h * 0.1 : 0;
		const landscapeUp = renderSize.w > renderSize.h && renderSize.h <= 500 ? viewport.h * 0.06 : 0;
		const basePenguinY = pos.y + size * 0.25 - viewport.h * 0.25 + portraitDown - landscapeUp;
		const penguinY = basePenguinY + viewport.h * 0.055 - mobilePortraitUp;
		const clampDepth = depthForPickupPathY(penguinY);
		const clampPos = lanePosition(clampDepth, 0);
		const offsetLimit = clampPos.width * 0.04;
		const offsetXLimited = Math.max(-offsetLimit, Math.min(offsetLimit, offsetX));
		const laneX = clampPos.x + lane * clampPos.width * laneSpread(clampDepth);
		const clampXs = clampLaneXs(clampDepth);
		return Math.max(clampXs.minX, Math.min(clampXs.maxX, laneX + offsetXLimited));
	}

	function penguinPose() {
		const debug = computePenguinPoseDebug();
		return { x: debug.x, y: debug.y, size: debug.size, depth: debug.depth };
	}

	function computePenguinPoseDebug() {
		const depth = penguinDepth();
		const lane = (slipAnimationStarted ? penguinLane : clampPenguinLane(penguinLane)) * penguinLaneScale;
		const pos = lanePosition(depth, lane);
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
			((status === 'sliding' || status === 'goal') && !slipAnimationStarted && !slipTriggered) ||
			(status === 'slip' && !slipAnimationStarted);
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
			? pickupLanePosition(clampDepth, lane).x
			: clampPos.x + lane * clampPos.width * laneSpread(clampDepth);
		const externalSlipMotionActive = slipAnimationStarted || vestLossMotionActive;
		const wobble = wobbleSignal();
		const laneNorm = Math.min(1, Math.abs(penguinLane) / Math.max(0.01, PENGUIN_LANE_RANGE));
		const sideLaneFactor = Math.max(0.28, 1.5 - laneNorm * 1.05 - laneNorm * laneNorm * 0.35 + wobbleRisk * 0.24);
		const wobbleSidePx =
			!externalSlipMotionActive && !followLanePrecisely
				? wobble.wave * wobble.amp * clampPos.width * 0.0062 * sideLaneFactor * (lockCenterStrict ? 0.35 : 1)
				: 0;
		const turnIntent = (penguinTargetLane - penguinLane) + laneVelocity * 0.34;
		const turnDirection = Math.sign(turnIntent);
		const turnDriftPx =
			!externalSlipMotionActive && !followLanePrecisely
				? turnDirection *
					Math.min(clampPos.width * 0.055, Math.abs(turnIntent) * clampPos.width * 0.085) *
					(lockCenterStrict ? 0.55 : 1)
				: 0;
		const baseXLimited = laneX + offsetXLimited;
		clampedX = Math.max(minClamp, Math.min(maxClamp, baseXLimited));
		const x =
			externalSlipMotionActive && slipOriginX != null
				? slipOriginX + slipSlide
				: slipTriggered && !driftActive
					? clampedX + slipSlide
					: clampedX + wobbleSidePx + turnDriftPx;
		const y = penguinY + slipDropY;
		return {
			x,
			y,
			size,
			depth,
			lane,
			offsetX,
			offsetXLimited,
			laneX,
			clampedX,
			wobbleSidePx,
			turnDriftPx,
			followLanePrecisely,
			externalSlipMotionActive
		};
	}

	function startAutoScroll() {
		autoScrollActive = true;
		if (penguinAnim !== 'slide_in' && penguinAnim !== 'slide_idle') {
			penguinAnim = 'slide_idle';
		}
	}

	function slideInAutoScrollReady() {
		return performance.now() - slideInStart >= scaleRoundMs(260);
	}

	function soundMasterVolume() {
		if (!soundEnabled) return 0;
		if (musicMuted) return 0;
		return Math.max(0, Math.min(1, hudVolume / 100));
	}

	function loopVolume(key: SoundKey) {
		void key;
		return soundMasterVolume() * SOUND_GAIN[key];
	}

	function updateAudioMix() {
		audioEngine.updateMix();
	}

	async function playLoop(key: SoundKey, restart = false) {
		await audioEngine.playLoop(key, restart);
	}

	function stopLoop(key: SoundKey, reset = false) {
		void reset;
		audioEngine.stopLoop(key);
	}

	function playOneShot(key: SoundKey) {
		audioEngine.playOneShot(key);
	}

	function pauseAllAudio() {
		stopSlideLoop();
		stopLoop('music_loop');
		void audioEngine.suspend();
	}

	function startBackgroundMusic() {
		if (bootLoading) {
			stopLoop('music_loop');
			return;
		}
		playLoop('music_loop');
	}

	async function ensureBackgroundMusic() {
		await ensureAudioUnlocked();
		if (bootLoading) {
			stopLoop('music_loop');
			return;
		}
		if (!musicMuted && hudVolume > 0) {
			startBackgroundMusic();
		}
	}

	async function startRoundAudio() {
		await ensureBackgroundMusic();
	}

	function ensureAudioUnlocked() {
		return audioEngine.ensureUnlocked();
	}

	async function enterGameFromSplash() {
		if (bootLoading) return;
		const unlockPromise = ensureBackgroundMusic();
		entrySplashVisible = false;
		await unlockPromise;
	}

	async function ensureGigalypseFont() {
		const fontUrl = gigalypseFontUrl;
		try {
			if (document.fonts.check('1em Gigalypse')) {
				await document.fonts.load('52px Gigalypse');
				gigalypseFontReady = true;
				return;
			}
			const font = new FontFace('Gigalypse', `url(${fontUrl})`);
			await font.load();
			document.fonts.add(font);
			await document.fonts.load('52px Gigalypse');
			gigalypseFontReady = true;
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
		const now = currentRoundClockMs();
		if (now - lastTurnSoundAt < 260) return;
		lastTurnSoundAt = now;
		lastTurnSoundLane = nextTargetLane;
		playOneShot('penguin_turn');
	}

	function freezeForLoseStopEvent() {
		if (loseStopFreezeActive) return;
		const stopStep = renderStep;
		loseStopFreezeActive = true;
		stopRunEarly = true;
		freezeMovement = true;
		autoScrollActive = false;
		targetStep = renderStep;
		animationActive = false;
		slipEndRenderStep = stopStep;
		runEndRenderStep = stopStep;
		markRoundEnded();
	}

	function handlePenguinEvent(name: string) {
		if (name === 'start') {
			if (penguinAnim === 'slide_in' && !slideInAutoScrollReady()) {
				return;
			}
			startAutoScroll();
			return;
		}
	if (name === 'stop') {
			if (status === 'slip' && slipTriggered) {
				freezeForLoseStopEvent();
				return;
			}
			if (penguinAnim === 'slide_in') {
				penguinAnim = 'slide_idle';
				return;
			}
			autoScrollActive = false;
			return;
		}
	if (name === 'vest_gain') {
		const reviveOnlyVestGainEvent =
			vestAnim !== 'gain' && (revivePauseActive || penguinAnim === 'slide_in_revive');
		if (reviveOnlyVestGainEvent) {
			return;
		}
		vestAnim = null;
		vestGainAnimStartedAtMs = 0;
		penguinSkin = 'vest';
		invincibleLoop = false;
		return;
	}
		if (name === 'vest_lose') {
			vestLoseEventSeen = true;
			tryBeginVestReviveTransition();
			return;
		}
	}

function triggerVestGain(stepIndex: number | null = null) {
	const normalizedStep = Number.isFinite(Number(stepIndex)) ? Math.floor(Number(stepIndex)) : null;
	const now = currentRoundClockMs();
	if (normalizedStep != null && normalizedStep === lastVestGainStep) return false;
	if (normalizedStep == null && now - lastVestAnimAtMs < 120) return false;
	cancelLiferingVisualClear();
	pendingVestLossStep = null;
	lastVestGainStep = normalizedStep;
		lastVestAnimAtMs = now;
		vestGainAnimStartedAtMs = now;
		vestAnim = 'gain';
		vestAnimKey += 1;
		vestReviveActive = false;
		invincibleLoop = false;
		return true;
	}

	function cancelReviveRecovery() {
		if (!reviveRecoveryTimer) return;
		clearTimeout(reviveRecoveryTimer);
		reviveRecoveryTimer = null;
	}

	function cancelReviveFlash() {
		if (!reviveFlashTimer) return;
		clearTimeout(reviveFlashTimer);
		reviveFlashTimer = null;
	}

	function clearReviveVestVisual() {
		reviveRingVisible = false;
		vestReviveActive = false;
		penguinSkin = 'base';
	}

	function beginPostReviveHold() {
		if (penguinAnim === 'slide_in_revive') {
			penguinAnim = status === 'goal' ? 'win' : status === 'slip' ? penguinAnim : 'slide_idle';
		}
		invincibleLoop = true;
	}

	function cancelVestLoseFallback() {
		if (!vestLoseFallbackTimer) return;
		clearTimeout(vestLoseFallbackTimer);
		vestLoseFallbackTimer = null;
	}

	function tryBeginVestReviveTransition() {
		if (!vestLoseEventSeen || !vestLossMotionComplete || !reviveStartGhostPassed) return;
		beginVestReviveTransition();
	}

function beginVestReviveTransition() {
	cancelVestLoseFallback();
	pendingVestLossStep = null;
	vestLoseEventSeen = false;
		vestLossMotionComplete = false;
		reviveStartGhostStepIndex = null;
		reviveStartGhostPassed = true;
		vestLossMotionActive = false;
		vestLossMotionToken += 1;
		reviveRingVisible = true;
		vestReviveActive = true;
		penguinSkin = 'vest';
		invincibleLoop = true;
		slipOriginX = null;
		slipSlide = 0;
		slipDropY = 0;
		penguinSkidRotation = 0;
		if (penguinAnim === 'lose_L_vest' || penguinAnim === 'lose_R_vest') {
			penguinAnim = 'slide_in_revive';
			scheduleReviveRecovery();
		}
	}

	function scheduleReviveRecovery() {
		cancelReviveRecovery();
		cancelReviveFlash();
		const currentRunId = runId;
		const reviveDurationMs = durationMsForSteps(currentReviveDurationSteps());
		const reviveRingDurationMs = Math.min(
			reviveDurationMs,
			durationMsForSteps(currentReviveRingDurationSteps())
		);
		reviveFlashTimer = setTimeout(() => {
			reviveFlashTimer = null;
			if (currentRunId !== runId) return;
			clearReviveVestVisual();
		}, reviveRingDurationMs);
		reviveRecoveryTimer = setTimeout(() => {
			reviveRecoveryTimer = null;
			if (currentRunId !== runId) return;
			cancelReviveFlash();
			clearReviveVestVisual();
			beginPostReviveHold();
			const respawnPendingHit = nextRespawnPendingHit();
			const respawnLane =
				respawnPendingHit != null ? targetLaneForToken(respawnPendingHit.t) : nextRespawnPickupLane();
			if (respawnLane != null) {
				setPenguinTargetLane(respawnLane);
				laneVelocity = 0;
				resetTargetingForRespawn(penguinLane, respawnPendingHit ?? undefined);
			}
			if (penguinAnim === 'slide_in_revive') {
				penguinAnim = status === 'goal' ? 'win' : status === 'slip' ? penguinAnim : 'slide_idle';
			}
			revivePauseActive = false;
			invincibleLoop = true;
			reviveBlinkStepsRemaining = 8;
		}, reviveDurationMs);
	}

	function triggerVestLossMotion() {
		const startPose = penguinPose();
		slipOriginX = null;
		const leftDistance = Math.abs(startPose.x);
		const rightDistance = Math.abs(viewport.w - startPose.x);
		const fallbackDir = Math.sign(penguinLane) || Math.sign(penguinTargetLane) || 1;
		const dir = rightDistance < leftDistance ? 1 : leftDistance < rightDistance ? -1 : fallbackDir >= 0 ? 1 : -1;
		const currentLane = clampPenguinLane(penguinLane);
		const outerEdgeLane = dir > 0 ? SLOT_TO_OFFSET[7] : SLOT_TO_OFFSET[0];
		const edgeAlignDistance = Math.abs(outerEdgeLane - currentLane);
		const activeRunId = runId;
		const activeToken = vestLossMotionToken + 1;
		vestLossMotionToken = activeToken;
		vestLossMotionActive = true;
		vestLossMotionComplete = false;
		const slipSpeedScale = currentVestLossSpeedScale();
		const startSlipPhase = () => {
			if (
				activeRunId !== runId ||
				activeToken !== vestLossMotionToken ||
				!(penguinAnim === 'lose_L_vest' || penguinAnim === 'lose_R_vest')
			) {
				return;
			}
			const slipStartPose = penguinPose();
			const outwardStartBias = viewport.w * 0.045;
			const originClampMargin = Math.max(18, slipStartPose.size * 0.2);
			slipOriginX = Math.max(
				originClampMargin,
				Math.min(
					viewport.w - originClampMargin,
					slipStartPose.x + dir * outwardStartBias
				)
			);
			slipSlide = 0;
			slipDropY = 0;
			const slipDepth = depthForPickupY(slipStartPose.y);
			const baselineLane = dir > 0 ? 1 : -1;
			const baselineX = lanePosition(slipDepth, baselineLane).x;
			const config = computeSlipAnimationConfig({
				viewportWidth: viewport.w,
				originX: slipStartPose.x,
				baselineX,
				direction: dir > 0 ? 1 : -1,
				durationMultiplier: SLIP_ANIMATION_DURATION_MULT / slipSpeedScale
			});
			const start = performance.now();
			const animateVestLoss = (now: number) => {
				if (
					activeRunId !== runId ||
					!vestLossMotionActive ||
					activeToken !== vestLossMotionToken ||
					!(penguinAnim === 'lose_L_vest' || penguinAnim === 'lose_R_vest')
				) {
					return;
				}
				const elapsed = now - start;
				const frame = computeSlipAnimationFrame({
					elapsed,
					preDuration: config.preDuration,
					mainDuration: config.mainDuration,
					preSlide: config.preSlide,
					maxSlide: config.maxSlide,
					direction: dir > 0 ? 1 : -1,
					viewportHeight: viewport.h
				});
				slipSlide = frame.slipSlide;
				slipDropY = frame.slipDropY;
				penguinSkidRotation = frame.penguinSkidRotation;
				if (elapsed < config.duration) {
					requestAnimationFrame(animateVestLoss);
				} else {
					vestLossMotionComplete = true;
					tryBeginVestReviveTransition();
				}
			};
			requestAnimationFrame(animateVestLoss);
		};
		if (edgeAlignDistance <= SLIP_EDGE_ALIGN_MIN_DELTA) {
			startSlipPhase();
			return;
		}
		const driftSpeedAbs = currentEdgeDriftLaneSpeedAbs(currentLane, clampPenguinLane(outerEdgeLane));
		const driftStartOffsetFrac = penguinOffsetFrac;
		const driftToLane = clampPenguinLane(outerEdgeLane);
		const totalDriftDistance = Math.abs(driftToLane - currentLane);
		let lastDriftNow = performance.now();
		const tickVestDrift = (now: number) => {
			if (
				activeRunId !== runId ||
				!vestLossMotionActive ||
					activeToken !== vestLossMotionToken ||
					!(penguinAnim === 'lose_L_vest' || penguinAnim === 'lose_R_vest')
				) {
					return;
				}
			const dtSec = Math.max(
				1 / 240,
				Math.min(PENGUIN_MOTION_STEP_DT_MAX, (now - lastDriftNow) / 1000)
			);
			lastDriftNow = now;
			const driftFromLane = clampPenguinLane(penguinLane);
			const remainingLane = driftToLane - driftFromLane;
			const direction = Math.sign(remainingLane) || dir;
			const laneStep = Math.min(Math.abs(remainingLane), driftSpeedAbs * dtSec);
			const nextLane = driftFromLane + direction * laneStep;
			const progress =
				totalDriftDistance > 0
					? Math.max(0, Math.min(1, 1 - Math.abs(driftToLane - nextLane) / totalDriftDistance))
					: 1;
			const nextOffsetFrac = driftStartOffsetFrac * (1 - progress);
			setPenguinLane(nextLane, 'vest_loss_edge_drift');
			setPenguinTargetLane(driftToLane);
			laneVelocity = direction * driftSpeedAbs;
			slipSlide = 0;
			slipDropY = -viewport.h * SLIP_EDGE_ALIGN_LIFT_FRAC * progress;
			penguinSkidRotation = -dir * (2 + 7 * progress);
			penguinOffsetFrac = nextOffsetFrac;
			if (Math.abs(driftToLane - nextLane) > 0.0005) {
				requestAnimationFrame(tickVestDrift);
				return;
			}
			setPenguinLane(driftToLane, 'vest_loss_edge_drift_end');
			setPenguinTargetLane(driftToLane);
			penguinOffsetFrac = 0;
			laneVelocity = 0;
			slipOriginX = null;
			penguinSkidRotation = -dir * 9;
			startSlipPhase();
		};
		requestAnimationFrame(tickVestDrift);
	}

	function currentVestLossAnim() {
		const laneForDirection = clampPenguinLane(
			Number.isFinite(Number(penguinTargetLane)) ? penguinTargetLane : penguinLane
		);
		return laneForDirection > 0 ? 'lose_R_vest' : 'lose_L_vest';
	}

function triggerVestLossSequence(stepIndex: number | null = null) {
	const normalizedStep = Number.isFinite(Number(stepIndex)) ? Math.floor(Number(stepIndex)) : null;
	const now = currentRoundClockMs();
	if (
		vestLossMotionActive ||
		vestReviveActive ||
		reviveRingVisible ||
		penguinAnim === 'lose_L_vest' ||
		penguinAnim === 'lose_R_vest' ||
		penguinAnim === 'slide_in_revive'
	) {
		return false;
	}
	if (normalizedStep != null && normalizedStep === lastVestLoseStep) return false;
	if (normalizedStep == null && now - lastVestAnimAtMs < 120) return false;
	pendingVestLossStep = null;
	lastVestLoseStep = normalizedStep;
		lastVestAnimAtMs = now;
		vestReviveActive = true;
		revivePauseActive = false;
		invincibleLoop = false;
		reviveBlinkStepsRemaining = 0;
		vestAnim = null;
		penguinSkin = 'vest';
		penguinAnim = currentVestLossAnim();
		cancelReviveRecovery();
		cancelVestLoseFallback();
		vestLoseEventSeen = false;
		vestLossMotionComplete = false;
		reviveStartGhostStepIndex = thirdRespawnGhostStepAfter(normalizedStep);
		reviveStartGhostPassed = hasGhostStepPassedPenguin(reviveStartGhostStepIndex);
		vestLoseFallbackTimer = setTimeout(() => {
			vestLoseEventSeen = true;
			tryBeginVestReviveTransition();
		}, scaleRoundMs(520));
		triggerVestLossMotion();
		return true;
	}

	function cancelLiferingVisualClear() {
		if (!liferingVisualClearTimer) return;
		clearTimeout(liferingVisualClearTimer);
		liferingVisualClearTimer = null;
	}

function clearLiferingState(stepIndex: number | null = null, animateLose = false, visualDelayMs = 0) {
	const normalizedStep = Number.isFinite(Number(stepIndex)) ? Math.floor(Number(stepIndex)) : null;
	const hadLifering = hasLifering || penguinSkin === 'vest';
	hasLifering = false;
	liferingPickedStep = null;
	liferingGainStep = null;
	liferingForcedOff = false;
	liferingOverrideStep = null;
	const vestLossAlreadyPending =
		animateLose &&
		((normalizedStep != null &&
			(normalizedStep === pendingVestLossStep || normalizedStep === lastVestLoseStep)) ||
			vestLossMotionActive ||
			vestReviveActive ||
			reviveRingVisible ||
			penguinAnim === 'lose_L_vest' ||
			penguinAnim === 'lose_R_vest' ||
			penguinAnim === 'slide_in_revive');
	if (vestLossAlreadyPending) {
		return;
	}
	cancelLiferingVisualClear();
	const finalizeVisualClear = () => {
		pendingVestLossStep = null;
		const playLoseAnim = animateLose && hadLifering;
			if (!playLoseAnim) {
				reviveRingVisible = false;
				vestReviveActive = false;
				invincibleLoop = false;
				penguinSkin = 'base';
				return;
			}
			if (triggerVestLossSequence(stepIndex)) {
				playOneShot('pickup_banana');
				const pose = penguinPose();
				hitPopup = {
					text: t('life_vest_lost'),
					until: currentRoundClockMs() + 1200,
					x: pose.x,
					y: pose.y - Math.max(24, viewport.h * 0.05)
				};
			}
	};
	if (visualDelayMs > 0 && hadLifering) {
		pendingVestLossStep = normalizedStep;
		liferingVisualClearTimer = setTimeout(() => {
			liferingVisualClearTimer = null;
			finalizeVisualClear();
			}, Math.max(0, visualDelayMs));
			return;
		}
		finalizeVisualClear();
	}

	function beginSlip(
		stepIndex: number,
		lane: number,
		offsetFrac: number,
		playFallSound = true,
		withPreDrift = false,
		source = 'unknown',
		context: Record<string, unknown> = {}
	) {
		if (slipTriggered && (driftActive || slipAnimationStarted)) {
			return;
		}
		void source;
		void context;
		if (!slipTriggered) {
			queueSlipLossPresentation();
		}
		const preSlipPose = penguinPose();
		status = 'slip';
		penguinAnim = 'slide_idle';
		cancelReviveRecovery();
		cancelReviveFlash();
		cancelVestLoseFallback();
		invincibleLoop = false;
		vestReviveActive = false;
		revivePauseActive = false;
		vestLoseEventSeen = false;
		vestLossMotionComplete = false;
		clearLiferingState(stepIndex, true);
		laneFreeze = true;
		rememberApproachLaneSpeed(laneVelocity);
		slipHandoffOriginX = preSlipPose.x;
		const currentPose = preSlipPose;
		const leftDistance = Math.abs(currentPose.x);
		const rightDistance = Math.abs(viewport.w - currentPose.x);
		const xBasedDirection = rightDistance < leftDistance ? 1 : leftDistance < rightDistance ? -1 : 0;
		const laneSign = Math.sign(lane) || Math.sign(penguinLane) || 1;
		const currentLane = clampPenguinLane(penguinLane);
		penguinOffsetFrac = Math.max(-0.04, Math.min(0.04, offsetFrac));
		slipDirection = xBasedDirection === 0 ? (laneSign >= 0 ? 1 : -1) : xBasedDirection;
		dynamicIceBlockedSide = slipDirection > 0 ? 'right' : 'left';
		dynamicIceBlockedUntilProgressSteps =
			currentRoundProgressSteps() + DYNAMIC_ICE_SLIP_BLOCK_STEPS;
		liferingPickedStep = null;
		slipTriggered = true;
		slipOriginX = null;
		slipStepIndex = stepIndex;
		slipSlide = 0;
		slipDropY = 0;
		driftActive = false;

		const outerEdgeLane = slipDirection > 0 ? SLOT_TO_OFFSET[7] : SLOT_TO_OFFSET[0];
		const edgeAlignDistance = Math.abs(outerEdgeLane - currentLane);
		const proxyImmediateSlip =
			source === 'force_previous_step_slip' ||
			source === 'pre_slip_before_pickup' ||
			context['tokenProxySlip'] === true;
		slipProxyImmediateActive = proxyImmediateSlip;
		const shouldAlignToEdge =
			withPreDrift && !proxyImmediateSlip && edgeAlignDistance > SLIP_EDGE_ALIGN_MIN_DELTA;
		const driftToLane = clampPenguinLane(outerEdgeLane);
		setPenguinTargetLane(shouldAlignToEdge ? driftToLane : penguinLane);

		const finalize = (skipPrePhase = false) => {
			driftActive = false;
			if (playFallSound) {
				playOneShot('penguin_fall');
			}
			triggerSlipAnimation(skipPrePhase);
		};

		if (!shouldAlignToEdge) {
			finalize(proxyImmediateSlip);
			return;
		}

		const driftStartOffsetFrac = penguinOffsetFrac;
		const driftSpeedAbs = currentEdgeDriftLaneSpeedAbs(currentLane, driftToLane);
		const totalDriftDistance = Math.abs(driftToLane - currentLane);
		const activeRunId = runId;
		driftActive = true;
		let lastDriftNow = performance.now();
		const tickDrift = (now: number) => {
			if (activeRunId !== runId || !slipTriggered || slipAnimationStarted) {
				driftActive = false;
				return;
			}
			const dtSec = Math.max(
				1 / 240,
				Math.min(PENGUIN_MOTION_STEP_DT_MAX, (now - lastDriftNow) / 1000)
			);
			lastDriftNow = now;
			const driftFromLane = clampPenguinLane(penguinLane);
			const remainingLane = driftToLane - driftFromLane;
			const direction = Math.sign(remainingLane) || slipDirection;
			const laneStep = Math.min(Math.abs(remainingLane), driftSpeedAbs * dtSec);
			const nextLane = driftFromLane + direction * laneStep;
			const progress =
				totalDriftDistance > 0
					? Math.max(0, Math.min(1, 1 - Math.abs(driftToLane - nextLane) / totalDriftDistance))
					: 1;
			setPenguinLane(nextLane, 'slip_edge_drift');
			setPenguinTargetLane(driftToLane);
			laneVelocity = direction * driftSpeedAbs;
			penguinOffsetFrac = driftStartOffsetFrac * (1 - progress);
			slipDropY = -viewport.h * SLIP_EDGE_ALIGN_LIFT_FRAC * progress;
			penguinSkidRotation = -slipDirection * (2 + 7 * progress);
			if (Math.abs(driftToLane - nextLane) > 0.0005) {
				requestAnimationFrame(tickDrift);
				return;
			}
			setPenguinLane(driftToLane, 'slip_edge_drift_end');
			setPenguinTargetLane(driftToLane);
			penguinOffsetFrac = 0;
			laneVelocity = 0;
			penguinSkidRotation = -slipDirection * 9;
			slipHandoffOriginX = penguinPose().x;
			finalize(true);
		};
		requestAnimationFrame(tickDrift);

	}

	function triggerSlipAnimation(skipPrePhase = false) {
		if (slipAnimationStarted) return;
		const slipStartPose = penguinPose();
		driftActive = false;
		const dirSign = Math.sign(penguinLane);
		const dir = dirSign === 0 ? slipDirection : (dirSign > 0 ? 1 : -1);
		const handoffOriginX = slipHandoffOriginX;
		const preservedOriginX = handoffOriginX;
		let originX = preservedOriginX ?? slipStartPose.x;
		if (slipProxyImmediateActive && preservedOriginX == null) {
			const slipDepth = depthForPickupY(slipStartPose.y);
			const centerPickupPos = pickupLanePosition(slipDepth, 0);
			const centerSideX =
				centerPickupPos.x +
				dir * Math.max(centerPickupPos.width * 0.52, viewport.w * 0.045);
			const biasedCurrentX = originX + dir * Math.min(viewport.w * 0.038, 48);
			originX =
				dir > 0
					? Math.max(biasedCurrentX, centerSideX)
					: Math.min(biasedCurrentX, centerSideX);
			originX = Math.max(0, Math.min(viewport.w, originX));
		}
		slipOriginX = originX;
		slipHandoffOriginX = null;
		slipProxyImmediateActive = false;
		slipAnimationStarted = true;
		slipAnimationToken += 1;
		const activeSlipToken = slipAnimationToken;
		const activeRunId = runId;
		const start = performance.now();
		const slipSpeedScale = currentSlipSpeedScale();
		const slipDepth = depthForPickupY(slipStartPose.y);
		const baselineLane = dir > 0 ? 1 : -1;
		const baselineX = lanePosition(slipDepth, baselineLane).x;
		const outerEdgeLane = dir > 0 ? SLOT_TO_OFFSET[7] : SLOT_TO_OFFSET[0];
		const innerLaneGap = Math.max(0, Math.abs(outerEdgeLane - clampPenguinLane(penguinLane)));
		const edgeLaneSpan = Math.max(0.001, Math.abs(outerEdgeLane));
		const innerLaneBoost =
			innerLaneGap > 0.001
				? viewport.w * Math.min(0.085, (innerLaneGap / edgeLaneSpan) * 0.065)
				: 0;
		const baseAnimationConfig = computeSlipAnimationConfig({
			viewportWidth: viewport.w,
			originX,
			baselineX,
			direction: dir > 0 ? 1 : -1,
			durationMultiplier: SLIP_ANIMATION_DURATION_MULT / slipSpeedScale,
			extraSideBoost: innerLaneBoost
		});
		const animationConfig = skipPrePhase
			? {
					...baseAnimationConfig,
					preDuration: 0,
					preSlide: 0,
					duration: baseAnimationConfig.mainDuration
				}
			: baseAnimationConfig;
		const startSlide = slipSlide;
		const startDropY = slipDropY;
		penguinAnim = skipPrePhase ? (dir > 0 ? 'lose_R' : 'lose_L') : 'slide_idle';
		const animateSlip = (now: number) => {
			if (
				activeSlipToken !== slipAnimationToken ||
				activeRunId !== runId ||
				!slipAnimationStarted ||
				!slipTriggered
			) {
				return;
			}
			const t = Math.min(1, Math.max(0, (now - start) / animationConfig.duration));
			const elapsed = now - start;
			const frame = computeSlipAnimationFrame({
				elapsed,
				preDuration: animationConfig.preDuration,
				mainDuration: animationConfig.mainDuration,
				preSlide: animationConfig.preSlide,
				maxSlide: animationConfig.maxSlide,
				direction: dir > 0 ? 1 : -1,
				viewportHeight: viewport.h
			});
				if (frame.phase === 'main' && penguinAnim === 'slide_idle') {
					penguinAnim = dir > 0 ? 'lose_R' : 'lose_L';
				}
				slipSlide = startSlide + frame.slipSlide;
				slipDropY = startDropY + frame.slipDropY;
				penguinSkidRotation = frame.penguinSkidRotation;
				if (t < 1) requestAnimationFrame(animateSlip);
				else {
					flushSlipLossPresentation();
					penguinSkidRotation = 0;
					freezeForLoseStopEvent();
				}
			};
		requestAnimationFrame(animateSlip);
	}

	

function pickupTriggerAt(stepIndex: number, type = '', spawnDelay = 0) {
	const isMobileLandscape =
		renderSize.w > renderSize.h &&
		window.innerHeight <= 500 &&
		window.matchMedia('(pointer: coarse)').matches;
	const isPortrait = renderSize.h > renderSize.w;
	return pickupTriggerAtHelper({
		stepIndex,
		type,
		spawnDelay,
		lookaheadSteps,
		stepSpacing,
		penguinDepth: penguinDepth(),
		renderSize,
		isMobileLandscape,
		isPortrait
	});
}

function shouldUsePreStepFreeRoam(pendingHit: { trigger: number; t?: { stepIndex?: number } } | undefined) {
	const state: PreStepRoamState = {
		preStepRoamTargetLane,
		preStepFreeRoamActive,
		preStepSweepStartRenderStep,
		preStepSweepStartSide,
		preStepSweepCompleted,
		preStepHandoffActive,
		preStepHandoffStartRenderStep,
		preStepHandoffFromLane
	};
		const next = shouldUsePreStepFreeRoamHelper({
			state,
			pickupCount,
			lockedTargetTokenId,
			pendingHit,
			renderStep,
			stepSpacing,
			openingFreeRoamSteps: PRE_STEP_OPENING_FREE_ROAM_STEPS,
			preStepLockLeadSteps: 0.08,
			preStepFirstLockLeadSteps: PRE_STEP_FIRST_LOCK_LEAD_STEPS,
			penguinLane,
			clampPenguinLane
		});
	preStepRoamTargetLane = next.state.preStepRoamTargetLane;
	preStepFreeRoamActive = next.state.preStepFreeRoamActive;
	preStepSweepStartRenderStep = next.state.preStepSweepStartRenderStep;
	preStepSweepStartSide = next.state.preStepSweepStartSide;
	preStepSweepCompleted = next.state.preStepSweepCompleted;
	preStepHandoffActive = next.state.preStepHandoffActive;
	preStepHandoffStartRenderStep = next.state.preStepHandoffStartRenderStep;
	preStepHandoffFromLane = next.state.preStepHandoffFromLane;
	return next.useFreeRoam;
	}

	function preStepSweepLane(nowMs: number) {
		void nowMs;
		return preStepSweepLaneHelper({
			renderStep,
			stepSpacing,
			laneExtents,
			clampPenguinLane,
			preStepSweepInset: PRE_STEP_SWEEP_INSET,
			preStepSweepPeriodSteps: PRE_STEP_SWEEP_PERIOD_STEPS
		});
	}

	function preStepFreeRoamTargetLane(
		nowMs: number,
		pendingHit: { trigger: number; t?: { stepIndex?: number } } | undefined,
		stepPerMs?: number
	) {
		const state: PreStepRoamState = {
			preStepRoamTargetLane,
			preStepFreeRoamActive,
			preStepSweepStartRenderStep,
			preStepSweepStartSide,
			preStepSweepCompleted,
			preStepHandoffActive,
			preStepHandoffStartRenderStep,
			preStepHandoffFromLane
		};
		const next = preStepFreeRoamTargetLaneHelper({
			state,
			nowMs,
			pendingHit,
			stepPerMs,
			disablePenguinSlideMotion: DISABLE_PENGUIN_SLIDE_MOTION,
			laneExtents,
			clampPenguinLane,
			renderStep,
			stepSpacing,
			openingFreeRoamSteps: PRE_STEP_OPENING_FREE_ROAM_STEPS,
			preStepSweepInset: PRE_STEP_SWEEP_INSET,
			preStepSingleSweepBaseSteps: PRE_STEP_SINGLE_SWEEP_BASE_STEPS,
			preStepSingleSweepMinSteps: PRE_STEP_SINGLE_SWEEP_MIN_STEPS,
			preStepFirstLockLeadSteps: PRE_STEP_FIRST_LOCK_LEAD_STEPS,
			preStepSweepPeriodSteps: PRE_STEP_SWEEP_PERIOD_STEPS
		});
		preStepRoamTargetLane = next.state.preStepRoamTargetLane;
		preStepFreeRoamActive = next.state.preStepFreeRoamActive;
		preStepSweepStartRenderStep = next.state.preStepSweepStartRenderStep;
		preStepSweepStartSide = next.state.preStepSweepStartSide;
		preStepSweepCompleted = next.state.preStepSweepCompleted;
		preStepHandoffActive = next.state.preStepHandoffActive;
		preStepHandoffStartRenderStep = next.state.preStepHandoffStartRenderStep;
		preStepHandoffFromLane = next.state.preStepHandoffFromLane;
		return next.lane;
	}

	function addCosmeticTail(startStep: number) {
		if (tokens.some((t) => t.extra?.cosmetic)) return;
		const tailCount = 5;
		const types = ['coin', 'star', 'banana'];
		const baseStake = Math.max(1, Math.round(stakeAmount()));
		for (let i = 1; i <= tailCount; i += 1) {
			const type = types[(startStep + i) % types.length];
			const lane = [-1, 1][(startStep + i) % 2];
			const extra =
				type === 'star'
					? { cosmetic: true, multiplier: 2 }
					: type === 'coin'
						? { cosmetic: true, coinValue: baseStake * (1 + ((startStep + i) % 5)) }
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
	return wobbleLaneGateForState({
		penguinLane,
		penguinLaneRange: PENGUIN_LANE_RANGE,
		wobbleRisk
	});
}

function nearestPickupSlotIndex(lane: number) {
	return nearestPickupSlotIndexForLane({ lane, slotToOffset: SLOT_TO_OFFSET });
}

		function wobbleSignal() {
			return computeWobbleSignal({
				penguinLane,
				penguinLaneRange: PENGUIN_LANE_RANGE,
				wobbleRisk,
				wobbleBoost,
				wobbleTime,
				slipTriggered,
				status,
				wobbleIntensity: WOBBLE_INTENSITY,
				slotToOffset: SLOT_TO_OFFSET
			});
		}

function ctrlRotation() {
	if (revivePauseActive || penguinAnim === 'slide_in_revive') {
		return 0;
	}
	return computeCtrlRotationValue({
		status,
		penguinAnim,
		penguinLane,
		penguinLaneRange: PENGUIN_LANE_RANGE,
		ctrlTurnTilt,
		wobbleSignal: wobbleSignal(),
		penguinSkidRotation,
		slipAnimationStarted,
		slipSlide,
		viewportWidth: viewport.w,
		slipDirection
	});
}

function pickupLanePosition(depth: number, offset: number) {
	return pickupLanePositionForStage({
		path: pathMetrics(),
		viewport,
		depth,
		offset,
		depthExponent: PICKUP_Y_SPACING_EXPONENT,
		centerPullBase: 0.68,
		centerPullSideBoost: 0.18
	});
}

function lanePosition(depth: number, offset: number) {
	return lanePositionForStage(pathMetrics(), depth, offset);
	}

function itemSpawnOffset() {
		return viewport.h * (renderSize.h > renderSize.w ? 0.33 : 0.25);
	}

	function laneSpread(depth: number) {
		return laneSpreadForDepth(depth);
	}

	function laneExtents() {
		return laneExtentsForTokens({
			tokens,
			penguinLaneRange: PENGUIN_LANE_RANGE,
			penguinLaneSidePad: PENGUIN_LANE_SIDE_PAD,
			clampPenguinLane
		});
	}

function clampLaneXs(depth: number) {
	return clampLaneXsHelper({ depth, laneExtents, lanePosition });
	}

function depthForPickupY(targetY: number) {
	return depthForYHelper({
		targetY,
		sampleYForDepth: (depth) => lanePosition(depth, 0).y + itemSpawnOffset()
	});
}

function depthForPickupPathY(targetY: number) {
	return depthForYHelper({
		targetY,
		sampleYForDepth: (depth) => pickupLanePosition(depth, 0).y + itemSpawnOffset()
	});
}

let pickupLineCrossings = $state<PickupLineCrossing[]>([]);

function targetLineIndexForOffset(offset: number) {
	return targetLineIndexForOffsetHelper({ offset, pickupLineCrossings });
}

function crossingXForLaneOffset(offset: number) {
	return crossingXForLaneOffsetHelper({ offset, pickupLineCrossings, clampPenguinLane });
}

function rebuildPickupLineCrossings() {
	pickupLineCrossings = buildPickupLineCrossingsHelper({
		viewport,
		slotToOffset: SLOT_TO_OFFSET,
		penguinPose,
		depthForPickupPathY,
		lanePosition,
		laneSpread,
		pickupLanePosition,
		itemSpawnOffset,
		clampPenguinLane
	});
}

function pickupPosition(stepIndex: number, lane: number, spawnLane?: number, type?: string) {
	return pickupPositionHelper({
		stepIndex,
		lane,
		spawnLane,
		type,
		tokenRender,
		pickupLanePosition,
		itemSpawnOffset
	});
}

function pickupBandState(token: Token, penguin = penguinPose()) {
	return pickupBandStateHelper({
		token,
		penguin,
		pickupPosition,
		tokenRender
	});
}

function isNearEdgeForSlip(
	band:
		| {
				pos?: { x: number; y: number } | null;
				depth: number;
				yDelta: number;
				passedBand: boolean;
				approachingBand: boolean;
		  }
		| null,
	penguin: { x: number; y: number; size: number }
) {
	return isNearEdgeForSlipHelper({ band, penguin, clampLaneXs });
}

function shouldGoalCollectNow(
	token: Token,
	band: ReturnType<typeof pickupBandState>,
	penguin: { x: number; y: number; size: number }
) {
	return shouldGoalCollectNowHelper({
		token,
		band,
		penguin,
		penguinLane,
		targetLaneForToken,
		clampPenguinLane
	});
}

function shouldPreSlipBeforePickup(
	token: Token,
	band: ReturnType<typeof pickupBandState>,
	penguin: { x: number; y: number; size: number }
) {
	return shouldPreSlipBeforePickupHelper({
		token,
		band,
		penguin,
		isNothingTokenType,
		isNearEdgeForSlip,
		slipTriggerRenderStepForToken,
		tokens,
		stepSpacing,
		renderStep
	});
}

function isDoubleNothingStep(stepIndex: number) {
	return isDoubleNothingStepHelper({ stepIndex, tokens, isNothingTokenType });
}

function shouldSkipPositioningForHitToken(token: TargetingToken | undefined) {
	return shouldSkipPositioningForHitTokenHelper({
		token,
		isNothingTokenType,
		isDoubleNothingStep
	});
}

function shouldAutoCollectNothing(
	token: Token,
	band: ReturnType<typeof pickupBandState>,
	penguin: { y: number; size: number }
) {
	return shouldAutoCollectNothingHelper({ token, band, penguin, isNothingTokenType });
}

function isLaneAlignedForPickup(
	token: Token,
	band: ReturnType<typeof pickupBandState>,
	penguin: { x: number; y: number; size: number }
) {
	return isLaneAlignedForPickupHelper({
		token,
		band,
		penguin,
		penguinLane,
		targetLaneForToken,
		clampPenguinLane,
		isNothingTokenType
	});
}

function isLaneCloserToNearestEdge(candidateLane: number, currentLane: number) {
	return isLaneCloserToNearestEdgeHelper({ candidateLane, currentLane, laneExtents });
}

	function coinAssetKey(token: any) {
		return coinAssetKeyForToken(token, stakeAmount());
	}

function tokenSpineSize(depth: number) {
	return tokenSpineSizeForDepth(
		depth,
		viewport,
		renderSize,
		PICKUP_SCALE_BOOST,
		window.innerWidth < 600
	);
}

function accumulatedAmountY() {
	return accumulatedAmountYForViewport(viewport, renderSize, rootScale, rootOffset);
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
		return pathMetricsForStage(viewport, slideMetrics());
	}

	function slideMetrics() {
		return slideMetricsForStage(viewport, renderSize, window.innerWidth);
	}

	$effect(() => {
		if (!hitPopup) return;
		const now = currentRoundClockMs();
		if (now >= hitPopup.until) hitPopup = null;
	});

	$effect(() => {
		if (!vestAnim) return;
		if (currentRoundClockMs() - vestGainAnimStartedAtMs < 1800) return;
		vestAnim = null;
	});

	$effect(() => {
		if (reviveStartGhostStepIndex == null || reviveStartGhostPassed) return;
		if (!hasGhostStepPassedPenguin(reviveStartGhostStepIndex)) return;
		reviveStartGhostPassed = true;
		tryBeginVestReviveTransition();
	});

	$effect(() => {
		if (!bananaLossFloat) return;
		if (floatTime - bananaLossFloat.start >= 1.4) {
			bananaLossFloat = null;
		}
	});

	$effect(() => {
		if (vestAnim) return;
		penguinSkin = hasLifering || vestReviveActive ? 'vest' : 'base';
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.lang = currentLanguage;
		document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
	});

	function stepStateAt(stepIndex: number) {
		if (!stepStates.length) return null;
		if (stepIndex < stepStateCursorStep) {
			stepStateCursor = 0;
		}
		while (
			stepStateCursor + 1 < stepStates.length &&
			stepStates[stepStateCursor + 1].step <= stepIndex
		) {
			stepStateCursor += 1;
		}
		while (stepStateCursor > 0 && stepStates[stepStateCursor].step > stepIndex) {
			stepStateCursor -= 1;
		}
		stepStateCursorStep = stepIndex;
		const latest = stepStates[stepStateCursor];
		return latest && latest.step <= stepIndex ? latest : null;
	}

	function updateWobbleRiskForStep(stepIndex: number) {
		const latest = stepStateAt(stepIndex);
		wobbleRisk = latest
			? Math.max(0, Math.min(1.6, Number(latest.bananaCount ?? 0) / 3.2))
			: 0;
	}

	function valueAtStep(stepIndex: number) {
		if (stepIndex < 0) return runStartValue;
		const latest = stepStateAt(stepIndex);
		return latest ? latest.value : runStartValue;
	}

	onMount(() => {
		soundEnabled = true;
		void ensureGigalypseFont();
		updateAudioMix();
		let ro: ResizeObserver | null = null;
		let rafId: number | null = null;
		let floatId: number | null = null;
		let floatIdleTimer: number | null = null;
		let layoutSyncRaf: number | null = null;
		let recoveryTimers: number[] = [];
		let cancelled = false;
		let timeId: number | null = null;
		const unlockAudioOnInteraction = () => {
			void ensureBackgroundMusic();
		};
		const preventContextMenu = (event: Event) => event.preventDefault();
		const preventSelection = (event: Event) => event.preventDefault();
		const preventZoomGesture = (event: Event) => event.preventDefault();
		const preventPinchTouchMove = (event: TouchEvent) => {
			if (event.touches.length > 1) event.preventDefault();
		};
		const onPageShow = () => {
			scheduleRecoverySyncs('pageshow');
			if (!bootLoading && !entrySplashVisible && audioUnlocked && !musicMuted && hudVolume > 0) {
				startBackgroundMusic();
				if (animationStatus === 'running') startSlideLoop();
			}
		};
		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				pauseAllAudio();
				return;
			}
			scheduleRecoverySyncs('visibilitychange');
			if (!bootLoading && !entrySplashVisible && audioUnlocked && !musicMuted && hudVolume > 0) {
				startBackgroundMusic();
				if (animationStatus === 'running') startSlideLoop();
			}
		};
		const onPageHide = () => pauseAllAudio();
		const onVisualViewportResize = () => scheduleRecoverySyncs('visualViewport:resize');
		const onVisualViewportScroll = () => scheduleRecoverySyncs('visualViewport:scroll');

		const syncRendererSize = () => {
			if (!gameBodyEl) return;
			const app = context.stateApp.pixiApplication;
			if (!app || !app.renderer) return;
			const measuredWidth = Math.round(gameBodyEl.clientWidth);
			const measuredHeight = Math.round(gameBodyEl.clientHeight);
			const w = Math.max(1, measuredWidth || Math.round(gameBox.w));
			const h = Math.max(1, measuredHeight || Math.round(gameBox.h));
			const gameRect = gameBodyEl.getBoundingClientRect();
			document.documentElement.style.setProperty('--game-body-w', `${Math.round(gameRect.width)}px`);
			document.documentElement.style.setProperty('--game-body-h', `${Math.round(gameRect.height)}px`);
			document.documentElement.style.setProperty('--game-body-left', `${Math.round(gameRect.left)}px`);
			document.documentElement.style.setProperty('--game-body-top', `${Math.round(gameRect.top)}px`);
			document.documentElement.style.setProperty(
				'--game-body-right-inset',
				`${Math.max(0, Math.round(window.innerWidth - gameRect.right))}px`
			);
			document.documentElement.style.setProperty(
				'--game-body-bottom-inset',
				`${Math.max(0, Math.round(window.innerHeight - gameRect.bottom))}px`
			);
			const nativeDpr = Math.max(1, window.devicePixelRatio || 1);
			const dpr = lowPowerMobile
				? Math.min(nativeDpr, LOW_POWER_MOBILE_MAX_DPR)
				: nativeDpr;
			try {
				app.renderer.resolution = dpr;
			} catch {}
			app.renderer.resize(w, h);
			app.canvas.style.display = 'block';
			app.canvas.style.width = `${w}px`;
			app.canvas.style.height = `${h}px`;
			try {
				app.stage.sortableChildren = true;
			} catch {}
			renderSize.w = w;
			renderSize.h = h;
			const coverScale = Math.max(renderSize.w / baseViewport.w, renderSize.h / baseViewport.h);
			const containScale = Math.min(renderSize.w / baseViewport.w, renderSize.h / baseViewport.h);
			const isPortrait = renderSize.h > renderSize.w;
			const isMobileLandscape =
				(!isPortrait &&
					(isMobileLandscapeUi ||
						(renderSize.h <= 900 &&
							window.matchMedia('(hover: none) and (pointer: coarse)').matches)));
			const portraitScaleFactor = isPortrait ? 0.56 : 1;
			if (isMobileLandscape) {
				rootScale = Math.max(containScale * 1.007, coverScale * 0.997);
				rootOffset.x = (renderSize.w - baseViewport.w * rootScale) * 0.5;
				rootOffset.y = (renderSize.h - baseViewport.h * rootScale) * 0.5 + renderSize.h * 0.01;
			} else {
				rootScale = coverScale * portraitScaleFactor;
				rootOffset.x = (renderSize.w - baseViewport.w * rootScale) * 0.5;
				rootOffset.y = isPortrait
					? renderSize.h * SKY_TARGET_RATIO
					: (renderSize.h - baseViewport.h * rootScale) * 0.5;
			}
			viewport.w = baseViewport.w;
			viewport.h = baseViewport.h;
			rebuildFixedFloes();
			rebuildPickupLineCrossings();
			logCanvasLayout('syncRendererSize');
		};

		const scheduleLayoutSync = () => {
			if (layoutSyncRaf != null) cancelAnimationFrame(layoutSyncRaf);
			layoutSyncRaf = requestAnimationFrame(() => {
				layoutSyncRaf = null;
				syncRendererSize();
			});
		};

		const scheduleRecoverySyncs = (reason: string) => {
			recoveryTimers.forEach((id) => clearTimeout(id));
			recoveryTimers = [];
			requestAnimationFrame(() => {
				logCanvasLayout(`${reason}:raf-1`);
				updateViewport();
				scheduleLayoutSync();
				requestAnimationFrame(() => {
					logCanvasLayout(`${reason}:raf-2`);
					updateViewport();
					scheduleLayoutSync();
				});
			});
			for (const delay of [120, 320, 700]) {
				recoveryTimers.push(
					window.setTimeout(() => {
						logCanvasLayout(`${reason}:timeout-${delay}`);
						updateViewport();
						scheduleLayoutSync();
					}, delay)
				);
			}
		};

		const refreshStageLayout = () => {
			updateViewport();
			scheduleLayoutSync();
		};

		const waitForApp = () =>
			new Promise<void>((resolve) => {
				const tick = () => {
					if (context.stateApp.pixiApplication) return resolve();
					rafId = requestAnimationFrame(tick);
				};
				tick();
			});

		refreshStageLayout();
		scheduleRecoverySyncs('mount');
		window.addEventListener('resize', refreshStageLayout);
		window.addEventListener('orientationchange', refreshStageLayout);
		window.addEventListener('pageshow', onPageShow);
		window.addEventListener('pagehide', onPageHide);
		document.addEventListener('visibilitychange', onVisibilityChange);
		window.addEventListener('pointerdown', unlockAudioOnInteraction);
		window.addEventListener('keydown', unlockAudioOnInteraction);
		window.addEventListener('touchstart', unlockAudioOnInteraction);
		document.addEventListener('contextmenu', preventContextMenu);
		document.addEventListener('selectstart', preventSelection);
		document.addEventListener('gesturestart', preventZoomGesture, { passive: false });
		document.addEventListener('gesturechange', preventZoomGesture, { passive: false });
		document.addEventListener('gestureend', preventZoomGesture, { passive: false });
		document.addEventListener('touchmove', preventPinchTouchMove, { passive: false });
		window.visualViewport?.addEventListener('resize', onVisualViewportResize);
		window.visualViewport?.addEventListener('scroll', onVisualViewportScroll);
		if (gameBodyEl) {
			ro = new ResizeObserver(() => scheduleLayoutSync());
			ro.observe(gameBodyEl);
		}
		hasLifering = false;

		(async () => {
			currentLanguage = normalizeLanguage(getLanguageParam());
			updateSocialEnUsMode();
			replayMode = isReplayModeSearch(window.location.search);
			currentCurrency = normalizeCurrency(getParam('currency'));
			await loadI18nCatalog();
			if (replayMode) {
				await loadReplayRound();
			} else if (getRgsBaseUrl() && getParam('sessionID')) {
				await authenticate();
			}

			await waitForApp();
			if (cancelled) return;
			scheduleLayoutSync();
			requestAnimationFrame(scheduleLayoutSync);
			setTimeout(scheduleLayoutSync, 50);
			scheduleRecoverySyncs('app-ready');
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
		let lastFloatNow = performance.now();
		const shouldRunFullSpeedFloatLoop = () =>
			document.visibilityState === 'visible' &&
			!bootLoading &&
			!entrySplashVisible &&
			currentRoundPresentationActive();
		const scheduleNextFloatTick = (idleDelayMs = 0) => {
			if (cancelled) return;
			if (idleDelayMs > 0) {
				if (floatIdleTimer) clearTimeout(floatIdleTimer);
				floatIdleTimer = window.setTimeout(() => {
					floatIdleTimer = null;
					floatId = requestAnimationFrame(floatTick);
				}, idleDelayMs);
				return;
			}
			floatId = requestAnimationFrame(floatTick);
		};
		const floatTick = (now: number) => {
			const active = shouldRunFullSpeedFloatLoop();
			const dtSec = Math.max(0, Math.min(0.05, (now - lastFloatNow) / 1000));
			lastFloatNow = now;
			if (active) {
				floatTime += dtSec * currentRoundAnimationTimeScale();
				if (!lowPowerMobile) {
					sceneFloatTime += dtSec * currentSceneAnimationTimeScale();
				}
			}
			scheduleNextFloatTick(active ? 0 : lowPowerMobile ? 240 : 120);
		};
		scheduleNextFloatTick();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code !== 'Space') return;
			if ((event.target as HTMLElement | null)?.tagName === 'INPUT') return;
			if (event.repeat) return;
			event.preventDefault();
			if (replayMode) {
				startReplayRound();
				return;
			}
			if (autoplay) return;
			if (pendingRound || (animationStatus === 'running' && !autoplay)) return;
			handleBetClick();
		};
		window.addEventListener('keydown', onKeyDown);

		return () => {
			cancelled = true;
			if (rafId) cancelAnimationFrame(rafId);
			if (floatId) cancelAnimationFrame(floatId);
			if (floatIdleTimer) clearTimeout(floatIdleTimer);
			if (layoutSyncRaf) cancelAnimationFrame(layoutSyncRaf);
			if (timeId) clearInterval(timeId);
			recoveryTimers.forEach((id) => clearTimeout(id));
			if (ro) ro.disconnect();
			driftActive = false;
			window.removeEventListener('resize', refreshStageLayout);
			window.removeEventListener('orientationchange', refreshStageLayout);
			window.removeEventListener('pageshow', onPageShow);
			window.removeEventListener('pagehide', onPageHide);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			window.removeEventListener('pointerdown', unlockAudioOnInteraction);
			window.removeEventListener('keydown', unlockAudioOnInteraction);
			window.removeEventListener('touchstart', unlockAudioOnInteraction);
			document.removeEventListener('contextmenu', preventContextMenu);
			document.removeEventListener('selectstart', preventSelection);
			document.removeEventListener('gesturestart', preventZoomGesture);
			document.removeEventListener('gesturechange', preventZoomGesture);
			document.removeEventListener('gestureend', preventZoomGesture);
			document.removeEventListener('touchmove', preventPinchTouchMove);
			window.visualViewport?.removeEventListener('resize', onVisualViewportResize);
			window.visualViewport?.removeEventListener('scroll', onVisualViewportScroll);
			window.removeEventListener('keydown', onKeyDown);
			pauseAllAudio();
			audioEngine.dispose();
			soundEnabled = false;
		};
		});
	onDestroy(() => {
		stopAutoplay();
		for (const timer of removalTimers.values()) clearTimeout(timer);
		removalTimers.clear();
		cancelLiferingVisualClear();
	});

	$effect(() => {
		if (replayMode) {
			stopAutoplay();
			return;
		}
		if (autoplay) startAutoplay();
		else stopAutoplay();
	});
	$effect(() => {
		bootLoading;
		entrySplashVisible;
		hudVolume;
		musicMuted;
		updateAudioMix();
		if (bootLoading || entrySplashVisible) {
			stopLoop('music_loop');
		}
		else if (audioUnlocked && !musicMuted && hudVolume > 0) startBackgroundMusic();
	});
	$effect(() => {
		if (!bootLoading && entrySplashVisible && status === 'idle' && !pendingRound) {
			penguinAnim = 'idle';
			penguinSkin = 'base';
		}
	});


	
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
	<BootLoader visible={bootLoading} src={stakeLoaderSrc} alt="Loading game" />
	<EntrySplash
		visible={!bootLoading && entrySplashVisible}
		overlayOnly
		backgroundSrc={splashBackgroundSrc}
		logoSrc={splashLogoSrc}
		partnerLogoSrc={splashPartnerLogoSrc}
		centerLandscapeSrc={splashCenterLandscapeSrc}
		centerPortraitSrc={splashCenterPortraitSrc}
		alt="Enter Penguin Slide"
		onEnter={enterGameFromSplash}
	/>
	<div
		class="game-body"
		bind:this={gameBodyEl}
		style={`width: ${gameBox.w}px; height: ${gameBox.h}px; transform: translate(${stageOffset.x}px, ${stageOffset.y}px) scale(${stageScale}); transform-origin: top left;${
			!bootLoading && entrySplashVisible
				? ` background-image: url('${splashBackgroundSrc}'); background-size: cover; background-position: center; background-repeat: no-repeat;`
				: ''
		}`}
	>
		<div class="stage">
			<GameStageScene
				{rootOffset}
				{rootScale}
				{viewport}
				{renderSize}
				{context}
				{readAssetDimension}
				{pathMetrics}
				{slideMetrics}
				{animationStatus}
				{status}
				iceSpawnYDownFrac={ICE_SPAWN_Y_DOWN_FRAC}
				{iceScroll}
				{stepSpacing}
				{lanePosition}
				{floatTime}
				{sceneFloatTime}
				{icePieces}
				{lowPowerMobile}
				isMobileLandscape={isMobileLandscapeUi}
				{spineProps}
				{renderStep}
				{penguinTargetLane}
				{lockedTargetTokenId}
				{tokens}
				{pickupLineCrossings}
				slotToOffset={SLOT_TO_OFFSET}
				{stepDebugGuides}
				{penguinPose}
				{targetLineIndexForOffset}
				{clampPenguinLane}
				{pickupLanePosition}
				{depthForPickupPathY}
				{isTargetableHitToken}
				splashVisible={!bootLoading && entrySplashVisible}
				{pickupPosition}
				{pickupBandState}
				{pickupTriggerAt}
				{targetLaneForToken}
				{itemSpawnOffset}
				{tokenRender}
				{tokenSpineSize}
				{coinAssetKey}
				{ctrlRotation}
				{penguinAnim}
				{penguinSkin}
				{hasLifering}
				{reviveRingVisible}
				{vestAnim}
				{vestAnimKey}
				penguinActorKey={runId}
				{invincibleLoop}
				roundAnimationTimeScale={entrySplashVisible ? 0 : currentPenguinAnimationTimeScale()}
				reviveAnimationSpeedMult={currentRespawnAnimationSpeedScale()}
				slipAnimationSpeedMult={SLIP_ANIMATION_SPEED_MULT * currentSlipSpeedScale()}
				{handlePenguinEvent}
				{slideTimeScale}
				sceneAnimationTimeScale={entrySplashVisible ? 0 : currentSceneAnimationTimeScale()}
				{roundWinDisplay}
				{amountWinPulse}
				{accumulatedStrokeWidth}
				{accumulatedAmountY}
				fontReady={gigalypseFontReady}
				{bananaLossFloat}
				{formatCurrencyAmount}
			/>

		{#if replayMode}
			<ReplayHud
				{t}
				{formatCurrencyAmount}
				mobileUi={isMobileLandscapeUi || isMobilePortraitUi}
				{timeLabel}
				{selectedMode}
				{replayEventId}
				{replayReady}
				replayRunning={animationStatus === 'running'}
				{replayHasPlayed}
				replayError={errorMessage}
				replayBetAmount={stakeAmount()}
				replayCostAmount={currentReplayCostAmount()}
				replayPayoutAmount={currentReplayPayoutAmount()}
				replayWinAmount={currentReplayWinAmount()}
				onReplayStart={startReplayRound}
				onReplayRetry={loadReplayRound}
			/>
		{:else if !entrySplashVisible}
			<GameHud
				{t}
				{formatCurrencyAmount}
				{timeLabel}
				{balance}
				{menuOpen}
				{volatilityHelpOpen}
				{selectedMode}
				{animationStatus}
				{status}
				{maxWinLabel}
				{hudVolume}
				{musicMuted}
				{speedFactor}
				{menuInfoOpen}
				{autoplay}
				{autoplayOpen}
				{autoplayRemaining}
				{autoplayOptions}
				{autoplayDraftCount}
				{isMobileLandscapeUi}
				{isMobilePortraitUi}
				{pendingRound}
				{betIndex}
				{betLevels}
				{betAmount}
				{currentLanguage}
				{currentCurrency}
				totalCostMultiplier={TOTAL_COST_MULTIPLIER}
				{toggleMenuOpen}
				{toggleVolatilityHelp}
				{setMode}
				{setHudVolume}
				{toggleHudMute}
				{setSpeed}
				{setMenuInfoOpen}
				{decreaseBet}
				{handleBetClick}
				{increaseBet}
				{toggleAutoplayOpen}
				{setAutoplayDraft}
				{handleStartAutoplay}
				{cycleSpeed}
			/>

			{#if errorMessage}
				<p class="error hud-error">{errorMessage}</p>
			{/if}

			<GameErrorModal
				visible={fatalError != null}
				{t}
				titleKey={fatalError?.titleKey ?? 'general_error_title'}
				descKey={fatalError?.descKey ?? 'general_error_desc'}
				on:close={dismissFatalError}
			/>

			<PendingRoundModal visible={pendingRound} {t} {resolvePendingRound} />
		{/if}

		</div>
	</div>
</div>
