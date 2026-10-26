/**
 * Active Community Language Configuration for Swar Yoga
 * Active: Hindi, Marathi, and English
 */

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'hindi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'marathi', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'english', name: 'English', nativeName: 'English', flag: '🌐' },
];

/**
 * Determines default language based on country code or telephone dialing code.
 * If user is from India (+91) -> Default to Hindi
 * Otherwise -> Default to English
 */
export function detectDefaultLanguage(countryCodeOrDialCode?: string | null): string {
  if (!countryCodeOrDialCode) return 'hindi';

  const cleaned = countryCodeOrDialCode.trim().toLowerCase();

  if (
    cleaned === 'in' ||
    cleaned === 'ind' ||
    cleaned === 'india' ||
    cleaned === '+91' ||
    cleaned === '91'
  ) {
    return 'hindi';
  }

  return 'english';
}

/**
 * Normalizes input string to supported languages (hindi, marathi, english)
 */
export function normalizeLanguage(lang?: string | null): string {
  if (!lang) return 'hindi';
  const l = lang.trim().toLowerCase();
  if (l === 'mr' || l === 'marathi') return 'marathi';
  if (l === 'en' || l === 'english') return 'english';
  return 'hindi';
}
