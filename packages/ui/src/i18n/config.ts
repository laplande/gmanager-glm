/**
 * i18n configuration for GManager UI
 *
 * Provides internationalization support using react-i18next.
 * Supports Chinese (zh-CN) and English (en-US) by default.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * Default language
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * Get stored language preference from localStorage
 */
export function getStoredLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  try {
    const stored = localStorage.getItem('gmanager-language');
    if (stored && SUPPORTED_LANGUAGES.some((lang) => lang.code === stored)) {
      return stored as SupportedLanguage;
    }
  } catch {
    // Ignore localStorage errors
  }

  // Try to detect browser language
  const browserLang = navigator.language.split('-')[0];
  if (SUPPORTED_LANGUAGES.some((lang) => lang.code === browserLang)) {
    return browserLang as SupportedLanguage;
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Save language preference to localStorage
 */
export function storeLanguage(language: SupportedLanguage): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('gmanager-language', language);
  } catch {
    // Ignore localStorage errors
  }
}

// Initialize i18next
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
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Change language and persist preference
export function changeLanguage(language: SupportedLanguage): Promise<void> {
  storeLanguage(language);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return i18n.changeLanguage(language) as any;
}

export default i18n;
