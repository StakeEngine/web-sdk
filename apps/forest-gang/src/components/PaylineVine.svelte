<script lang="ts">
	import { Container, Graphics, Sprite } from 'pixi-svelte';
	import { SYMBOL_W, SYMBOL_H } from '../game/constants';

	type WinPath = Array<{ reel: number; row: number }>;

	type Props = {
		wins: WinPath[];
	};

	const props: Props = $props();

	// Symbol center in board-local coords
	const cx = (reel: number) => SYMBOL_W * (reel + 0.5);
	const cy = (row: number) => SYMBOL_H * (row + 0.5);

	// Vine height in board pixels (original is 2508×627, thin strip ~30bp)
	const VINE_H = 28;

	// Animation timing — grow once and hold
	const GROW_DURATION = 600; // ms — full vine grows left→right

	let progress = $state(0); // 0→1, stays at 1 until next spin

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

	// For each win path, compute segments between consecutive positions
	type Segment = { id: string; x1: number; y1: number; len: number; angle: number; segIndex: number; totalSegs: number };

	const allSegments = $derived(
		props.wins.flatMap((path, winIdx) => {
			const segs: Segment[] = [];
			for (let i = 0; i < path.length - 1; i++) {
				const x1 = cx(path[i].reel);
				const y1 = cy(path[i].row);
				const x2 = cx(path[i + 1].reel);
				const y2 = cy(path[i + 1].row);
				const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
				const angle = Math.atan2(y2 - y1, x2 - x1);
				segs.push({ id: `${winIdx}-${i}`, x1, y1, len, angle, segIndex: i, totalSegs: path.length - 1 });
			}
			return segs;
		})
	);

	// Local progress for one segment (sequential grow left→right)
	const segProgress = (segIndex: number, totalSegs: number) => {
		const frac = 1 / totalSegs;
		return Math.min(Math.max((progress - segIndex * frac) / frac, 0), 1);
	};
</script>

{#each allSegments as seg (seg.id)}
	{@const sp = segProgress(seg.segIndex, seg.totalSegs)}
	{#if sp > 0}
		<Container x={seg.x1} y={seg.y1} rotation={seg.angle}>
			<Graphics
				isMask
				draw={(g) => {
					g.clear();
					g.beginFill(0xffffff);
					g.rect(0, -VINE_H / 2, seg.len * sp, VINE_H);
					g.endFill();
				}}
			/>
			<Sprite
				key="vineLineTexture"
				width={seg.len}
				height={VINE_H}
				anchor={{ x: 0, y: 0.5 }}
			/>
		</Container>
	{/if}
{/each}
