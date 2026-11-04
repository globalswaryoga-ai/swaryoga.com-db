import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { chunkText } from '@/lib/ragRetrieval';

export interface SourceRecheckResult {
  sourceId: string;
  title: string;
  oldLanguage: string;
  newLanguage: string;
  hallucinationsRemoved: number;
  spellingFixesCount: number;
  wordCount: number;
  cleanedPreview: string;
  status: 'fixed' | 'clean' | 'error';
  error?: string;
}

/**
 * Common Whisper ASR Hallucinations in Indic speech:
 * English token floods, subtitle artifact repetitions, and random metadata.
 */
const HALLUCINATION_PATTERNS = [
  /allows\s+डे\s+Dickhiya[^\n]+/gi,
  /muit\s+हो\s+delegates[^\n]+/gi,
  /collaborate,\s+discuss,\s+debate,\s+insesleep[^\n]+/gi,
  /click through in organizations[^\n]+/gi,
  /Which is bad now oricos,\s*neuros[^\n]+/gi,
  /Which is bad now oricos[^\n]+/gi,
  /Those are all absolutely bad\?[^\n]*/gi,
  /\b(insesleep|oricos|neuros|dickhiya)\b/gi,
  /\[Music\]/gi,
  /\[Applause\]/gi,
  /Amara\.org/gi,
  /Subtitles by the Amara\.org community/gi,
];

function indicRegex(word: string): RegExp {
  // Unicode/Devanagari word boundaries (since \b only works on ASCII)
  return new RegExp(`(^|[\\s,।!?.()"'\\[\\]])${word}([\\s,।!?.()"'\\[\\]]|$)`, 'gu');
}

/**
 * Word-for-Word Orthographic and Matra Replacements for Mohan Sir's spoken Marathi.
 * Strictly preserves vocabulary (never replaces a word with a synonym), fixes orthography only.
 */
const MARATHI_SPELL_PAIRS: Array<[string, string]> = [
  ['मदे', 'मध्ये'],
  ['आनकीन', 'आणखीन'],
  ['दीव लेवल मदे', 'डीप लेव्हलमध्ये'],
  ['दीव लेवल', 'डीप लेव्हल'],
  ['जाऊला', 'जाऊया'],
  ['करूँया', 'करूया'],
  ['करूँ', 'करू'],
  ['पक्त', 'फक्त'],
  ['धाय मिन्टाचा', 'दहा मिनिटांचं'],
  ['धाय मिन्टा', 'दहा मिनिटं'],
  ['सर्वधा बसा', 'सरळ बसा'],
  ['भगितला', 'बघितला'],
  ['शरी स्थिर', 'शरीर स्थिर'],
  ['स्थिर करण', 'स्थिर करणं'],
  ['डोले', 'डोळे'],
  ['कड़े', 'कडे'],
  ['दावी', 'डावी'],
  ['चव्था', 'चौथा'],
  ['चस्मा', 'चष्मा'],
  ['सेतर', 'असेल तर'],
  ['दावी मिनटा सारी कारण ठेवा', 'दहा मिनिटांसाठी काढून ठेवा'],
  ['पाट ताट', 'पाठ ताठ'],
  ['दोले बंद', 'डोळे बंद'],
  ['प्रत्यम', 'प्रथम'],
  ['शेराला', 'शरीराला'],
  ['आईकी का व्यावाचा', 'एका एका अवयवाचं'],
  ['नाव गेहीं', 'नाव घेईन'],
  ['दिविमन्नला', 'दिव्य मनाला'],
  ['तया अव्यावकणी', 'त्या अवयवाकडे'],
  ['नेणा आई', 'नेणं आहे'],
  ['तया लाग', 'त्याला'],
  ['शेथिल करत', 'शिथिल करत'],
  ['पुरे जाना आई', 'पुढे जाणं आहे'],
  ['तरवेण कड़े', 'तळव्यांकडे'],
  ['तरवेण', 'तळवे'],
  ['ताइज', 'थाईज'],
  ['तान कारूं टाका', 'ताण काढून टाका'],
  ['पोटी पोट', 'ओटीपोट'],
  ['पून पाठ', 'पूर्ण पाठ'],
  ['पाठी चकना', 'पाठीचा कणा'],
  ['दोनी खांदे', 'दोन्ही खांदे'],
  ['दोनी भात', 'दोन्ही हात'],
  ['हातांची बोटल', 'हातांची बोटं'],
  ['माने वर काई तान', 'मानेवर काही ताण'],
  ['दोक्याची', 'डोक्याची'],
  ['टालू', 'टाळू'],
  ['कपाल', 'कपाळ'],
  ['भुव्या', 'भुवया'],
  ['साहिक करा', 'सैल करा'],
  ['पोनच वास गया', 'पाच श्वास घ्या'],
  ['आटंक मोजा', 'अंक मोजा'],
  ['पुन्ना', 'पुन्हा'],
  ['बाय कुम्बक', 'बाह्य कुंभक'],
  ['पास मिनित', 'पाच मिनिटं'],
  ['दावी कणुं', 'डावीकडून'],
  ['उजवी कड़े', 'उजवीकडे'],
  ['श्वास आखडे', 'श्वासाकडे'],
  ['बेरे कुट', 'वेरी गुड'],
  ['कम्मी जाले', 'कमी झाले'],
  ['ग्यासेच्छ', 'गॅसेसचं'],
  ['अध्न्य चक्रा', 'आज्ञा चक्र'],
  ['आकाउण मदे', 'अकाउंटमध्ये'],
  ['भायर पडेल', 'बाहेर पडेल'],
  ['धाधा करोड रुवे', 'दहा करोड रुपये'],
  ['सालेला रूप', 'झालेलं रूप'],
  ['तीक है', 'ठीक आहे'],
  ['कण तुम्हा', 'कारण तुम्हा'],
  ['आंहंकाराचा चुराला जालेला', 'अहंकाराचा चुराडा झालेला'],
  ['तो का होईलो', 'तेव्हा काय होईल'],
  ['सवकाश मान खाली', 'सावकाश मान खाली'],
  ['दिर्गश्वसन', 'दीर्घश्वसन'],
  ['सवकाश', 'सावकाश'],
];

const HINDI_SPELL_PAIRS: Array<[string, string]> = [
  ['नाकपुडी', 'नाकपुड़ी'],
  ['दाहिना छिद्र', 'दाहिनी नाकपुड़ी'],
  ['बायें छिद्र', 'बाईं नाकपुड़ी'],
  ['पनी', 'पानी'],
  ['सवेरे', 'सुबह'],
  ['किये', 'किया'],
  ['नाड़ी', 'नाड़ी'],
];

export function cleanVerbatimTranscript(
  text: string,
  lang: 'mr' | 'hi' | 'en'
): { cleaned: string; hallucinationsRemoved: number; spellingFixesCount: number } {
  let cleaned = text;
  let hallucinationsRemoved = 0;
  let spellingFixesCount = 0;

  // 1. Remove hallucinations
  for (const pat of HALLUCINATION_PATTERNS) {
    const matches = cleaned.match(pat);
    if (matches) {
      hallucinationsRemoved += matches.length;
      cleaned = cleaned.replace(pat, '');
    }
  }

  // 2. Apply orthographic spell check for matching language
  const pairs = lang === 'mr' ? MARATHI_SPELL_PAIRS : lang === 'hi' ? HINDI_SPELL_PAIRS : [];
  for (const [fromWord, toWord] of pairs) {
    const regex = indicRegex(fromWord);
    // Count matches
    const matches = cleaned.match(regex);
    if (matches) {
      spellingFixesCount += matches.length;
      cleaned = cleaned.replace(regex, `$1${toWord}$2`);
    }
  }

  // 3. Clean up multiple empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return { cleaned, hallucinationsRemoved, spellingFixesCount };
}

export function detectExactSourceLanguage(title: string, content: string): 'mr' | 'hi' | 'en' {
  const lowerTitle = (title || '').toLowerCase();
  if (lowerTitle.includes('marathi') || lowerTitle.includes('मराठी')) return 'mr';
  if (lowerTitle.includes('hindi') || lowerTitle.includes('हिंदी')) return 'hi';
  if (lowerTitle.includes('eng') || lowerTitle.includes('english')) return 'en';

  const clean = (content || '').replace(/\[\d+:\d+[-–]\d+:\d+\]/g, '').replace(/Minute\s+\d+:\d+[-–]\d+:\d+/gi, '');
  const latinMatches = clean.match(/[a-zA-Z]/g) || [];
  const devanagariMatches = clean.match(/[\u0900-\u097F]/g) || [];

  if (latinMatches.length > devanagariMatches.length * 1.5) {
    return 'en';
  }

  const marathiMarkers = [
    /\bआहे\b/g, /\bआहेत\b/g, /\bनाही\b/g, /\bआपण\b/g, /\bआपलं\b/g, /\bकरूया\b/g, /\bकरावे\b/g,
    /\bपाहिजे\b/g, /\bबघितला\b/g, /\bबघा\b/g, /\bदिवस\b/g, /\bपाणी\b/g, /\bनाकपुडी\b/g,
    /\bजेव्हा\b/g, /\bतेव्हा\b/g, /\bमध्ये\b/g, /\bकरून\b/g, /\bहोतो\b/g, /\bहोते\b/g,
    /\bशिकलो\b/g, /\bजाऊया\b/g, /\bघेऊन\b/g, /\bठेवा\b/g, /\bघ्या\b/g, /\bटाका\b/g,
    /\bडोळे\b/g, /\bहात\b/g, /\bश्वासाकडे\b/g
  ];

  const hindiMarkers = [
    /\bहै\b/g, /\bहैं\b/g, /\bनहीं\b/g, /\bहम\b/g, /\bहमे\b/g, /\bहमें\b/g, /\bकरेंगे\b/g,
    /\bकरना\b/g, /\bचाहिए\b/g, /\bदेखा\b/g, /\bदेखिए\b/g, /\bदिन\b/g, /\bपानी\b/g,
    /\bजब\b/g, /\bतब\b/g, /\bमें\b/g, /\bकरके\b/g, /\bहोता\b/g, /\bहोती\b/g,
    /\bसकते\b/g, /\bसकता\b/g, /\bरखना\b/g, /\bलीजिए\b/g, /\bडालिए\b/g, /\bआंखें\b/g
  ];

  let mrScore = 0;
  for (const m of marathiMarkers) {
    const found = clean.match(m);
    if (found) mrScore += found.length;
  }

  let hiScore = 0;
  for (const h of hindiMarkers) {
    const found = clean.match(h);
    if (found) hiScore += found.length;
  }

  return mrScore >= hiScore ? 'mr' : 'hi';
}

/**
 * Execute full word-for-word spell check and language normalization across all sources.
 */
export async function runFullSourceRecheckAndCleanup(): Promise<{
  totalAudited: number;
  languageChanges: number;
  hallucinationsPurged: number;
  spellingCorrected: number;
  results: SourceRecheckResult[];
}> {
  const query = await bunnyExecute('SELECT id, title, topic, language, content, module_id FROM mohan_rag_sources_sql');
  const rows = query.rows || [];

  const results: SourceRecheckResult[] = [];
  let languageChanges = 0;
  let hallucinationsPurged = 0;
  let spellingCorrected = 0;

  for (const r of rows) {
    const id = String(r.id);
    const title = String(r.title || '');
    const topic = String(r.topic || '');
    const oldLang = String(r.language || 'mr').toLowerCase();
    const rawContent = String(r.content || '');

    try {
      // 1. Determine verified language
      const verifiedLang = detectExactSourceLanguage(title, rawContent);
      const langChanged = oldLang !== verifiedLang && oldLang !== 'auto';

      // 2. Clean transcript (hallucinations & orthographic spell check)
      const { cleaned, hallucinationsRemoved, spellingFixesCount } = cleanVerbatimTranscript(rawContent, verifiedLang);

      if (langChanged) languageChanges++;
      hallucinationsPurged += hallucinationsRemoved;
      spellingCorrected += spellingFixesCount;

      // 3. Update database if changes occurred
      const needsDbUpdate = langChanged || hallucinationsRemoved > 0 || spellingFixesCount > 0 || oldLang === 'marathi' || oldLang === 'hindi';
      if (needsDbUpdate) {
        const now = new Date().toISOString();
        await bunnyExecute({
          sql: `UPDATE mohan_rag_sources_sql SET language = ?, content = ?, updated_at = ? WHERE id = ?`,
          args: [verifiedLang, cleaned, now, id],
        });

        // Re-index search chunks for this source
        const cleanForChunks = cleaned.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
        const chunks = chunkText(cleanForChunks, 1800, 220);
        if (chunks.length > 0) {
          await bunnyExecute({ sql: 'DELETE FROM mohan_rag_chunks_sql WHERE source_id = ?', args: [id] });
          const moduleId = String(r.module_id || 'level1');
          const chunkStmts = chunks.map((chunk, idx) => ({
            sql: `INSERT INTO mohan_rag_chunks_sql (id, source_id, module_id, chunk_index, content, topic, language, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [`chunk_${id}_${idx}`, id, moduleId, idx, chunk, topic, verifiedLang, now],
          }));
          for (let i = 0; i < chunkStmts.length; i += 50) {
            await bunnyBatch(chunkStmts.slice(i, i + 50)).catch(() => {});
          }
        }
      }

      results.push({
        sourceId: id,
        title,
        oldLanguage: oldLang,
        newLanguage: verifiedLang,
        hallucinationsRemoved,
        spellingFixesCount,
        wordCount: Math.round(cleaned.length / 5),
        cleanedPreview: cleaned.slice(0, 250),
        status: needsDbUpdate ? 'fixed' : 'clean',
      });
    } catch (err: any) {
      results.push({
        sourceId: id,
        title,
        oldLanguage: oldLang,
        newLanguage: oldLang,
        hallucinationsRemoved: 0,
        spellingFixesCount: 0,
        wordCount: 0,
        cleanedPreview: '',
        status: 'error',
        error: err.message,
      });
    }
  }

  return {
    totalAudited: rows.length,
    languageChanges,
    hallucinationsPurged,
    spellingCorrected,
    results,
  };
}
