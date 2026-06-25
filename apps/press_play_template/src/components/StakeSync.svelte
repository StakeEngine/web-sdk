<script lang="ts">
	import { stateBet, stateModal, stateUi } from 'state-shared';
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';
	import { templateStakeDerived, templateStakeState } from '../state/templateStake.svelte';
	import { logDiagnostic } from '../utils/diagnostics';

	const context = getContext();
	let lastPendingRoundMode = '';

	$effect(() => {
		if (stateUi.config.mode === 'replay' && stateBet.betToResume && !templateStakeState.replaySnapshot) {
			templateStakeDerived.captureReplaySnapshot(stateBet.betToResume);
		}
	});

	$effect(() => {
		templateStakeState.pendingRoundDetected =
			stateUi.config.mode !== 'replay' && Boolean(stateBet.betToResume?.active);
	});

	$effect(() => {
		if (!templateStakeState.pendingRoundDetected) return;
		const nextMode = String(stateBet.betToResume?.mode || '');
		if (lastPendingRoundMode === nextMode) return;
		lastPendingRoundMode = nextMode;
		logDiagnostic('info', 'pending_round_detected', {
			mode: nextMode,
		});
	});

	$effect(() => {
		templateStakeDerived.syncReplayStatus({ idle: context.stateXstateDerived.isIdle() });
	});

	$effect(() => {
		templateStakeDerived.syncModalError();
	});

	$effect(() => {
		if (templateStakeState.bootStatus === 'booting' && stateModal.modal?.name !== 'error') {
			templateStakeDerived.bootReady();
		}
	});

	onMount(() => {
		const handleAssetError = (event: Event) => {
			const target = event.target as HTMLImageElement | HTMLScriptElement | HTMLLinkElement | null;
			if (!target) return;
			const source =
				'src' in target && target.src
					? target.src
					: 'href' in target && target.href
						? target.href
						: '';
			if (!source) return;
			logDiagnostic('error', 'asset_load_failure', {
				source,
				tagName: target.tagName,
			});
		};

		window.addEventListener('error', handleAssetError, true);

		return () => window.removeEventListener('error', handleAssetError, true);
	});
</script>
