<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { CanvasSizeRectangle } from 'components-layout';
	import { stateI18nDerived } from 'state-shared';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';

	const context = getContext();
	const t = (key: string) => stateI18nDerived.translate(key);

	let show = $state(false);
	let freeSpinsFromEvent = $state(0);
	let oncomplete = $state(() => {});

	// Live (translatable) text styled per Figma: Cinzel 900, soft drop shadow (offset/blur 2.78 @ 25%
	// alpha, straight down) and letter-spacing 0.72 — all kept proportional to the font size.
	const textStyle = (fontSize: number, fill: number) => ({
		fontFamily: 'Cinzel',
		fontWeight: '900' as const,
		fontSize,
		fill,
		align: 'center' as const,
		letterSpacing: fontSize * 0.03,
		dropShadow: {
			color: 0x000000,
			alpha: 0.25,
			angle: Math.PI / 2,
			blur: fontSize * 0.116,
			distance: fontSize * 0.116,
		},
	});

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

			<!-- CONGRATULATIONS! (gold) — live translatable text -->
			<Text
				anchor={{ x: 0.5, y: 0.5 }}
				text={t('FS CONGRATS')}
				style={textStyle(Math.round(BW * 0.044), 0xf1c14a)}
				y={Math.round(-BW * 0.31)}
			/>
			<!-- YOU WON (green) -->
			<Text
				anchor={{ x: 0.5, y: 0.5 }}
				text={t('FS YOU WON')}
				style={textStyle(Math.round(BW * 0.031), 0x7cc23f)}
				y={Math.round(-BW * 0.238)}
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
				width={Math.round(BW * 0.37)}
				height={Math.round(BW * 0.37 * (1084 / 3065))}
				y={Math.round(BW * 0.165)}
			/>
			<Text
				anchor={{ x: 0.5, y: 0.5 }}
				text={freeSpinsFromEvent}
				style={textStyle(Math.round(BW * 0.08), 0xf1c14a)}
				y={Math.round(BW * 0.16)}
			/>

			<!-- FREE SPINS (green, large) — live translatable text -->
			<Text
				anchor={{ x: 0.5, y: 0.5 }}
				text={t('FS FREE SPINS')}
				style={textStyle(Math.round(BW * 0.048), 0x7cc23f)}
				y={Math.round(BW * 0.305)}
			/>
		{/snippet}
	</FreeSpinAnimation>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
