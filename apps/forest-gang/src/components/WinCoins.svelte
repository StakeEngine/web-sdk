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
		amount?: number;
		boardMode?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const bs = $derived(context.stateGameDerived.boardLayout().boardScale);
	const extraConfig = $derived(
		props?.levelAlias ? LEVEL_PARTICLE_COIN_MAP[props.levelAlias] : null,
	);
	// Scale particle frequency and max particles based on win amount (normalized by board scale)
	const amountScale = $derived(() => {
		const a = props.amount ?? 0;
		if (a <= 0) return 1;
		if (a < 500) return 1;
		if (a < 2000) return 1.5;
		if (a < 10000) return 2;
		return 3;
	});
	const boardH = $derived(context.stateGameDerived.boardLayout().height * context.stateGameDerived.boardLayout().boardScale * 0.5);

	const config = $derived({
		...baseConfig,
		...extraConfig,
		spawnRect: props.boardMode
			? { x: -(bs * 280), y: -boardH * 0.55, w: bs * 560, h: bs * 20 }
			: { x: -(bs * 300), y: -(bs * 250), w: bs * 600, h: bs * 50 },
		frequency: (extraConfig?.frequency ?? baseConfig.frequency ?? 0.1) / amountScale(),
		maxParticles: Math.round((extraConfig?.maxParticles ?? baseConfig.maxParticles ?? 50) * amountScale()),
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
