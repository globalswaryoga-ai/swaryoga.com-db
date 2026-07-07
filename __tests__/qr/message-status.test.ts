import { baileysStatusToQrStatus, QR_MESSAGE_STATUS, qrStatusToMessageStatus } from '@/lib/qrMessageStatus';

describe('QR message status mapping', () => {
  it.each([
    [0, QR_MESSAGE_STATUS.FAILED],
    [2, QR_MESSAGE_STATUS.SENT],
    [3, QR_MESSAGE_STATUS.DELIVERED],
    [4, QR_MESSAGE_STATUS.READ],
    [5, QR_MESSAGE_STATUS.READ],
    ['failed', QR_MESSAGE_STATUS.FAILED],
    ['sent', QR_MESSAGE_STATUS.SENT],
    ['delivered', QR_MESSAGE_STATUS.DELIVERED],
    ['read', QR_MESSAGE_STATUS.READ],
  ])('maps Baileys %p to canonical %p', (raw, expected) => {
    expect(baileysStatusToQrStatus(raw)).toBe(expected);
  });

  it('ignores pending and unknown receipts', () => {
    expect(baileysStatusToQrStatus(1)).toBeNull();
    expect(baileysStatusToQrStatus('pending')).toBeNull();
    expect(baileysStatusToQrStatus('unknown')).toBeNull();
  });

  it('maps canonical values to unified message statuses', () => {
    expect(qrStatusToMessageStatus(-1)).toBe('failed');
    expect(qrStatusToMessageStatus(1)).toBe('sent');
    expect(qrStatusToMessageStatus(2)).toBe('delivered');
    expect(qrStatusToMessageStatus(3)).toBe('read');
  });
});
