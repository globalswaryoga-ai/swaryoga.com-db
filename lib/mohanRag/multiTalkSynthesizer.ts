/**
 * Multi-Talk Knowledge Synthesizer for Mohan RAG
 * 
 * Handles cases where the same topic appears across 3-4 talks in multiple languages
 * (e.g. 20m Marathi, 30m Hindi, 40m English, 50m Workshop on Pranayama).
 * 
 * Merges best-of-all elements without repetition or conflict:
 * - Crisp structure from English
 * - Spiritual depth & shlokas from Hindi
 * - Warmth, relatable humor & stories from Marathi
 * 
 * Generates adaptive length speeches (30s Reel, 3-min Lesson, or Masterclass)
 * formatted for the target language's grammatical family (SOV vs SVO).
 */

import { generateAIText } from '@/lib/ai/generateWithFallback';
import { searchApprovedKnowledge, type MohanRagModule } from './knowledgeRepository';
import { getGrammarPromptGuidance, getGrammarConfig } from './dualGrammarEngine';
import { getCulturalPromptGuidance } from './culturalContextEngine';
import { simplifyForSpokenDelivery } from './swarLexicon';

export type DeliveryDuration = 'reel_30s' | 'lesson_3m' | 'master_15m';

export interface MultiTalkSynthesisRequest {
  topic: string;
  moduleId?: MohanRagModule;
  targetLanguage: string;
  duration: DeliveryDuration;
  customIntent?: string;
}

export interface MultiTalkSynthesisResult {
  topic: string;
  targetLanguage: string;
  duration: DeliveryDuration;
  grammarFamily: 'sov' | 'svo';
  script: string;
  estimatedSeconds: number;
  wordCount: number;
  sourcesUsed: Array<{
    sourceId: string;
    title: string;
    moduleId: string;
  }>;
}

const DURATION_CONSTRAINTS: Record<DeliveryDuration, { maxWords: number; targetSeconds: number; styleInstruction: string }> = {
  reel_30s: {
    maxWords: 75,
    targetSeconds: 30,
    styleInstruction: 'Create a high-energy, captivating 30-second video hook. Start with an arresting question about daily life, give ONE immediate Swar Yoga secret, and end with an empowering takeaway.',
  },
  lesson_3m: {
    maxWords: 420,
    targetSeconds: 180,
    styleInstruction: 'Create a complete, beautifully paced 3-minute Avatar teaching lesson. Include: 1) A warm smiling greeting, 2) A relatable daily habit or humorous anecdote, 3) The core Swar Yoga principle explained simply, 4) A 20-second guided breathing observation pause, and 5) An inspiring closing.',
  },
  master_15m: {
    maxWords: 1600,
    targetSeconds: 900,
    styleInstruction: 'Create a profound, comprehensive masterclass discourse. Deeply explain the Shiva Swarodaya verses, the subtle Nadi transitions, practical health/digestion applications, common student mistakes, and life transformation.',
  },
};

export async function synthesizeMohanAvatarScript(
  request: MultiTalkSynthesisRequest
): Promise<MultiTalkSynthesisResult> {
  const targetLang = request.targetLanguage.toLowerCase();
  const grammarConfig = getGrammarConfig(targetLang);
  const durationConfig = DURATION_CONSTRAINTS[request.duration] || DURATION_CONSTRAINTS.lesson_3m;

  // Retrieve matching knowledge across modules
  const modules: MohanRagModule[] = request.moduleId
    ? [request.moduleId]
    : ['level1', 'level2', 'why', 'general'];

  const sources = await searchApprovedKnowledge({
    moduleIds: modules,
    query: request.topic,
    limit: 10,
  });

  const sourcesUsed = Array.from(
    new Map(
      sources.map(s => [s.sourceId, { sourceId: s.sourceId, title: s.title, moduleId: s.moduleId }])
    ).values()
  );

  const contextText = sources.length
    ? sources.map((s, idx) => `[Source ${idx + 1}: ${s.title} (${s.moduleId})]\n${s.content}`).join('\n\n')
    : `Topic: ${request.topic} (Grounded in Shiva Swarodaya Swar Yoga traditions)`;

  const grammarGuidance = getGrammarPromptGuidance(targetLang);
  const culturalGuidance = getCulturalPromptGuidance(targetLang);

  const prompt = `You are writing a script for Mohan Sir's authentic AI Digital Avatar Clone.
Speak naturally in the 1st person as Mohan Sir ("I am Mohan Sir", or "नमस्ते/नमस्कार, मी मोहन सर").

[TASK]
Topic: "${request.topic}"
${request.customIntent ? `Specific User Goal: "${request.customIntent}"` : ''}
Target Delivery Duration: ${request.duration} (~${durationConfig.maxWords} words, exactly ~${durationConfig.targetSeconds} seconds).
Language: ${targetLang}

[SPEECH FORMAT & RULES]
1. ${durationConfig.styleInstruction}
2. COLLOQUIAL SPOKEN LANGUAGE: Use ONLY simple, warm, everyday conversational words that normal families speak at home. NEVER use heavy academic or archaic textbook terms.
   - In Marathi: ALWAYS use 'नाकपुडी' for nostril (डावी नाकपुडी, उजवी नाकपुडी). NEVER use 'नथुनी' (which means nose-ring!).
   - In Hindi: ALWAYS use 'नाक का छिद्र' or 'दायां/बायां स्वर'.
3. WARMTH & WIT: Include Mohan Sir's characteristic gentle smile, relatable daily humor (e.g., morning tea, afternoon heavy meals, moods), and loving encouragement.
4. CRITICAL NEGATIVE CONSTRAINT: NEVER write repetitive phonetic laughter sounds like "हा हा हा", "hehe", or "hahaha". Express humor solely through witty, warm conversational remarks and optional [face:smiling] cues.
5. SACRED TERMS: Keep sacred terms accurate (Ida, Pingala, Sushumna, Swara, Prana, Shiva Swarodaya).
6. LENGTH CONTROL: For ${request.duration}, keep the speech strictly under ${durationConfig.maxWords} words so it fits the video duration.
7. DELIVERY CUES: You may add optional avatar delivery tags: [face:smiling], [face:neutral], [emotion:warm:80], [emotion:devotional:90], or [pause:2s]. These tags are not spoken out loud.

${grammarGuidance}

${culturalGuidance}

[APPROVED SOURCE KNOWLEDGE FROM MOHAN SIR'S TALKS]
${contextText}

Generate the final spoken script now in ${targetLang}:`;

  const maxTokens = request.duration === 'reel_30s' ? 350 : request.duration === 'lesson_3m' ? 1400 : 4096;

  const generated = await generateAIText({
    systemPrompt: 'You are the official script architect for Mohan Sir, master of Swar Yoga. You craft authentic, warm, heart-touching teachings that feel intimate and transformative.',
    message: prompt,
    maxOutputTokens: maxTokens,
    temperature: 0.2,
  });

  // Clean markdown fencing if any
  let cleanScript = generated.replace(/^```(?:text|markdown)?\s*|\s*```$/g, '').trim();
  // Strip intro preambles like "Here is the final spoken script in Marathi:"
  cleanScript = cleanScript.replace(/^(?:Here is the (?:final )?spoken script[^\n]*\n+|^\*\*[^\n]+\*\*\n+)/i, '').trim();

  // Apply colloquial spoken simplifier for supported base languages
  if (targetLang === 'en' || targetLang === 'hi' || targetLang === 'mr') {
    cleanScript = simplifyForSpokenDelivery(cleanScript, targetLang);
  }

  const wordCount = cleanScript.split(/\s+/).filter(Boolean).length;
  // Average speaking pace: ~130 words per minute (~2.15 words per second)
  const estimatedSeconds = Math.round((wordCount / 130) * 60);

  return {
    topic: request.topic,
    targetLanguage: targetLang,
    duration: request.duration,
    grammarFamily: grammarConfig.family,
    script: cleanScript,
    estimatedSeconds,
    wordCount,
    sourcesUsed,
  };
}
