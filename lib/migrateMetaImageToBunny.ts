/**
 * Utility: download a Meta/WhatsApp CDN image and re-upload to Bunny CDN.
 * Meta CDN URLs (scontent.whatsapp.net, scontent.cdninstagram.com) expire —
 * this gives us a permanent Bunny CDN URL.
 */
import { uploadToBunnyStorage } from '@/lib/bunny-storage';

const META_CDN_HOSTS = [
  'scontent.whatsapp.net',
  'scontent.cdninstagram.com',
  'scontent.fblive',
  'lookaside.fbsbx.com',
  'lookaside.fbcdn.net',
  'mmg.whatsapp.net',
];

export function isMetaCdnUrl(url: string): boolean {
  if (!url) return false;
  return META_CDN_HOSTS.some(host => url.includes(host));
}

/**
 * If the URL is a temporary Meta CDN URL, download it and upload to Bunny.
 * Returns the permanent Bunny CDN URL (or original URL if not Meta CDN / Bunny fails).
 */
export async function ensurePermanentUrl(url: string): Promise<string> {
  if (!url || !isMetaCdnUrl(url)) return url;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SwarYogaBot/1.0' } });
    if (!res.ok) {
      console.warn('[ensurePermanentUrl] Could not download Meta CDN image:', res.status, url.substring(0, 80));
      return url;
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) return url;

    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const fileName = `whatsapp-media/meta-cdn-${Date.now()}.${ext}`;

    const bunnyUrl = await uploadToBunnyStorage(buffer, fileName, { contentType });
    console.log('[ensurePermanentUrl] ✅ Migrated Meta CDN → Bunny:', bunnyUrl.substring(0, 80));
    return bunnyUrl;
  } catch (err: any) {
    console.error('[ensurePermanentUrl] Failed to migrate URL:', err.message);
    return url; // Return original on failure — don't break the flow
  }
}
