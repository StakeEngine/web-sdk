import {
	authenticateWallet,
	endRoundWallet,
	extractReplayCostMultiplier,
	extractReplayPayoutMultiplier,
	extractReplayState,
	extractPendingRoundState,
	extractPayoutMultiplier,
	extractRoundBetId,
	extractRoundEvents,
	extractWalletSnapshot,
	fetchReplayRound,
	playWallet,
	resolveBetConfigFromAuth
} from './penguinSlideApiService';

export async function runAuthenticateFlow(args: {
	search: string;
	language: string;
	apiMultiplier: number;
	fallbackBetOptions: number[];
	currentBetAmount: number;
	modeFromQuery: string | null | undefined;
}) {
	const response = await authenticateWallet(args.search, args.language);
	const wallet = extractWalletSnapshot(response, args.apiMultiplier);
	const betConfig = resolveBetConfigFromAuth(
		response,
		args.apiMultiplier,
		args.fallbackBetOptions,
		args.currentBetAmount
	);
	const pendingRoundEvents = extractPendingRoundState(response);
	const betId = extractRoundBetId(response);
	const mode = response?.round?.mode
		? String(response.round.mode)
		: args.modeFromQuery
			? String(args.modeFromQuery)
			: null;
	const failed = !response || response?.error;
	const shouldClearError = Boolean(response?.balance?.amount != null || response?.config);
	return { response, wallet, betConfig, pendingRoundEvents, betId, mode, failed, shouldClearError };
}

export async function runPlayFlow(args: {
	search: string;
	mode: string;
	amount: number;
	betSize: number;
	apiMultiplier: number;
}) {
	const response = await playWallet(args.search, {
		mode: args.mode,
		amount: args.amount,
		betSize: args.betSize
	});
	const wallet = extractWalletSnapshot(response, args.apiMultiplier);
	const events = extractRoundEvents(response);
	const payoutMultiplier = extractPayoutMultiplier(response);
	const betId = extractRoundBetId(response);
	const errorMessage = response?.error
		? response?.message
			? String(response.message)
			: 'Play failed.'
		: null;
	return { response, wallet, events, payoutMultiplier, betId, errorMessage };
}

export async function runEndRoundFlow(args: { search: string; apiMultiplier: number }) {
	const response = await endRoundWallet(args.search);
	const wallet = extractWalletSnapshot(response, args.apiMultiplier);
	return { response, wallet };
}

export async function runReplayFlow(args: { search: string }) {
	const response = await fetchReplayRound(args.search);
	if (!response || response?.error) {
		return {
			response,
			events: [] as any[],
			payoutMultiplier: null as number | null,
			costMultiplier: null as number | null,
			errorMessage:
				response?.message != null
					? String(response.message)
					: 'Replay failed to load. Check replay query params and RGS response.'
		};
	}
	const events = extractReplayState(response);
	if (!events.length) {
		return {
			response,
			events,
			payoutMultiplier: extractReplayPayoutMultiplier(response),
			costMultiplier: extractReplayCostMultiplier(response),
			errorMessage: 'Replay returned no round state.'
		};
	}
	return {
		response,
		events,
		payoutMultiplier: extractReplayPayoutMultiplier(response),
		costMultiplier: extractReplayCostMultiplier(response),
		errorMessage: null as string | null
	};
}
