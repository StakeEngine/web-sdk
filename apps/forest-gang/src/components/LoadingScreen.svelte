<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { FadeContainer, LoadingProgress } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();
	let loadingType = $state<'start' | 'ready'>('start');

	// Cover-scale the background: maintain 16:9 aspect ratio, crop rather than stretch
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
		<!-- Full-screen splash background (cover: maintains aspect, crops edges) -->
		<Sprite
			key="splash"
			anchor={{ x: 0.5, y: 0.5 }}
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height * 0.5}
			width={splashW}
			height={splashH}
		/>
		<!-- Progress bar centred at the bottom third -->
		<Container x={context.stateLayoutDerived.mainLayout().width * 0.5} y={context.stateLayoutDerived.mainLayout().height * 0.5}>
			{#if !context.stateApp.loaded}
				<LoadingProgress y={210} width={1967 * 0.2} height={346 * 0.2}>
					{#snippet background(sizes)}
						<Sprite key="progressBarBackground.png" {...sizes} />
					{/snippet}
					{#snippet progress(sizes)}
						<Sprite key="progressBar.png" {...sizes} />
					{/snippet}
					{#snippet frame(sizes)}
						<Sprite key="progressBarFrame.png" {...sizes} />
					{/snippet}
				</LoadingProgress>
			{/if}
		</Container>
	</MainContainer>
</FadeContainer>

<FadeContainer show={context.stateApp.loaded && loadingType === 'start'}>
	<PressToContinue onpress={() => { loadingType = 'ready'; props.onloaded(); }} />
</FadeContainer>
