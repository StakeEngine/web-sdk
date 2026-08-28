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

type GameRuleMeta = {
	gameRules: GameRuleData[];
	payTable: GameRuleData[];
	splashScreen: GameRuleData[];
};

export const stateMeta = $state({
	betModeMeta: DEFAULT_BET_MODE_META as BetModeMeta,
	gameRuleMeta: DEFAULT_GAME_RULE_META as GameRuleMeta,
});

export const stateMetaDerived = {
	betModeMetaList: () => Object.values(stateMeta.betModeMeta),
};

/**
 * Reconcile `betModeMeta` against the bet modes the RGS reports at authentication.
 *
 * `betModeMeta` defaults to a placeholder table that does not describe any
 * particular game. Modes it lists that the RGS does not know are rejected with
 * ERR_VAL "invalid amount" when played, and a costMultiplier that disagrees with
 * the published math is wrong in the UI before it is ever sent.
 *
 * Server-reported modes win on identity and cost; presentation a game has already
 * set (assets, copy, type) is kept for the modes that survive.
 */
export const reconcileBetModeMeta = (
	gameModes: { mode: string; costMultiplier: number }[],
): BetModeMeta => {
	const reconciled: BetModeMeta = {};

	gameModes.forEach(({ mode, costMultiplier }) => {
		const key = mode.toUpperCase();
		const existing = stateMeta.betModeMeta[key] ?? stateMeta.betModeMeta[mode.toLowerCase()];

		reconciled[key] = {
			...(existing ?? DEFAULT_BET_MODE_META.BASE),
			mode: key,
			costMultiplier,
			// only infer when the game has not described this mode itself
			type: existing?.type ?? (costMultiplier === 1 ? 'default' : 'buy'),
		} as BetModeData;
	});

	return reconciled;
};
