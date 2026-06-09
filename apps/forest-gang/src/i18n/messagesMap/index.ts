import { mergeMessagesMaps } from 'utils-shared/i18n';
import { messagesMap as messagesMapUiPixi } from 'components-ui-pixi';
import { messagesMap as messagesMapUiHtml } from 'components-ui-html';
import { locales } from 'config-lingui';

import en from './en';
import zh from './zh';

const messagesMapGame = Object.fromEntries(
	locales.map((locale) => [locale, locale === 'zh' ? { ...en, ...zh } : en]),
);

const messagesMap = mergeMessagesMaps([messagesMapGame, messagesMapUiPixi, messagesMapUiHtml]);

export default messagesMap;
