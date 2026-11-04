const VIDEO_ID_PATTERN = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

export type BunnyStreamIdentity = {
  libraryId: string;
  videoId: string;
};

export function isSupportedFacialMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (getBunnyStreamIdentity(value)) return true;

    const host = url.hostname.toLowerCase();
    const configuredHosts = [process.env.BUNNY_STREAM_HOST, process.env.BUNNY_STORAGE_CDN_HOST]
      .filter((entry): entry is string => Boolean(entry))
      .map(entry => {
        try { return new URL(entry.includes('://') ? entry : `https://${entry}`).hostname.toLowerCase(); }
        catch { return ''; }
      });
    const isBunnyCdn = host.endsWith('.b-cdn.net') || configuredHosts.includes(host);
    const isYouTube = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host);
    return isBunnyCdn || isYouTube;
  } catch {
    return false;
  }
}

export function getBunnyStreamIdentity(value: string): BunnyStreamIdentity | null {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);

    if (
      ['iframe.mediadelivery.net', 'player.mediadelivery.net'].includes(url.hostname.toLowerCase()) &&
      ['play', 'embed'].includes(parts[0] || '') &&
      /^\d+$/.test(parts[1] || '') &&
      VIDEO_ID_PATTERN.test(parts[2] || '')
    ) {
      return { libraryId: parts[1], videoId: parts[2] };
    }

    const configuredHost = (process.env.BUNNY_STREAM_HOST || 'vz-d0769ece-079.b-cdn.net')
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '')
      .toLowerCase();
    if (
      (url.hostname.toLowerCase() === configuredHost || url.hostname.toLowerCase().endsWith('.b-cdn.net')) &&
      VIDEO_ID_PATTERN.test(parts[0] || '')
    ) {
      const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
      return libraryId && /^\d+$/.test(libraryId) ? { libraryId, videoId: parts[0] } : null;
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveBunnyStreamMediaUrl(sourceUrl: string): Promise<string> {
  const identity = getBunnyStreamIdentity(sourceUrl);
  if (!identity) return sourceUrl;

  const apiKey = process.env.BUNNY_API_KEY?.trim();
  if (!apiKey) throw new Error('BUNNY_API_KEY is required to resolve Bunny Stream renditions.');

  const response = await fetch(
    `https://video.bunnycdn.com/library/${identity.libraryId}/videos/${identity.videoId}`,
    {
      headers: { AccessKey: apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!response.ok) {
    throw new Error(`Bunny Stream metadata lookup failed (${response.status}).`);
  }

  const video = await response.json() as { availableResolutions?: string };
  const resolutions = String(video.availableResolutions || '')
    .split(',')
    .map(value => value.trim())
    .filter(value => /^\d+p$/.test(value))
    .sort((left, right) => Number.parseInt(right, 10) - Number.parseInt(left, 10));
  const resolution = resolutions.find(value => Number.parseInt(value, 10) <= 720) || resolutions[0];
  if (!resolution) {
    throw new Error('Bunny Stream video has no available MP4 rendition.');
  }

  const streamHost = (process.env.BUNNY_STREAM_HOST || 'vz-d0769ece-079.b-cdn.net')
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
  if (!/^[a-z\d.-]+$/i.test(streamHost)) {
    throw new Error('BUNNY_STREAM_HOST is invalid.');
  }

  return `https://${streamHost}/${identity.videoId}/play_${resolution}.mp4`;
}
