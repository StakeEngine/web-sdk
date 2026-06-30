<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	const BACKGROUND_ASPECT = 1920 / 1080;
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());

	// Themed bonus backgrounds: green forest for the normal bonus (Deal It / freegame),
	// golden forest for the super bonus (All In / superspin); everything else keeps the default.
	const backgroundKey = $derived.by(() => {
		switch (context.stateGame.bonusMode) {
			case 'freegame':
				return 'bonusNormalBackground';
			case 'superspin':
				return 'bonusSuperBackground';
			default:
				return 'visualV2';
		}
	});
	const cover = $derived.by(() => {
		const width = canvas.width;
		const height = canvas.height;
		const canvasAspect = width / height;

		if (canvasAspect > BACKGROUND_ASPECT) {
			return { width, height: width / BACKGROUND_ASPECT };
		}

		return { width: height * BACKGROUND_ASPECT, height };
	});
</script>

<Sprite
	key={backgroundKey}
	x={canvas.width * 0.5}
	y={canvas.height * 0.5}
	anchor={0.5}
	width={cover.width}
	height={cover.height}
	alpha={0.96}
/>
<Rectangle {...canvas} backgroundColor={0x050407} alpha={0.2} zIndex={-2} />
<Rectangle {...canvas} backgroundColor={0x000000} alpha={0.18} zIndex={-1} />
