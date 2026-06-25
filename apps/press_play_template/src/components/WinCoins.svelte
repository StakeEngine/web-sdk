<script lang="ts">
	import { Container, ParticleEmitter } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { fountain as baseConfig } from 'constants-shared/particleConfig';
	import { LEVEL_PARTICLE_COIN_MAP } from 'constants-shared/particleCoin';

	import { getContext } from '../game/context';
	import type { WinLevelAlias } from '../game/winLevelMap';

	type Props = {
		emit?: boolean;
		levelAlias?: WinLevelAlias;
		boardMode?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const bs = $derived(context.stateGameDerived.boardLayout().boardScale);
	const extraConfig = $derived(
		props?.levelAlias ? LEVEL_PARTICLE_COIN_MAP[props.levelAlias] : null,
	);
	const boardH = $derived(context.stateGameDerived.boardLayout().height * context.stateGameDerived.boardLayout().boardScale * 0.5);

	const config = $derived({
		...baseConfig,
		...extraConfig,
		spawnRect: props.boardMode
			? { x: -(bs * 280), y: -boardH * 0.55, w: bs * 560, h: bs * 20 }
			: { x: -(bs * 300), y: -(bs * 250), w: bs * 600, h: bs * 50 },
	});
</script>

{#if config}
	<MainContainer>
		<Container
			x={context.stateGameDerived.boardLayout().x}
			y={context.stateGameDerived.boardLayout().y}
		>
			<ParticleEmitter {config} key="coins" emit={props.emit} />
		</Container>
	</MainContainer>
{/if}
