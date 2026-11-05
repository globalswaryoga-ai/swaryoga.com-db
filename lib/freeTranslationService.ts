/**
 * Resilient Multilingual Translation Engine with Zero AI Token / Quota Dependency
 * Uses MyMemory API + Google Translate free endpoints with tag preservation
 * and strict sacred Vedic terminology enforcement per Swar Yoga Operational Rules.
 */

const YOGIC_TERM_RULES: Array<[RegExp, string]> = [
  [/Vowel Yoga/gi, 'Swar Yoga'],
  [/Vocal Yoga/gi, 'Swar Yoga'],
  [/Yoga Vocal/gi, 'Swar Yoga'],
  [/Vokal-Yoga/gi, 'Swar Yoga'],
  [/Yoga della vocale/gi, 'Swar Yoga'],
  [/Yoga de la voyelle/gi, 'Swar Yoga'],
  [/वाव योग/gi, 'स्वर योग'],
  [/स्वर आणि नाडी/gi, 'स्वर आणि नाडी'],
  [/母音ヨガ/gi, 'スワラヨガ (Swar Yoga)'],
  [/гласную йогу/gi, 'Свара Йогу (Swar Yoga)'],
  [/sun rushes in the pulse/gi, 'Surya Nadi flows'],
  [/sol se precipita en el pulso/gi, 'Surya Nadi se activa'],
  [/Sonne im Puls rauscht/gi, 'Surya Nadi aktiv ist'],
  [/le soleil se précipite dans le pouls/gi, 'Surya Nadi est actif'],
  [/il sole scorre nel polso/gi, 'Surya Nadi è attivo'],
  [/solen rusar i pulsen/gi, 'Surya Nadi är aktiv'],
  [/zon stroomt in de pols/gi, 'Surya Nadi stroomt'],
  [/Right pulse/gi, 'Surya Nadi (Right Nostril)'],
  [/Left pulse/gi, 'Ida Nadi (Left Nostril)'],
  [/Pulso derecho/gi, 'Surya Nadi'],
  [/Pulso izquierdo/gi, 'Chandra Nadi'],
];

export function cleanYogicTerms(text: string): string {
  let cleaned = text;
  for (const [regex, replacement] of YOGIC_TERM_RULES) {
    cleaned = cleaned.replace(regex, replacement);
  }
  return cleaned;
}

export async function translateWithFreeEngine(
  text: string,
  targetLang: string,
  sourceLang = 'auto'
): Promise<string> {
  if (!text || !text.trim()) return '';

  const cleanTarget = targetLang.trim().toLowerCase().split('-')[0];
  const cleanSource = sourceLang.trim().toLowerCase().split('-')[0];
  if (cleanTarget === cleanSource) return text;

  // Split into sentences / paragraphs for optimal translation quality
  const paragraphs = text.split(/\n+/);
  const translatedLines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      translatedLines.push('');
      continue;
    }

    // Split long paragraphs into sentence chunks <= 400 chars
    const sentenceChunks = chunkSentences(paragraph, 350);
    const translatedChunks: string[] = [];

    for (const chunk of sentenceChunks) {
      const translated = await translateSingleSegment(chunk, cleanTarget, cleanSource);
      translatedChunks.push(translated);
    }

    translatedLines.push(translatedChunks.join(' '));
  }

  const finalOutput = translatedLines.join('\n');
  return cleanYogicTerms(finalOutput);
}

function chunkSentences(text: string, maxLen = 350): string[] {
  if (text.length <= maxLen) return [text];

  const sentences = text.split(/(?<=[.!?।॥\n])\s+/);
  const chunks: string[] = [];
  let cur = '';

  for (const s of sentences) {
    if (cur.length + s.length > maxLen) {
      if (cur) chunks.push(cur.trim());
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length > 0 ? chunks : [text];
}

async function translateSingleSegment(
  segment: string,
  targetLang: string,
  sourceLang = 'auto'
): Promise<string> {
  if (!segment.trim()) return '';

  // 1. Tag placeholders: [smile:80], [namaste], [pause:1.5s]
  const tagPlaceholders: Array<{ placeholder: string; original: string }> = [];
  let protectedText = segment.replace(/\[[a-zA-Z0-9_:.\s-]+\]/g, (match) => {
    const placeholder = `__TAG${tagPlaceholders.length}__`;
    tagPlaceholders.push({ placeholder, original: match });
    return placeholder;
  });

  const langPair = `${sourceLang === 'auto' ? 'hi' : sourceLang}|${targetLang}`;
  let translatedText = '';

  // Strategy A: MyMemory Translation API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      protectedText
    )}&langpair=${encodeURIComponent(langPair)}&de=mohan@swaryoga.com`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.responseData?.translatedText && data.responseStatus === 200) {
        translatedText = String(data.responseData.translatedText);
      }
    }
  } catch (err) {
    console.warn('[MyMemory failed, trying Google fallback]:', err);
  }

  // Strategy B: Google Translate client fallback if Strategy A returned empty
  if (!translatedText) {
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
        sourceLang
      )}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(protectedText)}`;

      const gRes = await fetch(gUrl, {
        headers: {
          'User-Agent': 'curl/7.88.1',
          Accept: '*/*',
        },
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData) && Array.isArray(gData[0])) {
          translatedText = gData[0].map((s: any) => s[0] || '').join('');
        }
      }
    } catch (e) {
      console.warn('[Google free translate fallback failed]:', e);
    }
  }

  // Fallback to original text if both fail
  if (!translatedText) {
    translatedText = protectedText;
  }

  // Restore avatar tags accurately (handling any underscore stripping by translation models)
  for (let i = 0; i < tagPlaceholders.length; i++) {
    const { original } = tagPlaceholders[i];
    const pattern = new RegExp(`(?:_{0,2}\\s*TAG\\s*${i}\\s*_{0,2})`, 'gi');
    translatedText = translatedText.replace(pattern, original);
  }

  // Clean up any extraneous punctuation inserted next to bracket tags
  translatedText = translatedText.replace(/\]\s*,\s*\[/g, '] [').replace(/\]\s*,\s*/g, '] ');

  return cleanYogicTerms(translatedText);
}
