<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut, linear } from 'svelte/easing';

	import { FillGradient } from 'pixi.js';
	import { Sprite, Container, Text } from 'pixi-svelte';

	type Props = {
		boardKey: string;
		maxBoardSize: number;
		breatheScale: number;
		mult: number;
		countUpText: string;
		fontSize: number;
	};

	const { boardKey, maxBoardSize, breatheScale, mult, countUpText, fontSize }: Props = $props();

	const TIER_BASE_SCALE: Record<string, number> = {
		sweetWinBoard:     0.72,
		wildWinBoard:      0.80,
		epicWinBoard:      0.87,
		mythicWinBoard:    0.93,
		legendaryWinBoard: 1.00,
	};

	const TIER_RANGES = [
		{ key: 'sweetWinBoard',     min: 0,    max: 50 },
		{ key: 'wildWinBoard',      min: 50,   max: 100 },
		{ key: 'epicWinBoard',      min: 100,  max: 250 },
		{ key: 'mythicWinBoard',    min: 250,  max: 1000 },
		{ key: 'legendaryWinBoard', min: 1000, max: 5000 },
	];

	// Transition tweens for the incoming board
	const currScaleTween = new Tween(1, { duration: 260, easing: cubicOut });
	const currAlphaTween = new Tween(1, { duration: 180, easing: linear });
	// Transition tweens for the outgoing board
	const prevScaleTween = new Tween(1, { duration: 220, easing: cubicOut });
	const prevAlphaTween = new Tween(0, { duration: 220, easing: linear });

	let prevKey = $state<string | null>(null);
	let showPrev = $state(false);

	$effect(() => {
		const key = boardKey;
		if (prevKey === null) {
			// First render: just appear
			prevKey = key;
			currScaleTween.set(1, { duration: 0 });
			currAlphaTween.set(1, { duration: 0 });
			return;
		}
		if (key === prevKey) return;

		// Capture outgoing key before updating
		const outgoing = prevKey;
		prevKey = key;
		showPrev = true;

		// Outgoing: grow slightly then fade out
		prevScaleTween.set(1, { duration: 0 });
		prevAlphaTween.set(1, { duration: 0 });
		prevScaleTween.set(1.08, { duration: 220, easing: cubicOut });
		prevAlphaTween.set(0, { duration: 220, easing: linear });

		// Incoming: start big, pop down to natural size, fade in
		currScaleTween.set(1.14, { duration: 0 });
		currAlphaTween.set(0, { duration: 0 });
		currScaleTween.set(1, { duration: 280, easing: cubicOut });
		currAlphaTween.set(1, { duration: 180, easing: linear });

		// Hide prev sprite once fade completes
		setTimeout(() => { showPrev = false; }, 250);
	});

	const tierRange = $derived(TIER_RANGES.find((t) => t.key === boardKey) ?? TIER_RANGES[0]);
	const tierIdx = $derived(TIER_RANGES.indexOf(tierRange));
	const nextTierBaseScale = $derived(TIER_BASE_SCALE[TIER_RANGES[Math.min(tierIdx + 1, TIER_RANGES.length - 1)].key]);
	const tierProgress = $derived(Math.min((mult - tierRange.min) / (tierRange.max - tierRange.min), 1));
	// Board grows within tier: from tierBase toward next tier's base (capped at 80% of the gap)
	const accumulationScale = $derived(
		TIER_BASE_SCALE[boardKey] + (nextTierBaseScale - TIER_BASE_SCALE[boardKey]) * tierProgress * 0.8,
	);
	const boardSize = $derived(maxBoardSize * accumulationScale * breatheScale * currScaleTween.current);
	const prevBoardSize = $derived(maxBoardSize * (TIER_BASE_SCALE[prevKey ?? boardKey] ?? 1) * prevScaleTween.current);

	// Win-amount text style: Cinzel 900 with the gold gradient (Figma spec).
	const goldFill = new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		colorStops: [
			{ offset: 0.176, color: '#E2D981' },
			{ offset: 0.6, color: '#FBC503' },
			{ offset: 1, color: '#D98503' },
		],
		textureSpace: 'local',
	});

	// Scale the amount to fit inside the board (keeps long wins readable).
	let amountNatW = $state(0);
	const amountMaxW = $derived(boardSize * 0.62);
	const amountScale = $derived(amountNatW > 0 ? Math.min(1, amountMaxW / amountNatW) : 1);

	// Each board art has its amount plaque at a slightly different height. mega_win
	// (mythic) has more bottom padding, so its text needs to sit a bit higher.
	const TIER_TEXT_Y: Record<string, number> = {
		sweetWinBoard: 0.36,
		wildWinBoard: 0.36,
		epicWinBoard: 0.36,
		mythicWinBoard: 0.345,
		legendaryWinBoard: 0.36,
	};
	const textYFrac = $derived(TIER_TEXT_Y[boardKey] ?? 0.36);
</script>

{#if showPrev && prevKey && prevKey !== boardKey}
	<Sprite
		key={prevKey}
		anchor={0.5}
		width={prevBoardSize}
		height={prevBoardSize}
		alpha={prevAlphaTween.current}
	/>
{/if}

<Sprite
	key={boardKey}
	anchor={0.5}
	width={boardSize}
	height={boardSize}
	alpha={currAlphaTween.current}
/>

<Container y={boardSize * textYFrac - 8} scale={amountScale}>
	<Text
		anchor={0.5}
		text={countUpText}
		style={{
			fontFamily: 'Cinzel',
			fontWeight: '900',
			fontSize,
			align: 'center',
			letterSpacing: fontSize * 0.03,
			fill: goldFill,
		}}
		onresize={({ width }) => (amountNatW = width)}
	/>
</Container>
