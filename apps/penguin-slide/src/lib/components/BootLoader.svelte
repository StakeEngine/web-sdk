<script lang="ts">
	export let visible = false;
	export let src = '';
	export let alt = 'Loading game';
</script>

{#if visible}
	<div class="boot-loader">
		<img class="boot-loader-image" {src} {alt} />
	</div>
{/if}
