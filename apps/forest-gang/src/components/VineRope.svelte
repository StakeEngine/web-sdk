<script lang="ts">
	import { MeshRope, Graphics, Container, Point } from 'pixi.js';
	import { GlowFilter } from 'pixi-filters';
	import { getContextParent, getContextApp } from 'pixi-svelte';

	type Props = {
		waypoints: Array<{ x: number; y: number }>;
		color: number;
		progress: number;
		vineH: number;
	};

	const props: Props = $props();
	const parentContext = getContextParent();
	const appContext = getContextApp();

	const texture = appContext.stateApp.loadedAssets?.['vineLineTexture'];
	if (!texture) {
		console.error('VineRope: vineLineTexture not loaded');
	}
	const ropePoints = props.waypoints.map((p) => new Point(p.x, p.y));

	const maskGraphics = new Graphics();
	const rope = texture ? new MeshRope({ texture, points: ropePoints }) : null;
	const container = new Container();
	container.addChild(maskGraphics);
	if (rope) {
		rope.mask = maskGraphics;
		container.addChild(rope);
		container.filters = [
			new GlowFilter({ color: props.color, distance: 6, outerStrength: 2, innerStrength: 0, quality: 0.5 }),
		];
	}

	parentContext.addToParent(container);

	const minX = Math.min(...props.waypoints.map((p) => p.x));
	const maxX = Math.max(...props.waypoints.map((p) => p.x));
	const minY = Math.min(...props.waypoints.map((p) => p.y));
	const maxY = Math.max(...props.waypoints.map((p) => p.y));
	const pad = props.vineH * 2;

	// Reveal mask grows left → right as progress increases
	$effect(() => {
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
