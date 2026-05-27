<script lang="ts">
	import { Rectangle } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
</script>

<MainContainer zIndex={5}>
	<Rectangle
		x={board.x - board.width * 0.5 - SYMBOL_SIZE * 0.08}
		y={board.y - board.height * 0.5 - SYMBOL_SIZE * 0.08}
		width={board.width + SYMBOL_SIZE * 0.16}
		height={board.height + SYMBOL_SIZE * 0.16}
		backgroundColor={0x1b150e}
		alpha={0.22}
		radius={20}
	/>
</MainContainer>
