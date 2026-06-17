<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| { type: 'boardWithAnimateSymbols'; symbolPositions: Position[] };
</script>

<script lang="ts">
	import { Container, Graphics, Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_W, SYMBOL_H, SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';
	import { spriteKeyByName, bonusSpriteKeyByName, winSpriteKeyByName } from '../game/utils';
	import type { SymbolName } from '../game/types';
	import PaylineVine from './PaylineVine.svelte';

	const context = getContext();
	const board = $derived(context.stateGame.board);
	const layout = $derived(context.stateGameDerived.boardLayout());
	let show = $state(true);

	const activeMap = $derived(context.stateGame.bonusMode ? bonusSpriteKeyByName : spriteKeyByName);
	const getSpriteKey = (name: SymbolName, state?: string) => {
		if (state === 'win') return winSpriteKeyByName[name] ?? activeMap[name] ?? 'aTile';
		return activeMap[name] ?? 'aTile';
	};

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
			// Set win state — stays until next spin (boardSettle resets all to static)
			for (const position of symbolPositions) {
				const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
				reelSymbol.symbolState = 'win';
			}
		},
		boardSettle: ({ board }) => {
			// Reset all symbols to static at start of next spin
			for (const reel of context.stateGame.board) {
				for (const sym of reel.reelState.symbols) {
					if (sym.symbolState === 'win' || sym.symbolState === 'postWinStatic') {
						sym.symbolState = 'static';
					}
				}
			}
			context.stateGameDerived.enhancedBoard.settle(board);
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
					key={getSpriteKey(reelSymbol.rawSymbol.name, reelSymbol.symbolState)}
					x={getX(reelIndex)}
					y={y}
					anchor={{ x: 0.5, y: 0.5 }}
					width={SYMBOL_W}
					height={SYMBOL_H}
				/>
			{/each}
		{/each}
		<PaylineVine wins={context.stateGame.paylineWins} />
	</Container>
{/if}
