<script lang="ts">
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
	const bgSrc   = './assets/components/backgrounds/splash.jpg?v=20260622';
	const logoSrc = './assets/components/ui/forest_gang_logo.png';
	// Big gold values stay as images (stylised); everything else is localizable text.
	const valExpanding = './assets/components/splash/feat_value_expanding.png?v=20260626b';
	const valEpic      = './assets/components/splash/feat_value_epic.png?v=20260626b';

	function handlePress() { props.onpress(); }
	function handleKey(e: KeyboardEvent) { if (e.code === 'Space' || e.code === 'Enter') handlePress(); }
</script>

<svelte:window onkeydown={handleKey} />

<div class="splash-intro" role="button" tabindex="0" onclick={handlePress} onkeydown={handleKey}>
	<!-- 16:9 stage that cover-scales the artwork; overlays are positioned within it
	     so they stay locked to the boards at any viewport aspect ratio. -->
	<div class="stage" style={`background-image: url('${bgSrc}')`}>
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

	.logo {
		position: absolute;
		left: 50%;
		top: 3%;
		transform: translateX(-50%);
		width: 19.8%;
		object-fit: contain;
		filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.7));
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
	.feat-left   { left: 27.6%; top: 59%; }
	.feat-center { left: 49.8%; top: 59%; }
	.feat-right  { left: 70.7%; top: 59%; }

	/* Titles */
	.f-title {
		font-weight: 900;
		font-size: 1.9cqw;
		line-height: 1.0;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		white-space: pre; /* honour the explicit line break, never auto-wrap */
		filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.7));
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
	.f-pre { white-space: pre-line; }

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
	.f-hl-sm { font-size: 1.25cqw; }

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

	/* Colour fills */
	.f-green {
		background: linear-gradient(180deg, #b6ea5b 6%, #7fc62a 52%, #4e9410 100%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
	}
	.f-gold {
		background: linear-gradient(180deg, #f3e98f 10%, #fbc40b 55%, #d97e03 96%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
	}
	.f-purple {
		background: linear-gradient(180deg, #e6bcff 6%, #c074ee 50%, #9a37d6 100%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
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

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50%      { opacity: 0.5; }
	}
</style>
