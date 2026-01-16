/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import '@formatjs/intl-relativetimeformat/polyfill';
import '@formatjs/intl-relativetimeformat/locale-data/en';
import '@formatjs/intl-relativetimeformat/locale-data/de';
import '@formatjs/intl-relativetimeformat/locale-data/es';
import '@formatjs/intl-relativetimeformat/locale-data/fr';
import '@formatjs/intl-relativetimeformat/locale-data/ja';
import '@formatjs/intl-relativetimeformat/locale-data/zh';

import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { toAbsoluteUrl } from '../helpers/AssetHelpers';
import arMessages from '../i18n/messages/ar.json';
import enMessages from '../i18n/messages/en.json';
import frMessages from '../i18n/messages/fr.json';
import zhMessages from '../i18n/messages/zh.json';
import { type TLanguage } from '../i18n/types.d';
import { getData, setData } from '../utils';

const I18N_MESSAGES = {
  en: enMessages,
  ar: arMessages,
  fr: frMessages,
  zh: zhMessages
};

const I18N_CONFIG_KEY = 'i18nConfig';

const I18N_LANGUAGES: readonly TLanguage[] = [
  {
    label: 'English',
    code: 'en',
    direction: 'ltr',
    flag: toAbsoluteUrl('/media/flags/united-states.svg'),
    messages: I18N_MESSAGES.en
  },
  {
    label: 'Arabic (Saudi)',
    code: 'ar',
    direction: 'rtl',
    flag: toAbsoluteUrl('/media/flags/saudi-arabia.svg'),
    messages: I18N_MESSAGES.ar
  },
  {
    label: 'French',
    code: 'fr',
    direction: 'ltr',
    flag: toAbsoluteUrl('/media/flags/france.svg'),
    messages: I18N_MESSAGES.fr
  },
  {
    label: 'Chinese',
    code: 'zh',
    direction: 'ltr',
    flag: toAbsoluteUrl('/media/flags/china.svg'),
    messages: I18N_MESSAGES.zh
  }
];

const I18N_DEFAULT_LANGUAGE: TLanguage = I18N_LANGUAGES[0];

const getInitialLanguage = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');

  if (langParam) {
    const matchedLanguage = I18N_LANGUAGES.find((lang) => lang.code === langParam);
    if (matchedLanguage) {
      setData(I18N_CONFIG_KEY, matchedLanguage);
      return matchedLanguage;
    }
  }

  const storedLanguage = getData(I18N_CONFIG_KEY) as TLanguage | undefined;
  return storedLanguage ?? I18N_DEFAULT_LANGUAGE;
};

const initialProps: ITranslationProviderProps = {
  currentLanguage: getInitialLanguage(),
  changeLanguage: (_: TLanguage) => {},
  isRTL: () => false
};

const TranslationsContext = createContext<ITranslationProviderProps>(initialProps);
const useLanguage = () => useContext(TranslationsContext);

const I18NProvider = ({ children }: PropsWithChildren) => {
  const { currentLanguage } = useLanguage();

  return (
    <IntlProvider
      key={currentLanguage.code} // Ensures IntlProvider re-renders properly
      messages={currentLanguage.messages}
      locale={currentLanguage.code}
      defaultLocale={I18N_DEFAULT_LANGUAGE.code}
    >
      {children}
    </IntlProvider>
  );
};

const TranslationProvider = ({ children }: PropsWithChildren) => {
  const [currentLanguage, setCurrentLanguage] = useState(initialProps.currentLanguage);
  const [languagesLoaded, setLanguagesLoaded] = useState(false);

  useEffect(() => {
    setLanguagesLoaded(true);
  }, []);

  const changeLanguage = (language: TLanguage) => {
    if (!languagesLoaded) {
      console.warn('⚠️ Tried changing language before translations were ready');
      return;
    }
    if(language){
    setData(I18N_CONFIG_KEY, language);
    setCurrentLanguage(language);
    }
  };

  const isRTL = () => currentLanguage.direction === 'rtl';

  useEffect(() => {
    if (languagesLoaded) {
      document.documentElement.setAttribute('dir', currentLanguage.direction);
    }
  }, [currentLanguage, languagesLoaded]);

  if (!languagesLoaded) {
    return <div>Loading translations...</div>;
  }

  return (
    <TranslationsContext.Provider
      value={{
        isRTL,
        currentLanguage,
        changeLanguage
      }}
    >
      <I18NProvider>{children}</I18NProvider>
    </TranslationsContext.Provider>
  );
};

export { TranslationProvider, useLanguage };
