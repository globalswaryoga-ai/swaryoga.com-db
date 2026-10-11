/** @jest-environment node */

jest.mock('@/lib/whatsappProtection', () => ({
  recordSuccess: jest.fn(), recordFailure: jest.fn(), isCircuitOpen: jest.fn(() => false),
  resetCircuit: jest.fn(), withRetry: jest.fn(callback => callback()), metaCircuitKey: jest.fn(),
}));

import { createHmac } from 'node:crypto';
import { probeMetaHealth } from '@/lib/metaHealth';
import { sendWhatsAppTemplate, uploadMediaToMeta } from '@/lib/whatsapp';

describe('Meta health and media latency repairs', () => {
  const originalFetch = global.fetch;
  const credentials = { accessToken: 'test-token', phoneNumberId: 'phone-1', phoneNumber: '', appSecret: 'test-secret' };
  afterEach(() => { global.fetch = originalFetch; });

  it('authenticates read-only health with appsecret proof and returns quality without credentials', async () => {
    const fetchMock = jest.fn().mockResolvedValue(Response.json({ id: 'phone-1', quality_rating: 'GREEN' }));
    global.fetch = fetchMock;
    const health = await probeMetaHealth(credentials);
    expect(health).toMatchObject({ healthy: true, qualityRating: 'GREEN' });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('appsecret_proof')).toBe(createHmac('sha256', 'test-secret').update('test-token').digest('hex'));
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
    expect(JSON.stringify(health)).not.toContain('test-token');
    expect(JSON.stringify(health)).not.toContain('phone-1');
  });

  it('reports failed Meta authentication instead of healthy success', async () => {
    global.fetch = jest.fn().mockResolvedValue(Response.json({ error: { message: 'Token expired' } }, { status: 401 }));
    expect(await probeMetaHealth(credentials)).toMatchObject({ healthy: false, error: 'Token expired' });
  });

  it('uploads the same template header once for simultaneous recipients and isolates accounts', async () => {
    const fetchMock = jest.fn()
      .mockImplementation(async (url: URL | string) => String(url).includes('graph.facebook.com')
        ? Response.json({ id: 'media-id' }) : new Response(new Uint8Array([1, 2, 3])));
    global.fetch = fetchMock;
    const ids = await Promise.all(Array.from({ length: 20 }, () =>
      uploadMediaToMeta('https://example.test/test-header.jpg', 'image/jpeg', credentials)));
    expect(new Set(ids)).toEqual(new Set(['media-id']));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await uploadMediaToMeta('https://example.test/test-header.jpg', 'image/jpeg', { ...credentials, phoneNumberId: 'phone-2' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not cache a failed media upload', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = jest.fn().mockResolvedValue(new Response('', { status: 503 }));
    global.fetch = fetchMock;
    try {
      expect(await uploadMediaToMeta('https://example.test/failed.jpg', 'image/jpeg', credentials)).toBeNull();
      expect(await uploadMediaToMeta('https://example.test/failed.jpg', 'image/jpeg', credentials)).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally { warning.mockRestore(); }
  });

  it('reuses header uploads while preserving each recipient template payload and send timeout', async () => {
    const fetchMock = jest.fn().mockImplementation(async (url: URL | string) => {
      if (String(url).includes('/messages')) return Response.json({ messages: [{ id: 'wa-message' }] });
      if (String(url).includes('graph.facebook.com')) return Response.json({ id: 'shared-header' });
      return new Response(new Uint8Array([1, 2, 3]));
    });
    global.fetch = fetchMock;
    for (const to of ['919999999998', '919999999999']) {
      expect(await sendWhatsAppTemplate({
        to, templateName: 'approved_welcome', language: 'en',
        headerMedia: { kind: 'image', url: 'https://example.test/send-header.jpg' },
      }, credentials)).toMatchObject({ waMessageId: 'wa-message' });
    }
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const sends = fetchMock.mock.calls.filter(([url]) => String(url).includes('/messages'));
    expect(sends.map(([, options]) => JSON.parse(options.body).to)).toEqual(['919999999998', '919999999999']);
    for (const [, options] of sends) {
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(JSON.parse(options.body).template).toMatchObject({
        name: 'approved_welcome', language: { code: 'en' },
        components: [{ type: 'header', parameters: [{ type: 'image', image: { id: 'shared-header' } }] }],
      });
    }
  });
});
