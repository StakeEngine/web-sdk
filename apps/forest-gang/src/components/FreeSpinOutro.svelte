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
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import WinCoins from './WinCoins.svelte';

	type AnimationName = 'intro' | 'idle';

	const context = getContext();
	const bs = $derived(context.stateGameDerived.boardLayout().boardScale);

	let show = $state(true);
	let animationName = $state<AnimationName>('intro');
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

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
		{@const isBigWin = winLevelData.type === 'big'}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount onmount={() => startCountUp()} />

				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

				<FreeSpinAnimation>
					{#snippet children({ sizes })}
						{@const BW = sizes.width}
						<!-- YOU WON / freespins text — proportional to slot width like intro -->
						{#if isBigWin}
							<Sprite
								anchor={{ x: 0.5, y: 0.5 }}
								width={Math.round(BW * 0.55)}
								height={Math.round(BW * 0.55 * (156 / 500))}
								key="freespins_{stateUrlDerived.lang()}.png"
								y={Math.round(-BW * 0.28)}
							/>
						{:else}
							<Sprite
								anchor={{ x: 0.5, y: 0.5 }}
								width={Math.round(BW * 0.55)}
								height={Math.round(BW * 0.55 * (80 / 500))}
								key="winsmall_{stateUrlDerived.lang()}.png"
								y={Math.round(-BW * 0.28)}
							/>
						{/if}

						<!-- TOTAL WIN label -->
						<Sprite
							anchor={{ x: 0.5, y: 0.5 }}
							width={Math.round(BW * 0.38)}
							height={Math.round(BW * 0.38 * (42 / 177))}
							key="totalwin.png"
							y={Math.round(BW * 0.08)}
						/>

						<!-- Win amount -->
						<ResponsiveBitmapText
							anchor={0.5}
							y={Math.round(BW * 0.24)}
							style={{
								fontFamily: 'gold',
								fontSize: Math.round(BW * 0.20),
							}}
							text={bookEventAmountToCurrencyString(countUpAmount)}
							maxWidth={Math.round(BW * 0.82)}
						/>
					{/snippet}
				</FreeSpinAnimation>

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
