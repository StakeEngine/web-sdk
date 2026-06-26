<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';

	const context = getContext();
	const main = $derived(context.stateLayoutDerived.mainLayout());

	const LOGO_ASPECT = 1176 / 572;
	const LOGO_W = $derived(main.width * 0.15);
	const LOGO_H = $derived(LOGO_W / LOGO_ASPECT);
	const MARGIN_X = $derived(main.width * 0.02);
	const MARGIN_Y = $derived(main.height * 0.03);
</script>

<MainContainer zIndex={20}>
	<!-- Text logo, anchored to the top-left corner of the game area -->
	<Sprite
		key="forestGangLogo"
		anchor={{ x: 0, y: 0 }}
		x={MARGIN_X}
		y={MARGIN_Y}
		width={LOGO_W}
		height={LOGO_H}
	/>
</MainContainer>
