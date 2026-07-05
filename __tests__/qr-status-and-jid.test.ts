import { normalizeQrChatJid, normalizeQrStatusUpdate } from '@/lib/qrStatus';

describe('QR WhatsApp helpers', () => {
  it('maps delivery and read statuses to the UI status scale', () => {
    expect(normalizeQrStatusUpdate({ status: 'delivery_ack' })).toMatchObject({ uiStatus: 2, messageId: '' });
    expect(normalizeQrStatusUpdate({ status: 'read', messageId: 'abc123' })).toMatchObject({ uiStatus: 3, messageId: 'abc123' });
    expect(normalizeQrStatusUpdate({ key: { id: 'xyz789' }, ack: 2 })).toMatchObject({ uiStatus: 2, messageId: 'xyz789' });
  });

  it('normalizes phone numbers and preserves group JIDs', () => {
    expect(normalizeQrChatJid('919309986820')).toBe('919309986820@s.whatsapp.net');
    expect(normalizeQrChatJid('120363123456789@g.us')).toBe('120363123456789@g.us');
    expect(normalizeQrChatJid('120363123456789')).toBe('120363123456789@s.whatsapp.net');
  });
});
