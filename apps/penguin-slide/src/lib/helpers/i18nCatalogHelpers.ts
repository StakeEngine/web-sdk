export const SUPPORTED_LANGUAGES = [
	'ar',
	'de',
	'en',
	'es',
	'fi',
	'fr',
	'hi',
	'id',
	'ja',
	'ko',
	'pl',
	'pt',
	'ru',
	'tr',
	'vi',
	'zh'
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type I18nCatalog = {
	supportedLanguages?: string[];
	defaultLanguage?: string;
	en?: Record<string, string>;
	messages?: Record<string, Record<string, string>>;
};

export function createLanguageSet(seed: readonly string[] = SUPPORTED_LANGUAGES) {
	return new Set<string>(seed);
}

export function normalizeLanguage(raw: string | null | undefined, languageSet: Set<string>): SupportedLanguage {
	const base = String(raw ?? '')
		.trim()
		.toLowerCase()
		.split('-')[0] ?? '';
	return languageSet.has(base) ? (base as SupportedLanguage) : 'en';
}

export async function loadI18nCatalog(
	i18nPath: string,
	languageSet: Set<string>
): Promise<{ en: Record<string, string>; messages: Record<string, Record<string, string>> } | null> {
	try {
		const res = await fetch(i18nPath, { cache: 'no-cache' });
		if (!res.ok) return null;
		const catalog = (await res.json()) as I18nCatalog;
		if (Array.isArray(catalog.supportedLanguages)) {
			languageSet.clear();
			for (const lang of catalog.supportedLanguages) languageSet.add(String(lang));
		}
		return {
			en: catalog.en && typeof catalog.en === 'object' ? catalog.en : {},
			messages: catalog.messages && typeof catalog.messages === 'object' ? catalog.messages : {}
		};
	} catch {
		return {
			en: {},
			messages: {}
		};
	}
}
