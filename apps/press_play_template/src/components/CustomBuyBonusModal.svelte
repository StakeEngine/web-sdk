<script lang="ts">
	import { onMount } from 'svelte';
	import { stateBet, stateBetDerived } from 'state-shared';
	import { getContext } from '../game/context';
	import { templateStakeDerived } from '../state/templateStake.svelte';

	const ap = (p: string) => `./${p.startsWith('/') ? p.slice(1) : p}`;
	const cardFrame = ap('/assets/components/frames/bonus_menu_frame.webp');

	type Props = {
		onclose: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	const betAmount  = $derived(stateBet.betAmount);
	const bonusCost  = $derived(templateStakeDerived.formatCurrencyAmount(betAmount * 100));
	const canBuy     = $derived(stateBetDerived.isBetCostAvailable());

	let confirmMode = $state<null | 'BONUS'>(null);

	const buyBonus     = () => { stateBet.activeBetModeKey = 'BONUS'; props.onclose(); context.eventEmitter.broadcast({ type: 'bet' }); };
	const openConfirm  = () => { confirmMode = 'BONUS'; };
	const closeConfirm = () => { confirmMode = null; };

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

		<!-- BONUS -->
		<div class="card" style="--frame:url('{cardFrame}')">
			<span class="card-title">FREE SPINS BONUS</span>
			<span class="card-desc">10 FREE SPINS · RANDOM EXPANDING SYMBOL · BIG WIN POTENTIAL</span>
			<span class="card-price">{bonusCost}</span>
			<button class="card-btn card-btn--buy" type="button" disabled={!canBuy} onclick={openConfirm}>BUY</button>
		</div>

	</div>
</div>

<!-- Confirm -->
{#if confirmMode}
	<button class="backdrop backdrop--z2" type="button" aria-label="Close" tabindex="-1" onclick={closeConfirm}></button>
	<div class="confirm" role="dialog" aria-modal="true">
		<div class="confirm-title">CONFIRM BONUS</div>
		<div class="confirm-text">Buy FREE SPINS BONUS for {bonusCost}?</div>
		<div class="confirm-row">
			<button class="confirm-btn confirm-btn--cancel" type="button" onclick={closeConfirm}>CANCEL</button>
			<button class="confirm-btn confirm-btn--ok" type="button" onclick={buyBonus}>CONFIRM</button>
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
		width: min(400px, 96vw);
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

	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
	}

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

	.card-price {
		font-family: 'Cinzel', serif; font-size: 0.88rem; font-weight: 700;
		color: rgba(255,255,255,0.9); letter-spacing: 0.04em;
		display: block;
	}

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
