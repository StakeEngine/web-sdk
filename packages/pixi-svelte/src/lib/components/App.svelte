<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';

	import { getContextApp } from '../context.svelte';

	import InitialiseApplication from './InitialiseApplication.svelte';
	import InitialiseParent from './InitialiseParent.svelte';
	import AssetsLoader from './AssetsLoader.svelte';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	onMount(() => context.stateApp.reset());
	onDestroy(() => context.stateApp.reset());
</script>

<InitialiseApplication>
	{#if context.stateApp.pixiApplication}
		<InitialiseParent>
			<AssetsLoader>
				{@render props.children()}
			</AssetsLoader>
		</InitialiseParent>
	{/if}
</InitialiseApplication>
