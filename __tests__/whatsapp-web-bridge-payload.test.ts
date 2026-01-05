import { normalizePhone } from '@/lib/whatsapp';

describe('WhatsApp Web bridge payload expectations', () => {
  it('normalizes phone to digits-only (suitable for bridge "phone")', () => {
    expect(normalizePhone('+91 93099-86820')).toBe('919309986820');
    expect(normalizePhone(' (930) 998 6820 ')).toBe('9309986820');
  });

  it('documents bridge required keys: phone + message', () => {
    const phone = normalizePhone('919309986820');
    const message = 'EC2 direct test message';
    const payload = { phone, message };

    // Regression: bridges reject {to, message}. Keep this test so we don't accidentally drift.
    expect(payload).toEqual({ phone: '919309986820', message: 'EC2 direct test message' });
    expect((payload as any).to).toBeUndefined();
  });
});
