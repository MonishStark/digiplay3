import { toAbsoluteUrl } from '../utils';
import arMessages from './messages/ar.json';
import enMessages from './messages/en.json';
import frMessages from './messages/fr.json';
import zhMessages from './messages/zh.json';
import hiMessages from './messages/hi.json';
import { type TLanguage } from './types.d';

const SUPPORTED_LANGUAGES = import.meta.env.VITE_SUPPORTED_LANGUAGES
  ? import.meta.env.VITE_SUPPORTED_LANGUAGES.replace(/[^\w,]/g, '').split(',')
  : [];

const I18N_MESSAGES = {
  en: enMessages,
  ar: arMessages,
  fr: frMessages,
  zh: zhMessages,
  hi: hiMessages
};

const I18N_CONFIG_KEY = 'i18nConfig';

const I18N_LANGUAGES: TLanguage[] = SUPPORTED_LANGUAGES.map(langCode => {
  switch (langCode) {
    case 'en':
      return {
        label: 'English',
        code: 'en',
        direction: 'ltr',
        flag: toAbsoluteUrl('/media/flags/united-states.svg'),
        messages: I18N_MESSAGES.en
      };
    case 'ar':
      return {
        label: 'Arabic (Saudi)',
        code: 'ar',
        direction: 'rtl',
        flag: toAbsoluteUrl('/media/flags/saudi-arabia.svg'),
        messages: I18N_MESSAGES.ar
      };
    case 'fr':
      return {
        label: 'French',
        code: 'fr',
        direction: 'ltr',
        flag: toAbsoluteUrl('/media/flags/france.svg'),
        messages: I18N_MESSAGES.fr
      };
    case 'zh':
      return {
        label: 'Chinese',
        code: 'zh',
        direction: 'ltr',
        flag: toAbsoluteUrl('/media/flags/china.svg'),
        messages: I18N_MESSAGES.zh
      };
      case 'hi':
      return {
        label: 'Hindi',
        code: 'hi',
        direction: 'ltr',
        flag: toAbsoluteUrl('/media/flags/india.svg'),
        messages: I18N_MESSAGES.hi
      };
    default:
      return null;
  }
}).filter(lang => lang !== null) as TLanguage[];

const I18N_DEFAULT_LANGUAGE: TLanguage = I18N_LANGUAGES[0] || {
  label: 'English',
  code: 'en',
  direction: 'ltr',
  flag: toAbsoluteUrl('/media/flags/united-states.svg'),
  messages: I18N_MESSAGES.en
};


export { I18N_CONFIG_KEY, I18N_DEFAULT_LANGUAGE, I18N_LANGUAGES, I18N_MESSAGES };
