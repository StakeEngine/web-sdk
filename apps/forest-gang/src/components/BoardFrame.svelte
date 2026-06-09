<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
</script>

<Rectangle
	x={board.x - (board.width * 0.5 + SYMBOL_SIZE * 0.08) * board.boardScale}
	y={board.y - (board.height * 0.5 + SYMBOL_SIZE * 0.08) * board.boardScale}
	width={(board.width + SYMBOL_SIZE * 0.16) * board.boardScale}
	height={(board.height + SYMBOL_SIZE * 0.16) * board.boardScale}
	backgroundColor={0x1b150e}
	alpha={0.22}
	radius={0}
/>
