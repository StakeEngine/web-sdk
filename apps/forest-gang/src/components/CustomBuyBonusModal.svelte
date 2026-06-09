<script lang="ts">
	import { onMount } from 'svelte';
	import { stateBet, stateBetDerived } from 'state-shared';
	import { getContext } from '../game/context';
	import { forestStakeDerived } from '../state/forestStake.svelte';

	type Props = {
		onclose: () => void;
		isFeatureActive: boolean;
		onToggleFeature: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	const betAmount = $derived(stateBet.betAmount);
	const dealItCost  = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 100));
	const allInCost   = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 400));
	const featureCost = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 20));
	const canBuy = $derived(stateBetDerived.isBetCostAvailable());
	let confirmMode = $state<null | 'BONUS' | 'SUPER'>(null);

	const buyMode = (mode: 'BONUS' | 'SUPER') => {
		stateBet.activeBetModeKey = mode;
		props.onclose();
		context.eventEmitter.broadcast({ type: 'bet' });
	};

	const openConfirm = (mode: 'BONUS' | 'SUPER') => {
		confirmMode = mode;
	};

	const closeConfirm = () => {
		confirmMode = null;
	};

	const confirmLabel = $derived(confirmMode === 'SUPER' ? 'ALL IN' : 'DEAL IT');
	const confirmCost = $derived(confirmMode === 'SUPER' ? allInCost : dealItCost);

	onMount(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			if (confirmMode) closeConfirm();
			else props.onclose();
		};

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});
</script>

<button class="modal-backdrop" type="button" aria-label="Close bonus menu" tabindex="-1" onclick={props.onclose}></button>
<div class="modal-panel" role="dialog" aria-modal="true">
		<div class="modal-header">
			<span class="modal-title">BONUS MENU</span>
			<button class="modal-close" type="button" onclick={props.onclose}>✕</button>
		</div>

		<div class="modal-body">
			<!-- Deal It -->
			<button class="buy-option" type="button" onclick={() => openConfirm('BONUS')} disabled={!canBuy}>
				<div class="buy-option__name">DEAL IT</div>
				<div class="buy-option__detail">10 free spins · random expanding symbol · up to 250× multiplier</div>
				<div class="buy-option__cost">{dealItCost}</div>
			</button>

			<!-- All In -->
			<button class="buy-option buy-option--premium" type="button" onclick={() => openConfirm('SUPER')} disabled={!canBuy}>
				<div class="buy-option__name">ALL IN</div>
				<div class="buy-option__detail">5 free spins · random start multiplier · doubles each win · max 20,000×</div>
				<div class="buy-option__cost">{allInCost}</div>
			</button>

			<!-- Feature Spin toggle -->
			<div class="feature-row" class:feature-row--active={props.isFeatureActive}>
				<div class="feature-row__info">
					<div class="feature-row__name">FEATURE SPIN</div>
					<div class="feature-row__detail">Every spin is a 1-spin Deal It · {featureCost} / spin</div>
				</div>
				<button
					class="feature-switch"
					class:feature-switch--on={props.isFeatureActive}
					type="button"
					onclick={props.onToggleFeature}
					aria-label="Feature Spin toggle"
					aria-pressed={props.isFeatureActive}
				>
					<span class="feature-switch__track">
						<span class="feature-switch__thumb"></span>
					</span>
				</button>
			</div>
		</div>
</div>

{#if confirmMode}
	<button class="confirm-backdrop" type="button" aria-label="Close confirmation" tabindex="-1" onclick={closeConfirm}></button>
	<div class="confirm-panel" role="dialog" aria-modal="true">
			<div class="confirm-title">CONFIRM {confirmLabel}</div>
			<div class="confirm-text">
				Buy {confirmLabel} for {confirmCost}?
			</div>
			<div class="confirm-actions">
				<button class="confirm-btn confirm-btn--cancel" type="button" onclick={closeConfirm}>CANCEL</button>
				<button class="confirm-btn confirm-btn--ok" type="button" onclick={() => buyMode(confirmMode)}>
					CONFIRM
				</button>
			</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(4px);
		border: 0;
		padding: 0;
		cursor: pointer;
	}

	.modal-panel {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		z-index: 61;
		width: min(420px, 90vw);
		border-radius: 20px;
		background: linear-gradient(180deg, rgba(28, 32, 18, 0.98), rgba(10, 12, 8, 0.99));
		border: 1px solid rgba(231, 196, 112, 0.4);
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px 12px;
		border-bottom: 1px solid rgba(231, 196, 112, 0.2);
	}

	.modal-title {
		font-family: 'Cinzel', serif;
		font-size: 1.1rem;
		font-weight: 900;
		color: #ffd84a;
		letter-spacing: 0.1em;
	}

	.modal-close {
		border: none;
		background: none;
		color: rgba(255, 255, 255, 0.5);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 4px 8px;
	}

	.modal-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.buy-option {
		width: 100%;
		border: 1px solid rgba(188, 141, 39, 0.4);
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.04);
		color: #fff;
		text-align: left;
		padding: 14px 16px;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
	}

	.buy-option:hover:not(:disabled) {
		border-color: rgba(255, 216, 74, 0.7);
		background: rgba(255, 216, 74, 0.06);
	}

	.buy-option:disabled { opacity: 0.45; cursor: default; }

	.buy-option--premium {
		border-color: rgba(100, 60, 200, 0.5);
	}

	.buy-option--premium:hover:not(:disabled) {
		border-color: rgba(160, 100, 255, 0.8);
		background: rgba(160, 100, 255, 0.06);
	}

	.buy-option__name {
		font-family: 'Cinzel', serif;
		font-size: 0.95rem;
		font-weight: 900;
		color: #ffd84a;
		letter-spacing: 0.06em;
		margin-bottom: 4px;
	}

	.buy-option--premium .buy-option__name { color: #c090ff; }

	.buy-option__detail {
		font-family: 'Cinzel', serif;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.55);
		line-height: 1.3;
		margin-bottom: 8px;
	}

	.buy-option__cost {
		font-family: 'Cinzel', serif;
		font-size: 1.05rem;
		font-weight: 700;
		color: #fff;
	}

	/* Feature row */
	.feature-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border: 1px solid rgba(188, 141, 39, 0.3);
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.04);
		padding: 12px 16px;
		transition: border-color 0.2s;
	}

	.feature-row--active {
		border-color: rgba(255, 216, 74, 0.6);
		background: rgba(255, 216, 74, 0.05);
	}

	.feature-row__name {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		font-weight: 900;
		color: rgba(255, 255, 255, 0.75);
		letter-spacing: 0.06em;
		margin-bottom: 3px;
	}

	.feature-row--active .feature-row__name { color: #ffd84a; }

	.feature-row__detail {
		font-family: 'Cinzel', serif;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.45);
		line-height: 1.3;
	}

	/* Sliding switch */
	.feature-switch {
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
		flex-shrink: 0;
	}

	.feature-switch__track {
		display: block;
		position: relative;
		width: 44px;
		height: 24px;
		border-radius: 24px;
		background: rgba(80, 80, 80, 0.8);
		transition: background 0.25s;
	}

	.feature-switch--on .feature-switch__track { background: #ffd84a; }

	.feature-switch__thumb {
		display: block;
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.25s;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
	}

	.feature-switch--on .feature-switch__thumb { transform: translateX(20px); }

	.confirm-backdrop {
		position: fixed;
		inset: 0;
		z-index: 70;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(6px);
		border: 0;
		padding: 0;
		cursor: pointer;
	}

	.confirm-panel {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		z-index: 71;
		width: min(360px, 88vw);
		border-radius: 18px;
		background: linear-gradient(180deg, rgba(20, 22, 14, 0.98), rgba(8, 10, 6, 0.99));
		border: 1px solid rgba(231, 196, 112, 0.5);
		box-shadow: 0 22px 44px rgba(0, 0, 0, 0.65);
		padding: 18px 18px 16px;
		text-align: center;
	}

	.confirm-title {
		font-family: 'Cinzel', serif;
		font-size: 1rem;
		font-weight: 900;
		color: #ffd84a;
		letter-spacing: 0.08em;
		margin-bottom: 10px;
	}

	.confirm-text {
		font-family: 'Cinzel', serif;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.86);
		line-height: 1.4;
		margin-bottom: 16px;
	}

	.confirm-actions {
		display: flex;
		gap: 10px;
		justify-content: center;
	}

	.confirm-btn {
		border: 1px solid rgba(231, 196, 112, 0.35);
		border-radius: 12px;
		padding: 10px 14px;
		font-family: 'Cinzel', serif;
		font-size: 0.82rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		cursor: pointer;
	}

	.confirm-btn--cancel {
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.8);
	}

	.confirm-btn--ok {
		background: linear-gradient(180deg, #f7cf59, #c79116);
		color: #1f1300;
	}
</style>
