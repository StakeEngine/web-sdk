<script lang="ts">
	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, anchorToPivot } from 'pixi-svelte';

	import { DESKTOP_BASE_SIZE, DESKTOP_BACKGROUND_WIDTH_LIST } from '../constants';
	import { getContext } from '../context';
	import type { LayoutUiProps } from '../types';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const main = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const barY = $derived(main.height - DESKTOP_BASE_SIZE - 54);
	const rowY = $derived(DESKTOP_BASE_SIZE * 0.5 - 2);
</script>

<!-- top left quick actions -->
<Container x={78} y={136} scale={0.42}>
	{@render props.buttonMenu({ anchor: 0.5 })}
</Container>

<Container x={164} y={136} scale={0.34}>
	{@render props.buttonSoundSwitch({ anchor: 0.5 })}
</Container>

<MainContainer standard alignVertical="bottom">
	<Container
		x={main.width * 0.5}
		y={barY}
		pivot={anchorToPivot({
			anchor: { x: 0.5, y: 0 },
			sizes: {
				height: DESKTOP_BASE_SIZE,
				width: DESKTOP_BACKGROUND_WIDTH_LIST.reduce((sum, width) => sum + width, 0),
			},
		})}
	>
		<!-- single-line HUD slots -->
		<Container y={rowY} x={292} scale={0.86}>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>

		<Container y={rowY - 14} x={650} scale={0.82}>
			{@render props.amountBalance({ stacked: true })}
		</Container>

		<Container y={rowY - 14} x={1010} scale={0.82}>
			{@render props.amountBet({ stacked: true })}
		</Container>

		<Container y={rowY} x={1188} scale={0.54}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>

		<Container y={rowY} x={1298} scale={0.54}>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>

		<Container y={rowY - 2} x={1442} scale={0.86}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		<Container y={rowY} x={1588} scale={0.50}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>

		<Container y={rowY} x={1694} scale={0.50}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>
	</Container>
</MainContainer>

{#if stateUi.menuOpen}
	<Rectangle
		eventMode="static"
		cursor="pointer"
		alpha={0.5}
		anchor={0.5}
		backgroundColor={BLACK}
		width={canvas.width}
		height={canvas.height}
		x={canvas.width * 0.5}
		y={canvas.height * 0.5}
		onpointerup={() => (stateUi.menuOpen = false)}
	/>

	<MainContainer standard alignVertical="bottom">
		<Container x={144} y={main.height - DESKTOP_BASE_SIZE - 18}>
			<Container scale={0.72} y={DESKTOP_BASE_SIZE * 0.5 - 138 - 148 * 3}>
				{@render props.buttonPayTable({ anchor: 0.5 })}
			</Container>

			<Container scale={0.72} y={DESKTOP_BASE_SIZE * 0.5 - 138 - 148 * 2}>
				{@render props.buttonGameRules({ anchor: 0.5 })}
			</Container>

			<Container scale={0.72} y={DESKTOP_BASE_SIZE * 0.5 - 138 - 148 * 1}>
				{@render props.buttonSettings({ anchor: 0.5 })}
			</Container>

			<Container scale={0.72} y={DESKTOP_BASE_SIZE * 0.5 - 138}>
				{@render props.buttonSoundSwitch({ anchor: 0.5 })}
			</Container>

			<Container scale={0.72} y={DESKTOP_BASE_SIZE * 0.5}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
