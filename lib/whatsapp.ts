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
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in environment');
  }

  return { accessToken, phoneNumberId };
}

export async function sendWhatsAppText(toRaw: string, body: string): Promise<WhatsAppSendTextResult> {
  const { accessToken, phoneNumberId } = getWhatsAppEnv();
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
