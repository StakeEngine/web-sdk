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
	export let iceRespawnGapFrac = 0;
	export let lanePosition: (depth: number, offset: number) => { x: number; y: number; width: number };
	export let floatTime = 0;
	export let sceneFloatTime = 0;
	export let hasStartedFirstRound = false;
	export let iceSpawnState: any;
	export let icePieces: any[] = [];
	export let iceVisibleStart = 0;
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
	export let formatCurrencyAmount: (amount: number) => string = (amount) => String(amount);
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
			{@const mountainsScaleX = scenePortrait ? 0.5 : 1}
			{@const mountainsYOffset = viewport.h * (scenePortrait ? 0.599 : 0.5176)}
			{@const mountainsY = icePath.topY - mountainsHeight * 0.2 + mountainsYOffset}
			{@const cloudsNativeHeight = cloudsAssetHeight}
			{@const cloudsX = viewport.w * 0.5 + cloudsAssetWidth * 0.5}
			{@const cloudsY = cloudsNativeHeight * (scenePortrait ? 0.875 : 0.9485)}
			{@const slide = slideMetrics()}
			{@const slideVisualOffsetY = scenePortrait ? -70 : 0}
			{@const waterTimeScale = 1.4}
			{@const iceSwayScale = 0.33}
			{@const roundActive = animationStatus === 'running' || status === 'sliding'}
			{@const bgAnim = 'idle'}
			{@const bgTimeScale = roundActive ? sceneAnimationTimeScale : 0}
			<Container y={viewport.h * (scenePortrait ? -0.02 : -0.1)} sortableChildren>
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
				{@const spawnY = icePath.topY + viewport.h * (0.25 + iceSpawnYDownFrac + (scenePortrait ? 0.04 : 0))}
				{@const spawnOffset = viewport.h * 0.25}
				{@const scrollOffset = iceScroll * 0.715}
				{@const bottomLimit = icePath.bottomY + stepSpacing * 0.2}
				{@const loopSpan = Math.max(1, bottomLimit - spawnY)}
				{@const loopGap = viewport.h * iceRespawnGapFrac}
				{@const loopDistance = loopSpan + loopGap}
				{@const slopeDepthA = 0.2}
				{@const slopeDepthB = 0.8}
				{@const leftA = lanePosition(slopeDepthA, -1)}
				{@const leftB = lanePosition(slopeDepthB, -1)}
				{@const rightA = lanePosition(slopeDepthA, 1)}
				{@const rightB = lanePosition(slopeDepthB, 1)}
				{@const leftLaneSlope = (leftB.x - leftA.x) / Math.max(1, (leftB.y + spawnOffset) - (leftA.y + spawnOffset))}
				{@const rightLaneSlope =
					(rightB.x - rightA.x) / Math.max(1, (rightB.y + spawnOffset) - (rightA.y + spawnOffset))}
				{#each icePieces as piece (piece.id)}
					{@const baseOffset = piece.baseY - spawnY}
					{@const travel = baseOffset + scrollOffset}
					{@const wrappedDistance = ((travel % loopDistance) + loopDistance) % loopDistance}
					{@const inRespawnGap = wrappedDistance > loopSpan}
					{@const wrapped = Math.min(loopSpan, wrappedDistance)}
					{@const localOffset = wrapped}
					{@const yRaw = spawnY + localOffset}
					{@const cycle = Math.floor(travel / loopDistance)}
					{@const fullLoops = Math.floor(travel / loopDistance)}
					{@const spawnBaseX = hasStartedFirstRound
						? iceSpawnState.getSpawnX(piece.id, cycle, piece.baseX, piece.side)
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
					{@const sway = Math.sin(
						sceneFloatTime * waterTimeScale * iceSwayScale * piece.swayRate * Math.PI * 2 + phaseOffset + piece.swayPhase
					)}
					{@const allowSpawn = piece.spawnIndex < iceVisibleStart || (iceScroll > 0 && fullLoops > 0)}
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
							<SpineTrack
								trackIndex={0}
								animationName={piece.animName}
								loop
								timeScale={2.5 * sceneAnimationTimeScale}
							/>
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
					<SpineTrack trackIndex={0} animationName="init" loop={false} timeScale={sceneAnimationTimeScale} />
					<SpineTrack
						trackIndex={1}
						animationName="idle"
						loop
						timeScale={status === 'sliding' ? slideTimeScale * sceneAnimationTimeScale : 0}
					/>
				</SpineProvider>
				<Container zIndex={200}>
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
				{@const pose = penguinPose()}
				{@const tiltRot = ctrlRotation()}
				{#key penguinActorKey}
					<PenguinActor
						{spineProps}
						{pose}
						{tiltRot}
						{penguinAnim}
						{penguinSkin}
						{hasLifering}
						{reviveRingVisible}
						{vestAnim}
						{vestAnimKey}
						{roundAnimationTimeScale}
						{invincibleLoop}
						{reviveAnimationSpeedMult}
						{slipAnimationSpeedMult}
						onPenguinEvent={handlePenguinEvent}
					/>
				{/key}
			</Container>
			<AccumulatedAmountOverlay
				{viewport}
				{roundWinDisplay}
				{amountWinPulse}
				{accumulatedStrokeWidth}
				amountY={accumulatedAmountY()}
				{bananaLossFloat}
				{floatTime}
				{formatCurrencyAmount}
			/>
		</Container>
	</Container>
</App>
