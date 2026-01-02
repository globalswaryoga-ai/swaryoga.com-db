/**
 * WhatsApp Cloud API helpers (Meta Graph API)
 * Centralized here so routes don't drift.
 */

export function normalizePhone(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[\s\-()]/g, '');
}

export type WhatsAppSendTextResult = {
  waMessageId?: string;
  raw: any;
};

function getWhatsAppEnv() {
  // Primary (preferred) env keys
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_BUSINESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_BUSINESS_PHONE_NUMBER;

  if (!accessToken || !phoneNumberId) {
    return null; // Cloud API not configured; fallback to Web bridge
  }

  return { accessToken, phoneNumberId };
}

export async function sendWhatsAppText(toRaw: string, body: string): Promise<WhatsAppSendTextResult> {
  const env = getWhatsAppEnv();

  // If Cloud API is configured, use it
  if (env) {
    const { accessToken, phoneNumberId } = env;
    const to = normalizePhone(toRaw);

    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        data?.error?.message || data?.error?.error_user_msg || data?.error || 'WhatsApp API error';
      const err = new Error(String(message));
      (err as any).status = res.status;
      (err as any).data = data;
      throw err;
    }

    const waMessageId =
      Array.isArray(data?.messages) && data.messages[0]?.id ? String(data.messages[0].id) : undefined;

    return { waMessageId, raw: data };
  }

  // Fallback: Cloud API not configured → use WhatsApp Web bridge
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL;
  if (!bridgeUrl) {
    throw new Error(
      'WhatsApp sending unavailable: ' +
        'Cloud API not configured (missing WHATSAPP_ACCESS_TOKEN) ' +
        'and no Web bridge URL set (WHATSAPP_BRIDGE_HTTP_URL). ' +
        'Either configure Cloud API or set bridge URLs to use WhatsApp Web QR.'
    );
  }

  const to = normalizePhone(toRaw);
  const sendUrl = `${bridgeUrl}/send`;
  const bridgeSecret = process.env.WHATSAPP_WEB_BRIDGE_SECRET;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bridgeSecret) {
    headers['X-Bridge-Secret'] = bridgeSecret;
  }

  const res = await fetch(sendUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, message: body }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.error || data?.message || `WhatsApp Web bridge error (HTTP ${res.status})`;
    const err = new Error(String(message));
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  // Bridge typically returns { success: true, messageId?: "..." }
  const waMessageId = data?.messageId || data?.waMessageId;
  return { waMessageId, raw: data };
}
