<script lang="ts" module>
	export type EmitterEventBonusSymbolPanel =
		| { type: 'bonusSymbolRollAwait' };
</script>

<script lang="ts">
	import { BitmapText, Container, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, SYMBOL_W, SYMBOL_H } from '../game/constants';
	import { spriteKeyByName } from '../game/utils';
	import type { SymbolName } from '../game/types';

	// symbolPad.png is 624×420
	const PAD_ASPECT = 624 / 420;
	const PANEL_W = SYMBOL_W * 1.1;
	const PANEL_H = PANEL_W / PAD_ASPECT;
	const SYM_SIZE = PANEL_W * 0.52;

	const ALL_SYMBOLS: SymbolName[] = ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL', 'A', 'K', 'Q', 'J', 'T'];
	const ROLL_DURATION_MS = 2000;

	const context = getContext();
	const selectedSymbol = $derived(context.stateGame.selectedBonusSymbol);
	const mode = $derived(context.stateGame.bonusMode);
	const show = $derived(!!selectedSymbol && !!mode);
	const scale = $derived(context.stateLayoutDerived.isStacked() ? 1.28 : 1);

	const boardW = $derived(context.stateGameDerived.boardLayout().width);
	const position = $derived(
		context.stateLayoutDerived.isStacked()
			? { x: boardW - PANEL_W * 0.5 - 10, y: -SYMBOL_SIZE * 0.6 }
			: { x: boardW + 40, y: SYMBOL_SIZE * 0.3 },
	);

	const modeLabel = $derived(mode === 'superspin' ? 'ALL IN' : mode === 'feature' ? 'FEATURE' : 'DEAL IT');

	let displaySymbol = $state<SymbolName | null>(null);
	let rollTimer = 0;
	let rollDone = $state(false);
	let rollAwaitResolve: (() => void) | null = null;

	$effect(() => {
		const sym = selectedSymbol;
		const currentMode = mode;
		clearTimeout(rollTimer);
		rollDone = false;

		if (!sym || !currentMode) {
			displaySymbol = null;
			return;
		}

		if (currentMode === 'feature') {
			displaySymbol = sym;
			rollDone = true;
			rollAwaitResolve?.();
			rollAwaitResolve = null;
			return;
		}

		// freegame (Deal It) / superspin: roll then land
		let elapsed = 0;
		let idx = 0;
		displaySymbol = ALL_SYMBOLS[0];

		const step = () => {
			elapsed += 80;
			const progress = elapsed / ROLL_DURATION_MS;
			if (progress >= 1) {
				displaySymbol = sym;
				rollDone = true;
				rollAwaitResolve?.();
				rollAwaitResolve = null;
				return;
			}
			const interval = 60 + progress * progress * 320;
			idx = (idx + 1) % ALL_SYMBOLS.length;
			displaySymbol = ALL_SYMBOLS[idx];
			rollTimer = setTimeout(step, interval) as unknown as number;
		};
		rollTimer = setTimeout(step, 80) as unknown as number;
		return () => clearTimeout(rollTimer);
	});

	context.eventEmitter.subscribeOnMount({
		bonusSymbolRollAwait: async () => {
			if (rollDone) return;
			await new Promise<void>((resolve) => { rollAwaitResolve = resolve; });
		},
	});

	const spriteKey = $derived(displaySymbol ? (spriteKeyByName[displaySymbol] ?? 'aTile') : 'aTile');
</script>

<BoardContainer>
	<FadeContainer {show}>
		<Container
			x={position.x}
			y={position.y}
			{scale}
			pivot={{ x: PANEL_W * 0.5, y: PANEL_H * 0.5 }}
		>
			<!-- Frame background -->
			<Sprite key="symbolPad" anchor={{ x: 0.5, y: 0.5 }} x={PANEL_W * 0.5} y={PANEL_H * 0.5} width={PANEL_W} height={PANEL_H} />

			<!-- Symbol sprite, centred (no mode label) -->
			{#if displaySymbol}
				<Sprite
					key={spriteKey}
					anchor={{ x: 0.5, y: 0.5 }}
					x={PANEL_W * 0.5}
					y={PANEL_H * 0.5}
					width={SYM_SIZE}
					height={SYM_SIZE * (SYMBOL_H / SYMBOL_W)}
				/>
			{/if}
		</Container>
	</FadeContainer>
</BoardContainer>
