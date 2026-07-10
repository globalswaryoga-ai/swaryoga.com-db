/**
 * Shared plumbing for the QR bridge's special send types (poll, location,
 * contact card, status). Resolves the tenant's isolated bridge session, calls
 * the given bridge endpoint, and logs the outbound message into
 * qr_whatsapp_messages so it appears in the inbox/history.
 */

import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = getWhatsAppBridgeConfig();

export interface QrBridgeSession {
  bridgeUrl: string;
  bridgeSecret: string;
  bridgeSessionId: string;
  tenantId: string | null;
  hasOwnBridge: boolean;
  connectedPhone: string;
}

export async function resolveQrBridgeSession(userId: string): Promise<QrBridgeSession> {
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();
  const settings = await CRMUserSettings.findOne(
    { userId },
    { permanentTenantId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1, qrConnectedPhoneNumber: 1 }
  ).lean() as any;

  const connectedPhone = String(settings?.qrConnectedPhoneNumber || '').split(':')[0].split('@')[0].replace(/\D/g, '');

  if (settings?.permanentTenantId) {
    return {
      bridgeUrl: BRIDGE_URL,
      bridgeSecret: BRIDGE_SECRET,
      bridgeSessionId: settings.permanentTenantId,
      tenantId: settings.permanentTenantId,
      hasOwnBridge: true,
      connectedPhone,
    };
  }
  if (settings?.qrBridgeUrl) {
    return {
      bridgeUrl: settings.qrBridgeUrl,
      bridgeSecret: settings.qrBridgeSecret || BRIDGE_SECRET,
      bridgeSessionId: userId,
      tenantId: null,
      hasOwnBridge: true,
      connectedPhone,
    };
  }
  return {
    bridgeUrl: BRIDGE_URL,
    bridgeSecret: BRIDGE_SECRET,
    bridgeSessionId: userId,
    tenantId: null,
    hasOwnBridge: false,
    connectedPhone,
  };
}

export function normalizeChatJid(to: string): string {
  const toStr = String(to || '');
  if (toStr.endsWith('@g.us')) return toStr;
  const digits = toStr.split('@')[0].replace(/\D/g, '');
  return digits.length > 15 ? `${digits}@g.us` : `${digits}@s.whatsapp.net`;
}

/**
 * Call a bridge endpoint with the tenant's session headers.
 */
export async function callQrBridge(
  session: QrBridgeSession,
  userId: string,
  endpoint: string,
  payload: Record<string, unknown>,
  timeoutMs = 12000
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${session.bridgeUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bridge-secret': session.bridgeSecret,
      'x-user-id': userId,
      'x-session-key': session.bridgeSessionId,
      ...(session.tenantId ? { 'x-tenant-id': session.tenantId } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Log an outbound special-type message into qr_whatsapp_messages so it shows
 * in the inbox history and can be matched by status_update webhooks.
 */
export async function logQrOutboundMessage(params: {
  userId: string;
  session: QrBridgeSession;
  chatJid: string;
  messageId: string;
  text: string;
  type: string;
}): Promise<void> {
  const { userId, session, chatJid, messageId, text, type } = params;
  if (!messageId || !session.connectedPhone) return;
  try {
    const QrMsg = getQrWhatsAppMessage();
    await QrMsg.updateOne(
      { userId, connectedPhone: session.connectedPhone, messageId, chatJid },
      {
        $set: {
          userId,
          connectedPhone: session.connectedPhone,
          chatJid,
          messageId,
          direction: 'outbound',
          fromMe: true,
          text,
          type,
          participant: '',
          pushName: '',
          timestamp: Math.floor(Date.now() / 1000),
          status: 1,
          hasMedia: false,
          mediaUrl: '',
          mediaMimetype: '',
          mediaFileName: '',
          metadata: { sessionKey: session.bridgeSessionId, tenantId: session.tenantId || session.bridgeSessionId },
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[QR SpecialSend] Failed to log outbound message:', err instanceof Error ? err.message : err);
  }
}
