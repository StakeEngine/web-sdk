<script lang="ts" module>
	import type { Position, RawSymbol } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| { type: 'boardWithAnimateSymbols'; symbolPositions: Position[] };
</script>

<script lang="ts">
	import { BitmapText, Container, Graphics, Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BOARD_DIMENSIONS, BOARD_GRID_OFFSET_Y, SYMBOL_H, SYMBOL_W } from '../game/constants';
	import { bonusSpriteKeyByName, spriteKeyByName, winSpriteKeyByName } from '../game/utils';
	import type { BoardCell, SymbolName } from '../game/types';

	const context = getContext();
	const board = $derived(context.stateGame.board);
	const layout = $derived(context.stateGameDerived.boardLayout());
	let show = $state(true);

	const activeMap = $derived(context.stateGame.bonusMode ? bonusSpriteKeyByName : spriteKeyByName);
	const getSpriteKey = (cell: BoardCell) => {
		if (cell.symbolState === 'win') return winSpriteKeyByName[cell.name as SymbolName] ?? activeMap[cell.name as SymbolName];
		if (cell.symbolState === 'locked' || cell.symbolState === 'magnet') return winSpriteKeyByName[cell.name as SymbolName] ?? activeMap[cell.name as SymbolName];
		return activeMap[cell.name as SymbolName] ?? 'aTile';
	};

	const getX = (reelIndex: number) => SYMBOL_W * (reelIndex + 0.5);
	const getY = (rowIndex: number) => SYMBOL_H * (rowIndex + 0.5);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => {
			context.stateGame.boardSpinning = false;
		},
		boardSettle: ({ board }) => context.stateGameDerived.setBoardFromRaw({ rawBoard: board }),
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			await context.stateGameDerived.animateWinningPositions(symbolPositions);
		},
	});
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
			{#each reel as cell, rowIndex (cell.key)}
				{@const x = getX(reelIndex)}
				{@const y = getY(rowIndex)}
				<Rectangle
					x={x - SYMBOL_W * 0.5}
					y={y - SYMBOL_H * 0.5}
					width={SYMBOL_W}
					height={SYMBOL_H}
					backgroundColor={cell.locked ? 0x2b2010 : 0x0d0a07}
					alpha={context.stateGame.boardSpinning && !cell.locked ? 0.55 : 0.16}
				/>
				{#if cell.anchor || cell.persistent || cell.target || cell.highlighted}
					<Graphics
						draw={(graphics) => {
							graphics.clear();
							graphics.lineStyle({ width: cell.highlighted ? 6 : cell.persistent ? 5 : 3, color: cell.highlighted ? 0xfad85e : cell.persistent ? 0x84d6ff : cell.target ? 0xff9f43 : 0xf6cb52, alpha: 0.95 });
							graphics.drawRoundedRect(x - SYMBOL_W * 0.45, y - SYMBOL_H * 0.45, SYMBOL_W * 0.9, SYMBOL_H * 0.9, 14);
						}}
					/>
				{/if}
				<Sprite
					key={getSpriteKey(cell)}
					x={x}
					y={y}
					anchor={{ x: 0.5, y: 0.5 }}
					width={SYMBOL_W * (cell.name === 'MAGNET' || cell.name === 'SCATTER' ? 0.92 : 0.86)}
					height={SYMBOL_H * (cell.name === 'MAGNET' || cell.name === 'SCATTER' ? 0.92 : 0.86)}
					alpha={context.stateGame.boardSpinning && !cell.locked ? 0.72 : cell.locked ? 1 : cell.target ? 0.96 : 0.92}
					tint={cell.highlighted ? 0xffffff : cell.locked ? 0xfff6d5 : 0xffffff}
				/>
				{#if cell.name === 'MAGNET' && cell.multiplier}
					<BitmapText
						anchor={0.5}
						x={x}
						y={y + SYMBOL_H * 0.27}
						text={`${cell.multiplier}X`}
						style={{ fontFamily: 'silver', fontSize: 18 }}
					/>
				{/if}
			{/each}
		{/each}
		{#each context.stateGame.clusterWinBadges as badge (badge.id)}
			<BitmapText
				anchor={0.5}
				x={getX(badge.reel)}
				y={getY(badge.row) - SYMBOL_H * 0.42}
				text={badge.text}
				style={{ fontFamily: 'gold', fontSize: 18 }}
			/>
		{/each}
	</Container>
{/if}
