<script lang="ts">
	import type { Snippet } from 'svelte';

	import { createContextParent, getContextApp } from '../context.svelte';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	const parentContext = createContextParent(context.stateApp.pixiApplication!.stage);
</script>

{@render props.children()}
