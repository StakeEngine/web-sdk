<script lang="ts">
	import { Sprite, Text, Container } from 'pixi-svelte';
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
		<Text
			x={10}
			y={-10}
			anchor={{ x: 0.5, y: 0.5 }}
			text="FOREST"
			style={{ fontFamily: 'Cinzel', fontSize: 31, fontWeight: '900', fill: 0xf2efd9, dropShadow: true, dropShadowDistance: 4, dropShadowBlur: 8, dropShadowColor: 0x000000, dropShadowAngle: 45, dropShadowAlpha: 0.9 }}
		/>
		<Text
			x={11}
			y={26}
			anchor={{ x: 0.5, y: 0.5 }}
			text="GANG"
			style={{ fontFamily: 'Cinzel', fontSize: 22, fontWeight: '700', fill: 0xffd84a, dropShadow: true, dropShadowDistance: 4, dropShadowBlur: 8, dropShadowColor: 0x000000, dropShadowAngle: 45, dropShadowAlpha: 0.9, letterSpacing: 6 }}
		/>
	</Container>
</MainContainer>
