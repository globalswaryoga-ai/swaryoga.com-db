const BUNNY_STREAM_PLAYER_HOST = 'player.mediadelivery.net';
const BUNNY_STREAM_IFRAME_HOST = 'iframe.mediadelivery.net';

export function getBunnyStreamEmbedUrl(source: string): string | null {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }

  if (
    url.protocol !== 'https:' ||
    (url.hostname !== BUNNY_STREAM_PLAYER_HOST && url.hostname !== BUNNY_STREAM_IFRAME_HOST) ||
    url.username ||
    url.password ||
    url.port
  ) {
    return null;
  }

  const [action, libraryId, videoId, ...extraSegments] = url.pathname.split('/').filter(Boolean);
  if (
    !['play', 'embed'].includes(action || '') ||
    !/^\d+$/.test(libraryId || '') ||
    !/^[a-zA-Z0-9-]+$/.test(videoId || '') ||
    extraSegments.length > 0
  ) {
    return null;
  }

  const embedUrl = new URL(`https://${BUNNY_STREAM_IFRAME_HOST}/embed/${libraryId}/${videoId}`);
  embedUrl.search = url.search;
  return embedUrl.toString();
}
