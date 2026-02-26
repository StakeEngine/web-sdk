<script lang="ts">
  import { getContextSpine } from 'pixi-svelte';

  export let enabled = false;

  const spine = getContextSpine();
  const VEST_SLOT_NAMES = ['life belt', 'vest'];
  let defaultAttachment: any = null;
  let vestSlot: any = null;

  const findVestSlot = () => {
    if (vestSlot) return vestSlot;
    const skeleton = spine?.skeleton;
    if (!skeleton) return null;
    for (const name of VEST_SLOT_NAMES) {
      const slotMatch = skeleton.findSlot(name);
      if (slotMatch) {
        vestSlot = slotMatch;
        return vestSlot;
      }
    }
    return null;
  };

  const manageVestSlots = () => {
    const vestSlot = findVestSlot();
    if (!vestSlot) return;

    try {
      if (!defaultAttachment) {
        defaultAttachment = vestSlot.attachment ?? vestSlot.data?.attachment ?? null;
      }
      vestSlot.attachment = enabled ? defaultAttachment : null;
    } catch (error) {
      console.error('PenguinVestSlots failed to update vest slot', error);
    }
  };

  $: manageVestSlots();
</script>
