<script lang="ts">
	import { SYMBOL_W, SYMBOL_H } from '../game/constants';
	import VineRope from './VineRope.svelte';

	type WinEntry = { lineIndex: number; path: Array<{ reel: number; row: number }> };
	type Props = { wins: WinEntry[] };

	const props: Props = $props();

	const cx = (reel: number) => SYMBOL_W * (reel + 0.5);
	const cy = (row: number) => SYMBOL_H * (row + 0.5);

	const VINE_H = 8;
	const GROW_DURATION = 600;

	// Fixed color per payline (1-20), always the same regardless of win order
	const PAYLINE_COLORS: Record<number, number> = {
		1:  0xFFD700, // gold
		2:  0x00E5FF, // cyan
		3:  0xFF3333, // red
		4:  0x33FF77, // green
		5:  0xFF33FF, // magenta
		6:  0x3399FF, // blue
		7:  0xFF8800, // orange
		8:  0xFF66BB, // pink
		9:  0xBBFF00, // lime
		10: 0x66CCFF, // sky blue
		11: 0xFFEE44, // yellow
		12: 0x44FFDD, // teal
		13: 0xFF4488, // hot pink
		14: 0x88FF44, // yellow-green
		15: 0xBB88FF, // lavender
		16: 0xFF9944, // amber
		17: 0x44BBFF, // light blue
		18: 0xFF5544, // coral
		19: 0x44FF99, // mint
		20: 0xFFCC44, // golden yellow
	};

	let progress = $state(0);

	$effect(() => {
		const show = props.wins.length > 0;
		if (!show) { progress = 0; return; }

		let frame: number;
		let startTime: number | null = null;

		function tick(t: number) {
			if (startTime === null) startTime = t;
			progress = Math.min((t - startTime) / GROW_DURATION, 1);
			if (progress < 1) frame = requestAnimationFrame(tick);
		}

		progress = 0;
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	const winsWithWaypoints = $derived(
		props.wins.map((win) => ({
			id: String(win.lineIndex),
			waypoints: win.path.map((p) => ({ x: cx(p.reel), y: cy(p.row) })),
			color: PAYLINE_COLORS[win.lineIndex] ?? 0xFFFFFF,
		}))
	);
</script>

{#each winsWithWaypoints as win (win.id)}
	<VineRope
		waypoints={win.waypoints}
		color={win.color}
		{progress}
		vineH={VINE_H}
	/>
{/each}
