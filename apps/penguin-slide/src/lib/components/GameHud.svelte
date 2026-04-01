<script lang="ts">
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
	export let pendingRound = false;
	export let betIndex = 0;
	export let betLevels: number[] = [];
	export let betAmount = 0;
	export let totalCostMultiplier = 1;

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
	$: autoplayButtonDisabled = pendingRound || animationStatus === 'running' || status === 'sliding';

	function betLabelClass(label: string) {
		return label.length >= 9 ? 'bet-main-label-xlong' : label.length >= 6 ? 'bet-main-label-long' : '';
	}

	function betLabelScale(label: string) {
		const length = label.trim().length;
		if (length <= 5) return 1;
		if (length >= 14) return 0.58;
		return Math.max(0.58, 1 - (length - 5) * 0.046);
	}

	function autoplayCountClass(count: number) {
		const length = String(Math.max(0, count)).length;
		return length >= 4 ? 'bet-autospins-count-xlong' : length >= 3 ? 'bet-autospins-count-long' : '';
	}

	function autoplayCountScale(count: number) {
		const length = String(Math.max(0, count)).length;
		if (length <= 2) return 1;
		if (length === 3) return 0.8;
		return 0.66;
	}
</script>

<div class="hud-top" class:menu-open={menuOpen}>
	<div class="hud-left">
		<span class="hud-time">{timeLabel}</span>
		<span class="hud-divider">|</span>
		<span class="hud-user">{t('game_title')}</span>
	</div>
	<div class="hud-balance-center">
		<span class="hud-balance-label">{t('balance_label')}</span>
		<strong>{formatCurrencyAmount(balance)}</strong>
	</div>
</div>

<div class="hud-left-rail" class:menu-open={menuOpen}>
	<button class="hud-round-btn hud-btn-feature" title={t('features')} aria-label={t('features')}></button>
	<button
		class="hud-round-btn menu-toggle hud-btn-menu"
		class:menu-open={menuOpen}
		onclick={toggleMenuOpen}
		title={menuOpen ? t('close_menu') : t('menu')}
		aria-label={menuOpen ? t('close_menu') : t('menu')}
	></button>
</div>

{#if menuOpen}
	<div class="menu-left-dock" aria-hidden="true"></div>
	<div class="hud-panel">
		<div class="hud-panel-header">
			<div class="hud-panel-fade"></div>
		</div>
		<div class="panel-section">
			<div class="panel-title-row">
				<div class="panel-title">{t('volatility')}</div>
				<div class="panel-help-anchor" class:panel-help-open={volatilityHelpOpen}>
					<button
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
						class="panel-chip"
						class:panel-active={selectedMode === 'BASE_HARD'}
						onclick={() => setMode('BASE_HARD', 'BASE HARD', '1,000x')}
						disabled={animationStatus === 'running'}
					>
						{t('low')}
					</button>
					<button
						class="panel-chip"
						class:panel-active={selectedMode === 'BASE_VERY_HARD'}
						onclick={() => setMode('BASE_VERY_HARD', 'BASE VERY HARD', '5,000x')}
						disabled={animationStatus === 'running'}
					>
						{t('medium')}
					</button>
					<button
						class="panel-chip"
						class:panel-active={selectedMode === 'BASE_EXTREME'}
						onclick={() => setMode('BASE_EXTREME', 'BASE EXTREME', '10,000x')}
						disabled={animationStatus === 'running'}
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
					<button class="panel-switch" class:panel-switch-on={musicMuted} onclick={toggleHudMute} aria-label={t('stop_music_toggle')}></button>
					<span class="panel-sound-label">{t('stop_music')}</span>
				</div>
			</div>
		</div>
		<div class="panel-section panel-section-speed">
			<div class="panel-title">{t('speed')}</div>
			<div class="panel-segment-wrap">
				<div class="panel-row panel-speed-row">
					<button class="panel-chip panel-speed speed-normal" class:panel-active={speedFactor === 2} onclick={() => setSpeed(2)}>
						{t('normal')}
					</button>
					<button class="panel-chip panel-speed speed-quick" class:panel-active={speedFactor === 4} onclick={() => setSpeed(4)}>
						{t('fast')}
					</button>
					<button class="panel-chip panel-speed speed-turbo" class:panel-active={speedFactor === 6} onclick={() => setSpeed(6)}>
						{t('turbo')}
					</button>
				</div>
			</div>
		</div>
		<button class="panel-info-btn" onclick={() => setMenuInfoOpen(true)} aria-label={t('game_info')}>{t('info')}</button>
	</div>
{/if}

{#if menuInfoOpen}
	<div
		class="menu-info-modal"
		role="button"
		tabindex="0"
		aria-label={t('close')}
		onclick={(event) => {
			if (event.target === event.currentTarget) setMenuInfoOpen(false);
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				setMenuInfoOpen(false);
			}
		}}
	>
		<div class="menu-info-content">
			<button class="menu-info-close" onclick={() => setMenuInfoOpen(false)} aria-label={t('close')}></button>
			<h3>{t('how_to_play')}</h3>
			<p>{t('how_to_play_text')}</p>
			<h3>{t('autoplay')}</h3>
			<p>{t('autoplay_text')}</p>
		</div>
	</div>
{/if}

<div class="hud-right-rail" class:menu-open={menuOpen}>
	<div class="hud-mobile-controls-row">
		<button class="hud-round-btn hud-btn-feature hud-btn-feature-mobile" title={t('features')} aria-label={t('features')}></button>
		<div class="hud-mobile-bet-triplet">
			<button
				class="bet-control hud-btn-minus"
				aria-label={t('decrease_bet')}
				onclick={decreaseBet}
				disabled={animationStatus === 'running' || betIndex <= 0}
			></button>
			<button
				class="bet-main"
				class:bet-autospin={autoplay}
				class:bet-disabled={animationStatus === 'running' && !autoplay}
				onclick={handleBetClick}
				disabled={(animationStatus === 'running' && !autoplay) || pendingRound}
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
						class={`bet-main-label ${betLabelClass(t('bet'))}`.trim()}
						style={`transform: scale(${betLabelScale(t('bet'))});`}
						>{t('bet')}</span
					>
				{/if}
			</button>
			<button
				class="bet-control hud-btn-plus"
				aria-label={t('increase_bet')}
				onclick={increaseBet}
				disabled={animationStatus === 'running' || betIndex >= betLevels.length - 1}
			></button>
		</div>
		<button
			class="bet-control autoplay-icon-btn hud-btn-autoplay hud-btn-autoplay-mobile"
			class:autoplay-active={autoplay}
			class:autoplay-open={autoplayOpen}
			onclick={toggleAutoplayOpen}
			aria-label={autoplayOpen ? t('close_autoplay_options') : t('open_autoplay_options')}
			disabled={autoplayButtonDisabled}
		></button>
	</div>
	<div class="bet-cluster">
		<button
			class="bet-main"
			class:bet-autospin={autoplay}
			class:bet-disabled={animationStatus === 'running' && !autoplay}
			onclick={handleBetClick}
			disabled={(animationStatus === 'running' && !autoplay) || pendingRound}
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
					class={`bet-main-label ${betLabelClass(t('bet'))}`.trim()}
					style={`transform: scale(${betLabelScale(t('bet'))});`}
					>{t('bet')}</span
				>
			{/if}
		</button>
		<div class="bet-controls-rail">
			<button
				class="bet-control autoplay-icon-btn hud-btn-autoplay"
				class:autoplay-active={autoplay}
				class:autoplay-open={autoplayOpen}
				onclick={toggleAutoplayOpen}
				aria-label={autoplayOpen ? t('close_autoplay_options') : t('open_autoplay_options')}
				disabled={autoplayButtonDisabled}
			></button>
			<button
				class="bet-control hud-btn-plus"
				aria-label={t('increase_bet')}
				onclick={increaseBet}
				disabled={animationStatus === 'running' || betIndex >= betLevels.length - 1}
			></button>
			<button
				class="bet-control hud-btn-minus"
				aria-label={t('decrease_bet')}
				onclick={decreaseBet}
				disabled={animationStatus === 'running' || betIndex <= 0}
			></button>
		</div>
	</div>
	{#if autoplayOpen}
		<div class="autoplay-menu">
			<div class="autoplay-header">
				<div class="autoplay-main-title">{t('autoplay')}</div>
				<button class="autoplay-close hud-btn-close" onclick={toggleAutoplayOpen} aria-label={t('close')}></button>
			</div>
			<div class="autoplay-title">{t('spins')}</div>
			<div class="autoplay-row">
				{#each autoplayOptions as count}
					<button class="autoplay-chip" class:panel-active={autoplayDraftCount === count} onclick={() => setAutoplayDraft(count)}>
						{count}
					</button>
				{/each}
			</div>
			<div class="autoplay-title">{t('speed')}</div>
			<div class="autoplay-speed">
				<button class="autoplay-chip panel-speed speed-normal" class:panel-active={speedFactor === 2} onclick={() => setSpeed(2)}>{t('normal')}</button>
				<button class="autoplay-chip panel-speed speed-quick" class:panel-active={speedFactor === 4} onclick={() => setSpeed(4)}>{t('fast')}</button>
				<button class="autoplay-chip panel-speed speed-turbo" class:panel-active={speedFactor === 6} onclick={() => setSpeed(6)}>{t('turbo')}</button>
			</div>
			<button class="autoplay-start" onclick={handleStartAutoplay} disabled={animationStatus === 'running' || status === 'sliding' || pendingRound}>
				{isMobileLandscapeUi ? t('start') : t('start_autospins')}
			</button>
		</div>
	{/if}
	<div class="bet-info">
		<div class="bet-total">
			<strong>{formatCurrencyAmount(betAmount * totalCostMultiplier)}</strong>
			<span>{t('total_cost')}</span>
		</div>
		<div class="bet-size">
			<strong>{formatCurrencyAmount(betAmount)}</strong>
			<span>{t('bet_size')}</span>
		</div>
	</div>
	<button
		class="hud-speed-cycle"
		class:speed-normal={speedFactor === 2}
		class:speed-quick={speedFactor === 4}
		class:speed-turbo={speedFactor === 6}
		onclick={cycleSpeed}
		aria-label={t('change_speed')}
	></button>
</div>
