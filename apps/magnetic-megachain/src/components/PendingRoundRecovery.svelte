<script lang="ts">
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { forestStakeState } from '../state/forestStake.svelte';
	import { logForestDiagnostic } from '../utils/forestDiagnostics';

	const context = getContext();

	const showRecovery = $derived(
		forestStakeState.pendingRoundDetected && forestStakeState.bootStatus === 'error',
	);

	const retryResume = () => {
		if (!stateBet.betToResume?.active) return;
		if (stateBet.betToResume.mode) {
			stateBet.activeBetModeKey = stateBet.betToResume.mode;
		}
		forestStakeState.bootStatus = 'booting';
		forestStakeState.bootError = '';
		logForestDiagnostic('warn', 'pending_round_retry', {
			mode: stateBet.betToResume.mode,
		});
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	};
</script>

{#if showRecovery}
	<div class="recovery-overlay">
		<div class="recovery-card">
			<h2>{i18nDerived.recoveryTitle()}</h2>
			<p>{i18nDerived.recoveryBody()}</p>
			{#if forestStakeState.bootError}
				<p class="recovery-error">{forestStakeState.bootError}</p>
			{/if}
			<button type="button" onclick={retryResume}>{i18nDerived.retryResume()}</button>
		</div>
	</div>
{/if}

<style>
	.recovery-overlay {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: grid;
		place-items: center;
		padding: 20px;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(10px);
	}

	.recovery-card {
		width: min(480px, 100%);
		border-radius: 22px;
		padding: 22px;
		background: linear-gradient(180deg, rgba(32, 35, 20, 0.96), rgba(12, 14, 10, 0.98));
		border: 1px solid rgba(231, 196, 112, 0.35);
		box-shadow: 0 20px 44px rgba(0, 0, 0, 0.45);
		color: #fff8df;
		text-align: center;
	}

	.recovery-card h2 {
		margin: 0 0 10px;
		font-size: 1.2rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.recovery-card p {
		margin: 0 0 12px;
		line-height: 1.5;
	}

	.recovery-error {
		color: #ffd0d0;
		word-break: break-word;
	}

	.recovery-card button {
		width: 100%;
		border: none;
		border-radius: 999px;
		padding: 12px 14px;
		background: linear-gradient(180deg, #f0d068 0%, #c09224 100%);
		color: #17200f;
		font-size: 0.95rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}
 </style>
