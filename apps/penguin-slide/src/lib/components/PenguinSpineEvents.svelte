<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getContextSpine } from 'pixi-svelte';

  export let onEvent: (name: string) => void = () => {};

  const spine = getContextSpine();
  const listener = {
    event(_: any, payload: { name?: string; data?: { name?: string } }) {
      const name = payload?.data?.name ?? payload?.name;
      if (typeof name === 'string') {
        try {
          onEvent(name);
        } catch (error) {
          console.error('PenguinSpineEvents onEvent handler failed', error);
        }
      }
    }
  };

  let attached = false;

  onMount(() => {
    if (spine?.state?.addListener) {
      spine.state.addListener(listener);
      attached = true;
    }
  });

  onDestroy(() => {
    if (attached && spine?.state?.removeListener) {
      spine.state.removeListener(listener);
    }
  });
</script>
