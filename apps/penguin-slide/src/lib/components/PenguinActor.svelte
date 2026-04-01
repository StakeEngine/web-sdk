<script lang="ts">
	// @ts-ignore - types provided at runtime by workspace deps
	import { SpineProvider, SpineTrack, SpineBone } from 'pixi-svelte';
	import PenguinSpineEvents from './PenguinSpineEvents.svelte';
	import PenguinSpineSkin from './PenguinSpineSkin.svelte';
	import PenguinVestSlots from './PenguinVestSlots.svelte';

	export let spineProps: (args: any) => any;
	export let pose: { x: number; y: number; size: number };
	export let tiltRot = 0;
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
	export let roundAnimationTimeScale = 1;
	export let slipAnimationSpeedMult = 1;
	export let invincibleLoop = false;
	export let reviveAnimationSpeedMult = 1;
	export let onPenguinEvent: (name: string) => void = () => {};
	let vestSlotMode: 'hidden' | 'force' | 'passthrough' = 'hidden';

	$: vestSlotMode =
		vestAnim === 'gain' ||
		penguinAnim === 'lose_L_vest' ||
		penguinAnim === 'lose_R_vest'
			? 'passthrough'
			: penguinAnim === 'slide_in_revive'
				? reviveRingVisible
					? 'passthrough'
					: 'hidden'
				: penguinSkin === 'vest' || hasLifering
					? 'force'
					: 'hidden';
</script>

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
	<PenguinSpineEvents onEvent={onPenguinEvent} />
	<PenguinSpineSkin skin={penguinSkin} />
	<PenguinVestSlots mode={vestSlotMode} />
	{#key vestAnimKey}
		{#if vestAnim === 'gain'}
			<SpineTrack trackIndex={0} animationName="slide_vest_gain" loop={false} timeScale={1 * roundAnimationTimeScale} />
		{/if}
	{/key}
	{#if penguinAnim === 'slide_in'}
		<SpineTrack trackIndex={1} animationName="slide_in" loop={false} timeScale={1.05 * roundAnimationTimeScale} />
	{:else if penguinAnim === 'slide_in_revive'}
		<SpineTrack trackIndex={1} animationName="slide_in_revive" loop={false} timeScale={1.56 * reviveAnimationSpeedMult} />
	{:else if penguinAnim === 'slide_idle'}
		<SpineTrack trackIndex={1} animationName="slide_idle" loop timeScale={1 * roundAnimationTimeScale} />
	{:else if penguinAnim === 'win'}
		<SpineTrack trackIndex={1} animationName="win" loop={false} timeScale={1 * roundAnimationTimeScale} />
	{:else if penguinAnim === 'lose_L_vest'}
		<SpineTrack trackIndex={1} animationName="lose_L_vest" loop={false} timeScale={slipAnimationSpeedMult} />
	{:else if penguinAnim === 'lose_R_vest'}
		<SpineTrack trackIndex={1} animationName="lose_R_vest" loop={false} timeScale={slipAnimationSpeedMult} />
	{:else if penguinAnim === 'lose_L'}
		<SpineTrack trackIndex={1} animationName="lose_L" loop={false} timeScale={slipAnimationSpeedMult} />
	{:else if penguinAnim === 'lose_R'}
		<SpineTrack trackIndex={1} animationName="lose_R" loop={false} timeScale={slipAnimationSpeedMult} />
	{:else}
		<SpineTrack trackIndex={1} animationName="idle" loop timeScale={1 * roundAnimationTimeScale} />
	{/if}
	{#if invincibleLoop}
		<SpineTrack trackIndex={2} animationName="invincible" loop timeScale={1 * roundAnimationTimeScale} />
	{/if}
	<SpineBone boneName="CTRL" rotation={tiltRot} />
</SpineProvider>
