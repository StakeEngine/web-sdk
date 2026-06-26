<script lang="ts">
	import { onMount } from 'svelte';
	import { stateBet, stateBetDerived } from 'state-shared';
	import { getContext } from '../game/context';
	import { forestStakeDerived } from '../state/forestStake.svelte';

	const ap = (p: string) => `./${p.startsWith('/') ? p.slice(1) : p}`;
	const cardFrame      = ap('/assets/components/frames/bonus_menu_frame.webp');
	const dealItIcon     = ap('/assets/components/ui/bonus_deal_it_icon.webp');
	const allInIcon      = ap('/assets/components/ui/bonus_all_in_icon.webp');
	const featureIcon    = ap('/assets/components/ui/bonus_feature_spin_icon.webp');
	const iconPlay       = ap('/assets/hud/icon-play.svg');
	const confirmPanelBg = ap('/assets/components/ui/confirm_frame.png?v=20260624');

	type Props = {
		onclose: () => void;
		isChanceActive: boolean;
		isFeatureActive: boolean;
		onToggleChance: () => void;
		onToggleFeature: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	const betAmount   = $derived(stateBet.betAmount);
	const chanceCost  = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 2));
	const dealItCost  = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 100));
	const allInCost   = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 400));
	const featureCost = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 20));
	const canBuy      = $derived(stateBetDerived.isBetCostAvailable());

	let confirmMode = $state<null | 'BONUS' | 'SUPER'>(null);

	const buyMode      = (mode: 'BONUS' | 'SUPER') => { stateBet.activeBetModeKey = mode; props.onclose(); context.eventEmitter.broadcast({ type: 'bet' }); };
	const openConfirm  = (mode: 'BONUS' | 'SUPER') => { confirmMode = mode; };
	const closeConfirm = () => { confirmMode = null; };
	const toggleActivateMode = (toggle: () => void) => { toggle(); props.onclose(); };

	const confirmLabel = $derived(confirmMode === 'SUPER' ? 'ALL IN' : 'DEAL IT');
	const confirmCost  = $derived(confirmMode === 'SUPER' ? allInCost : dealItCost);

	onMount(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			if (confirmMode) closeConfirm(); else props.onclose();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});
</script>

<!-- Backdrop -->
<button class="backdrop" type="button" aria-label="Close" tabindex="-1" onclick={props.onclose}></button>

<!-- Panel -->
<div class="panel" role="dialog" aria-modal="true">

	<button class="close-btn" type="button" onclick={props.onclose}>✕</button>

	<h2 class="title">BUY BONUS</h2>

	<div class="grid">

		<!-- DEAL IT -->
		<div class="card" style="--frame:url('{cardFrame}')">
			<span class="card-title">DEAL IT</span>
			<span class="card-desc">10 FREE SPINS · RANDOM EXPANDING SYMBOL · UP TO 250× MULTIPLIER</span>
			<img class="card-icon" src={dealItIcon} alt="" />
			<span class="card-price">{dealItCost}</span>
			<button class="card-btn card-btn--buy" type="button" disabled={!canBuy} onclick={() => openConfirm('BONUS')}>BUY</button>
		</div>

		<!-- CHANCE SPIN -->
		<div class="card" style="--frame:url('{cardFrame}')">
			<span class="card-title">CHANCE SPIN</span>
			<span class="card-desc">2× BET · 3× DEAL IT / ALL IN TRIGGER CHANCE · {chanceCost} / SPIN</span>
			<div class="card-icon-wrap">
				<img class="card-icon" src={featureIcon} alt="" />
				<img class="card-icon-overlay" src={iconPlay} alt="" />
			</div>
			<span class="card-price">{chanceCost} / spin</span>
			<button
				class="card-btn"
				class:card-btn--active={props.isChanceActive}
				type="button"
				onclick={() => toggleActivateMode(props.onToggleChance)}
			>{props.isChanceActive ? 'DEACTIVATE' : 'ACTIVATE'}</button>
		</div>

		<!-- FEATURE SPIN -->
		<div class="card" style="--frame:url('{cardFrame}')">
			<span class="card-title">FEATURE SPIN</span>
			<span class="card-desc">EVERY SPIN IS A 1-SPIN DEAL IT · {featureCost} / SPIN</span>
			<div class="card-icon-wrap">
				<img class="card-icon" src={featureIcon} alt="" />
				<img class="card-icon-overlay" src={iconPlay} alt="" />
			</div>
			<span class="card-price">{featureCost} / spin</span>
			<button
				class="card-btn"
				class:card-btn--active={props.isFeatureActive}
				type="button"
				onclick={() => toggleActivateMode(props.onToggleFeature)}
			>{props.isFeatureActive ? 'DEACTIVATE' : 'ACTIVATE'}</button>
		</div>

		<!-- ALL IN -->
		<div class="card" style="--frame:url('{cardFrame}')">
			<span class="card-title">ALL IN</span>
			<span class="card-desc">10 FREE SPINS · 2× START MULTIPLIER · DOUBLES ON EVERY WIN</span>
			<img class="card-icon" src={allInIcon} alt="" />
			<span class="card-price">{allInCost}</span>
			<button class="card-btn card-btn--buy" type="button" disabled={!canBuy} onclick={() => openConfirm('SUPER')}>BUY</button>
		</div>

	</div>
</div>

<!-- Confirm -->
{#if confirmMode}
	<button class="backdrop backdrop--z2" type="button" aria-label="Close" tabindex="-1" onclick={closeConfirm}></button>
	<button class="confirm-close" type="button" onclick={closeConfirm} aria-label="Close">✕</button>
	<div class="confirm" role="dialog" aria-modal="true">
		<div class="confirm-panel" style={`background-image:url('${confirmPanelBg}')`}>
			<div class="confirm-content">
				<div class="confirm-title">CONFIRM {confirmLabel}</div>
				<div class="confirm-text">Buy {confirmLabel} for {confirmCost}?</div>
				<div class="confirm-row">
					<button class="confirm-btn confirm-btn--cancel" type="button" onclick={closeConfirm}>CANCEL</button>
					<button class="confirm-btn confirm-btn--ok" type="button" onclick={() => buyMode(confirmMode!)}>CONFIRM</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Backdrops */
	.backdrop {
		position: fixed; inset: 0; z-index: 60;
		background: rgba(0,0,0,0.72);
		backdrop-filter: blur(5px);
		border: 0; padding: 0; cursor: pointer;
	}
	.backdrop--z2 { z-index: 70; }

	/* Panel */
	.panel {
		position: fixed; left: 50%; top: 50%;
		transform: translate(-50%, -50%);
		z-index: 61;
		width: min(680px, 96vw);
		padding: 28px 24px 28px;
	}

	.title {
		margin: 0 0 20px;
		font-family: 'Cinzel', serif; font-size: 1.35rem; font-weight: 900; letter-spacing: 0.12em;
		text-align: center;
		background: linear-gradient(180deg, #e2d981 8.6%, #fbc503 60.4%, #d98503 129.3%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
	}

	.close-btn {
		position: absolute; top: 10px; right: 14px;
		width: 44px; height: 44px; border-radius: 50%;
		background: rgba(12,8,3,0.93);
		border: 2px solid #9a7018;
		box-shadow: 0 0 0 1px rgba(210,175,55,0.25), 0 4px 14px rgba(0,0,0,0.75);
		color: rgba(255,255,255,0.85); font-size: 1rem;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; padding: 0;
		transition: background 0.2s;
	}
	.close-btn:hover { background: rgba(30,20,8,0.97); color: #fff; }

	/* 2×2 grid */
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	/* Card */
	.card {
		display: flex; flex-direction: column; align-items: center;
		text-align: center;
		padding: 22px 18px 18px;
		background-image: var(--frame);
		background-size: 100% 100%;
		border-radius: 4px;
		gap: 8px;
	}

	.card-title {
		font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 900;
		letter-spacing: 0.06em;
		background: linear-gradient(180deg, #e2d981 8.6%, #fbc503 60.4%, #d98503 129.3%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
		display: block;
	}

	.card-desc {
		font-family: 'Cinzel', serif; font-size: 0.52rem;
		color: rgba(255,255,255,0.75); letter-spacing: 0.02em;
		line-height: 1.45; display: block;
		min-height: 2.9em;
	}

	.card-icon-wrap {
		position: relative;
		width: 80px; height: 80px;
		margin: 4px 0;
		flex-shrink: 0;
	}
	.card-icon {
		width: 80px; height: 80px;
		object-fit: contain;
	}
	.card-icon-overlay {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 30px; height: 30px;
		filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8));
	}

	.card-price {
		font-family: 'Cinzel', serif; font-size: 0.88rem; font-weight: 700;
		color: rgba(255,255,255,0.9); letter-spacing: 0.04em;
		display: block;
	}

	/* Buttons */
	.card-btn {
		width: 100%; padding: 9px 0;
		border-radius: 8px;
		font-family: 'Cinzel', serif; font-size: 0.78rem; font-weight: 900;
		letter-spacing: 0.1em; cursor: pointer;
		border: 2px solid rgba(200,158,80,0.6);
		background: transparent;
		color: rgba(210,170,60,0.9);
		transition: background 0.2s, border-color 0.2s, color 0.2s;
		margin-top: 4px;
	}
	.card-btn:hover:not(:disabled) {
		border-color: rgba(220,175,90,0.9);
		color: #ffd84a;
	}
	.card-btn--buy {
		background: linear-gradient(180deg, #4ecb2e 0%, #2a8a10 100%);
		border-color: rgba(80,200,50,0.5);
		color: #fff;
		box-shadow: 0 0 12px rgba(60,180,30,0.35);
	}
	.card-btn--buy:hover:not(:disabled) {
		background: linear-gradient(180deg, #5fd93e 0%, #348f18 100%);
		color: #fff;
	}
	.card-btn--buy:disabled { opacity: 0.4; cursor: default; }
	.card-btn--active {
		background: linear-gradient(180deg, #4ecb2e 0%, #2a8a10 100%);
		border-color: rgba(80,200,50,0.5);
		color: #fff;
		box-shadow: 0 0 12px rgba(60,180,30,0.35);
	}

	/* Confirm */
	/* Round wood close button, pinned to the top-right end of the screen */
	.confirm-close {
		position: fixed; top: 22px; right: 22px; z-index: 73;
		width: 52px; height: 52px; border-radius: 50%;
		border: 2px solid rgba(217, 133, 3, 0.7);
		background: radial-gradient(circle at 50% 35%, #3a2a16, #140d06);
		color: #e8c878; font-size: 1.1rem; font-weight: 700;
		cursor: pointer; display: grid; place-items: center;
		box-shadow: 0 4px 12px rgba(0,0,0,0.5);
		transition: filter 0.12s ease;
	}
	.confirm-close:hover { filter: brightness(1.2); }

	.confirm {
		position: fixed; left: 50%; top: 50%;
		transform: translate(-50%, -50%);
		z-index: 71;
		width: min(680px, 94vw);
		font-family: 'Cinzel', serif;
	}

	/* Wooden panel background (shared with the autoplay dialog) */
	.confirm-panel {
		aspect-ratio: 505 / 301;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		display: flex; align-items: center; justify-content: center;
		padding: 15% 13%;
		box-sizing: border-box;
	}

	.confirm-content {
		width: 100%;
		display: flex; flex-direction: column; align-items: center;
		gap: clamp(14px, 2.6vw, 26px);
		text-align: center;
	}

	.confirm-title {
		font-weight: 900; font-size: clamp(1.4rem, 3.2vw, 2.1rem);
		letter-spacing: 0.06em;
		background: linear-gradient(180deg, #ffd84a 10%, #ffa90e 60%, #d18005 95%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
		text-shadow: 0 2px 6px rgba(0,0,0,0.5);
	}
	.confirm-text {
		font-size: clamp(0.95rem, 2vw, 1.25rem); font-weight: 700;
		color: #fff; line-height: 1.45;
		text-shadow: 0 2px 4px rgba(0,0,0,0.7);
	}
	.confirm-row { display: flex; gap: 16px; justify-content: center; width: 100%; }
	.confirm-btn {
		flex: 1 1 0; border-radius: 11px; padding: clamp(11px, 2vw, 16px);
		font-family: 'Cinzel', serif; font-size: clamp(0.85rem, 1.7vw, 1.05rem); font-weight: 900;
		letter-spacing: 0.06em; cursor: pointer;
		transition: filter 0.12s ease;
	}
	.confirm-btn:hover { filter: brightness(1.08); }
	.confirm-btn--cancel {
		border: 1px solid rgba(217,133,3,0.5);
		background: rgba(20, 14, 6, 0.6); color: #e8c878;
	}
	.confirm-btn--ok {
		border: 0;
		background: linear-gradient(180deg, #ffa90e 15%, #ee960b 70%, #d18005 93%);
		color: #452b01;
		box-shadow: 0 0 4px #d98503;
	}
</style>
