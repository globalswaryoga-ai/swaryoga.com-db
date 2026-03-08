import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/admin/translate
 * Professional Hindi-to-Multilingual Translation with Grammar Adaptation
 * Uses OpenAI GPT-4 for high-quality, culturally-adapted translations
 */

// Language configurations with cultural/grammatical notes
const LANGUAGE_CONFIG: Record<string, {
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  script: string;
  grammarNotes: string;
}> = {
  en: {
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'Subject-Verb-Object order. Use natural, conversational English. Adapt Hindi idioms to equivalent English expressions.',
  },
  hi: {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    script: 'Devanagari',
    grammarNotes: 'Subject-Object-Verb order. Use respectful forms (आप) for formal context.',
  },
  mr: {
    name: 'Marathi',
    nativeName: 'मराठी',
    direction: 'ltr',
    script: 'Devanagari',
    grammarNotes: 'Similar to Hindi SOV order. Use Marathi-specific vocabulary and expressions. तुम्ही for respectful form.',
  },
  ne: {
    name: 'Nepali',
    nativeName: 'नेपाली',
    direction: 'ltr',
    script: 'Devanagari',
    grammarNotes: 'SOV order like Hindi. Use तपाईं for respectful form. Many shared vocabulary with Hindi but distinct expressions.',
  },
  bn: {
    name: 'Bengali',
    nativeName: 'বাংলা',
    direction: 'ltr',
    script: 'Bengali',
    grammarNotes: 'SOV order. Use আপনি for formal/respectful. Rich literary tradition - maintain elegance.',
  },
  ta: {
    name: 'Tamil',
    nativeName: 'தமிழ்',
    direction: 'ltr',
    script: 'Tamil',
    grammarNotes: 'SOV order. Agglutinative language. Use நீங்கள் for respectful form. Avoid Sanskrit-derived words when Tamil equivalents exist.',
  },
  te: {
    name: 'Telugu',
    nativeName: 'తెలుగు',
    direction: 'ltr',
    script: 'Telugu',
    grammarNotes: 'SOV order. Use మీరు for respectful. Rich in compound words and honorifics.',
  },
  gu: {
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    direction: 'ltr',
    script: 'Gujarati',
    grammarNotes: 'SOV order similar to Hindi. Use તમે for respectful form. Business-friendly tone.',
  },
  pa: {
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    direction: 'ltr',
    script: 'Gurmukhi',
    grammarNotes: 'SOV order. Use ਤੁਸੀਂ for respectful. Warm, direct communication style.',
  },
  kn: {
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    direction: 'ltr',
    script: 'Kannada',
    grammarNotes: 'SOV order. Use ನೀವು for respectful form. Dravidian language with distinct grammar.',
  },
  ml: {
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    direction: 'ltr',
    script: 'Malayalam',
    grammarNotes: 'SOV order. Use നിങ്ങൾ for respectful. Complex morphology.',
  },
  or: {
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    direction: 'ltr',
    script: 'Odia',
    grammarNotes: 'SOV order. Use ଆପଣ for respectful form.',
  },
  as: {
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    direction: 'ltr',
    script: 'Assamese',
    grammarNotes: 'SOV order. Use আপুনি for respectful. Eastern Indo-Aryan language.',
  },
  ur: {
    name: 'Urdu',
    nativeName: 'اردو',
    direction: 'rtl',
    script: 'Nastaliq',
    grammarNotes: 'SOV order like Hindi but RTL script. Use آپ for respectful. Prefer Persian/Arabic-origin words over Sanskrit.',
  },
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    script: 'Arabic',
    grammarNotes: 'VSO order typically. Use حضرتك/أنتم for respectful. Root-based morphology. Modern Standard Arabic preferred.',
  },
  zh: {
    name: 'Mandarin Chinese',
    nativeName: '中文',
    direction: 'ltr',
    script: 'Simplified Chinese',
    grammarNotes: 'SVO order. No verb conjugation. Use 您 (nín) for respectful. Topic-prominent language.',
  },
  ja: {
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    script: 'Japanese (Kanji/Hiragana/Katakana)',
    grammarNotes: 'SOV order. Use です/ます forms for politeness. Honorific system is crucial.',
  },
  ko: {
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    script: 'Hangul',
    grammarNotes: 'SOV order. Use 합니다 endings for formal. Honorifics are essential.',
  },
  es: {
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'SVO order. Use usted for formal. Gender agreement. Latin American vs Spain variations - use neutral.',
  },
  pt: {
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'SVO order. Use você/o senhor for formal. Brazilian Portuguese preferred for broader reach.',
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'SVO order. Use vous for formal. Gender agreement. Elegant phrasing appreciated.',
  },
  de: {
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'V2 word order with SOV in subordinate clauses. Use Sie for formal. Case system matters.',
  },
  ru: {
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    script: 'Cyrillic',
    grammarNotes: 'Flexible word order (typically SVO). Use вы for formal. Case system with 6 cases.',
  },
  it: {
    name: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'SVO order. Use Lei for formal. Expressive and melodic phrasing.',
  },
  tr: {
    name: 'Turkish',
    nativeName: 'Türkçe',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'SOV order. Agglutinative. Use siz for formal. Vowel harmony rules.',
  },
  nl: {
    name: 'Dutch',
    nativeName: 'Nederlands',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'V2 word order. Use u for formal.',
  },
  sv: {
    name: 'Swedish',
    nativeName: 'Svenska',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'V2 word order. Ni for formal (though du is acceptable).',
  },
  th: {
    name: 'Thai',
    nativeName: 'ไทย',
    direction: 'ltr',
    script: 'Thai',
    grammarNotes: 'SVO order. No spaces between words. Politeness particles ครับ/ค่ะ at sentence end.',
  },
  id: {
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'SVO order. No verb conjugation. Anda for formal. Relatively simple grammar.',
  },
  vi: {
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    direction: 'ltr',
    script: 'Latin with diacritics',
    grammarNotes: 'SVO order. Tonal language. Classifiers required. Bạn/Anh/Chị for addressing.',
  },
  ms: {
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'SVO order. Similar to Indonesian. Anda for formal.',
  },
  pl: {
    name: 'Polish',
    nativeName: 'Polski',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'Flexible SVO order. 7 grammatical cases. Pan/Pani for formal.',
  },
  uk: {
    name: 'Ukrainian',
    nativeName: 'Українська',
    direction: 'ltr',
    script: 'Cyrillic',
    grammarNotes: 'Flexible SVO order. Ви for formal.',
  },
  fa: {
    name: 'Persian (Farsi)',
    nativeName: 'فارسی',
    direction: 'rtl',
    script: 'Persian',
    grammarNotes: 'SOV order. شما for formal. Poetic tradition influences phrasing.',
  },
  he: {
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    script: 'Hebrew',
    grammarNotes: 'SVO order. Root-based morphology. אתה/את for informal, you forms vary by gender.',
  },
  sw: {
    name: 'Swahili',
    nativeName: 'Kiswahili',
    direction: 'ltr',
    script: 'Latin',
    grammarNotes: 'SVO order. Noun class system (18 classes). Bantu language.',
  },
};

// Translation style options
type TranslationStyle = 'formal' | 'casual' | 'literary' | 'technical' | 'conversational' | 'poetic';

interface TranslationRequest {
  sourceText: string;
  sourceLang: string;
  targetLangs: string[];
  style: TranslationStyle;
  context?: string; // Additional context about the content
  preserveFormatting?: boolean;
  includeTransliteration?: boolean;
}

interface TranslationResult {
  language: string;
  languageName: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  translation: string;
  transliteration?: string;
  grammarNotes?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body: TranslationRequest = await req.json();
    const {
      sourceText,
      sourceLang = 'hi',
      targetLangs,
      style = 'formal',
      context = '',
      preserveFormatting = true,
      includeTransliteration = false,
    } = body;

    if (!sourceText || !targetLangs || targetLangs.length === 0) {
      return NextResponse.json(
        { error: 'sourceText and targetLangs are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const sourceConfig = LANGUAGE_CONFIG[sourceLang] || LANGUAGE_CONFIG.hi;
    
    // Style instructions
    const styleInstructions: Record<TranslationStyle, string> = {
      formal: 'Use formal, respectful language suitable for official communications. Use honorifics and polite forms.',
      casual: 'Use friendly, informal language suitable for everyday conversation. Keep it natural and warm.',
      literary: 'Use elegant, literary language with rich vocabulary. Maintain poetic quality where appropriate.',
      technical: 'Use precise, technical language. Maintain terminology accuracy. Be clear and unambiguous.',
      conversational: 'Use natural spoken language. Include common expressions and colloquialisms.',
      poetic: 'Preserve poetic elements like rhythm, metaphors, and imagery. Prioritize beauty of expression.',
    };

    const results: TranslationResult[] = [];

    // Process each target language
    for (const targetLang of targetLangs) {
      const targetConfig = LANGUAGE_CONFIG[targetLang];
      if (!targetConfig) {
        results.push({
          language: targetLang,
          languageName: targetLang,
          nativeName: targetLang,
          direction: 'ltr',
          translation: `[Unsupported language: ${targetLang}]`,
        });
        continue;
      }

      // Build the translation prompt
      const systemPrompt = `You are an expert multilingual translator specializing in ${sourceConfig.name} to ${targetConfig.name} translation.

Your expertise includes:
- Deep understanding of ${sourceConfig.name} grammar, idioms, and cultural expressions
- Native-level ${targetConfig.name} writing with perfect grammar
- Cultural adaptation of idioms and expressions
- Maintaining the original tone and intent

TRANSLATION RULES:
1. GRAMMAR: Apply proper ${targetConfig.name} grammar rules. ${targetConfig.grammarNotes}
2. STYLE: ${styleInstructions[style]}
3. IDIOMS: Never translate idioms literally. Find equivalent expressions in ${targetConfig.name}.
4. CULTURAL ADAPTATION: Adapt cultural references to be meaningful in ${targetConfig.name} context.
5. NATURALNESS: The translation should read as if originally written in ${targetConfig.name}.
6. FORMATTING: ${preserveFormatting ? 'Preserve line breaks, paragraphs, and formatting.' : 'Optimize formatting for readability.'}
7. NAMES: Keep proper nouns and names unchanged unless they have standard translations.
8. NUMBERS: Use appropriate numeral format for ${targetConfig.name}.

Script: ${targetConfig.script}
Text Direction: ${targetConfig.direction}`;

      const userPrompt = `Translate the following ${sourceConfig.name} text into ${targetConfig.name}:

${context ? `Context: ${context}\n\n` : ''}Source Text (${sourceConfig.nativeName}):
"""
${sourceText}
"""

Provide ONLY the ${targetConfig.name} translation, nothing else. Do not include explanations, notes, or the original text.${includeTransliteration && ['hi', 'mr', 'ne', 'bn', 'ta', 'te', 'gu', 'pa', 'kn', 'ml', 'or', 'as', 'ur', 'ar', 'zh', 'ja', 'ko', 'th', 'fa', 'he'].includes(targetLang) ? `\n\nAfter the translation, on a new line starting with "TRANSLITERATION:", provide the romanized transliteration.` : ''}`;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3, // Lower for more consistent translations
            max_tokens: 4000,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data?.error?.message || 'Translation API error');
        }

        let translatedText = data.choices?.[0]?.message?.content?.trim() || '';
        let transliteration: string | undefined;

        // Extract transliteration if present
        if (includeTransliteration && translatedText.includes('TRANSLITERATION:')) {
          const parts = translatedText.split('TRANSLITERATION:');
          translatedText = parts[0].trim();
          transliteration = parts[1]?.trim();
        }

        results.push({
          language: targetLang,
          languageName: targetConfig.name,
          nativeName: targetConfig.nativeName,
          direction: targetConfig.direction,
          translation: translatedText,
          transliteration,
          grammarNotes: targetConfig.grammarNotes,
        });
      } catch (err: any) {
        results.push({
          language: targetLang,
          languageName: targetConfig.name,
          nativeName: targetConfig.nativeName,
          direction: targetConfig.direction,
          translation: `[Translation error: ${err.message}]`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      source: {
        language: sourceLang,
        languageName: sourceConfig.name,
        nativeName: sourceConfig.nativeName,
        text: sourceText,
      },
      translations: results,
      style,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[POST /api/admin/translate] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Translation failed' },
      { status: 500 }
    );
  }
}

// GET - Return supported languages
export async function GET() {
  const languages = Object.entries(LANGUAGE_CONFIG).map(([code, config]) => ({
    code,
    name: config.name,
    nativeName: config.nativeName,
    direction: config.direction,
    script: config.script,
  }));

  return NextResponse.json({
    success: true,
    languages,
    styles: ['formal', 'casual', 'literary', 'technical', 'conversational', 'poetic'],
  });
}
