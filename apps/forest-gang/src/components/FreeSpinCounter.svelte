<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { stateI18nDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { GOLD_GRADIENT } from '../game/goldGradient';
	import { anchorToPivot, Container, Sprite, Text, type Sizes } from 'pixi-svelte';

	const context = getContext();
	const t = (key: string) => stateI18nDerived.translate(key);

	// Leaf-corner wooden board (confirm_frame.png is 505×301; wood centre ≈ 0.507).
	const PANEL_RATIO = 505 / 301;
	const WOOD_CENTER_Y = 0.5;
	const panelWidth = $derived(SYMBOL_SIZE * 2.0);
	const panelSizes = $derived({
		width: panelWidth,
		height: panelWidth / PANEL_RATIO,
	});
	const scale = 1;
	const position = $derived({
		// Mirror the scatter card CSS: left: max(18px, calc(50% - 702px))
		x: Math.max(
			18 / context.stateLayoutDerived.mainLayout().scale,
			context.stateLayoutDerived.mainLayout().width / 2 - 702 / context.stateLayoutDerived.mainLayout().scale,
		),
		y:
			context.stateGameDerived.boardLayout().y -
			context.stateGameDerived.boardLayout().height * 0.5 * context.stateGameDerived.boardLayout().boardScale -
			20,
	});

	const titleFont = $derived(SYMBOL_SIZE * 0.14);
	const counterFont = $derived(SYMBOL_SIZE * 0.36);
	const GAP = $derived(SYMBOL_SIZE * 0.12);

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let titleSizes: Sizes = $state({ width: 0, height: 0 });
	let counterSizes: Sizes = $state({ width: 0, height: 0 });

	// Stack the two lines and centre the group on the board's wood centre.
	const groupSizes = $derived({
		width: Math.max(titleSizes.width, counterSizes.width),
		height: titleSizes.height + GAP + counterSizes.height,
	});

	const visible = $derived(show && context.stateGame.bonusMode !== 'feature');

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => {
			show = false;
			current = 0;
		},
		freeSpinCounterHide: () => {
			show = false;
		},
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) {
				current = emitterEvent.current;
				show = true;
			}
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

<MainContainer>
	<FadeContainer show={visible} {...position} {scale}>
		<Sprite key="counterFrame" {...panelSizes} />

		<Container
			x={panelSizes.width * 0.5}
			y={panelSizes.height * WOOD_CENTER_Y}
			pivot={anchorToPivot({ sizes: groupSizes, anchor: { x: 0.5, y: 0.5 } })}
		>
			<!-- FREE SPINS title — Cinzel 700, gold gradient -->
			<Text
				x={groupSizes.width / 2}
				y={0}
				anchor={{ x: 0.5, y: 0 }}
				text={t('FS FREE SPINS')}
				onresize={(sizes) => (titleSizes = sizes)}
				style={{
					fontFamily: 'Cinzel',
					fontWeight: '700',
					fontSize: titleFont,
					fill: GOLD_GRADIENT,
					align: 'center',
					letterSpacing: titleFont * 0.03,
					wordWrap: false,
				}}
			/>

			<!-- current / total counter — Cinzel 700, gold gradient, large -->
			<Text
				x={groupSizes.width / 2}
				y={titleSizes.height + GAP}
				anchor={{ x: 0.5, y: 0 }}
				text={`${current}/${total}`}
				onresize={(sizes) => (counterSizes = sizes)}
				style={{
					fontFamily: 'Cinzel',
					fontWeight: '700',
					fontSize: counterFont,
					fill: GOLD_GRADIENT,
					align: 'center',
					letterSpacing: counterFont * 0.03,
				}}
			/>
		</Container>
	</FadeContainer>
</MainContainer>
