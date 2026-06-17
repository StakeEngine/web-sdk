<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { MainContainer } from 'components-layout';
	import { Container } from 'pixi-svelte';
	import ExpandedSpineAnim from './ExpandedSpineAnim.svelte';
	import { cubicOut } from 'svelte/easing';

	import { getContext } from '../game/context';
	import { SYMBOL_H, BOARD_DIMENSIONS } from '../game/constants';
	import { EXPANDED_TEST_ANIM_ASSET_KEY, getReelCenterX } from '../game/utils';

	const context = getContext();
	const expanded = $derived(context.stateGame.expandedSymbol);

	const colHeight = SYMBOL_H * BOARD_DIMENSIONS.y;
	const halfH = colHeight * 0.5;

	type ReelAnim = { h: Tween<number>; y: Tween<number>; pop: Tween<number>; looping: boolean };
	const reelAnims: Record<number, ReelAnim> = {};
	const revealedReels = new Set<number>();

	const getAnim = (reelIndex: number, originY: number): ReelAnim => {
		if (!reelAnims[reelIndex]) {
			reelAnims[reelIndex] = {
				h: new Tween(SYMBOL_H),
				y: new Tween(originY),
				pop: new Tween(1),
				looping: false,
			};
		}
		return reelAnims[reelIndex];
	};

	$effect(() => {
		if (!expanded || expanded.reels.length === 0) {
			revealedReels.clear();
			Object.keys(reelAnims).forEach((k) => delete reelAnims[+k]);
		}
	});

	$effect(() => {
		if (!expanded) return;
		const lastReel = expanded.reels[expanded.reels.length - 1];
		if (lastReel === undefined) return;
		if (revealedReels.has(lastReel)) return;
		revealedReels.add(lastReel);

		const reelPos = expanded.positions.filter((p) => p.reel === lastReel);
		const originRow = reelPos.length > 0 ? reelPos[0].row : 2;
		const originY = (originRow + 0.5) * SYMBOL_H;

		const anim = getAnim(lastReel, originY);

		anim.h.set(SYMBOL_H, { duration: 0 });
		anim.y.set(originY, { duration: 0 });
		anim.pop.set(1, { duration: 0 });
		anim.looping = false;

		anim.h.set(colHeight, { duration: 280, easing: cubicOut });
		anim.y.set(halfH, { duration: 280, easing: cubicOut });

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
			{#each expanded.reels as reelIndex (reelIndex)}
				{@const cx = getReelCenterX(reelIndex)}
				{@const anim = getAnim(reelIndex, halfH)}
				{@const h = anim.h.current}
				{@const cy = anim.y.current}
				{@const px = anim.pop.current}
				<Container x={cx} y={cy} scale={{ x: px, y: 1 }}>
					<ExpandedSpineAnim key={EXPANDED_TEST_ANIM_ASSET_KEY} height={h} />
				</Container>
			{/each}
		</Container>
	</MainContainer>
{/if}
