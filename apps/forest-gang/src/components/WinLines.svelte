<script lang="ts">
	import { Graphics } from 'pixi-svelte';
	import { waitForTimeout } from 'utils-shared/wait';
	import { stateBetDerived } from 'state-shared';
	import type { Position } from '../game/types';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();

	type WinLine = { positions: Position[]; color: number };

	let lines = $state<WinLine[]>([]);
	let visible = $state(false);

	const LINE_COLORS = [0xffd700, 0xff6b35, 0x00e5ff, 0x7fff00, 0xff69b4, 0xe040fb, 0xffa500, 0x00ff88];

	// Center of a symbol in board pixel space.
	// pos.reel 0-4, pos.row 1-4 (math uses ROW_OFFSET=1 so row 1 = top visible row)
	const center = (pos: Position) => ({
		x: (pos.reel + 0.5) * SYMBOL_SIZE,
		y: (pos.row - 1 + 0.5) * SYMBOL_SIZE,
	});

	context.eventEmitter.subscribeOnMount({
		winLinesShow: async ({ wins }: { wins: { positions: Position[] }[] }) => {
			const isFast = stateBetDerived.timeScale() > 1;
			lines = wins.map((win, i) => ({
				positions: [...win.positions].sort((a, b) => a.reel - b.reel),
				color: LINE_COLORS[i % LINE_COLORS.length],
			}));
			visible = true;
			await waitForTimeout(isFast ? 120 : 480);
			visible = false;
			lines = [];
		},
	});
</script>

{#if visible}
	<BoardContainer>
		{#each lines as line (line.color)}
			<Graphics
				draw={(g) => {
					g.clear();
					const pts = line.positions.map(center);
					if (pts.length < 1) return;

					// Connecting line through dot centers
					if (pts.length >= 2) {
						g.lineStyle(2, line.color, 0.7);
						g.moveTo(pts[0].x, pts[0].y);
						for (let i = 1; i < pts.length; i++) {
							g.lineTo(pts[i].x, pts[i].y);
						}
					}

					// Dot at each symbol center
					g.lineStyle(0);
					for (const pt of pts) {
						g.beginFill(line.color, 0.9);
						g.drawCircle(pt.x, pt.y, 7);
						g.endFill();
					}
				}}
			/>
		{/each}
	</BoardContainer>
{/if}
