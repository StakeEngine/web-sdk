<script lang="ts">
	export let t: (key: string, vars?: Record<string, string | number>) => string;
	export let formatCurrencyAmount: (amount: number, fractionDigits?: number) => string;
	export let timeLabel = '';
	export let selectedMode = '';
	export let replayEventId = '';
	export let replayReady = false;
	export let replayRunning = false;
	export let replayHasPlayed = false;
	export let replayError = '';
	export let replayBetAmount = 0;
	export let replayCostAmount = 0;
	export let replayPayoutAmount = 0;
	export let replayWinAmount = 0;
	export let onReplayStart: () => void = () => {};
	export let onReplayRetry: () => void = () => {};
	export let mobileUi = false;
	let replayBetText = '';
	let replayCostText = '';
	let replayPayoutText = '';
	let replayWinText = '';

	$: replayBetText = formatCurrencyAmount(safeAmount(replayBetAmount));
	$: replayCostText = formatCurrencyAmount(safeAmount(replayCostAmount));
	$: replayPayoutText = formatCurrencyAmount(safeAmount(replayPayoutAmount));
	$: replayWinText = formatCurrencyAmount(safeAmount(replayWinAmount));

	function safeAmount(value: number) {
		return Number.isFinite(value) ? value : 0;
	}

	function replayValueStyle(text: string) {
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
		} else if (visibleLength >= 13) {
			scale = 0.8;
			letterSpacing = -0.026;
		} else if (visibleLength >= 12) {
			scale = 0.83;
			letterSpacing = -0.02;
		} else if (visibleLength >= 11) {
			scale = 0.9;
			letterSpacing = -0.01;
		}
		return `--replay-value-scale:${scale};--replay-value-letter-spacing:${letterSpacing}em;`;
	}
</script>

<div class="replay-hud">
	<div class="replay-topbar">
		<div class="replay-brand">
			<span class="replay-title">{t('game_title')}</span>
			<span class="replay-badge">REPLAY</span>
		</div>
		<div class="replay-meta">
			{#if selectedMode}
				<span class="replay-chip">{selectedMode}</span>
			{/if}
			{#if replayEventId}
				<span class="replay-chip">EVENT {replayEventId}</span>
			{/if}
			{#if timeLabel}
				<span class="replay-chip">{timeLabel}</span>
			{/if}
		</div>
	</div>

	<div class="replay-panel">
		<div class="replay-stats">
			<div class="replay-stat">
				<span>{t('bet_size')}</span>
				<strong style={replayValueStyle(replayBetText)}>{replayBetText}</strong>
			</div>
			<div class="replay-stat">
				<span>{t('total_cost')}</span>
				<strong style={replayValueStyle(replayCostText)}>{replayCostText}</strong>
			</div>
			<div class="replay-stat">
				<span>{t('payout_label')}</span>
				<strong style={replayValueStyle(replayPayoutText)}>{replayPayoutText}</strong>
			</div>
			<div class="replay-stat">
				<span>WIN</span>
				<strong style={replayValueStyle(replayWinText)}>{replayWinText}</strong>
			</div>
		</div>

		{#if replayError}
			<div class="replay-error-block">
				<p>{replayError}</p>
				<button class="replay-primary" onclick={onReplayRetry}>Retry</button>
			</div>
		{:else if replayReady && !replayRunning}
			<button class="replay-primary" onclick={onReplayStart}>
				{replayHasPlayed ? 'PLAY AGAIN' : t('start')}
			</button>
		{/if}
	</div>
</div>

<style>
	.replay-hud {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 1001;
		color: #f4fbff;
		font-family: 'Poppins', sans-serif;
	}

	.replay-topbar {
		position: absolute;
		inset:
			calc(12px + env(safe-area-inset-top, 0px))
			12px
			auto
			12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		pointer-events: none;
	}

	.replay-brand,
	.replay-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.replay-title {
		font-family: 'Gigalypse', 'Poppins', sans-serif;
		font-size: 18px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		-webkit-text-stroke: 1px #000;
	}

	.replay-badge,
	.replay-chip {
		border-radius: 999px;
		border: 1px solid rgba(166, 219, 255, 0.25);
		background: rgba(6, 20, 32, 0.78);
		padding: 6px 10px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.replay-badge {
		background: rgba(18, 63, 112, 0.82);
	}

	.replay-panel {
		position: absolute;
		left: auto;
		right: 12px;
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		width: min(320px, calc(100vw - 24px));
		max-height: min(30vh, 214px);
		border-radius: 16px;
		border: 1px solid rgba(166, 219, 255, 0.24);
		background: rgba(6, 20, 32, 0.72);
		backdrop-filter: blur(12px);
		padding: 10px;
		pointer-events: auto;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);
		overflow: auto;
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
		background: rgba(255, 255, 255, 0.04);
		padding: 8px 9px;
	}

	.replay-stat span {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(233, 243, 255, 0.7);
	}

	.replay-stat strong {
		--replay-value-base-size: 17px;
		font-size: calc(var(--replay-value-base-size) * var(--replay-value-scale, 1));
		line-height: 1.1;
		letter-spacing: var(--replay-value-letter-spacing, 0);
		color: #fff;
		white-space: nowrap;
		min-width: 0;
	}

	.replay-primary {
		margin-top: 6px;
		width: 100%;
		border-radius: 999px;
		padding: 10px 12px;
		background: linear-gradient(180deg, #fbcf00 0%, #e3ac00 100%);
		color: #142030;
		font-size: 13px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.replay-error-block {
		margin-top: 8px;
		display: grid;
		gap: 8px;
	}

	.replay-error-block p {
		margin: 0;
		color: #fecdd3;
		font-size: 12px;
		line-height: 1.45;
		word-break: break-word;
	}

	@media (max-width: 720px) {
		.replay-topbar {
			inset:
				calc(10px + env(safe-area-inset-top, 0px))
				10px
				auto
				10px;
			gap: 8px;
		}

		.replay-panel {
			left: auto;
			right: 10px;
			bottom: calc(10px + env(safe-area-inset-bottom, 0px));
			width: min(292px, calc(100vw - 20px));
			padding: 9px;
			max-height: min(27vh, 196px);
		}

		.replay-title {
			font-size: 16px;
		}

		.replay-meta {
			max-width: 68%;
			justify-content: flex-end;
		}
	}

	@media (max-width: 540px), (orientation: portrait) and (max-width: 768px) {
		.replay-topbar {
			align-items: flex-start;
		}

		.replay-panel {
			left: 10px;
			right: 10px;
			bottom: calc(8px + env(safe-area-inset-bottom, 0px));
			width: auto;
			max-height: min(19vh, 146px);
			padding: 7px 7px 6px;
		}

		.replay-stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 6px;
		}

		.replay-stat {
			padding: 6px 7px;
		}

		.replay-stat span {
			font-size: 8px;
		}

		.replay-stat strong {
			--replay-value-base-size: 16px;
		}

		.replay-primary {
			margin-top: 5px;
			padding: 8px 10px;
			font-size: 11px;
		}

		.replay-title {
			font-size: 15px;
		}

		.replay-badge,
		.replay-chip {
			padding: 5px 9px;
			font-size: 9px;
		}
	}
</style>
