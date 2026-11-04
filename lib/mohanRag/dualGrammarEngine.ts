/**
 * Dual-Core SOV & SVO Grammar and Humor Pacing Engine
 * 
 * SOV: Subject + Object + Verb (Karta + Karma + Kriyapad)
 * Used in: Marathi, Hindi, Sanskrit, Gujarati, Bengali, Tamil, Telugu, Japanese, Korean
 * Pacing: Holds comedic twist / punchline until the final verb at the end of the sentence.
 * 
 * SVO: Subject + Verb + Object (Karta + Kriyapad + Karma)
 * Used in: English, Spanish, French, German, Russian, Italian, Portuguese
 * Pacing: Delivers conversational punchlines with active mid-sentence verbs and direct clarity.
 */

export type GrammarFamily = 'sov' | 'svo';

export interface GrammarConfig {
  family: GrammarFamily;
  verbPosition: 'terminal' | 'medial';
  punchlineRule: string;
  cadenceDescription: string;
  isNativeIndic: boolean; // true for Marathi and Hindi (Mohan Sir's spoken tongues)
}

export function isNativeIndicLanguage(languageCode: string): boolean {
  const code = languageCode.toLowerCase().trim();
  return code === 'mr' || code === 'marathi' || code === 'hi' || code === 'hindi';
}

export const LANGUAGE_GRAMMAR_MAP: Record<string, GrammarConfig> = {
  // SOV Family (Indic & East Asian)
  // For Marathi & Hindi: Mohan Sir knows these languages intimately. Strictly VERBS ONLY (क्रियापद), NEVER rewrite sentences or nouns.
  mr: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'Twist lands at the final verb', cadenceDescription: 'Spiritual, grounding, rhythmic cadence', isNativeIndic: true },
  hi: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'Twist lands at the final verb', cadenceDescription: 'Warm, deep, conversational Hindi', isNativeIndic: true },
  sa: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'Traditional Vedic flow', cadenceDescription: 'Devotional and poetic shloka cadence', isNativeIndic: false },
  gu: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'Friendly end-verb punchline', cadenceDescription: 'Approachable, warm community tone', isNativeIndic: false },
  ta: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'Classical Dravidian end-verb twist', cadenceDescription: 'Profound, ancient, respectful tone', isNativeIndic: false },
  te: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'Melodic terminal verb cadence', cadenceDescription: 'Warm, melodic, spiritually rich', isNativeIndic: false },
  kn: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'End-sentence rhythmic realization', cadenceDescription: 'Grounded and meditative', isNativeIndic: false },
  ja: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'Subtle terminal verb humor (Teinei-go)', cadenceDescription: 'Polite, serene, Zen-like mindfulness', isNativeIndic: false },
  ko: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'Respectful end-sentence twist (Jondaetmal)', cadenceDescription: 'Attentive, earnest, warm', isNativeIndic: false },
  ne: { family: 'sov', verbPosition: 'terminal', punchlineRule: 'Himalayan SOV cadence', cadenceDescription: 'Simple, pure, natural', isNativeIndic: false },

  // SVO Family (Western & Global)
  // For English & all global languages: Hometown native grammar & sentence flow adaptation.
  en: { family: 'svo', verbPosition: 'medial', punchlineRule: 'Active conversational wit in mid/early sentence', cadenceDescription: 'Direct, clear, punchy, engaging', isNativeIndic: false },
  es: { family: 'svo', verbPosition: 'medial', punchlineRule: 'Passionate and warm active cadence', cadenceDescription: 'Vibrant, open-hearted, rhythmic', isNativeIndic: false },
  fr: { family: 'svo', verbPosition: 'medial', punchlineRule: 'Nuanced conversational humor', cadenceDescription: 'Philosophical, elegant, relaxed', isNativeIndic: false },
  de: { family: 'svo', verbPosition: 'medial', punchlineRule: 'Structured clarity with warm friendly punch', cadenceDescription: 'Precise, logical, reassuring', isNativeIndic: false },
  ru: { family: 'svo', verbPosition: 'medial', punchlineRule: 'Soulful, direct realization', cadenceDescription: 'Deep, reflective, authentic', isNativeIndic: false },
  it: { family: 'svo', verbPosition: 'medial', punchlineRule: 'Expressive and intimate conversation', cadenceDescription: 'Passionate, lively, family-like', isNativeIndic: false },
  pt: { family: 'svo', verbPosition: 'medial', punchlineRule: 'Gentle and welcoming wit', cadenceDescription: 'Friendly, warm, sunny', isNativeIndic: false },
};

export function getGrammarConfig(languageCode: string): GrammarConfig {
  const code = languageCode.toLowerCase().trim();
  return LANGUAGE_GRAMMAR_MAP[code] || {
    family: 'svo',
    verbPosition: 'medial',
    punchlineRule: 'Clear natural conversation',
    cadenceDescription: 'Warm, heart-touching delivery',
    isNativeIndic: isNativeIndicLanguage(code),
  };
}

/**
 * Returns prompt guidance teaching LLMs how to construct sentences
 * matching the target language's grammatical family (SOV vs SVO)
 * with the strict distinction:
 * - Marathi & Hindi: VERBS ONLY (क्रियापद), NEVER alter sentences or nouns.
 * - English & Other languages: VERBS + FULL SENTENCE STRUCTURAL NATURALIZATION (Hometown system).
 */
export function getGrammarPromptGuidance(languageCode: string): string {
  const config = getGrammarConfig(languageCode);
  const isIndic = isNativeIndicLanguage(languageCode);

  if (isIndic) {
    return `[MARATHI & HINDI - VERBS ONLY GRAMMAR RULE]
Target Language: ${languageCode.toUpperCase()} (Mohan Sir's Native Language).
Mohan Sir speaks Marathi and Hindi directly and knows the exact expression needed.
1. VERBS ONLY (क्रियापद): Adjust ONLY verbs to agree with subject/object gender, number, and tense (e.g. "मी मोहन ला आंबा दिली" -> "मी मोहन ला आंबा दिला" where only दिली -> दिला changes).
2. ZERO NOUN (नाम) OR OBJECT (कर्म) MODIFICATIONS: Do NOT change nouns, objects, or vocabulary.
3. PRESERVE ORIGINAL SENTENCE STRUCTURE: Keep Mohan Sir's authentic spoken sentence phrasing exactly intact. Do not rewrite clauses into foreign literary styles.
4. SOV RULE: Keep terminal verb placement and let comedic timing land on the final verb.`;
  }

  if (config.family === 'sov') {
    return `[GLOBAL SOV - FULL SENTENCE & VERB NATURALIZATION]
Target Language: ${languageCode.toUpperCase()} (SOV Family).
1. FULL SENTENCE STRUCTURAL ADAPTATION (HOMETOWN SYSTEM):
   Convert the sentence into the natural, fluent, native hometown phrasing of this target culture (e.g. Japanese Teinei-go, Korean Jondaetmal, Tamil, Gujarati).
2. SYNTAX: Strictly SOV (Subject - Object - Verb). The action and comedic realization land on the final verb.
3. PRESERVE SACRED YOGIC KNOWLEDGE & HUMOR: Deliver the EXACT same teachings, practical wisdom, and heart-touching humor, adapted seamlessly to native local ears.
4. PRESERVE SACRED TERMS VERBATIM: Swar Yoga, Nadi, Ida, Pingala, Sushumna, Prana.`;
  }

  return `[ENGLISH & GLOBAL SVO - FULL SENTENCE & VERB NATURALIZATION]
Target Language: ${languageCode.toUpperCase()} (SVO Family).
Because English and global languages differ fundamentally from Indian sentence structures, the system must naturalize BOTH verbs and sentence flow.
1. FULL SENTENCE STRUCTURAL ADAPTATION (HOMETOWN SYSTEM):
   Reconstruct the sentence flow to sound completely natural, idiomatic, and polished as a native English/hometown speaker would deliver it.
2. SYNTAX: SVO (Subject - Verb - Object). Use active, clear, dynamic phrasing.
3. DELIVER SAME CONTENT & HUMOR: Preserve the exact same meaning, depth, practical steps, and warmth/humor, but express it naturally rather than through awkward literal translation.
4. PRESERVE SACRED TERMS VERBATIM: Swar Yoga, Swarodaya, Ida Nadi, Pingala Nadi, Sushumna Nadi, Prana, Chakras.`;
}

