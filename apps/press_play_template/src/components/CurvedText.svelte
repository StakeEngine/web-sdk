<script lang="ts">
	import { Container, BitmapText } from 'pixi-svelte';

	type Props = {
		text: string;
		radius: number;
		fontSize: number;
		fontFamily: string;
	};

	const props: Props = $props();

	// Approximate width per glyph relative to fontSize
	function glyphWidth(char: string): number {
		if (char === ' ') return props.fontSize * 0.38;
		return props.fontSize * 0.62;
	}

	const charData = $derived.by(() => {
		const chars = props.text.split('');
		const widths = chars.map(glyphWidth);
		const totalWidth = widths.reduce((a, b) => a + b, 0);

		let accumulated = 0;
		return chars.map((char, i) => {
			// offset from the centre of the text arc
			const centerOffset = accumulated + widths[i] / 2 - totalWidth / 2;
			const angle = centerOffset / props.radius;
			accumulated += widths[i];
			return {
				char,
				// dome arch: centre glyph at y=0, sides curve down
				x: Math.sin(angle) * props.radius,
				y: -Math.cos(angle) * props.radius + props.radius,
				rotation: angle,
			};
		});
	});
</script>

{#each charData as pos}
	{#if pos.char !== ' '}
		<Container x={pos.x} y={pos.y} rotation={pos.rotation}>
			<BitmapText
				text={pos.char}
				anchor={{ x: 0.5, y: 0.5 }}
				style={{ fontFamily: props.fontFamily, fontSize: props.fontSize }}
			/>
		</Container>
	{/if}
{/each}
