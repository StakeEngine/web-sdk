<script lang="ts">
	import { stateBet, stateUi } from 'state-shared';

	type Props = { onPlay: () => void; onEnd: () => void };
	const props: Props = $props();

	const mode = $derived(stateBet.betToResume?.mode ?? '');
	const modeLabel = $derived(mode === 'SUPER' ? 'All In' : mode === 'BONUS' ? 'Deal It' : 'Bonus');
</script>

<div class="modal-overlay">
	<div class="modal">
		<h2 class="title">Unfinished Round</h2>
		<p class="subtitle">You have an active <strong>{modeLabel}</strong> bonus in progress.</p>
		<div class="buttons">
			<button class="btn btn-play" onclick={props.onPlay}>
				▶ Play Round
			</button>
			<button class="btn btn-end" onclick={props.onEnd}>
				✕ End Round
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}
	.modal {
		background: #0d1a0e;
		border: 2px solid #d4a017;
		border-radius: 16px;
		padding: 2rem 2.5rem;
		text-align: center;
		max-width: 380px;
		width: 90%;
	}
	.title {
		color: #ffd84d;
		font-size: 1.4rem;
		margin: 0 0 0.5rem;
		font-family: serif;
	}
	.subtitle {
		color: #ccc;
		font-size: 0.95rem;
		margin: 0 0 1.5rem;
	}
	.buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}
	.btn {
		padding: 0.65rem 1.4rem;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: bold;
		cursor: pointer;
		border: none;
	}
	.btn-play {
		background: #2e7d32;
		color: #fff;
	}
	.btn-play:hover { background: #388e3c; }
	.btn-end {
		background: #5a1a1a;
		color: #ccc;
	}
	.btn-end:hover { background: #7b2020; }
</style>
