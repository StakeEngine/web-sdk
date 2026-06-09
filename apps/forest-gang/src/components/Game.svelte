<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App } from 'pixi-svelte';
	import { stateMeta } from 'state-shared';

	import { Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import { i18nDerived } from '../i18n/i18nDerived';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import PendingRoundRecovery from './PendingRoundRecovery.svelte';
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
	import GlobalMultiplier from './GlobalMultiplier.svelte';
	import ExpandedSymbolOverlay from './ExpandedSymbolOverlay.svelte';
	import DealItMultiplierPanel from './DealItMultiplierPanel.svelte';
	import GameLogoFrame from './GameLogoFrame.svelte';
	import HudHtml from './HudHtml.svelte';
	import StakeSync from './StakeSync.svelte';
	import ReplayHud from './replay/ReplayHud.svelte';

	const context = getContext();
	const heroArt = './assets/components/backgrounds/visual_v2.jpg';
	const bonusArt = './assets/components/backgrounds/visual_v1.jpg';
	const scatterArt = './assets/components/symbols/scatter.png';
	const uiRefArt = './assets/components/reference/ui-reference-1.png';
	const paylinesArt = './assets/components/reference/paylines_reference.png';
	const heroArtBackdrop = new URL('../../static/assets/components/backgrounds/visual_v2.jpg', import.meta.url).href;

	$effect(() => {
		stateMeta.betModeMeta = {
			BASE: {
				mode: 'BASE',
				costMultiplier: 1,
				type: 'default',
				parent: '',
				children: '',
				assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: uiRefArt },
				text: {
					title: i18nDerived.translate?.('BET MODE BASE TITLE') ?? i18nDerived.gameTitle(),
					dialog: i18nDerived.translate?.('BET MODE BASE DIALOG') ?? '',
					button: i18nDerived.translate?.('BET MODE BASE BUTTON') ?? 'PLAY',
					tickerIdle: i18nDerived.translate?.('BET MODE BASE TICKER IDLE') ?? '',
					tickerSpin: i18nDerived.translate?.('BET MODE BASE TICKER SPIN') ?? '',
				},
				maxWin: 20000,
			},
			BONUS: {
				mode: 'BONUS',
				costMultiplier: 100,
				type: 'default',
				parent: '',
				children: '',
				assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: uiRefArt },
				text: {
					title: forestStakeTitle('BET MODE BONUS TITLE'),
					dialog: forestStakeTitle('BET MODE BONUS DIALOG'),
					description: forestStakeTitle('BET MODE BONUS DESCRIPTION'),
					button: forestStakeTitle('BET MODE BONUS BUTTON'),
					tickerIdle: forestStakeTitle('BET MODE BONUS TICKER IDLE'),
					tickerSpin: forestStakeTitle('BET MODE BONUS TICKER SPIN'),
				},
				maxWin: 20000,
			},
			SUPER: {
				mode: 'SUPER',
				costMultiplier: 400,
				type: 'default',
				parent: '',
				children: '',
				assets: { icon: '', volatility: '', button: '', dialogImage: heroArt, dialogVolatility: scatterArt },
				text: {
					title: forestStakeTitle('BET MODE SUPER TITLE'),
					dialog: forestStakeTitle('BET MODE SUPER DIALOG'),
					description: forestStakeTitle('BET MODE SUPER DESCRIPTION'),
					button: forestStakeTitle('BET MODE SUPER BUTTON'),
					tickerIdle: forestStakeTitle('BET MODE SUPER TICKER IDLE'),
					tickerSpin: forestStakeTitle('BET MODE SUPER TICKER SPIN'),
				},
				maxWin: 20000,
			},
		};

		stateMeta.gameRuleMeta = {
			gameRules: [
				{
					title: forestStakeTitle('RULE SECTION GAME INFO'),
					rows: 6,
					columns: 1,
					containers: [
						{ title: forestStakeTitle('RULE GAME TITLE'), text: forestStakeTitle('RULE GAME TEXT'), image: heroArt, row: 0, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('RULE WILD TITLE'), text: forestStakeTitle('RULE WILD TEXT'), image: heroArt, row: 1, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('RULE SCATTER TITLE'), text: forestStakeTitle('RULE SCATTER TEXT'), image: scatterArt, row: 2, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('RULE DEAL IT TITLE'), text: forestStakeTitle('RULE DEAL IT TEXT'), image: scatterArt, row: 3, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('RULE ALL IN TITLE'), text: forestStakeTitle('RULE ALL IN TEXT'), image: scatterArt, row: 4, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('PAYTABLE TITLE PAYLINES'), text: forestStakeTitle('PAYTABLE TEXT PAYLINES'), image: paylinesArt, row: 5, column: 0, imagePosition: 'left' },
					],
				},
				{
					title: forestStakeTitle('RULE SECTION FEATURES'),
					rows: 3,
					columns: 1,
					containers: [
						{ title: forestStakeTitle('RULE BUY TITLE'), text: forestStakeTitle('RULE BUY TEXT'), image: bonusArt, row: 0, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('FEATURE SELECTED SYMBOL TITLE'), text: forestStakeTitle('FEATURE SELECTED SYMBOL TEXT'), image: heroArt, row: 1, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('FEATURE DEAL IT MULTIPLIER TITLE'), text: `${forestStakeTitle('FEATURE DEAL IT MULTIPLIER TEXT')}\n\n${forestStakeTitle('FEATURE ALL IN_MULTIPLIER TITLE')}\n${forestStakeTitle('FEATURE ALL IN_MULTIPLIER TEXT')}`, image: uiRefArt, row: 2, column: 0, imagePosition: 'left' },
					],
				},
				{
					title: forestStakeTitle('RULE SECTION HOW TO PLAY'),
					rows: 6,
					columns: 1,
					containers: [
						{ title: forestStakeTitle('HOWTO SPIN TITLE'), text: forestStakeTitle('HOWTO SPIN TEXT'), image: uiRefArt, row: 0, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('HOWTO BET TITLE'), text: forestStakeTitle('HOWTO BET TEXT'), image: uiRefArt, row: 1, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('HOWTO BUY TITLE'), text: forestStakeTitle('HOWTO BUY TEXT'), image: bonusArt, row: 2, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('HOWTO TURBO TITLE'), text: forestStakeTitle('HOWTO TURBO TEXT'), image: uiRefArt, row: 3, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('HOWTO AUTOPLAY TITLE'), text: forestStakeTitle('HOWTO AUTOPLAY TEXT'), image: uiRefArt, row: 4, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('HOWTO REPLAY TITLE'), text: forestStakeTitle('HOWTO REPLAY TEXT'), image: heroArt, row: 5, column: 0, imagePosition: 'left' },
					],
				},
				{
					title: forestStakeTitle('RULE SECTION DISCLAIMER'),
					rows: 1,
					columns: 1,
					containers: [
						{ title: '', text: forestStakeTitle('DISCLAIMER TEXT'), image: '', row: 0, column: 0, imagePosition: 'top' },
					],
				},
			],
			payTable: [
				{
					title: i18nDerived.paytable(),
					rows: 3,
					columns: 2,
					containers: [
						{ title: forestStakeTitle('PAYTABLE PREMIUM TITLE'), text: `${forestStakeTitle('PAYTABLE FOX')}\n\n${forestStakeTitle('PAYTABLE WOLF')}`, image: heroArt, row: 0, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('PAYTABLE PREMIUM TITLE'), text: `${forestStakeTitle('PAYTABLE BEAR')}\n\n${forestStakeTitle('PAYTABLE RABBIT')}\n\n${forestStakeTitle('PAYTABLE SQUIRREL')}`, image: heroArt, row: 0, column: 1, imagePosition: 'left' },
						{ title: forestStakeTitle('PAYTABLE LOW TITLE'), text: forestStakeTitle('PAYTABLE LOWS_1'), image: uiRefArt, row: 1, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('PAYTABLE LOW TITLE'), text: forestStakeTitle('PAYTABLE LOWS_2'), image: uiRefArt, row: 1, column: 1, imagePosition: 'left' },
						{ title: forestStakeTitle('PAYTABLE SPECIAL TITLE'), text: forestStakeTitle('PAYTABLE SPECIAL_TEXT'), image: scatterArt, row: 2, column: 0, imagePosition: 'left' },
						{ title: forestStakeTitle('PAYTABLE BUY TITLE'), text: `${forestStakeTitle('PAYTABLE BUY_TEXT')}\n\n${forestStakeTitle('PAYTABLE MAX TITLE')}\n${forestStakeTitle('PAYTABLE MAX_TEXT')}`, image: bonusArt, row: 2, column: 1, imagePosition: 'left' },
					],
				},
			],
			splashScreen: [],
		};
	});

	const forestStakeTitle = (key: string) => i18nDerived.translate?.(key) ?? key;

	onMount(() => (context.stateLayout.showLoadingScreen = true));

</script>

<div
	class="forest-shell"
	data-layout={context.stateLayoutDerived.layoutType()}
	style={`--forest-shell-bg:url('${heroArtBackdrop}')`}
>
	<div class="forest-stage">
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

				<MainContainer zIndex={5}>
					<BoardFrame />
				</MainContainer>

				<MainContainer>
					<Board />
					<Anticipations />
				</MainContainer>

				<GameLogoFrame />
				<ExpandedSymbolOverlay />
				<BonusSymbolPanel />
				<GlobalMultiplier />
				<DealItMultiplierPanel />
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
			<ReplayHud />
			<PendingRoundRecovery />
		{/if}
	</div>
</div>

<Modals>
	{#snippet version()}{/snippet}
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
		background: var(--forest-shell-bg) center 22% / cover no-repeat;
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
		z-index: 1;
	}

	:global(html),
	:global(body) {
		overflow: hidden;
	}

	.forest-shell[data-layout='portrait']::before {
		background-position: center 12%;
		transform: scale(1.2);
	}
</style>
