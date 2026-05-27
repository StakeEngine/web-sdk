<script lang="ts">
	import type { Snippet } from 'svelte';

	import { SpineProvider, SpineTrack, SpineSlot } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type AnimationState = 'intro' | 'idle' | 'outro';

	type Props = {
		animationMap: {
			intro:
				| 'big_win_intro'
				| 'epic_win_intro'
				| 'max_win_intro'
				| 'mega_win_intro'
				| 'super_win_intro';
			idle: 'big_win_idle' | 'epic_win_idle' | 'max_win_idle' | 'mega_win_idle' | 'super_win_idle';
			outro: 'big_win_exit' | 'epic_win_exit' | 'max_win_exit' | 'mega_win_exit' | 'super_win_exit';
		};
		children: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	let oncomplete = $state(() => {});
	let animationState = $state<AnimationState>('intro');
</script>

<SpineProvider width={context.stateGameDerived.boardLayout().width} key="bigwin">
	<SpineTrack
		trackIndex={0}
		animationName={props.animationMap[animationState]}
		loop={animationState === 'idle'}
		listener={{
			complete: () => {
				if (animationState === 'intro') animationState = 'idle';
				if (animationState === 'outro') oncomplete();
			},
		}}
	/>
	<SpineSlot slotName="slot_win_count">
		{@render props.children()}
	</SpineSlot>
</SpineProvider>
