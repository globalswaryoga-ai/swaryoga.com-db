import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export type QrTenantBridge = {
  userId: string;
  ownerUserId: string;
  url: string;
  secret: string;
  sessionKey: string;
  tenantId: string;
  connectedPhone: string;
};

/** O(1) tenant/session resolution; never lists or falls back to another tenant's session. */
export async function resolveQrTenantBridge(userId: string, storedSessionKey?: string): Promise<QrTenantBridge | null> {
  const ownerId = String(userId || '').trim();
  if (!ownerId) return null;
  await connectDB();

  const Settings = getCRMUserSettings();
  const settings: any = await Settings.findOne(
    storedSessionKey ? { permanentTenantId: storedSessionKey } : { userId: ownerId },
    { userId: 1, permanentTenantId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1, qrConnectedPhoneNumber: 1 }
  ).lean();
  const fallback = getWhatsAppBridgeConfig();
  const sessionKey = String(storedSessionKey || settings?.permanentTenantId || '').trim();
  if (!sessionKey) return null;

  return {
    userId: ownerId,
    ownerUserId: String(settings?.userId || ownerId),
    url: String(settings?.qrBridgeUrl || fallback.url).replace(/\/+$/, ''),
    secret: String(settings?.qrBridgeSecret || fallback.secret),
    sessionKey,
    tenantId: sessionKey,
    connectedPhone: String(settings?.qrConnectedPhoneNumber || '').split(':')[0].split('@')[0].replace(/\D/g, ''),
  };
}

export function qrTenantHeaders(session: QrTenantBridge): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-bridge-secret': session.secret,
    'x-user-id': session.userId,
    'x-owner-user-id': session.ownerUserId,
    'x-session-key': session.sessionKey,
    'x-tenant-id': session.tenantId,
  };
}

export async function isQrTenantConnected(session: QrTenantBridge): Promise<boolean> {
  try {
    const response = await fetch(`${session.url}/status`, {
      headers: qrTenantHeaders(session),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const data = await response.json().catch(() => ({}));
    return data?.connected === true || data?.status === 'connected';
  } catch {
    return false;
  }
}

export async function sendQrTenantMessage(session: QrTenantBridge, payload: Record<string, unknown>) {
  const response = await fetch(`${session.url}/send`, {
    method: 'POST',
    headers: qrTenantHeaders(session),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || `QR bridge send failed (HTTP ${response.status})`);
  }
  return {
    waMessageId: String(data?.messageId || data?.id || data?.key?.id || ''),
    data,
  };
}
