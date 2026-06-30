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
	import { cubicIn, backOut } from 'svelte/easing';

	import { Container, Sprite, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { waitForTimeout } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, SYMBOL_W } from '../game/constants';
	import { GOLD_GRADIENT } from '../game/goldGradient';

	// Bear-hand board sizing — multiplier_hand.png is 944×708; its board region is 592px wide,
	// centred at (368,324). Match the top symbol board (BonusSymbolPanel uses SYMBOL_W * 1.1).
	const BOARD_W = SYMBOL_W * 1.1;
	const HAND_W = BOARD_W * (944 / 592);
	const HAND_H = HAND_W * (708 / 944);
	const NUM_FONT = BOARD_W * 0.215;
	// Vertical centre nudge so the Cinzel caps sit in the middle of the wood board.
	const NUM_Y = BOARD_W * 0.012;
	const SLIDE = BOARD_W * 0.55;

	const context = getContext();
	const scale = $derived(context.stateLayoutDerived.isStacked() ? 1.28 : 1);

	// Mirror BonusSymbolPanel geometry so the DealIt panel sits directly below it.
	const _symPadW = SYMBOL_W * 1.1;
	const _symPadH = _symPadW * (420 / 624);
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

	// The panel stays on screen for the whole Deal It bonus (shown on the first winning spin,
	// hidden only at bonus end). It only animates when the multiplier value actually changes —
	// the hand slides out, swaps the value while hidden, and slides back in.
	let show = $state(false);
	let multiplier = $state(1);
	let pendingTarget = $state(1);
	let swapping = $state(false);
	let swapResolve = $state<(() => void) | null>(null);

	let groupX = new Tween(0);
	let groupAlpha = new Tween(1);

	const swapTo = async (next: number) => {
		swapping = true;
		groupX.set(SLIDE, { duration: 170, easing: cubicIn });
		groupAlpha.set(0, { duration: 150 });
		await waitForTimeout(170);
		multiplier = next;
		groupX.set(-SLIDE, { duration: 0 });
		groupX.set(0, { duration: 280, easing: backOut });
		groupAlpha.set(1, { duration: 190 });
		await waitForTimeout(280);
		swapping = false;
		swapResolve?.();
		swapResolve = null;
	};

	context.eventEmitter.subscribeOnMount({
		// First winning spin reveals the board; it then stays put.
		dealItMultiplierStart: () => {
			show = true;
		},
		// The multiplier for this spin (only broadcast when a multiplier applies).
		dealItMultiplierSetTarget: ({ multiplier: m }: { multiplier: number }) => {
			pendingTarget = m;
		},
		// Commit point (after the win resolves): animate only if the value actually changed.
		dealItMultiplierAwaitCycle: async () => {
			if (pendingTarget !== multiplier) {
				context.eventEmitter.broadcast({
					type: 'soundOnce',
					name: pendingTarget > multiplier ? 'sfx_multiplier_update' : 'sfx_multiplier_reset',
				});
				await swapTo(pendingTarget);
			}
		},
		// Bonus end (or switch to All In): clear and hide.
		dealItMultiplierHide: () => {
			show = false;
			swapping = false;
			multiplier = 1;
			pendingTarget = 1;
			groupX.set(0, { duration: 0 });
			groupAlpha.set(1, { duration: 0 });
			swapResolve?.();
			swapResolve = null;
		},
	});
</script>

<FadeContainer {show}>
	<BoardContainer>
		<!-- The hand+board+number group slides + fades only when the multiplier changes -->
		<Container x={position.x + groupX.current} y={position.y} alpha={groupAlpha.current} {scale}>
			<!-- Bear-hand board: panel centre (0.39/0.458) at the container origin, paw extends right -->
			<Sprite key="multiplierHand" anchor={{ x: 0.39, y: 0.458 }} width={HAND_W} height={HAND_H} />

			<!-- Multiplier number — Cinzel 900 gold, riding the board (static — only the hand animates) -->
			<Text
				anchor={0.5}
				y={NUM_Y}
				text={`${multiplier}X`}
				style={{
					fontFamily: 'Cinzel',
					fontWeight: '900',
					fontSize: NUM_FONT,
					fill: GOLD_GRADIENT,
					align: 'center',
					letterSpacing: NUM_FONT * 0.03,
				}}
			/>
		</Container>
	</BoardContainer>
</FadeContainer>
