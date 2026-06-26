<script lang="ts">
	import { stateBet } from 'state-shared';
	import { getContext } from '../game/context';

	type Props = { onclose: () => void };
	const props: Props = $props();
	const context = getContext();

	const ap = (p: string) => `./${p.startsWith('/') ? p.slice(1) : p}`;
	const panelBg = ap('/assets/components/ui/autoplay_panel.png');

	// Spin-count slider stops (last = unlimited)
	const STOPS: Array<number> = [10, 25, 50, 100, 250, 500, Infinity];
	let stopIndex = $state(3); // default 100
	const count = $derived(STOPS[stopIndex]);
	const countLabel = $derived(count === Infinity ? '∞' : `${count}`);
	const fillPct = $derived((stopIndex / (STOPS.length - 1)) * 100);

	// Live game-state toggles (mirror the HUD)
	const isTurbo = $derived(stateBet.isTurbo && !stateBet.isSuperTurbo);
	const isSuperTurbo = $derived(stateBet.isSuperTurbo);
	const isFeature = $derived(stateBet.activeBetModeKey === 'FEATURE');

	const toggleTurbo = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isTurbo) {
			stateBet.isTurbo = false;
		} else {
			stateBet.isTurbo = true;
			stateBet.isSuperTurbo = false;
		}
	};
	const toggleSuperTurbo = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isSuperTurbo) {
			stateBet.isSuperTurbo = false;
		} else {
			stateBet.isSuperTurbo = true;
			stateBet.isTurbo = false;
		}
	};
	const toggleFeature = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBet.activeBetModeKey = isFeature ? 'BASE' : 'FEATURE';
	};

	const start = () => {
		context.eventEmitter.broadcast({ type: 'soundPressBet' });
		stateBet.autoSpinsCounter = count;
		props.onclose();
		context.eventEmitter.broadcast({ type: 'autoBet' });
	};
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="ap-backdrop" onclick={props.onclose}></div>

<button class="ap-close" type="button" onclick={props.onclose} aria-label="Close">✕</button>

<div class="ap-root" role="dialog" aria-modal="true">
	<div class="ap-panel" style={`background-image:url('${panelBg}')`}>
		<div class="ap-content">
			<p class="ap-title">AUTO SPIN</p>

			<div class="ap-toggles">
				<div class="ap-row">
					<span class="ap-row__label">TURBO SPIN</span>
					<button class="ap-switch" class:on={isTurbo} type="button" onclick={toggleTurbo} aria-pressed={isTurbo}>
						<span class="ap-switch__thumb"></span>
					</button>
				</div>
				<div class="ap-row">
					<span class="ap-row__label">SUPER TURBO SPIN</span>
					<button class="ap-switch" class:on={isSuperTurbo} type="button" onclick={toggleSuperTurbo} aria-pressed={isSuperTurbo}>
						<span class="ap-switch__thumb"></span>
					</button>
				</div>
				<div class="ap-row">
					<span class="ap-row__label">100 X BONUS FEATURE</span>
					<button class="ap-switch" class:on={isFeature} type="button" onclick={toggleFeature} aria-pressed={isFeature}>
						<span class="ap-switch__thumb"></span>
					</button>
				</div>
			</div>

			<p class="ap-spins-label">NUMBER OF SPINS</p>

			<div class="ap-slider">
				<input
					class="ap-range"
					type="range"
					min="0"
					max={STOPS.length - 1}
					step="1"
					bind:value={stopIndex}
					style={`--fill:${fillPct}%`}
					aria-label="Number of spins"
				/>
				<span class="ap-slider__value">{countLabel}</span>
			</div>

			<button class="ap-start" type="button" onclick={start}>
				START AUTOPLAY ({countLabel})
			</button>
		</div>
	</div>
</div>

<style>
	.ap-backdrop {
		position: fixed;
		inset: 0;
		z-index: 58;
		background: rgba(0, 0, 0, 0.64);
		backdrop-filter: blur(4px);
	}

	.ap-root {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 59;
		width: min(620px, 94vw);
		font-family: 'Cinzel', serif;
	}

	/* Round wood close button, pinned to the top-right end of the screen */
	.ap-close {
		position: fixed;
		top: 22px;
		right: 22px;
		z-index: 60;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		border: 2px solid rgba(217, 133, 3, 0.7);
		background: radial-gradient(circle at 50% 35%, #3a2a16, #140d06);
		color: #e8c878;
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
		display: grid;
		place-items: center;
		transition: filter 0.12s ease;
	}
	.ap-close:hover { filter: brightness(1.2); }

	/* Wooden panel background (Figma art), fixed aspect */
	.ap-panel {
		aspect-ratio: 1402 / 1122;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 17% 19%;
		box-sizing: border-box;
	}

	.ap-content {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: clamp(8px, 1.6vw, 16px);
	}

	.ap-title {
		margin: 0 0 clamp(2px, 0.6vw, 6px);
		text-align: center;
		font-weight: 900;
		font-size: clamp(1.1rem, 2.4vw, 1.5rem);
		letter-spacing: 0.08em;
		background: linear-gradient(180deg, #ffd84a 10%, #ffa90e 60%, #d18005 95%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
	}

	.ap-toggles {
		display: flex;
		flex-direction: column;
		gap: clamp(6px, 1.3vw, 14px);
	}

	.ap-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.ap-row__label {
		color: #fff;
		font-weight: 900;
		font-size: clamp(0.72rem, 1.5vw, 0.95rem);
		letter-spacing: 0.04em;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
	}

	/* Green toggle switch */
	.ap-switch {
		flex: 0 0 auto;
		position: relative;
		width: 52px;
		height: 27px;
		border-radius: 999px;
		border: 1px solid rgba(0, 0, 0, 0.4);
		background: linear-gradient(180deg, #2c2c2c, #1a1a1a);
		cursor: pointer;
		padding: 0;
		transition: background 0.2s ease;
	}
	.ap-switch.on {
		background: linear-gradient(180deg, #7ec23a, #4e8f1d);
	}
	.ap-switch__thumb {
		position: absolute;
		top: 50%;
		left: 3px;
		transform: translateY(-50%);
		width: 21px;
		height: 21px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
		transition: left 0.2s ease;
	}
	.ap-switch.on .ap-switch__thumb { left: calc(100% - 24px); }

	.ap-spins-label {
		margin: 0;
		text-align: center;
		font-weight: 900;
		font-size: clamp(0.8rem, 1.7vw, 1.05rem);
		letter-spacing: 0.06em;
		background: linear-gradient(180deg, #ffa90e 15%, #ee960b 70%, #d18005 93%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	/* Slider */
	.ap-slider {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.ap-range {
		flex: 1 1 auto;
		-webkit-appearance: none;
		appearance: none;
		height: 12px;
		border-radius: 6px;
		background: linear-gradient(
			to right,
			#6fb22f 0%,
			#6fb22f var(--fill, 50%),
			rgba(0, 0, 0, 0.55) var(--fill, 50%),
			rgba(0, 0, 0, 0.55) 100%
		);
		border: 1px solid rgba(0, 0, 0, 0.5);
		outline: none;
		cursor: pointer;
	}
	.ap-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 26px;
		height: 26px;
		border-radius: 6px;
		background: radial-gradient(circle at 50% 35%, #6b4a25, #3a2611);
		border: 2px solid #d98503;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
		cursor: pointer;
	}
	.ap-range::-moz-range-thumb {
		width: 26px;
		height: 26px;
		border-radius: 6px;
		background: radial-gradient(circle at 50% 35%, #6b4a25, #3a2611);
		border: 2px solid #d98503;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
		cursor: pointer;
	}

	.ap-slider__value {
		flex: 0 0 auto;
		min-width: 42px;
		text-align: center;
		color: #fff;
		font-weight: 900;
		font-size: clamp(0.85rem, 1.7vw, 1.05rem);
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
	}

	/* Gold start button */
	.ap-start {
		width: 100%;
		padding: clamp(8px, 1.6vw, 13px);
		border: none;
		border-radius: 9px;
		background: linear-gradient(180deg, #ffa90e 15%, #ee960b 70%, #d18005 93%);
		color: #452b01;
		font-family: 'Cinzel', serif;
		font-weight: 900;
		font-size: clamp(0.78rem, 1.6vw, 1rem);
		letter-spacing: 0.04em;
		cursor: pointer;
		box-shadow: 0 0 4px #d98503, 0 4px 10px rgba(0, 0, 0, 0.5);
		transition: filter 0.12s ease;
	}
	.ap-start:hover { filter: brightness(1.06); }
	.ap-start:active { filter: brightness(0.95); }
</style>
