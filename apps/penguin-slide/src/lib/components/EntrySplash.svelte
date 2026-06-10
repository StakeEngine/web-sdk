<script lang="ts">
	import { onMount } from 'svelte';

	export let visible = false;
	export let backgroundSrc = '';
	export let logoSrc = '';
	export let partnerLogoSrc = '';
	export let centerLandscapeSrc = '';
	export let centerPortraitSrc = '';
	export let alt = 'Enter game';
	export let hintLabel = 'CLICK TO CONTINUE';
	export let overlayOnly = false;
	export let onEnter: () => void | Promise<void> = () => {};

	let entering = false;
	let canvasEl: HTMLCanvasElement | null = null;
	let frameId = 0;
	let dpr = 1;
	let loaded = false;
	let loading = false;
	let viewW = 0;
	let viewH = 0;
	const imgCenterLandscape = new Image();
	const imgCenterPortrait = new Image();

	const imgBg = new Image();
	const imgSlide = new Image();
	const imgLogo = new Image();
	const imgPartner = new Image();

	function fitCover(srcW: number, srcH: number, dstW: number, dstH: number) {
		const srcRatio = srcW / srcH;
		const dstRatio = dstW / dstH;
		let drawW = dstW;
		let drawH = dstH;
		let offX = 0;
		let offY = 0;
		if (srcRatio > dstRatio) {
			drawH = dstH;
			drawW = drawH * srcRatio;
			offX = (dstW - drawW) * 0.5;
		} else {
			drawW = dstW;
			drawH = drawW / srcRatio;
			offY = (dstH - drawH) * 0.5;
		}
		return { drawW, drawH, offX, offY };
	}

	function render() {
		if (!canvasEl || !visible || !loaded) return;
		const rect = canvasEl.getBoundingClientRect();
		const w = Math.max(1, Math.round(rect.width));
		const h = Math.max(1, Math.round(rect.height));
		viewW = w;
		viewH = h;
		dpr = Math.max(1, window.devicePixelRatio || 1);
		canvasEl.width = Math.round(w * dpr);
		canvasEl.height = Math.round(h * dpr);
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		ctx.fillStyle = '#0b1220';
		ctx.fillRect(0, 0, w, h);

		if (imgBg.naturalWidth) {
			const r = fitCover(imgBg.naturalWidth, imgBg.naturalHeight, w, h);
			ctx.drawImage(imgBg, r.offX, r.offY, r.drawW, r.drawH);
		}

		const landscape = w > h;
		const centerImg = landscape ? imgCenterLandscape : imgCenterPortrait;
		if (centerImg.naturalWidth) {
			const r = fitCover(centerImg.naturalWidth, centerImg.naturalHeight, w, h);
			ctx.drawImage(centerImg, r.offX, r.offY, r.drawW, r.drawH);
			return;
		}
		const penguinScale = landscape ? Math.max(0.72, Math.min(1, h / 520)) : Math.max(0.8, Math.min(1, w / 720));

		if (imgSlide.naturalWidth) {
			const sw = 642;
			const sh = 762;
			const dx = w * 0.5;
			const targetH = h * (landscape ? 0.62 : 0.54);
			const dw = targetH * (sw / sh) * penguinScale;
			const dh = targetH * penguinScale;
			const x = dx - dw * 0.5;
			const y = h - dh * (landscape ? 1.03 : 1);
			ctx.drawImage(imgSlide, 2, 2, sw, sh, x, y, dw, dh);
		}

		let mainLogoRect:
			| {
					x: number;
					y: number;
					w: number;
					h: number;
			  }
			| undefined;

		if (imgLogo.naturalWidth) {
			const logoScale = landscape
				? Math.max(0.56, Math.min(1, h / 420))
				: Math.max(0.64, Math.min(1, w / 520));
			const mainW = Math.min(w * 0.36, imgLogo.naturalWidth * 0.47 * logoScale);
			const mainH = (mainW / imgLogo.naturalWidth) * imgLogo.naturalHeight;
			const mainX = w * 0.5 - mainW * 0.5;
			const mainY = h * (landscape ? 0.225 : 0.235);
			mainLogoRect = { x: mainX, y: mainY, w: mainW, h: mainH };
			ctx.drawImage(imgLogo, mainX, mainY, mainW, mainH);
		}

		if (imgPartner.naturalWidth) {
			const partnerScale = landscape
				? Math.max(0.5, Math.min(1, h / 430))
				: Math.max(0.6, Math.min(1, w / 560));
			const partnerBaseW = mainLogoRect ? mainLogoRect.w * 0.46 : w * 0.19;
			const partnerW = Math.min(partnerBaseW, imgPartner.naturalWidth * 0.145 * partnerScale);
			const partnerH = (partnerW / imgPartner.naturalWidth) * imgPartner.naturalHeight;
			const partnerX = w * 0.5 - partnerW * 0.5;
			const partnerY = mainLogoRect ? mainLogoRect.y - partnerH - h * 0.02 : h * 0.08;
			ctx.drawImage(imgPartner, partnerX, partnerY, partnerW, partnerH);
		}

		/* center layer already contains logos/penguin/ice composition */

		/* logos come from center splash layer now */
	}

	function scheduleRender() {
		cancelAnimationFrame(frameId);
		frameId = requestAnimationFrame(render);
	}

	async function loadAssets() {
		if (loading) return;
		loading = true;
		const jobs: Promise<void>[] = [];
		const load = (img: HTMLImageElement, src: string) =>
			new Promise<void>((resolve) => {
				img.onload = () => resolve();
				img.onerror = () => resolve();
				img.src = src;
			});
		if (backgroundSrc) jobs.push(load(imgBg, backgroundSrc));
		if (centerLandscapeSrc) jobs.push(load(imgCenterLandscape, centerLandscapeSrc));
		if (centerPortraitSrc) jobs.push(load(imgCenterPortrait, centerPortraitSrc));
		jobs.push(load(imgSlide, '/assets/spine/slide/slide.png'));
		if (logoSrc) jobs.push(load(imgLogo, logoSrc));
		if (partnerLogoSrc) jobs.push(load(imgPartner, partnerLogoSrc));
		await Promise.all(jobs);
		loaded = true;
		loading = false;
		scheduleRender();
	}

	$: if (visible && !loaded && !overlayOnly) {
		void loadAssets();
	}

	$: if (visible && loaded && !overlayOnly) {
		scheduleRender();
	}

	onMount(() => {
		if (!overlayOnly) void loadAssets();
		const onResize = () => {
			if (!overlayOnly) scheduleRender();
		};
		window.addEventListener('resize', onResize);
		return () => {
			window.removeEventListener('resize', onResize);
			cancelAnimationFrame(frameId);
		};
	});

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
		{#if !overlayOnly}
			<canvas class="entry-splash-canvas" bind:this={canvasEl} aria-hidden="true"></canvas>
		{/if}
		{#if overlayOnly}
			<div class="entry-splash-overlay">
				{#if partnerLogoSrc}
					<img class="entry-splash-partner" src={partnerLogoSrc} alt="" aria-hidden="true" />
				{/if}
				{#if logoSrc}
					<img class="entry-splash-logo" src={logoSrc} alt="" aria-hidden="true" />
				{/if}
			</div>
		{/if}
		<div class="entry-splash-hint">{hintLabel}</div>
	</button>
{/if}

<style>
	.entry-splash {
		appearance: none;
		-webkit-appearance: none;
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100dvh;
		z-index: 21000;
		padding: 0;
		border: 0;
		border-radius: 0;
		outline: none;
		box-shadow: none;
		background: transparent;
		cursor: pointer;
		display: block;
		overflow: hidden;
		box-sizing: border-box;
		background: transparent;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.entry-splash-canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	.entry-splash-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.entry-splash-logo {
		position: absolute;
		left: 50%;
		top: 24%;
		transform: translateX(-50%);
		width: min(32vw, 380px);
		height: auto;
	}

	.entry-splash-partner {
		position: absolute;
		left: 50%;
		top: calc(24% - min(11vw, 108px));
		transform: translateX(-50%);
		width: min(20vw, 220px);
		height: auto;
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
		z-index: 4;
	}

	@media (max-width: 700px), (orientation: portrait) {
		.entry-splash-logo {
			width: min(88vw, 900px);
			top: 35%;
		}

		.entry-splash-partner {
			width: min(65vw, 700px);
			top: calc(27% - min(26vw, 260px));
		}

		.entry-splash-hint {
			bottom: calc(28px + env(safe-area-inset-bottom, 0px));
			font-size: 15px;
		}
	}

	@media (orientation: landscape) and (max-height: 700px) and (max-width: 1100px) {
		.entry-splash-logo {
			width: min(24vw, 280px);
			top: 16%;
		}

		.entry-splash-partner {
			width: min(14vw, 150px);
			top: calc(21% - min(10vw, 96px));
		}
	}

	@media (min-width: 1101px) and (orientation: landscape) {
		.entry-splash-logo {
			width: min(40vw, 460px);
			top: calc(20% + 12px);
		}

		.entry-splash-partner {
			width: min(27vw, 290px);
			top: calc(14% - min(13vw, 124px));
		}
	}
</style>
