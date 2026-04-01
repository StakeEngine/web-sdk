<script lang="ts">
	export let visible = false;
	export let t: (key: string, vars?: Record<string, string | number>) => string;
	export let resolvePendingRound: (view: boolean) => void;
</script>

{#if visible}
	<div class="round-overlay">
		<div class="round-card">
			<h3>{t('resume_last_round')}</h3>
			<p>{t('resume_last_round_desc')}</p>
			<div class="round-actions">
				<button class="ghost" onclick={() => resolvePendingRound(false)}>{t('discard')}</button>
				<button class="primary" onclick={() => resolvePendingRound(true)}>{t('view')}</button>
			</div>
		</div>
	</div>
{/if}
