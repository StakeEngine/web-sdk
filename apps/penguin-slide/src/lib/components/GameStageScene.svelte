<script lang="ts">
	// @ts-ignore - types provided at runtime by workspace deps
	import { App, Container, SpineProvider, SpineTrack } from 'pixi-svelte';
	import PickupLayer from './pickups/PickupLayer.svelte';
	import PenguinActor from './PenguinActor.svelte';
	import DebugOverlay from './DebugOverlay.svelte';
	import AccumulatedAmountOverlay from './AccumulatedAmountOverlay.svelte';

	export let rootOffset: { x: number; y: number };
	export let rootScale = 1;
	export let viewport: { w: number; h: number };
	export let renderSize: { w: number; h: number };
	export let context: any;
	export let readAssetDimension: (asset: any, key: 'width' | 'height') => number;
	export let pathMetrics: () => { topY: number; bottomY: number };
	export let slideMetrics: () => { y: number; width: number; height: number };
	export let animationStatus: 'idle' | 'running' | 'done';
	export let status: 'idle' | 'sliding' | 'goal' | 'slip';
	export let iceSpawnYDownFrac = 0;
	export let iceScroll = 0;
	export let stepSpacing = 1;
	export let lanePosition: (depth: number, offset: number) => { x: number; y: number; width: number };
	export let floatTime = 0;
	export let sceneFloatTime = 0;
	export let icePieces: any[] = [];
	export let spineProps: (props: Record<string, unknown>) => any;
	export let renderStep = 0;
	export let penguinTargetLane = 0;
	export let lockedTargetTokenId: number | null = null;
	export let tokens: any[] = [];
	export let pickupLineCrossings: any[] = [];
	export let slotToOffset: Record<number, number> = {};
	export let stepDebugGuides: () => any[] = () => [];
	export let penguinPose: () => { x: number; y: number; size: number; depth: number } = () => ({
		x: 0,
		y: 0,
		size: 0,
		depth: 0
	});
	export let targetLineIndexForOffset: (offset: number) => number | null = () => null;
	export let clampPenguinLane: (lane: number) => number = (lane) => lane;
	export let pickupLanePosition: (depth: number, offset: number) => { x: number; y: number; width: number } = () => ({
		x: 0,
		y: 0,
		width: 0
	});
	export let depthForPickupPathY: (y: number) => number = () => 0;
	export let isTargetableHitToken: (token: any) => boolean = () => false;
	export let pickupPosition: (stepIndex: number, lane: number, spawnLane?: number) => any = () => null;
	export let pickupBandState: (token: any, penguin?: any) => any = () => null;
	export let pickupTriggerAt: (stepIndex: number, type?: string, spawnDelay?: number) => number = () => 0;
	export let targetLaneForToken: (token: any) => number = () => 0;
	export let itemSpawnOffset: () => number = () => 0;
	export let tokenRender: (stepIndex: number) => any = () => null;
	export let tokenSpineSize: (depth: number) => number = () => 0;
	export let coinAssetKey: (token: any) => string = () => '';
	export let ctrlRotation: () => number = () => 0;
	export let penguinAnim:
		| 'idle'
		| 'slide_in'
		| 'slide_idle'
		| 'slide_in_revive'
		| 'win'
		| 'lose_L'
		| 'lose_R'
		| 'lose_L_vest'
		| 'lose_R_vest' = 'idle';
	export let penguinSkin: 'base' | 'vest' = 'base';
	export let hasLifering = false;
	export let reviveRingVisible = false;
	export let vestAnim: 'gain' | null = null;
	export let vestAnimKey = 0;
	export let penguinActorKey = 0;
	export let roundAnimationTimeScale = 1;
	export let slipAnimationSpeedMult = 1;
	export let invincibleLoop = false;
	export let reviveAnimationSpeedMult = 1;
	export let handlePenguinEvent: (name: string) => void = () => {};
	export let slideTimeScale = 1;
	export let sceneAnimationTimeScale = 1;
	export let roundWinDisplay = 0;
	export let amountWinPulse = 1;
	export let accumulatedStrokeWidth = 12;
	export let accumulatedAmountY: () => number = () => 0;
	export let bananaLossFloat: { amount: number; start: number } | null = null;
	export let fontReady = false;
	export let formatCurrencyAmount: (amount: number) => string = (amount) => String(amount);
	export let lowPowerMobile = false;
	export let isMobileLandscape = false;
	export let splashVisible = false;
</script>

<App>
	<Container>
		<Container x={rootOffset.x} y={rootOffset.y} scale={rootScale}>
			{@const cloudsData = context.stateApp.loadedAssets?.background_clouds}
			{@const cloudsAssetWidth = readAssetDimension(cloudsData, 'width')}
			{@const cloudsAssetHeight = readAssetDimension(cloudsData, 'height')}
			{@const icePath = pathMetrics()}
			{@const waterHeight = Math.max(1, viewport.h - icePath.topY)}
			{@const waterY = icePath.topY + waterHeight * 0.55}
			{@const mountainsData = context.stateApp.loadedAssets?.background_mountains}
			{@const mountainsAssetWidth = readAssetDimension(mountainsData, 'width')}
			{@const mountainsAssetHeight = readAssetDimension(mountainsData, 'height')}
			{@const mountainsAspect =
				mountainsAssetWidth > 0 && mountainsAssetHeight > 0
					? mountainsAssetHeight / mountainsAssetWidth
					: 0.2}
			{@const mountainsWidth = mountainsAssetWidth || viewport.w}
			{@const mountainsHeight = mountainsAssetHeight || mountainsWidth * mountainsAspect}
			{@const scenePortrait = renderSize.h > renderSize.w}
			{@const anyMobileLandscape = (lowPowerMobile || isMobileLandscape) && !scenePortrait}
			{@const mountainsScaleX = scenePortrait ? 0.5 : 1}
			{@const mountainsOverlapNudge = anyMobileLandscape ? viewport.h * 0.022 : lowPowerMobile ? viewport.h * 0.01 : 0}
			{@const mountainsYOffset = viewport.h * (scenePortrait ? 0.599 : 0.5176) + mountainsOverlapNudge}
			{@const mountainsY = icePath.topY - mountainsHeight * 0.2 + mountainsYOffset}
			{@const cloudsNativeHeight = cloudsAssetHeight}
			{@const cloudsX = viewport.w * 0.5 + cloudsAssetWidth * 0.5}
			{@const cloudsY = cloudsNativeHeight * (scenePortrait ? 0.875 : 0.9485)}
			{@const slide = slideMetrics()}
			{@const slideVisualOffsetY = scenePortrait ? -74 : 0}
			{@const splashDesktop = splashVisible && !scenePortrait && !anyMobileLandscape}
			{@const splashMobilePortrait = splashVisible && scenePortrait}
			{@const splashMobileLandscape = splashVisible && anyMobileLandscape}
			{@const splashSlideWidthScale = splashDesktop ? 0.54 : splashMobilePortrait ? 0.88 : splashMobileLandscape ? 0.6 : 1}
			{@const splashSlideHeightScale = splashDesktop ? 0.68 : splashMobilePortrait ? 0.59 : splashMobileLandscape ? 0.52 : 1}
			{@const splashDesktopHeightTrimPx = splashDesktop ? 8 : 0}
			{@const splashDesktopYOffset = splashDesktop ? -viewport.h * 0.12 - 15 : 0}
			{@const splashDesktopTopCutYOffset = splashDesktop ? slide.height * 0.0512 : 0}
			{@const splashMobileLandscapeTopLockYOffset = splashMobileLandscape
				? -(slide.height * (1 - splashSlideHeightScale)) * 0.64
				: 0}
			{@const splashMobilePortraitYOffset = splashMobilePortrait ? viewport.h * 0.04 : 0}
			{@const splashMobileLandscapeYOffset = splashMobileLandscape ? viewport.h * 0.14 : 0}
			{@const splashPenguinSizeScale = splashDesktop ? 1.092 : splashMobileLandscape ? 1.25 : splashMobilePortrait ? 1.45 : 1}
			{@const splashPenguinYOffset = splashMobileLandscape
				? -viewport.h * 0.15
				: splashMobilePortrait
					? viewport.h * 0.3
					: 0}
			{@const waterTimeScale = lowPowerMobile ? 0 : 1.4}
			{@const iceSwayScale = lowPowerMobile ? 0 : 0.33}
			{@const roundActive = animationStatus === 'running' || status === 'sliding'}
			{@const bgAnim = 'idle'}
			{@const bgTimeScale = lowPowerMobile ? 0 : roundActive ? sceneAnimationTimeScale : 0}
			<Container y={viewport.h * (scenePortrait ? -0.02 : anyMobileLandscape ? -0.045 : -0.1)} sortableChildren>
				{#if !splashVisible}
					<SpineProvider {...spineProps({ key: 'background_water', x: viewport.w * 0.5, y: waterY, zIndex: -10 })}>
						<SpineTrack trackIndex={0} animationName={bgAnim} loop timeScale={bgTimeScale} />
					</SpineProvider>
					<SpineProvider
						{...spineProps({
							key: 'background_clouds',
							x: cloudsX,
							y: cloudsY,
							anchor: { x: 0.5, y: 0.5 },
							zIndex: -30
						})}
					>
						<SpineTrack trackIndex={0} animationName={bgAnim} loop timeScale={bgTimeScale} />
					</SpineProvider>
					<SpineProvider
						{...spineProps({
							key: 'background_mountains',
							x: viewport.w * 0.5,
							y: mountainsY,
							scaleX: mountainsScaleX,
							zIndex: -20
						})}
					>
						<SpineTrack trackIndex={0} animationName={bgAnim} loop timeScale={bgTimeScale} />
					</SpineProvider>
				{/if}
				{@const spawnY = icePath.topY + viewport.h * (0.25 + iceSpawnYDownFrac + (scenePortrait ? 0.04 : 0))}
				{@const spawnOffset = viewport.h * 0.25}
				{@const scrollOffset = iceScroll * 0.715}
				{@const splashSafeBottom = icePath.bottomY - viewport.h * 0.1}
				{@const slopeDepthA = 0.2}
				{@const slopeDepthB = 0.8}
				{@const leftA = lanePosition(slopeDepthA, -1)}
				{@const leftB = lanePosition(slopeDepthB, -1)}
				{@const rightA = lanePosition(slopeDepthA, 1)}
				{@const rightB = lanePosition(slopeDepthB, 1)}
				{@const leftLaneSlope = (leftB.x - leftA.x) / Math.max(1, (leftB.y + spawnOffset) - (leftA.y + spawnOffset))}
				{@const rightLaneSlope =
					(rightB.x - rightA.x) / Math.max(1, (rightB.y + spawnOffset) - (rightA.y + spawnOffset))}
				{#if !splashVisible}
					{#each icePieces as piece (piece.id)}
					{@const spawnTravelOffset = Number(piece.spawnTravelOffset ?? 0)}
					{@const travel = piece.spawnTravelOffset != null ? scrollOffset - spawnTravelOffset : scrollOffset}
					{@const localOffset = piece.spawnTravelOffset != null ? Math.max(0, travel) : scrollOffset}
					{@const yRaw = piece.baseY + localOffset}
					{@const spawnBaseX = piece.baseX}
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
					{@const sway = Math.sin(
						sceneFloatTime * waterTimeScale * iceSwayScale * piece.swayRate * Math.PI * 2 + phaseOffset + piece.swayPhase
					)}
					{@const allowSpawn = piece.spawnTravelOffset != null ? travel >= 0 : true}
					{@const visible = allowSpawn && y <= splashSafeBottom}
					{#if visible}
						<SpineProvider
							{...spineProps({
								key: piece.key,
								x,
								y: y + sway * piece.yAmp,
								rotation: sway * piece.rAmp,
								scale
							})}
						>
							<SpineTrack
								trackIndex={0}
								animationName={piece.animName}
								loop
								timeScale={2.5 * sceneAnimationTimeScale}
							/>
						</SpineProvider>
					{/if}
					{/each}
				{/if}
				<SpineProvider
					{...spineProps({
						key: 'slide',
						x: viewport.w * 0.5,
						y:
							slide.y +
							slideVisualOffsetY +
							splashDesktopYOffset +
							splashDesktopTopCutYOffset +
							splashMobileLandscapeTopLockYOffset +
							splashMobilePortraitYOffset +
							splashMobileLandscapeYOffset,
						width: slide.width * splashSlideWidthScale,
						height: Math.max(1, slide.height * splashSlideHeightScale - splashDesktopHeightTrimPx * 2)
					})}
				>
					<SpineTrack trackIndex={0} animationName="init" loop={false} timeScale={sceneAnimationTimeScale} />
					<SpineTrack
						trackIndex={1}
						animationName="idle"
						loop
						timeScale={status === 'sliding' ? slideTimeScale * sceneAnimationTimeScale : 0}
					/>
				</SpineProvider>
				<Container zIndex={200}>
					{#if !splashVisible}
						<PickupLayer
							{tokens}
							{renderStep}
							{viewport}
							{tokenRender}
							lanePosition={pickupLanePosition}
							{tokenSpineSize}
							{coinAssetKey}
							{itemSpawnOffset}
							animationTimeScale={sceneAnimationTimeScale}
							showSteps={false}
							{stepSpacing}
							{pickupTriggerAt}
						/>
					{/if}
					<DebugOverlay
						enabled={false}
						{viewport}
						{renderStep}
						{penguinTargetLane}
						{lockedTargetTokenId}
						{tokens}
						{pickupLineCrossings}
						{slotToOffset}
						{stepDebugGuides}
						{penguinPose}
						{targetLineIndexForOffset}
						{clampPenguinLane}
						{pickupLanePosition}
						{depthForPickupPathY}
						{isTargetableHitToken}
						{pickupPosition}
						{pickupBandState}
						{pickupTriggerAt}
						{targetLaneForToken}
						{itemSpawnOffset}
					/>
				</Container>
				{@const pose = splashVisible
					? {
							x: viewport.w * 0.5,
							y: viewport.h * 0.835 + splashPenguinYOffset,
							size: viewport.h * 0.226 * splashPenguinSizeScale,
							depth: 0.9
						}
					: penguinPose()}
				{@const tiltRot = splashVisible ? 0 : ctrlRotation()}
				{#key `${penguinActorKey}-${splashVisible ? 'splash' : 'game'}`}
					<PenguinActor
						{spineProps}
						{pose}
						{tiltRot}
						penguinAnim={splashVisible ? 'idle' : penguinAnim}
						penguinSkin={splashVisible ? 'base' : penguinSkin}
						hasLifering={splashVisible ? false : hasLifering}
						{reviveRingVisible}
						{vestAnim}
						{vestAnimKey}
						roundAnimationTimeScale={splashVisible ? 0 : roundAnimationTimeScale}
						{invincibleLoop}
						{reviveAnimationSpeedMult}
						{slipAnimationSpeedMult}
						onPenguinEvent={handlePenguinEvent}
					/>
				{/key}
			</Container>
			{#if !splashVisible}
				<AccumulatedAmountOverlay
					{viewport}
					{roundWinDisplay}
					{amountWinPulse}
					{accumulatedStrokeWidth}
					amountY={accumulatedAmountY()}
					{bananaLossFloat}
					{floatTime}
					{fontReady}
					{formatCurrencyAmount}
				/>
			{/if}
		</Container>
	</Container>
</App>
