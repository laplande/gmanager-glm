/**
 * i18n configuration for GManager Desktop App
 *
 * Initializes i18next with translations for the desktop application.
 * This extends the UI package's i18n configuration.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, getStoredLanguage, type SupportedLanguage } from '@gmanager/ui';
import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';

// Initialize i18next with desktop-specific translations
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      zh: { translation: zhTranslations },
    },
    lng: getStoredLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Export for use in the app
export default i18n;
export type { SupportedLanguage };
export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getStoredLanguage };
