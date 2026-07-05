import { connectDB } from '@/lib/db';
import { getBroadcastRunMessage, getQrWhatsAppMessage, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { baileysStatusToQrStatus, QR_MESSAGE_STATUS, qrStatusToMessageStatus } from '@/lib/qrMessageStatus';

/** Persist one receipt across inbox, history and broadcast reports without downgrades. */
export async function applyQrStatusUpdate(payload: any, bridgeUserId?: string) {
  const messageId = String(payload?.messageId || payload?.id || '').trim();
  if (!messageId) return { skipped: true, reason: 'no_messageId' };
  const qrStatus = baileysStatusToQrStatus(payload?.status ?? payload?.ack);
  if (qrStatus == null) return { skipped: true, reason: 'unmapped_status' };

  await connectDB();
  const qrFilter: any = {
    messageId,
    status: qrStatus === QR_MESSAGE_STATUS.FAILED ? { $in: [0, 1] } : { $lt: qrStatus },
  };
  const sessionKey = String(payload?.bridgeSessionId || '').trim();
  if (sessionKey && bridgeUserId) {
    qrFilter.$or = [
      { 'metadata.sessionKey': sessionKey },
      { userId: bridgeUserId, 'metadata.sessionKey': { $exists: false } },
    ];
  } else if (sessionKey) qrFilter['metadata.sessionKey'] = sessionKey;
  else if (bridgeUserId) qrFilter.userId = bridgeUserId;
  const qrResult = await getQrWhatsAppMessage().updateMany(qrFilter, { $set: { status: qrStatus } });

  const unifiedStatus = qrStatusToMessageStatus(qrStatus);
  const rank: Record<string, number> = { failed: -1, pending: 0, queued: 0, sending: 0, sent: 1, delivered: 2, read: 3 };
  const eligibleStatuses = qrStatus === QR_MESSAGE_STATUS.FAILED
    ? ['pending', 'queued', 'sending', 'sent']
    : Object.keys(rank).filter((status) => rank[status] < rank[unifiedStatus]);
  const now = new Date();
  const statusFields: any = { status: unifiedStatus };
  if (qrStatus === QR_MESSAGE_STATUS.DELIVERED) statusFields.deliveredAt = now;
  if (qrStatus === QR_MESSAGE_STATUS.READ) {
    statusFields.deliveredAt = now;
    statusFields.readAt = now;
  }

  const unifiedFilter: any = { waMessageId: messageId, status: { $in: eligibleStatuses } };
  const connectedPhone = String(payload?.connectedPhone || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  if (sessionKey && connectedPhone) {
    unifiedFilter.$or = [{ 'metadata.sessionKey': sessionKey }, { senderNumber: connectedPhone }, { provider: 'qr' }];
  } else if (sessionKey) {
    unifiedFilter['metadata.sessionKey'] = sessionKey;
  }
  await getWhatsAppMessage().updateMany(
    unifiedFilter,
    { $set: statusFields }
  );

  const reportFields = { ...statusFields, updatedAt: now };
  const reportMessage = await getBroadcastRunMessage().findOneAndUpdate(
    { waMessageId: messageId, provider: 'qr', status: { $in: eligibleStatuses } },
    { $set: reportFields },
    { projection: { runId: 1 } }
  );
  if (reportMessage?.runId) {
    const { markRunStats } = await import('@/lib/broadcastRuns');
    await markRunStats(reportMessage.runId);
  }

  return { updated: qrResult.modifiedCount || 0, status: qrStatus };
}
