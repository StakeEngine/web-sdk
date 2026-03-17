<script lang="ts">
	// @ts-ignore - types provided at runtime by workspace deps
	import { SpineProvider, SpineTrack, SpineBone } from 'pixi-svelte';
	import PenguinSpineEvents from './PenguinSpineEvents.svelte';
	import PenguinSpineSkin from './PenguinSpineSkin.svelte';
	import PenguinVestSlots from './PenguinVestSlots.svelte';

	export let spineProps: (args: any) => any;
	export let pose: { x: number; y: number; size: number };
	export let tiltRot = 0;
	export let penguinAnim: 'idle' | 'slide_in' | 'slide_idle' | 'win' | 'lose_L' | 'lose_R' = 'idle';
	export let penguinSkin: 'base' | 'vest' = 'base';
	export let hasLifering = false;
	export let vestAnim: 'gain' | 'lose' | null = null;
	export let vestAnimKey = 0;
	export let slipAnimationSpeedMult = 1;
	export let onPenguinEvent: (name: string) => void = () => {};
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
		<SpineTrack trackIndex={1} animationName="lose_L" loop={false} timeScale={slipAnimationSpeedMult} />
	{:else if penguinAnim === 'lose_R'}
		<SpineTrack trackIndex={1} animationName="lose_R" loop={false} timeScale={slipAnimationSpeedMult} />
	{:else}
		<SpineTrack trackIndex={1} animationName="idle" loop timeScale={1} />
	{/if}
	<SpineBone boneName="CTRL" rotation={tiltRot} />
</SpineProvider>
