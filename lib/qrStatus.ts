export function normalizeQrStatusUpdate(payload: any) {
  const messageId = String(payload?.messageId || payload?.id || payload?.key?.id || '').trim();
  const raw = payload?.status ?? payload?.ack ?? payload?.update?.status;
  let baileysStatus: number | null = null;

  if (typeof raw === 'number') {
    baileysStatus = raw;
  } else if (typeof raw === 'string') {
    const map: Record<string, number> = {
      error: 0,
      failed: 0,
      pending: 1,
      sent: 2,
      server_ack: 2,
      delivered: 3,
      delivery_ack: 3,
      read: 4,
      played: 5,
    };
    baileysStatus = map[raw.toLowerCase()] ?? null;
  }

  if (baileysStatus == null || baileysStatus === 1) {
    return { messageId, uiStatus: null, skipped: true, reason: 'unmapped_status' };
  }

  const uiStatus = baileysStatus === 0 ? -1 : Math.min(baileysStatus - 1, 3);

  return { messageId, uiStatus, skipped: false, reason: null };
}

export function normalizeQrChatJid(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('@g.us') || raw.includes('@s.whatsapp.net') || raw.includes('@lid') || raw.includes('@c.us')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  return `${digits}@s.whatsapp.net`;
}
