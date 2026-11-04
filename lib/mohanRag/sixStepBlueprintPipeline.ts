/**
 * Mohan RAG - 6-Step Ingestion & Master Blueprint Pipeline
 * 
 * STEP 1: New topic arrives (audio transcription, document, or manual entry).
 * STEP 2: Language Check & Routing (inspects vocabulary tokens -> hi, mr, en, etc.).
 * STEP 3: Verbatim Spell Checking (orthography & matras only, exact word fidelity).
 * STEP 4: Grammar Family Check (Identifies SOV vs SVO family).
 * STEP 5: Grammar Engine Check (Applies SOV or SVO rules; adjusts verbs only).
 * STEP 6: Create Main Blueprints:
 *         - SOV Master Blueprint (Plain Text + Hummer/Emotion Text) -> Base for all SOV languages.
 *         - SVO Master Blueprint (Plain Text + Hummer/Emotion Text) -> Base for all SVO languages.
 * 
 * Admin can edit and correct spell-check and grammar at any time.
 * These validated blueprints are the single source of truth for:
 * 1. AI Avatar Video Rendering
 * 2. Mohan RAG Search Engine
 * 3. 43-Language Auto-Conversion Engine
 */

import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { generateAIText } from '@/lib/ai/generateWithFallback';
import { detectTextLanguage, LanguageDetectionResult } from './languageFilterEngine';
import { getGrammarConfig, getGrammarPromptGuidance, GrammarFamily } from './dualGrammarEngine';
import { annotateTranscriptForAvatar } from './avatarCueAnnotator';

export interface TopicBlueprint {
  id: string;
  sourceId?: string;
  topic: string;
  moduleId: string;
  step1RawText: string;
  step2DetectedLanguage: string;
  step2LanguageDetails: LanguageDetectionResult;
  step3SpellcheckedText: string;
  step4GrammarFamily: GrammarFamily;
  step5GrammarApprovedText: string;
  step6SovPlain: string;
  step6SovHummer: string;
  step6SvoPlain: string;
  step6SvoHummer: string;
  status: 'draft' | 'approved';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function ensureBlueprintSchema() {
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS mohan_rag_topic_blueprints_sql (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL DEFAULT '',
      topic TEXT NOT NULL,
      module_id TEXT NOT NULL DEFAULT 'level-1',
      step1_raw_text TEXT NOT NULL,
      step2_detected_language TEXT NOT NULL,
      step3_spellchecked_text TEXT NOT NULL,
      step4_grammar_family TEXT NOT NULL,
      step5_grammar_approved_text TEXT NOT NULL,
      step6_sov_plain TEXT NOT NULL,
      step6_sov_hummer TEXT NOT NULL,
      step6_svo_plain TEXT NOT NULL,
      step6_svo_hummer TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

/**
 * STEP 2: Language Check & Routing
 */
export function executeStep2LanguageCheck(rawText: string): LanguageDetectionResult {
  return detectTextLanguage(rawText);
}

/**
 * STEP 3: Verbatim Spell Checking
 * Zero vocabulary substitution. Matras, anuswar, and speech recognition typos only.
 */
export async function executeStep3SpellCheck(
  text: string,
  languageCode: string,
  options: { signal?: AbortSignal } = {}
): Promise<string> {
  const langName = languageCode === 'mr' ? 'Marathi' : languageCode === 'hi' ? 'Hindi' : 'English';

  const systemPrompt = `CRITICAL RULE - VERBATIM FIDELITY (DO NOT SUBSTITUTE SPOKEN WORDS):
You are the Mohan RAG Master Spell Checker for ${langName}.
1. ZERO VOCABULARY SUBSTITUTION: Preserve every word word-for-word. NEVER replace words or nouns with synonyms or alternate terms.
2. SPELL CHECKING ONLY: Correct speech-recognition typos, misheard phonetics, matras, anuswar, and punctuation of the exact same words.
   - For example in Marathi: fix "शवीर स्थीर" -> "शरीर स्थिर", "सवकाज गले उड़ा" -> "सावकाश डोळे उघडा", "गले बंद करा" -> "डोळे बंद करा".
   - For example in Hindi: fix "गले बंद करा" -> "आँखें बंद करो", "शवीर स्थीर" -> "शरीर स्थिर".
3. STRICT SACRED VEDIC TERMS PRESERVATION (DO NOT DISTORT):
   - स्वर योग, स्वरोदय, नाडी, इडा, पिंगळा, सुषुम्ना, प्राण, कुंभक, नासिका, चंद्र स्वर, सूर्य स्वर.
4. Retain all timestamps [MM:SS–MM:SS] and Minute headers exactly.
5. Return ONLY the spell-checked text, without conversational preamble or markdown code fences.`;

  return generateAIText({
    providerOrder: ['Replicate', 'Gemini', 'OpenAI', 'Anthropic'],
    temperature: 0.1,
    maxOutputTokens: 8192,
    signal: options.signal,
    systemPrompt,
    message: `Spell check and fix speech recognition errors for this ${langName} transcript:\n\n${text}`,
  });
}

/**
 * STEP 4: Grammar Family Check (SOV vs SVO)
 */
export function executeStep4GrammarFamilyCheck(languageCode: string): GrammarFamily {
  const config = getGrammarConfig(languageCode);
  return config.family;
}

/**
 * STEP 5: Grammar Engine Check based on SOV or SVO
 * RULE (CRITICAL):
 * - Marathi & Hindi: Adjust ONLY VERBS (क्रियापद). Do NOT change sentence structure or nouns,
 *   as Mohan Sir spoke these directly.
 * - English & All Other Languages: Adjust BOTH VERBS AND FULL SENTENCE STRUCTURE into their native
 *   hometown colloquial style, while delivering the EXACT same content with the same humor.
 */
export async function executeStep5GrammarCheck(
  spellcheckedText: string,
  languageCode: string,
  options: { signal?: AbortSignal } = {}
): Promise<string> {
  const config = getGrammarConfig(languageCode);
  const guidance = getGrammarPromptGuidance(languageCode);
  const isIndic = languageCode === 'mr' || languageCode === 'hi';

  const systemPrompt = isIndic
    ? `CRITICAL RULE - MARATHI & HINDI GRAMMAR (VERBS ONLY / SENTENCE STRUCTURE UNTOUCHED):
You are the Mohan RAG Grammar Engine for ${languageCode.toUpperCase()}.
Mohan Sir personally speaks Marathi and Hindi. His authentic sentence construction and vocabulary must be preserved.
1. ADJUST ONLY VERBS (क्रियापद): Fix only subject-object-verb agreement, gender, and tense of the verb.
2. ZERO NOUN (नाम) OR OBJECT (कर्म) MODIFICATIONS: Never replace words with synonyms.
3. PRESERVE SENTENCE STRUCTURE: Do not reorganize clauses or rewrite Mohan Sir's sentence layout.
4. Keep all sacred terms verbatim: स्वर योग, स्वरोदय, नाडी, इडा, पिंगळा, सुषुम्ना, प्राण.
5. Retain all timestamps [MM:SS–MM:SS] exactly in place. Return ONLY the text without commentary.`
    : `CRITICAL RULE - GLOBAL LANGUAGE GRAMMAR (VERBS + FULL SENTENCE NATURALIZATION):
You are the Mohan RAG Global Grammar Engine for ${languageCode.toUpperCase()} (${config.family.toUpperCase()} mode).
${guidance}

RULES:
1. HOMETOWN SENTENCE NATURALIZATION: Reconstruct and adapt full sentence flow and verbs so they read and sound completely natural, fluent, and engaging to a native speaker in their hometown.
2. IDENTICAL CONTENT & HUMOR: Deliver the EXACT same Swar Yoga knowledge, spiritual depth, practical instructions, and warmth/humor. Do not drop any facts or comedic nuances.
3. PRESERVE SACRED YOGIC TERMS VERBATIM: Swar Yoga, Swarodaya, Ida Nadi, Pingala Nadi, Sushumna Nadi, Prana, Chakras.
4. Retain all timestamps [MM:SS–MM:SS] exactly in place. Return ONLY the text without commentary.`;

  return generateAIText({
    providerOrder: ['Replicate', 'Gemini', 'OpenAI', 'Anthropic'],
    temperature: isIndic ? 0.1 : 0.2,
    maxOutputTokens: 8192,
    signal: options.signal,
    systemPrompt,
    message: isIndic
      ? `Check and fix verbs only (क्रियापद) for this ${languageCode.toUpperCase()} text:\n\n${spellcheckedText}`
      : `Naturalize verbs and full sentence structure into native hometown ${languageCode.toUpperCase()} with identical content and humor:\n\n${spellcheckedText}`,
  });
}

/**
 * STEP 6: Create Main Blueprints in both SOV and SVO
 * Creates:
 * 1. SOV Blueprint (Plain Text + Hummer/Emotion Text)
 * 2. SVO Blueprint (Plain Text + Hummer/Emotion Text)
 */
export async function executeStep6CreateBlueprints(
  grammarApprovedText: string,
  sourceLanguage: string,
  topic: string,
  options: { signal?: AbortSignal } = {}
): Promise<{
  sovPlain: string;
  sovHummer: string;
  svoPlain: string;
  svoHummer: string;
}> {
  // Determine if source is already SOV (Marathi/Hindi) or SVO (English)
  const isSourceSOV = executeStep4GrammarFamilyCheck(sourceLanguage) === 'sov';

  let sovPlain = '';
  let svoPlain = '';

  if (isSourceSOV) {
    // Source is already SOV (e.g. Marathi or Hindi). Clean it for master SOV textbook.
    sovPlain = grammarApprovedText;

    // Synthesize SVO Master Blueprint (English) from the SOV text
    svoPlain = await generateAIText({
      providerOrder: ['Replicate', 'Gemini', 'OpenAI', 'Anthropic'],
      temperature: 0.2,
      maxOutputTokens: 8192,
      signal: options.signal,
      systemPrompt: `You are the Mohan RAG Master SVO Blueprint Creator.
Convert this classical Swar Yoga lesson into an authoritative SVO Master Blueprint in English.
RULES:
1. Strictly SVO syntax (Subject + Verb + Object). Active, natural, punchy English delivery.
2. Preserve all Sanskrit/Vedic yogic terms: Swar Yoga, Swarodaya, Ida Nadi (Chandra Swara), Pingala Nadi (Surya Swara), Sushumna Nadi, Prana, Kumbhaka, Chakras.
3. Retain complete educational depth and practical instructions word-for-word.
4. Return ONLY the clean SVO text.`,
      message: `Create the SVO English Master Blueprint for topic: "${topic}":\n\n${grammarApprovedText}`,
    });
  } else {
    // Source is SVO (English).
    svoPlain = grammarApprovedText;

    // Synthesize SOV Master Blueprint (Marathi/Hindi) from the SVO text
    sovPlain = await generateAIText({
      providerOrder: ['Replicate', 'Gemini', 'OpenAI', 'Anthropic'],
      temperature: 0.2,
      maxOutputTokens: 8192,
      signal: options.signal,
      systemPrompt: `You are the Mohan RAG Master SOV Blueprint Creator.
Convert this Swar Yoga lesson into an authoritative SOV Master Blueprint in Devanagari (Marathi/Hindi).
RULES:
1. Strictly SOV syntax (Subject + Object + Verb / कर्ता - कर्म - क्रियापद). Terminal verb placement.
2. Preserve all Sanskrit/Vedic yogic terms: स्वर योग, स्वरोदय, नाडी, इडा, पिंगळा, सुषुम्ना, प्राण, कुंभक.
3. Return ONLY the clean SOV text.`,
      message: `Create the SOV Master Blueprint for topic: "${topic}":\n\n${grammarApprovedText}`,
    });
  }

  // Generate Hummer & Emotion cues for both blueprints
  let sovHummer = '';
  let svoHummer = '';

  try {
    sovHummer = await annotateTranscriptForAvatar(sovPlain);
  } catch {
    sovHummer = sovPlain;
  }

  try {
    svoHummer = await annotateTranscriptForAvatar(svoPlain);
  } catch {
    svoHummer = svoPlain;
  }

  return {
    sovPlain: sovPlain.trim(),
    sovHummer: sovHummer.trim(),
    svoPlain: svoPlain.trim(),
    svoHummer: svoHummer.trim(),
  };
}

/**
 * Execute Full 6-Step Pipeline for a Topic
 */
export async function runComplete6StepPipeline(input: {
  topic: string;
  moduleId?: string;
  sourceId?: string;
  rawText: string;
  preferredLanguage?: string;
}): Promise<TopicBlueprint> {
  await ensureBlueprintSchema();

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const rawText = input.rawText.trim();
  const topic = input.topic.trim();
  const moduleId = input.moduleId || 'level-1';

  // STEP 2: Language Check
  const langDetection = executeStep2LanguageCheck(rawText);
  const detectedLang = input.preferredLanguage && input.preferredLanguage !== 'auto'
    ? input.preferredLanguage
    : langDetection.detectedLanguage;

  // STEP 3: Spell Check
  const spellcheckedText = await executeStep3SpellCheck(rawText, detectedLang);

  // STEP 4: Grammar Family
  const grammarFamily = executeStep4GrammarFamilyCheck(detectedLang);

  // STEP 5: Grammar Engine
  const grammarApprovedText = await executeStep5GrammarCheck(spellcheckedText, detectedLang);

  // STEP 6: Blueprints (SOV & SVO, Plain & Hummer)
  const blueprints = await executeStep6CreateBlueprints(grammarApprovedText, detectedLang, topic);

  const blueprint: TopicBlueprint = {
    id,
    sourceId: input.sourceId || '',
    topic,
    moduleId,
    step1RawText: rawText,
    step2DetectedLanguage: detectedLang,
    step2LanguageDetails: langDetection,
    step3SpellcheckedText: spellcheckedText,
    step4GrammarFamily: grammarFamily,
    step5GrammarApprovedText: grammarApprovedText,
    step6SovPlain: blueprints.sovPlain,
    step6SovHummer: blueprints.sovHummer,
    step6SvoPlain: blueprints.svoPlain,
    step6SvoHummer: blueprints.svoHummer,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Persist to Bunny Database
  await bunnyExecute({
    sql: `
      INSERT INTO mohan_rag_topic_blueprints_sql
      (id, source_id, topic, module_id, step1_raw_text, step2_detected_language, step3_spellchecked_text,
       step4_grammar_family, step5_grammar_approved_text, step6_sov_plain, step6_sov_hummer, step6_svo_plain,
       step6_svo_hummer, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id, blueprint.sourceId, blueprint.topic, blueprint.moduleId,
      blueprint.step1RawText, blueprint.step2DetectedLanguage, blueprint.step3SpellcheckedText,
      blueprint.step4GrammarFamily, blueprint.step5GrammarApprovedText,
      blueprint.step6SovPlain, blueprint.step6SovHummer, blueprint.step6SvoPlain, blueprint.step6SvoHummer,
      blueprint.status, blueprint.createdAt, blueprint.updatedAt
    ],
  });

  return blueprint;
}

/**
 * Save Admin Manual Corrections to Blueprint
 */
export async function updateBlueprintAdminCorrections(id: string, updates: {
  step3SpellcheckedText?: string;
  step5GrammarApprovedText?: string;
  step6SovPlain?: string;
  step6SovHummer?: string;
  step6SvoPlain?: string;
  step6SvoHummer?: string;
  status?: 'draft' | 'approved';
  adminNotes?: string;
}): Promise<boolean> {
  await ensureBlueprintSchema();

  const setClauses: string[] = ['updated_at = ?'];
  const args: any[] = [new Date().toISOString()];

  if (updates.step3SpellcheckedText !== undefined) {
    setClauses.push('step3_spellchecked_text = ?');
    args.push(updates.step3SpellcheckedText);
  }
  if (updates.step5GrammarApprovedText !== undefined) {
    setClauses.push('step5_grammar_approved_text = ?');
    args.push(updates.step5GrammarApprovedText);
  }
  if (updates.step6SovPlain !== undefined) {
    setClauses.push('step6_sov_plain = ?');
    args.push(updates.step6SovPlain);
  }
  if (updates.step6SovHummer !== undefined) {
    setClauses.push('step6_sov_hummer = ?');
    args.push(updates.step6SovHummer);
  }
  if (updates.step6SvoPlain !== undefined) {
    setClauses.push('step6_svo_plain = ?');
    args.push(updates.step6SvoPlain);
  }
  if (updates.step6SvoHummer !== undefined) {
    setClauses.push('step6_svo_hummer = ?');
    args.push(updates.step6SvoHummer);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    args.push(updates.status);
  }
  if (updates.adminNotes !== undefined) {
    setClauses.push('admin_notes = ?');
    args.push(updates.adminNotes);
  }

  args.push(id);

  await bunnyExecute({
    sql: `UPDATE mohan_rag_topic_blueprints_sql SET ${setClauses.join(', ')} WHERE id = ?`,
    args,
  });

  return true;
}
