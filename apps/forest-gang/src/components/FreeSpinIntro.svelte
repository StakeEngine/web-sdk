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

	<FreeSpinAnimation>
		{#snippet children(_)}
			{@const BW = 1100}

			<!-- Square wooden board centred on slot pivot -->
			<Sprite key="fsBoardBg" anchor={{ x: 0.5, y: 0.5 }} width={BW} height={BW} />

			<!-- CONGRATULATIONS! + YOU WON (combined, language-aware) -->
			<Sprite
				key="freespins_{stateUrlDerived.lang()}.png"
				anchor={{ x: 0.5, y: 0.5 }}
				width={Math.round(BW * 0.53)}
				height={Math.round(BW * 0.53 * (128 / 486))}
				y={Math.round(-BW * 0.279)}
			/>

			<!-- Scatter medallion — 28% of board width (Figma: 150/544) -->
			<Sprite
				key="fsMedallion"
				anchor={{ x: 0.5, y: 0.5 }}
				width={Math.round(BW * 0.28)}
				height={Math.round(BW * 0.28 * (273 / 300))}
				y={Math.round(-BW * 0.051)}
			/>

			<!-- Number frame — 34% of board width (Figma: 183/544) -->
			<Sprite
				key="fsNumFrame"
				anchor={{ x: 0.5, y: 0.5 }}
				width={Math.round(BW * 0.34)}
				height={Math.round(BW * 0.34 * (134 / 365))}
				y={Math.round(BW * 0.170)}
			/>
			<!-- Gold number centred in the frame.
			     "5" glyph: height=165 vs lineHeight=97, yoffset=0 →
			     glyph center is (165-97)/2 * scale = 34*(fs/97) below the line anchor.
			     Shift the text up by that amount so the digit sits centred. -->
			<BitmapText
				anchor={{ x: 0.5, y: 0.5 }}
				text={freeSpinsFromEvent}
				style={{ fontFamily: 'silver', fontSize: Math.round(BW * 0.05) }}
				y={Math.round(BW * 0.170 - 34 / 97 * (BW * 0.05))}
			/>

			<!-- FREE SPINS text — 37% of board width (Figma: 201/544) -->
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
