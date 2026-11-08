#!/usr/bin/env node
/**
 * Mohan Sir Voice Engine CLI
 * Fast, standalone synthesis (<1 second) using native Node.js process
 * Avoids Next.js Webpack bundler ws/bufferUtil issues completely.
 */

const fs = require('node:fs');
const path = require('node:path');
const { EdgeTTS } = require('node-edge-tts');

async function main() {
  const args = process.argv.slice(2);
  let text = '';
  let voice = 'hi-IN-MadhurNeural';
  let pitch = '-8Hz';
  let rate = '-5%';
  let volume = '+0%';
  let outputFile = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--text' && args[i + 1]) {
      text = args[i + 1];
      i++;
    } else if (args[i] === '--voice' && args[i + 1]) {
      voice = args[i + 1];
      i++;
    } else if (args[i] === '--pitch' && args[i + 1]) {
      pitch = args[i + 1];
      i++;
    } else if (args[i] === '--rate' && args[i + 1]) {
      rate = args[i + 1];
      i++;
    } else if (args[i] === '--volume' && args[i + 1]) {
      volume = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    }
  }

  if (!text) {
    console.error(JSON.stringify({ error: 'Text argument --text is required' }));
    process.exit(1);
  }

  if (!outputFile) {
    const tmpDir = path.join(process.cwd(), 'public', 'voice-clones', 'generated');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    outputFile = path.join(tmpDir, `mohan_voice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp3`);
  }

  const langMatch = voice.match(/^[a-z]{2}-[A-Z]{2}/);
  const lang = langMatch ? langMatch[0] : 'hi-IN';

  const t0 = Date.now();
  try {
    const tts = new EdgeTTS({
      voice,
      lang,
      rate,
      pitch,
      volume,
      outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
      timeout: 20000,
    });

    await tts.ttsPromise(text, outputFile);
    const durationMs = Date.now() - t0;
    const stats = fs.statSync(outputFile);

    // Estimate duration: 96kbps = 12,000 bytes/sec
    const durationSeconds = Math.max(1, Number((stats.size / 12000).toFixed(2)));

    console.log(JSON.stringify({
      success: true,
      outputFile,
      durationMs,
      durationSeconds,
      fileSizeBytes: stats.size,
      voice,
      language: lang,
    }));
  } catch (err) {
    console.error(JSON.stringify({
      success: false,
      error: err.message || String(err),
    }));
    process.exit(1);
  }
}

main();
