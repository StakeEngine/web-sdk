<script lang="ts">
	import type { Snippet } from 'svelte';

	type Element = null | HTMLDivElement;

	type Props = {
		type: 'column' | 'row';
		noScroll?: boolean;
		children: Snippet<[{ element: Element }]>;
	};

	let element = $state(null as Element);

	const props: Props = $props();
</script>

<div
	bind:this={element}
	class="content {props.type}"
	class:scrollX={!props.noScroll && props.type === 'row'}
	class:scrollY={!props.noScroll && props.type === 'column'}
>
	{@render props.children({ element })}
</div>

<style lang="scss">
	.content {
		position: relative;
		text-align: center;
		display: flex;
		gap: 1rem;
		width: 100%;
		min-height: 0;

		&.column {
			flex-direction: column;
			align-items: center;
			max-height: 100%;
			width: min(100%, calc(100vw - 2rem));
		}

		&.row {
			flex-direction: row;
			justify-content: center;
			max-width: 100%;
		}
	}
</style>
