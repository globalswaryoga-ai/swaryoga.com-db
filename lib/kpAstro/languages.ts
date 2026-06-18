// Single source of truth for the language codes KP Astro reports/predictions
// can be generated in. The AI generation step (Gemini/Anthropic/OpenAI) can
// write fluent text in any of these without extra setup — only the PDF
// export step needs a matching embedded font per script (see exportPdf.ts;
// scripts without a bundled font fall back to the Devanagari font, which
// covers Hindi/Marathi/Sanskrit-derived text but will show gaps for other
// scripts until their Noto font file is added to public/fonts/).
export interface KpLanguage {
  code: string;
  label: string;
  script: 'devanagari' | 'latin' | 'gujarati' | 'bengali' | 'tamil' | 'telugu' | 'kannada' | 'malayalam' | 'gurmukhi' | 'odia' | 'urdu';
}

export const KP_LANGUAGES: KpLanguage[] = [
  { code: 'hi', label: 'Hindi', script: 'devanagari' },
  { code: 'en', label: 'English', script: 'latin' },
  { code: 'mr', label: 'Marathi', script: 'devanagari' },
  { code: 'gu', label: 'Gujarati', script: 'gujarati' },
  { code: 'bn', label: 'Bengali', script: 'bengali' },
  { code: 'ta', label: 'Tamil', script: 'tamil' },
  { code: 'te', label: 'Telugu', script: 'telugu' },
  { code: 'kn', label: 'Kannada', script: 'kannada' },
  { code: 'ml', label: 'Malayalam', script: 'malayalam' },
  { code: 'pa', label: 'Punjabi', script: 'gurmukhi' },
  { code: 'or', label: 'Odia', script: 'odia' },
  { code: 'as', label: 'Assamese', script: 'bengali' },
  { code: 'ur', label: 'Urdu', script: 'urdu' },
];

export const KP_LANGUAGE_CODES = KP_LANGUAGES.map((l) => l.code);
export const KP_LANGUAGE_NAMES: Record<string, string> = Object.fromEntries(KP_LANGUAGES.map((l) => [l.code, l.label]));

export function isKpLanguageCode(value: unknown): value is string {
  return typeof value === 'string' && KP_LANGUAGE_CODES.includes(value);
}

// Client-safe (no fs/pdfkit import) check for whether a language's script
// has a bundled PDF font today — only Devanagari (Hindi/Marathi) and Latin
// (English) do; see exportPdf.ts for the server-side font-path mapping.
export function languageHasFullFontSupportClient(languageCode: string): boolean {
  const lang = KP_LANGUAGES.find((l) => l.code === languageCode);
  return !!lang && (lang.script === 'devanagari' || lang.script === 'latin');
}
