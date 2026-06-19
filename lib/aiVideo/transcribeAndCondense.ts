// Audio buffer -> text pipeline (OpenAI Whisper for transcription, OpenAI/
// Anthropic for every text stage — Gemini is intentionally not used anywhere
// in this file, see generateTextWithFallback/transcribeAudio below), split
// into three deliberately separate, strict stages so nothing gets silently
// invented along the way:
//
// 1. transcribeAudio        — raw transcript, verbatim, source language only.
// 2. correctTranscript      — fixes grammar/STT mistakes and removes filler,
//                              but must NOT add content that wasn't said.
//                              The admin reviews this before anything else
//                              happens — this is the "correction" checkpoint.
// 3. condenseAndTranslate   — per target language: trims to ~30 min by
//                              CUTTING material (live Q&A, tangents, repeats),
//                              never by adding new content; translates if the
//                              target language differs from the source.
//
// The admin uploads the source audio file directly (exported from Final Cut
// or any tool) rather than this pulling it from a YouTube URL —
// @distube/ytdl-core cannot currently download from YouTube (their
// anti-throttling "n transform" parsing is broken against the current
// player, confirmed via a live test; open upstream issue:
// https://github.com/distubejs/ytdl-core/issues/144).

const LANGUAGE_NAMES: Record<string, string> = {
  hi: 'Hindi',
  en: 'English',
  mr: 'Marathi',
};

export interface ExtractedAudio {
  buffer: Buffer;
  mimeType: string;
}

// Whisper's endpoint caps uploads at 25MB, which is fine for the buffer
// sizes this pipeline has seen so far but won't hold for a full ~1hr
// workshop recording at high bitrate — if that becomes a real problem,
// split/compress the audio before calling this rather than reaching for a
// different provider's API.
async function transcribeViaWhisper(audio: ExtractedAudio): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio.buffer)], { type: audio.mimeType }), 'audio');
  form.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form as any,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Whisper error: ${data?.error?.message || res.statusText}`);
  if (!data.text) throw new Error('Whisper returned no text');
  return data.text;
}

// Text-only stages: OpenAI first, Anthropic as the only fallback. Gemini is
// deliberately excluded here (not just deprioritized) — its shared
// 20-requests/day free-tier quota kept causing cross-feature outages, and
// this pipeline now has a paid OpenAI key configured (OPENAI_API_KEY) that
// doesn't need a free-tier crutch.
async function generateTextWithFallback(promptText: string, maxOutputTokens = 8192): Promise<string> {
  const { generateAIText } = await import('@/lib/ai/generateWithFallback');
  return generateAIText({ message: promptText, maxOutputTokens, providerOrder: ['OpenAI', 'Anthropic'] });
}

// Stage 1: verbatim transcript, source language, no cleanup. OpenAI Whisper
// only — no Gemini fallback. If Whisper fails, the error propagates as-is
// rather than masking the real cause behind an unrelated provider's error.
export async function transcribeAudio(audio: ExtractedAudio): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  return transcribeViaWhisper(audio);
}

// Stage 2: faithful correction only — fix grammar/spelling/transcription
// mistakes and strip filler words/exact repetition. Must never add content,
// facts, or sentences that weren't actually said. This is the text the admin
// reviews before anything downstream happens.
export async function correctTranscript(rawTranscript: string, sourceLanguage: string): Promise<string> {
  const languageName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const prompt = `Here is a raw, verbatim transcript of a spoken workshop session in ${languageName}. Correct only grammar, spelling, and obvious speech-to-text transcription errors, and remove filler words ("um", "you know") and exact repeated phrases. Do NOT translate. Do NOT add any new sentence, fact, or idea that is not already present in the transcript below — if something is unclear, leave it as close to the original wording as possible rather than inventing a replacement. Do NOT shorten or summarize; keep the same length and content, just cleaned up. Output only the corrected transcript, no commentary.\n\nTranscript:\n${rawTranscript}`;
  return generateTextWithFallback(prompt);
}

// Stage 3: per-language, condenses to ~30 min by CUTTING material (live Q&A,
// tangents, redundant repetition) — never by adding new content — and
// translates if the target language differs from the source.
export async function condenseAndTranslate(correctedTranscript: string, sourceLanguage: string, targetLanguage: string, topicTitle: string): Promise<string> {
  const sourceName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const translateClause = sourceLanguage === targetLanguage
    ? ''
    : ` Translate it faithfully from ${sourceName} into ${targetName} — translate meaning, not word-for-word, so it sounds natural when spoken aloud in ${targetName}.`;

  const prompt = `Here is a corrected transcript of a workshop session titled "${topicTitle}", in ${sourceName}. Rewrite it as a polished spoken lecture script suitable for an AI avatar to read aloud in about 30 minutes (roughly 4000-4500 words).${translateClause} Condense it ONLY by removing material that is already there — live audience Q&A, tangents, redundant explanations of the same point — restructured into a clear, natural-sounding lecture. Do NOT add any new content, fact, or example that is not already in the transcript below. If the transcript is shorter than 30 minutes of content, output it at its natural length rather than padding it with invented material.\n\nYour entire response must be the final script in ${targetName} ONLY — every single word of your output must be in ${targetName}. Do not include the original-language version, do not include a translation of your own output back into ${sourceName}, do not add labels like "${targetName} Script:" or "${sourceName} Script:", and do not add any heading, note, or explanation. The first character of your response must be the first word of the ${targetName} script itself.\n\nCorrected transcript:\n${correctedTranscript}`;
  return generateTextWithFallback(prompt);
}

// E-book chapter: a different register from the spoken script above — proper
// written prose suitable for a book page, not a 30-min cap, no spoken-style
// transitions ("welcome everyone", "let's begin"). Same faithfulness rule as
// every other stage: no new facts, examples, or content beyond what's in the
// corrected transcript — only reformatted for reading instead of listening.
export async function rewriteForReading(correctedTranscript: string, sourceLanguage: string, targetLanguage: string, topicTitle: string): Promise<string> {
  const sourceName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const translateClause = sourceLanguage === targetLanguage
    ? ''
    : ` Translate it faithfully from ${sourceName} into ${targetName} as you go — translate meaning, not word-for-word, so it reads naturally in ${targetName}.`;

  const prompt = `Here is a corrected transcript of a workshop session titled "${topicTitle}", in ${sourceName}. Rewrite it as a book chapter — proper written prose for a reader, not a spoken script.${translateClause} Remove spoken-style transitions and audience address ("welcome everyone", "let's begin", "are there any questions", "thank you everyone") and live audience Q&A, replacing them with normal written narrative flow. Keep every fact, instruction, and example exactly as taught — do NOT add any new content, fact, or example that is not already in the transcript below, and do NOT shorten the substance (this is not a 30-minute cap like a spoken script — keep the full teaching content, just remove the spoken-only framing).\n\nYour entire response must be the chapter text in ${targetName} ONLY — no labels, no headings like "Chapter" or language names, no commentary. The first character of your response must be the first word of the chapter itself.\n\nCorrected transcript:\n${correctedTranscript}`;
  return generateTextWithFallback(prompt, 8192);
}
