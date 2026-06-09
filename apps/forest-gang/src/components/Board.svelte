<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| { type: 'boardWithAnimateSymbols'; symbolPositions: Position[] };
</script>

<script lang="ts">
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { SYMBOL_W, SYMBOL_H, SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';
	import { spriteKeyByName, bonusSpriteKeyByName } from '../game/utils';
	import type { SymbolName } from '../game/types';

	const context = getContext();
	const board = $derived(context.stateGame.board);
	const layout = $derived(context.stateGameDerived.boardLayout());
	let show = $state(true);

	const activeMap = $derived(context.stateGame.bonusMode ? bonusSpriteKeyByName : spriteKeyByName);
	const getSpriteKey = (name: SymbolName) => activeMap[name] ?? 'aTile';

	const getX = (reelIndex: number) => SYMBOL_W * (reelIndex + 0.5);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => {
			const isAnticipating = context.stateGame.board.some((r) => r.reelState.anticipating);
			if (!isAnticipating) context.stateGameDerived.enhancedBoard.stop();
		},
		boardSettle: ({ board }) => context.stateGameDerived.enhancedBoard.settle(board),
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			for (const position of symbolPositions) {
				const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
				reelSymbol.symbolState = 'win';
			}
			await waitForTimeout(250);
			for (const position of symbolPositions) {
				const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
				reelSymbol.symbolState = 'postWinStatic';
			}
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<Container x={layout.x} y={layout.y} pivot={layout.pivot} scale={layout.boardScale}>
		<Graphics
			isMask
			draw={(graphics) => {
				graphics.beginFill(0xffffff);
				graphics.rect(0, 0, SYMBOL_W * BOARD_DIMENSIONS.x, SYMBOL_H * BOARD_DIMENSIONS.y);
				graphics.endFill();
			}}
		/>
		{#each board as reel, reelIndex (reelIndex)}
			{#each reel.reelState.symbols as reelSymbol, symbolIndex (symbolIndex)}
				{@const y = reelSymbol.symbolY()}
				<Rectangle
					x={getX(reelIndex) - SYMBOL_W * 0.5}
					y={y - SYMBOL_H * 0.5}
					width={SYMBOL_W}
					height={SYMBOL_H}
					backgroundColor={0x000000}
					alpha={0.02}
					radius={2}
				/>
				<Sprite
					key={getSpriteKey(reelSymbol.rawSymbol.name)}
					x={getX(reelIndex)}
					y={y}
					anchor={{ x: 0.5, y: 0.5 }}
					alpha={reelSymbol.symbolState === 'win' ? 0.65 : 1}
					width={SYMBOL_W}
					height={SYMBOL_H}
				/>
				{#if reelSymbol.rawSymbol.name === 'WILD'}
					<Text x={getX(reelIndex)} y={y + SYMBOL_SIZE * 0.26} anchor={{ x: 0.5, y: 0.5 }} text="WILD" style={{ fill: 0xf7d46a, fontFamily: 'Arial', fontSize: 14, fontWeight: '700' }} />
				{/if}
			{/each}
		{/each}
	</Container>
{/if}
