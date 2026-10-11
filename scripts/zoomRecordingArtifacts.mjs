import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';

export function recordingComplete(result) {
  return Boolean(result.youtubeUrls?.speaker && result.youtubeUrls?.gallery && result.bunny?.speaker && result.bunny?.audio);
}

export async function finalizeRecording(result, persist, cleanup) {
  if (!recordingComplete(result)) return false;
  await persist();
  await cleanup();
  return true;
}

export async function withRecordingMp3(sourceUrl, useFile) {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'swar-recording-'));
  const input = path.join(directory, 'source');
  const output = path.join(directory, 'audio.mp3');
  try {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30 * 60 * 1000) });
    if (!response.ok || !response.body) throw new Error(`Zoom audio download failed (${response.status})`);
    await pipeline(response.body, fs.createWriteStream(input));
    await new Promise((resolve, reject) => {
      const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vn', '-codec:a', 'libmp3lame', '-b:a', '128k', output], { timeout: 30 * 60 * 1000 });
      let error = '';
      child.stderr.on('data', chunk => { error = (error + chunk.toString()).slice(-2000); });
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve() : reject(new Error(`MP3 conversion failed (${code}): ${error}`)));
    });
    return await useFile(output, (await fs.promises.stat(output)).size);
  } finally {
    await fs.promises.rm(directory, { recursive: true, force: true });
  }
}
