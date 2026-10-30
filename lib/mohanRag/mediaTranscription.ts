import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { transcribeAudioWithTimestamps } from '@/lib/aiVideo/transcribeAndCondense';
import { generateAIText } from '@/lib/ai/generateWithFallback';
import { annotateTranscriptForAvatar } from './avatarCueAnnotator';

export const MAX_MEDIA_BYTES = 350 * 1024 * 1024;
const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
const MAX_STREAM_MEDIA_BYTES = 5 * 1024 * 1024 * 1024;

export type TimedSpeechSegment = { start: number; end: number; text: string };
export type AnalyzedMedia = {
  title: string;
  extension: string;
  language?: string;
  segments: TimedSpeechSegment[];
  timeline: string;
  annotatedTimeline: string;
  emotionSuggestionsAdded: boolean;
  cueWarning: string;
  correctionApplied: boolean;
  correctionWarning: string;
};

async function streamToBuffer(stream: Readable, maxBytes: number) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const value of stream) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    size += chunk.length;
    if (size > maxBytes) {
      stream.destroy(new Error(`Media exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB processing limit.`));
      throw new Error(`Media exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB processing limit.`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

export async function fetchBunnyMedia(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5 * 60 * 1000) });
  if (!response.ok || !response.body) throw new Error(`Could not read the Bunny media URL (${response.status}). Check that its CDN link is public and active.`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_MEDIA_BYTES) throw new Error('Bunny media exceeds the 350 MB processing limit.');
  const buffer = await streamToBuffer(Readable.fromWeb(response.body as any), MAX_MEDIA_BYTES);
  const pathname = new URL(url).pathname;
  const extension = pathname.split('.').pop()?.toLowerCase() || '';
  if (!['mp3', 'mp4', 'm4a', 'mpga', 'mpeg', 'wav', 'webm', 'mov'].includes(extension)) throw new Error('Use a direct Bunny CDN media URL or Bunny Stream player URL.');
  let title = pathname.split('/').pop() || 'Bunny media';
  try { title = decodeURIComponent(title); } catch { /* Keep URL-safe title. */ }
  return { buffer, title: title.replace(/\.[^.]+$/, ''), extension };
}

export async function fetchYouTubeMedia(url: string) {
  const binary = process.env.YT_DLP_PATH || 'yt-dlp';
  const args = ['--no-playlist', '--no-warnings', '--format', 'best[ext=mp4][vcodec!=none][acodec!=none]', '--output', '-', url];
  if (process.env.YOUTUBE_COOKIES_FILE) args.splice(args.length - 1, 0, '--cookies', process.env.YOUTUBE_COOKIES_FILE);
  return new Promise<{ buffer: Buffer; title: string; extension: string }>((resolve, reject) => {
    const videoId = new URL(url).searchParams.get('v') || new URL(url).pathname.split('/').filter(Boolean).pop() || 'video';
    let stderr = '';
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 180_000);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-3000); });
    const output = streamToBuffer(child.stdout as Readable, MAX_MEDIA_BYTES);
    child.on('error', error => { clearTimeout(timeout); reject(new Error(`yt-dlp could not start. Install yt-dlp on the server or set YT_DLP_PATH. ${error.message}`)); });
    child.on('close', async code => {
      clearTimeout(timeout);
      try {
        const buffer = await output;
        if (code !== 0) return reject(new Error(`YouTube download failed: ${stderr.trim().slice(-1200) || `yt-dlp exited ${code}`}`));
        if (!buffer.length) return reject(new Error('YouTube returned an empty video stream.'));
        resolve({ buffer, title: `YouTube ${videoId}`.slice(0, 240), extension: 'mp4' });
      } catch (error) { reject(error); }
    });
  });
}

async function extractAudio(buffer: Buffer, extension: string) {
  if (['mp3', 'mpga', 'mpeg'].includes(extension)) return buffer;
  return new Promise<Buffer>((resolve, reject) => {
    const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-ac', '1', '-b:a', '48k', '-f', 'mp3', 'pipe:1']);
    const chunks: Buffer[] = [];
    let size = 0;
    let stderr = '';
    const timeout = setTimeout(() => child.kill('SIGKILL'), 120_000);
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_AUDIO_BYTES) {
        child.kill('SIGKILL');
        reject(new Error('Compressed audio exceeds Whisper’s 24 MB limit. Split this recording into shorter sources.'));
        return;
      }
      chunks.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => { stderr = `${stderr}${chunk.toString()}`.slice(-2000); });
    child.on('error', error => { clearTimeout(timeout); reject(new Error(`FFmpeg could not start. Install FFmpeg on the server or set FFMPEG_PATH. ${error.message}`)); });
    child.on('close', code => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(`Could not extract audio from media: ${stderr || `FFmpeg exited ${code}`}`));
      if (!chunks.length) return reject(new Error('No audio track was found in the media.'));
      resolve(Buffer.concat(chunks, size));
    });
    child.stdin.on('error', error => reject(error));
    child.stdin.end(buffer);
  });
}

async function extractAudioSegmentsFromBunnyUrl(url: string): Promise<Array<{ buffer: Buffer; offsetSeconds: number }>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(3 * 60 * 60 * 1000) });
  if (!response.ok || !response.body) throw new Error(`Could not read Bunny media for MP3 conversion (${response.status}).`);
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_STREAM_MEDIA_BYTES) throw new Error('Bunny media exceeds the 5 GB processing limit.');
  const tempDirectory = await mkdtemp(join(tmpdir(), 'mohan-rag-audio-'));
  const segmentSeconds = 900;
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const outputPattern = join(tempDirectory, 'speech-%05d.mp3');
  const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', '-f', 'segment', '-segment_time', String(segmentSeconds), '-reset_timestamps', '1', '-segment_format', 'mp3', outputPattern]);
  let inputSize = 0;
  let stderr = '';
  const timer = setTimeout(() => child.kill('SIGKILL'), 3 * 60 * 60 * 1000);
  try {
    const processExit = new Promise<number>((resolve, reject) => {
      child.stderr.on('data', (chunk: Buffer) => { stderr = `${stderr}${chunk.toString()}`.slice(-2000); });
      child.on('error', error => reject(new Error(`FFmpeg could not start. Install FFmpeg on the server or set FFMPEG_PATH. ${error.message}`)));
      child.on('close', code => resolve(code ?? -1));
    });
    const input = Readable.fromWeb(response.body as any);
    const sizeGuard = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        inputSize += chunk.length;
        if (inputSize > MAX_STREAM_MEDIA_BYTES) callback(new Error('Bunny media exceeds the 5 GB processing limit.'));
        else callback(null, chunk);
      },
    });
    sizeGuard.on('error', () => child.kill('SIGKILL'));
    input.on('error', () => child.kill('SIGKILL'));
    input.pipe(sizeGuard).pipe(child.stdin);
    const exitCode = await processExit;
    if (exitCode !== 0) throw new Error(`Could not convert Bunny media to MP3: ${stderr || `FFmpeg exited ${exitCode}`}`);
    const files = (await readdir(tempDirectory)).filter(name => name.endsWith('.mp3')).sort();
    if (!files.length) throw new Error('No audio track was found in the Bunny media.');
    return await Promise.all(files.map(async (name, index) => ({
      buffer: await readFile(join(tempDirectory, name)), offsetSeconds: index * segmentSeconds,
    })));
  } finally {
    clearTimeout(timer);
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function timestamp(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function formatTimeline(segments: TimedSpeechSegment[]) {
  const minutes = new Map<number, string[]>();
  for (const segment of segments) {
    const minute = Math.floor(segment.start / 60);
    const rows = minutes.get(minute) || [];
    rows.push(`[${timestamp(segment.start)}–${timestamp(segment.end)}] ${segment.text}`);
    minutes.set(minute, rows);
  }
  return [...minutes.entries()].sort(([a], [b]) => a - b)
    .map(([minute, rows]) => `Minute ${timestamp(minute * 60)}–${timestamp((minute + 1) * 60)}\n${rows.join('\n')}`)
    .join('\n\n');
}

function collapseObviousRepeatedSegments(segments: TimedSpeechSegment[]) {
  const output: TimedSpeechSegment[] = [];
  for (let index = 0; index < segments.length;) {
    const key = segments[index].text.normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}\s]/gu, '');
    let end = index + 1;
    while (end < segments.length) {
      const nextKey = segments[end].text.normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}\s]/gu, '');
      if (!key || nextKey !== key) break;
      end++;
    }
    if (end - index >= 3) {
      output.push({ ...segments[index], end: segments[end - 1].end });
    } else {
      output.push(...segments.slice(index, end));
    }
    index = end;
  }
  return output;
}

async function correctTimedSegments(segments: TimedSpeechSegment[], language: string) {
  const ids = segments.map((_, index) => `s${index + 1}`);
  const source = segments.map((segment, index) => ({ id: ids[index], text: segment.text }));
  const languageName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : language === 'en' ? 'English' : language;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await generateAIText({
      providerOrder: ['OpenAI', 'Anthropic'],
      temperature: 0.1,
      maxOutputTokens: 8192,
      signal: controller.signal,
      systemPrompt: `Proofread a verbatim Whisper transcript in ${languageName}. Correct only clear speech-recognition, spelling, and punctuation errors. Preserve the speaker's meaning and each segment; do not translate, summarize, add facts, or rewrite their speaking style. Do not remove normal emphasis or intentional repetition. For Hindi and Marathi, write naturally in Devanagari and retain Swar Yoga/Sanskrit terms. Return only a JSON array with the same ordered ids and corrected text fields, for example [{"id":"s1","text":"..."}]. Do not add markdown.`,
      message: `Correct these timestamp-ordered transcript segments. Keep the same ids and one output item per input item.\n${JSON.stringify(source)}`,
    });
    const parsed = JSON.parse(response.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
    if (!Array.isArray(parsed) || parsed.length !== source.length) throw new Error('Hindi cleanup returned a different number of transcript segments.');
    const corrected = parsed.map((item: any, index: number) => {
      if (item?.id !== ids[index] || typeof item?.text !== 'string' || !item.text.trim()) throw new Error('Hindi cleanup changed transcript segment order or omitted text.');
      return { ...segments[index], text: item.text.trim() };
    });
    return corrected;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Hindi cleanup timed out; the raw Whisper transcript was kept.');
    throw error;
  } finally { clearTimeout(timeout); }
}

async function correctLongTranscript(segments: TimedSpeechSegment[], language: string) {
  const batches: TimedSpeechSegment[][] = [];
  let batch: TimedSpeechSegment[] = [];
  let batchChars = 0;
  for (const segment of segments) {
    if (batch.length && batchChars + segment.text.length > 10_000) {
      batches.push(batch);
      batch = [];
      batchChars = 0;
    }
    batch.push(segment);
    batchChars += segment.text.length;
  }
  if (batch.length) batches.push(batch);
  const corrected: TimedSpeechSegment[] = [];
  for (const part of batches) corrected.push(...await correctTimedSegments(part, language));
  return corrected;
}

export async function analyzeMediaBuffer(input: { buffer: Buffer; title: string; extension: string; language?: string }): Promise<AnalyzedMedia> {
  if (!input.buffer.length || input.buffer.length > MAX_MEDIA_BYTES) throw new Error('Media must be between 1 byte and 350 MB.');
  const audio = await extractAudio(input.buffer, input.extension);
  return analyzeAudioParts(input, [{ buffer: audio, offsetSeconds: 0 }]);
}

export async function analyzeBunnyMediaUrl(input: { url: string; title: string; extension: string; language?: string }): Promise<AnalyzedMedia> {
  const audioParts = await extractAudioSegmentsFromBunnyUrl(input.url);
  return analyzeAudioParts(input, audioParts);
}

async function analyzeAudioParts(input: { title: string; extension: string; language?: string }, audioParts: Array<{ buffer: Buffer; offsetSeconds: number }>): Promise<AnalyzedMedia> {
  const requestedLanguage = input.language && input.language !== 'auto' ? input.language : undefined;
  const segments: TimedSpeechSegment[] = [];
  let detectedLanguage: string | undefined;
  for (const part of audioParts) {
    if (part.buffer.length > MAX_AUDIO_BYTES) throw new Error('A converted audio segment exceeds Whisper’s 24 MB limit.');
    const transcription = await transcribeAudioWithTimestamps({ buffer: part.buffer, mimeType: 'audio/mpeg' }, { language: requestedLanguage });
    detectedLanguage ||= transcription.language;
    segments.push(...transcription.segments.map(segment => ({ ...segment, start: segment.start + part.offsetSeconds, end: segment.end + part.offsetSeconds })));
  }
  let cleanedSegments = collapseObviousRepeatedSegments(segments);
  let correctionApplied = false;
  let correctionWarning = '';
  const correctionLanguage = requestedLanguage || detectedLanguage || '';
  if (cleanedSegments.length) {
    try {
      cleanedSegments = await correctLongTranscript(cleanedSegments, correctionLanguage);
      correctionApplied = true;
    } catch (error) {
      correctionWarning = error instanceof Error ? error.message : 'Hindi cleanup failed; the raw Whisper transcript was kept.';
    }
  }
  const timeline = formatTimeline(cleanedSegments);
  let annotatedTimeline = timeline;
  let emotionSuggestionsAdded = false;
  let cueWarning = '';
  try {
    const cues = await annotateTranscriptForAvatar(timeline);
    if (cues.length <= 500_000) {
      annotatedTimeline = cues;
      emotionSuggestionsAdded = true;
    } else cueWarning = 'The timestamped transcript was kept; avatar cues exceeded the source size limit.';
  } catch (error) {
    cueWarning = error instanceof Error ? error.message : 'AI emotion and face suggestions could not be added; the timestamped transcript was kept.';
  }
  return {
    title: input.title.slice(0, 240), extension: input.extension, language: detectedLanguage,
    segments: cleanedSegments, timeline, annotatedTimeline,
    emotionSuggestionsAdded, cueWarning, correctionApplied, correctionWarning,
  };
}
