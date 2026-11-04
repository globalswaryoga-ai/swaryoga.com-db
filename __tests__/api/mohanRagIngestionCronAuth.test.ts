/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/crm/mohan-rag/ingestion/process-now/route';
import { processNextMohanRagVideo } from '@/lib/mohanRag/videoIngestionWorker';

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/crm-handlers', () => ({
  isSuperAdmin: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyExecute: jest.fn(),
}));

jest.mock('@/lib/mohanRag/videoIngestionWorker', () => ({
  processNextMohanRagVideo: jest.fn().mockResolvedValue({ processed: false }),
}));

describe('Mohan RAG ingestion cron authorization', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it('accepts a configured cron secret for worker triggers', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const request = new NextRequest('http://localhost/api/admin/crm/mohan-rag/ingestion/process-now', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret', 'content-type': 'application/json' },
      body: JSON.stringify({ batchSize: 1 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(processNextMohanRagVideo).toHaveBeenCalled();
  });

  it('rejects cron requests when the secret is missing or incorrect', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const request = new NextRequest('http://localhost/api/admin/crm/mohan-rag/ingestion/process-now', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret', 'content-type': 'application/json' },
      body: JSON.stringify({ batchSize: 1 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(processNextMohanRagVideo).not.toHaveBeenCalled();
  });
});
