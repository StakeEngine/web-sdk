<script lang="ts">
	import { Container, SpineProvider, SpineTrack } from 'pixi-svelte';
	import type { Reel } from '../game/stateGame.svelte';
	import { SYMBOL_W, SYMBOL_SIZE, BOARD_SIZES, BOARD_GRID_OFFSET_Y } from '../game/constants';
	import { getContext } from '../game/context';

	type Props = {
		reel: Reel;
		oncomplete: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	type AnimationName = 'anticipation_intro' | 'anticipation_loop' | 'anticipation_out';

	let animationName = $state<AnimationName>('anticipation_intro');
	let speedUp = $state(false);

	$effect(() => {
		if (props.reel.reelState.motion === 'stopped') {
			animationName = 'anticipation_out';
		}
	});

	context.eventEmitter.subscribeOnMount({
		// Press during anticipation: stop reel and skip out animation entirely
		stopButtonClick: () => {
			props.reel.stop();
			props.oncomplete();
		},
	});
</script>

<Container
	x={context.stateGameDerived.boardLayout().x + ((props.reel.reelIndex + 0.5) * SYMBOL_W - BOARD_SIZES.width * 0.5) * context.stateGameDerived.boardLayout().boardScale}
	y={context.stateGameDerived.boardLayout().y + BOARD_GRID_OFFSET_Y}
>
<SpineProvider
	key="anticipation"
	width={SYMBOL_W * context.stateGameDerived.boardLayout().boardScale / 2}
	height={SYMBOL_SIZE * 4 * context.stateGameDerived.boardLayout().boardScale / 2}
>
	<SpineTrack
		trackIndex={0}
		{animationName}
		loop={animationName === 'anticipation_loop'}
		timeScale={speedUp ? 4 : 1}
		listener={{
			complete: () => {
				if (animationName === 'anticipation_intro') {
					animationName = 'anticipation_loop';
					return;
				}

				if (animationName === 'anticipation_out') {
					props.oncomplete();
				}
			},
		}}
	/>
</SpineProvider>
</Container>
