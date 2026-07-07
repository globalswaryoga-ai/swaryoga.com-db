import { isQrTenantConnected, resolveQrTenantBridge, sendQrTenantMessage } from '@/lib/qrTenantBridge';

/**
 * Send a plain-text WhatsApp message via the QR bridge (the connected Swar Yoga
 * account). Unlike Meta, the QR bridge can message any number — used to deliver
 * payment links and post-payment group links to leads who filled a public form.
 *
 * Returns true if the bridge accepted the message, false otherwise (caller can
 * fall back to showing the content on screen).
 */
export async function sendTextViaQrBridge(phone: string, text: string): Promise<boolean> {
  if (!phone) return false;
  const session = await resolveQrTenantBridge('admincrm');
  if (!session || !(await isQrTenantConnected(session))) return false;

  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  try {
    await sendQrTenantMessage(session, { to: jid, type: 'text', message: text });
    return true;
  } catch {
    return false;
  }
}
