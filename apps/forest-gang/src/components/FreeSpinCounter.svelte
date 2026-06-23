<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { anchorToPivot, BitmapText, Container, Sprite, type Sizes } from 'pixi-svelte';

	const context = getContext();
	const PANEL_KEY_DESKTOP = 'symbolPad';
	const PANEL_RATIO_DESKTOP = 624 / 420;
	const panelKey = PANEL_KEY_DESKTOP;
	const panelWidth = $derived(SYMBOL_SIZE * 2 * 0.8);
	const panelSizes = $derived({
		width: panelWidth,
		height: panelWidth / PANEL_RATIO_DESKTOP,
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
			context.stateGameDerived.boardLayout().height * 0.5 * context.stateGameDerived.boardLayout().boardScale +
			80,
	});

	const fontSize = SYMBOL_SIZE * 0.275;

	let show = $state(false);
	let hasCurrent = $state(false);
	let current = $state(0);
	let total = $state(0);
	let titleSizes: Sizes = $state({ width: 0, height: 0 });
	let counterSizes: Sizes = $state({ width: 0, height: 0 });

	const textContainerSizes = $derived({
		width: titleSizes.width,
		height: titleSizes.height + counterSizes.height,
	});
	const counterPosition = $derived({ x: titleSizes.width / 2, y: titleSizes.height });
	const visible = $derived(show && context.stateGame.bonusMode !== 'feature');

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => {
			show = false;
			hasCurrent = false;
			current = 0;
		},
		freeSpinCounterHide: () => {
			show = false;
			hasCurrent = false;
		},
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) {
				current = emitterEvent.current;
				hasCurrent = true;
				show = true;
			}
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

<MainContainer>
	<FadeContainer show={visible} {...position} {scale}>
		<Sprite key={panelKey} {...panelSizes} />
		<Container
			x={panelSizes.width * 0.5}
			y={panelSizes.height * 0.44}
			pivot={anchorToPivot({
				sizes: textContainerSizes,
				anchor: { x: 0.5, y: 0.5 },
			})}
		>
			<BitmapText
				text={context.stateGame.bonusMode === 'superspin' ? 'ALL IN' : 'DEAL IT'}
				style={{
					fontFamily: 'gold',
					fontSize: fontSize * 1.1,
					wordWrap: false,
				}}
				onresize={(sizes) => (titleSizes = sizes)}
			/>
			<BitmapText
				text={`${current} OF ${total}`}
				{...counterPosition}
				anchor={{ x: 0.5, y: 0 }}
				style={{
					fontFamily: 'gold',
					fontSize: fontSize * 1.08,
				}}
				onresize={(sizes) => (counterSizes = sizes)}
			/>
		</Container>
	</FadeContainer>
</MainContainer>
