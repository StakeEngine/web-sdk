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
	import { SYMBOL_W, SYMBOL_H, SYMBOL_SIZE, BOARD_DIMENSIONS, BOARD_GRID_OFFSET_Y } from '../game/constants';
	import { spriteKeyByName, bonusSpriteKeyByName, winSpriteKeyByName } from '../game/utils';
	import type { SymbolName } from '../game/types';

	const LOW_SYMBOLS_SET = new Set<SymbolName>(['L1', 'L2', 'L3', 'L4', 'L5']);

	const context = getContext();
	const board = $derived(context.stateGame.board);
	const layout = $derived(context.stateGameDerived.boardLayout());
	let show = $state(true);

	const activeMap = $derived(context.stateGame.bonusMode ? bonusSpriteKeyByName : spriteKeyByName);
	const getSpriteKey = (name: SymbolName, state?: string) => {
		if (state === 'win') return winSpriteKeyByName[name] ?? activeMap[name] ?? 'sym_h1';
		return activeMap[name] ?? 'sym_h1';
	};

	const getX = (reelIndex: number) => SYMBOL_W * (reelIndex + 0.5);

	// True while any symbol is in 'win' state — used to dim non-winning symbols
	const hasWinState = $derived(
		context.stateGame.board.some((reel) =>
			reel.reelState.symbols.some((s) => s.symbolState === 'win'),
		),
	);

	// Reels whose symbols should be hidden behind the low-symbol expanded overlay.
	// Added one-by-one with a small delay so the overlay sprite starts drawing first.
	let hiddenReels = $state(new Set<number>());

	$effect(() => {
		const expanded = context.stateGame.expandedSymbol;
		// Reset when no expansion, non-low symbol, OR reels cleared for next spin
		if (!expanded || !LOW_SYMBOLS_SET.has(expanded.symbol) || expanded.reels.length === 0) {
			if (hiddenReels.size > 0) hiddenReels = new Set<number>();
			return;
		}
		const lastReel = expanded.reels[expanded.reels.length - 1];
		if (hiddenReels.has(lastReel)) return;
		const t = setTimeout(() => {
			hiddenReels = new Set([...hiddenReels, lastReel]);
		}, 80);
		return () => clearTimeout(t);
	});

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => {
			context.stateGameDerived.enhancedBoard.stop();
		},
		boardSettle: ({ board }) => context.stateGameDerived.enhancedBoard.settle(board),
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			for (const position of symbolPositions) {
				const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
				reelSymbol.symbolState = 'win';
			}
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<Container x={layout.x} y={layout.y + BOARD_GRID_OFFSET_Y} pivot={layout.pivot} scale={layout.boardScale}>
		<Graphics
			isMask
			draw={(graphics) => {
				graphics.beginFill(0xffffff);
				graphics.rect(0, 0, SYMBOL_W * BOARD_DIMENSIONS.x, SYMBOL_H * BOARD_DIMENSIONS.y);
				graphics.endFill();
			}}
		/>
		{#each board as reel, reelIndex (reelIndex)}
			{#if !hiddenReels.has(reelIndex)}
			{#each reel.reelState.symbols as reelSymbol, symbolIndex (symbolIndex)}
				{@const y = reelSymbol.symbolY()}
				<Rectangle
					x={getX(reelIndex) - SYMBOL_W * 0.5}
					y={y - SYMBOL_H * 0.5}
					width={SYMBOL_W}
					height={SYMBOL_H}
					backgroundColor={0x000000}
					alpha={0.02}
				/>
				{@const isWin = reelSymbol.symbolState === 'win'}
				<Sprite
					key={getSpriteKey(reelSymbol.rawSymbol.name, reelSymbol.symbolState)}
					x={getX(reelIndex)}
					y={y}
					anchor={{ x: 0.5, y: 0.5 }}
					width={SYMBOL_W}
					height={SYMBOL_H}
					alpha={hasWinState && !isWin ? 0.35 : 1}
					tint={isWin ? 0xffffff : 0xffffff}
				/>
			{/each}
			{/if}
		{/each}
	</Container>
{/if}
