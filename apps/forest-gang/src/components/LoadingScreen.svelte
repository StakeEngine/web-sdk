<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';

	type Props = { onloaded: () => void };
	const props: Props = $props();
	const context = getContext();
	let loadingType = $state<'start' | 'ready'>('start');

	const MIN_LOADER_MS = 1500;
	let minTimeElapsed = $state(false);
	onMount(() => { setTimeout(() => { minTimeElapsed = true; }, MIN_LOADER_MS); });

	const canProceed = $derived(context.stateApp.loaded && minTimeElapsed);

	let leafProgress = $state(0);
	let bobY = $state(0);
	onMount(() => {
		const startTime = performance.now();
		let id: number;
		const tick = () => {
			const elapsed = performance.now() - startTime;
			// Drive the leaf with real asset loading progress; cap at 95 until fully loaded.
			const realProg = context.stateApp.loadingProgress;
			const maxProg = context.stateApp.loaded ? 100 : Math.min(95, realProg);
			leafProgress = maxProg;
			bobY = Math.sin(elapsed * 0.002) * 6;
			id = requestAnimationFrame(tick);
		};
		id = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(id);
	});

	// Bar design units. Source sprites are 492×87 (bg) and 100×111 (listo.png leaf).
	const BAR_W = 1967 * 0.2;   // 393.4
	const BAR_H = 346  * 0.2;   // 69.2
	const LEAF_H = BAR_H * 1.1;                   // ~76px — slight overhang above/below bar
	const LEAF_W = LEAF_H * (100 / 111);          // maintain atlas aspect ratio ≈ 93px

	// Leaf slides from bar left edge (progress=0) to bar right edge (progress=100).
	const leafX = $derived(LEAF_W / 2 + (BAR_W - LEAF_W) * (leafProgress / 100));

	// Cover-scale splash to 16:9.
	const SPLASH_ASPECT = 16 / 9;
	const splashW = $derived(
		context.stateLayoutDerived.mainLayout().width / context.stateLayoutDerived.mainLayout().height >= SPLASH_ASPECT
			? context.stateLayoutDerived.mainLayout().width
			: context.stateLayoutDerived.mainLayout().height * SPLASH_ASPECT
	);
	const splashH = $derived(
		context.stateLayoutDerived.mainLayout().width / context.stateLayoutDerived.mainLayout().height >= SPLASH_ASPECT
			? context.stateLayoutDerived.mainLayout().width / SPLASH_ASPECT
			: context.stateLayoutDerived.mainLayout().height
	);
</script>

<FadeContainer show={loadingType === 'start'}>
	<MainContainer>
		<Sprite
			key="splash"
			anchor={{ x: 0.5, y: 0.5 }}
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height * 0.5}
			width={splashW}
			height={splashH}
		/>

		{#if !canProceed}
			<Container
				x={context.stateLayoutDerived.mainLayout().width * 0.5}
				y={context.stateLayoutDerived.mainLayout().height - 220}
			>
				<Container pivot={{ x: BAR_W / 2, y: 0 }}>
					<!-- Game-art dark wood bar with leaf corners (hud_frame resized) -->
					<Sprite key="progressBarBackground.png" width={BAR_W} height={BAR_H} />
					<!-- Leaf cursor bobs and slides left→right as assets load -->
					<Sprite
						key="progressBarLeaf.png"
						width={LEAF_W}
						height={LEAF_H}
						anchor={{ x: 0.5, y: 0.5 }}
						x={leafX}
						y={BAR_H / 2 + bobY}
					/>
				</Container>
			</Container>
		{/if}
	</MainContainer>
</FadeContainer>

<FadeContainer show={canProceed && loadingType === 'start'}>
	<PressToContinue onpress={() => { loadingType = 'ready'; props.onloaded(); }} />
</FadeContainer>
