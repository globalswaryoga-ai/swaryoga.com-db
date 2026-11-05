/**
 * Client-safe Language Detection for Swar Yoga Transcripts
 * Detects whether a transcript is pure Marathi, pure Hindi, mixed/corrupted, or English.
 */

export interface LanguageDetectionResult {
  detectedLanguage: 'hi' | 'mr' | 'en' | 'sa' | 'other';
  confidence: number;
  hindiScore: number;
  marathiScore: number;
  englishScore: number;
  isMixed: boolean;
  hasWhisperAcousticGarble: boolean;
  explanation: string;
}

const MARATHI_MARKERS = new Set([
  'आहे', 'नाही', 'आणि', 'करायचे', 'बघा', 'करा', 'गोष्टी', 'होते', 'डोळे', 'हळू', 'हळूहळू',
  'माहिती', 'सांगतो', 'तुम्हाला', 'आपण', 'काही', 'कसे', 'जेवण', 'भोजन', 'पाणी', 'नाकपुडी',
  'सुरू', 'उजवी', 'डावी', 'मध्ये', 'वरती', 'खाली', 'घेणे', 'सोडणे', 'झाले', 'गेले', 'येथे',
  'त्याचे', 'माझे', 'तुमचे', 'त्याच्यानंतर', 'सावकाश', 'शरीराला', 'पाहिजे', 'लागला', 'होता',
  'काय', 'वाटतं', 'सांगा', 'म्हणजे', 'कधी', 'घडणारी', 'भाग'
]);

const HINDI_MARKERS = new Set([
  'है', 'होता', 'होती', 'नहीं', 'और', 'क्या', 'करना', 'चलो', 'आंखें', 'शरीर', 'बोलना',
  'खाना', 'चलना', 'किस', 'इस', 'उस', 'हम', 'आप', 'कैसे', 'कहा', 'जब', 'तब', 'पानी',
  'सांस', 'लेना', 'छोड़ना', 'होगा', 'गया', 'यहाँ', 'उसका', 'मेरा', 'आपका', 'धीरे', 'धीरे-धीरे',
  'चाहिए', 'समझना', 'दाहिनी', 'बाईं', 'नासिका', 'करने', 'लगे', 'चीजें', 'बातें', 'होते', 'करते'
]);

export function detectTextLanguageClient(text: string): LanguageDetectionResult {
  if (!text || !text.trim()) {
    return {
      detectedLanguage: 'other',
      confidence: 0,
      hindiScore: 0,
      marathiScore: 0,
      englishScore: 0,
      isMixed: false,
      hasWhisperAcousticGarble: false,
      explanation: 'Empty text',
    };
  }

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
      hasWhisperAcousticGarble: false,
      explanation: 'Predominantly English Latin text',
    };
  }

  // Detect characteristic Whisper audio speech recognition errors
  const hasWhisperAcousticGarble = /गले बंद|सवकाज|सेक्सी रेलेटेड|श्वस्णाच|मानोसा|शेतल्जी|कामक्रोत|आहंकार मनाते|मद मनजे|दावीचा काम|उजवी शेरा|गोड़ा तीस|हतीचा है/.test(text);

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
    detectedLanguage = 'mr';
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
    hasWhisperAcousticGarble,
    explanation: `Found ${marathiCount} Marathi markers vs ${hindiCount} Hindi markers (${Math.round(confidence * 100)}% confidence).`,
  };
}

