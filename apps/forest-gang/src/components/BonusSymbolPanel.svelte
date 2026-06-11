<script lang="ts">
	import { BitmapText, Container, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const PANEL_WIDTH = SYMBOL_SIZE * 0.92;

	const context = getContext();
	const selectedSymbol = $derived(context.stateGame.selectedBonusSymbol);
	const mode = $derived(context.stateGame.bonusMode);
	const show = $derived(!!selectedSymbol && !!mode);
	const scale = $derived(context.stateLayoutDerived.isStacked() ? 1.28 : 1);
	const position = $derived(
		context.stateLayoutDerived.isStacked()
			? {
					// Portrait: above board, centered
					x: context.stateGameDerived.boardLayout().width * 0.5,
					y: -SYMBOL_SIZE * 0.6,
			  }
			: {
					// Desktop/landscape: centered above multiplier panel
					x: context.stateGameDerived.boardLayout().width - PANEL_WIDTH * 0.12 - 50,
					y: SYMBOL_SIZE * 0.3,
			  },
	);
	const modeLabel = $derived(mode === 'superspin' ? 'ALL IN' : mode === 'feature' ? 'FEATURE' : 'DEAL IT');
</script>

<BoardContainer>
	<FadeContainer {show}>
		<Container
			x={position.x}
			y={position.y}
			{scale}
			pivot={{ x: PANEL_WIDTH * 0.5, y: PANEL_WIDTH * 0.25 }}
		>
			<Sprite
				key="Frame_FSCounter.png"
				width={PANEL_WIDTH}
				height={PANEL_WIDTH * 0.72}
			/>
			<BitmapText anchor={{ x: 0.5, y: 0 }} x={PANEL_WIDTH * 0.5} y={7} text={modeLabel} style={{ fontFamily: 'gold', fontSize: 18 }} />
			<BitmapText anchor={{ x: 0.5, y: 0 }} x={PANEL_WIDTH * 0.5} y={34} text={`${selectedSymbol ?? ""}`} style={{ fontFamily: 'gold', fontSize: 16 }} />
		</Container>
	</FadeContainer>
</BoardContainer>
