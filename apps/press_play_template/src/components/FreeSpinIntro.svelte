<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { CanvasSizeRectangle } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { BitmapText } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';

	const context = getContext();

	let show = $state(false);
	let freeSpinsFromEvent = $state(0);
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			freeSpinsFromEvent = emitterEvent.totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

	<FreeSpinAnimation xOffset={0}>
		{#snippet children(_)}
			{@const BW = 900}

			<!-- FREE SPINS title -->
			<BitmapText
				anchor={{ x: 0.5, y: 0.5 }}
				text="FREE SPINS"
				style={{ fontFamily: 'gold', fontSize: Math.round(BW * 0.065) }}
				y={Math.round(-BW * 0.15)}
			/>

			<!-- Spin count -->
			<BitmapText
				anchor={{ x: 0.5, y: 0.5 }}
				text={`${freeSpinsFromEvent}`}
				style={{ fontFamily: 'silver', fontSize: Math.round(BW * 0.12) }}
				y={Math.round(BW * 0.05)}
			/>

			<!-- SPINS label -->
			<BitmapText
				anchor={{ x: 0.5, y: 0.5 }}
				text="SPINS"
				style={{ fontFamily: 'gold', fontSize: Math.round(BW * 0.045) }}
				y={Math.round(BW * 0.18)}
			/>
		{/snippet}
	</FreeSpinAnimation>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
