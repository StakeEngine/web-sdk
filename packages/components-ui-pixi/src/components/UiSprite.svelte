<script lang="ts" module>
	import { Rectangle, type RectangleProps } from 'pixi-svelte';

	export type Props = RectangleProps & {
		key?: string;
	};
</script>

<script lang="ts">
	const props: Props = $props();

	const toneMap = {
		buyBonus: { backgroundColor: 0x547f12, borderColor: 0xb8d537, borderRadius: 24, borderWidth: 6 },
		bet: { backgroundColor: 0x406f12, borderColor: 0xcfa63d, borderRadius: 999, borderWidth: 8 },
		base_ticker: { backgroundColor: 0x0f120d, borderColor: 0x6f5622, borderRadius: 26, borderWidth: 3 },
		menu: { backgroundColor: 0x0a0b09, borderColor: 0x705622, borderRadius: 999, borderWidth: 4 },
		soundOn: { backgroundColor: 0x0a0b09, borderColor: 0x705622, borderRadius: 999, borderWidth: 4 },
		soundOff: { backgroundColor: 0x0a0b09, borderColor: 0x705622, borderRadius: 999, borderWidth: 4 },
		turbo: { backgroundColor: 0x0a0b09, borderColor: 0x705622, borderRadius: 999, borderWidth: 4 },
		autoSpin: { backgroundColor: 0x0a0b09, borderColor: 0x705622, borderRadius: 999, borderWidth: 4 },
		increase: { backgroundColor: 0x0a0b09, borderColor: 0x705622, borderRadius: 999, borderWidth: 4 },
		decrease: { backgroundColor: 0x0a0b09, borderColor: 0x705622, borderRadius: 999, borderWidth: 4 },
	} as const;

	const theme = $derived(props.key ? toneMap[props.key as keyof typeof toneMap] : undefined);
</script>

<Rectangle
	borderRadius={props.borderRadius ?? theme?.borderRadius ?? 22}
	backgroundColor={props.backgroundColor ?? theme?.backgroundColor ?? 0x0b0d0a}
	borderColor={props.borderColor ?? theme?.borderColor ?? 0x5d4720}
	borderWidth={props.borderWidth ?? theme?.borderWidth ?? 3}
	{...props}
/>
