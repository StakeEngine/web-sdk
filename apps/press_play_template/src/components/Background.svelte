<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	// CHANGE ME: update to match your background image aspect ratio
	const BACKGROUND_ASPECT = 16 / 9;
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
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

<!-- CHANGE ME: replace 'background' with your actual background asset key from assets.ts -->
<Sprite
	key="background"
	x={canvas.width * 0.5}
	y={canvas.height * 0.5}
	anchor={0.5}
	width={cover.width}
	height={cover.height}
	alpha={0.96}
/>
<Rectangle {...canvas} backgroundColor={0x050407} alpha={0.2} zIndex={-2} />
<Rectangle {...canvas} backgroundColor={0x000000} alpha={0.18} zIndex={-1} />
