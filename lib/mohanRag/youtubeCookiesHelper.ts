import { stat, access, writeFile, unlink } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { join } from 'path';

export async function resolveYouTubeCookiesPath(): Promise<string | undefined> {
  const envFile = process.env.YOUTUBE_COOKIES_FILE?.trim();
  const candidates = [
    envFile,
    join(process.cwd(), 'youtube-cookies.txt'),
    '/var/www/swaryoga/youtube-cookies.txt',
  ].filter(Boolean) as string[];

  for (const file of candidates) {
    try {
      const details = await stat(file);
      if (details.isFile() && details.size > 20) {
        await access(file, fsConstants.R_OK);
        return file;
      }
    } catch {
      // try next candidate
    }
  }
  return undefined;
}

export async function saveYouTubeCookies(content: string): Promise<string> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length < 20) {
    throw new Error('Cookies content is empty or invalid.');
  }
  const targetPath = process.env.YOUTUBE_COOKIES_FILE?.trim() || join(process.cwd(), 'youtube-cookies.txt');
  await writeFile(targetPath, trimmed, 'utf-8');
  return targetPath;
}

export async function removeYouTubeCookies(): Promise<void> {
  const file = await resolveYouTubeCookiesPath();
  if (file) {
    try {
      await unlink(file);
    } catch {}
  }
}

