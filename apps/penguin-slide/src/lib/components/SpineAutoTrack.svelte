<script lang="ts">
  import type { Snippet } from 'svelte';

  export let children: Snippet = () => null;
</script>

{@render children()}
