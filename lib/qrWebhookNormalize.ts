export type NormalizedQRMedia = {
  kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  url?: string;
  mimetype?: string;
  filename?: string;
  base64?: string; // Some bridges send base64 data
};

export type NormalizedQRMessage = {
  from: string;
  to?: string;
  text?: string;
  messageId?: string;
  timestamp?: Date;
  fromMe?: boolean;
  hasMedia?: boolean;
  media?: NormalizedQRMedia;
  type?: string; // 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker'
  pushName?: string; // WhatsApp display name of the sender
  chatJid?: string;
  participant?: string;
};

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return undefined;
}

/** Preserve the WhatsApp conversation namespace while normalizing bare phones. */
export function normalizeQRChatJid(rawValue: string): string {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (raw.includes('@g.us') || raw.includes('@lid') || raw.includes('@s.whatsapp.net')) return raw;
  const digits = raw.split(':')[0].split('@')[0].replace(/\D/g, '');
  return digits ? `${digits}@s.whatsapp.net` : '';
}

/** Use a resolved sender phone for CRM matching, never an internal @lid ID. */
export function resolveQRContactPhone(message: NormalizedQRMessage, sourceJid: string): string {
  const isGroup = String(sourceJid || '').endsWith('@g.us');
  return isGroup && !message.fromMe
    ? String(message.participant || message.from || '')
    : String(message.from || sourceJid || '');
}

/**
 * Detect media type from message payload
 */
function extractMediaInfo(m: any): NormalizedQRMedia | undefined {
  // whatsapp-web.js style
  if (m.hasMedia || m.type === 'image' || m.type === 'video' || m.type === 'audio' || 
      m.type === 'document' || m.type === 'sticker' || m.type === 'ptt') {
    const kind = m.type === 'ptt' ? 'audio' : 
                 (m.type === 'image' || m.type === 'video' || m.type === 'audio' || 
                  m.type === 'document' || m.type === 'sticker') ? m.type : 'image';
    
    return {
      kind: kind as NormalizedQRMedia['kind'],
      mimetype: asString(m.mimetype || m.mimeType || m.mediaMimeType || m._data?.mimetype || m.media?.mimetype),
      filename: asString(m.filename || m.fileName || m._data?.filename || m.media?.filename),
      base64: asString(m._data?.data || m.mediaData?.data || m.base64 || m.mediaBase64 || m.media?.data || m.data),
      url: asString(m.mediaUrl || m.media?.url || m.url),
    };
  }
  
  // Check for media object directly
  if (m.media && typeof m.media === 'object') {
    return {
      kind: (m.media.type || m.media.kind || 'image') as NormalizedQRMedia['kind'],
      mimetype: asString(m.media.mimetype || m.media.mimeType),
      filename: asString(m.media.filename || m.media.fileName),
      base64: asString(m.media.data || m.media.base64),
      url: asString(m.media.url),
    };
  }
  
  // Check for image/video URLs directly
  if (m.imageUrl || m.videoUrl || m.audioUrl || m.documentUrl) {
    const kind = m.imageUrl ? 'image' : m.videoUrl ? 'video' : m.audioUrl ? 'audio' : 'document';
    return {
      kind,
      url: asString(m.imageUrl || m.videoUrl || m.audioUrl || m.documentUrl),
    };
  }
  
  return undefined;
}

/**
 * Normalizes the many possible payload shapes we get from QR/WhatsApp-web bridges.
 *
 * Supports whatsapp-web.js message_create payloads (id._serialized, fromMe, body, to).
 * Now includes media support for images, videos, audio, and documents.
 */
export function normalizeQRIncomingMessages(payload: any): NormalizedQRMessage[] {
  let list: any[] = [];

  if (Array.isArray(payload?.messages)) list = payload.messages;
  else if (Array.isArray(payload?.data?.messages)) list = payload.data.messages;
  else if (Array.isArray(payload?.message)) list = payload.message;
  else if (payload?.message && typeof payload.message === 'object') list = [payload.message];
  else if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) list = [payload.data];

  if (!list.length) {
    // Common single-message shapes
    if (payload?.from || payload?.sender || payload?.phone || payload?.id?._serialized) {
      const m = payload;
      const media = extractMediaInfo(m);
      return [
        {
          from: asString(m.from || m.sender || m.phone) || '',
          to: asString(m.to || m.receiver),
          text: asString(m.text || m.body || m.message || m?.content?.text),
          messageId: asString(m.id?._serialized || m.id || m.messageId || m.msgId),
          timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000) : undefined,
          fromMe: !!m.fromMe,
          hasMedia: !!media,
          media,
          type: media ? media.kind : 'text',
          chatJid: asString(m.originalJid || m.chatJid || m.key?.remoteJid),
          participant: asString(m.participant || m.key?.participant),
          pushName: asString(m.pushName || m.notifyName || m.senderName),
        },
      ].filter((m) => !!m.from || m.fromMe);
    }
    return [];
  }

  return list
    .map((m) => {
      const text =
        asString(m.text) ||
        asString(m.body) ||
        asString(m.message) ||
        asString(m?.content?.text) ||
        asString(m?.text?.body);

      const tsRaw = m.timestamp ?? m.ts ?? m.time ?? m.createdAt;
      let timestamp: Date | undefined;
      if (typeof tsRaw === 'number') {
        // providers may send seconds or ms - handle both
        timestamp = new Date(tsRaw < 10_000_000_000 ? tsRaw * 1000 : tsRaw);
      } else if (typeof tsRaw === 'string' && tsRaw) {
        const n = Number(tsRaw);
        if (!Number.isNaN(n)) {
          timestamp = new Date(n < 10_000_000_000 ? n * 1000 : n);
        } else {
          const d = new Date(tsRaw);
          if (!Number.isNaN(d.getTime())) timestamp = d;
        }
      }

      const media = extractMediaInfo(m);

      const pushName = asString(m.pushName || m.notifyName || m.senderName || m.contactName || m.name || m.contact?.name);
      return {
        from: asString(m.from || m.sender || m.phone || m?.contact?.id || m?.chatId) || '',
        to: asString(m.to || m.receiver),
        text,
        messageId: asString(m.id?._serialized || m.id || m.messageId || m.msgId || m?.key?.id),
        timestamp,
        fromMe: !!m.fromMe,
        hasMedia: !!media,
        media,
        type: media ? media.kind : 'text',
        ...(pushName ? { pushName } : {}),
        chatJid: asString(m.originalJid || m.chatJid || m?.key?.remoteJid),
        participant: asString(m.participant || m?.key?.participant),
      } as NormalizedQRMessage;
    })
    // Keep messages if they have: a valid from field, OR it's fromMe, OR it has a messageId (fallback for incoming messages without from)
    .filter((m) => !!m.from || m.fromMe || !!m.messageId);
}
