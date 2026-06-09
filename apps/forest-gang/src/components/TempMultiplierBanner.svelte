<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { BitmapText, Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const multiplier = $derived(context.stateGame.tempMultiplier);
	const show = $derived(multiplier !== null && context.stateGame.bonusMode === 'freegame');
	const position = $derived({
		x: context.stateGameDerived.boardLayout().x + (context.stateGameDerived.boardLayout().width * 0.5 + SYMBOL_SIZE * 0.2) * context.stateGameDerived.boardLayout().boardScale,
		y: context.stateGameDerived.boardLayout().y - context.stateGameDerived.boardLayout().height * 0.4 * context.stateGameDerived.boardLayout().boardScale,
	});
</script>

{#if show}
	<MainContainer>
		<Container x={position.x} y={position.y} pivot={{ x: 80, y: 28 }}>
			<Rectangle width={160} height={56} backgroundColor={0x3a1f5d} alpha={0.95} radius={12} />
			<BitmapText x={80} y={16} anchor={{ x: 0.5, y: 0 }} text={`TEMP x${multiplier}`} style={{ fontFamily: 'gold', fontSize: 20 }} />
		</Container>
	</MainContainer>
{/if}
