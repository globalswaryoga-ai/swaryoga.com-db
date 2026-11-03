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

<<<<<<< HEAD
const LANGUAGE_NAMES: Record<string, string> = {
=======
export const LANGUAGE_NAMES: Record<string, string> = {
  hi: 'Hindi',
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
  en: 'English',
  english: 'English',
  hi: 'Hindi',
  hindi: 'Hindi',
  mr: 'Marathi',
<<<<<<< HEAD
  marathi: 'Marathi',
  kn: 'Kannada',
=======
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
  ne: 'Nepali',
  zh: 'Mandarin Chinese',
  es: 'Spanish',
  fr: 'French',
  ar: 'Arabic',
  de: 'German',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  it: 'Italian',
  tr: 'Turkish',
<<<<<<< HEAD
  nl: 'Dutch',
  sv: 'Swedish',
  th: 'Thai',
  id: 'Indonesian',
=======
  gu: 'Gujarati',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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
async function transcribeViaWhisper(audio: ExtractedAudio, options: { language?: string } = {}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

<<<<<<< HEAD
  const maxAudioBytes = 24 * 1024 * 1024;
  if (audio.buffer.length > maxAudioBytes) {
    throw new Error(
      `Audio file is ${(audio.buffer.length / (1024 * 1024)).toFixed(1)}MB, exceeding the 24MB Whisper limit. Please compress to 48kbps mono MP3 using the converter.`
    );
  }

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio.buffer)], { type: audio.mimeType || 'audio/mpeg' }), 'audio.mp3');
=======
  // Determine correct file extension for OpenAI Whisper multipart form
  let filename = 'audio.mp3';
  let mimeType = audio.mimeType || 'audio/mpeg';
  if (mimeType.includes('mp4')) filename = 'video.mp4';
  else if (mimeType.includes('wav')) filename = 'audio.wav';
  else if (mimeType.includes('webm')) filename = 'audio.webm';
  else if (mimeType.includes('m4a')) filename = 'audio.m4a';

  let sendBuffer = audio.buffer;

  // For MP4/video files or files over 20MB: extract and compress audio track
  // to 64k mono MP3 via ffmpeg so any video (even large 100MB+ workshops)
  // converts effortlessly under Whisper's 25MB limit.
  if (mimeType.includes('video') || mimeType.includes('mp4') || sendBuffer.length > 20 * 1024 * 1024) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      const { execSync } = await import('child_process');

      const tmpDir = os.tmpdir();
      const ext = filename.split('.').pop() || 'mp4';
      const inPath = path.join(tmpDir, `in_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`);
      const outPath = path.join(tmpDir, `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`);

      const ffmpegBin =
        process.env.FFMPEG_PATH ||
        (fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');

      fs.writeFileSync(inPath, sendBuffer);
      execSync(`"${ffmpegBin}" -y -i "${inPath}" -vn -acodec libmp3lame -b:a 64k -ac 1 "${outPath}" 2>/dev/null`);

      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
        sendBuffer = fs.readFileSync(outPath);
        filename = 'audio.mp3';
        mimeType = 'audio/mpeg';
        try { fs.unlinkSync(outPath); } catch {}
      }
      try { fs.unlinkSync(inPath); } catch {}
    } catch (ffmpegErr) {
      console.warn('[Whisper] ffmpeg audio extraction fallback:', ffmpegErr);
    }
  }

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(sendBuffer)], { type: mimeType }), filename);
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
  form.append('model', 'whisper-1');
  const transcriptionPrompts: Record<string, string> = {
    hi: 'यह स्वर योग और स्वरोदय पर हिंदी शिक्षण है। संस्कृत और योग शब्द सही देवनागरी में लिखें: स्वर, स्वरोदय, नाड़ी, इड़ा, पिंगला, सुषुम्ना, प्राण, नासिका, सूर्य स्वर, चंद्र स्वर। मूल बोली गई हिंदी लिखें; अनुवाद या सारांश न करें।',
    mr: 'हा स्वरयोग आणि स्वरोदय विषयावरील मराठी धडा आहे. संज्ञा योग्य देवनागरीत लिहा: स्वर, स्वरोदय, नाडी, इडा, पिंगला, सुषुम्ना, प्राण, नासिका, सूर्य स्वर, चंद्र स्वर. बोललेले शब्द जसेच्या तसे लिहा; भाषांतर किंवा सारांश नको.',
    en: 'This is a Swar Yoga lesson. Preserve these terms: Swar Yoga, Swarodaya, nadi, ida, pingala, sushumna, prana, nostril, Surya Swar, Chandra Swar. Transcribe the spoken words verbatim; do not translate or summarize.',
  };
  if (options.language && ['en', 'hi', 'mr'].includes(options.language)) {
    form.append('language', options.language);
    form.append('prompt', transcriptionPrompts[options.language]);
  }

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form as any,
  });

  const rawText = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    if (res.status === 413 || rawText.includes('Request Entity') || rawText.includes('Too Large')) {
      throw new Error(`Audio file exceeds Whisper API size limit (25MB). Please compress the audio to 48kbps mono MP3.`);
    }
    throw new Error(`Whisper API error (${res.status}): ${rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)}`);
  }

  if (!res.ok) {
    const errorMsg = data?.error?.message || res.statusText || rawText.slice(0, 150);
    throw new Error(`Whisper error: ${errorMsg}`);
  }
  if (!data?.text) throw new Error('Whisper returned no text');
  return data.text;
}

// Text-only stages: OpenAI first, Anthropic as the only fallback. Gemini is
// deliberately excluded here (not just deprioritized) — its shared
// 20-requests/day free-tier quota kept causing cross-feature outages, and
// this pipeline now has a paid OpenAI key configured (OPENAI_API_KEY) that
// doesn't need a free-tier crutch.
async function generateTextWithFallback(promptText: string, maxOutputTokens = 8192, signal?: AbortSignal): Promise<string> {
  const { generateAIText } = await import('@/lib/ai/generateWithFallback');
  return generateAIText({ message: promptText, maxOutputTokens, providerOrder: ['OpenAI', 'Anthropic'], signal });
}

// Stage 1: verbatim transcript, source language, no cleanup. OpenAI Whisper
// only — no Gemini fallback. If Whisper fails, the error propagates as-is
// rather than masking the real cause behind an unrelated provider's error.
export async function transcribeAudio(audio: ExtractedAudio, options: { language?: string } = {}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  return transcribeViaWhisper(audio, options);
}

/** Whisper transcript with real segment timestamps for media-library timelines. */
export async function transcribeAudioWithTimestamps(audio: ExtractedAudio, options: { language?: string } = {}): Promise<{
  text: string;
  language?: string;
  segments: Array<{ start: number; end: number; text: string }>;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  if (audio.buffer.length > 24 * 1024 * 1024) throw new Error('Audio exceeds the 24 MB Whisper limit after compression.');
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio.buffer)], { type: audio.mimeType || 'audio/mpeg' }), 'audio.mp3');
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  const supportedLanguages = new Set(['en', 'hi', 'mr']);
  if (options.language && supportedLanguages.has(options.language)) form.append('language', options.language);
  const prompts: Record<string, string> = {
    hi: 'यह स्वर योग और स्वरोदय पर हिंदी शिक्षण है। संस्कृत और योग शब्दों को सही देवनागरी में लिखें: स्वर, स्वरोदय, नाड़ी, इड़ा, पिंगला, सुषुम्ना, प्राण, नासिका, सूर्य स्वर, चंद्र स्वर। मूल बोली गई हिंदी लिखें; अनुवाद या सारांश न करें।',
    mr: 'हा स्वरयोग आणि स्वरोदय विषयावरील मराठी धडा आहे. संस्कृत आणि योग संज्ञा योग्य देवनागरीत लिहा: स्वर, स्वरोदय, नाडी, इडा, पिंगला, सुषुम्ना, प्राण, नासिका, सूर्य स्वर, चंद्र स्वर. बोललेले शब्द जसेच्या तसे लिहा; भाषांतर किंवा सारांश करू नका.',
    en: 'This is a Swar Yoga lesson. Preserve these Sanskrit terms: Swar Yoga, Swarodaya, nadi, ida, pingala, sushumna, prana, nostril, Surya Swar, Chandra Swar. Transcribe the spoken words verbatim; do not translate or summarize.',
  };
  const prompt = options.language ? prompts[options.language] : undefined;
  if (prompt) form.append('prompt', prompt);
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form as any,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') throw new Error('Whisper transcription timed out after 2 minutes. Retry with a shorter or compressed file.');
    throw error;
  }
  const raw = await response.text();
  let data: any;
  try { data = JSON.parse(raw); } catch {
    throw new Error(`Whisper timestamp transcription failed (${response.status}): ${raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)}`);
  }
  if (!response.ok) throw new Error(`Whisper timestamp transcription failed: ${data?.error?.message || response.statusText}`);
  const segments = Array.isArray(data?.segments) ? data.segments
    .filter((segment: any) => Number.isFinite(Number(segment.start)) && Number.isFinite(Number(segment.end)) && typeof segment.text === 'string')
    .map((segment: any) => ({ start: Number(segment.start), end: Number(segment.end), text: segment.text.trim() }))
    .filter((segment: { text: string }) => segment.text) : [];
  if (!segments.length) throw new Error('Whisper returned no timestamped speech segments.');
  return { text: String(data.text || segments.map((segment: { text: string }) => segment.text).join(' ')), language: typeof data.language === 'string' ? data.language : undefined, segments };
}

// Stage 2: faithful correction only — fix grammar/spelling/transcription
// mistakes and strip filler words/exact repetition. Must never add content,
// facts, or sentences that weren't actually said. This is the text the admin
// reviews before anything downstream happens.
export async function correctTranscript(rawTranscript: string, sourceLanguage: string, signal?: AbortSignal): Promise<string> {
  const languageName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const prompt = `Here is a raw, verbatim transcript of a spoken workshop session in ${languageName}. Correct only grammar, spelling, and obvious speech-to-text transcription errors, and remove filler words ("um", "you know") and exact repeated phrases. Do NOT translate. Do NOT add any new sentence, fact, or idea that is not already present in the transcript below — if something is unclear, leave it as close to the original wording as possible rather than inventing a replacement. Do NOT shorten or summarize; keep the same length and content, just cleaned up. Output only the corrected transcript, no commentary.\n\nTranscript:\n${rawTranscript}`;
  return generateTextWithFallback(prompt, 8192, signal);
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

  const prompt = `Here is a corrected transcript of a workshop session titled "${topicTitle}", in ${sourceName}. Translate and rewrite it as a polished spoken script suitable for an AI avatar in ${targetName}.${translateClause} 

STRICT LENGTH & FAITHFULNESS RULES:
1. If the input is short (a single sentence, single line, or short paragraph), translate ONLY that exact content at its natural length. Do NOT pad, lengthen, or invent any new speech.
2. If the input is a long workshop session, condense it ONLY by removing live audience Q&A, banter, and repetitive tangents — never by adding new facts or examples.
3. Every single word of your output must be in ${targetName} ONLY.
4. Do not include labels, notes, or explanations. The first character of your response must be the first word of the script itself.

Corrected transcript:
${correctedTranscript}`;
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
