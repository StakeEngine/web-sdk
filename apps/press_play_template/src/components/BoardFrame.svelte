<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());

	// CHANGE ME: update these constants to match your frame art dimensions and geometry
	const FRAME_ASPECT = 3616 / 2528;
	const INNER_W_FRAC = 0.64;
	const ANCHOR_X = 0.5;
	const ANCHOR_Y = 0.45;
	const MARGIN = 1.04;
	const FRAME_EXTRA_SCALE = 1.30 / 1.15;

	const frameW = $derived((board.width * board.boardScale * MARGIN * FRAME_EXTRA_SCALE) / INNER_W_FRAC);
	const frameH = $derived(frameW / FRAME_ASPECT);

	let glowVisible = $state(false);

	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => (glowVisible = true),
		boardFrameGlowHide: () => (glowVisible = false),
	});
</script>

<Sprite
	key="boardFrame"
	anchor={{ x: ANCHOR_X, y: 0 }}
	x={board.x}
	y={0}
	width={frameW}
	height={frameH}
/>
