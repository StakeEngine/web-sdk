<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App, Container } from 'pixi-svelte';
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
	import ExpandedSymbolOverlay from './ExpandedSymbolOverlay.svelte';
	import PaylineVine from './PaylineVine.svelte';
	import HudHtml from './HudHtml.svelte';
	import StakeSync from './StakeSync.svelte';
	import ReplayHud from './replay/ReplayHud.svelte';
	import SplashIntro from './SplashIntro.svelte';
	import { BOARD_GRID_OFFSET_Y } from '../game/constants';

	const context = getContext();

	let splashIntroVisible = $state(false);
	let splashPressHandler = $state<(() => void) | undefined>(undefined);

	// CHANGE ME: update these asset paths to match your game's art
	const heroArt    = './assets/components/backgrounds/visual_v2.png';
	const bonusArt   = './assets/components/backgrounds/visual_v1.jpg';
	const scatterArt = './assets/components/symbols/scatter.png';
	const uiRefArt   = './assets/components/reference/ui-reference-1.png';
	const paylinesArt = './assets/components/reference/paylines_reference.png';
	const heroArtBackdrop = heroArt;

	// CHANGE ME: update betModeMeta and gameRuleMeta with your game's bet modes and rules.
	// Only BASE and BONUS are provided by default.
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
				maxWin: 10000,
			},
			BONUS: {
				mode: 'BONUS',
				costMultiplier: 100,
				type: 'buy',
				parent: '',
				children: '',
				assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: uiRefArt },
				text: {
					title: t('BET MODE BONUS TITLE'),
					dialog: t('BET MODE BONUS DIALOG'),
					description: t('BET MODE BONUS DESCRIPTION'),
					button: t('BET MODE BONUS BUTTON'),
					tickerIdle: t('BET MODE BONUS TICKER IDLE'),
					tickerSpin: t('BET MODE BONUS TICKER SPIN'),
				},
				maxWin: 10000,
			},
		};

		stateMeta.gameRuleMeta = {
			gameRules: [
				{
					title: t('RULE SECTION GAME INFO'),
					rows: 4,
					columns: 1,
					containers: [
						{ title: t('RULE GAME TITLE'), text: t('RULE GAME TEXT'), image: heroArt, row: 0, column: 0, imagePosition: 'left' },
						{ title: t('RULE WILD TITLE'), text: t('RULE WILD TEXT'), image: heroArt, row: 1, column: 0, imagePosition: 'left' },
						{ title: t('RULE SCATTER TITLE'), text: t('RULE SCATTER TEXT'), image: scatterArt, row: 2, column: 0, imagePosition: 'left' },
						{ title: t('PAYTABLE TITLE PAYLINES'), text: t('PAYTABLE TEXT PAYLINES'), image: paylinesArt, row: 3, column: 0, imagePosition: 'left' },
					],
				},
				{
					title: t('RULE SECTION HOW TO PLAY'),
					rows: 5,
					columns: 1,
					containers: [
						{ title: t('HOWTO SPIN TITLE'), text: t('HOWTO SPIN TEXT'), image: uiRefArt, row: 0, column: 0, imagePosition: 'left' },
						{ title: t('HOWTO BET TITLE'), text: t('HOWTO BET TEXT'), image: uiRefArt, row: 1, column: 0, imagePosition: 'left' },
						{ title: t('HOWTO BUY TITLE'), text: t('HOWTO BUY TEXT'), image: bonusArt, row: 2, column: 0, imagePosition: 'left' },
						{ title: t('HOWTO TURBO TITLE'), text: t('HOWTO TURBO TEXT'), image: uiRefArt, row: 3, column: 0, imagePosition: 'left' },
						{ title: t('HOWTO AUTOPLAY TITLE'), text: t('HOWTO AUTOPLAY TEXT'), image: uiRefArt, row: 4, column: 0, imagePosition: 'left' },
					],
				},
				{
					title: t('RULE SECTION DISCLAIMER'),
					rows: 1,
					columns: 1,
					containers: [
						{ title: '', text: t('DISCLAIMER TEXT'), image: '', row: 0, column: 0, imagePosition: 'top' },
					],
				},
			],
			payTable: [
				{
					title: i18nDerived.paytable(),
					rows: 2,
					columns: 2,
					containers: [
						{ title: t('PAYTABLE PREMIUM TITLE'), text: t('PAYTABLE H1_H2'), image: heroArt, row: 0, column: 0, imagePosition: 'left' },
						{ title: t('PAYTABLE PREMIUM TITLE'), text: t('PAYTABLE H3_H5'), image: heroArt, row: 0, column: 1, imagePosition: 'left' },
						{ title: t('PAYTABLE LOW TITLE'), text: t('PAYTABLE LOWS'), image: uiRefArt, row: 1, column: 0, imagePosition: 'left' },
						{ title: t('PAYTABLE SPECIAL TITLE'), text: t('PAYTABLE SPECIAL_TEXT'), image: scatterArt, row: 1, column: 1, imagePosition: 'left' },
					],
				},
			],
			splashScreen: [],
		};
	});

	const t = (key: string) => i18nDerived.translate?.(key) ?? key;

	onMount(() => (context.stateLayout.showLoadingScreen = true));
</script>

<div
	class="game-shell"
	data-layout={context.stateLayoutDerived.layoutType()}
	style={`--game-shell-bg:url('${heroArtBackdrop}')`}
>
	<div class="game-stage">
		<App>
			<EnableSound />
			<EnableHotkey />
			<EnableGameActor />
			<EnablePixiExtension />
			<StakeSync />

			<Background />

			{#if context.stateLayout.showLoadingScreen}
				<LoadingScreen
					onloaded={() => (context.stateLayout.showLoadingScreen = false)}
					oncanproceed={(handler) => { splashPressHandler = handler; splashIntroVisible = true; }}
				/>
			{:else}
				<ResumeBet />
				<Sound />

				<MainContainer zIndex={0}>
					<BoardFrame />
				</MainContainer>

				<MainContainer>
					<Board />
					<Anticipations />
				</MainContainer>

				<ExpandedSymbolOverlay />
				{#if context.stateGame.paylineWins.length > 0}
				<MainContainer>
					{@const bl = context.stateGameDerived.boardLayout()}
					<Container x={bl.x} y={bl.y + BOARD_GRID_OFFSET_Y} pivot={bl.pivot} scale={bl.boardScale}>
						<PaylineVine wins={context.stateGame.paylineWins} />
					</Container>
				</MainContainer>
				{/if}
				<Win />
				<FreeSpinIntro />
				{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
					<FreeSpinCounter />
				{/if}
				<FreeSpinOutro />
				<Transition />
			{/if}
		</App>

		{#if splashIntroVisible}
			<div transition:fade={{ duration: 350 }} style="position:absolute;inset:0;z-index:10;">
				<SplashIntro onpress={() => { splashIntroVisible = false; splashPressHandler?.(); }} />
			</div>
		{/if}

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
	.game-shell {
		position: relative;
		width: 100%;
		height: 100dvh;
		background: #081008;
		overflow: hidden;
	}

	.game-shell::before,
	.game-shell::after {
		content: '';
		position: absolute;
		inset: -6%;
		pointer-events: none;
	}

	.game-shell::before {
		background: var(--game-shell-bg) center 22% / cover no-repeat;
		filter: blur(20px) brightness(0.28) saturate(0.8);
		transform: scale(1.12);
		opacity: 0.95;
	}

	.game-shell::after {
		background:
			radial-gradient(circle at center, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.65) 74%),
			linear-gradient(180deg, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.2) 22%, rgba(0,0,0,0.35) 76%, rgba(0,0,0,0.72));
	}

	.game-stage {
		position: relative;
		width: 100%;
		height: 100%;
		z-index: 1;
	}

	:global(html),
	:global(body) {
		overflow: hidden;
	}
</style>
