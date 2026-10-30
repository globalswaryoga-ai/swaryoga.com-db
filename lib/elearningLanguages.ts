export interface ElearningLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: 'indian' | 'bridge' | 'global';
  direction?: 'ltr' | 'rtl';
}

/**
 * Official E-Learning & Dubbing Language Roster
 *
 * Requirements:
 * 1. Indian languages: ONLY Hindi, Marathi, Kannada.
 * 2. Bridge language: English.
 * 3. Foreign languages: All major foreign languages across Europe, Americas, Asia, Middle East, Africa.
 * 4. Strictly NO Urdu.
 * 5. Purpose: Master lectures recorded in Hindi / Marathi / Kannada can be dubbed into all world languages.
 */
export const ELEARNING_LANGUAGES: ElearningLanguage[] = [
  // Primary Indian Source Languages (Only Hindi, Marathi, Kannada)
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', region: 'indian', direction: 'ltr' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🚩', region: 'indian', direction: 'ltr' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', region: 'indian', direction: 'ltr' },

  // Global Bridge Language
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'bridge', direction: 'ltr' },

  // Foreign Languages (All Major Global Markets - Americas, Europe, Asia, Middle East, Africa)
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'global', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'global', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'global', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'global', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'global', direction: 'ltr' },
  { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文', flag: '🇨🇳', region: 'global', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'global', direction: 'rtl' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', region: 'global', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'global', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'global', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', region: 'global', direction: 'ltr' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'global', direction: 'ltr' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', region: 'global', direction: 'ltr' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', region: 'global', direction: 'ltr' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', region: 'global', direction: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'global', direction: 'ltr' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', region: 'global', direction: 'ltr' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', region: 'global', direction: 'ltr' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', region: 'global', direction: 'ltr' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', region: 'global', direction: 'ltr' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', region: 'global', direction: 'ltr' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', region: 'global', direction: 'rtl' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', region: 'global', direction: 'ltr' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', region: 'global', direction: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', region: 'global', direction: 'ltr' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', region: 'global', direction: 'ltr' },
  { code: 'fil', name: 'Filipino', nativeName: 'Wikang Filipino', flag: '🇵🇭', region: 'global', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'global', direction: 'ltr' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', region: 'global', direction: 'ltr' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', region: 'global', direction: 'rtl' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', region: 'global', direction: 'ltr' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', region: 'global', direction: 'ltr' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', region: 'global', direction: 'ltr' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', region: 'global', direction: 'ltr' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာဘာသာ', flag: '🇲🇲', region: 'global', direction: 'ltr' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭', region: 'global', direction: 'ltr' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', region: 'global', direction: 'ltr' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', region: 'global', direction: 'ltr' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', region: 'global', direction: 'ltr' },
];

export const ELEARNING_INDIAN_LANGUAGES = ELEARNING_LANGUAGES.filter((l) => l.region === 'indian');
export const ELEARNING_FOREIGN_LANGUAGES = ELEARNING_LANGUAGES.filter((l) => l.region === 'global');

export function getElearningLanguage(code?: string): ElearningLanguage {
  if (!code) return ELEARNING_LANGUAGES[0];
  const found = ELEARNING_LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
  return found || ELEARNING_LANGUAGES[0];
}

