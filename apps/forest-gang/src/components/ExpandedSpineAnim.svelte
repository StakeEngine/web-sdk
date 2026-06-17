<script lang="ts">
	import { SpineProvider, SpineTrack } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	type Props = { key: string; height: number };
	const props: Props = $props();

	let animationName = $state('intro_to_win');
	let loop = $state(false);

	const onComplete = (entry: { animation?: { name?: string } }) => {
		if (entry.animation?.name === 'intro_to_win') {
			animationName = 'win_loop';
			loop = true;
		}
	};

	// Reset when key changes (new expanded symbol)
	$effect(() => {
		props.key;
		animationName = 'intro_to_win';
		loop = false;
	});
</script>

<SpineProvider key={props.key} height={props.height} anchor={0.5}>
	<SpineTrack
		trackIndex={0}
		{animationName}
		{loop}
		timeScale={stateBetDerived.timeScale()}
		listener={{ complete: onComplete }}
	/>
</SpineProvider>
