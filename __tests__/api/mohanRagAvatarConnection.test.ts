/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/crm/mohan-rag/avatar-connection/route';
import { getMohanRagAvatarConfig } from '@/lib/mohanRag/avatarConfig';

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn().mockReturnValue({ userId: 'admin' }),
}));

jest.mock('@/lib/crm-handlers', () => ({
  isSuperAdmin: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/mohanRag/avatarConfig', () => ({
  getMohanRagAvatarConfig: jest.fn(),
  saveMohanRagAvatarConfig: jest.fn(),
}));

describe('Mohan RAG avatar connection readiness', () => {
  const originalHeygenKey = process.env.HEYGEN_API_KEY;
  const originalReplicateKey = process.env.REPLICATE_API_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    (getMohanRagAvatarConfig as jest.Mock).mockResolvedValue({
      authorized: true,
      avatarId: 'avatar-1',
      voiceId: 'voice-1',
      supportedLanguages: ['mr'],
    });
  });

  afterAll(() => {
    if (originalHeygenKey === undefined) delete process.env.HEYGEN_API_KEY;
    else process.env.HEYGEN_API_KEY = originalHeygenKey;
    if (originalReplicateKey === undefined) delete process.env.REPLICATE_API_TOKEN;
    else process.env.REPLICATE_API_TOKEN = originalReplicateKey;
  });

  it('requires HeyGen credentials, not Replicate credentials, for RAG video rendering', async () => {
    delete process.env.HEYGEN_API_KEY;
    process.env.REPLICATE_API_TOKEN = 'replicate-test-token';

    const response = await GET(new NextRequest('http://localhost/api/admin/crm/mohan-rag/avatar-connection'));
    const body = await response.json();

    expect(body.connected).toBe(false);
    expect(body.status).toBe('setup_required');
    expect(body.message).toContain('HEYGEN_API_KEY');

    process.env.HEYGEN_API_KEY = 'heygen-test-key';
    const readyResponse = await GET(new NextRequest('http://localhost/api/admin/crm/mohan-rag/avatar-connection'));
    const readyBody = await readyResponse.json();
    expect(readyBody.connected).toBe(true);
    expect(readyBody.status).toBe('ready');
  });
});
