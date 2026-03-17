type FetchLike = typeof fetch;

export function getQueryParamFromSearch(search: string, key: string) {
	return new URLSearchParams(search).get(key);
}

export function getRgsBaseUrlFromSearch(search: string): string | null {
	const raw = getQueryParamFromSearch(search, 'rgs_url');
	if (!raw) return null;
	return raw.startsWith('http') ? raw : `https://${raw}`;
}

export async function postRgsJson(
	search: string,
	endpoint: string,
	body: unknown,
	fetchImpl: FetchLike = fetch
): Promise<any> {
	const base = getRgsBaseUrlFromSearch(search);
	if (!base) return null;
	const res = await fetchImpl(`${base}${endpoint}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return await res.json();
}

export async function authenticateWallet(
	search: string,
	language: string,
	fetchImpl: FetchLike = fetch
) {
	return await postRgsJson(
		search,
		'/wallet/authenticate',
		{
			sessionID: getQueryParamFromSearch(search, 'sessionID'),
			language
		},
		fetchImpl
	);
}

export async function playWallet(
	search: string,
	args: { mode: string; amount: number; betSize: number },
	fetchImpl: FetchLike = fetch
) {
	const payload: Record<string, unknown> = {
		mode: args.mode,
		sessionID: getQueryParamFromSearch(search, 'sessionID'),
		amount: args.amount,
		betSize: args.betSize
	};
	const currency = getQueryParamFromSearch(search, 'currency');
	if (currency) payload.currency = currency;
	return await postRgsJson(search, '/wallet/play', payload, fetchImpl);
}

export async function endRoundWallet(search: string, fetchImpl: FetchLike = fetch) {
	return await postRgsJson(
		search,
		'/wallet/end-round',
		{
			sessionID: getQueryParamFromSearch(search, 'sessionID')
		},
		fetchImpl
	);
}

export function extractWalletSnapshot(
	response: any,
	apiMultiplier: number
): { balance: number | null; currency: string | null } {
	const rawBalance = response?.balance?.amount;
	const balance = typeof rawBalance === 'number' ? rawBalance / apiMultiplier : null;
	const rawCurrency = response?.balance?.currency ?? response?.currency;
	const currency = rawCurrency != null ? String(rawCurrency) : null;
	return { balance, currency };
}

export function resolveBetConfigFromAuth(
	response: any,
	apiMultiplier: number,
	fallbackBetOptions: number[],
	currentBetAmount: number
): { betLevels: number[]; betAmount: number; betIndex: number } {
	if (response?.config?.betLevels?.length) {
		const betLevels = response.config.betLevels.map((v: number) => v / apiMultiplier);
		const defaultBet = response.config.defaultBetLevel
			? response.config.defaultBetLevel / apiMultiplier
			: betLevels[0];
		const idx = betLevels.findIndex((v: number) => v === defaultBet);
		return {
			betLevels,
			betAmount: defaultBet,
			betIndex: idx >= 0 ? idx : Math.max(0, betLevels.length - 1)
		};
	}
	const betLevels = [...fallbackBetOptions];
	return {
		betLevels,
		betAmount: currentBetAmount,
		betIndex: Math.max(0, betLevels.findIndex((v) => v === currentBetAmount))
	};
}

export function extractPendingRoundState(response: any): any[] | null {
	const roundState = response?.round?.state ?? response?.round?.events ?? null;
	if (response?.round && Array.isArray(roundState) && roundState.length) {
		return roundState;
	}
	return null;
}

export function extractRoundEvents(response: any): any[] {
	const events = response?.round?.state ?? response?.round?.events ?? [];
	return Array.isArray(events) ? events : [];
}

export function extractPayoutMultiplier(response: any): number | null {
	const raw = response?.round?.payoutMultiplier;
	return typeof raw === 'number' ? raw / 100 : null;
}
