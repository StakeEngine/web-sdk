<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());

	// slot_pad.png is 3220×2364. Geometry of the inner brown panel (where the reels
	// sit): inner panel ≈ 76% of image width, centred at ~(0.52, 0.50). We scale the
	// frame so the inner panel ≈ board grid + margin, then anchor it over the grid.
	const FRAME_ASPECT = 3220 / 2364;
	const INNER_W_FRAC = 0.762;
	const ANCHOR_X = 0.505; // = slot_pad window centre x (grid centred horizontally)
	const ANCHOR_Y = 0.489; // reference only (Sprite top-anchored); see stateGame _FRAME_ANCHOR_Y
	const MARGIN = 1.04;
	const FRAME_EXTRA_SCALE = 1.30 / 1.15;
	// Draw the frame slightly narrower (height unchanged) so the bamboo poles sit
	// closer to the reels — reduces the left/right margin without touching top/bottom.
	const H_SQUASH = 0.93;

	const frameH = $derived((board.width * board.boardScale * MARGIN * FRAME_EXTRA_SCALE) / INNER_W_FRAC / FRAME_ASPECT);
	const frameW = $derived(((board.width * board.boardScale * MARGIN * FRAME_EXTRA_SCALE) / INNER_W_FRAC) * H_SQUASH);
</script>

<Sprite
	key="slotPad"
	anchor={{ x: ANCHOR_X, y: 0 }}
	x={board.x}
	y={0}
	width={frameW}
	height={frameH}
/>
