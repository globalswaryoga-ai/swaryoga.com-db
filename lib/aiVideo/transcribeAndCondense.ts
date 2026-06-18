// Audio buffer -> Gemini pipeline, split into three deliberately separate,
// strict stages so nothing gets silently invented along the way:
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

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return apiKey;
}

function getModel(): string {
  // gemini-2.0-flash's free-tier quota is now 0 (sunset) — confirmed live, 2.5-flash works.
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

async function uploadAudioToGemini(buffer: Buffer, mimeType: string, displayName: string, apiKey: string): Promise<string> {
  const startRes = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(buffer.length),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });

  if (!startRes.ok) {
    throw new Error(`Gemini Files API upload-start failed: ${startRes.status} ${await startRes.text()}`);
  }
  const uploadUrl = startRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini Files API did not return an upload URL');

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(buffer.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: buffer as any,
  });

  if (!uploadRes.ok) {
    throw new Error(`Gemini Files API upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }
  const uploadData = await uploadRes.json();
  const fileUri = uploadData?.file?.uri;
  if (!fileUri) throw new Error('Gemini Files API response missing file.uri');
  return fileUri;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini's free tier returns transient 503 "high demand" errors fairly
// often, and 429s that can be either a short per-minute throttle (worth
// retrying) or the free tier's per-day request cap (NOT worth retrying —
// it won't reset for hours). Distinguish them via the structured
// RetryInfo/QuotaFailure details Gemini includes, instead of guessing.
async function generateText(parts: any[], maxOutputTokens = 8192, attempt = 1): Promise<string> {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const details: any[] = data?.error?.details || [];
    const isDailyCap = details.some((d) => String(d?.quotaId || '').includes('PerDay'));
    const retryDelaySeconds = Number((details.find((d) => d?.retryDelay)?.retryDelay || '').replace(/s$/, '')) || null;

    if (!isDailyCap && (res.status === 503 || res.status === 429) && attempt < 4) {
      await sleep((retryDelaySeconds ? retryDelaySeconds * 1000 : attempt * 3000) + 500);
      return generateText(parts, maxOutputTokens, attempt + 1);
    }

    const baseMessage = data?.error?.message || res.statusText;
    const message = isDailyCap
      ? `Gemini free-tier daily request limit reached for this API key (20/day on ${getModel()}). It resets after 24h — try again later, or switch to a paid Gemini plan / different key. (${baseMessage})`
      : `Gemini request failed: ${baseMessage}`;
    throw new Error(message);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return text;
}

// Whisper fallback for transcription only — used when Gemini fails (e.g.
// the free tier's daily cap) and OPENAI_API_KEY is configured. Whisper's
// endpoint caps uploads at 25MB, which is fine for the buffer sizes this
// pipeline has seen so far but won't hold for a full ~1hr workshop recording
// at high bitrate — acceptable since this is a fallback path, not primary.
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

// Text-only stages fall back to OpenAI (via the shared helper) if Gemini
// fails and OPENAI_API_KEY is configured, instead of just erroring out.
async function generateTextWithFallback(promptText: string, maxOutputTokens = 8192): Promise<string> {
  try {
    return await generateText([{ text: promptText }], maxOutputTokens);
  } catch (geminiError) {
    if (!process.env.OPENAI_API_KEY) throw geminiError;
    const { generateAIText } = await import('@/lib/ai/generateWithFallback');
    return generateAIText({ message: promptText, maxOutputTokens });
  }
}

// Stage 1: verbatim transcript, source language, no cleanup.
export async function transcribeAudio(audio: ExtractedAudio, topicTitle: string): Promise<string> {
  const prompt = `This audio is a recorded workshop session titled "${topicTitle}". Transcribe it verbatim, in the language it was spoken in. Do not summarize, translate, or clean it up — output the raw transcript only.`;
  try {
    const apiKey = getApiKey();
    const fileUri = await uploadAudioToGemini(audio.buffer, audio.mimeType, topicTitle, apiKey);
    return await generateText([{ text: prompt }, { file_data: { mime_type: audio.mimeType, file_uri: fileUri } }]);
  } catch (geminiError) {
    if (!process.env.OPENAI_API_KEY) throw geminiError;
    return transcribeViaWhisper(audio);
  }
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
