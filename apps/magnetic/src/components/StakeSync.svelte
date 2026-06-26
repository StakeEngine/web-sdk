<script lang="ts">
	import { stateBet, stateModal, stateUi } from 'state-shared';
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';
	import { magneticStakeDerived, magneticStakeState } from '../state/magneticStake.svelte';
	import { logMagneticDiagnostic } from '../utils/magneticDiagnostics';

	const context = getContext();
	let lastPendingRoundMode = '';

	$effect(() => {
		if (stateUi.config.mode === 'replay' && stateBet.betToResume && !magneticStakeState.replaySnapshot) {
			magneticStakeDerived.captureReplaySnapshot(stateBet.betToResume);
		}
	});

	$effect(() => {
		magneticStakeState.pendingRoundDetected =
			stateUi.config.mode !== 'replay' && Boolean(stateBet.betToResume?.active);
	});

	$effect(() => {
		if (!magneticStakeState.pendingRoundDetected) return;
		const nextMode = String(stateBet.betToResume?.mode || '');
		if (lastPendingRoundMode === nextMode) return;
		lastPendingRoundMode = nextMode;
		logMagneticDiagnostic('info', 'pending_round_detected', {
			mode: nextMode,
		});
	});

	$effect(() => {
		magneticStakeDerived.syncReplayStatus({ idle: context.stateXstateDerived.isIdle() });
	});

	$effect(() => {
		magneticStakeDerived.syncModalError();
	});

	$effect(() => {
		if (magneticStakeState.bootStatus === 'booting' && stateModal.modal?.name !== 'error') {
			magneticStakeDerived.bootReady();
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
			logMagneticDiagnostic('error', 'asset_load_failure', {
				source,
				tagName: target.tagName,
			});
		};

		window.addEventListener('error', handleAssetError, true);

		return () => window.removeEventListener('error', handleAssetError, true);
	});
</script>
