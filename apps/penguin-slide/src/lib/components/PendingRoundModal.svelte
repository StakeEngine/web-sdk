<script lang="ts">
	export let visible = false;
	export let t: (key: string, vars?: Record<string, string | number>) => string;
	export let resolvePendingRound: (view: boolean) => void;
</script>

{#if visible}
	<div class="round-overlay">
		<div class="round-card pending-round-card">
			<button
				class="pending-round-close"
				type="button"
				aria-label={t('close')}
				onclick={() => resolvePendingRound(false)}
			>
				×
			</button>
			<div class="round-kicker pending-round-kicker">{t('message_uc')}</div>
			<h3>{t('round_in_progress_title')}</h3>
			<p>{t('round_in_progress_desc')}</p>
			<div class="round-actions pending-round-actions">
				<button class="pending-round-cancel" type="button" onclick={() => resolvePendingRound(false)}>
					{t('cancel')}
				</button>
				<button class="pending-round-replay" type="button" onclick={() => resolvePendingRound(true)}>
					{t('replay')}
				</button>
			</div>
		</div>
	</div>
{/if}
