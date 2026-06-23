<script lang="ts" module>
	export type EmitterEventDealItMultiplier =
		| { type: 'dealItMultiplierShow' }
		| { type: 'dealItMultiplierHide' }
		| { type: 'dealItMultiplierSpin'; multiplier: number }
		| { type: 'dealItMultiplierAwaitCycle' }
		| { type: 'dealItMultiplierSetTarget'; multiplier: number }
		| { type: 'dealItMultiplierStart' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut, backOut } from 'svelte/easing';

	import {
		BitmapText,
		Container,
		Sprite,
		SpineEventEmitterProvider,
		SpineProvider,
		SpineSlot,
		SpineTrack,
	} from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, SYMBOL_W } from '../game/constants';

	type AnimationName = 'static' | 'win' | 'reset' | 'increment';

	const PANEL_WIDTH = SYMBOL_SIZE * 0.641;
	// Slide distance for reel effect — one "row" height in Spine space
	const REEL_SLIDE = SYMBOL_SIZE * 3.5;
	const FONT_SIZE = SYMBOL_SIZE * 5.2;

	// Mirror BonusSymbolPanel geometry so DealIt panel sits directly below it
	const _symPadW = SYMBOL_W * 1.1;
	const _symPadH = _symPadW * (420 / 624);

	const context = getContext();
	const scale = $derived(context.stateLayoutDerived.isStacked() ? 1.28 : 1);
	const boardW = $derived(context.stateGameDerived.boardLayout().width);
	const desktopPosition = $derived({
		x: boardW + 40,
		y: SYMBOL_SIZE * 0.3 + _symPadH * 0.5 + 18 + 30,
	});
	const portraitPosition = $derived({
		x: boardW - _symPadW * 0.5 - 10,
		y: -SYMBOL_SIZE * 0.6 + _symPadH * 0.5 + 18 + 30,
	});
	const position = $derived(
		context.stateLayoutDerived.isStacked() ? portraitPosition : desktopPosition,
	);
	const pivot = { x: PANEL_WIDTH * 0.5, y: PANEL_WIDTH * 0.25 };

	let show = $state(false);
	let animationName = $state<AnimationName>('static');
	let multiplier = $state(1);
	let previousMultiplier = new Tween(1);
	let oncomplete = $state(() => {});
	let isCycling = $state(false);
	let landingTarget = $state(1);
	let cyclingResolve = $state<(() => void) | null>(null);
	let fastForward = $state(false);

	// Single text slides in from top — no overlap, no artifacts
	let reelText = $state('1×');
	let reelY = new Tween(0);

	const tickReel = async (newVal: number, duration: number) => {
		const scaledDuration = fastForward ? Math.max(55, duration * 0.18) : duration;
		// Slide current number out to bottom first (fast), then snap new number in from top
		reelY.set(REEL_SLIDE * 0.5, { duration: scaledDuration * 0.25, easing: cubicOut });
		await waitForTimeout(scaledDuration * 0.25);
		// Swap text while offscreen above, then slide in with slight bounce
		reelText = `${newVal}×`;
		reelY.set(-REEL_SLIDE, { duration: 0 });
		reelY.set(0, { duration: scaledDuration * 0.6, easing: backOut });
		await waitForTimeout(scaledDuration * 0.75);
	};

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => {
			if (show && (context.stateGame.bonusMode === 'freegame' || context.stateGame.bonusMode === 'feature')) fastForward = true;
		},
		dealItMultiplierAwaitCycle: async () => {
			if (!isCycling) return;
			await new Promise<void>((resolve) => { cyclingResolve = resolve; });
		},
		dealItMultiplierStart: async () => {
			show = true;
			landingTarget = 1;
			multiplier = 1;
			previousMultiplier.set(1, { duration: 0 });
			animationName = 'static';
			reelText = '1×';
			reelY.set(0, { duration: 0 });
			fastForward = false;

			const isFast = stateBetDerived.timeScale() > 1;
			if (isFast) {
				await waitForTimeout(80);
				const target = landingTarget;
				if (target > 1) {
					context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_update' });
					previousMultiplier.set(1, { duration: 0 });
					multiplier = target;
					animationName = 'increment';
					await waitForResolve((resolve) => (oncomplete = resolve));
					animationName = 'static';
					previousMultiplier.set(multiplier, { duration: 0 });
				}
				cyclingResolve?.();
				cyclingResolve = null;
				return;
			}

			const VALUES = [2, 3, 5, 10, 20, 100, 250];
			isCycling = true;
			// Bell curve: slow → fast → slow, with extra slow at end
			const delays = [450, 360, 270, 190, 140, 110, 100, 110, 140, 190, 270, 360, 480, 640, 860];
			let prevVal = 0;
			for (let i = 0; i < delays.length; i++) {
				const d = delays[i];
				if (fastForward && i >= 5) break;
				let val: number;
				do { val = VALUES[Math.floor(Math.random() * VALUES.length)]; } while (val === prevVal);
				prevVal = val;
				await tickReel(val, d);
			}
			// Final land — keep isCycling=true so reel template stays visible
			const target = landingTarget;
			await tickReel(target, fastForward ? 220 : 600);
			isCycling = false;

			if (target > 1) {
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_update' });
				previousMultiplier.set(1, { duration: 0 });
				multiplier = target;
				animationName = 'increment';
				await waitForResolve((resolve) => (oncomplete = resolve));
				animationName = 'static';
				previousMultiplier.set(multiplier, { duration: 0 });
			}

			cyclingResolve?.();
			cyclingResolve = null;
		},
		dealItMultiplierSetTarget: ({ multiplier: m }: { multiplier: number }) => {
			landingTarget = m;
		},
		dealItMultiplierHide: () => {
			show = false;
			isCycling = false;
			landingTarget = 1;
			multiplier = 1;
			previousMultiplier.set(1, { duration: 0 });
			animationName = 'static';
		},
	});
</script>

<FadeContainer {show}>
	<BoardContainer>
		<Container {...position} {scale}>
			<SpineProvider key="globalMultiplier" width={PANEL_WIDTH}>
				<SpineTrack
					trackIndex={0}
					{animationName}
					timeScale={stateBetDerived.timeScale()}
					listener={{ complete: () => { oncomplete(); } }}
				/>
				<!-- <SpineSlot slotName="Frame_Multiplier">
					<Sprite key="symbolPad" anchor={0.5} width={725} height={450} />
				</SpineSlot> -->
				<SpineSlot slotName="Frame_Multiplier2">
					<Sprite key="symbolPad" anchor={0.5} width={725} height={450} />
				</SpineSlot>
				<SpineEventEmitterProvider>
					<SpineSlot slotName="slot_multi">
						{#if isCycling}
							<!-- Single text slides in from top — clean, no overlap -->
							<BitmapText anchor={0.5} y={reelY.current} text={reelText} style={{ fontFamily: 'gold', fontSize: FONT_SIZE }} />
						{:else}
							<BitmapText anchor={0.5} text={`${Math.round(previousMultiplier.current)}×`} style={{ fontFamily: 'gold', fontSize: FONT_SIZE }} />
						{/if}
					</SpineSlot>
					<SpineSlot slotName="slot_multi_next">
						<BitmapText anchor={0.5} text={`${multiplier}×`} style={{ fontFamily: 'gold', fontSize: FONT_SIZE }} />
					</SpineSlot>
				</SpineEventEmitterProvider>
			</SpineProvider>
		</Container>
	</BoardContainer>
</FadeContainer>
