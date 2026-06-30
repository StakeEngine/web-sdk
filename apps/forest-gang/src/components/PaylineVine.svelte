<script lang="ts">
	import { SYMBOL_W, SYMBOL_H } from '../game/constants';
	import VineRope from './VineRope.svelte';

	type WinEntry = { lineIndex: number; path: Array<{ reel: number; row: number }> };
	type Props = { wins: WinEntry[] };

	const props: Props = $props();

	const cx = (reel: number) => SYMBOL_W * (reel + 0.5);
	const cy = (row: number) => SYMBOL_H * (row + 0.5);

	const VINE_H = 20;
	const DRAW_MS = 250;
	const HOLD_MS = 400; // pause at full before restarting loop
	// Bright gold (dominant tone of the win gradient) for the winning-payline lines.
	const GOLD = 0xfbc503;

	let drawProgress = $state(0);
	let raf = 0;
	let holdTimeout = 0;
	let start = 0;

	const startDraw = () => {
		cancelAnimationFrame(raf);
		drawProgress = 0;
		start = 0;
		const tick = (t: number) => {
			if (!start) start = t;
			drawProgress = Math.min((t - start) / DRAW_MS, 1);
			if (drawProgress < 1) {
				raf = requestAnimationFrame(tick);
			} else {
				holdTimeout = setTimeout(startDraw, HOLD_MS) as unknown as number;
			}
		};
		raf = requestAnimationFrame(tick);
	};

	$effect(() => {
		const count = props.wins.length;
		clearTimeout(holdTimeout);
		cancelAnimationFrame(raf);
		drawProgress = 0;
		start = 0;
		if (count === 0) return;
		startDraw();
		return () => { clearTimeout(holdTimeout); cancelAnimationFrame(raf); };
	});
</script>

{#each props.wins as win (win.lineIndex)}
	<VineRope
		waypoints={win.path.map((p) => ({ x: cx(p.reel), y: cy(p.row) }))}
		color={GOLD}
		progress={drawProgress}
		vineH={VINE_H}
	/>
{/each}
