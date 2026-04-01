<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getContextSpine } from 'pixi-svelte';

  export let mode: 'hidden' | 'force' | 'passthrough' = 'hidden';

  const spine = getContextSpine();
  const VEST_SLOT_NAMES = ['life belt', 'life belt2', 'vest'];
  const VEST_ATTACHMENT_NAMES = ['life belt', 'life_belt', 'lifebelt', 'life belt2', 'life_belt2', 'vest'];
  let vestSlots: any[] = [];
  let lastSkeletonRef: any = null;
  let enforceRafId: number | null = null;

  const findVestSlots = () => {
    const skeleton = spine?.skeleton;
    if (!skeleton) return [];
    if (skeleton !== lastSkeletonRef) {
      lastSkeletonRef = skeleton;
      vestSlots = [];
    }
    if (vestSlots.length) return vestSlots;
    const matches: any[] = [];
    for (const name of VEST_SLOT_NAMES) {
      const slotMatch = skeleton.findSlot(name);
      if (slotMatch && !matches.includes(slotMatch)) matches.push(slotMatch);
    }
    const slots = (skeleton.slots ?? skeleton.drawOrder ?? []) as any[];
    const normalizedAttachmentNames = new Set(
      VEST_ATTACHMENT_NAMES.map((name) => String(name).trim().toLowerCase()).filter(Boolean)
    );
    for (const slot of slots) {
      const slotName = String(slot?.data?.name ?? slot?.name ?? '')
        .trim()
        .toLowerCase();
      const setupName = String(
        slot?.data?.attachmentName ?? slot?.data?.attachment?.name ?? ''
      )
        .trim()
        .toLowerCase();
      if (
        (setupName && normalizedAttachmentNames.has(setupName)) ||
        (slotName && normalizedAttachmentNames.has(slotName))
      ) {
        if (!matches.includes(slot)) matches.push(slot);
      }
    }
    vestSlots = matches;
    return vestSlots;
  };

  const uniqueNames = (names: unknown[]) => {
    const set = new Set<string>();
    for (const name of names) {
      const value = String(name ?? '').trim();
      if (value) set.add(value);
    }
    return [...set];
  };

  const restoreVestAttachment = (slot: any) => {
    const skeleton = spine?.skeleton;
    if (!skeleton || !slot) return false;

    const setupAttachment = slot?.data?.attachment;
    if (setupAttachment) {
      slot.attachment = setupAttachment;
      return true;
    }

    const slotName = String(slot?.data?.name ?? slot?.name ?? '').trim();
    const attachmentNames = uniqueNames([slot?.data?.attachmentName, ...VEST_ATTACHMENT_NAMES]);

    if (typeof skeleton.setAttachment === 'function' && slotName) {
      for (const attachmentName of attachmentNames) {
        try {
          skeleton.setAttachment(slotName, attachmentName);
        } catch {}
        if (slot.attachment) return true;
      }
    }

    const slotIndex = Number(slot?.data?.index ?? slot?.index ?? -1);
    if (slotIndex >= 0) {
      const explicitVestSkin =
        typeof skeleton.data?.findSkin === 'function' ? skeleton.data.findSkin('vest') : null;
      const skins = [skeleton.skin, explicitVestSkin, skeleton.data?.defaultSkin]
        .filter(Boolean)
        .filter((skin, index, arr) => arr.indexOf(skin) === index);
      for (const skin of skins) {
        for (const attachmentName of attachmentNames) {
          const attachment = skin?.getAttachment?.(slotIndex, attachmentName);
          if (attachment) {
            slot.attachment = attachment;
            return true;
          }
        }
      }
    }

    return Boolean(slot.attachment);
  };

  const manageVestSlots = () => {
    const slots = findVestSlots();
    if (!slots.length) return;

    for (const slot of slots) {
      try {
        if (mode === 'hidden') {
          slot.attachment = null;
          if (slot?.color) {
            slot.color.a = 0;
          }
        } else {
          restoreVestAttachment(slot);
          if (slot?.color) {
            slot.color.r = 1;
            slot.color.g = 1;
            slot.color.b = 1;
            slot.color.a = 1;
          }
        }
      } catch {}
    }
  };

  const stopEnforceLoop = () => {
    if (enforceRafId != null) {
      cancelAnimationFrame(enforceRafId);
      enforceRafId = null;
    }
  };

  const startEnforceLoop = () => {
    if (typeof window === 'undefined' || enforceRafId != null || mode !== 'force') return;
    const tick = () => {
      if (mode !== 'force') {
        enforceRafId = null;
        return;
      }
      manageVestSlots();
      enforceRafId = requestAnimationFrame(tick);
    };
    enforceRafId = requestAnimationFrame(tick);
  };

  $: {
    mode;
    spine?.skeleton;
    manageVestSlots();
    if (mode === 'force') startEnforceLoop();
    else stopEnforceLoop();
  }

  onDestroy(() => {
    stopEnforceLoop();
  });
</script>
