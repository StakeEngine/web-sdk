<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { BitmapText, Container, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const show = $derived(context.stateGame.bonusMode === 'superspin');
	const multipliers = $derived(context.stateGame.reelMultipliers);
	const board = $derived(context.stateGameDerived.boardLayout());

	const boardLeft = $derived(board.x - board.width * 0.5 * board.boardScale);
	const boardBottom = $derived(board.y + board.height * 0.5 * board.boardScale);
	const reelWidth = $derived(SYMBOL_SIZE * board.boardScale);
	const badgeWidth = $derived(Math.max(136, reelWidth * 1.36));
	const badgeHeight = $derived(Math.max(64, reelWidth * 0.64));
	const badgeY = $derived(boardBottom + SYMBOL_SIZE * 0.2 * board.boardScale);
	const labelOffsetY = $derived(badgeHeight * 0.22);

	const reelCenterX = (reelIndex: number) =>
		boardLeft + (reelIndex + 0.5) * reelWidth;
</script>

{#if show}
	<MainContainer>
		{#each multipliers as multiplier, reelIndex}
			<Container x={reelCenterX(reelIndex)} y={badgeY}>
				<Rectangle
					x={-badgeWidth * 0.5}
					y={-badgeHeight * 0.5}
					width={badgeWidth}
					height={badgeHeight}
					backgroundColor={0x1b0f0f}
					alpha={0.96}
					radius={16}
				/>
				<Rectangle
					x={-badgeWidth * 0.5 + 3}
					y={-badgeHeight * 0.5 + 3}
					width={badgeWidth - 6}
					height={badgeHeight - 6}
					backgroundColor={0x4d2e12}
					alpha={0.94}
					radius={14}
				/>
				<BitmapText
					anchor={{ x: 0.5, y: 0.5 }}
					x={0}
					y={-labelOffsetY}
					text={`${multiplier}x`}
					style={{ fontFamily: 'gold', fontSize: 32 }}
				/>
			</Container>
		{/each}
	</MainContainer>
{/if}
