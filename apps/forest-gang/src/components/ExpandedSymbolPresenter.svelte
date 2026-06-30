<script lang="ts" module>
	import type { SymbolName } from '../game/types';

	export type EmitterEventExpandedSymbolPresenter =
		| { type: 'expandedPresenterShow'; symbol: SymbolName }
		| { type: 'expandedPresenterHide' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { sineInOut, backOut } from 'svelte/easing';

	import { MainContainer, CanvasSizeRectangle } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { anchorToPivot, Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { spriteKeyByName } from '../game/utils';

	const context = getContext();

	// deer_presenter.png is 792×670; the empty board the deer holds has its
	// interior centred at (0.494, 0.654) of the image, roughly 0.34×0.20 in size.
	const DEER_RATIO = 792 / 670;
	const PLACEHOLDER = { cx: 0.494, cy: 0.654, h: 0.18 };
	const LETTER_ASPECT = 1.17; // default symbol sprites are ~cell aspect

	const main = $derived(context.stateLayoutDerived.mainLayout());
	// Fit the deer to the screen (portrait-friendly): cap by both height and width.
	const deerH = $derived(Math.min(main.height * 0.92, main.width * 0.62));
	const deerW = $derived(deerH * DEER_RATIO);

	// Symbols the board rolls through before landing on the chosen one.
	const ALL_SYMBOLS: SymbolName[] = ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL', 'A', 'K', 'Q', 'J', 'T'];
	const ROLL_MS = 1700;

	let show = $state(false);
	// displaySymbol cycles during the roll, then settles on the real symbol.
	let displaySymbol = $state<SymbolName | null>(null);
	const letterKey = $derived(displaySymbol ? (spriteKeyByName[displaySymbol] ?? null) : null);

	const letterH = $derived(deerH * PLACEHOLDER.h);
	const letterW = $derived(letterH * LETTER_ASPECT);

	// Deer zooms + fades in (fade comes from FadeContainer).
	let deerScale = new Tween(1);
	// Letter rotation (jiggle, after landing) and scale (settle pop on landing).
	let rot = new Tween(0);
	let sc = new Tween(1);
	let wiggling = false;
	let rollTimer = 0;

	const startWiggle = async () => {
		if (wiggling) return;
		wiggling = true;
		while (wiggling) {
			await rot.set(0.07, { duration: 320, easing: sineInOut });
			if (!wiggling) break;
			await rot.set(-0.07, { duration: 320, easing: sineInOut });
		}
	};

	// Slot-style roll: cycle symbols, slowing down, then land + settle-pop + jiggle.
	const startRoll = (finalSymbol: SymbolName) => {
		clearTimeout(rollTimer);
		let elapsed = 0;
		let idx = 0;
		displaySymbol = ALL_SYMBOLS[0];
		const step = () => {
			elapsed += 80;
			const progress = elapsed / ROLL_MS;
			if (progress >= 1) {
				displaySymbol = finalSymbol;
				sc.set(1.18, { duration: 0 });
				sc.set(1, { duration: 320, easing: backOut });
				startWiggle();
				return;
			}
			idx = (idx + 1) % ALL_SYMBOLS.length;
			displaySymbol = ALL_SYMBOLS[idx];
			const interval = 55 + progress * progress * 320;
			rollTimer = setTimeout(step, interval) as unknown as number;
		};
		rollTimer = setTimeout(step, 55) as unknown as number;
	};

	context.eventEmitter.subscribeOnMount({
		expandedPresenterShow: (emitterEvent) => {
			show = true;
			wiggling = false;
			rot.set(0, { duration: 0 });
			sc.set(1, { duration: 0 });
			// deer zooms in
			deerScale.set(0.82, { duration: 0 });
			deerScale.set(1, { duration: 420, easing: backOut });
			// roll through symbols, then land on the chosen one
			startRoll(emitterEvent.symbol);
		},
		expandedPresenterHide: () => {
			show = false;
			wiggling = false;
			clearTimeout(rollTimer);
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />
	<MainContainer>
		<Container
			x={main.width / 2}
			y={main.height / 2}
			scale={deerScale.current}
			pivot={anchorToPivot({ anchor: 0.5, sizes: { width: deerW, height: deerH } })}
		>
			<Sprite key="deerPresenter" width={deerW} height={deerH} />
			{#if letterKey}
				<Container
					x={deerW * PLACEHOLDER.cx}
					y={deerH * PLACEHOLDER.cy}
					scale={sc.current}
					rotation={rot.current}
				>
					<Sprite key={letterKey} anchor={0.5} width={letterW} height={letterH} />
				</Container>
			{/if}
		</Container>
	</MainContainer>
</FadeContainer>
