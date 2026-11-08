import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export interface SynthesizeVoiceOptions {
  text: string;
  voice?: string;
  pitch?: string;
  rate?: string;
  volume?: string;
  outputFile?: string;
}

export interface VoiceSynthesisOutput {
  success: boolean;
  outputFile: string;
  audioUrl: string;
  durationMs: number;
  durationSeconds: number;
  fileSizeBytes: number;
  voice: string;
  language: string;
}

export async function runMohanSirVoiceEngine(
  options: SynthesizeVoiceOptions
): Promise<VoiceSynthesisOutput> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'synthesize_voice_cli.js');
  const args = ['--text', options.text];

  if (options.voice) args.push('--voice', options.voice);
  if (options.pitch) args.push('--pitch', options.pitch);
  if (options.rate) args.push('--rate', options.rate);
  if (options.volume) args.push('--volume', options.volume);
  if (options.outputFile) args.push('--output', options.outputFile);

  return new Promise((resolve, reject) => {
    execFile(
      'node',
      [scriptPath, ...args],
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          try {
            const errJson = JSON.parse(stderr || stdout);
            return reject(new Error(errJson.error || error.message));
          } catch {
            return reject(new Error(stderr || error.message));
          }
        }

        try {
          const res = JSON.parse(stdout.trim());
          if (!res.success) {
            return reject(new Error(res.error || 'Voice synthesis failed'));
          }

          // Generate relative URL for browser playback
          const cwd = process.cwd();
          let relativePath = res.outputFile.replace(path.join(cwd, 'public'), '');
          if (!relativePath.startsWith('/')) relativePath = '/' + relativePath;

          resolve({
            ...res,
            audioUrl: relativePath,
          });
        } catch (e: any) {
          reject(new Error(`Failed to parse voice engine output: ${stdout} (${e.message})`));
        }
      }
    );
  });
}
