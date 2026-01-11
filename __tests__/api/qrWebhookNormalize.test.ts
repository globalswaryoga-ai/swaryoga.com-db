import { describe, expect, test } from '@jest/globals';

/**
 * This file unit tests the message normalization logic used by the QR bridge webhook.
 *
 * Note: We can't import Next.js route handlers directly here without heavier setup,
 * so we test the pure logic by dynamic import of a helper export.
 */

describe('QR webhook normalization (whatsapp-web.js message_create)', () => {
  test('captures outbound message (fromMe) and picks id._serialized', async () => {
    const mod = await import('../../lib/qrWebhookNormalize');
    const { normalizeQRIncomingMessages } = mod;

    const payload = {
      fromMe: true,
      to: '919876543210@c.us',
      body: 'Hello from phone',
      id: { _serialized: 'ABC123' },
      timestamp: 1700000000,
    };

  const out = normalizeQRIncomingMessages(payload);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      fromMe: true,
      to: '919876543210@c.us',
      text: 'Hello from phone',
      messageId: 'ABC123',
    });
  });

  test('captures inbound message (fromMe false) and accepts array payloads', async () => {
    const mod = await import('../../lib/qrWebhookNormalize');
    const { normalizeQRIncomingMessages } = mod;

    const payload = {
      messages: [
        {
          from: '919912345678@c.us',
          body: 'Hi',
          id: { _serialized: 'XYZ' },
          fromMe: false,
          timestamp: 1700000001,
        },
      ],
    };

  const out = normalizeQRIncomingMessages(payload);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      from: '919912345678@c.us',
      text: 'Hi',
      messageId: 'XYZ',
      fromMe: false,
    });
  });
});
