<script lang="ts">
	import { OnHotkey } from 'components-shared';
	import { stateBet, stateBetDerived, stateConfig, stateModal, stateSound } from 'state-shared';
	import { onDestroy } from 'svelte';

	import { getContext } from '../game/context';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { forestStakeDerived } from '../state/forestStake.svelte';
	import CustomBuyBonusModal from './CustomBuyBonusModal.svelte';
	import CustomAutoSpinModal from './CustomAutoSpinModal.svelte';

	const context = getContext();

	// Converts absolute /path to ./path so it resolves relative to the page URL at any deploy sub-path
	const ap = (p: string) => `./${p.startsWith('/') ? p.slice(1) : p}`;

	const heroCardBg    = ap('/assets/components/backgrounds/visual_v2.jpg');
	const controlsBg    = ap('/assets/components/reference/controls_reference.png');
	const buyBonusBg    = ap('/assets/components/reference/buy_bonus_reference.png');

	// Frame backgrounds — passed as CSS vars because url() in style blocks can't use runtime paths
	const menuBtnFrame   = ap('/assets/components/frames/top_menu-button_frame.png');
	const soundBtnFrame  = ap('/assets/components/frames/top_sound_button_frame.png');
	const scatterFrame   = ap('/assets/components/frames/scatter_frame.png');
	const hudFrame       = ap('/assets/components/frames/hud_frame.png');
	const buyBtnFrame    = ap('/assets/components/frames/bonus_buy_button_frame.png');
	const smallBtnFrame  = ap('/assets/components/frames/lower_hud_button_frame.png');
	const playBtnFrame   = ap('/assets/components/frames/play_button-frame.png');

	// Icon paths — relative so they work at any deploy sub-path
	const iconMenu     = ap('/assets/hud/icon-menu.svg');
	const iconVolume   = ap('/assets/hud/icon-volume.svg');
	const iconLightning = ap('/assets/hud/icon-lightning.svg');
	const iconAutoplay = ap('/assets/hud/icon-autoplay.svg');
	const iconCoins    = ap('/assets/hud/icon-coins.svg');
	const iconMinus    = ap('/assets/hud/icon-minus.svg');
	const iconPlus     = ap('/assets/hud/icon-plus.svg');
	const iconPlay     = ap('/assets/hud/icon-play.svg');
	const scatterImg   = ap('/assets/components/ui/scatter-panel-image.png');

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const isLandscapeMobile = $derived(layoutType === 'landscape');
	const canInteract = $derived(context.stateXstateDerived.isIdle());
	const hasAuto = $derived(stateBetDerived.hasAutoBetCounter());
	const isSpinStop = $derived(!context.stateXstateDerived.isIdle() || hasAuto);
	const canAffordBet = $derived(stateBetDerived.isBetCostAvailable());

	// Stop autoplay and disable spin when balance drops below bet cost
	$effect(() => {
		if (canInteract && hasAuto && !canAffordBet) {
			stateBet.autoSpinsCounter = 0;
		}
	});
	const isFeatureActive = $derived(stateBet.activeBetModeKey === 'FEATURE');
	const betOptions = $derived(stateConfig.betAmountOptions);
	const smallestBet = $derived(stateConfig.betAmountOptions[0]);
	const biggestBet = $derived(stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1]);
	const currentBetIndex = $derived(Math.max(0, betOptions.indexOf(stateBet.betAmount)));
const formattedBalance = $derived(forestStakeDerived.formatCurrencyAmount(stateBet.balanceAmount));
const formattedBet = $derived(forestStakeDerived.formatCurrencyAmount(stateBet.betAmount));
const autoSpinsRemainingText = $derived(stateBet.autoSpinsCounter === Infinity ? '∞' : `${stateBet.autoSpinsCounter}`);
	const disableDecrease = $derived(!canInteract || stateBet.betAmount === smallestBet);
	const disableIncrease = $derived(!canInteract || stateBet.betAmount === biggestBet);
	const disableAuto = $derived.by(() => {
		if (stateBet.isSpaceHold) return true;
		if (!canInteract && !hasAuto) return true;
		if (!stateBetDerived.isBetCostAvailable()) return true;
		return false;
	});

	let holdTimeout: ReturnType<typeof setTimeout> | null = null;
	let holdInterval: ReturnType<typeof setInterval> | null = null;
	let suppressNextClick = false;

	const clearHoldRepeat = () => {
		if (holdTimeout) {
			clearTimeout(holdTimeout);
			holdTimeout = null;
		}
		if (holdInterval) {
			clearInterval(holdInterval);
			holdInterval = null;
		}
	};

	const runHoldAction = (action: () => void, repeatAction?: () => void) => {
		action();
		holdTimeout = setTimeout(() => {
			holdInterval = setInterval(repeatAction ?? action, 90);
		}, 260);
	};

	const startHoldRepeat = (event: PointerEvent, action: () => void, repeatAction?: () => void) => {
		if (event.button !== 0) return;
		clearHoldRepeat();
		suppressNextClick = true;
		runHoldAction(action, repeatAction);
	};

	const maybeRunClickAction = (event: MouseEvent, action: () => void) => {
		if (suppressNextClick) {
			suppressNextClick = false;
			event.preventDefault();
			return;
		}
		action();
	};

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

	let showBuyModal = $state(false);
	let showAutoModal = $state(false);

	const openBuyBonus = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		showBuyModal = true;
	};

	const stepBet = (direction: -1 | 1, { playSound = true } = {}) => {
		if (direction < 0 && disableDecrease) return;
		if (direction > 0 && disableIncrease) return;
		if (playSound) context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const nextIndex = Math.min(betOptions.length - 1, Math.max(0, currentBetIndex + direction));
		const nextBet = betOptions[nextIndex];
		if (typeof nextBet !== 'number' || nextBet === stateBet.betAmount) return;
		stateBetDerived.setBetAmount(nextBet);
	};

	const onDecrease = () => stepBet(-1);

	const onIncrease = () => stepBet(1);

	const handleToggleFeature = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBet.activeBetModeKey = isFeatureActive ? 'BASE' : 'FEATURE';
	};

	const onSpinButton = () => {
		context.eventEmitter.broadcast({ type: 'soundPressBet' });

		if (hasAuto) {
			stateBet.autoSpinsCounter = 0;
			return;
		}

		if (context.stateXstateDerived.isIdle()) {
				// Always reset to BASE before a new spin (unless feature toggle is on)
			stateBet.activeBetModeKey = isFeatureActive ? 'FEATURE' : 'BASE';
			context.eventEmitter.broadcast({ type: 'bet' });
			return;
		}

		// Buffer stop only during the initial bet-loading window (first event only)
		if (context.stateGame.awaitingFirstReveal) {
			context.stateGame.pendingStop = true;
		} else {
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
	};

	const onSpinHotkey = () => {
		if (hasAuto) {
			if (context.stateXstateDerived.isIdle()) return;
			context.eventEmitter.broadcast({ type: 'soundPressBet' });
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
			return;
		}

		context.eventEmitter.broadcast({ type: 'soundPressBet' });

		if (context.stateXstateDerived.isIdle()) {
			stateBet.activeBetModeKey = isFeatureActive ? 'FEATURE' : 'BASE';
			context.eventEmitter.broadcast({ type: 'bet' });
			return;
		}

		// Buffer stop only during the initial bet-loading window (first event only)
		if (context.stateGame.awaitingFirstReveal) {
			context.stateGame.pendingStop = true;
		} else {
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
	};

	const onTurbo = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (!stateBet.isTurbo && !stateBet.isSuperTurbo) {
			stateBet.isTurbo = true;
			stateBet.isSuperTurbo = false;
			return;
		}
		if (stateBet.isTurbo && !stateBet.isSuperTurbo) {
			stateBet.isSuperTurbo = true;
			return;
		}
		stateBet.isTurbo = false;
		stateBet.isSuperTurbo = false;
	};

	const onAuto = () => {
		if (disableAuto) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (hasAuto) {
			stateBet.autoSpinsCounter = 0;
			return;
		}
		showAutoModal = true;
	};

	onDestroy(() => {
		clearHoldRepeat();
	});
</script>

<OnHotkey hotkey="Space" disabled={!stateConfig.jurisdiction ? false : stateConfig.jurisdiction.disabledSpacebar} onpress={onSpinHotkey} />

<div
	class="hud-shell"
	data-layout={layoutType}
	style={`--forest-card-bg:url('${heroCardBg}');--forest-controls-bg:url('${controlsBg}');--forest-buy-bg:url('${buyBonusBg}');--menu-btn-bg:url('${menuBtnFrame}');--sound-btn-bg:url('${soundBtnFrame}');--scatter-frame-bg:url('${scatterFrame}');--hud-frame-bg:url('${hudFrame}');--buy-btn-bg:url('${buyBtnFrame}');--small-btn-bg:url('${smallBtnFrame}');--play-btn-bg:url('${playBtnFrame}')`}
>
	<div class="hud-top">
		<button class="circle-btn" type="button" onclick={openRules} aria-label="Game rules">
			<span class="btn-face btn-face--icon">
				<img src={iconMenu} class="btn-icon" alt="menu" />
			</span>
		</button>
		<button class="circle-btn" type="button" onclick={toggleSound} aria-label="Sound">
			<span class="btn-face btn-face--icon">
				<img src={iconVolume} class="btn-icon" alt="sound"
					style={stateSound.volumeValueMaster === 0 ? 'opacity:0.35' : ''} />
			</span>
		</button>
	</div>

	<div class="stage-overlay">
		{#if !isPortrait && !isLandscapeMobile}
			<button class="scatter-card" type="button" onclick={openPaytable} aria-label="Open paytable">
				<div class="scatter-card__title">SCATTER</div>
				<img src={scatterImg} alt="Scatter symbol" />
				<div class="scatter-card__text">
					<div class="space"></div>
					<div>3 SCATTERS</div>
					<div><span>TRIGGER</span> <span class="scatter-card__text--hot">"{i18nDerived.dealIt()}"</span></div>
					<div class="space"></div>
					<div>4 SCATTERS</div>
					<div><span>TRIGGER</span> <span class="scatter-card__text--hot">"{i18nDerived.allIn()}"</span></div>
				</div>
			</button>
		{/if}
	</div>

	<div class="hud-bottom">
		<div class="hud-buy">
			<button class="buy-btn" class:buy-btn--feature-on={isFeatureActive} type="button" onclick={openBuyBonus} aria-label={i18nDerived.buyBonus()}>
				<span class="buy-btn__text">{isFeatureActive ? 'FEATURE ON' : 'BUY BONUS'}</span>
			</button>
		</div>


		<div class="hud-stats">
			<div class="value-pill value-pill--balance">
				<div class="label label--balance">
					<span class="label-text">{i18nDerived.balance()}</span>
				</div>
				<span class="value">{formattedBalance}</span>
			</div>

			<div class="value-pill value-pill--bet bet-pill" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (stateModal.modal = { name: 'betAmountMenu' })} onclick={() => (stateModal.modal = { name: 'betAmountMenu' })}>
				<span class="label-icon-frame bet-coin" aria-hidden="true">
					<img src={iconCoins} class="pill-icon" alt="" />
				</span>
				<div class="bet-values">
					<span class="label">{i18nDerived.betLabel()}</span>
					<span class="value">{formattedBet}</span>
				</div>
			</div>
		</div>

		<div class="hud-controls">
			<div class="stepper">
				{#if isLandscapeMobile}
					<button class="circle-btn circle-btn--small circle-btn--icon" type="button" onclick={openRules} aria-label="Game rules">
						<span class="btn-face btn-face--icon">
							<img src={iconMenu} class="btn-icon" alt="menu" />
						</span>
					</button>
					<button class="circle-btn circle-btn--small circle-btn--icon" type="button" onclick={toggleSound} aria-label="Sound">
						<span class="btn-face btn-face--icon">
							<img src={iconVolume} class="btn-icon" alt="sound"
								style={stateSound.volumeValueMaster === 0 ? 'opacity:0.35' : ''} />
						</span>
					</button>
				{/if}
				<button
					class="circle-btn circle-btn--small"
					type="button"
					onpointerdown={(event) => startHoldRepeat(event, onDecrease, () => stepBet(-1, { playSound: false }))}
					onpointerup={clearHoldRepeat}
					onpointercancel={clearHoldRepeat}
					onpointerleave={clearHoldRepeat}
					onclick={(event) => maybeRunClickAction(event, onDecrease)}
					disabled={disableDecrease}
				>
					<span class="btn-face btn-face--icon">
						<img src={iconMinus} class="btn-icon btn-icon--wide" alt="minus" />
					</span>
				</button>
				<button
					class="circle-btn circle-btn--small"
					type="button"
					onpointerdown={(event) => startHoldRepeat(event, onIncrease, () => stepBet(1, { playSound: false }))}
					onpointerup={clearHoldRepeat}
					onpointercancel={clearHoldRepeat}
					onpointerleave={clearHoldRepeat}
					onclick={(event) => maybeRunClickAction(event, onIncrease)}
					disabled={disableIncrease}
				>
					<span class="btn-face btn-face--icon">
						<img src={iconPlus} class="btn-icon btn-icon--wide" alt="plus" />
					</span>
				</button>
			</div>

			<div class="play-cluster">
				<button class="spin-btn" type="button" onclick={onSpinButton} aria-label="Spin" disabled={canInteract && !hasAuto && !canAffordBet}>
					<span class="spin-btn__inner">
						{#if hasAuto}
							<span class="spin-btn__glyph spin-btn__glyph--stop" aria-hidden="true">■</span>
							<span class="spin-btn__count" aria-label={`Remaining auto spins ${autoSpinsRemainingText}`}>{autoSpinsRemainingText}</span>
						{:else if isSpinStop}
							<span class="spin-btn__glyph spin-btn__glyph--stop" aria-hidden="true">■</span>
						{:else}
							<img src={iconPlay} class="btn-icon btn-icon--play" alt="" />
						{/if}
					</span>
				</button>
			</div>

			<div class="action-cluster">
				<button
					class:turbo-fast={stateBet.isTurbo && !stateBet.isSuperTurbo}
					class:turbo-super={stateBet.isSuperTurbo}
					class="circle-btn circle-btn--small circle-btn--icon circle-btn--turbo"
					type="button" onclick={onTurbo} aria-label={i18nDerived.turboLabel()}
				>
					<span class="btn-face btn-face--icon">
						<img src={iconLightning} class="btn-icon btn-icon--lightning" alt="turbo" />
					</span>
				</button>
				<button
					class:active={hasAuto}
					class="circle-btn circle-btn--small circle-btn--icon"
					type="button"
					onclick={onAuto}
					disabled={disableAuto}
					aria-label={i18nDerived.autoplayLabel()}
				>
					<span class="btn-face btn-face--icon">
						<img src={iconAutoplay} class="btn-icon btn-icon--auto" alt="auto" />
					</span>
				</button>
			</div>
		</div>
	</div>
</div>

{#if showBuyModal}
	<CustomBuyBonusModal
		onclose={() => (showBuyModal = false)}
		{isFeatureActive}
		onToggleFeature={handleToggleFeature}
	/>
{/if}

{#if showAutoModal}
	<CustomAutoSpinModal onclose={() => (showAutoModal = false)} />
{/if}

<style>
	.hud-shell {
		position: absolute;
		inset: 0;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 8px;
		z-index: 20;
		font-family: 'Cinzel', serif;
	}

	.hud-top,
	.hud-bottom,
	.scatter-card {
		pointer-events: auto;
	}

	.hud-top {
		display: flex;
		gap: 4px;
		max-width: min(100%, 1280px);
		width: 100%;
		align-self: center;
		padding-left: 6px;
		padding-top: 8px;
	}

	.stage-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.scatter-card {
		position: absolute;
		left: max(18px, calc(50% - 702px));
		top: 114px;
		width: clamp(138px, 10.8vw, 154px);
		aspect-ratio: 218 / 444;
		padding: 16px 12px 18px;
		border: 0;
		border-radius: 8px;
		background: var(--scatter-frame-bg) center / contain no-repeat;
		color: #f5c84f;
		text-align: center;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		z-index: 2;
	}

	.scatter-card img {
		width: 100%;
		max-width: 112px;
		height: auto;
		margin: 8px auto 12px;
		display: block;
	}

	.scatter-card__title {
		font-family: 'Cinzel', serif;
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: 0.1em;
	}

	.scatter-card__text {
		font-family: 'Cinzel', serif;
		font-size: 0.8rem;
		font-weight: 700;
		line-height: 1.3;
		text-shadow: 0 2px 8px rgba(0,0,0,0.65);
	}

	.scatter-card__text--hot {
		color: #ff4b4b;
	}

	.scatter-card__text .space {
		height: 12px;
	}

	.hud-bottom {
		align-self: center;
		width: min(calc(100% - 16px), 1180px);
		height: auto;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-evenly;
		gap: 4px;
		padding: 0;
		border-radius: 28px;
		background: var(--hud-frame-bg) center / 100% 100% no-repeat;
		box-shadow: none;
	}

	.hud-buy {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		flex: 0 0 auto;
		padding-top: 0;
	}

	.hud-stats {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		flex: 0 0 auto;
		min-width: 0;
	}

	.hud-controls {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 30px;
		flex: 0 0 auto;
		padding-top: 0;
	}

	.value-pill {
		min-width: 0;
		padding: 0 5px;
		border-left: 1px solid rgba(255,255,255,0.15);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.value-pill--balance {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0 16px;
		flex: 0 0 auto;
		min-width: 150px;
		border-left: none;
	}

	.value-pill--balance .label--balance {
		line-height: 1;
		justify-content: flex-start;
	}

	.value-pill--balance .value {
		line-height: 1;
	}

	.value-pill--bet {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 6px;
		padding: 0 16px;
		border-left: 1px solid rgba(255,255,255,0.30);
		flex: 0 0 auto;
	}

	.bet-values {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
	}

	.value-pill--bet .label {
		line-height: 1;
	}

	.value-pill--bet .value {
		line-height: 1;
	}

	.bet-coin {
		pointer-events: none;
	}

	.value-pill--bet .bet-coin {
		width: 40px;
		height: 40px;
	}

	.bet-coin .pill-icon {
		width: 18px;
		height: 18px;
	}

	.bet-pill {
		cursor: pointer;
	}

	.label {
		font-family: 'Cinzel', serif;
		font-size: 0.7rem;
		font-weight: 700;
		color: #d6ea57;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.label--balance {
		gap: 6px;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
	}

	.label-text {
		display: inline-block;
	}

	.value {
		font-family: 'Cinzel', serif;
		font-size: 1.25rem;
		font-weight: 700;
		color: #fff;
	}

	.stepper,
	.action-cluster {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 15px;
		padding-top: 0;
	}

	.circle-btn,
	.spin-btn {
		border: none;
		color: #ffffff;
		box-shadow: none;
		background: none;
		outline: none;
	}

	.circle-btn {
		width: 58px;
		height: 58px;
		border-radius: 50%;
		font-size: 1.1rem;
		font-weight: 800;
	}

	.circle-btn,
	.spin-btn,
	.buy-btn {
		display: grid;
		place-items: center;
	}

	.circle-btn:focus,
	.spin-btn:focus,
	.buy-btn:focus {
		outline: none;
	}

	/* Top two buttons get their own distinct frames */
	.hud-top .circle-btn:nth-child(1) {
		background: var(--menu-btn-bg) center / cover no-repeat;
	}
	.hud-top .circle-btn:nth-child(2) {
		background: var(--sound-btn-bg) center / cover no-repeat;
	}

	.btn-icon {
		width: 22px;
		height: 22px;
		pointer-events: none;
		display: block;
		margin: 0;
		object-fit: contain;
	}

	.btn-face {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		transform: none;
		line-height: 0;
	}

	.btn-face--icon {
		transform: none;
		line-height: 0;
	}

	.btn-icon--wide {
		width: 18px;
		height: 18px;
	}

	.btn-icon--lightning {
		width: 14px;
		height: 14px;
	}

	.btn-icon--auto {
		width: 16px;
		height: 14px;
	}

	.btn-icon--play {
		width: 52px;
		height: 52px;
		display: block;
		margin: 0;
		transform: translateY(2px);
	}

	.label-icon-frame {
		border: none;
		padding: 0;
		width: 52px;
		height: 52px;
		display: grid;
		place-items: center;
		background: var(--small-btn-bg) center / cover no-repeat;
		flex: 0 0 auto;
		appearance: none;
		cursor: default;
	}

	.label-icon-frame .pill-icon {
		width: 20px;
		height: 20px;
		margin-right: 0;
	}

	.label-icon-frame:disabled {
		opacity: 1;
	}

	.label-icon-frame.circle-btn:disabled {
		opacity: 1;
	}


	.pill-icon {
		width: 16px;
		height: 16px;
		vertical-align: middle;
		margin-right: 4px;
	}

	.circle-btn--small {
		width: 52px;
		height: 52px;
		font-size: 1.5rem;
		background: var(--small-btn-bg) center / cover no-repeat;
	}

	.circle-btn--icon {
		font-size: 0.95rem;
	}

	.action-cluster .circle-btn--icon .btn-icon {
		width: 18px;
		height: 18px;
	}

	.circle-btn.active,
	.circle-btn:disabled {
		opacity: 0.65;
	}

	/* Fast mode: slightly lit, warm hint */
	.circle-btn--turbo.turbo-fast {
		opacity: 1;
		filter: drop-shadow(0 0 3px rgba(255, 200, 80, 0.5));
	}
	.circle-btn--turbo.turbo-fast .btn-icon {
		filter: brightness(1.15) sepia(0.15) saturate(1.5);
	}

	/* Turbo mode: bright gold glow */
	.circle-btn--turbo.turbo-super {
		opacity: 1;
		filter: drop-shadow(0 0 6px #ffd84a) drop-shadow(0 0 12px rgba(255, 216, 74, 0.5));
	}
	.circle-btn--turbo.turbo-super .btn-icon {
		filter: brightness(1.5) sepia(0.3) saturate(2.5) hue-rotate(5deg);
	}


	.spin-btn {
		width: 110px;
		height: 110px;
		border-radius: 50%;
		font-weight: 900;
		background: var(--play-btn-bg) center / cover no-repeat;
		display: grid;
		place-items: center;
		line-height: 1;
		padding: 0;
		transform: translateY(-12px);
		position: relative;
		z-index: 3;
	}



	.spin-btn__inner {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		transform: none;
	}

	.spin-btn__glyph {
		display: inline-block;
		line-height: 1;
		transform: translateY(-1px);
	}

	.spin-btn__glyph--stop {
		font-size: 2.2rem;
		font-weight: 900;
		transform: translateY(-2px);
	}
	.spin-btn__count {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-family: Cinzel, serif;
		font-size: 0.95rem;
		font-weight: 900;
		color: #fff;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
		pointer-events: none;
	}

	.buy-btn {
		--buy-w: 128px;
		width: var(--buy-w);
		min-width: var(--buy-w);
		max-width: none;
		aspect-ratio: 3065 / 1084;
		height: auto;
		border: 0;
		border-radius: 14px;
		background: var(--buy-btn-bg) center / 100% 100% no-repeat;
		cursor: pointer;
		position: relative;
		color: #fff;
		font-family: 'Cinzel', serif;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.85);
	}

	.buy-btn__text {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		transform: translateY(-2px);
		font-size: inherit;
		color: #ffd84a;
		font-size: calc(0.58rem * 1.5);
	}

	@media (max-width: 1100px) {
		.scatter-card {
			display: none;
		}

		.hud-bottom {
			width: min(calc(100% - 16px), 1120px);
		}
	}

	@media (max-width: 900px) {
		.hud-bottom {
			grid-template-columns: minmax(150px, 210px) 1fr 1fr 1.1fr auto auto;
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
				'mode mode'
				'stepper actions';
			gap: 10px;
			padding: 12px;
		}

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

	.hud-shell[data-layout='landscape'] {
		padding: 8px 12px;
	}

	.hud-shell[data-layout='landscape'] .hud-bottom {
		position: absolute;
		top: 58px;
		left: 12px;
		right: 12px;
		bottom: auto;
		width: auto;
		height: auto;
		display: flex;
		align-content: center;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 0;
		background: none;
		box-shadow: none;
		border-radius: 0;
		overflow: visible;
	}

	.hud-shell[data-layout='landscape'] .hud-buy {
		justify-self: start;
		align-self: center;
	}

	.hud-shell[data-layout='landscape'] .hud-buy .buy-btn {
		--buy-w: 144px;
		min-width: var(--buy-w);
		max-width: none;
		border-radius: 50%;
		box-shadow: 0 12px 24px rgba(0, 0, 0, 0.34);
		align-self: center;
	}

	.hud-shell[data-layout='landscape'] .buy-btn__text {
		font-size: 0.52rem;
	}

	.hud-shell[data-layout='landscape'] .hud-stats {
		flex: 0 0 auto;
		gap: 8px;
	}

	.hud-shell[data-layout='landscape'] .hud-controls {
		gap: 8px;
	}

	.hud-shell[data-layout='landscape'] .value-pill {
		width: fit-content;
		min-width: min(98px, 13vw);
		max-width: 100%;
		padding: 1px 5px;
		border-left: none;
		border-radius: 12px;
		background: rgba(17, 12, 10, 0.72);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.22);
		backdrop-filter: blur(4px);
	}

	.hud-shell[data-layout='landscape'] .label {
		font-size: 0.55rem;
	}

	.hud-shell[data-layout='landscape'] .value {
		font-size: 0.68rem;
	}

	.hud-shell[data-layout='landscape'] .stepper {
		flex-direction: column;
		align-self: center;
		justify-self: start;
		justify-content: flex-start;
		gap: 2px;
	}

	.hud-shell[data-layout='landscape'] .stepper .circle-btn--small {
		width: clamp(44px, 6.4vh, 56px);
		height: clamp(44px, 6.4vh, 56px);
		font-size: clamp(1.25rem, 2.8vh, 1.7rem);
	}

	.hud-shell[data-layout='landscape'] .hud-top {
		display: none;
	}

	.hud-shell[data-layout='landscape'] .action-cluster {
		flex-direction: column;
		justify-self: end;
		align-self: center;
		justify-content: end;
		gap: 2px;
		max-height: 100%;
	}

	.hud-shell[data-layout='landscape'] .action-cluster .circle-btn--small {
		width: clamp(42px, 6vh, 50px);
		height: clamp(42px, 6vh, 50px);
	}

</style>
