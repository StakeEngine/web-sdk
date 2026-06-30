import { DEFAULT_BET_MODE_META, DEFAULT_GAME_RULE_META } from './constants';

export type BetModeData = {
	maxWin?: number;
	mode: string;
	costMultiplier: number;
	type: 'default' | 'activate' | 'buy';
	parent: string;
	children: string;
	assets: {
		icon: string;
		volatility: string;
		button: string;
		dialogImage: string;
		dialogVolatility: string;
	};
	text: {
		bannerText?: string;
		description?: string;
		betAmountLabel?: string;
		title: string;
		dialog: string;
		button: string;
		tickerIdle: string;
		tickerSpin: string;
	};
};

export type BetModeMeta = Record<string, BetModeData>;

export type GameRuleContainer = {
	title: string;
	text: string;
	textImages?: { [key: string]: string };
	image: string;
	row: number;
	column: number;
	imagePosition: 'top' | 'left';
};

export type GameRuleData = {
	containers: GameRuleContainer[];
	rows: number;
	columns: number;
	title: string;
};

export type GameInfoStat = {
	icon: string;
	value: string;
	label: string;
};

/** Label + value pair shown on a feature-buy card (e.g. COST / 20x BET). */
export type GameInfoMetric = { label: string; value: string };

export type GameInfoCard = {
	title: string;
	text: string;
	/** Substring within `text` to render emphasised in gold (e.g. "3 Scatter"). */
	highlight?: string;
	/** Reel illustrations stacked on the right; switches the card to a split (text | reels) layout. */
	images?: string[];
	/** Optional icon shown above the card title. */
	icon?: string;
	/** Title/accent colour theme for feature-buy cards. Defaults to gold. */
	theme?: 'green' | 'purple' | 'gold';
	/** Optional price/value line (e.g. "100x") shown under the title. */
	price?: string;
	/** Optional badge icon (e.g. scatter die) repeated `badgeCount` times. */
	badge?: string;
	badgeCount?: number;
	/** Prominent metric shown mid-card (feature-buy page). */
	metric?: GameInfoMetric;
	/** Footer metric row, 1–2 items (feature-buy page), e.g. COST + RTP. */
	footer?: GameInfoMetric[];
};

export type GameInfoPayout = {
	icon: string;
	name: string;
	/** Premium symbols render as a circular icon + name; lows render the bare letter icon. */
	premium?: boolean;
	x3: string;
	x4: string;
	x5: string;
};

export type GameInfoPage = {
	kind: 'overview' | 'features' | 'cards' | 'paytable' | 'paylines' | 'placeholder';
	/** Decorative forest frame border drawn over the whole page. */
	frame: string;
	/** Inner background image shown inside the frame. */
	background?: string;
	title: string;
	/** Body paragraph (overview pages). Supports `\n` line breaks. */
	body?: string;
	/** Substring within `body` to render emphasised (gold, larger), e.g. the max-win value. */
	highlight?: string;
	/** Intro/footnote text (paytable, paylines pages). */
	note?: string;
	/** Stat plaques row (overview page). */
	stats?: GameInfoStat[];
	/** Cards row (features / cards / paytable specials). */
	cards?: GameInfoCard[];
	/** Symbol payout rows (paytable page). */
	payouts?: GameInfoPayout[];
	/** Column headers for the paytable grid. */
	payoutHead?: { symbol: string; cols: [string, string, string] };
	/** Single illustrative image (paylines page). */
	image?: string;
};

export type GameInfoAssets = {
	navArrowLeft: string;
	navArrowRight: string;
	navButton: string;
	statCard: string;
	featureCard: string;
	specialFrame: string;
};

type GameRuleMeta = {
	gameRules: GameRuleData[];
	payTable: GameRuleData[];
	splashScreen: GameRuleData[];
	infoPages: GameInfoPage[];
	infoAssets: GameInfoAssets;
};

export const stateMeta = $state({
	betModeMeta: DEFAULT_BET_MODE_META as BetModeMeta,
	gameRuleMeta: DEFAULT_GAME_RULE_META as GameRuleMeta,
});

export const stateMetaDerived = {
	betModeMetaList: () => Object.values(stateMeta.betModeMeta),
};
