<script lang="ts">
	import { SpineProvider, SpineTrack } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		assetKey: string;
		introAnimation: string;
		loopAnimation: string;
		sizeRatio: number;
		x?: number;
		y?: number;
	};

	const props: Props = $props();
	let animationName = $state(props.introAnimation);
	let loop = $state(false);

	const onComplete = (entry: { animation?: { name?: string } }) => {
		if (entry.animation?.name === props.introAnimation) {
			animationName = props.loopAnimation;
			loop = true;
		}
	};
</script>

<SpineProvider
	x={props.x}
	y={props.y}
	key={props.assetKey}
	height={SYMBOL_SIZE * props.sizeRatio}
>
	<SpineTrack
		trackIndex={0}
		{animationName}
		{loop}
		timeScale={stateBetDerived.timeScale() * 1.5}
		listener={{ complete: onComplete }}
	/>
</SpineProvider>
