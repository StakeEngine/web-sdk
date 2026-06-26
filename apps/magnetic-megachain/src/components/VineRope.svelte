<script lang="ts">
	import { Graphics, Container } from 'pixi.js';
	import { getContextParent } from 'pixi-svelte';
	import { onDestroy } from 'svelte';
	import { GlowFilter } from 'pixi-filters';

	type Props = {
		waypoints: Array<{ x: number; y: number }>;
		color: number;
		progress: number;
		vineH: number;
	};

	const props: Props = $props();
	const parentContext = getContextParent();

	const line = new Graphics();
	const maskGraphics = new Graphics();
	const container = new Container();
	container.addChild(line);
	line.mask = maskGraphics;
	container.addChild(maskGraphics);
	container.alpha = 0.75;
	container.filters = [new GlowFilter({ distance: 10, outerStrength: 3, innerStrength: 0, color: props.color, alpha: 0.9, quality: 0.3 })];

	parentContext.addToParent(container);

	onDestroy(() => {
		container.parent?.removeChild(container);
		container.destroy({ children: true });
	});

	$effect(() => {
		// Recompute extents inside effect so mask stays correct when waypoints change (cycling paylines)
		const minX = Math.min(...props.waypoints.map((p) => p.x));
		const maxX = Math.max(...props.waypoints.map((p) => p.x));
		const minY = Math.min(...props.waypoints.map((p) => p.y));
		const maxY = Math.max(...props.waypoints.map((p) => p.y));
		const pad = props.vineH * 2;

		line.clear();
		line.setStrokeStyle({ width: 3, color: props.color, alpha: 1 });
		line.moveTo(props.waypoints[0].x, props.waypoints[0].y);
		for (let i = 1; i < props.waypoints.length; i++) {
			line.lineTo(props.waypoints[i].x, props.waypoints[i].y);
		}
		line.stroke();

		maskGraphics.clear();
		maskGraphics.beginFill(0xffffff);
		maskGraphics.rect(
			minX - pad,
			minY - pad,
			(maxX - minX + pad * 2) * props.progress,
			maxY - minY + pad * 2,
		);
		maskGraphics.endFill();
	});
</script>
