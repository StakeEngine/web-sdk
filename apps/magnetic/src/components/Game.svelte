<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App } from 'pixi-svelte';
	import { stateMeta } from 'state-shared';
	import { Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import PendingRoundRecovery from './PendingRoundRecovery.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import GlobalMultiplier from './GlobalMultiplier.svelte';
	import HudHtml from './HudHtml.svelte';
	import StakeSync from './StakeSync.svelte';
	import ReplayHud from './replay/ReplayHud.svelte';
	import MagnetStatus from './MagnetStatus.svelte';

	const context = getContext();
	const heroArt = './assets/components/backgrounds/visual_v2.png';
	const bonusArt = './assets/components/backgrounds/splash.jpg';
	const scatterArt = './assets/components/symbols/scatter.png';
	const uiRefArt = './assets/components/reference/controls_reference.png';
	const paytableArt = './assets/components/reference/buy_bonus_reference.png';
	const heroArtBackdrop = new URL('../../static/assets/components/backgrounds/visual_v2.png', import.meta.url).href;

	$effect(() => {
		stateMeta.betModeMeta = {
			BASE: {
				mode: 'BASE', costMultiplier: 1, type: 'default', parent: '', children: '', assets: { icon: '', volatility: '', button: '', dialogImage: heroArt, dialogVolatility: scatterArt },
				text: { title: 'BASE', dialog: '7x7 cluster-pay base game with natural clusters and random magnets.', button: 'PLAY', tickerIdle: 'MAGNETIC', tickerSpin: 'GOOD LUCK' },
				maxWin: 20000,
			},
			CHANCE: {
				mode: 'CHANCE', costMultiplier: 2, type: 'activate', parent: '', children: '', assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: uiRefArt },
				text: { title: 'CHANCE SPIN', dialog: '2x cost. Base game with 3x higher bonus chance.', description: '2x cost per spin, 3x bonus trigger odds.', button: 'ACTIVATE', tickerIdle: 'CHANCE ACTIVE', tickerSpin: 'GOOD LUCK' },
				maxWin: 20000,
			},
			FEATURE: {
				mode: 'FEATURE', costMultiplier: 50, type: 'activate', parent: '', children: '', assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: uiRefArt },
				text: { title: 'FEATURE SPIN', dialog: '50x cost. One paid base-style spin with a guaranteed magnet.', description: 'Guaranteed magnet every paid feature spin.', button: 'ACTIVATE', tickerIdle: 'FEATURE ACTIVE', tickerSpin: 'FEATURE SPIN' },
				maxWin: 20000,
			},
			BONUS: {
				mode: 'BONUS', costMultiplier: 150, type: 'buy', parent: '', children: '', assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: scatterArt },
				text: { title: 'NORMAL BONUS', dialog: '10 free spins. Magnet chance is heavily increased.', description: 'Buy 10 free spins with boosted magnet odds for 150x bet.', button: 'BUY', tickerIdle: 'PLACE YOUR BET', tickerSpin: 'BONUS ACTIVE' },
				maxWin: 20000,
			},
			SUPER: {
				mode: 'SUPER', costMultiplier: 400, type: 'buy', parent: '', children: '', assets: { icon: '', volatility: '', button: '', dialogImage: heroArt, dialogVolatility: scatterArt },
				text: { title: 'SUPER BONUS', dialog: '10 free spins. First spin guarantees a magnet and the chosen target persists for the full bonus.', description: 'Buy the persistent super bonus for 400x bet.', button: 'BUY', tickerIdle: 'PLACE YOUR BET', tickerSpin: 'SUPER ACTIVE' },
				maxWin: 20000,
			},
		};

		stateMeta.gameRuleMeta = {
			gameRules: [
				{
					title: 'GAME INFO', rows: 5, columns: 1,
					containers: [
						{ title: 'MAGNETIC', text: 'Magnetic is a 7x7 cluster-pay slot. Wins form when 5 or more matching symbols touch orthogonally. Diagonal touches do not count.', image: heroArt, row: 0, column: 0, imagePosition: 'left' },
						{ title: 'CLUSTERS', text: 'Natural winning clusters stay locked while all other positions respin. If new matching symbols land touching the active cluster, they join it and another respin follows.', image: paytableArt, row: 1, column: 0, imagePosition: 'left' },
						{ title: 'MAGNETS', text: 'A magnet chooses one visible symbol and only that symbol keeps collecting during the active magnet series. Multiple magnet anchors can merge into a larger cluster.', image: scatterArt, row: 2, column: 0, imagePosition: 'left' },
						{ title: 'BONUSES', text: '3 scatters trigger the Normal Bonus with 10 free spins and boosted magnet odds. 4 scatters trigger the Super Bonus with a guaranteed first-spin magnet and a persistent target series.', image: bonusArt, row: 3, column: 0, imagePosition: 'left' },
						{ title: 'FEATURES', text: 'Chance Spin costs 2x bet and triples bonus odds. Feature Spin costs 50x bet and guarantees a base-style magnet spin. Max advertised win: 20,000x.', image: uiRefArt, row: 4, column: 0, imagePosition: 'left' },
					],
				},
			],
			payTable: [
				{
					title: 'PAYTABLE', rows: 3, columns: 2,
					containers: [
						{ title: 'PREMIUMS', text: 'FOX\n5-7 = 1.5x\n8-11 = 4x\n12-19 = 10x\n20+ = 40x\n\nWOLF\n5-7 = 1.25x\n8-11 = 3.5x\n12-19 = 8x\n20+ = 30x', image: heroArt, row: 0, column: 0, imagePosition: 'left' },
						{ title: 'MID SYMBOLS', text: 'BEAR\n5-7 = 1x\n8-11 = 3x\n12-19 = 7x\n20+ = 24x\n\nRABBIT\n5-7 = 0.8x\n8-11 = 2.2x\n12-19 = 5x\n20+ = 18x', image: heroArt, row: 0, column: 1, imagePosition: 'left' },
						{ title: 'LOWS', text: 'SQUIRREL, A, K, Q, J, T all pay from 5 symbols upward on the same 5/8/12/20+ cluster thresholds.', image: uiRefArt, row: 1, column: 0, imagePosition: 'left' },
						{ title: 'SPECIALS', text: 'Scatter triggers bonus only. Magnet can appear with or without a multiplier. During a magnet series, magnet multipliers multiply together.', image: scatterArt, row: 1, column: 1, imagePosition: 'left' },
						{ title: 'BUY MODES', text: 'Normal Bonus: 150x\nSuper Bonus: 400x\nFeature Spin: 50x / spin\nChance Spin: 2x / spin', image: bonusArt, row: 2, column: 0, imagePosition: 'left' },
						{ title: 'SUPER BONUS', text: 'The first free spin guarantees a magnet. The chosen target symbol, collected cluster and multiplied value persist across all 10 free spins.', image: heroArt, row: 2, column: 1, imagePosition: 'left' },
					],
				},
			],
			splashScreen: [],
		};
	});

	onMount(() => (context.stateLayout.showLoadingScreen = true));
</script>

<div class="magnetic-shell" data-layout={context.stateLayoutDerived.layoutType()} style={`--magnetic-shell-bg:url('${heroArtBackdrop}')`}>
	<div class="magnetic-stage">
		<App>
			<EnableSound />
			<EnableHotkey />
			<EnableGameActor />
			<EnablePixiExtension />
			<StakeSync />

			<Background />

			{#if context.stateLayout.showLoadingScreen}
				<LoadingScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
			{:else}
				<ResumeBet />
				<Sound />

				<MainContainer zIndex={0}>
					<BoardFrame />
				</MainContainer>

				<MainContainer>
					<Board />
				</MainContainer>

				<GlobalMultiplier />
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
			<MagnetStatus />
			<HudHtml />
			<ReplayHud />
			<PendingRoundRecovery />
		{/if}
	</div>
</div>

<Modals>
	{#snippet version()}{/snippet}
</Modals>

<style>
	.magnetic-shell {
		position: relative;
		width: 100%;
		height: 100dvh;
		background: #081008;
		overflow: hidden;
	}
	.magnetic-shell::before,
	.magnetic-shell::after {
		content: '';
		position: absolute;
		inset: -6%;
		pointer-events: none;
	}
	.magnetic-shell::before {
		background: var(--magnetic-shell-bg) center 22% / cover no-repeat;
		filter: blur(22px) brightness(0.28) saturate(0.82);
		transform: scale(1.12);
		opacity: 0.96;
	}
	.magnetic-shell::after {
		background:
			radial-gradient(circle at center, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.68) 76%),
			linear-gradient(180deg, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.2) 22%, rgba(0,0,0,0.35) 76%, rgba(0,0,0,0.74));
	}
	.magnetic-stage {
		position: relative;
		width: 100%;
		height: 100%;
		z-index: 1;
	}
</style>
