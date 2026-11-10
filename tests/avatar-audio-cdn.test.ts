import { createHash } from 'node:crypto';
import { generateAvatarAudioPresignedUrl, generatePresignedUrl } from '@/lib/bunny-storage';

describe('avatar audio CDN URL signing', () => {
  const originalHost = process.env.BUNNY_AVATAR_AUDIO_CDN_HOST;
  const originalToken = process.env.BUNNY_AVATAR_AUDIO_TOKEN_KEY;
  const originalSiteHost = process.env.BUNNY_STORAGE_CDN_HOST;
  const originalSiteToken = process.env.BUNNY_CDN_TOKEN_KEY;

  afterEach(() => {
    if (originalHost === undefined) delete process.env.BUNNY_AVATAR_AUDIO_CDN_HOST;
    else process.env.BUNNY_AVATAR_AUDIO_CDN_HOST = originalHost;
    if (originalToken === undefined) delete process.env.BUNNY_AVATAR_AUDIO_TOKEN_KEY;
    else process.env.BUNNY_AVATAR_AUDIO_TOKEN_KEY = originalToken;
    if (originalSiteHost === undefined) delete process.env.BUNNY_STORAGE_CDN_HOST;
    else process.env.BUNNY_STORAGE_CDN_HOST = originalSiteHost;
    if (originalSiteToken === undefined) delete process.env.BUNNY_CDN_TOKEN_KEY;
    else process.env.BUNNY_CDN_TOKEN_KEY = originalSiteToken;
  });

  it('signs audio with the dedicated hostname and key, independent of site CDN settings', async () => {
    process.env.BUNNY_AVATAR_AUDIO_CDN_HOST = 'avatarmohan.b-cdn.net';
    process.env.BUNNY_AVATAR_AUDIO_TOKEN_KEY = 'avatar-zone-key';
    process.env.BUNNY_STORAGE_CDN_HOST = 'swaryogacrm.b-cdn.net';
    process.env.BUNNY_CDN_TOKEN_KEY = 'site-zone-key';

    const url = new URL(await generateAvatarAudioPresignedUrl(
      'users/admincrm/avatar-audio/speech.mp3',
      { expiresIn: 120 },
    ));
    const expires = Number(url.searchParams.get('expires'));
    const expectedToken = createHash('md5')
      .update(`avatar-zone-key${url.pathname}${expires}`)
      .digest('base64url');

    expect(url.hostname).toBe('avatarmohan.b-cdn.net');
    expect(url.searchParams.get('token')).toBe(expectedToken);
    expect(url.searchParams.get('token')).not.toContain('site-zone-key');
  });

  it('requires both dedicated audio CDN settings', async () => {
    delete process.env.BUNNY_AVATAR_AUDIO_TOKEN_KEY;
    process.env.BUNNY_AVATAR_AUDIO_CDN_HOST = 'avatarmohan.b-cdn.net';

    await expect(generateAvatarAudioPresignedUrl('users/admincrm/avatar-audio/speech.mp3'))
      .rejects.toThrow('host and token key must be configured');
  });

  it('keeps the existing site CDN signer on its original configuration', async () => {
    process.env.BUNNY_AVATAR_AUDIO_CDN_HOST = 'avatarmohan.b-cdn.net';
    process.env.BUNNY_AVATAR_AUDIO_TOKEN_KEY = 'avatar-zone-key';
    process.env.BUNNY_STORAGE_CDN_HOST = 'swaryogacrm.b-cdn.net';
    process.env.BUNNY_CDN_TOKEN_KEY = 'site-zone-key';

    const url = new URL(await generatePresignedUrl('public/site-image.jpg'));

    expect(url.hostname).toBe('swaryogacrm.b-cdn.net');
  });
});
