<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App } from 'pixi-svelte';
	import { stateMeta, stateModal } from 'state-shared';

	import { GameVersion, Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import Anticipations from './Anticipations.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import BonusSymbolPanel from './BonusSymbolPanel.svelte';
	import ReelMultiplierPanel from './ReelMultiplierPanel.svelte';
	import ExpandedSymbolOverlay from './ExpandedSymbolOverlay.svelte';
	import TempMultiplierBanner from './TempMultiplierBanner.svelte';
	import HudHtml from './HudHtml.svelte';

	const context = getContext();
	const heroArt = './forest-gang/visual_v2.png';
	const bonusArt = './forest-gang/visual_v1.png';
	const scatterArt = './forest-gang/scatter-symbol.png';
	const uiRefArt = './forest-gang/ui-reference-1.png';

	stateMeta.betModeMeta = {
		BASE: {
			mode: 'BASE',
			costMultiplier: 1,
			type: 'default',
			parent: '',
			children: '',
			assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: uiRefArt },
			text: {
				title: 'BASE',
				dialog: 'Standard Forest Gang base game.',
				button: 'PLAY',
				tickerIdle: 'FOREST GANG',
				tickerSpin: 'GOOD LUCK',
			},
			maxWin: 20000,
		},
		BONUS: {
			mode: 'BONUS',
			costMultiplier: 100,
			type: 'buy',
			parent: '',
			children: '',
			assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: uiRefArt },
			text: {
				title: 'DEAL IT',
				dialog: '10 free spins. Random premium expanding symbol. Winning spins may get temp multipliers.',
				description: 'Book bonus with random x2, x3 or x5 spin multipliers.',
				button: 'BUY',
				tickerIdle: 'PLACE YOUR BET',
				tickerSpin: 'DEAL IT ACTIVATED',
			},
			maxWin: 20000,
		},
		SUPER: {
			mode: 'SUPER',
			costMultiplier: 400,
			type: 'buy',
			parent: '',
			children: '',
			assets: { icon: '', volatility: '', button: '', dialogImage: heroArt, dialogVolatility: scatterArt },
			text: {
				title: 'ALL IN',
				dialog: '10 free spins. Random premium expanding symbol. Persistent reel multipliers double on each hit.',
				description: 'High-volatility super bonus with sticky reel multipliers.',
				button: 'BUY',
				tickerIdle: 'PLACE YOUR BET',
				tickerSpin: 'ALL IN ACTIVATED',
			},
			maxWin: 20000,
		},
	};

	stateMeta.gameRuleMeta = {
		gameRules: [
			{
				title: 'GAME INFO',
				rows: 5,
				columns: 1,
				containers: [
					{ title: 'FOREST GANG', text: '5x4 line slot with 20 fixed paylines. Wins pay left to right only.', image: heroArt, row: 0, column: 0, imagePosition: 'left' },
					{ title: 'WILD', text: 'Wild substitutes for all regular symbols except Scatter. Wild helps line wins and expanding-symbol wins.', image: heroArt, row: 1, column: 0, imagePosition: 'left' },
					{ title: 'SCATTER / DEAL IT', text: '3 Scatters trigger Deal It: 10 free spins and 1 random premium expanding symbol. Some winning expanded spins get x2, x3 or x5.', image: scatterArt, row: 2, column: 0, imagePosition: 'left' },
					{ title: 'ALL IN', text: '4 or more Scatters trigger All In: 10 free spins, 1 random premium expanding symbol, and persistent reel multipliers that double when a reel hits again.', image: scatterArt, row: 3, column: 0, imagePosition: 'left' },
					{ title: 'BUY BONUS / RTP', text: 'Deal It Buy = 100x bet. All In Buy = 400x bet. Target RTP from design docs is 96.10%. Current local math is prototype only, not final certified math.', image: bonusArt, row: 4, column: 0, imagePosition: 'left' },
				],
			},
		],
		payTable: [
			{
				title: 'PAYTABLE',
				rows: 3,
				columns: 2,
				containers: [
					{ title: 'FOX', text: '3 = 3x\n4 = 20x\n5 = 250x', image: heroArt, row: 0, column: 0, imagePosition: 'left' },
					{ title: 'WOLF', text: '3 = 2.5x\n4 = 15x\n5 = 175x', image: heroArt, row: 0, column: 1, imagePosition: 'left' },
					{ title: 'BEAR / RABBIT', text: 'BEAR: 3 = 2x, 4 = 12x, 5 = 150x\nRABBIT: 3 = 1.5x, 4 = 10x, 5 = 100x', image: heroArt, row: 1, column: 0, imagePosition: 'left' },
					{ title: 'SQUIRREL / LOWS', text: 'SQUIRREL: 3 = 1x, 4 = 8x, 5 = 75x\nA: 40x, K: 35x, Q: 30x, J: 25x, 10: 20x for five.', image: uiRefArt, row: 1, column: 1, imagePosition: 'left' },
					{ title: 'BONUS RULES', text: 'Scatters do not pay in the current setup. Expanding symbol is always one of the 5 premium animal symbols.', image: scatterArt, row: 2, column: 0, imagePosition: 'left' },
					{ title: 'MAX WIN', text: 'Game design target max win is 20,000x. Current mock math also caps rounds at 20,000x.', image: bonusArt, row: 2, column: 1, imagePosition: 'left' },
				],
			},
		],
		splashScreen: [],
	};

	onMount(() => (context.stateLayout.showLoadingScreen = true));

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>

<div class="forest-shell" data-layout={context.stateLayoutDerived.layoutType()}>
	<div class="forest-stage">
		<App>
			<EnableSound />
			<EnableHotkey />
			<EnableGameActor />
			<EnablePixiExtension />

			<Background />

			{#if context.stateLayout.showLoadingScreen}
				<LoadingScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
			{:else}
				<ResumeBet />
				<Sound />

				<MainContainer>
					<BoardFrame />
				</MainContainer>

				<MainContainer>
					<Board />
					<Anticipations />
				</MainContainer>

				<ExpandedSymbolOverlay />
				<BonusSymbolPanel />
				<ReelMultiplierPanel />
				<TempMultiplierBanner />
				<Win />
				<FreeSpinIntro />
				{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
					<FreeSpinCounter />
				{/if}
				<FreeSpinOutro />
				<Transition />
			{/if}
		</App>

		{#if !context.stateLayout.showLoadingScreen}
			<HudHtml />
		{/if}
	</div>
</div>

<Modals>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
</Modals>

<style>
	.forest-shell {
		position: relative;
		width: 100%;
		height: 100dvh;
		background: #081008;
		overflow: hidden;
	}

	.forest-shell::before,
	.forest-shell::after {
		content: '';
		position: absolute;
		inset: -6%;
		pointer-events: none;
	}

	.forest-shell::before {
		background: url('./forest-gang/visual_v2.png') center 22% / cover no-repeat;
		filter: blur(20px) brightness(0.28) saturate(0.8);
		transform: scale(1.12);
		opacity: 0.95;
	}

	.forest-shell::after {
		background:
			radial-gradient(circle at center, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.65) 74%),
			linear-gradient(180deg, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.2) 22%, rgba(0,0,0,0.35) 76%, rgba(0,0,0,0.72));
	}

	.forest-stage {
		position: relative;
		width: 100%;
		height: 100%;
		max-width: 1440px;
		margin: 0 auto;
		z-index: 1;
	}

	.forest-shell[data-layout='portrait'] .forest-stage {
		height: 100%;
		max-width: 100%;
	}

	.forest-shell[data-layout='portrait']::before {
		background-position: center 12%;
		transform: scale(1.2);
	}
</style>
