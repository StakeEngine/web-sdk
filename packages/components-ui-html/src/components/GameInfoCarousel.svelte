<script lang="ts">
	import type { GameInfoPage } from 'state-shared';

	type Props = {
		pages: GameInfoPage[];
		/** Shared chrome artwork reused across every page. */
		assets: {
			navArrowLeft: string;
			navArrowRight: string;
			navButton: string;
			/** Wooden plaque behind each overview stat. */
			statCard: string;
			/** Tall plaque behind each feature card. */
			featureCard: string;
			/** Leaf-decorated card frame behind the paytable WILD/SCATTER cards. */
			specialFrame: string;
		};
		/** When provided, renders a themed circular close button (top-right). */
		onClose?: () => void;
	};

	const props: Props = $props();

	let index = $state(0);

	const count = $derived(props.pages.length);
	const page = $derived(props.pages[index]);

	const go = (dir: number) => {
		index = Math.min(Math.max(index + dir, 0), count - 1);
	};

	/** Split `body` into plain/highlighted runs around every occurrence of `hl`. */
	const highlightParts = (body: string, hl?: string) => {
		if (!hl) return [{ text: body, hl: false }];
		const parts: { text: string; hl: boolean }[] = [];
		let i = 0;
		let idx = body.indexOf(hl, i);
		while (idx !== -1) {
			if (idx > i) parts.push({ text: body.slice(i, idx), hl: false });
			parts.push({ text: hl, hl: true });
			i = idx + hl.length;
			idx = body.indexOf(hl, i);
		}
		if (i < body.length) parts.push({ text: body.slice(i), hl: false });
		return parts;
	};
</script>

{#if page}
	<div class="info-stage" style={`--frame:url('${page.frame}');`}>
		{#if page.background}
			<div class="info-bg" style={`background-image:url('${page.background}');`}></div>
		{/if}
		<div class="info-frame"></div>

		{#if props.onClose}
			<button
				class="info-close"
				style={`background-image:url('${props.assets.navButton}');`}
				onclick={props.onClose}
				aria-label="Close"
			>
				<span class="info-close__x gold">✕</span>
			</button>
		{/if}

		<div class="info-content">
			{#if page.kind === 'overview'}
				<div class="overview">
					<div class="overview__copy">
						<h2 class="info-title gold">{page.title}</h2>
						{#if page.body}
							<p class="overview__body">{#each highlightParts(page.body, page.highlight) as part}{#if part.hl}<span
										class="overview__hl gold">{part.text}</span>{:else}{part.text}{/if}{/each}</p>
						{/if}
					</div>

					{#if page.stats?.length}
						<div class="stats">
							{#each page.stats as stat}
								<div class="stat" style={`background-image:url('${props.assets.statCard}');`}>
									<img class="stat__icon" src={stat.icon} alt="" />
									<div class="stat__text">
										<span class="stat__value gold">{stat.value}</span>
										<span class="stat__label gold">{stat.label}</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if page.kind === 'features' || page.kind === 'cards'}
				<div class="features">
					<h2 class="info-title info-title--center gold">{page.title}</h2>
					<div class="cards" class:cards--center={page.kind === 'cards'}>
						{#each page.cards ?? [] as card}
							<article class="card" class:card--split={card.images?.length} class:card--buy={card.metric || card.footer}>
								{#if card.images?.length}
									<div class="card__main">
										<h3 class="card__title card__title--left gold">{card.title}</h3>
										<p class="card__text card__text--left">{#each highlightParts(card.text, card.highlight) as p}{#if p.hl}<span
													class="gold">{p.text}</span>{:else}{p.text}{/if}{/each}</p>
									</div>
									<div class="card__reels">
										{#each card.images as img}
											<img class="card__reel" src={img} alt="" />
										{/each}
									</div>
								{:else if card.metric || card.footer}
									<h3
										class="card__title buy__title"
										class:gold={!card.theme || card.theme === 'gold'}
										class:buy__title--green={card.theme === 'green'}
										class:buy__title--purple={card.theme === 'purple'}
									>{card.title}</h3>
									<p class="card__text card__text--center buy__desc">{card.text}</p>
									<div class="buy__art">
										{#if card.icon}<img src={card.icon} alt="" />{/if}
									</div>
									{#if card.metric}
										<div class="buy__metric">
											<span
												class="buy__label"
												class:gold={!card.theme || card.theme === 'gold'}
												class:buy__label--green={card.theme === 'green'}
												class:buy__label--purple={card.theme === 'purple'}
											>{card.metric.label}</span>
											<span class="buy__value">{card.metric.value}</span>
										</div>
									{/if}
									{#if card.footer?.length}
										<div class="buy__footer">
											{#each card.footer as f}
												<div class="buy__fcell">
													<span
														class="buy__label"
														class:gold={!card.theme || card.theme === 'gold'}
														class:buy__label--green={card.theme === 'green'}
														class:buy__label--purple={card.theme === 'purple'}
													>{f.label}</span>
													<span class="buy__value buy__value--sm">{f.value}</span>
												</div>
											{/each}
										</div>
									{/if}
								{:else}
									<header class="card__head">
										{#if card.icon}
											<img class="card__icon" src={card.icon} alt="" />
										{/if}
										<h3 class="card__title gold">{card.title}</h3>
										{#if card.badge && card.badgeCount}
											<div class="card__badges">
												{#each Array(card.badgeCount) as _}
													<img class="card__badge" src={card.badge} alt="" />
												{/each}
											</div>
										{/if}
										{#if card.price}
											<span class="card__price gold">{card.price}</span>
										{/if}
									</header>
									<p class="card__text card__text--center">{#each highlightParts(card.text, card.highlight) as p}{#if p.hl}<span
												class="gold">{p.text}</span>{:else}{p.text}{/if}{/each}</p>
								{/if}
							</article>
						{/each}
					</div>
				</div>
			{:else if page.kind === 'paytable'}
				<div class="paytable">
					<h2 class="info-title info-title--center gold">{page.title}</h2>
					<div class="paytable__grid">
						<div class="paytable__table">
							<div class="pay-row pay-row--head">
								<span class="gold pay-row__symhead">{page.payoutHead?.symbol ?? ''}</span>
								<span class="gold">{page.payoutHead?.cols?.[0] ?? '3'}</span>
								<span class="gold">{page.payoutHead?.cols?.[1] ?? '4'}</span>
								<span class="gold">{page.payoutHead?.cols?.[2] ?? '5'}</span>
							</div>
							{#each page.payouts ?? [] as row}
								<div class="pay-row">
									<span class="pay-row__sym">
										<img class:pay-row__icon--round={row.premium} src={row.icon} alt={row.name} />
										{#if row.premium}<span class="pay-row__name">{row.name}</span>{/if}
									</span>
									<span>{row.x3}</span>
									<span>{row.x4}</span>
									<span>{row.x5}</span>
								</div>
							{/each}
						</div>
						<div class="paytable__specials">
							{#each page.cards ?? [] as card}
								<article class="special" style={`background-image:url('${props.assets.specialFrame}');`}>
									{#if card.icon}
										<img class="special__icon" src={card.icon} alt="" />
									{/if}
									<h3 class="special__title gold">{card.title}</h3>
									<p class="special__text">{card.text}</p>
								</article>
							{/each}
						</div>
					</div>
				</div>
			{:else if page.kind === 'paylines'}
				<div class="paylines">
					<h2 class="info-title info-title--center gold">{page.title}</h2>
					{#if page.note}
						<p class="paylines__note">{page.note}</p>
					{/if}
					{#if page.image}
						<div class="paylines__img"><img src={page.image} alt={page.title} /></div>
					{/if}
				</div>
			{:else}
				<div class="placeholder">
					<h2 class="info-title info-title--center gold">{page.title}</h2>
					<p class="placeholder__hint">{page.body ?? 'Coming soon'}</p>
				</div>
			{/if}
		</div>

		<nav class="info-nav">
			<div class="info-nav__buttons">
				<button
					class="nav-btn nav-btn--prev"
					style={`background-image:url('${props.assets.navButton}');`}
					disabled={index === 0}
					onclick={() => go(-1)}
					aria-label="Previous page"
				>
					<img src={props.assets.navArrowLeft} alt="" />
				</button>
				<button
					class="nav-btn"
					style={`background-image:url('${props.assets.navButton}');`}
					disabled={index === count - 1}
					onclick={() => go(1)}
					aria-label="Next page"
				>
					<img src={props.assets.navArrowRight} alt="" />
				</button>
			</div>
			<span class="info-nav__page gold">Page {index + 1}/{count}</span>
		</nav>
	</div>
{/if}

<style lang="scss">
	/* Aspect matches the frame artwork (1400x934 ≈ 3:2) so the wooden border isn't stretched wide,
	   the background isn't cropped under the branches, and the nav fits inside the frame. */
	.info-stage {
		position: relative;
		width: min(97vw, calc((100dvh - 1.5rem) * 1.5));
		aspect-ratio: 1400 / 934;
		container-type: inline-size;
		font-family: 'Cinzel', 'EB Garamond', serif;
	}

	/* Background fills the frame OPENING (inset to where the wooden rails sit, so it stays inside
	   the frame and doesn't spill over the border). The opening is slightly wider-aspect than the
	   art, so `cover` overflows vertically — anchored to the top, it crops the lower foliage rather
	   than the animals' heads, keeping the gang fully visible inside the frame. */
	.info-bg {
		position: absolute;
		inset: 8% 6% 13% 6%;
		border-radius: 1cqw;
		background-size: cover;
		background-position: center top;
	}

	.info-frame {
		position: absolute;
		inset: 0;
		background-image: var(--frame);
		background-size: 100% 100%;
		background-repeat: no-repeat;
		pointer-events: none;
	}

	.info-close {
		position: absolute;
		top: 1.4%;
		right: -2.4%;
		width: 5cqw;
		height: 5cqw;
		border: none;
		padding: 0;
		background-color: transparent;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
		transition: transform 0.12s ease;
	}

	.info-close:hover {
		transform: scale(1.06);
	}

	.info-close__x {
		font-family: 'Cinzel', serif;
		font-weight: 900;
		font-size: 2.2cqw;
		line-height: 1;
	}

	.info-content {
		position: absolute;
		inset: 13% 9% 24% 11%;
		display: flex;
		min-height: 0;
	}

	/* ---- shared text ---- */
	.gold {
		background-image: linear-gradient(180deg, #ffa90e 15%, #ee960b 70%, #d18005 93%);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	.info-title {
		margin: 0;
		font-weight: 900;
		letter-spacing: 0.03em;
		font-size: 3.3cqw;
		line-height: 1.1;
		text-transform: uppercase;
	}

	.info-title--center {
		text-align: center;
		width: 100%;
	}

	/* ---- overview ---- */
	.overview {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 100%;
		gap: 2cqw;
	}

	.overview__copy {
		max-width: 46%;
		display: flex;
		flex-direction: column;
		gap: 1.4cqw;
	}

	.overview__body {
		margin: 0;
		color: #ffd89c;
		font-family: 'Poppins', sans-serif;
		font-size: 1.25cqw;
		font-weight: 500;
		line-height: 1.5;
		white-space: pre-line;
	}

	.overview__hl {
		font-family: 'Cinzel', serif;
		font-weight: 700;
		font-size: 1.9cqw;
	}

	.stats {
		display: flex;
		gap: 1.2cqw;
		width: 100%;
		justify-content: space-between;
	}

	.stat {
		position: relative;
		flex: 0 0 15cqw;
		aspect-ratio: 196 / 122;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.9cqw;
		padding: 0 1cqw;
		background-size: 100% 100%;
		background-repeat: no-repeat;
	}

	.stat__icon {
		width: 4cqw;
		height: 4cqw;
		object-fit: contain;
		flex: none;
	}

	.stat__text {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
	}

	.stat__value {
		font-weight: 900;
		font-size: 1.7cqw;
		white-space: nowrap;
	}

	.stat__label {
		font-weight: 700;
		font-size: 0.95cqw;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	/* ---- features ---- */
	.features {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: 1.6cqw;
	}

	.cards {
		display: flex;
		gap: 1.8cqw;
		justify-content: center;
		flex: 1;
		min-height: 0;
	}

	.card {
		position: relative;
		flex: 1 1 0;
		max-width: 27cqw;
		display: flex;
		flex-direction: column;
		gap: 1cqw;
		padding: 2cqw 1.8cqw;
		border: 0.16cqw solid rgba(214, 167, 74, 0.55);
		border-radius: 0.7cqw;
		box-shadow: inset 0 0 3cqw rgba(0, 0, 0, 0.3);
	}

	.cards--center .card {
		justify-content: center;
	}

	.card__head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8cqw;
	}

	.card__title {
		margin: 0;
		font-weight: 700;
		font-size: 1.7cqw;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.card__badges {
		display: flex;
		gap: 0.4cqw;
	}

	.card__badge {
		width: 2.4cqw;
		height: 2.4cqw;
		object-fit: contain;
	}

	.card__text {
		margin: 0;
		color: #f3e4c4;
		font-family: 'Poppins', sans-serif;
		font-size: 1.15cqw;
		line-height: 1.35;
		white-space: pre-line;
	}

	.card__icon {
		width: 4cqw;
		height: 4cqw;
		object-fit: contain;
	}

	/* Card 1: split layout — title + text on the left, reel images stacked on the right. */
	.card--split {
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 1.4cqw;
	}

	.card__main {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		gap: 1cqw;
		min-width: 0;
	}

	.card__reels {
		flex: 0 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1cqw;
	}

	.card__reel {
		width: 4.5cqw;
		height: auto;
		object-fit: contain;
	}

	.card__title--left {
		text-align: left;
	}

	.card__text--center {
		text-align: center;
	}

	.card__text--left {
		text-align: left;
	}

	.card__price {
		font-weight: 900;
		font-size: 1.9cqw;
		line-height: 1;
	}

	/* ---- feature buy cards ---- */
	.card--buy,
	.cards--center .card--buy {
		justify-content: flex-start;
		align-items: center;
		gap: 0.9cqw;
		padding: 2cqw 1.2cqw 1.6cqw;
		text-align: center;
	}

	.buy__title {
		font-size: 1.45cqw;
		min-height: 3.4cqw;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.buy__title--green,
	.buy__label--green {
		background-image: linear-gradient(180deg, #cdee82 10%, #8fbd45 90%);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	.buy__title--purple,
	.buy__label--purple {
		background-image: linear-gradient(180deg, #cdaef2 10%, #9166cf 90%);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	/* Fixed-height title + description zones so the icon, metric and footer rows line up
	   horizontally across all four cards regardless of how many lines each description wraps to. */
	.buy__desc {
		font-size: 1cqw;
		line-height: 1.35;
		min-height: 4.3cqw;
	}

	.buy__art {
		height: 7cqw;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	.buy__art img {
		max-width: 100%;
		max-height: 6.5cqw;
		object-fit: contain;
	}

	.buy__metric {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2cqw;
	}

	.buy__label {
		font-weight: 700;
		font-size: 1cqw;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.buy__value {
		font-family: 'Poppins', sans-serif;
		font-weight: 700;
		color: #f6ecd4;
		font-size: 1.2cqw;
		line-height: 1;
	}

	.buy__value--sm {
		font-size: 1.05cqw;
	}

	.buy__footer {
		margin-top: auto;
		display: flex;
		gap: 1.6cqw;
		justify-content: center;
		width: 100%;
	}

	.buy__fcell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2cqw;
	}

	/* ---- paytable ---- */
	.paytable {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: 1.4cqw;
	}

	.paytable__grid {
		display: grid;
		grid-template-columns: 1.4fr 0.92fr;
		gap: 2.5cqw;
		flex: 1;
		min-height: 0;
		padding-right: 1.5cqw;
	}

	.paytable__table {
		display: flex;
		flex-direction: column;
		font-family: 'Poppins', sans-serif;
		border: 0.16cqw solid rgba(214, 167, 74, 0.5);
		border-radius: 0.7cqw;
		overflow: hidden;
	}

	.pay-row {
		display: grid;
		grid-template-columns: 2.4fr 1fr 1fr 1fr;
		align-items: center;
		flex: 1 1 0;
		min-height: 0;
		color: #f3e4c4;
		font-size: 1.05cqw;
		font-weight: 600;
		border-bottom: 1px solid rgba(255, 216, 156, 0.16);
	}

	.pay-row:last-child {
		border-bottom: none;
	}

	.pay-row > span {
		padding: 0.28cqw 0.7cqw;
		text-align: center;
		border-left: 1px solid rgba(255, 216, 156, 0.16);
	}

	.pay-row__sym,
	.pay-row__symhead {
		border-left: none !important;
		text-align: left !important;
	}

	.pay-row--head {
		font-weight: 900;
		font-size: 0.9cqw;
		letter-spacing: 0.03em;
		border-bottom: 1px solid rgba(255, 216, 156, 0.35);
	}

	.pay-row__sym {
		display: flex;
		align-items: center;
		gap: 0.8cqw;
	}

	.pay-row__sym img {
		width: 2.2cqw;
		height: 2.2cqw;
		object-fit: contain;
		flex: none;
	}

	.pay-row__icon--round {
		object-fit: cover;
		border-radius: 50%;
		border: 0.12cqw solid rgba(214, 167, 74, 0.65);
	}

	.pay-row__name {
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.paytable__specials {
		display: flex;
		flex-direction: column;
		gap: 2.5cqw;
		min-height: 0;
	}

	.special {
		position: relative;
		flex: 1 1 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: 0.7cqw;
		padding: 5.5cqw 3cqw 2cqw;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		text-align: center;
	}

	/* Coin straddles the top border of the card, like the design. */
	.special__icon {
		position: absolute;
		top: -2.6cqw;
		left: 50%;
		transform: translateX(-50%);
		width: 6.5cqw;
		height: 6.5cqw;
		object-fit: contain;
	}

	.special__title {
		margin: 0;
		font-weight: 700;
		font-size: 1.5cqw;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.special__text {
		margin: 0;
		color: #f3e4c4;
		font-family: 'Poppins', sans-serif;
		font-size: 1.05cqw;
		line-height: 1.3;
	}

	/* ---- paylines ---- */
	.paylines {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		gap: 1cqw;
		min-height: 0;
	}

	.paylines__note {
		margin: 0;
		max-width: 80%;
		text-align: center;
		color: #ffd89c;
		font-family: 'Poppins', sans-serif;
		font-size: 1.2cqw;
		line-height: 1.35;
	}

	.paylines__img {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.paylines__img img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	/* ---- placeholder ---- */
	.placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.4cqw;
		width: 100%;
	}

	.placeholder__hint {
		margin: 0;
		color: #ffd89c;
		font-family: 'Poppins', sans-serif;
		font-size: 1.5cqw;
		opacity: 0.8;
	}

	/* ---- nav ---- */
	.info-nav {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 14.5%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.info-nav__buttons {
		display: flex;
		gap: 0.5cqw;
	}

	.info-nav__page {
		position: absolute;
		right: 9%;
		font-weight: 700;
		font-size: 1.25cqw;
		letter-spacing: 0.05em;
		text-align: center;
	}

	.nav-btn {
		width: 5.5cqw;
		height: 5.5cqw;
		border: none;
		background-color: transparent;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: transform 0.12s ease, opacity 0.12s ease;
	}

	.nav-btn img {
		width: 42%;
		height: 42%;
		object-fit: contain;
	}

	.nav-btn--prev img {
		transform: scaleX(-1);
	}

	.nav-btn:not(:disabled):hover {
		transform: scale(1.06);
	}

	.nav-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}
</style>
