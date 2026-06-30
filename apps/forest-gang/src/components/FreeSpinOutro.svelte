<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { stateI18nDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { WIN_GRADIENT } from '../game/goldGradient';
	import PressToContinue from './PressToContinue.svelte';
	import WinCoins from './WinCoins.svelte';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';

	const context = getContext();
	const t = (key: string) => stateI18nDerived.translate(key);

	// Same Cinzel styling as the free-spins intro (Figma: Cinzel 900, soft drop shadow, proportional spacing).
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

	let show = $state(true);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let amountSizes = $state({ width: 0, height: 0 });

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => (show = true),
		freeSpinOutroHide: async () => (show = false),
		freeSpinOutroCountUp: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => {}}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount onmount={() => startCountUp()} />

				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

				<FreeSpinAnimation>
					{#snippet children({ sizes })}
						{@const BW = sizes.width * 1.8}

						<Sprite key="fsBoardBg" anchor={{ x: 0.5, y: 0.5 }} width={BW} height={BW} />

						<!-- CONGRATULATIONS! (gold) + YOU WON (green) — live translatable Cinzel text -->
						<Text
							anchor={{ x: 0.5, y: 0.5 }}
							text={t('FS CONGRATS')}
							style={textStyle(Math.round(BW * 0.044), 0xf1c14a)}
							y={Math.round(-BW * 0.31)}
						/>
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

						<!-- Win amount — Cinzel 900 gold with black outline; scales down to fit the board width -->
						{@const winFont = Math.round(BW * 0.072)}
						{@const winMaxW = BW * 0.6}
						{@const winScale = amountSizes.width > winMaxW ? winMaxW / amountSizes.width : 1}
						<Container y={Math.round(BW * 0.22)} scale={winScale}>
							<Text
								anchor={0.5}
								onresize={(s) => (amountSizes = s)}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								style={{
									fontFamily: 'Cinzel',
									fontWeight: '900',
									fontSize: winFont,
									fill: WIN_GRADIENT,
									align: 'center',
									letterSpacing: winFont * 0.03,
									stroke: { color: 0x000000, width: Math.max(1, Math.round(winFont * 0.023)) },
								}}
							/>
						</Container>
					{/snippet}
				</FreeSpinAnimation>

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
