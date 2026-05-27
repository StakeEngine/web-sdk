<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({ title: 'COMPONENTS/Symbol' });
</script>

<script lang="ts">
	import { StoryPixiApp } from 'components-storybook';
	import Symbol from '../components/Symbol.svelte';
</script>

<Story name="component">
	<StoryPixiApp>
		<Symbol rawSymbol={{ name: 'FOX' }} state={'static'} x={120} y={120} />
	</StoryPixiApp>
</Story>

<Story name="symbols">
	<StoryPixiApp>
		{#each ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL', 'A', 'K', 'Q', 'J', 'T', 'WILD', 'SCATTER'] as name, i}
			<Symbol rawSymbol={{ name }} state={'static'} x={80 + (i % 4) * 120} y={80 + Math.floor(i / 4) * 120} />
		{/each}
	</StoryPixiApp>
</Story>
