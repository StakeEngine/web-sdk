<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
</script>

<Container x={300} alpha={0.5}>
	<Rectangle width={280} height={160} />
	<Text text={'TRANSLATIONS TEST'} style={{ fill: 0xffffff }} />
	<Text text={`${context.i18nDerived.home()} (from game)`} style={{ fill: 0xffffff }} y={30} />
	<Text text={`${context.i18nDerived.settings()} (from ui-pixi)`} style={{ fill: 0xffffff }} y={60} />
	<Text text={`${context.i18nDerived.masterVolume()} (from ui-html)`} style={{ fill: 0xffffff }} y={90} />
	<Text text={`${context.i18nDerived.notTranslated()}`} style={{ fill: 0xffffff }} y={120} />
</Container>
