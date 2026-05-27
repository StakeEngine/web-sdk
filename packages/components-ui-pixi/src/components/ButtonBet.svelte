<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBetDerived } from 'state-shared';

	import UiSprite from './UiSprite.svelte';
	import ButtonBetProvider from './ButtonBetProvider.svelte';
	import { UI_BASE_FONT_SIZE } from '../constants';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const disabled = $derived(!stateBetDerived.isBetCostAvailable());
	const sizes = { width: 180, height: 180 };
</script>

<ButtonBetProvider>
	{#snippet children({ key, onpress })}
		<OnHotkey hotkey="Space" {disabled} {onpress} />
		<Button {...props} {sizes} {onpress} {disabled}>
			{#snippet children({ center })}
				<Container {...center}>
					<UiSprite
						key="bet"
						width={sizes.width}
						height={sizes.height}
						anchor={0.5}
						{...disabled || ['spin_disabled', 'stop_disabled'].includes(key)
							? {
									backgroundColor: 0x545f40,
									borderColor: 0x8b8f75,
								}
							: {}}
					/>
					<Text
						anchor={0.5}
						text={['spin_default', 'spin_disabled'].includes(key) ? '↻' : 'STOP'}
						style={{
							align: 'center',
							fontFamily: 'proxima-nova',
							fontWeight: '800',
							fontSize: ['spin_default', 'spin_disabled'].includes(key)
								? UI_BASE_FONT_SIZE * 1.8
								: UI_BASE_FONT_SIZE * 0.8,
							fill: 0xf3f5e6,
						}}
					/>
				</Container>
			{/snippet}
		</Button>
	{/snippet}
</ButtonBetProvider>
