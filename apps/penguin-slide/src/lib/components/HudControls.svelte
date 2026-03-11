<script lang="ts">
	export let timeLabel = '';
	export let balance = 0;
	export let menuOpen = false;
	export let menuInfoOpen = false;
	export let autoplay = false;
	export let autoplayOpen = false;
	export let autoplayRemaining = 0;
	export let autoplayDraftCount = 0;
	export let autoplayOptions: number[] = [];
	export let betAmount = 0;
	export let betIndex = 0;
	export let betLevels: number[] = [];
	export let betCostMultiplier = 1;
	export let animationStatus = 'idle';
	export let pendingRound = false;
	export let hudVolume = 0;
	export let musicMuted = false;
	export let speedFactor = 1;
	export let isMobileLandscapeUi = false;
	export let selectedMode = 'BASE_HARD';
	export let maxWinLabel = '1,000x';

	export let onToggleMenu: () => void = () => {};
	export let onToggleMenuInfo: (value: boolean) => void = () => {};
	export let onSetMode: (mode: string, label?: string, maxWin?: string) => void = () => {};
	export let onHandleBetClick: () => void = () => {};
	export let onToggleAutoplay: () => void = () => {};
	export let onSetAutoplayDraft: (count: number) => void = () => {};
	export let onStartAutoplay: () => void = () => {};
	export let onIncreaseBet: () => void = () => {};
	export let onDecreaseBet: () => void = () => {};
	export let onToggleMute: () => void = () => {};
	export let onSetSpeed: (value: number) => void = () => {};
	export let onOpenSpeedSelector: () => void = () => {};
	export let onChangeVolume: (value: number) => void = () => {};

	const panelClass = () => (menuOpen ? 'hud-top menu-open' : 'hud-top');
</script>

<div class="hud-top" class:menu-open={menuOpen}>
	<div class="hud-left">
		<span class="hud-time">{timeLabel}</span>
		<span class="hud-divider">|</span>
		<span class="hud-user">PENGUIN SLIDE</span>
	</div>
	<div class="hud-balance-center">
		<span class="hud-balance-label">BALANCE:</span>
		<strong>${balance.toFixed(2)}</strong>
	</div>
</div>

<div class="hud-left-rail" class:menu-open={menuOpen}>
	<button class="hud-round-btn hud-btn-feature" title="Features" aria-label="Features"></button>
	<button
		class="hud-round-btn menu-toggle hud-btn-menu"
		class:menu-open={menuOpen}
		on:click={onToggleMenu}
		title={menuOpen ? 'Close Menu' : 'Menu'}
		aria-label={menuOpen ? 'Close Menu' : 'Menu'}
	></button>
</div>

{#if menuOpen}
	<div class="menu-left-dock" aria-hidden="true"></div>
	<div class="hud-panel">
		<div class="hud-panel-header">
			<div class="hud-panel-title">PENGUIN RUSH</div>
			<div class="hud-panel-fade"></div>
		</div>
		<div class="panel-section">
			<div class="panel-title-row">
				<div class="panel-title">Volatility</div>
				<div class="panel-help-anchor">
					<button class="panel-help-btn" aria-label="Volatility help">?</button>
					<div class="panel-help-pop">
						<h4>Volatility</h4>
						<p>Here you can choose your playstyle.</p>
						<p>Each level changes how often and how big you can win:</p>
						<ul>
							<li>Low: More frequent wins — up to 1,000x max win.</li>
							<li>Medium: Less frequent wins, but bigger wins — up to 5,000x max win.</li>
							<li>High: High risk, high reward — up to 10,000x max win.</li>
						</ul>
					</div>
				</div>
			</div>
			<div class="panel-segment-wrap">
				<div class="panel-row panel-volatility">
					<button
						class="panel-chip"
						class:panel-active={selectedMode === 'BASE_HARD'}
						on:click={() => onSetMode('BASE_HARD', 'BASE HARD', '1,000x')}
					>
						Low
					</button>
					<button
						class="panel-chip"
						class:panel-active={selectedMode === 'BASE_VERY_HARD'}
						on:click={() => onSetMode('BASE_VERY_HARD', 'BASE VERY HARD', '5,000x')}
					>
						Medium
					</button>
					<button
						class="panel-chip"
						class:panel-active={selectedMode === 'BASE_EXTREME'}
						on:click={() => onSetMode('BASE_EXTREME', 'BASE EXTREME', '10,000x')}
					>
						High
					</button>
				</div>
				<div class="panel-note">Max win = {maxWinLabel}</div>
			</div>
		</div>
		<div class="panel-section">
			<div class="panel-title">Sounds</div>
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
						on:input={(event) => onChangeVolume((event.currentTarget as HTMLInputElement).valueAsNumber)}
						aria-label="Volume"
					/>
				</div>
				<div class="panel-sound-row">
					<button class="panel-switch" class:panel-switch-on={!musicMuted} on:click={onToggleMute} aria-label="Stop Music toggle"></button>
					<span class="panel-sound-label">Stop Music</span>
				</div>
			</div>
		</div>
		<div class="panel-section panel-section-speed">
			<div class="panel-title">Speed</div>
			<div class="panel-segment-wrap">
				<div class="panel-row panel-speed-row">
					<button class="panel-chip panel-speed speed-normal" class:panel-active={speedFactor === 1} on:click={() => onSetSpeed(1)} >
						Normal
					</button>
					<button class="panel-chip panel-speed speed-quick" class:panel-active={speedFactor === 1.5} on:click={() => onSetSpeed(1.5)} >
						Fast
					</button>
					<button class="panel-chip panel-speed speed-turbo" class:panel-active={speedFactor === 2} on:click={() => onSetSpeed(2)} >
						Turbo
					</button>
				</div>
			</div>
		</div>
		<button class="panel-info-btn" on:click={() => onToggleMenuInfo(true)} aria-label="Game info"></button>
	</div>
{/if}

{#if menuInfoOpen}
	<div class="menu-info-modal">
		<div class="menu-info-content">
			<button class="menu-info-close" on:click={() => onToggleMenuInfo(false)} aria-label="Close"></button>
			<h3>How to play</h3>
			<p>Tap BET to start. Guide the penguin through pickups and avoid hazards. Cash out to secure your current value.</p>
			<h3>Autoplay</h3>
			<p>Choose spins and speed from Autoplay, then start. Tap BET during autoplay to stop immediately.</p>
		</div>
	</div>
{/if}

<div class="hud-right-rail" class:menu-open={menuOpen}>
	<div class="bet-cluster">
		<button
			class="bet-main"
			class:bet-autospin={autoplay}
			class:bet-disabled={animationStatus === 'running' && !autoplay}
			on:click={onHandleBetClick}
			disabled={(animationStatus === 'running' && !autoplay) || pendingRound}
			aria-label={autoplayRemaining > 0 ? `${autoplayRemaining} spins` : 'Bet'}
		>
			{#if autoplay && autoplayRemaining > 0}
				<div class="bet-autospin-card">
					<span class="bet-autospins-count">{autoplayRemaining}</span>
				</div>
			{/if}
		</button>
		<div class="bet-controls-rail">
			<button
				class="bet-control autoplay-icon-btn hud-btn-autoplay"
				class:autoplay-active={autoplay}
				class:autoplay-open={autoplayOpen}
				on:click={onToggleAutoplay}
				aria-label={autoplayOpen ? 'Close autoplay options' : 'Open autoplay options'}
				disabled={pendingRound}
			></button>
			<button
				class="bet-control hud-btn-plus"
				aria-label="Increase bet"
				on:click={onIncreaseBet}
				disabled={betIndex >= betLevels.length - 1}
			></button>
			<button
				class="bet-control hud-btn-minus"
				aria-label="Decrease bet"
				on:click={onDecreaseBet}
				disabled={betIndex <= 0}
			></button>
		</div>
	</div>
	{#if autoplayOpen}
		<div class="autoplay-menu">
			<div class="autoplay-header">
				<div class="autoplay-main-title">AUTOPLAY</div>
				<button class="autoplay-close hud-btn-close" on:click={onToggleAutoplay} aria-label="Close"></button>
			</div>
			<div class="autoplay-title">Spins</div>
			<div class="autoplay-row">
				{#each autoplayOptions as count}
					<button class="autoplay-chip" class:panel-active={autoplayDraftCount === count} on:click={() => onSetAutoplayDraft(count)}>
						{count}
					</button>
				{/each}
			</div>
			<div class="autoplay-title">Speed</div>
			<div class="autoplay-speed">
				<button class="autoplay-chip panel-speed speed-normal" class:panel-active={speedFactor === 1} on:click={() => onSetSpeed(1)}>Normal</button>
				<button class="autoplay-chip panel-speed speed-quick" class:panel-active={speedFactor === 1.5} on:click={() => onSetSpeed(1.5)}>Fast</button>
				<button class="autoplay-chip panel-speed speed-turbo" class:panel-active={speedFactor === 2} on:click={() => onSetSpeed(2)}>Turbo</button>
			</div>
			<button class="autoplay-start" on:click={onStartAutoplay}>
				{isMobileLandscapeUi ? 'START' : 'START AUTOSPINS'}
			</button>
		</div>
	{/if}
	<div class="bet-info">
		<div class="bet-total">
			<strong>${(betAmount * betCostMultiplier).toFixed(2)}</strong>
			<span>TOTAL COST</span>
		</div>
		<div class="bet-size">
			<strong>${betAmount.toFixed(2)}</strong>
			<span>BET SIZE</span>
		</div>
	</div>
	<button
		class="hud-speed-cycle"
		class:speed-normal={speedFactor === 1}
		class:speed-quick={speedFactor === 1.5}
		class:speed-turbo={speedFactor === 2}
		on:click={onOpenSpeedSelector}
		aria-label="Open speed selector"
	></button>
</div>
