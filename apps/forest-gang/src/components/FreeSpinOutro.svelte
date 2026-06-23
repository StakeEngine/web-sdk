<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { stateUrlDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';
	import WinCoins from './WinCoins.svelte';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';

	const context = getContext();

	let show = $state(true);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});

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
						{@const BW = sizes.width * 1.5}

						<Sprite key="fsBoardBg" anchor={{ x: 0.5, y: 0.5 }} width={BW} height={BW} />

						<!-- CONGRATULATIONS! YOU WON banner -->
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

						<!-- Win amount -->
						<ResponsiveBitmapText
							anchor={0.5}
							y={Math.round(BW * 0.220)}
							maxWidth={Math.round(BW * 0.60)}
							text={bookEventAmountToCurrencyString(countUpAmount)}
							style={{
								fontFamily: 'gold',
								fontSize: Math.round(BW * 0.065),
								align: 'center',
								fontWeight: 'bold',
								letterSpacing: 0,
							}}
						/>
					{/snippet}
				</FreeSpinAnimation>

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
