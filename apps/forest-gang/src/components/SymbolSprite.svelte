<script lang="ts">
	import { Sprite, type SpriteProps } from 'pixi-svelte';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_H, SYMBOL_W } from '../game/constants';
	import { onMount } from 'svelte';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		oncomplete?: () => void;
	};

	const props: Props = $props();

	onMount(() => {
		props.oncomplete?.();
	});

	$effect(() => {
		props.symbolInfo;
		props.oncomplete?.();
	});
</script>

<Sprite
	x={props.x}
	y={props.y}
	anchor={0.5}
	key={props.symbolInfo.assetKey}
	width={SYMBOL_W * props.symbolInfo.sizeRatios.width}
	height={SYMBOL_H * props.symbolInfo.sizeRatios.height}
/>
