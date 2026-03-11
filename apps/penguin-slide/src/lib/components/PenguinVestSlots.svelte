<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getContextSpine } from 'pixi-svelte';

  export let enabled = false;

  const spine = getContextSpine();
  const VEST_SLOT_NAMES = ['life belt', 'vest'];
  const VEST_ATTACHMENT_NAMES = ['life belt', 'life_belt', 'lifebelt', 'vest'];
  let vestSlot: any = null;
  let lastSkeletonRef: any = null;
  let enforceRafId: number | null = null;

  const findVestSlot = () => {
    const skeleton = spine?.skeleton;
    if (!skeleton) return null;
    if (skeleton !== lastSkeletonRef) {
      lastSkeletonRef = skeleton;
      vestSlot = null;
    }
    if (vestSlot) return vestSlot;
    for (const name of VEST_SLOT_NAMES) {
      const slotMatch = skeleton.findSlot(name);
      if (slotMatch) {
        vestSlot = slotMatch;
        return vestSlot;
      }
    }
    const slots = (skeleton.slots ?? skeleton.drawOrder ?? []) as any[];
    const normalizedAttachmentNames = new Set(
      VEST_ATTACHMENT_NAMES.map((name) => String(name).trim().toLowerCase()).filter(Boolean)
    );
    for (const slot of slots) {
      const setupName = String(
        slot?.data?.attachmentName ?? slot?.data?.attachment?.name ?? ''
      )
        .trim()
        .toLowerCase();
      if (setupName && normalizedAttachmentNames.has(setupName)) {
        vestSlot = slot;
        return vestSlot;
      }
    }
    return null;
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
    const slot = findVestSlot();
    if (!slot) return;

    try {
      if (!enabled) {
        slot.attachment = null;
        if (slot?.color) {
          slot.color.a = 0;
        }
      } else {
        restoreVestAttachment(slot);
        // Some tracks keep this slot alpha at 0; force it visible while enabled.
        if (slot?.color) {
          slot.color.r = 1;
          slot.color.g = 1;
          slot.color.b = 1;
          slot.color.a = 1;
        }
      }
    } catch {}
  };

  const stopEnforceLoop = () => {
    if (enforceRafId != null) {
      cancelAnimationFrame(enforceRafId);
      enforceRafId = null;
    }
  };

  const startEnforceLoop = () => {
    if (typeof window === 'undefined' || enforceRafId != null || !enabled) return;
    const tick = () => {
      if (!enabled) {
        enforceRafId = null;
        return;
      }
      manageVestSlots();
      enforceRafId = requestAnimationFrame(tick);
    };
    enforceRafId = requestAnimationFrame(tick);
  };

  $: {
    enabled;
    spine?.skeleton;
    manageVestSlots();
    if (enabled) startEnforceLoop();
    else stopEnforceLoop();
  }

  onDestroy(() => {
    stopEnforceLoop();
  });
</script>
