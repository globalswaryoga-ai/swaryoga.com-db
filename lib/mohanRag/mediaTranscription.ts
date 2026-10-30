import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { transcribeAudioWithTimestamps } from '@/lib/aiVideo/transcribeAndCondense';
import { annotateTranscriptForAvatar } from './avatarCueAnnotator';

export const MAX_MEDIA_BYTES = 350 * 1024 * 1024;
const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

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
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-3000); });
    const output = streamToBuffer(child.stdout as Readable, MAX_MEDIA_BYTES);
    child.on('error', error => reject(new Error(`yt-dlp could not start. Install yt-dlp on the server or set YT_DLP_PATH. ${error.message}`)));
    child.on('close', async code => {
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
    child.on('error', error => reject(new Error(`FFmpeg could not start. Install FFmpeg on the server or set FFMPEG_PATH. ${error.message}`)));
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`Could not extract audio from media: ${stderr || `FFmpeg exited ${code}`}`));
      if (!chunks.length) return reject(new Error('No audio track was found in the media.'));
      resolve(Buffer.concat(chunks, size));
    });
    child.stdin.on('error', error => reject(error));
    child.stdin.end(buffer);
  });
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

export async function analyzeMediaBuffer(input: { buffer: Buffer; title: string; extension: string }): Promise<AnalyzedMedia> {
  if (!input.buffer.length || input.buffer.length > MAX_MEDIA_BYTES) throw new Error('Media must be between 1 byte and 350 MB.');
  const audio = await extractAudio(input.buffer, input.extension);
  if (audio.length > MAX_AUDIO_BYTES) throw new Error('Compressed audio exceeds Whisper’s 24 MB limit. Split this recording into shorter sources.');
  const transcription = await transcribeAudioWithTimestamps({ buffer: audio, mimeType: 'audio/mpeg' });
  const timeline = formatTimeline(transcription.segments);
  let annotatedTimeline = timeline;
  let emotionSuggestionsAdded = false;
  let cueWarning = '';
  try {
    const cues = await annotateTranscriptForAvatar(timeline);
    if (cues.length <= 180_000) {
      annotatedTimeline = cues;
      emotionSuggestionsAdded = true;
    } else cueWarning = 'The timestamped transcript was kept; avatar cues exceeded the source size limit.';
  } catch (error) {
    cueWarning = error instanceof Error ? error.message : 'AI emotion and face suggestions could not be added; the timestamped transcript was kept.';
  }
  return {
    title: input.title.slice(0, 240), extension: input.extension, language: transcription.language,
    segments: transcription.segments, timeline, annotatedTimeline,
    emotionSuggestionsAdded, cueWarning,
  };
}
