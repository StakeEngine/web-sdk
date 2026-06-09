<script lang="ts">
	import { Sprite, type SpineTrackProps } from 'pixi-svelte';

	import { SYMBOL_W, SYMBOL_H, BOARD_DIMENSIONS } from '../game/constants';
	import { getSymbolInfo } from '../game/utils';
	import SymbolSpineMain from './SymbolSpineMain.svelte';

	type Props = {
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		x?: number;
		y?: number;
		listener: SpineTrackProps['listener'];
		showWinFrame: boolean;
		loop?: boolean;
	};

	const props: Props = $props();
</script>

<!-- main -->
<SymbolSpineMain
	x={props.x}
	y={props.y}
	symbolInfo={props.symbolInfo}
	listener={props.listener}
	loop={props.loop}
/>

<!-- tumble frame -->
{#if props.showWinFrame}
	<Sprite
		x={props.x}
		y={props.y}
		key="Frame_TumbleWin.png"
		anchor={{ x: 0.5, y: 0.5 }}
		width={SYMBOL_W * 0.95}
		height={SYMBOL_H * BOARD_DIMENSIONS.y * 0.95}
	/>
{/if}
