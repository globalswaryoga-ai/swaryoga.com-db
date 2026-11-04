/**
 * @jest-environment node
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertReadableYouTubeCookiesFile,
  buildYouTubeDownloadArgs,
  formatYouTubeDownloadError,
} from '@/lib/mohanRag/mediaTranscription';

describe('Mohan RAG YouTube downloader', () => {
  it('builds a yt-dlp command with an optional cookies file', () => {
    expect(buildYouTubeDownloadArgs('https://www.youtube.com/watch?v=abcdefghijk')).toEqual([
      '--no-playlist',
      '--no-warnings',
      '--format',
      'best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/bestaudio[ext=m4a]/best',
      '--output',
      '-',
      'https://www.youtube.com/watch?v=abcdefghijk',
    ]);
    expect(buildYouTubeDownloadArgs('https://www.youtube.com/watch?v=abcdefghijk', '/worker/youtube-cookies.txt')).toEqual([
      '--no-playlist',
      '--no-warnings',
      '--format',
      'best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/bestaudio[ext=m4a]/best',
      '--cookies',
      '/worker/youtube-cookies.txt',
      '--output',
      '-',
      'https://www.youtube.com/watch?v=abcdefghijk',
    ]);
  });

  it('accepts a readable cookies file and rejects missing or non-file paths', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mohan-youtube-cookies-'));
    const file = join(directory, 'cookies.txt');
    try {
      await writeFile(file, '# Netscape HTTP Cookie File\n');
      await expect(assertReadableYouTubeCookiesFile(file)).resolves.toBeUndefined();
      await expect(assertReadableYouTubeCookiesFile(directory)).rejects.toThrow('readable Netscape-format cookies.txt');
      await expect(assertReadableYouTubeCookiesFile(join(directory, 'missing.txt'))).rejects.toThrow('YOUTUBE_COOKIES_FILE');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('explains how to configure authorized cookies after an anonymous YouTube block', () => {
    const error = formatYouTubeDownloadError('Sign in to confirm you’re not a bot', false, 1);
    expect(error.message).toContain('set YOUTUBE_COOKIES_FILE');
    expect(error.message).toContain('account that can view it');
  });

  it('asks for a refreshed authorized cookie file when YouTube rejects configured cookies', () => {
    const error = formatYouTubeDownloadError('Sign in to confirm', true, 1);
    expect(error.message).toContain('YouTube rejected the configured cookies');
    expect(error.message).toContain('Refresh the Netscape-format cookies file');
  });

  it('preserves unrelated yt-dlp failures without suggesting cookie changes', () => {
    expect(formatYouTubeDownloadError('Video unavailable', false, 1).message).toBe(
      'YouTube download failed: Video unavailable',
    );
  });
});
