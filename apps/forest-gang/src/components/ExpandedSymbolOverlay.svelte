<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { BitmapText, Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getSymbolX } from '../game/utils';

	const context = getContext();
	const expanded = $derived(context.stateGame.expandedSymbol);
</script>

{#if expanded}
	<MainContainer>
		<Container x={context.stateGameDerived.boardLayout().x} y={context.stateGameDerived.boardLayout().y} pivot={context.stateGameDerived.boardLayout().pivot}>
			{#each expanded.reels as reelIndex}
				<Rectangle x={getSymbolX(reelIndex) - SYMBOL_SIZE * 0.5} y={0} width={SYMBOL_SIZE} height={context.stateGameDerived.boardLayout().height} backgroundColor={0x6aa84f} alpha={0.2} radius={12} />
				<BitmapText x={getSymbolX(reelIndex)} y={18} anchor={{ x: 0.5, y: 0 }} text={expanded.symbol} style={{ fontFamily: 'gold', fontSize: 16 }} />
			{/each}
		</Container>
	</MainContainer>
{/if}
