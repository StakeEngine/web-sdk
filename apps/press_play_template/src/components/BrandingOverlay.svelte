<script lang="ts">
	// CHANGE ME: update asset paths to match your game's branding assets
	const heroUrl = './assets/components/backgrounds/visual_v2.png';
	const scatterUrl = './assets/components/symbols/scatter.png';
</script>

<!-- CHANGE ME: replace with your game's branding overlay, or remove if not needed -->
<div class="branding-overlay">
	<div class="hero-card">
		<img src={heroUrl} alt="Game hero art" />
		<div class="hero-copy">
			<div class="title">Game Title</div>
			<div class="subtitle">5x3 slot</div>
		</div>
	</div>
</div>

<style>
	.branding-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 8;
	}

	.hero-card {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: min(22vw, 16rem);
		background: rgba(10, 18, 10, 0.82);
		border: 1px solid rgba(215, 176, 82, 0.5);
		border-radius: 1rem;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
	}

	.hero-card img {
		display: block;
		width: 100%;
		height: auto;
	}

	.hero-copy {
		padding: 0.6rem 0.8rem 0.8rem;
		color: #fff5cf;
		font-family: proxima-nova, sans-serif;
	}

	.title {
		font-size: 1rem;
		font-weight: 700;
	}

	.subtitle {
		font-size: 0.75rem;
		opacity: 0.9;
	}

	@media (max-width: 900px) {
		.hero-card {
			width: min(38vw, 12rem);
			top: 0.75rem;
			right: 0.75rem;
		}
	}
</style>
