<script lang="ts">
	import { onDestroy } from 'svelte';

	export let t: (key: string, vars?: Record<string, string | number>) => string;
	export let formatCurrencyAmount: (amount: number, fractionDigits?: number) => string;

	export let timeLabel = '';
	export let balance = 0;
	export let menuOpen = false;
	export let volatilityHelpOpen = false;
	export let selectedMode = 'BASE_HARD';
	export let animationStatus = 'idle';
	export let status = 'idle';
	export let maxWinLabel = '1,000x';
	export let hudVolume = 0;
	export let musicMuted = false;
	export let speedFactor = 2;
	export let menuInfoOpen = false;
	export let autoplay = false;
	export let autoplayOpen = false;
	export let autoplayRemaining = 0;
	export let autoplayOptions: number[] = [];
	export let autoplayDraftCount = 0;
	export let isMobileLandscapeUi = false;
	export let isMobilePortraitUi = false;
	export let pendingRound = false;
	export let betIndex = 0;
	export let betLevels: number[] = [];
	export let betAmount = 0;
	export let totalCostMultiplier = 1;
	export let currentLanguage = 'en';
	export let currentCurrency = 'USD';

	export let toggleMenuOpen: () => void = () => {};
	export let toggleVolatilityHelp: (event?: MouseEvent) => void = () => {};
	export let setMode: (mode: string, label?: string, maxWin?: string) => void = () => {};
	export let setHudVolume: (value: number) => void = () => {};
	export let toggleHudMute: () => void = () => {};
	export let setSpeed: (value: number) => void = () => {};
	export let setMenuInfoOpen: (value: boolean) => void = () => {};
	export let decreaseBet: () => void = () => {};
	export let handleBetClick: () => void = () => {};
	export let increaseBet: () => void = () => {};
	export let toggleAutoplayOpen: () => void = () => {};
	export let setAutoplayDraft: (count: number) => void = () => {};
	export let handleStartAutoplay: () => void = () => {};
	export let cycleSpeed: () => void = () => {};

	let autoplayButtonDisabled = false;
	let autoplayButtonActive = false;
	let autoplayStartLabel = '';
	let hudInputBlocked = false;
	let hideUnderlyingHudControls = false;
	let mobileManualBetHidden = false;
	let mobilePlusMinusHidden = false;
	let mobilePortraitSpeedDisabled = false;
	let mobileRoundActive = false;
	let hideMobilePortraitBottomHud = false;
	let totalCostText = '';
	let betSizeText = '';
	$: autoplayButtonDisabled = autoplay || pendingRound || animationStatus === 'running' || status === 'sliding';
	$: autoplayButtonActive = autoplay && (pendingRound || animationStatus === 'running' || status === 'sliding');
	$: autoplayStartLabel = isMobileLandscapeUi ? t('start') : t('start_autospins');
	$: hudInputBlocked = menuInfoOpen;
	$: hideUnderlyingHudControls = isMobilePortraitUi && menuInfoOpen;
	$: mobileRoundActive = pendingRound || status === 'sliding';
	$: hideMobilePortraitBottomHud = isMobilePortraitUi && menuOpen;
	$: mobileManualBetHidden = isMobilePortraitUi && (menuOpen || (!autoplay && (animationStatus === 'running' || status === 'sliding')));
	$: mobilePlusMinusHidden = isMobilePortraitUi && (menuOpen || autoplay || mobileRoundActive);
	$: mobilePortraitSpeedDisabled = isMobilePortraitUi && (autoplay || animationStatus === 'running' || status === 'sliding');
	$: totalCostText = formatCurrencyAmount(betAmount * totalCostMultiplier);
	$: betSizeText = formatCurrencyAmount(betAmount);
	$: canAfford = balance >= betAmount * totalCostMultiplier;
	$: socialCurrencyUi = currentCurrency === 'XGC' || currentCurrency === 'XSC';
	const COMPACT_BET_LANGUAGES = new Set(['de', 'es', 'fi', 'fr', 'ja', 'pl', 'pt', 'ru', 'tr', 'vi']);
	const EXTRA_COMPACT_BET_LANGUAGES = new Set(['es']);
	const STACKED_BET_INFO_LANGUAGES = new Set(['de', 'fi', 'pl', 'ru', 'tr']);
	const TWO_LINE_BET_INFO_LANGUAGES = new Set(['ru', 'tr']);
	const NOWRAP_STACKED_BET_INFO_LANGUAGES = new Set(['de', 'fi', 'pl']);
	const COMPACT_AUTOPLAY_TITLE_LANGUAGES = new Set(['de', 'es', 'fi', 'fr', 'pl', 'pt', 'ru', 'tr', 'vi']);
	const COMPACT_AUTOPLAY_START_LANGUAGES = new Set(['de', 'es', 'fi', 'fr', 'pl', 'pt', 'ru', 'tr', 'vi']);
	const NON_ENGLISH_UI_LANGUAGES = new Set(['ar', 'de', 'es', 'fi', 'fr', 'ja', 'pl', 'pt', 'ru', 'tr', 'vi']);
	const NARROW_UI_LANGUAGES = new Set(['ar', 'de', 'es', 'fi', 'fr', 'pl', 'pt', 'ru', 'tr', 'vi']);

	function betLabelClass(label: string) {
		const classes = [];
		if (label.length >= 9) classes.push('bet-main-label-xlong');
		else if (label.length >= 6) classes.push('bet-main-label-long');
		if (COMPACT_BET_LANGUAGES.has(currentLanguage)) classes.push('bet-main-label-compact');
		if (EXTRA_COMPACT_BET_LANGUAGES.has(currentLanguage)) classes.push('bet-main-label-extra-compact');
		return classes.join(' ');
	}

	function betMobileLabelStyle(label: string) {
		const trimmed = label.trim();
		const length = trimmed.length;
		let fontSize = 18;
		let letterSpacing = 0;

		if (length >= 9) {
			fontSize = 10;
			letterSpacing = 0;
		} else if (length >= 8) {
			fontSize = 11;
			letterSpacing = 0;
		} else if (length >= 7) {
			fontSize = 12;
			letterSpacing = 0;
		} else if (length >= 6) {
			fontSize = 14;
			letterSpacing = -0.01;
		} else if (length >= 5) {
			fontSize = 16;
			letterSpacing = -0.01;
		} else if (length === 4) {
			fontSize = 24;
			letterSpacing = 0;
		} else if (length === 3) {
			fontSize = 30;
			letterSpacing = 0;
		}

		const style = `font-size:${fontSize}px;letter-spacing:${letterSpacing}em;`;
		return style;
	}

	function betLabelScale(label: string, mobile = false) {
		const length = label.trim().length;
		let scale = 1;
		if (length > 5) {
			scale = length >= 14 ? 0.58 : Math.max(0.58, 1 - (length - 5) * 0.046);
		}
		if (COMPACT_BET_LANGUAGES.has(currentLanguage)) {
			if (currentLanguage === 'ja') return Math.min(scale, mobile ? 0.6 : 0.8);
			if (EXTRA_COMPACT_BET_LANGUAGES.has(currentLanguage)) {
				if (mobile) {
					if (length >= 8) return Math.min(scale, 0.38);
					if (length >= 6) return Math.min(scale, 0.46);
					return Math.min(scale, 0.56);
				}
				if (length >= 8) return Math.min(scale, 0.67);
				if (length >= 6) return Math.min(scale, 0.73);
				return Math.min(scale, 0.8);
			}
			if (mobile) {
				if (length >= 8) return Math.min(scale, 0.42);
				if (length >= 6) return Math.min(scale, 0.5);
				return Math.min(scale, 0.62);
			}
			if (length >= 8) return Math.min(scale, 0.68);
			if (length >= 6) return Math.min(scale, 0.74);
			return Math.min(scale, 0.8);
		}
		if (mobile) {
			if (length >= 9) return Math.min(scale, 0.5);
			if (length >= 6) return Math.min(scale, 0.62);
		}
		return scale;
	}

	function autoplayCountClass(count: number) {
		const length = String(Math.max(0, count)).length;
		if (length >= 5) return 'bet-autospins-count-xlong';
		if (length === 4) return 'bet-autospins-count-four';
		if (length === 3) return 'bet-autospins-count-long';
		return '';
	}

	function autoplayCountScale(count: number) {
		const length = String(Math.max(0, count)).length;
		if (length <= 2) return 1;
		if (isMobilePortraitUi) {
			if (length === 3) return 0.8;
			if (length === 4) return 0.72;
			if (length === 5) return 0.54;
			return 0.46;
		}
		if (length === 3) return 0.9;
		if (length === 4) return 0.82;
		if (length === 5) return 0.72;
		return 0.62;
	}

	function autoplayBetButtonScale(count: number) {
		const length = String(Math.max(0, count)).length;
		if (!isMobileLandscapeUi) return autoplayCountScale(count);
		if (length <= 1) return 0.72;
		if (length === 2) return 0.62;
		if (length === 3) return 0.48;
		if (length === 4) return 0.38;
		if (length === 5) return 0.3;
		return 0.24;
	}

	function autoplayTitleClass(label: string) {
		const classes = [];
		if (label.length >= 16) classes.push('autoplay-main-title-xlong');
		else if (label.length >= 10) classes.push('autoplay-main-title-long');
		if (COMPACT_AUTOPLAY_TITLE_LANGUAGES.has(currentLanguage)) classes.push('autoplay-main-title-compact');
		return classes.join(' ');
	}

	function autoplayStartLabelClass(label: string) {
		const classes = [];
		if (label.length >= 21) classes.push('autoplay-start-label-xlong');
		else if (label.length >= 15) classes.push('autoplay-start-label-long');
		if (COMPACT_AUTOPLAY_START_LANGUAGES.has(currentLanguage)) classes.push('autoplay-start-label-compact');
		return classes.join(' ');
	}

	function betInfoClass() {
		const classes = [];
		if (NON_ENGLISH_UI_LANGUAGES.has(currentLanguage)) classes.push('bet-info-compact-ui');
		if (NARROW_UI_LANGUAGES.has(currentLanguage)) classes.push('bet-info-narrow-ui');
		if (STACKED_BET_INFO_LANGUAGES.has(currentLanguage)) classes.push('bet-info-stacked');
		if (TWO_LINE_BET_INFO_LANGUAGES.has(currentLanguage)) classes.push('bet-info-two-line');
		if (NOWRAP_STACKED_BET_INFO_LANGUAGES.has(currentLanguage)) classes.push('bet-info-nowrap-stacked');
		if (socialCurrencyUi) classes.push('bet-info-social');
		return classes.join(' ');
	}

	function compactUiClass() {
		const classes = [];
		if (NON_ENGLISH_UI_LANGUAGES.has(currentLanguage)) classes.push('locale-non-en');
		if (NARROW_UI_LANGUAGES.has(currentLanguage)) classes.push('locale-ui-narrow');
		return classes.join(' ');
	}

	function autoplayMenuClass() {
		const classes = [];
		if (NON_ENGLISH_UI_LANGUAGES.has(currentLanguage)) classes.push('autoplay-menu-compact-ui');
		if (NARROW_UI_LANGUAGES.has(currentLanguage)) classes.push('autoplay-menu-narrow-ui');
		return classes.join(' ');
	}

	function betValueStyle(text: string) {
		if (!isMobilePortraitUi && !isMobileLandscapeUi) return '';
		const visibleLength = String(text ?? '').replace(/\s+/g, '').length;
		const portraitUi = isMobilePortraitUi;
		let scale = 1;
		let letterSpacing = 0;
		if (visibleLength >= 18) {
			scale = portraitUi ? 0.5 : 0.58;
			letterSpacing = portraitUi ? -0.075 : -0.055;
		} else if (visibleLength >= 16) {
			scale = portraitUi ? 0.6 : 0.68;
			letterSpacing = portraitUi ? -0.06 : -0.042;
		} else if (visibleLength >= 14) {
			scale = portraitUi ? 0.71 : 0.79;
			letterSpacing = portraitUi ? -0.045 : -0.028;
		} else if (visibleLength >= 13) {
			scale = portraitUi ? 0.76 : 0.84;
			letterSpacing = portraitUi ? -0.038 : -0.022;
		} else if (visibleLength >= 12) {
			scale = portraitUi ? 0.78 : 0.86;
			letterSpacing = portraitUi ? -0.034 : -0.02;
		} else if (visibleLength >= 11) {
			scale = portraitUi ? 0.86 : 0.93;
			letterSpacing = portraitUi ? -0.02 : -0.01;
		} else if (visibleLength >= 10) {
			scale = portraitUi ? 0.91 : 0.97;
			letterSpacing = portraitUi ? -0.012 : 0;
		}
		return `--bet-value-scale:${scale};--bet-value-letter-spacing:${letterSpacing}em;`;
	}

	let holdRepeatDelay: ReturnType<typeof setTimeout> | null = null;
	let holdRepeatInterval: ReturnType<typeof setInterval> | null = null;

	function clearHoldRepeat() {
		if (holdRepeatDelay) clearTimeout(holdRepeatDelay);
		if (holdRepeatInterval) clearInterval(holdRepeatInterval);
		holdRepeatDelay = null;
		holdRepeatInterval = null;
	}

	function startHoldRepeat(event: PointerEvent, action: () => void) {
		const target = event.currentTarget as HTMLButtonElement | null;
		if (target?.disabled) return;
		event.preventDefault();
		event.stopPropagation();
		if (target?.setPointerCapture) {
			try {
				target.setPointerCapture(event.pointerId);
			} catch {
				/* noop */
			}
		}
		clearHoldRepeat();
		action();
		holdRepeatDelay = setTimeout(() => {
			holdRepeatInterval = setInterval(() => {
				if (target?.disabled) {
					clearHoldRepeat();
					return;
				}
				action();
			}, 90);
		}, 280);
	}

	function handleControlActivate(event: MouseEvent, action: () => void) {
		if ((event.currentTarget as HTMLButtonElement | null)?.disabled) return;
		if (event.detail !== 0) return;
		action();
	}

	function swallowPointer(event: Event) {
		event.preventDefault();
		event.stopPropagation();
	}

	function openMenuInfo(event: Event) {
		swallowPointer(event);
		setMenuInfoOpen(true);
	}

	function closeMenuInfo(event?: Event) {
		if (event) swallowPointer(event);
		setMenuInfoOpen(false);
	}

	function stopMenuEvent(event: Event) {
		event.stopPropagation();
	}

	function runMenuAction(event: Event, action: () => void) {
		event.preventDefault();
		event.stopPropagation();
		action();
	}

	onDestroy(clearHoldRepeat);
</script>

<svelte:window onpointerup={clearHoldRepeat} onpointercancel={clearHoldRepeat} onblur={clearHoldRepeat} />

<div class={`hud-top ${compactUiClass()}`.trim()} class:menu-open={menuOpen} class:autoplay-open={autoplayOpen}>
	<div class="hud-left">
		<span class="hud-time">{timeLabel}</span>
		<span class="hud-divider">|</span>
		<span class="hud-user">{t('game_title')}</span>
	</div>
	<div class="hud-brand-mobile" aria-hidden="true"></div>
	<div class="hud-balance-center">
		<span class="hud-balance-label">{t('balance_label')}</span>
		<strong>{formatCurrencyAmount(balance)}</strong>
	</div>
</div>
<div class="hud-brand-desktop" aria-hidden="true"></div>

<div class={`hud-left-rail ${compactUiClass()}`.trim()} class:menu-open={menuOpen} class:info-modal-open={menuInfoOpen}>
	{#if !hideUnderlyingHudControls}
		<button class="hud-round-btn hud-btn-feature hud-feature-hidden" title={t('features')} aria-label={t('features')} tabindex="-1"></button>
		<button
			class="hud-round-btn menu-toggle hud-btn-menu"
			class:menu-open={menuOpen}
			onclick={toggleMenuOpen}
			title={menuOpen ? t('close_menu') : t('menu')}
			aria-label={menuOpen ? t('close_menu') : t('menu')}
		></button>
	{/if}
</div>

<style>
	@media (orientation: landscape) and (hover: none) and (pointer: coarse) {
		.hud-mobile-controls-row {
			grid-template-columns: auto minmax(0, 1fr) auto;
			column-gap: 8px;
		}

		.hud-mobile-bet-triplet {
			gap: 8px;
		}

		.bet-info {
			margin-top: 14px;
			margin-right: 8px;
			gap: 2px;
			font-size: 10px;
		}

		.bet-total,
		.bet-size {
			gap: 3px;
		}

		.bet-total strong,
		.bet-total span,
		.bet-size strong,
		.bet-size span {
			font-size: 13px;
			line-height: 1;
		}
	}

	@supports (-webkit-touch-callout: none) {
		@media (orientation: landscape) and (hover: none) and (pointer: coarse) {
			.hud-right-rail {
				padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
			}

			.bet-cluster {
				margin-bottom: 4px;
			}

			.bet-info {
				margin-top: 28px;
				margin-right: 12px;
			}

			.panel-help-pop {
				width: min(320px, calc(100vw - 24px));
				max-height: calc(100dvh - 120px);
				overflow: auto;
				box-sizing: border-box;
			}
		}
	}

	@media (orientation: landscape) and (max-width: 900px) and (hover: none) and (pointer: coarse) {
		.bet-info {
			margin-top: 18px;
			margin-right: 10px;
		}

		.bet-total strong,
		.bet-total span,
		.bet-size strong,
		.bet-size span {
			font-size: 12px;
		}
	}
</style>

{#if menuOpen}
	<div class="menu-left-dock" aria-hidden="true"></div>
	<button class="hud-panel-dismiss" type="button" aria-label={t('close_menu')} onclick={toggleMenuOpen}></button>
	<div
		class={`hud-panel ${compactUiClass()}`.trim()}
		onpointerdown={stopMenuEvent}
		onpointerup={stopMenuEvent}
	>
		<div class="hud-panel-content">
			<div class="hud-panel-header">
				<div class="hud-panel-fade"></div>
				{#if isMobilePortraitUi}
					<button
						type="button"
						class="autoplay-close hud-btn-close hud-panel-close"
						onclick={toggleMenuOpen}
						aria-label={t('close_menu')}
					></button>
				{/if}
			</div>
			<div class="panel-section">
				<div class="panel-title-row">
					<div class="panel-title">{t('volatility')}</div>
					<div class="panel-help-anchor" class:panel-help-open={volatilityHelpOpen}>
						<button
							type="button"
							class="panel-help-btn"
							aria-label={t('volatility_help_label')}
							aria-expanded={volatilityHelpOpen ? 'true' : 'false'}
							onclick={(event) => toggleVolatilityHelp(event)}
						>
							?
						</button>
						<div class="panel-help-pop">
							<h4>{t('volatility_help_title')}</h4>
							<p>{t('volatility_help_intro')}</p>
							<p>{t('volatility_help_desc')}</p>
							<ul>
								<li>{t('volatility_low_desc')}</li>
								<li>{t('volatility_medium_desc')}</li>
								<li>{t('volatility_high_desc')}</li>
							</ul>
						</div>
					</div>
				</div>
				<div class="panel-segment-wrap">
					<div class="panel-row panel-volatility">
						<button
							type="button"
							class="panel-chip"
							class:panel-active={selectedMode === 'BASE_HARD'}
							onclick={(event) => runMenuAction(event, () => setMode('BASE_HARD', 'BASE HARD', '1,000x'))}
							disabled={animationStatus === 'running' || autoplay}
						>
							{t('low')}
						</button>
						<button
							type="button"
							class="panel-chip"
							class:panel-active={selectedMode === 'BASE_VERY_HARD'}
							onclick={(event) => runMenuAction(event, () => setMode('BASE_VERY_HARD', 'BASE VERY HARD', '5,000x'))}
							disabled={animationStatus === 'running' || autoplay}
						>
							{t('medium')}
						</button>
						<button
							type="button"
							class="panel-chip"
							class:panel-active={selectedMode === 'BASE_EXTREME'}
							onclick={(event) => runMenuAction(event, () => setMode('BASE_EXTREME', 'BASE EXTREME', '10,000x'))}
							disabled={animationStatus === 'running' || autoplay}
						>
							{t('high')}
						</button>
					</div>
					<div class="panel-note panel-max-win">{t('max_win_equals', { value: maxWinLabel })}</div>
				</div>
			</div>
			<div class="panel-section">
				<div class="panel-title">{t('sounds')}</div>
				<div class="panel-segment-wrap panel-sounds-wrap">
					<div class="panel-slider">
						<div class="panel-slider-fill" style={`width: ${hudVolume}%`}></div>
						<input
							class="panel-slider-input"
							type="range"
							min="0"
							max="100"
							step="1"
							value={hudVolume}
							oninput={(event) => setHudVolume((event.currentTarget as HTMLInputElement).valueAsNumber)}
							aria-label={t('volume')}
						/>
					</div>
					<div class="panel-sound-row">
						<button type="button" class="panel-switch" class:panel-switch-on={musicMuted} onclick={(event) => runMenuAction(event, toggleHudMute)} aria-label={t('stop_music_toggle')}></button>
						<span class="panel-sound-label">{t('stop_music')}</span>
					</div>
				</div>
			</div>
			<div class="panel-section panel-section-speed">
				<div class="panel-title">{t('speed')}</div>
				<div class="panel-segment-wrap">
					<div class="panel-row panel-speed-row">
						<button type="button" class="panel-chip panel-speed speed-normal" class:panel-active={speedFactor === 2} onclick={(event) => runMenuAction(event, () => setSpeed(2))} disabled={autoplay}>
							{t('normal')}
						</button>
						<button type="button" class="panel-chip panel-speed speed-quick" class:panel-active={speedFactor === 4} onclick={(event) => runMenuAction(event, () => setSpeed(4))} disabled={autoplay}>
							{t('fast')}
						</button>
						<button type="button" class="panel-chip panel-speed speed-turbo" class:panel-active={speedFactor === 6} onclick={(event) => runMenuAction(event, () => setSpeed(6))} disabled={autoplay}>
							{t('turbo')}
						</button>
					</div>
				</div>
			</div>
			<button
				type="button"
				class="panel-info-btn"
				aria-label={t('game_info')}
				onpointerdown={swallowPointer}
				onpointerup={swallowPointer}
				onclick={openMenuInfo}
			>
				{t('info')}
			</button>
		</div>
	</div>
{/if}

{#if menuInfoOpen}
	<div
		class="menu-info-modal"
		role="button"
		tabindex="0"
		aria-label={t('close')}
		onpointerdown={(event) => {
			if (event.target === event.currentTarget) closeMenuInfo(event);
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				setMenuInfoOpen(false);
			}
		}}
	>
		<div
			class="menu-info-content"
			onpointerdown={(event) => event.stopPropagation()}
			onpointerup={(event) => event.stopPropagation()}
		>
			<button class="menu-info-close" onclick={closeMenuInfo} aria-label={t('close')}></button>
			<h3>{t('how_to_play')}</h3>
			<p>{t('how_to_play_text')}</p>
			<h3>{t('autoplay')}</h3>
			<p>{t('autoplay_text')}</p>
		</div>
	</div>
{/if}

<div class={`hud-right-rail ${compactUiClass()}`.trim()} class:menu-open={menuOpen} class:info-modal-open={menuInfoOpen} class:autoplay-open={autoplayOpen}>
	{#if !hideUnderlyingHudControls}
		{#if !hideMobilePortraitBottomHud}
			<div class="hud-mobile-controls-row">
				<button class="hud-round-btn hud-btn-feature hud-btn-feature-mobile hud-feature-hidden" title={t('features')} aria-label={t('features')} tabindex="-1"></button>
				<div class="hud-mobile-bet-triplet">
					<button
						type="button"
						class="bet-control hud-btn-minus"
						class:hud-feature-hidden={mobilePlusMinusHidden}
						aria-label={t('decrease_bet')}
						aria-hidden={mobilePlusMinusHidden}
						tabindex={mobilePlusMinusHidden ? -1 : 0}
						onpointerdown={(event) => startHoldRepeat(event, decreaseBet)}
						onpointerup={clearHoldRepeat}
						onpointercancel={clearHoldRepeat}
						onpointerleave={clearHoldRepeat}
						onclick={(event) => handleControlActivate(event, decreaseBet)}
						disabled={mobilePlusMinusHidden || hudInputBlocked || autoplay || animationStatus === 'running' || betIndex <= 0}
					></button>
					<button
						type="button"
						class="bet-main"
						class:hud-feature-hidden={mobileManualBetHidden}
						class:bet-autospin={autoplay}
						class:bet-disabled={hudInputBlocked || (animationStatus === 'running' && !autoplay) || !canAfford}
						aria-hidden={mobileManualBetHidden}
						tabindex={mobileManualBetHidden ? -1 : 0}
						onclick={handleBetClick}
						disabled={mobileManualBetHidden || hudInputBlocked || (animationStatus === 'running' && !autoplay) || pendingRound || !canAfford}
						aria-label={autoplayRemaining > 0 ? t('spins_count', { count: autoplayRemaining }) : t('bet')}
					>
						{#if autoplay && autoplayRemaining > 0}
							<div class="bet-autospin-card">
								<span
									class={`bet-autospins-count ${autoplayCountClass(autoplayRemaining)}`.trim()}
									style={`transform: scale(${autoplayCountScale(autoplayRemaining)});`}
									>{autoplayRemaining}</span
								>
							</div>
						{:else}
							<span
								class={`bet-main-label bet-main-label-mobile ${betLabelClass(t('bet'))} ${socialCurrencyUi ? 'bet-main-label-social' : ''}`.trim()}
								style={betMobileLabelStyle(t('bet'))}
								>{t('bet')}</span
							>
						{/if}
					</button>
					<button
						type="button"
						class="bet-control hud-btn-plus"
						class:hud-feature-hidden={mobilePlusMinusHidden}
						aria-label={t('increase_bet')}
						aria-hidden={mobilePlusMinusHidden}
						tabindex={mobilePlusMinusHidden ? -1 : 0}
						onpointerdown={(event) => startHoldRepeat(event, increaseBet)}
						onpointerup={clearHoldRepeat}
						onpointercancel={clearHoldRepeat}
						onpointerleave={clearHoldRepeat}
						onclick={(event) => handleControlActivate(event, increaseBet)}
						disabled={mobilePlusMinusHidden || hudInputBlocked || autoplay || animationStatus === 'running' || betIndex >= betLevels.length - 1}
					></button>
				</div>
				<button
					class="bet-control autoplay-icon-btn hud-btn-autoplay hud-btn-autoplay-mobile"
					class:autoplay-active={autoplayButtonActive}
					onclick={toggleAutoplayOpen}
					aria-label={autoplayOpen ? t('close_autoplay_options') : t('open_autoplay_options')}
					disabled={hudInputBlocked || autoplayButtonDisabled}
				></button>
			</div>
		{/if}
		<div class="bet-cluster">
			<button
				class="bet-main"
				class:bet-autospin={autoplay}
				class:bet-disabled={hudInputBlocked || (animationStatus === 'running' && !autoplay) || !canAfford}
				onclick={handleBetClick}
				disabled={hudInputBlocked || (animationStatus === 'running' && !autoplay) || pendingRound || !canAfford}
				aria-label={autoplayRemaining > 0 ? t('spins_count', { count: autoplayRemaining }) : t('bet')}
			>
				{#if autoplay && autoplayRemaining > 0}
					<div class="bet-autospin-card">
						<span
							class={`bet-autospins-count bet-autospins-count-bet-button ${autoplayCountClass(autoplayRemaining)}`.trim()}
							style={`transform: translate(-50%, -50%) scale(${autoplayBetButtonScale(autoplayRemaining)});`}
							>{autoplayRemaining}</span
						>
					</div>
				{:else}
					<span
						class={`bet-main-label ${betLabelClass(t('bet'))} ${socialCurrencyUi ? 'bet-main-label-social' : ''}`.trim()}
						style={`transform: scale(${betLabelScale(t('bet'))});`}
						>{t('bet')}</span
					>
				{/if}
			</button>
			<div class="bet-controls-rail">
				<button
					class="bet-control autoplay-icon-btn hud-btn-autoplay"
					class:autoplay-active={autoplayButtonActive}
					onclick={toggleAutoplayOpen}
					aria-label={autoplayOpen ? t('close_autoplay_options') : t('open_autoplay_options')}
					disabled={hudInputBlocked || autoplayButtonDisabled}
				></button>
				<button
					class="bet-control hud-btn-plus"
					aria-label={t('increase_bet')}
					onpointerdown={(event) => startHoldRepeat(event, increaseBet)}
					onpointerup={clearHoldRepeat}
					onpointercancel={clearHoldRepeat}
					onpointerleave={clearHoldRepeat}
					onclick={(event) => handleControlActivate(event, increaseBet)}
					disabled={autoplay || hudInputBlocked || animationStatus === 'running' || betIndex >= betLevels.length - 1}
				></button>
				<button
					class="bet-control hud-btn-minus"
					aria-label={t('decrease_bet')}
					onpointerdown={(event) => startHoldRepeat(event, decreaseBet)}
					onpointerup={clearHoldRepeat}
					onpointercancel={clearHoldRepeat}
					onpointerleave={clearHoldRepeat}
					onclick={(event) => handleControlActivate(event, decreaseBet)}
					disabled={autoplay || hudInputBlocked || animationStatus === 'running' || betIndex <= 0}
				></button>
			</div>
		</div>
		{#if autoplayOpen}
			{#if isMobileLandscapeUi}
				<button
					type="button"
					class="autoplay-backdrop"
					aria-label={t('close_autoplay_options')}
					onclick={toggleAutoplayOpen}
				></button>
			{/if}
			<div
				class={`autoplay-menu ${autoplayMenuClass()}`.trim()}
				onpointerdown={stopMenuEvent}
				onpointerup={stopMenuEvent}
			>
				<div class="autoplay-menu-content">
					<div class="autoplay-header">
						<div class={`autoplay-main-title ${autoplayTitleClass(t('autoplay'))}`.trim()}>{t('autoplay')}</div>
						{#if isMobilePortraitUi}
							<button
								type="button"
								class="autoplay-close hud-btn-close"
								onclick={toggleAutoplayOpen}
								aria-label={t('close')}
							></button>
						{/if}
					</div>
					<div class="autoplay-title autoplay-spins-title">{t('spins')}</div>
					<div class="autoplay-row">
						{#each autoplayOptions as count}
							<button type="button" class="autoplay-chip" class:panel-active={autoplayDraftCount === count} onclick={(event) => runMenuAction(event, () => setAutoplayDraft(count))}>
								{count}
							</button>
						{/each}
					</div>
					<div class="autoplay-title autoplay-speed-title">{t('speed')}</div>
					<div class="autoplay-speed">
						<button type="button" class="autoplay-chip panel-speed speed-normal" class:panel-active={speedFactor === 2} onclick={(event) => runMenuAction(event, () => setSpeed(2))} disabled={autoplay}>{t('normal')}</button>
						<button type="button" class="autoplay-chip panel-speed speed-quick" class:panel-active={speedFactor === 4} onclick={(event) => runMenuAction(event, () => setSpeed(4))} disabled={autoplay}>{t('fast')}</button>
						<button type="button" class="autoplay-chip panel-speed speed-turbo" class:panel-active={speedFactor === 6} onclick={(event) => runMenuAction(event, () => setSpeed(6))} disabled={autoplay}>{t('turbo')}</button>
					</div>
					<button type="button" class="autoplay-start" onclick={(event) => runMenuAction(event, handleStartAutoplay)} disabled={animationStatus === 'running' || status === 'sliding' || pendingRound || !canAfford}>
						<span class={`autoplay-start-label ${autoplayStartLabelClass(autoplayStartLabel)}`.trim()}>{autoplayStartLabel}</span>
					</button>
				</div>
			</div>
		{/if}
		<div class={`bet-info ${betInfoClass()}`.trim()}>
			<div class="bet-total">
				<strong style={betValueStyle(totalCostText)}>{totalCostText}</strong>
				<span>{t('total_cost')}</span>
			</div>
			<div class="bet-size">
				<strong style={betValueStyle(betSizeText)}>{betSizeText}</strong>
				<span>{t('bet_size')}</span>
			</div>
		</div>
		<button
			class="hud-speed-cycle"
			class:speed-normal={speedFactor === 2}
			class:speed-quick={speedFactor === 4}
			class:speed-turbo={speedFactor === 6}
			class:speed-disabled={mobilePortraitSpeedDisabled}
			onclick={cycleSpeed}
			aria-label={t('change_speed')}
			disabled={hudInputBlocked || autoplay || mobilePortraitSpeedDisabled}
		></button>
	{/if}
</div>
