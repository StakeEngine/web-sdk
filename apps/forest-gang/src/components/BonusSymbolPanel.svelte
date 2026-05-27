<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { BitmapText, Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const selectedSymbol = $derived(context.stateGame.selectedBonusSymbol);
	const mode = $derived(context.stateGame.bonusMode);
	const show = $derived(!!selectedSymbol && !!mode);
	const position = $derived({
		x: context.stateGameDerived.boardLayout().x,
		y: context.stateGameDerived.boardLayout().y - context.stateGameDerived.boardLayout().height * 0.5 - SYMBOL_SIZE * 0.65,
	});
	const modeLabel = $derived(mode === 'superspin' ? 'ALL IN' : 'DEAL IT');
</script>

{#if show}
	<MainContainer>
		<Container x={position.x} y={position.y} pivot={{ x: 160, y: 40 }}>
			<Rectangle width={320} height={80} backgroundColor={0x102214} alpha={0.9} radius={16} />
			<BitmapText anchor={{ x: 0.5, y: 0 }} x={160} y={8} text={modeLabel} style={{ fontFamily: 'gold', fontSize: 24 }} />
			<BitmapText anchor={{ x: 0.5, y: 0 }} x={160} y={40} text={`EXPAND: ${selectedSymbol}`} style={{ fontFamily: 'gold', fontSize: 20 }} />
		</Container>
	</MainContainer>
{/if}
