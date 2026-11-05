import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { transcribeAudioWithTimestamps } from '@/lib/aiVideo/transcribeAndCondense';
import { generateAIText } from '@/lib/ai/generateWithFallback';
import { annotateTranscriptForAvatar } from './avatarCueAnnotator';
import { detectTextLanguage } from './languageFilterEngine';

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

export function resolveBunnyStreamDirectMedia(url: string): {
  directUrl: string;
  isStream: boolean;
  referer: string;
  guid?: string;
} {
  const trimmed = (url || '').trim();
  const playMatch = trimmed.match(/(?:mediadelivery\.net|bunnycdn\.com)\/play\/(\d+)\/([0-9a-fA-F-]+)/i);
  if (playMatch) {
    const guid = playMatch[2];
    return {
      directUrl: `https://vz-d0769ece-079.b-cdn.net/${guid}/play_240p.mp4`,
      isStream: true,
      referer: 'https://iframe.mediadelivery.net/',
      guid,
    };
  }

  const guidMatch = trimmed.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/i);
  if (trimmed.includes('mediadelivery.net') && guidMatch) {
    const guid = guidMatch[1];
    return {
      directUrl: `https://vz-d0769ece-079.b-cdn.net/${guid}/play_240p.mp4`,
      isStream: true,
      referer: 'https://iframe.mediadelivery.net/',
      guid,
    };
  }

  if (trimmed.includes('.b-cdn.net')) {
    return {
      directUrl: trimmed,
      isStream: true,
      referer: 'https://iframe.mediadelivery.net/',
      guid: guidMatch ? guidMatch[1] : undefined,
    };
  }

  return {
    directUrl: trimmed,
    isStream: false,
    referer: 'https://iframe.mediadelivery.net/',
  };
}

export async function fetchBunnyMedia(url: string) {
  const { directUrl, referer } = resolveBunnyStreamDirectMedia(url);
  const response = await fetch(directUrl, {
    headers: { Referer: referer },
    signal: AbortSignal.timeout(5 * 60 * 1000),
  });
  if (!response.ok || !response.body) throw new Error(`Could not read the Bunny media URL (${response.status}). Check that its CDN link is public and active.`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_MEDIA_BYTES) throw new Error('Bunny media exceeds the 350 MB processing limit.');
  const buffer = await streamToBuffer(Readable.fromWeb(response.body as any), MAX_MEDIA_BYTES);
  const pathname = new URL(directUrl).pathname;
  const extension = pathname.split('.').pop()?.toLowerCase() || 'mp4';
  if (!['mp3', 'mp4', 'm4a', 'mpga', 'mpeg', 'wav', 'webm', 'mov'].includes(extension)) throw new Error('Use a direct Bunny CDN media URL or Bunny Stream player URL.');
  let title = pathname.split('/').pop() || 'Bunny media';
  try { title = decodeURIComponent(title); } catch { /* Keep URL-safe title. */ }
  return { buffer, title: title.replace(/\.[^.]+$/, ''), extension };
}

export async function fetchYouTubeMedia(url: string) {
  const binary = process.env.YT_DLP_PATH || 'yt-dlp';
  const cookiesFile = process.env.YOUTUBE_COOKIES_FILE?.trim();
  if (cookiesFile) await assertReadableYouTubeCookiesFile(cookiesFile);
  const videoId = new URL(url).searchParams.get('v') || new URL(url).pathname.split('/').filter(Boolean).pop() || 'video';

  let title = `YouTube ${videoId}`;
  try {
    const titleArgs = ['--no-playlist', '--no-warnings', '--print', '%(title)s'];
    if (cookiesFile) titleArgs.push('--cookies', cookiesFile);
    titleArgs.push(url);
    const titleChild = spawn(binary, titleArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let titleStdout = '';
    titleChild.stdout.on('data', chunk => { titleStdout += chunk.toString(); });
    await new Promise(resolve => {
      const timer = setTimeout(() => { try { titleChild.kill('SIGKILL'); } catch { } resolve(null); }, 15000);
      titleChild.on('close', () => { clearTimeout(timer); resolve(null); });
    });
    if (titleStdout.trim()) title = titleStdout.trim();
  } catch {
    /* Fallback to video ID */
  }

  const args = buildYouTubeDownloadArgs(url, cookiesFile);
  return new Promise<{ buffer: Buffer; title: string; extension: string }>((resolve, reject) => {
    let stderr = '';
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 600_000);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-3000); });
    const output = streamToBuffer(child.stdout as Readable, MAX_MEDIA_BYTES);
    child.on('error', error => { clearTimeout(timeout); reject(new Error(`yt-dlp could not start. Install yt-dlp on the server or set YT_DLP_PATH. ${error.message}`)); });
    child.on('close', async code => {
      clearTimeout(timeout);
      try {
        const buffer = await output;
        if (code !== 0) return reject(formatYouTubeDownloadError(stderr, Boolean(cookiesFile), code));
        if (!buffer.length) return reject(new Error('YouTube returned an empty video stream.'));
        resolve({ buffer, title: title.slice(0, 240), extension: 'mp4' });
      } catch (error) { reject(error); }
    });
  });
}

export function buildYouTubeDownloadArgs(url: string, cookiesFile?: string) {
  const args = ['--no-playlist', '--no-warnings', '--format', 'best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/bestaudio[ext=m4a]/best'];
  if (cookiesFile) args.push('--cookies', cookiesFile);
  args.push('--output', '-', url);
  return args;
}

export async function assertReadableYouTubeCookiesFile(cookiesFile: string) {
  try {
    const file = await stat(cookiesFile);
    if (!file.isFile()) throw new Error('Not a file');
    await access(cookiesFile, fsConstants.R_OK);
  } catch {
    throw new Error('YOUTUBE_COOKIES_FILE must point to a readable Netscape-format cookies.txt file on the ingestion worker.');
  }
}

export function formatYouTubeDownloadError(stderr: string, cookiesConfigured: boolean, exitCode: number | null) {
  const detail = stderr.trim().slice(-1200) || `yt-dlp exited ${exitCode}`;
  if (!/sign in to confirm|not a bot|cookies?/i.test(detail)) {
    return new Error(`YouTube download failed: ${detail}`);
  }
  const guidance = cookiesConfigured
    ? 'YouTube rejected the configured cookies. Refresh the Netscape-format cookies file from an account authorized for this video and verify the account can view it.'
    : 'YouTube requires an authorized session for this video. Export a Netscape-format cookies.txt from an account that can view it and set YOUTUBE_COOKIES_FILE on the ingestion worker.';
  return new Error(`YouTube download failed: ${guidance} ${detail}`);
}

async function extractAudioSegmentsFromBuffer(buffer: Buffer): Promise<Array<{ buffer: Buffer; offsetSeconds: number }>> {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'mohan-rag-audio-buf-'));
  const segmentSeconds = 300;
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const outputPattern = join(tempDirectory, 'speech-%05d.mp3');
  const child = spawn(ffmpeg, [
    '-hide_banner', '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k',
    '-f', 'segment', '-segment_time', String(segmentSeconds),
    '-reset_timestamps', '1', '-segment_format', 'mp3',
    outputPattern,
  ]);
  let stderr = '';
  const timer = setTimeout(() => child.kill('SIGKILL'), 30 * 60 * 1000);
  try {
    const processExit = new Promise<number>((resolve, reject) => {
      child.stderr.on('data', (chunk: Buffer) => { stderr = `${stderr}${chunk.toString()}`.slice(-2000); });
      child.on('error', error => reject(new Error(`FFmpeg could not start. Install FFmpeg on the server or set FFMPEG_PATH. ${error.message}`)));
      child.on('close', code => resolve(code ?? -1));
    });
    child.stdin.on('error', () => { });
    child.stdin.end(buffer);
    const exitCode = await processExit;
    if (exitCode !== 0) throw new Error(`Could not convert media buffer to MP3: ${stderr || `FFmpeg exited ${exitCode}`}`);
    const files = (await readdir(tempDirectory)).filter(name => name.endsWith('.mp3')).sort();
    if (!files.length) throw new Error('No audio track was found in the media.');
    return await Promise.all(files.map(async (name, index) => ({
      buffer: await readFile(join(tempDirectory, name)), offsetSeconds: index * segmentSeconds,
    })));
  } finally {
    clearTimeout(timer);
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

async function extractAudioSegmentsFromBunnyUrl(url: string): Promise<Array<{ buffer: Buffer; offsetSeconds: number }>> {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'mohan-rag-audio-'));
  const segmentSeconds = 600; // 10-minute segments for optimal Whisper speed & fewer requests
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const outputPattern = join(tempDirectory, 'speech-%05d.mp3');

  const { directUrl, referer } = resolveBunnyStreamDirectMedia(url);

  try {
    // Attempt 1: Direct URL reading via ffmpeg (fastest, streams directly from CDN)
    let directSuccess = false;
    try {
      const ffmpegArgs = ['-hide_banner', '-loglevel', 'error'];
      if (referer) {
        ffmpegArgs.push('-headers', `Referer: ${referer}\r\n`);
      }
      ffmpegArgs.push(
        '-i', directUrl,
        '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k',
        '-f', 'segment', '-segment_time', String(segmentSeconds),
        '-reset_timestamps', '1', '-segment_format', 'mp3',
        outputPattern
      );
      const child = spawn(ffmpeg, ffmpegArgs);
      const exitCode = await new Promise<number>((resolve) => {
        child.on('close', code => resolve(code ?? -1));
        child.on('error', () => resolve(-1));
      });
      if (exitCode === 0) {
        const files = (await readdir(tempDirectory)).filter(name => name.endsWith('.mp3')).sort();
        if (files.length > 0) {
          directSuccess = true;
          return await Promise.all(files.map(async (name, index) => ({
            buffer: await readFile(join(tempDirectory, name)), offsetSeconds: index * segmentSeconds,
          })));
        }
      }
    } catch {
      // Fallback to streaming fetch
    }

    if (!directSuccess) {
      // Attempt 2: Stream via fetch and pipe to ffmpeg stdin
      const fetchHeaders: Record<string, string> = {};
      if (referer) {
        fetchHeaders['Referer'] = referer;
      }
      const response = await fetch(directUrl, { headers: fetchHeaders, signal: AbortSignal.timeout(3 * 60 * 60 * 1000) });
      if (!response.ok || !response.body) throw new Error(`Could not read Bunny media for MP3 conversion (${response.status}).`);
      const declaredSize = Number(response.headers.get('content-length') || 0);
      if (declaredSize > MAX_STREAM_MEDIA_BYTES) throw new Error('Bunny media exceeds the 5 GB processing limit.');

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
      }
    }
    return [];
  } finally {
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
    const text = (segment.text || '').trim();
    if (!text) continue;
    const minute = Math.floor(segment.start / 60);
    const rows = minutes.get(minute) || [];
    rows.push(`[${timestamp(segment.start)}–${timestamp(segment.end)}] ${text}`);
    minutes.set(minute, rows);
  }
  const entries = [...minutes.entries()].filter(([_, rows]) => rows.length > 0);
  if (!entries.length) return '';
  return entries.sort(([a], [b]) => a - b)
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
      providerOrder: ['Gemini', 'Anthropic', 'OpenAI'],
      temperature: 0.1,
      maxOutputTokens: 8192,
      signal: controller.signal,
      systemPrompt: `CRITICAL RULE - AI VERBATIM RE-CHECK & WORD-TO-WORD RESTORATION:
You are the Dedicated AI Audio Re-Checker for classical Swar Yoga Master Mohan Kalburgi.
Language: ${languageName}.
1. WORD-FOR-WORD VERBATIM FIDELITY: Preserve every spoken word word-for-word. Catch acoustic slips (e.g. in Marathi: "गले बंद करा" -> "डोळे बंद करा", "शवीर स्थीर" -> "शरीर स्थिर", "सवकाज गले उड़ा" -> "सावकाश डोळे उघडा", "आथ जणा बाहरेणा एक" -> "आत जाणारा बाहेर जाणारा एक").
2. RESTORE COMPLETE SENTENCES: Never drop words, never chop sentences into broken phrases. Ensure the full spoken thought is coherent and intact.
3. ZERO VOCABULARY SUBSTITUTION: Never replace spoken nouns with synonyms (e.g. keep "नाकपुडी", never replace with "छिद्र").
4. GRAMMAR:
   - In Marathi & Hindi: Change ONLY VERBS (क्रियापद) to agree with gender/number. Objects and sentence layout remain untouched.
   - In English: Ensure natural native complete sentence flow while delivering identical content and humor.
5. Retain Swar Yoga/Sanskrit terms verbatim: स्वर योग, स्वरोदय, नाडी, नाकपुडी, इडा, पिंगळा, सुषुम्ना, प्राण.
6. Return only a JSON array with the same ordered ids and corrected text fields, for example [{"id":"s1","text":"..."}]. Do not add markdown.`,
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
  const audioParts = await extractAudioSegmentsFromBuffer(input.buffer);
  return analyzeAudioParts(input, audioParts);
}

export async function analyzeBunnyMediaUrl(input: { url: string; title: string; extension: string; language?: string }): Promise<AnalyzedMedia> {
  const audioParts = await extractAudioSegmentsFromBunnyUrl(input.url);
  return analyzeAudioParts(input, audioParts);
}

async function analyzeAudioParts(input: { title: string; extension: string; language?: string }, audioParts: Array<{ buffer: Buffer; offsetSeconds: number }>): Promise<AnalyzedMedia> {
  const requestedLanguage = input.language && input.language !== 'auto' ? input.language : undefined;
  const segments: TimedSpeechSegment[] = [];
  let detectedLanguage: string | undefined;

  // Process audio segments sequentially with small pause to respect API rate limits
  for (let i = 0; i < audioParts.length; i++) {
    const part = audioParts[i];
    if (part.buffer.length > MAX_AUDIO_BYTES) throw new Error('A converted audio segment exceeds Whisper’s 24 MB limit.');
    console.log(`[Audio Transcription] Transcribing segment ${i + 1}/${audioParts.length} (offset: ${part.offsetSeconds}s)...`);

    try {
      const transcription = await transcribeAudioWithTimestamps({ buffer: part.buffer, mimeType: 'audio/mpeg' }, { language: requestedLanguage });
      detectedLanguage ||= transcription.language;
      segments.push(...transcription.segments.map(segment => ({ ...segment, start: segment.start + part.offsetSeconds, end: segment.end + part.offsetSeconds })));
    } catch (partErr: any) {
      console.warn(`[Audio Transcription] Segment ${i + 1} transcription error: ${partErr.message}. Continuing with captured speech...`);
    }

    if (i < audioParts.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (segments.length === 0) {
    throw new Error('All audio segments failed transcription.');
  }
  let cleanedSegments = collapseObviousRepeatedSegments(segments);
  let correctionApplied = false;
  let correctionWarning = '';

  // Smart Language Detection Filter: Inspect speech content for actual spoken vocabulary
  const sampleSpeechText = cleanedSegments.slice(0, 15).map(s => s.text).join(' ');
  const detectedAnalysis = detectTextLanguage(sampleSpeechText);
  if (detectedAnalysis.confidence >= 0.7 && (!requestedLanguage || requestedLanguage === 'auto' || detectedAnalysis.isMixed)) {
    detectedLanguage = detectedAnalysis.detectedLanguage;
  }
  const correctionLanguage = detectedLanguage || requestedLanguage || 'mr';

  if (cleanedSegments.length) {
    try {
      cleanedSegments = await correctLongTranscript(cleanedSegments, correctionLanguage);
      correctionApplied = true;
    } catch (error) {
      correctionWarning = error instanceof Error ? error.message : 'Transcript cleanup failed; the raw Whisper transcript was kept.';
    }
  }
  const timeline = formatTimeline(cleanedSegments);
  if (!timeline || !timeline.trim()) {
    throw new Error('No spoken speech text could be detected or transcribed from the media audio.');
  }
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
