/**
 * @jest-environment node
 */
import {
  getBunnyStreamIdentity,
  isSupportedFacialMediaUrl,
  resolveBunnyStreamMediaUrl,
} from '@/lib/mohanRag/bunnyStreamMedia';

describe('Mohan RAG Bunny Stream media resolution', () => {
  const previousEnvironment = {
    apiKey: process.env.BUNNY_API_KEY,
    libraryId: process.env.BUNNY_STREAM_LIBRARY_ID,
    host: process.env.BUNNY_STREAM_HOST,
  };

  afterEach(() => {
    jest.restoreAllMocks();
    if (previousEnvironment.apiKey === undefined) delete process.env.BUNNY_API_KEY;
    else process.env.BUNNY_API_KEY = previousEnvironment.apiKey;
    if (previousEnvironment.libraryId === undefined) delete process.env.BUNNY_STREAM_LIBRARY_ID;
    else process.env.BUNNY_STREAM_LIBRARY_ID = previousEnvironment.libraryId;
    if (previousEnvironment.host === undefined) delete process.env.BUNNY_STREAM_HOST;
    else process.env.BUNNY_STREAM_HOST = previousEnvironment.host;
  });

  it('extracts Bunny Stream identity from player and encoded CDN URLs only', () => {
    expect(getBunnyStreamIdentity(
      'https://iframe.mediadelivery.net/play/606386/107fce87-d999-4671-9d38-58ee2d3522b2'
    )).toEqual({ libraryId: '606386', videoId: '107fce87-d999-4671-9d38-58ee2d3522b2' });
    process.env.BUNNY_STREAM_LIBRARY_ID = '606386';
    expect(getBunnyStreamIdentity(
      'https://vz-d0769ece-079.b-cdn.net/107fce87-d999-4671-9d38-58ee2d3522b2/play_360p.mp4'
    )).toEqual({ libraryId: '606386', videoId: '107fce87-d999-4671-9d38-58ee2d3522b2' });
    expect(getBunnyStreamIdentity('https://www.youtube.com/watch?v=abcdefghijk')).toBeNull();
  });

  it('allows only HTTPS Bunny or YouTube video sources for extraction', () => {
    expect(isSupportedFacialMediaUrl('https://iframe.mediadelivery.net/play/606386/107fce87-d999-4671-9d38-58ee2d3522b2')).toBe(true);
    expect(isSupportedFacialMediaUrl('https://swaryogacrm.b-cdn.net/lesson.mp4')).toBe(true);
    expect(isSupportedFacialMediaUrl('https://www.youtube.com/watch?v=abcdefghijk')).toBe(true);
    expect(isSupportedFacialMediaUrl('http://127.0.0.1/secret')).toBe(false);
    expect(isSupportedFacialMediaUrl('https://example.com/lesson.mp4')).toBe(false);
  });

  it('uses the highest rendition reported by Bunny instead of assuming 720p', async () => {
    process.env.BUNNY_API_KEY = 'test-key';
    process.env.BUNNY_STREAM_HOST = 'https://vz-test.b-cdn.net/';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ availableResolutions: '240p,360p' }),
    } as Response);

    await expect(resolveBunnyStreamMediaUrl(
      'https://iframe.mediadelivery.net/play/606386/107fce87-d999-4671-9d38-58ee2d3522b2'
    )).resolves.toBe(
      'https://vz-test.b-cdn.net/107fce87-d999-4671-9d38-58ee2d3522b2/play_360p.mp4'
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://video.bunnycdn.com/library/606386/videos/107fce87-d999-4671-9d38-58ee2d3522b2',
      expect.objectContaining({ headers: { AccessKey: 'test-key', Accept: 'application/json' } })
    );
  });

  it('returns non-Stream Bunny URLs unchanged', async () => {
    await expect(resolveBunnyStreamMediaUrl('https://storage.example/file.mp4'))
      .resolves.toBe('https://storage.example/file.mp4');
  });
});
