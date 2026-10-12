/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/qr-broadcast-processor/route';

describe('legacy QR broadcast processor endpoint', () => {
  const previousSecret = process.env.CRON_SECRET;

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  });

  it('retires the Mongo-backed processor and directs callers to the Bunny processor', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';

    const request = new NextRequest(
      'https://crm.example.test/api/cron/qr-broadcast-processor?secret=test-cron-secret',
    );
    const response = await GET(request);

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: 'This legacy processor has been retired. Use /api/cron/qr-broadcast-processor-v2.',
    });
  });
});
