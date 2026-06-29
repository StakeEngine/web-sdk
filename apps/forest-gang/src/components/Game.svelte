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
	import BonusSymbolPanel from './BonusSymbolPanel.svelte';
	import GlobalMultiplier from './GlobalMultiplier.svelte';
	import ExpandedSymbolOverlay from './ExpandedSymbolOverlay.svelte';
	import ExpandedSymbolPresenter from './ExpandedSymbolPresenter.svelte';
	import DealItMultiplierPanel from './DealItMultiplierPanel.svelte';
	import GameLogoFrame from './GameLogoFrame.svelte';
	import PaylineVine from './PaylineVine.svelte';
	import HudHtml from './HudHtml.svelte';
	import StakeSync from './StakeSync.svelte';
	import ReplayHud from './replay/ReplayHud.svelte';
	import SplashIntro from './SplashIntro.svelte';
	import { BOARD_GRID_OFFSET_Y } from '../game/constants';

	const context = getContext();

	let splashIntroVisible = $state(false);
	let splashPressHandler = $state<(() => void) | undefined>(undefined);
	const heroArt = './assets/components/backgrounds/visual_v2.png';
	const bonusArt = './assets/components/backgrounds/visual_v1.jpg';
	const scatterArt = './assets/components/symbols/scatter.png';
	const uiRefArt = './assets/components/reference/ui-reference-1.png';
	const paylinesArt = './assets/components/reference/paylines_reference.png';

	// Game info modal (paginated framed pages) — assets exported from Figma
	const infoDir = './assets/components/info';
	const infoFrame = `${infoDir}/overview_frame.webp`;
	const infoForestBg = `${infoDir}/overview_forest_bg.webp`;
	const infoPanelBg = `${infoDir}/panel_wood_bg.webp`;
	const infoPaylines = `${infoDir}/paylines.webp`;
	const symDir = './assets/components/symbols';
	const uiDir = './assets/components/ui';
	const heroArtBackdrop = new URL('../../static/assets/components/backgrounds/visual_v2.png', import.meta.url).href;

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
				maxWin: 25000,
			},
			CHANCE: {
				mode: 'CHANCE',
				costMultiplier: 2,
				type: 'activate',
				parent: '',
				children: '',
				assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: uiRefArt },
				text: {
					title: forestStakeTitle('BET MODE CHANCE TITLE'),
					dialog: forestStakeTitle('BET MODE CHANCE DIALOG'),
					description: forestStakeTitle('BET MODE CHANCE DESCRIPTION'),
					button: forestStakeTitle('BET MODE CHANCE BUTTON'),
					tickerIdle: forestStakeTitle('BET MODE CHANCE TICKER IDLE'),
					tickerSpin: forestStakeTitle('BET MODE CHANCE TICKER SPIN'),
				},
				maxWin: 25000,
			},
			FEATURE: {
				mode: 'FEATURE',
				costMultiplier: 20,
				type: 'activate',
				parent: '',
				children: '',
				assets: { icon: '', volatility: '', button: '', dialogImage: bonusArt, dialogVolatility: uiRefArt },
				text: {
					title: forestStakeTitle('BET MODE FEATURE TITLE'),
					dialog: forestStakeTitle('BET MODE FEATURE DIALOG'),
					description: forestStakeTitle('BET MODE FEATURE DESCRIPTION'),
					button: forestStakeTitle('BET MODE FEATURE BUTTON'),
					tickerIdle: forestStakeTitle('BET MODE FEATURE TICKER IDLE'),
					tickerSpin: forestStakeTitle('BET MODE FEATURE TICKER SPIN'),
				},
				maxWin: 25000,
			},
			BONUS: {
				mode: 'BONUS',
				costMultiplier: 100,
				type: 'buy',
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
				maxWin: 25000,
			},
			SUPER: {
				mode: 'SUPER',
				costMultiplier: 400,
				type: 'buy',
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
				maxWin: 25000,
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
			infoAssets: {
				// Both use the gold arrow; the prev button is mirrored in CSS. Disabled state dims via opacity.
				navArrowLeft: `${infoDir}/nav_arrow_right.svg`,
				navArrowRight: `${infoDir}/nav_arrow_right.svg`,
				navButton: `${infoDir}/nav_btn_bg.webp`,
				statCard: `${infoDir}/stat_card.webp`,
				featureCard: `${infoDir}/feature_card.webp`,
				specialFrame: `${infoDir}/special_frame.webp`,
			},
			infoPages: [
				{
					kind: 'overview',
					frame: infoFrame,
					background: infoForestBg,
					title: forestStakeTitle('INFO OVERVIEW TITLE'),
					body: forestStakeTitle('INFO OVERVIEW BODY'),
					highlight: '25,000x',
					stats: [
						{ icon: `${infoDir}/icon_reels.webp`, value: forestStakeTitle('INFO STAT REELS'), label: forestStakeTitle('INFO STAT REELS LABEL') },
						{ icon: `${infoDir}/icon_paylines.webp`, value: forestStakeTitle('INFO STAT PAYLINES'), label: forestStakeTitle('INFO STAT PAYLINES LABEL') },
						{ icon: `${infoDir}/icon_maxwin.webp`, value: forestStakeTitle('INFO STAT MAXWIN'), label: forestStakeTitle('INFO STAT MAXWIN LABEL') },
						{ icon: `${infoDir}/icon_rtp.webp`, value: forestStakeTitle('INFO STAT RTP'), label: forestStakeTitle('INFO STAT RTP LABEL') },
					],
				},
				{
					kind: 'features',
					frame: infoFrame,
					background: infoPanelBg,
					title: forestStakeTitle('INFO FEATURES TITLE'),
					cards: [
						{ title: forestStakeTitle('INFO EXPANDING TITLE'), text: forestStakeTitle('INFO EXPANDING TEXT'), images: [`${infoDir}/feat_expanding.webp`, `${infoDir}/feat_expanding_2.webp`] },
						{ title: forestStakeTitle('INFO DEAL IT TITLE'), text: forestStakeTitle('INFO DEAL IT TEXT'), highlight: forestStakeTitle('INFO DEAL IT HL'), badge: `${infoDir}/icon_scatter.webp`, badgeCount: 3 },
						{ title: forestStakeTitle('INFO ALL IN TITLE'), text: forestStakeTitle('INFO ALL IN TEXT'), highlight: forestStakeTitle('INFO ALL IN HL'), badge: `${infoDir}/icon_scatter.webp`, badgeCount: 4 },
					],
				},
				{
					kind: 'paytable',
					frame: infoFrame,
					background: infoPanelBg,
					title: forestStakeTitle('INFO PAYTABLE TITLE'),
					payoutHead: {
						symbol: forestStakeTitle('INFO PT SYMBOL'),
						cols: [forestStakeTitle('INFO PT COL3'), forestStakeTitle('INFO PT COL4'), forestStakeTitle('INFO PT COL5')],
					},
					payouts: [
						{ icon: `${symDir}/bear.png`, name: 'BEAR', premium: true, x3: '3x', x4: '20x', x5: '250x' },
						{ icon: `${symDir}/wolf.png`, name: 'WOLF', premium: true, x3: '2.5x', x4: '15x', x5: '175x' },
						{ icon: `${symDir}/fox.png`, name: 'FOX', premium: true, x3: '2x', x4: '12x', x5: '150x' },
						{ icon: `${symDir}/rabbit.png`, name: 'RABBIT', premium: true, x3: '1.5x', x4: '10x', x5: '100x' },
						{ icon: `${symDir}/squirrel.png`, name: 'SQUIRREL', premium: true, x3: '1x', x4: '8x', x5: '75x' },
						{ icon: `${symDir}/card_a.png`, name: 'A', x3: '0.8x', x4: '5x', x5: '40x' },
						{ icon: `${symDir}/card_k.png`, name: 'K', x3: '0.7x', x4: '4x', x5: '35x' },
						{ icon: `${symDir}/card_q.png`, name: 'Q', x3: '0.6x', x4: '3.5x', x5: '30x' },
						{ icon: `${symDir}/card_j.png`, name: 'J', x3: '0.5x', x4: '3x', x5: '25x' },
						{ icon: `${symDir}/card_t.png`, name: '10', x3: '0.4x', x4: '4x', x5: '20x' },
					],
					cards: [
						{ icon: `${infoDir}/icon_wild.webp`, title: forestStakeTitle('INFO WILD TITLE'), text: forestStakeTitle('INFO WILD TEXT') },
						{ icon: `${infoDir}/icon_scatter_coin.webp`, title: forestStakeTitle('INFO SCATTER PT TITLE'), text: forestStakeTitle('INFO SCATTER PT TEXT') },
					],
				},
				{
					kind: 'paylines',
					frame: infoFrame,
					background: infoPanelBg,
					title: forestStakeTitle('INFO WAYS TITLE'),
					note: forestStakeTitle('INFO WAYS NOTE'),
					image: infoPaylines,
				},
				{
					kind: 'cards',
					frame: infoFrame,
					background: infoPanelBg,
					title: forestStakeTitle('INFO BUY TITLE'),
					cards: [
						{
							title: forestStakeTitle('INFO BUY CHANCE TITLE'),
							text: forestStakeTitle('INFO BUY CHANCE TEXT'),
							theme: 'green',
							icon: `${uiDir}/bonus_feature_spin_icon.webp`,
							metric: { label: forestStakeTitle('INFO BUY CHANCE_LABEL'), value: forestStakeTitle('INFO BUY CHANCE_VALUE') },
							footer: [
								{ label: forestStakeTitle('INFO BUY COST'), value: '2x BET' },
								{ label: forestStakeTitle('INFO BUY RTP'), value: forestStakeTitle('INFO BUY RTP_VALUE') },
							],
						},
						{
							title: forestStakeTitle('INFO BUY FEATURE TITLE'),
							text: forestStakeTitle('INFO BUY FEATURE TEXT'),
							theme: 'purple',
							icon: `${uiDir}/bonus_all_in_icon.webp`,
							metric: { label: forestStakeTitle('INFO BUY COST'), value: '20x BET' },
							footer: [{ label: forestStakeTitle('INFO BUY RTP'), value: forestStakeTitle('INFO BUY RTP_VALUE') }],
						},
						{
							title: forestStakeTitle('INFO BUY DEALIT TITLE'),
							text: forestStakeTitle('INFO BUY DEALIT TEXT'),
							theme: 'gold',
							icon: `${infoDir}/buy_dealit.webp`,
							metric: { label: forestStakeTitle('INFO BUY COST'), value: '100x BET' },
							footer: [{ label: forestStakeTitle('INFO BUY RTP'), value: forestStakeTitle('INFO BUY RTP_VALUE') }],
						},
						{
							title: forestStakeTitle('INFO BUY ALLIN TITLE'),
							text: forestStakeTitle('INFO BUY ALLIN TEXT'),
							theme: 'gold',
							icon: `${infoDir}/buy_allin.webp`,
							metric: { label: forestStakeTitle('INFO BUY COST'), value: '400x BET' },
							footer: [{ label: forestStakeTitle('INFO BUY RTP'), value: forestStakeTitle('INFO BUY RTP_VALUE') }],
						},
					],
				},
				{
					kind: 'cards',
					frame: infoFrame,
					background: infoPanelBg,
					title: forestStakeTitle('INFO GENERAL TITLE'),
					cards: [
						{ icon: `${infoDir}/icon_interrupted.webp`, title: forestStakeTitle('INFO INTERRUPTED TITLE'), text: forestStakeTitle('INFO INTERRUPTED TEXT') },
						{ icon: `${infoDir}/icon_legal.webp`, title: forestStakeTitle('INFO LEGAL TITLE'), text: forestStakeTitle('INFO LEGAL TEXT') },
					],
				},
			],
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
				<BonusSymbolPanel />
				<GlobalMultiplier />
				<DealItMultiplierPanel />
				<ExpandedSymbolPresenter />
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
