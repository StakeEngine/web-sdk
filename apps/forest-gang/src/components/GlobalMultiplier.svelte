<script lang="ts" module>
	export type EmitterEventGlobalMultiplier =
		| { type: 'globalMultiplierShow' }
		| { type: 'globalMultiplierHide' }
		| { type: 'globalMultiplierUpdate'; multiplier: number };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicIn, backOut } from 'svelte/easing';

	import { BitmapText, Container, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { waitForTimeout } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, SYMBOL_W } from '../game/constants';

	// Bear-hand board sizing (board panel ≈ 58% of the 944×708 image width)
	// Match the top symbol board (BonusSymbolPanel uses SYMBOL_W * 1.1).
	// The hand image is 944×708; its board region is 592px wide, centred at (368,324).
	const BOARD_W = SYMBOL_W * 1.1;
	const HAND_W = BOARD_W * (944 / 592);
	const HAND_H = HAND_W * (708 / 944);
	const NUM_FONT = BOARD_W * 0.19;
	// Vertical centre nudge so the number sits in the middle of the wood board.
	const NUM_Y = -BOARD_W * 0.04;
	const SLIDE = BOARD_W * 0.55;
	const context = getContext();
	const scale = $derived(context.stateLayoutDerived.isStacked() ? 1.28 : 1);
	// Mirror BonusSymbolPanel geometry to place multiplier directly below it
	const _symPadW = SYMBOL_W * 1.1;
	const _symPadH = _symPadW * (420 / 624);
	// Desktop: symbol pad center is at boardW + 40
	const desktopPosition = $derived({
		x: context.stateGameDerived.boardLayout().width + 40,
		y: SYMBOL_SIZE * 0.3 + _symPadH * 0.5 + 18 + 30,
	});
	const portraitPosition = $derived({
		x: context.stateGameDerived.boardLayout().width - _symPadW * 0.5 - 10,
		y: -SYMBOL_SIZE * 0.6 + _symPadH * 0.5 + 18 + 30,
	});
	const position = $derived(
		context.stateLayoutDerived.isStacked() ? portraitPosition : desktopPosition,
	);

	let show = $state(false);
	let multiplier = $state(1);
	// Swap animation: the whole hand+board+number group slides out to the right
	// (fading), the number is swapped while hidden, then it slides back in from
	// the left. The number itself never animates independently — it rides the group.
	let groupX = new Tween(0);
	let groupAlpha = new Tween(1);

	const swapTo = async (next: number) => {
		// pull the sign out to the right
		groupX.set(SLIDE, { duration: 170, easing: cubicIn });
		groupAlpha.set(0, { duration: 150 });
		await waitForTimeout(170);
		// swap while hidden, jump to the left
		multiplier = next;
		groupX.set(-SLIDE, { duration: 0 });
		// bring the sign back in from the left with a slight overshoot
		groupX.set(0, { duration: 280, easing: backOut });
		groupAlpha.set(1, { duration: 190 });
		await waitForTimeout(280);
	};

	context.eventEmitter.subscribeOnMount({
		globalMultiplierShow: () => {
			show = true;
			multiplier = 1;
			groupX.set(0, { duration: 0 });
			groupAlpha.set(1, { duration: 0 });
		},
		globalMultiplierHide: () => (show = false),
		globalMultiplierUpdate: async (emitterEvent) => {
			const next = emitterEvent.multiplier;
			if (next === multiplier) return;

			context.eventEmitter.broadcast({
				type: 'soundOnce',
				name: next === 1 ? 'sfx_multiplier_reset' : 'sfx_multiplier_update',
			});

			await swapTo(next);
		},
	});
</script>

<FadeContainer {show}>
	<BoardContainer>
		<!-- The whole hand+board+number group slides + fades on a multiplier change -->
		<Container x={position.x + groupX.current} y={position.y} alpha={groupAlpha.current} {scale}>
			<!-- Bear-hand board: panel centre (0.39/0.458) at the container origin, paw extends right -->
			<Sprite key="multiplierHand" anchor={{ x: 0.39, y: 0.458 }} width={HAND_W} height={HAND_H} />

			<!-- Global multiplier number, gold, centred on the board (static) -->
			<BitmapText
				anchor={0.5}
				y={NUM_Y}
				text={`${multiplier}X`}
				style={{ fontFamily: 'silver', fontSize: NUM_FONT }}
			/>
		</Container>
	</BoardContainer>
</FadeContainer>
