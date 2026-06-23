<script lang="ts">
	type Props = { onpress: () => void };
	const props: Props = $props();

	// splash.jpg = forest + 5 characters holding 3 empty wooden boards (no logo, no text).
	const bgSrc   = './assets/components/backgrounds/splash.jpg?v=20260622';
	const logoSrc = './assets/components/ui/forest_gang_logo.png';
	// Pre-styled feature text graphics exported from the Figma design — placed on the boards.
	const featExpanding = './assets/components/splash/feat_expanding.png';
	const featBonus     = './assets/components/splash/feat_bonus.png';
	const featEpic      = './assets/components/splash/feat_epic.png';

	function handlePress() { props.onpress(); }
	function handleKey(e: KeyboardEvent) { if (e.code === 'Space' || e.code === 'Enter') handlePress(); }
</script>

<svelte:window onkeydown={handleKey} />

<div class="splash-intro" role="button" tabindex="0" onclick={handlePress} onkeydown={handleKey}>
	<!-- 16:9 stage that cover-scales the artwork; overlays are positioned within it
	     so they stay locked to the boards at any viewport aspect ratio. -->
	<div class="stage" style={`background-image: url('${bgSrc}')`}>
		<img class="logo" src={logoSrc} alt="Forest Gang" draggable="false" />

		<img class="feat feat-left"   src={featExpanding} alt="Expanding Reels — up to 1024x multiplier" draggable="false" />
		<img class="feat feat-center" src={featBonus}     alt="Bonus Game — 3 scatters to enter bonus, 4 for super bonus" draggable="false" />
		<img class="feat feat-right"  src={featEpic}      alt="Epic Win — become king of the forest with 25'000x max win" draggable="false" />

		<p class="press-label">PRESS TO CONTINUE →</p>
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

	/* Cover-scaled 16:9 stage (matches the 1920×1080 splash art). */
	.stage {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: max(100vw, calc(100vh * 16 / 9));
		height: max(100vh, calc(100vw * 9 / 16));
		background-size: 100% 100%;
		background-position: center;
		background-repeat: no-repeat;
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

	/* Feature text blocks — positioned by their centre, sized by height to fit each board. */
	.feat {
		position: absolute;
		transform: translate(-50%, -50%);
		object-fit: contain;
		filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.55));
		pointer-events: none;
	}

	.feat-left   { height: 20%; left: 28%;   top: 70%; }
	.feat-center { height: 20%; left: 50%;   top: 69%; }
	.feat-right  { height: 20%; left: 71.5%; top: 70%; }

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
