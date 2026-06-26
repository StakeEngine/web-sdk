<script lang="ts">
	const heroUrl = './assets/components/backgrounds/visual_v2.png';
	const scatterUrl = './assets/components/symbols/scatter.png';
</script>

<div class="branding-overlay">
	<div class="hero-card">
		<img src={heroUrl} alt="Magnetic hero art" />
		<div class="hero-copy">
			<div class="title">Magnetic</div>
			<div class="subtitle">7x7 cluster pay · magnet respins</div>
		</div>
	</div>

	<div class="scatter-chip">
		<img src={scatterUrl} alt="Magnetic scatter symbol" />
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

	.scatter-chip {
		position: absolute;
		left: 1rem;
		top: 6.25rem;
		width: min(12vw, 5.5rem);
		height: min(12vw, 5.5rem);
		background: radial-gradient(circle, rgba(64, 32, 12, 0.92), rgba(17, 8, 4, 0.7));
		border-radius: 999px;
		padding: 0.35rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	}

	.scatter-chip img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 999px;
	}

	@media (max-width: 900px) {
		.hero-card {
			width: min(38vw, 12rem);
			top: 0.75rem;
			right: 0.75rem;
		}

		.scatter-chip {
			left: auto;
			right: 0.75rem;
			top: auto;
			bottom: 7rem;
			width: 4rem;
			height: 4rem;
		}
	}
</style>
