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
	import PressToContinue from './PressToContinue.svelte';
	import { Sprite } from 'pixi-svelte';
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
	let shakeX = $state(0);
	let shakeY = $state(0);

	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			boardClickHandled = false;
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			isCountingUp = true;
			await waitForResolve((resolve) => (oncomplete = resolve));
			isCountingUp = false;
		},
	});

	$effect(() => {
		if (!isCountingUp || !winLevelData?.animation) {
			shakeX = 0;
			shakeY = 0;
			return;
		}

		const alias = winLevelData.alias;
		const amp = alias === 'max' ? 14 : alias === 'epic' ? 10 : alias === 'mega' ? 7 : alias === 'superwin' ? 5 : 3;
		const duration = winLevelData.presentDuration;

		let raf = 0;
		let startTime = 0;

		const tick = (t: number) => {
			if (!startTime) startTime = t;
			const elapsed = t - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const decay = 1 - progress * progress;
			const angle = elapsed * 0.016; // ~15Hz shake
			shakeX = Math.round(Math.sin(angle) * amp * decay);
			shakeY = Math.round(Math.cos(angle * 0.73) * amp * 0.45 * decay);
			if (progress < 1) raf = requestAnimationFrame(tick);
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
						x={boardLayout.x + shakeX}
						y={boardLayout.y + shakeY}
					>
						{#if hasBoardAnimation}
							{@const bs = boardLayout.boardScale}
							{@const mult = stateBet.betAmount > 0 ? countUpAmount / stateBet.betAmount : 0}
							{@const boardKey = mult >= 1000 ? winBoardByAlias.max : mult >= 250 ? winBoardByAlias.epic : mult >= 100 ? winBoardByAlias.mega : mult >= 50 ? winBoardByAlias.superwin : winBoardByAlias.big}
							{@const boardSize = Math.min(boardLayout.width * bs * 0.55, boardLayout.height * bs * 0.85)}
							{#if boardKey}
								<Sprite
									key={boardKey}
									anchor={0.5}
									width={boardSize}
									height={boardSize}
								/>
							{/if}
							<ResponsiveBitmapText
								anchor={0.5}
								y={boardSize * 0.36 - 8}
								maxWidth={boardSize * 0.62}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								style={{
									fontFamily: 'gold',
									fontSize: SYMBOL_SIZE * bs * 0.295,
									align: 'center',
									fontWeight: 'bold',
									letterSpacing: 0,
								}}
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
