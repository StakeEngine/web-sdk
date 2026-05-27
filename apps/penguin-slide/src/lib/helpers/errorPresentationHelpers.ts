export const FatalErrorCodes = {
	NO_INTERNET_CONNECTION: 'ERR_NET',
	INSUFFICIENT_FUNDS: 'ERR_IPB'
} as const;

export type ErrorPresentation = {
	titleKey: string;
	descKey: string;
};

function extractErrorMessage(response: any): string {
	const candidates = [
		response?.message,
		response?.error?.message,
		response?.payload?.message,
		response?.details?.message
	];
	for (const candidate of candidates) {
		if (candidate == null) continue;
		const text = String(candidate).trim();
		if (text) return text;
	}
	return '';
}

export function extractFatalErrorCode(response: any): string | null {
	const candidates = [
		response?.code,
		response?.errorCode,
		typeof response?.error === 'string' ? response.error : null,
		response?.error?.code,
		response?.payload?.code,
		response?.payload?.errorCode,
		typeof response?.payload?.error === 'string' ? response.payload.error : null,
		response?.payload?.error?.code,
		response?.details?.code,
		response?.data?.code
	];
	for (const candidate of candidates) {
		if (candidate == null) continue;
		const text = String(candidate).trim();
		if (text) return text;
	}
	return null;
}

export function resolveErrorPresentation(response: any): ErrorPresentation {
	const fatalCode = extractFatalErrorCode(response);
	const message = extractErrorMessage(response).toLowerCase();
	switch (fatalCode) {
		case FatalErrorCodes.INSUFFICIENT_FUNDS:
			return {
				titleKey: 'insufficient_funds_title',
				descKey: 'insufficient_funds_desc'
			};
		case FatalErrorCodes.NO_INTERNET_CONNECTION:
			return {
				titleKey: 'general_error_title',
				descKey: 'no_internet_desc'
			};
		default:
			if (message.includes('insufficient')) {
				return {
					titleKey: 'insufficient_funds_title',
					descKey: 'insufficient_funds_desc'
				};
			}
			if (
				message.includes('internet') ||
				message.includes('network') ||
				message.includes('failed to fetch') ||
				message.includes('disconnected')
			) {
				return {
					titleKey: 'general_error_title',
					descKey: 'no_internet_desc'
				};
			}
			return {
				titleKey: 'general_error_title',
				descKey: 'general_error_desc'
			};
	}
}
