<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';

	import UiSprite from './UiSprite.svelte';
	import type { ButtonIcon } from '../types';
	import type { Snippet } from 'svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { UI_BASE_FONT_SIZE } from '../constants';

	type Props = Omit<ButtonProps, 'children'> & {
		icon: ButtonIcon;
		sizes: { width: number; height: number };
		active?: boolean;
		children?: Snippet;
		variant?: 'dark' | 'light';
	};

	const {
		icon,
		active,
		variant = 'dark',
		children: childrenFromParent,
		...buttonProps
	}: Props = $props();

	const textFill = $derived(variant === 'dark' ? 0xf0efe6 : 0x0b0d0a);
	const textMap: Partial<Record<ButtonIcon, string>> = {
		menu: '☰',
		soundOn: '🔊',
		soundOff: '🔇',
		turbo: '⚡',
		autoSpin: 'AUTO',
		increase: '+',
		decrease: '−',
	};
	const fontSizeMap: Partial<Record<ButtonIcon, number>> = {
		menu: UI_BASE_FONT_SIZE * 1.15,
		soundOn: UI_BASE_FONT_SIZE * 1.0,
		soundOff: UI_BASE_FONT_SIZE * 1.0,
		turbo: UI_BASE_FONT_SIZE * 1.0,
		autoSpin: UI_BASE_FONT_SIZE * 0.52,
		increase: UI_BASE_FONT_SIZE * 1.2,
		decrease: UI_BASE_FONT_SIZE * 1.2,
	};
</script>

<Button {...buttonProps}>
	{#snippet children({ center, hovered, pressed })}
		<UiSprite
			key={icon}
			{...center}
			anchor={0.5}
			width={buttonProps.sizes.width}
			height={buttonProps.sizes.height}
			backgroundColor={variant === 'dark' ? 0x0a0b09 : 0xf1edcf}
			{...buttonProps.disabled
				? {
						backgroundColor: 0x4f5248,
						alpha: 0.8,
					}
				: {}}
			{...hovered && !buttonProps.disabled
				? {
						scale: { x: 1.02, y: 1.02 },
					}
				: {}}
			{...pressed && !buttonProps.disabled
				? {
						alpha: 0.92,
					}
				: {}}
			{...active
				? {
						borderWidth: 6,
						borderColor: variant === 'dark' ? 0xb8d537 : 0x2d4510,
					}
				: {}}
		/>

		<Text
			{...center}
			anchor={0.5}
			text={textMap[icon] ?? i18nDerived[icon]()}
			style={{
				align: 'center',
				wordWrap: true,
				wordWrapWidth: 200,
				fontFamily: 'proxima-nova',
				fontWeight: '700',
				fontSize: fontSizeMap[icon] ?? UI_BASE_FONT_SIZE * 0.82,
				fill: textFill,
			}}
		/>

		{@render childrenFromParent?.()}
	{/snippet}
</Button>
