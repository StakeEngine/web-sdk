<script lang="ts">
	import type { Snippet } from 'svelte';

	import ModalError from './ModalError.svelte';
	import ModalBetMenu from './ModalBetMenu.svelte';
	import ModalBuyBonus from './ModalBuyBonus.svelte';
	import ModalBuyBonusConfirm from './ModalBuyBonusConfirm.svelte';
	import ModalAutoSpin from './ModalAutoSpin.svelte';
	import ModalAutoSpinMessage from './ModalAutoSpinMessage.svelte';
	// import ModalForceResult from './ModalForceResult.svelte';
	import ModalPayTable from './ModalPayTable.svelte';
	import ModalGameRules from './ModalGameRules.svelte';
	import ModalSettings from './ModalSettings.svelte';

	type Props = {
		version: Snippet;
	};

	const props: Props = $props();
</script>

<ModalError />
<ModalBetMenu />
<ModalBuyBonus />
<ModalBuyBonusConfirm />
<ModalAutoSpin />
<ModalAutoSpinMessage />
<!-- <ModalForceResult /> -->
<ModalPayTable>
	{@render props.version()}
</ModalPayTable>
<ModalGameRules>
	{@render props.version()}
</ModalGameRules>
<ModalSettings />
