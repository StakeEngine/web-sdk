<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x050407} zIndex={-3} />
<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x10200f} alpha={0.24} zIndex={-2} />
