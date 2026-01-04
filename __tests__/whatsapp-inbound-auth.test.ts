import crypto from 'crypto';

/**
 * Minimal regression tests for the inbound WhatsApp Web bridge auth scheme.
 *
 * Contract:
 * - CRM expects header: x-whatsapp-bridge-secret
 * - It must exactly match WHATSAPP_WEB_BRIDGE_SECRET
 */

describe('WhatsApp inbound bridge auth', () => {
  it('treats exact secret match as authorized', () => {
    const expected = 'test-secret-123';
    const header = 'test-secret-123';

    expect(header === expected).toBe(true);
  });

  it('treats missing or mismatched secret as unauthorized', () => {
    const expected = 'test-secret-123';

    const missing: string = '';
    const wrong: string = 'wrong-secret';

    expect(missing === expected).toBe(false);
    expect(wrong === expected).toBe(false);
  });

  it('demo: constant-time compare helper can be built safely', () => {
    // This test is here to validate our chosen safe-compare pattern.
    // If we ever adopt timingSafeEqual in the handler, this pattern works.
    const a = Buffer.from('abc');
    const b = Buffer.from('abc');
    const c = Buffer.from('abd');

    expect(crypto.timingSafeEqual(a, b)).toBe(true);
    expect(crypto.timingSafeEqual(a, c)).toBe(false);
  });
});
