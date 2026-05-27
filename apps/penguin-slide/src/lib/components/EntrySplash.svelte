<script lang="ts">
	export let visible = false;
	export let landscapeSrc = '';
	export let portraitSrc = '';
	export let alt = 'Enter game';
	export let hintLabel = 'CLICK TO CONTINUE';
	export let onEnter: () => void | Promise<void> = () => {};

	let entering = false;

	async function activate() {
		if (entering) return;
		entering = true;
		try {
			await onEnter();
		} finally {
			entering = false;
		}
	}
</script>

{#if visible}
	<button
		type="button"
		class="entry-splash"
		aria-label={alt}
		onpointerdown={activate}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				void activate();
			}
		}}
	>
		<picture>
			<source media="(orientation: portrait)" srcset={portraitSrc} />
			<img class="entry-splash-image" src={landscapeSrc} {alt} />
		</picture>
		<div class="entry-splash-hint">{hintLabel}</div>
	</button>
{/if}

<style>
	.entry-splash {
		appearance: none;
		-webkit-appearance: none;
		position: fixed;
		left: var(--game-body-left, 0px);
		top: var(--game-body-top, 0px);
		width: var(--game-body-w, 100vw);
		height: var(--game-body-h, 100vh);
		z-index: 21000;
		padding: 0;
		border: 0;
		border-radius: 0;
		outline: none;
		box-shadow: none;
		background: #0b1220;
		cursor: pointer;
		display: block;
		width: var(--game-body-w, 100vw);
		height: var(--game-body-h, 100vh);
		overflow: hidden;
		box-sizing: border-box;
	}

	.entry-splash picture,
	.entry-splash-image {
		display: block;
		width: 100%;
		height: 100%;
	}

	.entry-splash-image {
		object-fit: cover;
		object-position: center;
		background: #0b1220;
	}

	@media (orientation: landscape) and (hover: none) and (pointer: coarse) {
		.entry-splash-image {
			object-fit: contain;
		}
	}

	.entry-splash-hint {
		position: absolute;
		left: 50%;
		bottom: calc(64px + env(safe-area-inset-bottom, 0px));
		transform: translateX(-50%);
		color: #fff;
		font: 800 18px/1 'Poppins', sans-serif;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-shadow: -2px -2px 0 #000, 0 -2px 0 #000, 2px -2px 0 #000, -2px 0 0 #000, 2px 0 0 #000, -2px 2px 0 #000,
			0 2px 0 #000, 2px 2px 0 #000;
		pointer-events: none;
		white-space: nowrap;
	}

	@media (max-width: 700px), (orientation: portrait) {
		.entry-splash-hint {
			bottom: calc(34px + env(safe-area-inset-bottom, 0px));
			font-size: 15px;
		}
	}
</style>
