<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());

	// slot_pad.png is 3616×2528. Measured geometry of the inner brown panel
	// (where the reels sit): centred at ~(0.50, 0.46) of the image, ~57% of the
	// image width. We scale the whole frame so the inner panel ≈ board + margin,
	// then anchor it at the inner-panel centre over the board centre.
	const FRAME_ASPECT = 3616 / 2528;
	const INNER_W_FRAC = 0.64; // inner brown panel ≈ 64% of the image width
	const ANCHOR_X = 0.5;
	const ANCHOR_Y = 0.45; // inner panel centre sits slightly above image centre
	const MARGIN = 1.04; // inner panel a touch larger than the board grid
	// Frame scales to 130% while grid scales to 115% — extra factor covers the difference
	const FRAME_EXTRA_SCALE = 1.30 / 1.15;

	const frameW = $derived((board.width * board.boardScale * MARGIN * FRAME_EXTRA_SCALE) / INNER_W_FRAC);
	const frameH = $derived(frameW / FRAME_ASPECT);
</script>

<Sprite
	key="slotPad"
	anchor={{ x: ANCHOR_X, y: 0 }}
	x={board.x}
	y={0}
	width={frameW}
	height={frameH}
/>
