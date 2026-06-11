<script lang="ts">
	import { Sprite, Container } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { BOARD_SIZES } from '../game/constants';

	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());

	const LOGO_ASPECT = 763 / 187;
	const LOGO_W = (BOARD_SIZES.width - 64) * 0.9;
	const LOGO_H = LOGO_W / LOGO_ASPECT;
	const OVERLAP = 28;

	const x = $derived(layout.x);
	const y = $derived(
		layout.y - (BOARD_SIZES.height / 2) * layout.boardScale - LOGO_H / 2 + OVERLAP,
	);
</script>

<MainContainer zIndex={20}>
	<Container {x} {y}>
		<Sprite
			key="logoFrame"
			anchor={{ x: 0.5, y: 0.5 }}
			width={LOGO_W}
			height={LOGO_H}
		/>
		<Sprite
			key="forestGangLogo"
			anchor={{ x: 0.5, y: 0.5 }}
			width={LOGO_W * 0.44}
			height={LOGO_W * 0.44 / (1176 / 572)}
		/>
	</Container>
</MainContainer>
