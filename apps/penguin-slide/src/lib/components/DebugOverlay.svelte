<script lang="ts">
	import { Graphics, Text } from 'pixi-svelte';

	type Token = {
		id: number;
		stepIndex: number;
		value: number;
		lane: number;
		type: string;
		hit: boolean;
		activate: boolean;
		offset?: number;
		spawnLane?: number;
		extra?: Record<string, unknown>;
	};

	type Viewport = { w: number; h: number };
	type Pose = { x: number; y: number; size: number; depth: number };
	type DebugGuide = {
		step: number;
		y: number;
		leftX: number;
		rightX: number;
		distanceToNext: number | null;
	};
	type LineCrossing = { slot: number; offset: number; x: number; y: number; lane: number };

	export let enabled = false;
	export let viewport: Viewport;
	export let renderStep: number;
	export let penguinTargetLane: number;
	export let lockedTargetTokenId: number | null;
	export let tokens: Token[];
	export let pickupLineCrossings: LineCrossing[];
	export let slotToOffset: Record<number, number>;

	export let stepDebugGuides: () => DebugGuide[];
	export let penguinPose: () => Pose;
	export let targetLineIndexForOffset: (offset: number) => number | null;
	export let clampPenguinLane: (value: number) => number;
	export let pickupLanePosition: (depth: number, offset: number) => { x: number; y: number; width: number };
	export let depthForPickupPathY: (y: number) => number;
	export let isTargetableHitToken: (token: Token) => boolean;
	export let pickupPosition: (stepIndex: number, lane: number, spawnLane?: number) => { x: number; y: number } | null;
	export let pickupBandState: (token: Token, penguin: Pose) => { yDelta?: number; inActivateBand?: boolean; passedBand?: boolean } | null;
	export let pickupTriggerAt: (stepIndex: number, type: string, spawnDelay: number) => number;
	export let targetLaneForToken: (token: Token) => number;
	export let itemSpawnOffset: () => number;
</script>

{#if enabled}
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
	{@const debugPickupPathOffsets = Object.values(slotToOffset)}
	{@const debugLineCrossings = pickupLineCrossings}
	{@const debugMarkers = tokens
		.filter((t) => !t.extra?.cosmetic && !t.activate)
		.map((t) => ({
			willPickup: Boolean(t.hit),
			pos: pickupPosition(t.stepIndex, t.lane, Number(t.extra?.spawnLane ?? t.lane))
		}))
		.filter((entry) => entry.pos != null)}
	{@const debugWillPickupMarkers = debugMarkers.filter((entry) => entry.willPickup)}
	{@const debugWontPickupMarkers = debugMarkers.filter((entry) => !entry.willPickup)}
	<Graphics
		draw={(graphics) => {
			for (const guide of debugGuides) {
				graphics.moveTo(guide.leftX, guide.y);
				graphics.lineTo(guide.rightX, guide.y);
			}
			graphics.stroke({ width: 2, color: 0x31E7ff, alpha: 0.7 });
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
			graphics.stroke({ width: 3, color: 0xff2d95, alpha: 0.95 });
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
			graphics.stroke({ width: 2, color: 0xffd64a, alpha: 0.85 });
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
					fill: 0xffd64a,
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
				fill: 0x31e7ff,
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
					fill: 0xff2d95,
					fontFamily: 'Poppins',
					fontSize: Math.max(10, Math.round(viewport.w * 0.0065)),
					fontWeight: '700',
					stroke: { color: 0x000000, alpha: 0.95, width: 3 }
				}}
			/>
		{/if}
	{/if}
	<Graphics
		draw={(graphics) => {
			const r = Math.max(3.5, viewport.w * 0.0032);
			for (const marker of debugWontPickupMarkers) {
				if (!marker.pos) continue;
				graphics.circle(marker.pos.x, marker.pos.y, r);
			}
			graphics.fill({ color: 0xff3b3b, alpha: 0.92 });
			graphics.stroke({ width: Math.max(1, r * 0.18), color: 0x000000, alpha: 0.85 });
		}}
	/>
	<Graphics
		draw={(graphics) => {
			const r = Math.max(3.5, viewport.w * 0.0032);
			for (const marker of debugWillPickupMarkers) {
				if (!marker.pos) continue;
				graphics.circle(marker.pos.x, marker.pos.y, r);
			}
			graphics.fill({ color: 0x2dff6a, alpha: 0.92 });
			graphics.stroke({ width: Math.max(1, r * 0.18), color: 0x000000, alpha: 0.85 });
		}}
	/>
{/if}
