import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getBunnyCrmUserSettings } from '@/lib/bunnyCrmSettings';
import { uploadToPath } from '@/lib/bunny-storage';
import { getQrStorageFolder, initBunnyQrSchema, upsertBunnyQrChat, upsertBunnyQrMessage } from '@/lib/bunnyQrRepository';
import { baileysStatusToQrStatus, QR_MESSAGE_STATUS } from '@/lib/qrMessageStatus';
import { normalizeQRChatJid, normalizeQRIncomingMessages } from '@/lib/qrWebhookNormalize';
import { normalizePhone } from '@/lib/whatsapp';

const SUPER_ADMIN_IDS = new Set(['admin', 'admincrm']);
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf',
};

function phoneOf(value: unknown): string {
  return normalizePhone(String(value || '').split(':')[0].split('@')[0]);
}

/** Super Admin QR data has one canonical owner so old and new history stay together. */
function storageOwner(userId: string): string {
  return SUPER_ADMIN_IDS.has(userId) ? 'admin' : userId;
}

async function resolveConnectedPhone(payload: any, userId: string): Promise<string> {
  const explicit = phoneOf(payload?.connectedPhone);
  if (explicit) return explicit;
  const settings = await getBunnyCrmUserSettings(userId).catch(() => null);
  const stored = phoneOf((settings as any)?.qrConnectedPhoneNumber);
  if (stored) return stored;
  return !payload?.fromMe ? phoneOf(payload?.to) : '';
}

/**
 * Saves QR webhook messages to Bunny SQL before any legacy persistence runs.
 * Inline media is uploaded to the number's 9-digit Bunny folder and the
 * payload is rewritten to its CDN URL so later handlers never re-upload it.
 */
export async function persistQrWebhookToBunny(payload: any) {
  const userId = String(payload?.bridgeUserId || '').trim();
  if (!userId) return { saved: 0, reason: 'missing_bridge_user' };
  const connectedPhone = await resolveConnectedPhone(payload, userId);
  if (!connectedPhone) return { saved: 0, reason: 'missing_connected_phone' };

  const messages = normalizeQRIncomingMessages(payload);
  if (!messages.length) return { saved: 0, reason: 'no_messages_detected' };

  const owner = storageOwner(userId);
  const folder = await getQrStorageFolder(owner, connectedPhone);
  const historySync = payload?.type === 'history_sync';
  let saved = 0;

  for (const m of messages) {
    if (!m.messageId) continue;
    const text = String(m.text || '').trim();
    const chatJid = normalizeQRChatJid(m.chatJid || (m.fromMe ? (m.to || m.from) : m.from));
    if (!chatJid || (!text && !m.hasMedia && m.type !== 'reaction')) continue;

    let mediaUrl = m.media?.url || '';
    if (m.media?.base64 && !mediaUrl) {
      try {
        const mime = m.media.mimetype || 'application/octet-stream';
        const ext = MIME_EXTENSIONS[mime.split(';')[0]] || 'bin';
        const safeId = m.messageId.replace(/[^a-zA-Z0-9_-]/g, '');
        mediaUrl = await uploadToPath(Buffer.from(m.media.base64, 'base64'), `${folder.folderPath}/media/${safeId}.${ext}`, mime);
        if (payload.media && typeof payload.media === 'object') { payload.media.url = mediaUrl; delete payload.media.data; }
        if (!Array.isArray(payload.messages)) { payload.mediaUrl = mediaUrl; delete payload.mediaBase64; }
      } catch (err: any) {
        console.error('[QR BUNNY] Media upload failed:', err?.message || err);
      }
    }

    const timestampMs = m.timestamp ? new Date(m.timestamp).getTime() : Date.now();
    const timestamp = Math.floor(timestampMs / 1000);
    const isGroup = chatJid.endsWith('@g.us');
    const preview = text || (m.media ? `[${m.media.kind}]` : '');
    await upsertBunnyQrMessage({
      userId: owner, connectedPhone, chatJid, messageId: m.messageId, storageFolderId: folder.folderId,
      direction: m.fromMe ? 'outbound' : 'inbound', fromMe: !!m.fromMe, body: text, text,
      type: m.type || 'text', participant: (m as any).participant || '', pushName: m.pushName || '',
      timestamp, status: m.fromMe ? QR_MESSAGE_STATUS.SENT : QR_MESSAGE_STATUS.PENDING,
      hasMedia: !!m.hasMedia, mediaUrl, mediaType: m.media?.kind || '', mediaMimetype: m.media?.mimetype || '',
      mediaFileName: m.media?.filename || '',
    });

    const existing = await bunnyExecute({ sql: 'SELECT data_json, unread_count, conversation_timestamp FROM qr_chats_sql WHERE user_id = ? AND connected_phone = ? AND chat_jid = ? LIMIT 1', args: [owner, connectedPhone, chatJid] });
    const previous = existing.rows[0] ? JSON.parse(String(existing.rows[0].data_json || '{}')) : {};
    const isNewer = timestamp >= Number(existing.rows[0]?.conversation_timestamp || 0);
    const pushName = String(m.pushName || '').trim();
    const name = previous.name && !/^\+?\d+$/.test(previous.name) ? previous.name : (!isGroup && pushName ? pushName : previous.name || phoneOf(chatJid));
    await upsertBunnyQrChat({
      ...previous, userId: owner, connectedPhone, chatJid, name, isGroup, storageFolderId: folder.folderId,
      ...(isNewer ? { lastMessage: preview, lastMessageTime: timestampMs, lastMessageFromMe: !!m.fromMe, conversationTimestamp: timestamp } : {}),
      unreadCount: m.fromMe ? 0 : Number(previous.unreadCount || 0) + (historySync ? 0 : 1),
    });
    saved++;
  }
  return { saved, storageFolderId: folder.folderId };
}

/** Applies delivery/read ticks to Bunny QR messages without downgrading status. */
export async function applyQrStatusToBunny(payload: any) {
  const messageId = String(payload?.messageId || payload?.id || '').trim();
  const status = baileysStatusToQrStatus(payload?.status ?? payload?.ack);
  if (!messageId || status == null) return { updated: 0 };
  await initBunnyQrSchema();
  const result = await bunnyExecute({
    sql: "UPDATE qr_messages_sql SET status = ?, data_json = json_set(data_json, '$.status', ?), updated_at = ? WHERE message_id = ? AND status < ?",
    args: [status, status, new Date().toISOString(), messageId, status],
  });
  return { updated: Number(result.rowsAffected || 0) };
}
