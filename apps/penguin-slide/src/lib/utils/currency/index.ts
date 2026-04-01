export type SupportedCurrency =
	| 'USD'
	| 'CAD'
	| 'JPY'
	| 'EUR'
	| 'RUB'
	| 'CNY'
	| 'PHP'
	| 'INR'
	| 'IDR'
	| 'KRW'
	| 'BRL'
	| 'MXN'
	| 'DKK'
	| 'PLN'
	| 'VND'
	| 'TRY'
	| 'CLP'
	| 'ARS'
	| 'PEN'
	| 'XGC'
	| 'XSC';

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
	'USD',
	'CAD',
	'JPY',
	'EUR',
	'RUB',
	'CNY',
	'PHP',
	'INR',
	'IDR',
	'KRW',
	'BRL',
	'MXN',
	'DKK',
	'PLN',
	'VND',
	'TRY',
	'CLP',
	'ARS',
	'PEN',
	'XGC',
	'XSC'
];

const CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES);
const SOCIAL_CURRENCY_SYMBOL: Record<'XGC' | 'XSC', string> = {
	XGC: 'G',
	XSC: 'SC'
};

export function normalizeCurrency(raw: unknown): SupportedCurrency {
	const code = String(raw ?? '').trim().toUpperCase();
	return CURRENCY_SET.has(code) ? (code as SupportedCurrency) : 'USD';
}

export function formatCurrencyAmountForCurrency(
	currency: SupportedCurrency,
	amount: number,
	fractionDigits = 2
) {
	const value = Number.isFinite(amount) ? amount : 0;
	if (currency === 'XGC' || currency === 'XSC') {
		const sign = value < 0 ? '-' : '';
		const abs = Math.abs(value);
		return `${sign}${SOCIAL_CURRENCY_SYMBOL[currency]}${abs.toFixed(fractionDigits)}`;
	}
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			currencyDisplay: 'symbol',
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits
		}).format(value);
	} catch {
		return `${value.toFixed(fractionDigits)} ${currency}`;
	}
}
