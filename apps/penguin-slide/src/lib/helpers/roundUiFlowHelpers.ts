type WalletLike = {
	balance?: number | null;
	currency?: string | null;
};

type AuthFlowLike = {
	wallet: WalletLike;
	mode?: string | null;
	betConfig: {
		betLevels: number[];
		betAmount: number;
		betIndex: number;
	};
	pendingRoundEvents?: any[] | null;
	shouldClearError?: boolean;
	failed?: boolean;
};

export function maxWinLabelForMode(mode: string, explicitMaxWin?: string) {
	if (explicitMaxWin) return explicitMaxWin;
	switch (mode) {
		case 'BASE_EXTREME':
			return '10,000x';
		case 'BASE_VERY_HARD':
			return '5,000x';
		default:
			return '1,000x';
	}
}

export function resolveAuthenticateOutcome(authFlow: AuthFlowLike) {
	if (authFlow.pendingRoundEvents) {
		return {
			action: 'pending' as const,
			errorMessage: '',
			pendingRoundEvents: authFlow.pendingRoundEvents
		};
	}
	if (authFlow.shouldClearError) {
		return {
			action: 'clear_error' as const,
			errorMessage: '',
			pendingRoundEvents: null
		};
	}
	if (authFlow.failed) {
		return {
			action: 'failed' as const,
			errorMessage: 'Authenticate failed. Check sessionID/rgs_url.',
			pendingRoundEvents: null
		};
	}
	return {
		action: 'ok' as const,
		errorMessage: '',
		pendingRoundEvents: null
	};
}

type PlayFlowArgs = {
	search: string;
	mode: string;
	amount: number;
	betSize: number;
	apiMultiplier: number;
};

type PlayFlowResult = {
	response: any;
	events: any[];
	errorMessage: string | null;
	wallet: WalletLike;
	payoutMultiplier?: number | null;
};

export async function preparePlayRound(args: {
	forceTestRound: boolean;
	forcedTestRoundState: any[];
	hasRgsBaseUrl: boolean;
	selectedMode: string;
	stakeAmount: number;
	betAmount: number;
	apiMultiplier: number;
	search: string;
	buildSimulatedLossEvents: (stakeAmount: number) => any[];
	runPlayFlow: (args: PlayFlowArgs) => Promise<PlayFlowResult>;
}) {
	if (args.forceTestRound) {
		return {
			kind: 'events' as const,
			response: {
				simulated: true,
				round: { state: args.forcedTestRoundState }
			},
			events: args.forcedTestRoundState,
			wallet: null as WalletLike | null,
			payoutMultiplier: null as number | null,
			shouldTriggerEndRoundNow: true
		};
	}

	if (!args.hasRgsBaseUrl) {
		return {
			kind: 'events' as const,
			response: { simulated: true },
			events: args.buildSimulatedLossEvents(args.stakeAmount),
			wallet: null as WalletLike | null,
			payoutMultiplier: null as number | null,
			shouldTriggerEndRoundNow: true
		};
	}

	const playFlow = await args.runPlayFlow({
		search: args.search,
		mode: String(args.selectedMode).toUpperCase(),
		amount: Math.round(args.stakeAmount * args.apiMultiplier),
		betSize: Math.round(args.betAmount * args.apiMultiplier),
		apiMultiplier: args.apiMultiplier
	});

	if (playFlow.errorMessage) {
		return {
			kind: 'error' as const,
			errorMessage: playFlow.errorMessage,
			response: playFlow.response,
			wallet: playFlow.wallet
		};
	}

	if (!playFlow.events.length) {
		return {
			kind: 'error' as const,
			errorMessage: 'Play returned no round events.',
			response: playFlow.response,
			wallet: playFlow.wallet
		};
	}

	return {
		kind: 'events' as const,
		response: playFlow.response,
		events: playFlow.events,
		wallet: playFlow.wallet,
		payoutMultiplier: playFlow.payoutMultiplier ?? null,
		shouldTriggerEndRoundNow: false
	};
}
