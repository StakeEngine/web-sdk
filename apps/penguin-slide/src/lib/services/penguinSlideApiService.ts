type FetchLike = typeof fetch;

export function getQueryParamFromSearch(search: string, key: string) {
	return new URLSearchParams(search).get(key);
}

export function isReplayModeSearch(search: string) {
	const raw = getQueryParamFromSearch(search, 'replay');
	return raw === 'true' || raw === '1';
}

export function getRgsBaseUrlFromSearch(search: string): string | null {
	const raw = getQueryParamFromSearch(search, 'rgs_url');
	if (!raw) return null;
	const normalized = raw.startsWith('http') ? raw : `https://${raw}`;
	return normalized.replace(/\/+$/, '');
}

export function getReplayRequestParams(search: string) {
	const params = {
		game: getQueryParamFromSearch(search, 'game'),
		version: getQueryParamFromSearch(search, 'version'),
		mode: getQueryParamFromSearch(search, 'mode'),
		event: getQueryParamFromSearch(search, 'event'),
		rgsUrl: getRgsBaseUrlFromSearch(search)
	};
	const missing = Object.entries(params)
		.filter(([, value]) => value == null || String(value).trim() === '')
		.map(([key]) => key);
	return {
		...params,
		missing,
		valid: missing.length === 0
	};
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

export async function getRgsJson(
	search: string,
	endpoint: string,
	fetchImpl: FetchLike = fetch
): Promise<any> {
	const base = getRgsBaseUrlFromSearch(search);
	if (!base) return null;
	const res = await fetchImpl(`${base}${endpoint}`, {
		method: 'GET'
	});
	const text = await res.text();
	let payload: any = null;
	try {
		payload = text ? JSON.parse(text) : null;
	} catch {
		payload = text;
	}
	if (!res.ok) {
		return {
			error: true,
			status: res.status,
			message:
				typeof payload === 'object' && payload?.message
					? String(payload.message)
					: `Request failed (${res.status}).`,
			payload
		};
	}
	return payload;
}

export async function fetchReplayRound(search: string, fetchImpl: FetchLike = fetch) {
	const replayParams = getReplayRequestParams(search);
	if (!replayParams.valid) {
		return {
			error: true,
			message: `Missing replay query params: ${replayParams.missing.join(', ')}.`
		};
	}
	const { game, version, mode, event } = replayParams;
	return await getRgsJson(
		search,
		`/bet/replay/${encodeURIComponent(String(game))}/${encodeURIComponent(
			String(version)
		)}/${encodeURIComponent(String(mode))}/${encodeURIComponent(String(event))}`,
		fetchImpl
	);
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

export function extractRoundBetId(response: any): string | null {
	const candidates = [
		response?.round?.betId,
		response?.round?.betID,
		response?.round?.bet?.id,
		response?.betId,
		response?.betID,
		response?.bet?.id
	];
	for (const candidate of candidates) {
		if (candidate == null) continue;
		const text = String(candidate).trim();
		if (text) return text;
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

export function extractReplayState(response: any): any[] {
	const candidates = [
		response?.state,
		response?.events,
		response?.round?.state,
		response?.round?.events,
		response?.data?.state,
		response?.data?.events,
		response?.state?.events
	];
	for (const candidate of candidates) {
		if (Array.isArray(candidate)) return candidate;
	}
	return [];
}

export function extractReplayPayoutMultiplier(response: any): number | null {
	const raw =
		response?.payoutMultiplier ?? response?.round?.payoutMultiplier ?? response?.data?.payoutMultiplier;
	return typeof raw === 'number' ? raw : null;
}

export function extractReplayCostMultiplier(response: any): number | null {
	const raw =
		response?.costMultiplier ?? response?.round?.costMultiplier ?? response?.data?.costMultiplier;
	return typeof raw === 'number' ? raw : null;
}
