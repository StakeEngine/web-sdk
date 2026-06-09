<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { MainContainer } from 'components-layout';
	import { BitmapText, Container, Rectangle, Sprite } from 'pixi-svelte';
	import { cubicOut } from 'svelte/easing';

	import { getContext } from '../game/context';
import { SYMBOL_SIZE, SYMBOL_W, SYMBOL_H, BOARD_DIMENSIONS } from '../game/constants';
	import { getReelCenterX, bonusSpriteKeyByName } from '../game/utils';

	const context = getContext();
	const expanded = $derived(context.stateGame.expandedSymbol);

	const colHeight = SYMBOL_H * BOARD_DIMENSIONS.y;
	const halfW = SYMBOL_W * 0.5;
	const halfH = colHeight * 0.5;

	// Per-reel: animate from origin toward full reel
	// stretchH: current drawn height of the symbol (SYMBOL_SIZE → colHeight)
	// stretchY: current y center of the symbol (originY → halfH)
	type ReelAnim = { h: Tween<number>; y: Tween<number>; pop: Tween<number> };
	const reelAnims: Record<number, ReelAnim> = {};

	const getAnim = (reelIndex: number, originY: number): ReelAnim => {
		if (!reelAnims[reelIndex]) {
			reelAnims[reelIndex] = {
				h: new Tween(SYMBOL_SIZE),
				y: new Tween(originY),
				pop: new Tween(1),
			};
		}
		return reelAnims[reelIndex];
	};

	$effect(() => {
		if (!expanded) return;
		const lastReel = expanded.reels[expanded.reels.length - 1];
		if (lastReel === undefined) return;

		// Find origin row for this reel
		const reelPos = expanded.positions.filter((p) => p.reel === lastReel);
		const originRow = reelPos.length > 0 ? reelPos[0].row : 2;
		const originY = (originRow - 1 + 0.5) * SYMBOL_SIZE; // center of origin row in board space

		const anim = getAnim(lastReel, originY);

		// Reset to start state
		anim.h.set(SYMBOL_SIZE, { duration: 0 });
		anim.y.set(originY, { duration: 0 });
		anim.pop.set(1, { duration: 0 });

		// Stretch to fill full reel from origin, moving center toward column center
		anim.h.set(colHeight, { duration: 280, easing: cubicOut });
		anim.y.set(halfH, { duration: 280, easing: cubicOut });

		// Pop on landing
		anim.pop.set(1.08, { duration: 0 });
		setTimeout(() => anim.pop.set(1, { duration: 180, easing: (t) => 1 - (1 - t) ** 3 }), 280);
	});
</script>

{#if expanded}
	<MainContainer>
		<Container
			x={context.stateGameDerived.boardLayout().x}
			y={context.stateGameDerived.boardLayout().y}
			pivot={context.stateGameDerived.boardLayout().pivot}
			scale={context.stateGameDerived.boardLayout().boardScale}
		>
			{#each expanded.reels as reelIndex}
				{@const cx = getReelCenterX(reelIndex)}
				{@const anim = getAnim(reelIndex, halfH)}
				{@const h = anim.h.current}
				{@const cy = anim.y.current}
				{@const px = anim.pop.current}
				<Container x={cx} y={cy} scale={{ x: px, y: 1 }}>
					<!-- Dark background stretches with symbol -->
					<Rectangle
						x={-halfW}
						y={-h * 0.5}
						width={SYMBOL_W}
						height={h}
						backgroundColor={0x0d0a06}
						alpha={0.82}
						radius={8}
					/>
					<!-- Gold glow border -->
					<Rectangle
						x={-halfW - 2}
						y={-h * 0.5 - 2}
						width={SYMBOL_W + 4}
						height={h + 4}
						borderWidth={2}
						borderColor={0xffd84d}
						backgroundColor={0xd4a017}
						alpha={0.2}
						radius={10}
					/>
					<!-- Single symbol sprite — stretches from origin to fill reel -->
					<Sprite
						key={bonusSpriteKeyByName[expanded.symbol] ?? 'bearBonusTile'}
						x={0}
						y={0}
						anchor={0.5}
						width={SYMBOL_W * 0.88}
						height={h * 0.88}
					/>
					<!-- Label at top of stretched column -->
					<BitmapText
						x={0}
						y={-h * 0.5 + 6}
						anchor={{ x: 0.5, y: 0 }}
						text={expanded.symbol}
						style={{ fontFamily: 'gold', fontSize: 12 }}
					/>
				</Container>
			{/each}
		</Container>
	</MainContainer>
{/if}
