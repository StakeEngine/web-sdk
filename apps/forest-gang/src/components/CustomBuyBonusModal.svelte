<script lang="ts">
	import { onMount } from 'svelte';
	import { stateBet, stateBetDerived } from 'state-shared';
	import { getContext } from '../game/context';
	import { forestStakeDerived } from '../state/forestStake.svelte';

	const ap = (p: string) => `./${p.startsWith('/') ? p.slice(1) : p}`;
	const bonusMenuFrame  = ap('/assets/components/frames/bonus_menu_frame.webp');
	const dealItIcon      = ap('/assets/components/ui/bonus_deal_it_icon.webp');
	const allInIcon       = ap('/assets/components/ui/bonus_all_in_icon.webp');
	const featureSpinIcon = ap('/assets/components/ui/bonus_feature_spin_icon.webp');

	type Props = {
		onclose: () => void;
		isFeatureActive: boolean;
		onToggleFeature: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	const betAmount   = $derived(stateBet.betAmount);
	const dealItCost  = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 100));
	const allInCost   = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 400));
	const featureCost = $derived(forestStakeDerived.formatCurrencyAmount(betAmount * 20));
	const canBuy      = $derived(stateBetDerived.isBetCostAvailable());

	let confirmMode = $state<null | 'BONUS' | 'SUPER'>(null);

	const buyMode      = (mode: 'BONUS' | 'SUPER') => { stateBet.activeBetModeKey = mode; props.onclose(); context.eventEmitter.broadcast({ type: 'bet' }); };
	const openConfirm  = (mode: 'BONUS' | 'SUPER') => { confirmMode = mode; };
	const closeConfirm = () => { confirmMode = null; };

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
<div class="panel" role="dialog" aria-modal="true" style="--board-bg:url('{bonusMenuFrame}')">

	<button class="close-btn" type="button" onclick={props.onclose}>✕</button>

	<div class="header">
		<h2 class="title">BONUS MENU</h2>
	</div>

	<div class="body">

		<!-- DEAL IT -->
		<button class="card" type="button" onclick={() => openConfirm('BONUS')} disabled={!canBuy}>
			<img class="icon" src={dealItIcon} alt="" />
			<div class="info">
				<span class="name name--gold">DEAL IT</span>
				<span class="desc">10 FREE SPINS · RANDOM EXPANDING SYMBOL · UP TO 250× MULTIPLIER</span>
			</div>
			<div class="badge badge--gold"><span>{dealItCost}</span></div>
		</button>

		<!-- ALL IN -->
		<button class="card" type="button" onclick={() => openConfirm('SUPER')} disabled={!canBuy}>
			<img class="icon" src={allInIcon} alt="" />
			<div class="info">
				<span class="name name--purple">ALL IN</span>
				<span class="desc">5 FREE SPINS · RANDOM START MULTIPLIER · DOUBLES EACH WIN · MAX 20,000×</span>
			</div>
			<div class="badge badge--purple"><span>{allInCost}</span></div>
		</button>

		<!-- FEATURE SPIN -->
		<div class="card card--static">
			<img class="icon" src={featureSpinIcon} alt="" />
			<div class="info">
				<span class="name">FEATURE SPIN</span>
				<span class="desc">Every spin is a 1-spin Deal It · {featureCost} / spin</span>
			</div>
			<div class="toggle-wrap">
				<button
					class="toggle"
					class:toggle--on={props.isFeatureActive}
					type="button"
					onclick={props.onToggleFeature}
					aria-label="Toggle Feature Spin"
					aria-pressed={props.isFeatureActive}
				>
					<span class="toggle-thumb"></span>
				</button>
			</div>
		</div>

	</div>
</div>

<!-- Confirm -->
{#if confirmMode}
	<button class="backdrop backdrop--z2" type="button" aria-label="Close" tabindex="-1" onclick={closeConfirm}></button>
	<div class="confirm" role="dialog" aria-modal="true">
		<div class="confirm-title">CONFIRM {confirmLabel}</div>
		<div class="confirm-text">Buy {confirmLabel} for {confirmCost}?</div>
		<div class="confirm-row">
			<button class="confirm-btn confirm-btn--cancel" type="button" onclick={closeConfirm}>CANCEL</button>
			<button class="confirm-btn confirm-btn--ok" type="button" onclick={() => buyMode(confirmMode!)}>CONFIRM</button>
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
		width: min(540px, 94vw);
		background-image: var(--board-bg);
		background-size: 100% 100%;
		border-radius: 18px;
		box-shadow: 0 32px 64px rgba(0,0,0,0.8);
	}

	/* Header */
	.header {
		display: flex; align-items: center; justify-content: center;
		padding: 38px 60px 14px;
		border-bottom: 1px solid rgba(200,158,40,0.3);
	}

	.title {
		margin: 0;
		font-family: 'Cinzel', serif; font-size: 1.25rem; font-weight: 900; letter-spacing: 0.1em;
		text-align: center;
		background: linear-gradient(180deg, #e2d981 8.6%, #fbc503 60.4%, #d98503 129.3%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
	}

	.close-btn {
		position: absolute; top: 10px; right: 14px;
		width: 50px; height: 50px; border-radius: 50%;
		background: rgba(12,8,3,0.93);
		border: 2px solid #9a7018;
		box-shadow: 0 0 0 1px rgba(210,175,55,0.25), 0 4px 14px rgba(0,0,0,0.75);
		color: rgba(255,255,255,0.85); font-size: 1.05rem;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; padding: 0;
		transition: background 0.2s, color 0.2s;
	}
	.close-btn:hover {
		background: rgba(30,20,8,0.97);
		color: #fff;
	}

	/* Body */
	.body {
		display: flex; flex-direction: column; gap: 9px;
		padding: 14px 60px 65px;
	}

	/* Card */
	.card {
		box-sizing: border-box;
		display: flex; align-items: center; gap: 12px;
		width: 100%; text-align: left;
		background: rgba(9,9,9,0.2);
		border: 1px solid rgba(255,218,170,0.59);
		border-radius: 12px;
		padding: 12px;
		cursor: pointer;
		transition: background 0.2s, border-color 0.2s;
	}
	.card:not(:disabled):not(.card--static):hover {
		background: rgba(9,9,9,0.45);
		border-color: rgba(255,218,170,0.9);
	}
	.card:disabled { opacity: 0.4; cursor: default; }
	.card--static  { cursor: default; }

	/* Icon */
	.icon {
		width: 60px; height: 60px;
		object-fit: contain; flex-shrink: 0;
	}

	/* Info block */
	.info {
		display: flex; flex-direction: column; gap: 5px;
		flex: 1; min-width: 0;
	}

	.name {
		font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 900;
		letter-spacing: 0.04em; color: #fff; display: block;
	}
	.name--gold {
		background: linear-gradient(180deg, #e2d981 8.6%, #fbc503 60.4%, #d98503 129.3%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
	}
	.name--purple {
		background: linear-gradient(90deg, #c090ff 0%, #8053bc 28%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
	}

	.desc {
		font-family: 'Cinzel', serif; font-size: 0.58rem;
		color: #a8a8a8; letter-spacing: 0.03em; line-height: 1.4; display: block;
	}

	/* Price badge — box bg on div, gradient text on inner span */
	.badge {
		flex-shrink: 0; min-width: 106px; height: 36px;
		border-radius: 10px;
		display: flex; align-items: center; justify-content: center;
		padding: 0 10px;
	}
	.badge span {
		font-family: 'Cinzel', serif; font-size: 0.88rem; font-weight: 900;
		white-space: nowrap;
	}
	.badge--gold {
		background: rgba(15,40,5,0.35);
		border: 1px solid #8d690c;
		box-shadow: 0 0 10px rgba(251,197,3,0.4);
	}
	.badge--gold span {
		background: linear-gradient(180deg, #e2d981 8.6%, #fbc503 60.4%, #d98503 129.3%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
	}
	.badge--purple {
		background: rgba(20,5,40,0.35);
		border: 1px solid rgba(130,70,210,0.8);
		box-shadow: 0 0 10px rgba(160,100,255,0.3);
	}
	.badge--purple span {
		background: linear-gradient(90deg, #c090ff 0%, #8053bc 28%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
	}

	/* Toggle */
	.toggle-wrap {
		flex-shrink: 0; min-width: 106px;
		display: flex; align-items: center; justify-content: center;
	}
	.toggle {
		flex-shrink: 0;
		position: relative;
		width: 56px; height: 30px;
		border-radius: 30px;
		border: 1px solid rgba(255,255,255,0.18);
		background: rgba(20,20,20,0.65);
		cursor: pointer;
		transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
		padding: 0;
	}
	.toggle--on {
		background: linear-gradient(180deg, #3db81a 0%, #1d7a0a 100%);
		border-color: rgba(70,190,40,0.6);
		box-shadow: 0 0 10px rgba(50,180,20,0.4);
	}
	.toggle-thumb {
		position: absolute; top: 3px; left: 3px;
		width: 22px; height: 22px; border-radius: 50%;
		background: rgba(210,210,210,0.9);
		box-shadow: 0 1px 5px rgba(0,0,0,0.5);
		transition: transform 0.25s, background 0.25s;
		display: block;
	}
	.toggle--on .toggle-thumb {
		transform: translateX(26px);
		background: #fff;
	}

	/* Confirm */
	.confirm {
		position: fixed; left: 50%; top: 50%;
		transform: translate(-50%, -50%);
		z-index: 71;
		width: min(340px, 88vw);
		border-radius: 18px;
		background: linear-gradient(160deg, rgba(30,20,8,0.97), rgba(12,8,2,0.98));
		border: 1px solid rgba(200,155,40,0.5);
		box-shadow: 0 24px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,220,100,0.1);
		padding: 22px 22px 18px; text-align: center;
	}

	.confirm-title {
		font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 900;
		letter-spacing: 0.08em; margin-bottom: 10px;
		background: linear-gradient(180deg, #e2d981 8.6%, #fbc503 60.4%, #d98503 129.3%);
		-webkit-background-clip: text; background-clip: text;
		-webkit-text-fill-color: transparent; color: transparent;
	}

	.confirm-text {
		font-family: 'Cinzel', serif; font-size: 0.85rem;
		color: rgba(255,255,255,0.88); line-height: 1.45; margin-bottom: 18px;
	}

	.confirm-row { display: flex; gap: 10px; justify-content: center; }

	.confirm-btn {
		border-radius: 12px; padding: 10px 20px;
		font-family: 'Cinzel', serif; font-size: 0.82rem; font-weight: 900;
		letter-spacing: 0.08em; cursor: pointer;
	}
	.confirm-btn--cancel {
		border: 1px solid rgba(200,155,40,0.35);
		background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.82);
	}
	.confirm-btn--ok {
		border: 1px solid rgba(220,170,40,0.6);
		background: linear-gradient(180deg, #f5cc50, #c08a10); color: #1f1000;
	}
</style>
