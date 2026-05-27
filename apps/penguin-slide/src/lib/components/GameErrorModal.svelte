<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let visible = false;
	export let t: (key: string, vars?: Record<string, string | number>) => string;
	export let titleKey = 'general_error_title';
	export let descKey = 'general_error_desc';

	const dispatch = createEventDispatcher<{ close: void }>();
	const close = () => dispatch('close');
</script>

{#if visible}
	<div class="round-overlay error-modal-overlay" onpointerdown={close}>
		<div class="round-card error-modal-card" onpointerdown={(event) => event.stopPropagation()}>
			<div class="round-kicker error-modal-kicker">{t('message_uc')}</div>
			<h3>{t(titleKey)}</h3>
			<p>{t(descKey)}</p>
			<div class="round-actions error-modal-actions">
				<button class="primary" type="button" onclick={close}>{t('close')}</button>
			</div>
		</div>
	</div>
{/if}
