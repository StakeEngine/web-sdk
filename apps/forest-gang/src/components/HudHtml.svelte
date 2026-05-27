<script lang="ts">
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { stateBet, stateBetDerived, stateConfig, stateModal, stateSound, stateUi } from 'state-shared';

	import { getContext } from '../game/context';

	const context = getContext();

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const isLandscapeMobile = $derived(layoutType === 'landscape');
	const canInteract = $derived(context.stateXstateDerived.isIdle());
	const hasAuto = $derived(stateBetDerived.hasAutoBetCounter());
	const isSpinStop = $derived(!context.stateXstateDerived.isIdle() || hasAuto);
	const activeBetMode = $derived(stateBetDerived.activeBetMode());
	const buyEnabled = $derived(activeBetMode?.type === 'buy');
	const smallestBet = $derived(stateConfig.betAmountOptions[0]);
	const biggestBet = $derived(stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1]);
	const disableDecrease = $derived(!canInteract || stateBet.betAmount === smallestBet);
	const disableIncrease = $derived(!canInteract || stateBet.betAmount === biggestBet);
	const disableAuto = $derived.by(() => {
		if (stateBet.isSpaceHold) return true;
		if (!canInteract && !hasAuto) return true;
		if (!stateBetDerived.isBetCostAvailable()) return true;
		return false;
	});

	const toggleSound = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateSound.volumeValueMaster = stateSound.volumeValueMaster === 0 ? 50 : 0;
	};

	const openRules = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'gameRules' };
	};

	const openPaytable = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'payTable' };
	};

	const openBuyBonus = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};

	const onDecrease = () => {
		if (disableDecrease) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const next = [...stateConfig.betAmountOptions].sort((a, b) => b - a).find((option) => option < stateBet.betAmount);
		stateBetDerived.setBetAmount(next || smallestBet);
	};

	const onIncrease = () => {
		if (disableIncrease) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const next = [...stateConfig.betAmountOptions].sort((a, b) => a - b).find((option) => option > stateBet.betAmount);
		stateBetDerived.setBetAmount(next || biggestBet);
	};

	const onSpin = () => {
		context.eventEmitter.broadcast({ type: 'soundPressBet' });

		if (context.stateXstateDerived.isIdle()) {
			if (stateBetDerived.activeBetMode()?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
			context.eventEmitter.broadcast({ type: 'bet' });
			return;
		}

		if (hasAuto) stateBet.autoSpinsCounter = 0;
		context.eventEmitter.broadcast({ type: 'stopButtonClick' });
	};

	const onTurbo = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBetDerived.updateIsTurbo(!stateBet.isTurbo, { persistent: true });
	};

	const onAuto = () => {
		if (disableAuto) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (hasAuto) {
			stateBet.autoSpinsCounter = 0;
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
			return;
		}
		stateModal.modal = { name: 'autoSpin' };
	};
</script>

<div class="hud-shell" data-layout={layoutType}>
	<div class="hud-top">
		<button class="circle-btn" type="button" onclick={openRules} aria-label="Game rules">☰</button>
		<button class="circle-btn" type="button" onclick={toggleSound} aria-label="Sound">
			{stateSound.volumeValueMaster === 0 ? '🔇' : '🔊'}
		</button>
	</div>

	<div class="stage-overlay">
		{#if !isPortrait && !isLandscapeMobile}
			<button class="scatter-card" type="button" onclick={openPaytable} aria-label="Open paytable">
				<div class="scatter-card__title">SCATTER</div>
				<img src="./forest-gang/scatter-symbol.png" alt="Scatter symbol" />
				<div class="scatter-card__text">
					<div>3 SCATTERS</div>
					<div>TRIGGER “DEAL IT”</div>
					<div class="space"></div>
					<div>4 SCATTERS</div>
					<div>TRIGGER “ALL IN”</div>
				</div>
			</button>
		{/if}

		<img class="game-logo" src="./forest-gang/extracted/forest_gang_logo.png" alt="Forest Gang" />
	</div>

	<div class="hud-bottom">
		<div class="hud-bottom__left">
			<button class="buy-btn" type="button" onclick={openBuyBonus} aria-label="Buy bonus"></button>
		</div>

		<div class="value-pill">
			<span class="label">BALANCE</span>
			<span class="value">{numberToCurrencyString(stateBet.balanceAmount)}</span>
		</div>

		<div class="value-pill bet-pill" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (stateModal.modal = { name: 'betAmountMenu' })} onclick={() => (stateModal.modal = { name: 'betAmountMenu' })}>
			<span class="label">BET</span>
			<span class="value">{numberToCurrencyString(stateBet.betAmount)}</span>
		</div>

		<div class="stepper">
			<button class="circle-btn circle-btn--small" type="button" onclick={onDecrease} disabled={disableDecrease}>−</button>
			<button class="circle-btn circle-btn--small" type="button" onclick={onIncrease} disabled={disableIncrease}>+</button>
		</div>

		<div class="action-cluster">
			<button class="spin-btn" type="button" onclick={onSpin} aria-label="Spin">
				{isSpinStop ? '■' : '↻'}
			</button>
			<button class:active={stateBet.isTurbo} class="circle-btn circle-btn--small circle-btn--icon" type="button" onclick={onTurbo} aria-label="Turbo">⚡</button>
			<button class:active={hasAuto} class="circle-btn circle-btn--small circle-btn--icon" type="button" onclick={onAuto} disabled={disableAuto} aria-label="Autoplay">
				AUTO
			</button>
		</div>
	</div>
</div>

<style>
	.hud-shell {
		position: absolute;
		inset: 0;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 18px;
		z-index: 20;
	}

	.hud-top,
	.hud-bottom,
	.scatter-card,
	.game-logo {
		pointer-events: auto;
	}

	.hud-top {
		display: flex;
		gap: 14px;
		max-width: min(100%, 1280px);
		width: 100%;
		align-self: center;
	}

	.stage-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.game-logo {
		position: absolute;
		top: 6px;
		left: 50%;
		transform: translateX(-50%);
		width: clamp(240px, 28vw, 390px);
		filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.55));
	}

	.scatter-card {
		position: absolute;
		left: max(14px, calc(50% - 640px));
		top: 120px;
		width: 168px;
		padding: 12px 14px 16px;
		border: 0;
		border-radius: 20px;
		background:
			linear-gradient(180deg, rgba(77, 46, 18, 0.94), rgba(32, 19, 8, 0.98)),
			url('./forest-gang/visual_v2.png');
		background-size: cover;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), inset 0 0 0 3px rgba(144, 106, 31, 0.8);
		color: #f5c84f;
		text-align: center;
		cursor: pointer;
	}

	.scatter-card img {
		width: 92px;
		margin: 10px auto 12px;
		display: block;
	}

	.scatter-card__title {
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: 0.08em;
	}

	.scatter-card__text {
		font-size: 0.9rem;
		font-weight: 800;
		line-height: 1.2;
		text-shadow: 0 2px 8px rgba(0,0,0,0.65);
	}

	.scatter-card__text .space {
		height: 12px;
	}

	.hud-bottom {
		align-self: center;
		width: min(calc(100% - 24px), 1180px);
		display: grid;
		grid-template-columns: minmax(180px, 240px) 1fr 1fr auto auto;
		align-items: center;
		gap: 16px;
		padding: 16px 18px;
		border-radius: 28px;
		background:
			linear-gradient(180deg, rgba(23, 24, 18, 0.94), rgba(10, 11, 10, 0.97)),
			url('./forest-gang/extracted/controls_reference.png');
		background-size: cover;
		box-shadow: 0 14px 36px rgba(0, 0, 0, 0.46), inset 0 0 0 2px rgba(104, 125, 37, 0.45);
	}

	.hud-bottom__left {
		display: flex;
		align-items: center;
	}

	.value-pill {
		min-width: 0;
		padding: 0 14px;
		border-left: 1px solid rgba(255,255,255,0.15);
		display: grid;
		gap: 4px;
	}

	.value-pill:first-of-type {
		border-left: none;
	}

	.bet-pill {
		cursor: pointer;
	}

	.label {
		font-size: 0.9rem;
		font-weight: 800;
		color: #d6ea57;
	}

	.value {
		font-size: 1.05rem;
		font-weight: 800;
		color: #fff;
	}

	.stepper,
	.action-cluster {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.circle-btn,
	.spin-btn {
		border: 2px solid rgba(188, 141, 39, 0.95);
		background: radial-gradient(circle at 30% 25%, rgba(33, 34, 32, 0.96), rgba(8, 9, 8, 0.96));
		color: #ffffff;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 18px rgba(0, 0, 0, 0.24);
	}

	.circle-btn {
		width: 58px;
		height: 58px;
		border-radius: 50%;
		font-size: 1.1rem;
		font-weight: 800;
	}

	.circle-btn--small {
		width: 52px;
		height: 52px;
		font-size: 1.5rem;
	}

	.circle-btn--icon {
		font-size: 0.95rem;
	}

	.circle-btn.active,
	.circle-btn:disabled {
		opacity: 0.65;
	}

	.spin-btn {
		width: 88px;
		height: 88px;
		border-radius: 50%;
		font-size: 2.2rem;
		font-weight: 900;
		background: radial-gradient(circle at 35% 30%, #5ee23d, #278a18 70%);
	}

	.buy-btn {
		width: 100%;
		height: 60px;
		border: 0;
		border-radius: 14px;
		background: url('./forest-gang/extracted/buy_bonus_reference.png') center / 100% 100% no-repeat;
		cursor: pointer;
		box-shadow: 0 10px 18px rgba(0,0,0,0.28);
	}

	@media (max-width: 1280px) {
		.scatter-card {
			display: none;
		}

		.hud-bottom {
			width: min(calc(100% - 24px), 1040px);
		}
	}

	@media (max-width: 900px) {
		.game-logo {
			width: clamp(220px, 42vw, 320px);
		}

		.hud-bottom {
			grid-template-columns: minmax(150px, 210px) 1fr 1fr auto auto;
			gap: 12px;
			padding: 12px 14px;
		}

		.circle-btn {
			width: 54px;
			height: 54px;
		}

		.circle-btn--small {
			width: 48px;
			height: 48px;
		}

		.spin-btn {
			width: 78px;
			height: 78px;
			font-size: 2rem;
		}
	}

	@media (max-width: 700px) {
		.hud-shell {
			padding: 12px;
		}

		.hud-bottom {
			grid-template-columns: 1fr 1fr;
			grid-template-areas:
				'buy buy'
				'balance bet'
				'stepper actions';
			gap: 10px;
			padding: 12px;
		}

		.hud-bottom__left { grid-area: buy; }
		.hud-bottom__left .buy-btn { height: 56px; }
		.hud-bottom > .value-pill:nth-child(2) { grid-area: balance; border-left: none; padding: 0; }
		.hud-bottom > .value-pill:nth-child(3) { grid-area: bet; }
		.stepper { grid-area: stepper; }
		.action-cluster { grid-area: actions; justify-content: flex-end; }

		.label {
			font-size: 0.72rem;
		}

		.value {
			font-size: 0.92rem;
		}

		.circle-btn {
			width: 50px;
			height: 50px;
		}

		.circle-btn--small {
			width: 46px;
			height: 46px;
			font-size: 1.35rem;
		}

		.spin-btn {
			width: 82px;
			height: 82px;
			font-size: 2rem;
		}
	}
</style>
