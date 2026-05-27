<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { BitmapText, Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const show = $derived(context.stateGame.bonusMode === 'superspin');
	const multipliers = $derived(context.stateGame.reelMultipliers);
	const position = $derived({
		x: context.stateGameDerived.boardLayout().x,
		y: context.stateGameDerived.boardLayout().y + context.stateGameDerived.boardLayout().height * 0.5 + SYMBOL_SIZE * 0.35,
	});
</script>

{#if show}
	<MainContainer>
		<Container x={position.x} y={position.y} pivot={{ x: 230, y: 34 }}>
			<Rectangle width={460} height={68} backgroundColor={0x1b0f0f} alpha={0.92} radius={14} />
			<BitmapText x={16} y={18} text={'REEL MULTS'} style={{ fontFamily: 'gold', fontSize: 18 }} />
			{#each multipliers as multiplier, reelIndex}
				<BitmapText x={155 + reelIndex * 58} y={18} text={`R${reelIndex + 1}:${multiplier}x`} style={{ fontFamily: 'gold', fontSize: 18 }} />
			{/each}
		</Container>
	</MainContainer>
{/if}
