<script lang="ts">
	import { stateBet, stateUi } from 'state-shared';
	import { getContext } from '../game/context';
	import { onMount } from 'svelte';
	import { logForestDiagnostic } from '../utils/forestDiagnostics';
	import BonusResumeModal from './BonusResumeModal.svelte';
	import { stateGame } from '../game/stateGame.svelte';

	const context = getContext();

	let showModal = $state(false);

	const isBonusMode = (mode?: string) => mode === 'SUPER' || mode === 'BONUS';

	const doResume = () => {
		showModal = false;
		if (stateBet.betToResume?.mode) {
			stateBet.activeBetModeKey = stateBet.betToResume.mode;
		}
		logForestDiagnostic('info', 'pending_round_resume', { mode: stateBet.betToResume?.mode });
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	};

	const doEnd = () => {
		showModal = false;
		logForestDiagnostic('info', 'pending_round_ended');
		if (stateBet.betToResume?.mode) {
			stateBet.activeBetModeKey = stateBet.betToResume.mode;
		}
		// Signal onPlayGame to skip animation — xstate still flows to endGame which credits balance
		stateGame.endRoundOnly = true;
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	};

	onMount(() => {
		if (stateUi.config.mode === 'replay') {
			logForestDiagnostic('info', 'replay_waiting_for_start');
			return;
		}
		if (!stateBet.betToResume?.active) return;

		if (isBonusMode(stateBet.betToResume?.mode)) {
			// Show modal so player can choose to replay or end
			showModal = true;
		} else {
			// Non-bonus: auto-resume as before
			doResume();
		}
	});
</script>

{#if showModal}
	<BonusResumeModal onPlay={doResume} onEnd={doEnd} />
{/if}
