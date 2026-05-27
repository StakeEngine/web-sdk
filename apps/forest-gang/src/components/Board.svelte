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
	import { MainContainer } from 'components-layout';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';
	import type { SymbolName } from '../game/types';

	const context = getContext();
	const board = $derived(context.stateGame.board);
	const layout = $derived(context.stateGameDerived.boardLayout());
	let show = $state(true);

	const spriteKeyByName: Record<SymbolName, string> = {
		FOX: 'foxTile',
		WOLF: 'wolfTile',
		BEAR: 'bearTile',
		RABBIT: 'rabbitTile',
		SQUIRREL: 'squirrelTile',
		A: 'aTile',
		K: 'kTile',
		Q: 'qTile',
		J: 'jTile',
		T: 'tTile',
		WILD: 'foxTile',
		SCATTER: 'scatterCustom',
	};

	const getX = (reelIndex: number) => SYMBOL_SIZE * (reelIndex + 0.5);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => context.stateGameDerived.enhancedBoard.stop(),
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
	<MainContainer>
		<Container x={layout.x} y={layout.y} pivot={layout.pivot}>
			<Graphics
				isMask
				draw={(graphics) => {
					graphics.beginFill(0xffffff);
					graphics.roundRect(0, 0, SYMBOL_SIZE * BOARD_DIMENSIONS.x, SYMBOL_SIZE * BOARD_DIMENSIONS.y, 16);
					graphics.endFill();
				}}
			/>
			{#each board as reel, reelIndex (reelIndex)}
				{#each reel.reelState.symbols as reelSymbol, symbolIndex (symbolIndex)}
					{@const y = reelSymbol.symbolY()}
					<Rectangle
						x={getX(reelIndex) - SYMBOL_SIZE * 0.5}
						y={y - SYMBOL_SIZE * 0.5}
						width={SYMBOL_SIZE}
						height={SYMBOL_SIZE}
						backgroundColor={0x000000}
						alpha={0.02}
						radius={2}
					/>
					<Sprite
						key={spriteKeyByName[reelSymbol.rawSymbol.name]}
						x={getX(reelIndex)}
						y={y}
						anchor={{ x: 0.5, y: 0.5 }}
						alpha={reelSymbol.symbolState === 'win' ? 0.65 : 1}
						width={SYMBOL_SIZE}
						height={SYMBOL_SIZE}
					/>
					{#if reelSymbol.rawSymbol.name === 'WILD'}
						<Text x={getX(reelIndex)} y={y + SYMBOL_SIZE * 0.26} anchor={{ x: 0.5, y: 0.5 }} text="WILD" style={{ fill: 0xf7d46a, fontFamily: 'Arial', fontSize: 14, fontWeight: '700' }} />
					{/if}
				{/each}
			{/each}
		</Container>
	</MainContainer>
{/if}
