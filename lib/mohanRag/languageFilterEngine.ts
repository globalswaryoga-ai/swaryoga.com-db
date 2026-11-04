/**
 * Language Filter & Separation Engine for Mohan RAG
 * 
 * Automatically detects whether incoming audio transcripts or texts are:
 * - Pure Hindi (hi)
 * - Pure Marathi (mr)
 * - Mixed / Code-switched (hi+mr)
 * - English (en)
 * - Sanskrit (sa)
 * 
 * Provides proper filtering and clean separation so:
 * 1. A Hindi lecture is never corrupted by Marathi spell-checker rules.
 * 2. A Marathi lecture is never corrupted by Hindi spell-checker rules.
 * 3. Garbled phonetics from Whisper (e.g. "गले बंद करा" instead of "डोळे बंद करा" or "आंखें बंद करो")
 *    are automatically resolved to the proper target language without altering sacred yogic terms.
 */

import { generateAIText } from '@/lib/ai/generateWithFallback';

export interface LanguageDetectionResult {
  detectedLanguage: 'hi' | 'mr' | 'en' | 'sa' | 'other';
  confidence: number;
  hindiScore: number;
  marathiScore: number;
  englishScore: number;
  isMixed: boolean;
  explanation: string;
}

// Characteristic vocabulary markers
const MARATHI_MARKERS = new Set([
  'आहे', 'नाही', 'आणि', 'करायचे', 'बघा', 'करा', 'गोष्टी', 'होते', 'डोळे', 'हळू', 'हळूहळू',
  'माहिती', 'सांगतो', 'तुम्हाला', 'आपण', 'काही', 'कसे', 'जेवण', 'भोजन', 'पाणी', 'नाकपुडी',
  'सुरू', 'उजवी', 'डावी', 'मध्ये', 'वरती', 'खाली', 'घेणे', 'सोडणे', 'झाले', 'गेले', 'येथे',
  'त्याचे', 'माझे', 'तुमचे', 'त्याच्यानंतर', 'सावकाश', 'शरीराला', 'पाहिजे', 'लागला', 'होता'
]);

const HINDI_MARKERS = new Set([
  'है', 'होता', 'होती', 'नहीं', 'और', 'क्या', 'करना', 'चलो', 'आंखें', 'शरीर', 'बोलना',
  'खाना', 'चलना', 'किस', 'इस', 'उस', 'हम', 'आप', 'कैसे', 'कहा', 'जब', 'तब', 'पानी',
  'सांस', 'लेना', 'छोड़ना', 'होगा', 'गया', 'यहाँ', 'उसका', 'मेरा', 'आपका', 'धीरे', 'धीरे-धीरे',
  'चाहिए', 'समझना', 'दाहिनी', 'बाईं', 'नासिका', 'करने', 'लगे', 'चीजें', 'बातें'
]);

/**
 * Detect language based on vocabulary frequency in Devanagari text
 */
export function detectTextLanguage(text: string): LanguageDetectionResult {
  if (!text || !text.trim()) {
    return { detectedLanguage: 'other', confidence: 0, hindiScore: 0, marathiScore: 0, englishScore: 0, isMixed: false, explanation: 'Empty text' };
  }

  // Count Latin characters vs Devanagari characters
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;

  if (latinChars > devanagariChars * 2 && latinChars > 50) {
    return {
      detectedLanguage: 'en',
      confidence: 0.95,
      hindiScore: 0,
      marathiScore: 0,
      englishScore: 1,
      isMixed: false,
      explanation: 'Predominantly English Latin text',
    };
  }

  // Tokenize Devanagari words
  const words = text
    .replace(/[0-9[\]().,;:\-–—\n\r]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 1);

  let marathiCount = 0;
  let hindiCount = 0;

  for (const word of words) {
    if (MARATHI_MARKERS.has(word)) marathiCount++;
    if (HINDI_MARKERS.has(word)) hindiCount++;
  }

  const totalHits = marathiCount + hindiCount;
  const hindiScore = totalHits > 0 ? hindiCount / totalHits : 0;
  const marathiScore = totalHits > 0 ? marathiCount / totalHits : 0;
  const isMixed = totalHits >= 6 && Math.min(hindiScore, marathiScore) > 0.25;

  let detectedLanguage: 'hi' | 'mr' | 'en' | 'sa' | 'other' = 'mr';
  let confidence = 0.5;

  if (totalHits === 0) {
    detectedLanguage = 'mr'; // default Mohan Sir corpus language
    confidence = 0.5;
  } else if (hindiCount > marathiCount) {
    detectedLanguage = 'hi';
    confidence = Math.min(0.99, Math.round((hindiCount / totalHits) * 100) / 100);
  } else {
    detectedLanguage = 'mr';
    confidence = Math.min(0.99, Math.round((marathiCount / totalHits) * 100) / 100);
  }

  return {
    detectedLanguage,
    confidence,
    hindiScore: Math.round(hindiScore * 100) / 100,
    marathiScore: Math.round(marathiScore * 100) / 100,
    englishScore: 0,
    isMixed,
    explanation: `Found ${marathiCount} Marathi markers vs ${hindiCount} Hindi markers (${Math.round(confidence * 100)}% confidence).`,
  };
}

/**
 * Clean & standardizes mixed transcript into pure target language (Hindi or Marathi)
 * while preserving 100% of the timestamps and sacred Swar Yoga terminology.
 */
export async function separateAndStandardizeLanguage(
  content: string,
  targetLanguage: 'hi' | 'mr' | 'en',
  options: { signal?: AbortSignal } = {}
): Promise<{ cleanedText: string; originalLanguageDetected: string; targetLanguage: string }> {
  const detection = detectTextLanguage(content);

  const targetName = targetLanguage === 'hi' ? 'Hindi (हिंदी)' : targetLanguage === 'mr' ? 'Marathi (मराठी)' : 'English';

  const systemPrompt = `CRITICAL RULE - VERBATIM FIDELITY & PURE LANGUAGE STANDARDIZATION:
You are the Mohan RAG Master Language Cleaner for classical Swar Yoga teachings.
The desired output language is strictly: ${targetName} (${targetLanguage}).

PROBLEM TO FIX:
Audio speech-to-text engines often produce mixed Hindi and Marathi phrases or mishear words phonetically.
For example:
- Misheard "गले बंद करा" -> In Marathi: "डोळे बंद करा", In Hindi: "आँखें बंद करें".
- Misheard "सवकाज गले उड़ा" -> In Marathi: "सावकाश डोळे उघडा", In Hindi: "सहज धीरे-धीरे आँखें खोलें".
- Mixed "नर्माल गती 12-15 और 8-17 क्या प्रमाने आहे" ->
  - If target is Marathi: "नॉर्मल गती १२-१५ आणि ८-१२ च्या प्रमाणे आहे."
  - If target is Hindi: "नॉर्मल गति १२-१५ और ८-१२ के प्रमाण से है."
- Mixed "पूछं लिहा कि तेझा संझा तुम्हे तीन गोष्टी करू लागला, चालना, बोलना आणि खाना" ->
  - If target is Marathi: "पुढे लिहा की त्याच्यानंतर तुम्ही तीन गोष्टी करू लागला - चालणे, बोलणे आणि खाणे."
  - If target is Hindi: "आगे लिखें कि उसके बाद आप तीन चीज़ें करने लगे - चलना, बोलना और खाना."

MANDATORY RULES:
1. PURE TARGET LANGUAGE:
   - Make all sentences completely natural, pure, grammatically coherent in ${targetName}.
   - Eliminate any mixed vocabulary or phonetic mis-transcriptions from the other language.
2. SACRED YOGIC TERMS PRESERVED 100% VERBATIM (DO NOT SUBSTITUTE):
   - स्वर योग, स्वरोदय, नाडी, इडा, पिंगळा, सुषुम्ना, प्राण, कुंभक, नासिका, चंद्र स्वर, सूर्य स्वर.
3. PRESERVE ALL TIMESTAMPS:
   - Keep all [MM:SS–MM:SS] timestamps and Minute headers exactly in place!
4. Return ONLY the cleaned transcript. No markdown fences, no conversational preamble.`;

  // Split into manageable chunks if large
  const chunks = content.split(/\n\n(?=Minute \d\d:\d\d)/);
  const processedChunks: string[] = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const cleaned = await generateAIText({
      providerOrder: ['Gemini', 'OpenAI', 'Anthropic', 'Groq'],
      temperature: 0.1,
      maxOutputTokens: 8192,
      signal: options.signal,
      systemPrompt,
      message: `Standardize this transcript into clean, pure ${targetName}. Retain timestamps exactly:\n\n${chunk}`,
    });
    processedChunks.push(cleaned.trim());
  }

  return {
    cleanedText: processedChunks.join('\n\n'),
    originalLanguageDetected: detection.detectedLanguage,
    targetLanguage,
  };
}

