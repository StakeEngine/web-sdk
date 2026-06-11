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
	// LAYOUT_WIDTH drives text positions (unchanged from original 455)
	const LAYOUT_WIDTH = SYMBOL_SIZE * BOARD_DIMENSIONS.x;
	// PANEL_WIDTH drives the spine visual width (wider wooden board)
	const PANEL_WIDTH = SYMBOL_W * BOARD_DIMENSIONS.x;
	const BACKGROUND_SIZES = {
		width: LAYOUT_WIDTH,
		height: LAYOUT_WIDTH / BACKGROUND_RATIO,
	};
	const PANEL_SIZES = {
		width: PANEL_WIDTH,
		height: LAYOUT_WIDTH,
	};

	let animationName = $state<AnimationName>('intro');
</script>

<MainContainer>
	<Container
		x={context.stateGameDerived.boardLayout().x}
		y={context.stateGameDerived.boardLayout().y}
		pivot={anchorToPivot({ anchor: 0.5, sizes: BACKGROUND_SIZES })}
	>
		<SpineProvider
			key="fsIntro"
			width={PANEL_SIZES.width}
			x={BACKGROUND_SIZES.width * 0.5}
			y={PANEL_SIZES.height * 0.4}
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
				{@render props.children({ sizes: BACKGROUND_SIZES })}
			</SpineSlot>
		</SpineProvider>
	</Container>
</MainContainer>
