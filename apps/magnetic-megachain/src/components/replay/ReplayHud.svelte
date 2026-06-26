<script lang="ts">
	import { stateBet, stateUi } from 'state-shared';

	import { getContext } from '../../game/context';
	import { forestStakeDerived, forestStakeState } from '../../state/forestStake.svelte';
	import { logForestDiagnostic } from '../../utils/forestDiagnostics';

	const context = getContext();

	const isReplayMode = $derived(stateUi.config.mode === 'replay');
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const mobileUi = $derived(['portrait', 'landscape'].includes(layoutType));
	const selectedMode = $derived(forestStakeDerived.selectedModeLabel());
	const replayReady = $derived(Boolean(forestStakeState.replaySnapshot));
	const replayRunning = $derived(forestStakeState.replayRunning);
	const replayHasPlayed = $derived(forestStakeState.replayHasPlayed);
	const replayNeedsStart = $derived(replayReady && !replayRunning && !forestStakeState.replayStartRequested);
	const replayError = $derived(forestStakeState.bootStatus === 'error' ? forestStakeState.bootError : '');
	const replayBetText = $derived(forestStakeDerived.formatCurrencyAmount(forestStakeDerived.replayBetAmount()));
	const replayCostText = $derived(forestStakeDerived.formatCurrencyAmount(forestStakeDerived.replayCostAmount()));
	const replayPayoutText = $derived(
		forestStakeDerived.formatCurrencyAmount(forestStakeDerived.replayPayoutAmount()),
	);
	const replayWinText = $derived(
		forestStakeDerived.formatCurrencyAmount(forestStakeDerived.replayWinAmount()),
	);

	const replayValueStyle = (text: string) => {
		if (!mobileUi) return '';
		const visibleLength = String(text ?? '').replace(/\s+/g, '').length;
		let scale = 1;
		let letterSpacing = 0;
		if (visibleLength >= 18) {
			scale = 0.56;
			letterSpacing = -0.065;
		} else if (visibleLength >= 16) {
			scale = 0.66;
			letterSpacing = -0.05;
		} else if (visibleLength >= 14) {
			scale = 0.76;
			letterSpacing = -0.032;
		} else if (visibleLength >= 12) {
			scale = 0.83;
			letterSpacing = -0.02;
		}
		return `--replay-value-scale:${scale};--replay-value-letter-spacing:${letterSpacing}em;`;
	};

	const startReplay = () => {
		if (!forestStakeDerived.requestReplayStart() || !forestStakeState.replaySnapshot) return;
		stateBet.betToResume = structuredClone(forestStakeState.replaySnapshot);
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	};

	const replayAgain = () => {
		if (!forestStakeDerived.requestReplayStart() || !forestStakeState.replaySnapshot) return;
		stateBet.betToResume = structuredClone(forestStakeState.replaySnapshot);
		logForestDiagnostic('info', 'replay_again_pressed', {
			eventId: forestStakeState.replayEventId,
		});
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	};
</script>

{#if isReplayMode}
	<div class="replay-hud">
		<div class="replay-topbar">
			<div class="replay-brand">
				<span class="replay-title">{forestStakeDerived.t('GAME TITLE')}</span>
				<span class="replay-badge">{forestStakeDerived.t('REPLAY')}</span>
			</div>
			<div class="replay-meta">
				<span class="replay-chip">{selectedMode}</span>
				{#if forestStakeState.replayEventId}
					<span class="replay-chip">{forestStakeDerived.t('EVENT')} {forestStakeState.replayEventId}</span>
				{/if}
			</div>
		</div>

		<div class="replay-panel">
			<div class="replay-stats">
				<div class="replay-stat">
					<span>{forestStakeDerived.t('BET SIZE')}</span>
					<strong style={replayValueStyle(replayBetText)}>{replayBetText}</strong>
				</div>
				<div class="replay-stat">
					<span>{forestStakeDerived.t('TOTAL COST')}</span>
					<strong style={replayValueStyle(replayCostText)}>{replayCostText}</strong>
				</div>
				<div class="replay-stat">
					<span>{forestStakeDerived.t('PAYOUT')}</span>
					<strong style={replayValueStyle(replayPayoutText)}>{replayPayoutText}</strong>
				</div>
				<div class="replay-stat">
					<span>{forestStakeDerived.t('WIN')}</span>
					<strong style={replayValueStyle(replayWinText)}>{replayWinText}</strong>
				</div>
			</div>

			{#if replayError}
				<div class="replay-error-block">
					<p>{replayError}</p>
				</div>
			{:else if replayNeedsStart}
				<button class="replay-primary" type="button" onclick={startReplay}>
					{forestStakeDerived.t('START REPLAY')}
				</button>
			{:else if replayReady && !replayRunning && replayHasPlayed}
				<button class="replay-primary" type="button" onclick={replayAgain}>
					{forestStakeDerived.t('PLAY AGAIN')}
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.replay-hud {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 50;
		color: #f9f1d2;
		font-family: 'Poppins', sans-serif;
	}

	.replay-topbar {
		position: absolute;
		inset: calc(12px + env(safe-area-inset-top, 0px)) 12px auto 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.replay-brand,
	.replay-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.replay-title {
		font-size: 18px;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	}

	.replay-badge,
	.replay-chip {
		border-radius: 999px;
		border: 1px solid rgba(231, 196, 112, 0.34);
		background: rgba(18, 23, 12, 0.8);
		padding: 6px 10px;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.replay-badge {
		background: rgba(80, 48, 16, 0.88);
	}

	.replay-panel {
		position: absolute;
		right: 12px;
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		width: min(324px, calc(100vw - 24px));
		border-radius: 18px;
		border: 1px solid rgba(231, 196, 112, 0.24);
		background: rgba(18, 23, 12, 0.82);
		backdrop-filter: blur(10px);
		padding: 10px;
		pointer-events: auto;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.32);
	}

	.replay-stats {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	.replay-stat {
		display: grid;
		gap: 4px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
		padding: 8px 9px;
	}

	.replay-stat span {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(249, 241, 210, 0.72);
	}

	.replay-stat strong {
		font-size: calc(17px * var(--replay-value-scale, 1));
		line-height: 1.1;
		letter-spacing: var(--replay-value-letter-spacing, 0);
		color: #fff8df;
		white-space: nowrap;
	}

	.replay-primary {
		margin-top: 8px;
		width: 100%;
		border: none;
		border-radius: 999px;
		padding: 10px 12px;
		background: linear-gradient(180deg, #f0d068 0%, #c09224 100%);
		color: #17200f;
		font-size: 13px;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.replay-error-block {
		margin-top: 8px;
	}

	.replay-error-block p {
		margin: 0;
		color: #ffd2d2;
		font-size: 12px;
		line-height: 1.45;
		word-break: break-word;
	}
</style>
