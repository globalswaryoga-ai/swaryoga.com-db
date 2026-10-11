import { createHmac } from 'node:crypto';
import type { WhatsAppCredentials } from '@/lib/whatsappAccounts';

export async function probeMetaHealth(credentials?: WhatsAppCredentials | null) {
  const accessToken = credentials?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = credentials?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = credentials?.appSecret || process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
  if (!accessToken || !phoneNumberId || !appSecret) {
    return { healthy: false, latencyMs: 0, error: 'Meta access token, phone number ID and app secret are required.' };
  }
  const started = performance.now();
  try {
    const url = new URL(`https://graph.facebook.com/v24.0/${encodeURIComponent(phoneNumberId)}`);
    url.searchParams.set('fields', 'id,verified_name,quality_rating');
    url.searchParams.set('appsecret_proof', createHmac('sha256', appSecret).update(accessToken).digest('hex'));
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(5000), cache: 'no-store',
    });
    const data = await response.json();
    const latencyMs = Math.round(performance.now() - started);
    if (!response.ok || data.error) return { healthy: false, latencyMs, error: data.error?.message || `Meta health check returned HTTP ${response.status}` };
    return { healthy: true, latencyMs, qualityRating: data.quality_rating || 'UNKNOWN' };
  } catch (error) {
    return { healthy: false, latencyMs: Math.round(performance.now() - started), error: error instanceof Error ? error.message : 'Meta health check failed' };
  }
}
