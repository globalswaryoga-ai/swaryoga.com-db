import { EdgeTTS } from 'node-edge-tts';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export interface WordBoundaryEvent {
  offsetMs: number;
  durationMs: number;
  text: string;
}

export interface EdgeTtsSynthesisResult {
  audioBuffer: Buffer;
  contentType: string;
  wordBoundaries: WordBoundaryEvent[];
  durationSeconds: number;
}

export interface EdgeTtsOptions {
  voice?: string;
  rate?: string; // e.g. "+0%", "-10%", "+15%"
  pitch?: string; // e.g. "+0Hz", "-5Hz"
  volume?: string; // e.g. "+0%"
}

/**
 * Native, zero-expense Microsoft Edge TTS client using modern Sec-MS-GEC v2 protocol.
 * Requires NO API key, runs on any Node.js server, and captures
 * high-fidelity MP3 audio with synthesized word-boundary timing for realistic lip-sync.
 */
export async function synthesizeEdgeTts(
  text: string,
  options: EdgeTtsOptions = {}
): Promise<EdgeTtsSynthesisResult> {
  const voice = options.voice || 'hi-IN-MadhurNeural';
  const rate = options.rate || '+0%';
  const pitch = options.pitch || '+0Hz';
  const volume = options.volume || '+0%';

  const cleanText = text
    .replace(/\[pause:[\d.]+s\]/gi, ' ... ')
    .replace(/\[[a-zA-Z0-9_:]+\]/g, '')
    .trim();

  if (!cleanText) {
    throw new Error('Text to synthesize is empty after removing tags.');
  }

  // Determine language code from voice name (e.g. "hi-IN" from "hi-IN-MadhurNeural")
  const langMatch = voice.match(/^[a-z]{2}-[A-Z]{2}/);
  const lang = langMatch ? langMatch[0] : 'hi-IN';

  const tmpFile = path.join(os.tmpdir(), `edge_tts_${Date.now()}_${crypto.randomUUID().substring(0, 8)}.mp3`);

  try {
    const tts = new EdgeTTS({
      voice,
      lang,
      rate,
      pitch,
      volume,
      outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
      timeout: 25000,
    });

    await tts.ttsPromise(cleanText, tmpFile);
    const audioBuffer = await fs.readFile(tmpFile);
    await fs.unlink(tmpFile).catch(() => {});

    if (audioBuffer.length === 0) {
      throw new Error('Edge-TTS finished but returned 0 audio bytes');
    }

    // Audio duration estimation: 96kbps = 12,000 bytes per second
    const durationSeconds = Math.max(1, Number((audioBuffer.length / 12000).toFixed(2)));

    // Generate word boundaries based on script words and duration for lip-sync visemes
    const words = cleanText.split(/\s+/).filter(Boolean);
    const wordBoundaries: WordBoundaryEvent[] = [];
    if (words.length > 0) {
      const msPerWord = Math.floor((durationSeconds * 1000) / words.length);
      words.forEach((w, idx) => {
        wordBoundaries.push({
          offsetMs: idx * msPerWord,
          durationMs: Math.max(120, msPerWord - 30),
          text: w,
        });
      });
    }

    return {
      audioBuffer,
      contentType: 'audio/mpeg',
      wordBoundaries,
      durationSeconds,
    };
  } catch (error: any) {
    await fs.unlink(tmpFile).catch(() => {});
    throw new Error(`Edge-TTS synthesis error: ${error.message || error}`);
  }
}
