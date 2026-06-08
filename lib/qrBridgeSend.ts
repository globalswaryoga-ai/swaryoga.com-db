import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

/**
 * Send a plain-text WhatsApp message via the QR bridge (the connected Swar Yoga
 * account). Unlike Meta, the QR bridge can message any number — used to deliver
 * payment links and post-payment group links to leads who filled a public form.
 *
 * Returns true if the bridge accepted the message, false otherwise (caller can
 * fall back to showing the content on screen).
 */
export async function sendTextViaQrBridge(phone: string, text: string): Promise<boolean> {
  const { url, secret } = getWhatsAppBridgeConfig();
  if (!url || !secret || !phone) return false;

  // Resolve a connected session (the central Swar Yoga account).
  let sessionKey: string | null = null;
  let userId = 'admincrm';
  try {
    const r = await fetch(`${url}/sessions`, { headers: { 'x-bridge-secret': secret } });
    if (r.ok) {
      const d = await r.json();
      const s = (d?.sessions || []).find((x: any) => x.status === 'connected');
      if (s) { sessionKey = s.sessionKey; userId = s.userId || userId; }
    }
  } catch { /* bridge unreachable */ }
  if (!sessionKey) return false;

  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  try {
    const res = await fetch(`${url}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': secret,
        'x-user-id': userId,
        'x-session-key': sessionKey,
      },
      body: JSON.stringify({ jid, type: 'text', text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
