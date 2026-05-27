<script lang="ts">
	// @ts-ignore - types provided at runtime by workspace deps
	import { Text } from 'pixi-svelte';

	export let viewport: { w: number; h: number };
	export let roundWinDisplay: number;
	export let amountWinPulse: number;
	export let accumulatedStrokeWidth: number;
	export let amountY: number;
	export let bananaLossFloat: { amount: number; start: number } | null;
	export let floatTime: number;
	export let fontReady = false;
	export let formatCurrencyAmount: (amount: number) => string;

	const centerX = Math.round(viewport.w * 0.51);
	$: accumulatedFontFamily = fontReady ? 'Gigalypse, Poppins, sans-serif' : 'Poppins, sans-serif';
</script>

<Text
	text={formatCurrencyAmount(roundWinDisplay)}
	x={centerX}
	y={amountY}
	anchor={{ x: 0.5, y: 0.5 }}
	style={{
		fill: 0x000000,
		fontFamily: accumulatedFontFamily,
		fontSize: Math.round(52 * amountWinPulse),
		fontWeight: '800',
		lineHeight: Math.round(52 * amountWinPulse),
		padding: Math.max(8, Math.round(accumulatedStrokeWidth * 1.6)),
		stroke: {
			color: 0x000000,
			alpha: 1,
			width: Math.max(4, Math.round(accumulatedStrokeWidth * 0.55)),
			alignment: 0,
			join: 'round',
			miterLimit: 2
		},
		align: 'center',
		trim: true
	}}
/>
<Text
	text={formatCurrencyAmount(roundWinDisplay)}
	x={centerX}
	y={amountY}
	anchor={{ x: 0.5, y: 0.5 }}
	style={{
		fill: 0xFBCF00,
		fontFamily: accumulatedFontFamily,
		fontSize: Math.round(52 * amountWinPulse),
		fontWeight: '800',
		lineHeight: Math.round(52 * amountWinPulse),
		padding: Math.max(8, Math.round(accumulatedStrokeWidth * 1.6)),
		stroke: {
			color: 0x000000,
			alpha: 1,
			width: accumulatedStrokeWidth,
			alignment: 0.5,
			join: 'round',
			miterLimit: 2
		},
		align: 'center',
		trim: true
	}}
/>
{#if bananaLossFloat}
	{@const bananaLossT = Math.max(0, Math.min(1, (floatTime - bananaLossFloat.start) / 1.4))}
	{@const bananaLossEase = bananaLossT * bananaLossT * (3 - 2 * bananaLossT)}
	<Text
		text={formatCurrencyAmount(-bananaLossFloat.amount)}
		x={centerX}
		y={amountY + viewport.h * 0.035 + bananaLossEase * Math.max(34, viewport.h * 0.06)}
		anchor={{ x: 0.5, y: 0.5 }}
		style={{
			fill: 0xffffff,
			fontFamily: accumulatedFontFamily,
			fontSize: 42,
			fontWeight: '800',
			lineHeight: 42,
			stroke: { color: 0x000000, alpha: 0.95, width: 5, alignment: 0.5, join: 'round', miterLimit: 2 },
			align: 'center',
			trim: true
		}}
		alpha={Math.max(0, 1 - bananaLossT * 0.85)}
	/>
{/if}
