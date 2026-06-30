<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import WinCoins from './WinCoins.svelte';
	import WinBoard from './WinBoard.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { winBoardByAlias } from '../game/utils';
	import { stateBet } from 'state-shared';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let boardClickHandled = false;
	let isCountingUp = $state(false);

	// Breathing: gentle ±2% scale oscillation while counting up
	let breatheScale = $state(1);

	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			boardClickHandled = false;
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			breatheScale = 1;
			isCountingUp = true;
			await waitForResolve((resolve) => (oncomplete = resolve));
			isCountingUp = false;
		},
	});

	// Breathing loop
	$effect(() => {
		if (!isCountingUp || !winLevelData?.animation) {
			breatheScale = 1;
			return;
		}
		let raf = 0;
		let start = 0;
		const tick = (t: number) => {
			if (!start) start = t;
			breatheScale = 1 + Math.sin((t - start) * 0.0025) * 0.022;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const hasBoardAnimation = !!winLevelData?.animation}
		{@const duration = (stateBet.isTurbo || stateBet.isSuperTurbo) && !hasBoardAnimation ? Math.min(winLevelData.presentDuration, 400) : winLevelData.presentDuration}
		{#key oncomplete}
		<WinCountUpProvider {amount} {duration} oncomplete={() => { if (!hasBoardAnimation) oncomplete(); }}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />
				{/if}

				<OnMount onmount={() => startCountUp()} />

				<MainContainer>
					<Container
						x={boardLayout.x}
						y={boardLayout.y}
					>
						{#if hasBoardAnimation}
							{@const bs = boardLayout.boardScale}
							{@const mult = stateBet.betAmount > 0 ? countUpAmount / stateBet.betAmount : 0}
							{@const boardKey = mult >= 1000 ? winBoardByAlias.max : mult >= 250 ? winBoardByAlias.epic : mult >= 100 ? winBoardByAlias.mega : mult >= 50 ? winBoardByAlias.superwin : winBoardByAlias.big}
							{@const maxBoardSize = Math.min(boardLayout.width * bs * 0.55, boardLayout.height * bs * 0.85)}
							<WinBoard
								{boardKey}
								{maxBoardSize}
								{breatheScale}
								{mult}
								countUpText={bookEventAmountToCurrencyString(countUpAmount)}
								fontSize={SYMBOL_SIZE * bs * 0.21}
							/>
						{:else}
							<ResponsiveBitmapText
								anchor={0.5}
								maxWidth={context.stateLayoutDerived.canvasSizes().width / context.stateLayoutDerived.mainLayout().scale}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								style={{
									fontFamily: 'gold',
									fontSize: SYMBOL_SIZE,
									align: 'center',
									fontWeight: 'bold',
									letterSpacing: 0,
								}}
							/>
						{/if}
					</Container>
				</MainContainer>

				<WinCoins emit={true} levelAlias={winLevelData?.alias} boardMode={hasBoardAnimation} />

				{#if hasBoardAnimation}
					<PressToContinue onpress={() => {
						if (!countUpCompleted) {
							finishCountUp();
						} else {
							if (boardClickHandled) return;
							boardClickHandled = true;
							oncomplete();
						}
					}} />
				{/if}
			{/snippet}
		</WinCountUpProvider>
		{/key}
	{/if}
</FadeContainer>
