<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { MainContainer } from 'components-layout';
	import { Container, Graphics, Sprite } from 'pixi-svelte';
	import { cubicOut } from 'svelte/easing';

	import { getContext } from '../game/context';
	import { SYMBOL_H, SYMBOL_W, BOARD_DIMENSIONS, BOARD_GRID_OFFSET_Y } from '../game/constants';
	import { getReelCenterX, spriteKeyByName, winSpriteKeyByName } from '../game/utils';
	import type { SymbolName } from '../game/types';

	const EXPANDED_WIN_ASSET: Partial<Record<SymbolName, string>> = {
		FOX:      'foxExpWinTile',
		WOLF:     'wolfExpWinTile',
		BEAR:     'bearExpWinTile',
		RABBIT:   'rabbitExpWinTile',
		SQUIRREL: 'squirrelExpWinTile',
		A:        'aWinExpTile',
		K:        'kWinExpTile',
		Q:        'qWinExpTile',
		J:        'jWinExpTile',
		T:        'tWinExpTile',
	};

	const context = getContext();
	const expanded = $derived(context.stateGame.expandedSymbol);
	const expandedWon = $derived(context.stateGame.expandedSymbolWon);

	const LOW_SYMBOLS = new Set<SymbolName>(['T', 'J', 'Q', 'K', 'A']);

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
	{@const assetKey = EXPANDED_WIN_ASSET[expanded.symbol] ?? 'foxExpWinTile'}
	{@const isLowExpanded = LOW_SYMBOLS.has(expanded.symbol)}
	{@const lowAssetKey = expandedWon
		? (winSpriteKeyByName[expanded.symbol] ?? spriteKeyByName[expanded.symbol] ?? 'aTile')
		: (spriteKeyByName[expanded.symbol] ?? 'aTile')}
	<MainContainer>
		<Container
			x={context.stateGameDerived.boardLayout().x}
			y={context.stateGameDerived.boardLayout().y + BOARD_GRID_OFFSET_Y}
			pivot={context.stateGameDerived.boardLayout().pivot}
			scale={context.stateGameDerived.boardLayout().boardScale}
		>
			{#each expanded.reels as reelIndex (reelIndex)}
				{@const cx = getReelCenterX(reelIndex)}
				{@const leftX = cx - SYMBOL_W * 0.5}
				{@const anim = getAnim(reelIndex, halfH)}
				{@const h = anim.h.current}
				{@const cy = anim.y.current}
				{@const px = anim.pop.current}
				{#if isLowExpanded}
					<Container x={leftX} y={0} scale={{ x: px, y: 1 }}>
						<Graphics
							isMask
							draw={(graphics) => {
								graphics.clear();
								graphics.beginFill(0xffffff);
								graphics.rect(0, cy - h * 0.5, SYMBOL_W, h);
								graphics.endFill();
							}}
						/>
						{#each Array.from({ length: BOARD_DIMENSIONS.y }, (_, rowIndex) => rowIndex) as rowIndex (rowIndex)}
							<Sprite
								key={lowAssetKey}
								x={SYMBOL_W * 0.5}
								y={(rowIndex + 0.5) * SYMBOL_H}
								anchor={0.5}
								width={SYMBOL_W}
								height={SYMBOL_H}
							/>
						{/each}
					</Container>
				{:else}
					<Container x={cx} y={cy} scale={{ x: px, y: 1 }}>
						<Sprite anchor={0.5} key={assetKey} width={SYMBOL_W} height={h} />
					</Container>
				{/if}
			{/each}
		</Container>
	</MainContainer>
{/if}
