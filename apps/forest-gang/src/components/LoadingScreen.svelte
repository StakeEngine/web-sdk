<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
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
</script>

<FadeContainer show={loadingType === 'start'}>
	<MainContainer>
		<Container x={context.stateLayoutDerived.mainLayout().width * 0.5} y={context.stateLayoutDerived.mainLayout().height * 0.5}>
			<Sprite anchor={{ x: 0.5, y: 0.5 }} key="visualV2" y={-80} width={520} height={320} alpha={0.45} />
			<Text anchor={{ x: 0.5, y: 0.5 }} y={-220} text="FOREST GANG" style={{ fill: 0xf7e7a1, fontFamily: 'Arial', fontSize: 56, fontWeight: '700' }} />
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
