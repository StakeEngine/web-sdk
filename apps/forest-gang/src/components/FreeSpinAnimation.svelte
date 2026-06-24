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
		xOffset?: number;
	};

	const props: Props = $props();
	const xOffset = $derived(props.xOffset ?? 0);

	type AnimationName = 'intro' | 'idle';

	const context = getContext();
	const BACKGROUND_RATIO = 920 / 720;
	const LAYOUT_WIDTH = SYMBOL_SIZE * BOARD_DIMENSIONS.x;
	const PANEL_WIDTH = SYMBOL_W * BOARD_DIMENSIONS.x;

	let animationName = $state<AnimationName>('intro');

	// Size the intro popup relative to the screen, not the board — otherwise it
	// shrinks whenever the board scale is reduced.
	const main = $derived(context.stateLayoutDerived.mainLayout());
	const bs = $derived((Math.min(main.width, main.height) * 0.72) / LAYOUT_WIDTH);
	const scaledBackground = $derived({ width: LAYOUT_WIDTH * bs, height: (LAYOUT_WIDTH / BACKGROUND_RATIO) * bs });
	const scaledPanel = $derived({ width: PANEL_WIDTH * bs, height: LAYOUT_WIDTH * bs });
</script>

<MainContainer>
	<Container
		x={main.width / 2}
		y={main.height / 2}
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
