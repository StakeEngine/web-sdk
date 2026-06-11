<script lang="ts">
	import type { Snippet } from 'svelte';

	import {
		anchorToPivot,
		Container,
		SpineProvider,
		SpineSlot,
		SpineTrack,
		type Sizes,
	} from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, SYMBOL_W, BOARD_DIMENSIONS } from '../game/constants';

	type Props = {
		children: Snippet<[{ sizes: Sizes }]>;
	};

	const props: Props = $props();

	type AnimationName = 'intro' | 'idle';

	const context = getContext();
	const BACKGROUND_RATIO = 920 / 720;
	const LAYOUT_WIDTH = SYMBOL_SIZE * BOARD_DIMENSIONS.x;
	const PANEL_WIDTH = SYMBOL_W * BOARD_DIMENSIONS.x;

	let animationName = $state<AnimationName>('intro');

	const bs = $derived(context.stateGameDerived.boardLayout().boardScale);
	const scaledBackground = $derived({ width: LAYOUT_WIDTH * bs, height: (LAYOUT_WIDTH / BACKGROUND_RATIO) * bs });
	const scaledPanel = $derived({ width: PANEL_WIDTH * bs, height: LAYOUT_WIDTH * bs });
</script>

<MainContainer>
	<Container
		x={context.stateGameDerived.boardLayout().x}
		y={context.stateGameDerived.boardLayout().y}
		pivot={anchorToPivot({ anchor: 0.5, sizes: scaledBackground })}
	>
		<SpineProvider
			key="fsIntro"
			width={scaledPanel.width}
			x={scaledBackground.width * 0.5}
			y={scaledPanel.height * 0.4}
		>
			<SpineTrack
				trackIndex={0}
				{animationName}
				loop={animationName === 'idle'}
				listener={{
					complete: () => (animationName = 'idle'),
				}}
			/>
			<SpineSlot slotName="slot_text_placeholder">
				{@render props.children({ sizes: scaledBackground })}
			</SpineSlot>
		</SpineProvider>
	</Container>
</MainContainer>
