<script lang="ts">
	import { Container, SpineProvider, SpineTrack } from 'pixi-svelte';
	import type { Reel } from '../game/stateGame.svelte';
	import { SYMBOL_W, BOARD_SIZES } from '../game/constants';
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
		// Press during anticipation: skip the animation only — reel continues spinning naturally
		stopButtonClick: () => {
			if (animationName === 'anticipation_out') return;
			speedUp = true;
			animationName = 'anticipation_out';
		},
	});
</script>

<Container
	x={context.stateGameDerived.boardLayout().x + ((props.reel.reelIndex + 0.5) * SYMBOL_W - BOARD_SIZES.width * 0.5) * context.stateGameDerived.boardLayout().boardScale}
	y={context.stateGameDerived.boardLayout().y}
	scale={{ x: 1, y: 0.57 }}
>
<SpineProvider
	key="anticipation"
	width={SYMBOL_W * context.stateGameDerived.boardLayout().boardScale * 0.57}
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
					// If user force-stopped: stop the reel exactly when the animation ends
					if (speedUp) props.reel.stop();
					props.oncomplete();
				}
			},
		}}
	/>
</SpineProvider>
</Container>
