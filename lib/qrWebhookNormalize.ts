export type NormalizedQRMessage = {
  from: string;
  to?: string;
  text?: string;
  messageId?: string;
  timestamp?: Date;
  fromMe?: boolean;
};

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return undefined;
}

/**
 * Normalizes the many possible payload shapes we get from QR/WhatsApp-web bridges.
 *
 * Supports whatsapp-web.js message_create payloads (id._serialized, fromMe, body, to).
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
      return [
        {
          from: asString(m.from || m.sender || m.phone) || '',
          to: asString(m.to || m.receiver),
          text: asString(m.text || m.body || m.message || m?.content?.text),
          messageId: asString(m.id?._serialized || m.id || m.messageId || m.msgId),
          timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000) : undefined,
          fromMe: !!m.fromMe,
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

      return {
        from: asString(m.from || m.sender || m.phone || m?.contact?.id || m?.chatId) || '',
        to: asString(m.to || m.receiver),
        text,
        messageId: asString(m.id?._serialized || m.id || m.messageId || m.msgId || m?.key?.id),
        timestamp,
        fromMe: !!m.fromMe,
      } as NormalizedQRMessage;
    })
    .filter((m) => !!m.from || m.fromMe);
}
