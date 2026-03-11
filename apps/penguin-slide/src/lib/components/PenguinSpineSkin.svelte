<script lang="ts">
  import { getContextSpine } from 'pixi-svelte';

  export let skin: string = 'base';

  const spine = getContextSpine();

  $: {
    skin;
    const skeleton = spine?.skeleton;
    if (skeleton) {
      if (typeof skeleton.setSkinByName === 'function') {
        skeleton.setSkinByName(skin);
      }
      if (typeof skeleton.setSlotsToSetupPose === 'function') {
        skeleton.setSlotsToSetupPose();
      }
    }
  }
</script>
