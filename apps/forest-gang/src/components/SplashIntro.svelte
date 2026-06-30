<script lang="ts">
	import { onMount } from 'svelte';
	import { stateI18nDerived } from 'state-shared';

	type Props = { onpress: () => void };
	const props: Props = $props();

	const t = (key: string) => stateI18nDerived.translate(key);

	// Split a leading number ("3 scatters…") so it can be coloured gold.
	const splitNum = (s: string): [string, string] => {
		const m = s.match(/^(\s*\d[\d.,']*)([\s\S]*)$/);
		return m ? [m[1], m[2]] : ['', s];
	};
	const bonusTop = $derived(splitNum(t('SPLASH BONUS TOP')));
	const bonusMid = $derived(splitNum(t('SPLASH BONUS MID')));

	// splash.jpg = forest + 5 characters holding 3 empty wooden boards (no logo, no text).
	const bgSrc = './assets/components/backgrounds/splash.jpg?v=20260630';
	// Portrait artwork: the gang holding a single central board (for the mobile carousel).
	const bgMobileSrc = './assets/components/backgrounds/splash_mobile.jpg?v=20260630';
	const logoSrc = './assets/components/ui/forest_gang_logo.png';
	const brandSrc = './assets/components/ui/press_play_logo.png?v=20260630';
	// Big gold values stay as images (stylised); everything else is localizable text.
	const valExpanding = './assets/components/splash/feat_value_expanding.png?v=20260626b';
	const valEpic = './assets/components/splash/feat_value_epic.png?v=20260626b';

	// Mobile = portrait viewport: show the three feature blocks one at a time, 3s each.
	let isPortrait = $state(false);
	let slide = $state(0);
	const SLIDE_COUNT = 3;
	const updateOrientation = () => (isPortrait = window.innerWidth < window.innerHeight);

	onMount(updateOrientation);

	$effect(() => {
		if (!isPortrait) {
			slide = 0;
			return;
		}
		const id = setInterval(() => (slide = (slide + 1) % SLIDE_COUNT), 3000);
		return () => clearInterval(id);
	});

	function handlePress() {
		props.onpress();
	}
	function handleKey(e: KeyboardEvent) {
		if (e.code === 'Space' || e.code === 'Enter') handlePress();
	}
</script>

<svelte:window onkeydown={handleKey} onresize={updateOrientation} />

<div class="splash-intro" role="button" tabindex="0" onclick={handlePress} onkeydown={handleKey}>
	{#if isPortrait}
		<!-- Mobile / portrait: single central board, one feature block at a time. -->
		<div class="stage stage--mobile" style={`background-image: url('${bgMobileSrc}')`}>
			<img class="brand brand--m" src={brandSrc} alt="Press Play" draggable="false" />
			<img class="logo logo--m" src={logoSrc} alt="Forest Gang" draggable="false" />

			<div class="feat feat-m">
				{#if slide === 0}
					<!-- EPIC WIN -->
					<div class="f-title f-purple">{t('SPLASH EPIC TITLE')}</div>
					<div class="f-sub f-pre">{t('SPLASH EPIC TOP')}</div>
					<img class="f-value" src={valEpic} alt="25'000x" draggable="false" />
					<div class="f-hl f-gold">{t('SPLASH EPIC BOTTOM')}</div>
				{:else if slide === 1}
					<!-- BONUS GAME -->
					<div class="f-title f-gold">{t('SPLASH BONUS TITLE')}</div>
					<div class="f-sub f-pre"><span class="f-num f-gold">{bonusTop[0]}</span>{bonusTop[1]}</div>
					<div class="f-divider"></div>
					<div class="f-sub"><span class="f-num f-gold">{bonusMid[0]}</span>{bonusMid[1]}</div>
					<div class="f-hl f-gold">{t('SPLASH BONUS HL')}</div>
				{:else}
					<!-- EXPANDING REELS -->
					<div class="f-title f-green">{t('SPLASH EXP TITLE')}</div>
					<div class="f-sub">{t('SPLASH EXP TOP')}</div>
					<img class="f-value" src={valExpanding} alt="1024x" draggable="false" />
					<div class="f-sub">{t('SPLASH EXP BOTTOM')}</div>
				{/if}
			</div>

			<div class="dots">
				{#each Array(SLIDE_COUNT) as _, i}
					<span class="dot" class:dot--on={slide === i}></span>
				{/each}
			</div>

			<p class="press-label press-label--m">{t('SPLASH PRESS')} →</p>
		</div>
	{:else}
		<!-- Desktop / landscape: 16:9 stage with all three boards. -->
		<div class="stage" style={`background-image: url('${bgSrc}')`}>
			<img class="brand" src={brandSrc} alt="Press Play" draggable="false" />
			<img class="logo" src={logoSrc} alt="Forest Gang" draggable="false" />

			<!-- EXPANDING REELS -->
			<div class="feat feat-left">
				<div class="f-title f-green">{t('SPLASH EXP TITLE')}</div>
				<div class="f-sub">{t('SPLASH EXP TOP')}</div>
				<img class="f-value" src={valExpanding} alt="1024x" draggable="false" />
				<div class="f-sub">{t('SPLASH EXP BOTTOM')}</div>
			</div>

			<!-- BONUS GAME -->
			<div class="feat feat-center">
				<div class="f-title f-gold">{t('SPLASH BONUS TITLE')}</div>
				<div class="f-sub f-pre"><span class="f-num f-gold">{bonusTop[0]}</span>{bonusTop[1]}</div>
				<div class="f-divider"></div>
				<div class="f-sub"><span class="f-num f-gold">{bonusMid[0]}</span>{bonusMid[1]}</div>
				<div class="f-hl f-gold">{t('SPLASH BONUS HL')}</div>
			</div>

			<!-- EPIC WIN -->
			<div class="feat feat-right">
				<div class="f-title f-purple">{t('SPLASH EPIC TITLE')}</div>
				<div class="f-sub f-pre">{t('SPLASH EPIC TOP')}</div>
				<img class="f-value" src={valEpic} alt="25'000x" draggable="false" />
				<div class="f-hl f-gold f-hl-sm">{t('SPLASH EPIC BOTTOM')}</div>
			</div>

			<p class="press-label">{t('SPLASH PRESS')} →</p>
		</div>
	{/if}
</div>

<style>
	.splash-intro {
		position: absolute;
		inset: 0;
		z-index: 10;
		cursor: pointer;
		outline: none;
		user-select: none;
		overflow: hidden;
		background: #060a06;
	}

	/* Height-fit 16:9 stage (full artwork height always visible; width follows). */
	.stage {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		height: 100vh;
		width: calc(100vh * 16 / 9);
		background-size: 100% 100%;
		background-position: center;
		background-repeat: no-repeat;
		container-type: size;
	}

	/* Portrait stage: a fixed-aspect box matching the artwork (1080×2400) that fills the viewport
	   width; the bg fills the box exactly (100% 100%, inherited) so overlays stay locked to the
	   board regardless of viewport aspect (the height overflows slightly and is centre-cropped). */
	.stage--mobile {
		width: 100vw;
		height: calc(100vw * 2400 / 1080);
	}

	/* Studio logo, centred at the very top, above the game logo. */
	.brand {
		position: absolute;
		left: 50%;
		top: 2.5%;
		transform: translateX(-50%);
		width: 11%;
		object-fit: contain;
		filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.7));
	}

	.logo {
		position: absolute;
		left: 50%;
		top: 9.5%;
		transform: translateX(-50%);
		width: 19.8%;
		object-fit: contain;
		filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.7));
	}

	/* Mobile logo sizing/placement (wider % since the stage is narrow). */
	.brand--m {
		top: 8.5%;
		width: 30%;
	}
	.logo--m {
		top: 13%;
		width: 52%;
	}

	/* Feature text blocks — positioned by their centre over each board. */
	.feat {
		position: absolute;
		transform: translateX(-50%);
		width: 15%;
		height: 20%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		text-align: center;
		pointer-events: none;
		font-family: 'Cinzel', serif;
	}

	/* Top-anchored so the titles line up across all three boards. */
	.feat-left {
		left: 27.6%;
		top: 59%;
	}
	.feat-center {
		left: 49.8%;
		top: 59%;
	}
	.feat-right {
		left: 70.7%;
		top: 59%;
	}

	/* Mobile: single feature block centred on the lower board (board centre ≈ 49.4% of the art). */
	.feat-m {
		left: 49.4%;
		top: 51%;
		width: 60%;
		height: 22%;
		justify-content: center;
		gap: 1.5cqw;
	}

	/* Titles */
	.f-title {
		font-weight: 900;
		font-size: 1.9cqw;
		line-height: 1.05;
		letter-spacing: 0.03em; /* 0.66px @ 22px */
		text-transform: uppercase;
		white-space: pre; /* honour the explicit line break, never auto-wrap */
		/* Figma: text-shadow 0 0 17px #000 — on gradient-clipped text this is a drop-shadow glow
		   (em-based so it scales with the title on both desktop and mobile). */
		filter: drop-shadow(0 0 0.7em #000);
	}

	/* White descriptive lines — serif with real lowercase (Cinzel is caps-only) */
	.f-sub {
		font-family: 'EB Garamond', Georgia, serif;
		font-weight: 600;
		font-size: 1.3cqw;
		line-height: 1.18;
		color: #f4ecdf;
		text-shadow: 0 2px 5px rgba(0, 0, 0, 0.75);
	}
	.f-pre {
		white-space: pre-line;
	}

	/* Gold leading numbers in the bonus lines (3 / 4) */
	.f-num {
		font-weight: 700;
		font-size: 1.4em;
	}

	/* Gold highlight sub-labels (SUPER BONUS / MAX WIN) */
	.f-hl {
		font-weight: 900;
		font-size: 1.5cqw;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		white-space: nowrap;
		filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.7));
	}
	.f-hl-sm {
		font-size: 1.25cqw;
	}

	/* Big gold value images */
	.f-value {
		width: 64%;
		object-fit: contain;
		margin: 0.1cqw 0;
		filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.55));
	}

	/* Thin divider on the bonus board */
	.f-divider {
		width: 55%;
		height: 2px;
		margin: 0.25cqw 0;
		background: linear-gradient(90deg, transparent, rgba(251, 197, 11, 0.7), transparent);
	}

	/* Mobile feature scale-up (cqw is % of the narrow portrait stage). */
	.feat-m .f-title {
		font-size: 5cqw;
	}
	.feat-m .f-sub {
		font-size: 3.8cqw;
	}
	.feat-m .f-hl {
		font-size: 4.5cqw;
	}
	.feat-m .f-value {
		width: 46%;
		margin: 1cqw 0;
	}
	.feat-m .f-divider {
		margin: 1cqw 0;
	}

	/* Colour fills (Figma feature gradients) */
	.f-green {
		background: linear-gradient(195deg, #a1cd03 17.75%, #9fca03 58.89%, #658000 100.04%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
	}
	.f-gold {
		background: linear-gradient(184deg, #ffa90e 15.26%, #ee960b 69.74%, #d18005 92.88%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
	}
	.f-purple {
		background: linear-gradient(201deg, #cf53f6 20.98%, #d561fa 41.39%, #bd39e7 61.81%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
	}

	/* Slide indicator dots (mobile) */
	.dots {
		position: absolute;
		left: 49.4%;
		top: 80%;
		transform: translateX(-50%);
		display: flex;
		gap: 2.4cqw;
		pointer-events: none;
	}
	.dot {
		width: 2cqw;
		height: 2cqw;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.35);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
	}
	.dot--on {
		background: #fbc503;
	}

	.press-label {
		position: absolute;
		left: 50%;
		top: 91%;
		transform: translate(-50%, -50%);
		margin: 0;
		white-space: nowrap;
		font-family: 'Cinzel', serif;
		font-weight: 900;
		font-size: clamp(15px, 1.9vw, 26px);
		letter-spacing: 0.06em;
		background: linear-gradient(180deg, #ece96d 18%, #fbc503 55%, #d97e03 92%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.8));
		animation: blink 1.6s ease-in-out infinite;
	}

	/* Mobile press label sits below the dots. */
	.press-label--m {
		top: 87%;
		font-size: clamp(16px, 4.4cqw, 30px);
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
