import WebSocket from 'ws';
import crypto from 'node:crypto';

const EDGE_WS_URL =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readahead/edge/v1?TrustedClientToken=6A5AA1D4EA6542D8A6D522207F073181';

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
 * Native, zero-expense Microsoft Edge TTS client using WebSockets.
 * Requires NO API key, runs on any Node.js server, and captures
 * both high-fidelity MP3 audio and exact millisecond word-boundary lip-sync data.
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

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
  <voice name="${voice}">
    <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
      ${escapeXml(cleanText)}
    </prosody>
  </voice>
</speak>`;

  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID().replace(/-/g, '');
    const ws = new WebSocket(
      `${EDGE_WS_URL}&ConnectionId=${requestId}`,
      {
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
          'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );

    const audioChunks: Buffer[] = [];
    const wordBoundaries: WordBoundaryEvent[] = [];
    let timeoutTimer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {}
    };

    timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error('Edge-TTS synthesis request timed out after 25 seconds'));
    }, 25000);

    ws.on('open', () => {
      const timestamp = new Date().toISOString();

      // 1. Send speech.config
      const configMessage =
        `X-Timestamp:${timestamp}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: 'false',
                  wordBoundaryEnabled: 'true',
                },
                outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
              },
            },
          },
        });
      ws.send(configMessage);

      // 2. Send SSML synthesis request
      const ssmlMessage =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${timestamp}Z\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml;
      ws.send(ssmlMessage);
    });

    ws.on('message', (data: WebSocket.Data, isBinary: boolean) => {
      if (isBinary) {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        // Binary packets have a 2-byte header length followed by headers and audio data
        if (buffer.length > 2) {
          const headerLength = buffer.readUInt16BE(0);
          if (buffer.length > headerLength + 2) {
            const audioData = buffer.subarray(headerLength + 2);
            audioChunks.push(audioData);
          }
        }
      } else {
        const textMessage = data.toString('utf8');

        // Check for word boundary metadata
        if (textMessage.includes('Path:audio.metadata')) {
          try {
            const bodyIndex = textMessage.indexOf('\r\n\r\n');
            if (bodyIndex !== -1) {
              const jsonStr = textMessage.substring(bodyIndex + 4);
              const meta = JSON.parse(jsonStr);
              if (meta?.Metadata) {
                for (const item of meta.Metadata) {
                  if (item.Type === 'WordBoundary' && item.Data) {
                    // Edge TTS offset is in ticks (10,000 ticks = 1 ms)
                    const offsetMs = Math.round(item.Data.Offset / 10000);
                    const durationMs = Math.round(item.Data.Duration / 10000);
                    wordBoundaries.push({
                      offsetMs,
                      durationMs,
                      text: item.Data.text?.Text || '',
                    });
                  }
                }
              }
            }
          } catch {}
        }

        // Check for turn.end (indicates synthesis is complete)
        if (textMessage.includes('Path:turn.end')) {
          cleanup();
          const finalAudio = Buffer.concat(audioChunks);
          if (finalAudio.length === 0) {
            reject(new Error('Edge-TTS finished but returned zero audio bytes'));
            return;
          }

          // Compute duration from word boundaries or buffer bitrate (96 kbps = 12 KB/s)
          let durationSeconds = 0;
          if (wordBoundaries.length > 0) {
            const lastWord = wordBoundaries[wordBoundaries.length - 1];
            durationSeconds = Math.max(1, Number(((lastWord.offsetMs + lastWord.durationMs) / 1000).toFixed(2)));
          } else {
            durationSeconds = Math.max(1, Number((finalAudio.length / 12000).toFixed(2)));
          }

          resolve({
            audioBuffer: finalAudio,
            contentType: 'audio/mpeg',
            wordBoundaries,
            durationSeconds,
          });
        }
      }
    });

    ws.on('error', (err) => {
      cleanup();
      reject(new Error(`Edge-TTS WebSocket connection error: ${err.message}`));
    });

    ws.on('close', (code, reason) => {
      if (audioChunks.length === 0) {
        cleanup();
        reject(new Error(`Edge-TTS closed unexpectedly before completion (code ${code}: ${reason.toString()})`));
      }
    });
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
