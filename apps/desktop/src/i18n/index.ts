/**
 * i18n configuration for GManager Desktop App
 *
 * Extends the UI package i18n configuration with app-specific translations.
 */

import { changeLanguage as uiChangeLanguage, getStoredLanguage, storeLanguage, type SupportedLanguage } from '@gmanager/ui';
import { useTranslation as useTranslationBase } from 'react-i18next';

/**
 * Re-export types and utilities from UI package
 */
export type { SupportedLanguage };
export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@gmanager/ui';

/**
 * Change language and persist preference
 */
export function changeLanguage(language: SupportedLanguage): Promise<void> {
  storeLanguage(language);
  return uiChangeLanguage(language);
}

/**
 * Custom hook for using translations with type safety
 */
export function useTranslation() {
  const { t, i18n } = useTranslationBase();

  return {
    t,
    i18n,
    changeLanguage,
    currentLanguage: i18n.language as SupportedLanguage,
  };
}

/**
 * Initialize i18n with stored language preference
 */
export function initI18n(): SupportedLanguage {
  return getStoredLanguage();
}
