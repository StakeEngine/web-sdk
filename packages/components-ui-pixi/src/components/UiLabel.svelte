<script lang="ts">
	import { Text } from 'pixi-svelte';

	import UiSprite from './UiSprite.svelte';
	import { UI_BASE_FONT_SIZE } from '../constants';

	type Props = {
		label: string;
		value: string;
		tiled?: boolean;
		stacked?: boolean;
	};

	const props: Props = $props();

	const labelStyle = {
		fontFamily: 'proxima-nova',
		fontSize: UI_BASE_FONT_SIZE * 0.58,
		fontWeight: '700',
		fill: 0xb8d537,
	} as const;

	const valueStyle = {
		fontFamily: 'proxima-nova',
		fontSize: UI_BASE_FONT_SIZE * 0.72,
		fontWeight: '700',
		fill: 0xf2f0e8,
	} as const;
</script>

{#if props.stacked}
	{#if props.tiled}
		<UiSprite
			y={-10}
			anchor={{ x: 0.5, y: 0 }}
			key="base_ticker"
			width={276}
			height={88}
		/>
	{/if}
	<Text anchor={{ x: 0.5, y: 0 }} text={props.label} style={labelStyle} y={2} />
	<Text anchor={{ x: 0.5, y: 0 }} text={props.value} style={valueStyle} y={UI_BASE_FONT_SIZE * 0.62} />
{:else}
	{#if props.tiled}
		<UiSprite
			x={-90}
			anchor={{ x: 0, y: 0.5 }}
			key="base_ticker"
			width={276}
			height={88}
		/>
	{/if}
	<Text anchor={{ x: 0, y: 0.5 }} text={props.label} style={labelStyle} />
	<Text anchor={{ x: 1, y: 0.5 }} text={props.value} style={valueStyle} x={UI_BASE_FONT_SIZE * 10} />
{/if}
