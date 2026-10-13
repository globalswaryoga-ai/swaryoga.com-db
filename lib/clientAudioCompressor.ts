"use client";

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Returns a loaded singleton FFmpeg instance in the browser.
 * Uses jsdelivr UMD build which does not require SharedArrayBuffer / COOP headers.
 */
export async function getClientFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (typeof window === 'undefined') {
    throw new Error('FFmpeg compression is only supported in client browsers');
  }

  if (ffmpegInstance && ffmpegInstance.loaded) {
    if (onProgress) {
      ffmpegInstance.on('progress', ({ progress }) => {
        onProgress(Math.min(100, Math.max(0, Math.round(progress * 100))));
      });
    }
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.min(100, Math.max(0, Math.round(progress * 100))));
      });
    }

    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

/**
 * Compresses an audio or video file into a speech-optimized MP3:
 * - 16kHz sample rate (OpenAI Whisper native format)
 * - Mono (1 channel)
 * - 32kbps bitrate
 * A 1-hour workshop of ~65MB is compressed down to ~14.4MB, well under Whisper's 24MB cap.
 */
export async function compressAudioForWhisper(
  file: File | Blob,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<File> {
  const ffmpeg = await getClientFFmpeg(onProgress);

  const cleanName = fileName || 'input.mp4';
  const ext = (cleanName.includes('.') ? cleanName.split('.').pop()! : 'mp4').toLowerCase();
  const timestamp = Date.now();
  const safeInputName = `input_${timestamp}.${ext}`;
  const safeOutputName = `output_${timestamp}.mp3`;

  try {
    // 1. Write the file into FFmpeg virtual filesystem
    const fileData = await fetchFile(file);
    await ffmpeg.writeFile(safeInputName, fileData);

    // 2. Transcode to 16kHz mono 32kbps speech MP3
    await ffmpeg.exec([
      '-i',
      safeInputName,
      '-vn',
      '-ar',
      '16000',
      '-ac',
      '1',
      '-b:a',
      '32k',
      safeOutputName,
    ]);

    // 3. Read output from FFmpeg virtual filesystem
    const rawData = await ffmpeg.readFile(safeOutputName);
    const blob = new Blob([rawData as any], { type: 'audio/mpeg' });

    const baseName = cleanName.replace(/\.[^/.]+$/, '');
    const resultFile = new File([blob], `${baseName}_speech.mp3`, {
      type: 'audio/mpeg',
      lastModified: Date.now(),
    });

    return resultFile;
  } finally {
    // 4. Always cleanup virtual filesystem to free WebAssembly memory
    try {
      await ffmpeg.deleteFile(safeInputName);
    } catch {
      // ignore
    }
    try {
      await ffmpeg.deleteFile(safeOutputName);
    } catch {
      // ignore
    }
  }
}
