<script lang="ts">
	import type { GameRuleData } from 'state-shared';

	type Props = {
		sections: GameRuleData[];
	};

	const props: Props = $props();
</script>

<div class="rule-sections">
	{#each props.sections as section}
		<section class="rule-section">
			{#if section.title}
				<h2 class="rule-section__title">{section.title}</h2>
			{/if}

			<div
				class="rule-section__grid"
				style={`--rule-columns:${Math.max(1, section.columns)};--rule-rows:${Math.max(1, section.rows)};`}
			>
				{#each section.containers as container}
					<article
						class="rule-card"
						class:rule-card--top={container.imagePosition === 'top'}
						style={`grid-column:${container.column + 1};grid-row:${container.row + 1};`}
					>
						{#if container.image}
							<div class="rule-card__image-wrap">
								<img class="rule-card__image" src={container.image} alt={container.title || section.title} />
							</div>
						{/if}

						<div class="rule-card__copy">
							{#if container.title}
								<h3 class="rule-card__title">{container.title}</h3>
							{/if}
							{#if container.text}
								<p class="rule-card__text">{container.text}</p>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style lang="scss">
	.rule-sections {
		width: min(92vw, 70rem);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 0 0 0.5rem;
		min-height: 0;
	}

	.rule-section {
		width: 100%;
		background: rgba(14, 19, 20, 0.9);
		border: 1px solid rgba(216, 180, 111, 0.45);
		border-radius: 1rem;
		box-shadow: 0 1.2rem 3rem rgba(0, 0, 0, 0.28);
		padding: 1rem;
	}

	.rule-section__title {
		margin: 0 0 0.85rem;
		font-size: 1.2rem;
		line-height: 1.2;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: #f0d89d;
		text-align: left;
	}

	.rule-section__grid {
		display: grid;
		grid-template-columns: repeat(var(--rule-columns), minmax(0, 1fr));
		grid-auto-rows: minmax(min-content, max-content);
		gap: 0.9rem;
	}

	.rule-card {
		display: grid;
		grid-template-columns: minmax(5.5rem, 8rem) minmax(0, 1fr);
		align-items: start;
		gap: 0.85rem;
		padding: 0.85rem;
		border-radius: 0.9rem;
		background: rgba(56, 41, 28, 0.82);
		border: 1px solid rgba(255, 224, 168, 0.12);
		text-align: left;
	}

	.rule-card--top {
		grid-template-columns: 1fr;
	}

	.rule-card__image-wrap {
		width: 100%;
		aspect-ratio: 1 / 1;
		border-radius: 0.75rem;
		background: rgba(0, 0, 0, 0.18);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.rule-card--top .rule-card__image-wrap {
		aspect-ratio: 16 / 8;
	}

	.rule-card__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.rule-card__copy {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		min-width: 0;
	}

	.rule-card__title {
		margin: 0;
		font-size: 1rem;
		line-height: 1.2;
		font-weight: 800;
		color: #fff0c6;
	}

	.rule-card__text {
		margin: 0;
		font-size: 0.92rem;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.94);
		white-space: pre-line;
	}

	@media screen and (max-width: 900px) {
		.rule-sections {
			width: min(94vw, 52rem);
		}

		.rule-section__grid {
			grid-template-columns: 1fr;
		}
	}

	@media screen and (max-width: 640px) {
		.rule-sections {
			width: min(96vw, 36rem);
		}

		.rule-section {
			padding: 0.8rem;
		}

		.rule-card {
			grid-template-columns: 1fr;
		}

		.rule-card__image-wrap {
			aspect-ratio: 16 / 9;
		}

		.rule-card__title {
			font-size: 0.95rem;
		}

		.rule-card__text {
			font-size: 0.86rem;
		}
	}
</style>
