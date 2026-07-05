/** Canonical status stored in qr_whatsapp_messages and consumed by every QR UI. */
export const QR_MESSAGE_STATUS = {
  FAILED: -1,
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
} as const;

export type QrMessageStatus = typeof QR_MESSAGE_STATUS[keyof typeof QR_MESSAGE_STATUS];

/** Convert raw Baileys ack/status values into the canonical persisted scale. */
export function baileysStatusToQrStatus(raw: unknown): QrMessageStatus | null {
  let value: number | null = null;
  if (typeof raw === 'number') value = raw;
  if (typeof raw === 'string') {
    const named: Record<string, number> = {
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
    value = named[raw.toLowerCase()] ?? null;
  }

  if (value === null || value === 1) return null;
  if (value <= 0) return QR_MESSAGE_STATUS.FAILED;
  if (value === 2) return QR_MESSAGE_STATUS.SENT;
  if (value === 3) return QR_MESSAGE_STATUS.DELIVERED;
  return QR_MESSAGE_STATUS.READ;
}

export function qrStatusToMessageStatus(status: QrMessageStatus): 'failed' | 'sent' | 'delivered' | 'read' {
  if (status === QR_MESSAGE_STATUS.READ) return 'read';
  if (status === QR_MESSAGE_STATUS.DELIVERED) return 'delivered';
  if (status === QR_MESSAGE_STATUS.SENT) return 'sent';
  return 'failed';
}
