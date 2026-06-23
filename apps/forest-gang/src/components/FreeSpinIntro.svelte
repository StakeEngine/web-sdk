<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { CanvasSizeRectangle } from 'components-layout';
	import { stateUrlDerived } from 'state-shared';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { BitmapText, Sprite } from 'pixi-svelte';

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

	<FreeSpinAnimation xOffset={120}>
		{#snippet children(_)}
			{@const BW = 1100}

			<!-- Square wooden board centred on slot pivot -->
			<Sprite key="fsBoardBg" anchor={{ x: 0.5, y: 0.5 }} width={BW} height={BW} />

			<!-- CONGRATULATIONS! + YOU WON (language-aware, no baked-in spin count) -->
			<Sprite
				key="freespins_{stateUrlDerived.lang()}.png"
				anchor={{ x: 0.5, y: 0.5 }}
				width={Math.round(BW * 0.53)}
				height={Math.round(BW * 0.53 * (128 / 486))}
				y={Math.round(-BW * 0.279)}
			/>

			<!-- Scatter medallion -->
			<Sprite
				key="fsMedallion"
				anchor={{ x: 0.5, y: 0.5 }}
				width={Math.round(BW * 0.28)}
				height={Math.round(BW * 0.28 * (273 / 300))}
				y={Math.round(-BW * 0.051)}
			/>

			<!-- Number frame (no baked-in number) -->
			<Sprite
				key="bonusBuyButtonFrame"
				anchor={{ x: 0.5, y: 0.5 }}
				width={Math.round(BW * 0.34)}
				height={Math.round(BW * 0.34 * (1084 / 3065))}
				y={Math.round(BW * 0.170)}
			/>
			<BitmapText
				anchor={{ x: 0.5, y: 0.5 }}
				text={freeSpinsFromEvent}
				style={{ fontFamily: 'silver', fontSize: Math.round(BW * 0.05) }}
				y={Math.round(BW * 0.170 - 34 / 97 * (BW * 0.05))}
			/>

			<!-- FREE SPINS text -->
			<Sprite
				anchor={{ x: 0.5, y: 0.5 }}
				width={Math.round(BW * 0.37)}
				height={Math.round(BW * 0.37 * (46 / 201))}
				key="freespins.png"
				y={Math.round(BW * 0.306)}
			/>
		{/snippet}
	</FreeSpinAnimation>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
