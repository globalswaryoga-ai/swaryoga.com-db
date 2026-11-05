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
import { formatTranscriptLines } from './transcriptFormatter';
import { detectTextLanguageClient } from './languageDetectionClient';

export { detectTextLanguageClient as detectTextLanguage } from './languageDetectionClient';
export type { LanguageDetectionResult } from './languageDetectionClient';

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
Audio speech-to-text engines (like Whisper) often produce mixed Hindi and Marathi phrases or mishear words phonetically.
For example in Marathi:
- Misheard "गले बंद करा" -> "डोळे बंद करा"
- Misheard "सवकाज गले उड़ा" -> "सावकाश डोळे उघडा"
- Misheard "दावीचा काम शरीराला थंद करना" -> "डावी नाडीचे काम शरीराला थंड करणे"
- Misheard "उजवी शेरा मध्ये उठना दाने मान करना" -> "उजवी पिंगळा नाडी शरीरामध्ये उष्णता निर्माण करणे"
- Misheard "गोड़ा तीस ते पस्तिस श्वास, तीस ते पस्तिस वर्ष आयुश्य" -> "घोड्याचा ३० ते ३५ श्वास, ३० ते ३५ वर्षे आयुष्य"
- Misheard "हतीचा है ते 12-19 श्वास. शंबर वर्ष आयुश्य" -> "हत्तीचा १२ ते १४ श्वास, १०० वर्षे आयुष्य"
- Misheard "काम जे काई गेतले लाए, ये काम जाने सेक्सी रेलेटेड गेतले लाए" -> "काम जे काही घेतले आहे, हे काम म्हणजे सेक्स रिलेटेड घेतले आहे"
- Misheard "औरी क्रोध मंदे मानोसा फ़नफ़न करतो हैं" -> "आणि क्रोध मध्ये माणूस फणफण करतो"
- Misheard "तो इतने श्वस्णाच गती 25-25 वर्ती जाते हैं" -> "तर इतकी श्वासांची गती २५-२५ वर जाते"
- Misheard "मद मनजे काई आहंकार मनाते हैं, तेवा पर मस्ती मनतो न" -> "मद म्हणजे काय? अहंकार मानतो ना, तेव्हा आपण मस्ती म्हणतो ना"
- Misheard "मद मनजे आहंकार, मोह, लाचा, मचर, दंब" -> "मद म्हणजे अहंकार, मोह, लालसा, मत्सर, दंभ"
- Misheard "अतर शेतल्जी मला संगा, कामक्रोत जासता गातका हैं कि मद, मोह, मस्ता और दंब जासता गातका हैं? तुम्हाला क्या वाठता?" -> "आता शीतलजी मला सांगा, काम-क्रोध जास्त घातक आहे की मद, मोह, मत्सर आणि दंभ जास्त घातक आहे? तुम्हाला काय वाटतं?"
- Misheard "तच मुले जाजा लोगानना बीपी, डाइबिटीज, हार्ट चे प्राब्लेम आहेथ, थाईलाड आहेथ, थीमा पोलेश्टोर जे त्रास आहेथ, यांचे सगले प्राब्लेम ये चार में आहेथ" -> "त्याचमुळे ज्या ज्या लोकांना बीपी, डायबिटीस, हार्टचे प्रॉब्लेम आहेत, थायरॉईड आहे, कोलेस्ट्रॉलचे त्रास आहेत, त्यांचे सगळे प्रॉब्लेम या चारमध्ये आहेत"

MANDATORY RULES:
1. PURE TARGET LANGUAGE:
   - Make all sentences completely natural, pure, grammatically coherent in ${targetName}.
   - Eliminate any mixed vocabulary or phonetic mis-transcriptions from the other language.
2. SACRED YOGIC TERMS PRESERVED 100% VERBATIM (DO NOT SUBSTITUTE):
   - स्वर योग, स्वरोदय, नाडी, इडा, पिंगळा, सुषुम्ना, प्राण, कुंभक, नासिका, चंद्र स्वर, सूर्य स्वर, षड्रिपू (काम, क्रोध, मद, मोह, मत्सर, दंभ).
3. PRESERVE ALL TIMESTAMPS:
   - Keep all [MM:SS–MM:SS] timestamps and Minute headers exactly in place!
4. Return ONLY the cleaned transcript. No markdown fences, no conversational preamble.`;

  // Combine minute blocks into balanced batches of ~3500 chars to process fast in parallel
  const rawBlocks = content.split(/\n\n(?=Minute \d\d:\d\d)/);
  const batches: string[] = [];
  let currentBatch = '';

  for (const block of rawBlocks) {
    if (!block.trim()) continue;
    if (currentBatch.length + block.length > 4000 && currentBatch.length > 0) {
      batches.push(currentBatch.trim());
      currentBatch = block;
    } else {
      currentBatch += (currentBatch ? '\n\n' : '') + block;
    }
  }
  if (currentBatch.trim()) {
    batches.push(currentBatch.trim());
  }

  if (batches.length === 0) {
    batches.push(content);
  }

  // Process batches in parallel
  const processedBatches = await Promise.all(
    batches.map(async (batch) => {
      const cleaned = await generateAIText({
        providerOrder: ['Gemini', 'OpenAI', 'Anthropic', 'Groq'],
        temperature: 0.1,
        maxOutputTokens: 8192,
        signal: options.signal,
        systemPrompt,
        message: `Standardize this transcript into clean, pure ${targetName}. Retain all timestamps exactly:\n\n${batch}`,
      });
      return cleaned.trim();
    })
  );

  return {
    cleanedText: formatTranscriptLines(processedBatches.join('\n\n')),
    originalLanguageDetected: detection.detectedLanguage,
    targetLanguage,
  };
}

