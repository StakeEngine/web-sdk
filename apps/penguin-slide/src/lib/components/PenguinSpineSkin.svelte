<script lang="ts">
  import { getContextSpine } from 'pixi-svelte';

  export let skin: string = 'base';

  const spine = getContextSpine();

  const applySkin = () => {
    if (!spine) return;
    const skeleton = spine.skeleton;
    if (!skeleton) return;
    if (typeof skeleton.setSkinByName === 'function') {
      skeleton.setSkinByName(skin);
    }
    if (typeof skeleton.setSlotsToSetupPose === 'function') {
      skeleton.setSlotsToSetupPose();
    }
  };

  $: applySkin();
</script>
