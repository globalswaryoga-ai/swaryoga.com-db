/** @jest-environment node */

process.env.DISABLE_MONGODB = 'true';
process.env.USE_BUNNY_DATABASE_ONLY = 'true';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyExecute: jest.fn(),
  bunnyBatch: jest.fn().mockResolvedValue([]),
}));

import { bunnyExecute } from '@/lib/bunnyDatabase';
import { GET as getTwins, POST as createTwin } from '@/app/api/avatar/digital-twin/route';
import { GET as getBodies, POST as createBody } from '@/app/api/avatar/3d-body/route';
import { GET as getExpressions, POST as createExpression } from '@/app/api/avatar/expressions/route';
import { GET as getMotions, POST as createMotion } from '@/app/api/avatar/motion/route';
import { POST as createAvatarJob } from '@/app/api/avatar/jobs/route';
import { GET as getAvatarLibrary } from '@/app/api/avatar/library/route';
import { GET as getLegacyColabBridge, POST as postLegacyColabBridge } from '@/app/api/avatar/colab-bridge/route';
import { POST as postLegacyVoice } from '@/app/api/avatar/voice/generate/route';
import { analyzeFaceGeometry, FaceAnalysisUnavailableError } from '@/lib/avatarEngine/faceIdentityService';
import { generateToken } from '@/lib/auth';

function makeMockRequest(urlStr: string, method: string, token?: string, body?: any): any {
  const url = new URL(urlStr, 'http://localhost:3000');
  const headers = new Map<string, string>();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  return {
    method,
    url: url.toString(),
    nextUrl: url,
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) || null,
    },
    json: async () => body || {},
  };
}

describe('Avatar API Security & Tenant Isolation Tests', () => {
  const userAToken = generateToken({
    userId: 'tenant_user_a',
    username: 'user_a',
    isAdmin: true,
  });

  const userBToken = generateToken({
    userId: 'tenant_user_b',
    username: 'user_b',
    isAdmin: true,
  });

  const nonAdminToken = generateToken({
    userId: 'normal_user',
    username: 'normal',
    isAdmin: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Unauthorized Request Protection (401)', () => {
    it('rejects digital-twin GET without token with 401', async () => {
      const req = makeMockRequest('/api/avatar/digital-twin', 'GET');
      const res = await getTwins(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('rejects digital-twin POST without token with 401', async () => {
      const req = makeMockRequest('/api/avatar/digital-twin', 'POST', undefined, { twinName: 'Test' });
      const res = await createTwin(req);
      expect(res.status).toBe(401);
    });

    it('rejects 3D body GET without token with 401', async () => {
      const req = makeMockRequest('/api/avatar/3d-body', 'GET');
      const res = await getBodies(req);
      expect(res.status).toBe(401);
    });

    it('rejects 3D body POST without token with 401', async () => {
      const req = makeMockRequest('/api/avatar/3d-body', 'POST', undefined, { name: 'Test' });
      const res = await createBody(req);
      expect(res.status).toBe(401);
    });

    it('rejects expressions GET without token with 401', async () => {
      const req = makeMockRequest('/api/avatar/expressions', 'GET');
      const res = await getExpressions(req);
      expect(res.status).toBe(401);
    });

    it('rejects expressions POST without token with 401', async () => {
      const req = makeMockRequest('/api/avatar/expressions', 'POST', undefined, { expressionName: 'Test' });
      const res = await createExpression(req);
      expect(res.status).toBe(401);
    });

    it('rejects motion GET without token with 401', async () => {
      const req = makeMockRequest('/api/avatar/motion', 'GET');
      const res = await getMotions(req);
      expect(res.status).toBe(401);
    });

    it('rejects motion POST without token with 401', async () => {
      const req = makeMockRequest('/api/avatar/motion', 'POST', undefined, { motionName: 'Test' });
      const res = await createMotion(req);
      expect(res.status).toBe(401);
    });

    it('rejects invalid or tampered token with 401', async () => {
      const req = makeMockRequest('/api/avatar/digital-twin', 'GET', 'invalid.tampered.token');
      const res = await getTwins(req);
      expect(res.status).toBe(401);
    });

    it('rejects stored avatar-library access without a token', async () => {
      const req = makeMockRequest('/api/avatar/library', 'GET');
      const res = await getAvatarLibrary(req);
      expect(res.status).toBe(401);
    });

    it('restricts stored avatar-library access to Super Admin', async () => {
      const req = makeMockRequest('/api/avatar/library', 'GET', userAToken);
      const res = await getAvatarLibrary(req);
      expect(res.status).toBe(403);
    });

    it('retires the legacy Colab bridge for both methods', async () => {
      const req = makeMockRequest('/api/avatar/colab-bridge', 'GET');
      expect((await getLegacyColabBridge(req)).status).toBe(410);
      expect((await postLegacyColabBridge(req)).status).toBe(410);
    });

    it('retires the legacy local-file voice generator', async () => {
      expect((await postLegacyVoice()).status).toBe(410);
    });
  });

  describe('2. Server-Derived Ownership & Spoofing Prevention', () => {
    it('ignores client-supplied userId on digital-twin POST and enforces authenticated viewerId', async () => {
      jest.mocked(bunnyExecute).mockResolvedValue({ rows: [] } as any);

      const spoofPayload = {
        userId: 'malicious_spoofed_admin',
        twinName: 'Tenant A Secured Twin',
        baseVideoUrl: 'https://swaryogacrm.b-cdn.net/sample.mp4',
      };
      const req = makeMockRequest('/api/avatar/digital-twin', 'POST', userAToken, spoofPayload);
      const res = await createTwin(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.userId).toBe('tenant_user_a');
      expect(data.userId).not.toBe('malicious_spoofed_admin');

      // Verify that SQL INSERT statement received 'tenant_user_a' as args[1]
      const insertCall = jest.mocked(bunnyExecute).mock.calls.find(c => {
        const stmt = c[0] as any;
        return typeof stmt === 'object' && stmt.sql?.includes('INSERT INTO digital_twins_v3_sql');
      });
      expect(insertCall).toBeDefined();
      const insertArgs = (insertCall![0] as any).args;
      expect(insertArgs[1]).toBe('tenant_user_a');
      expect(insertArgs[7]).toBe(0);
      expect(insertArgs[8]).toBe('[]');
      expect(insertArgs[10]).toBe(0);
      expect(insertArgs[11]).toBe(0);
      expect(insertArgs[12]).toBe('not_trained');
      expect(JSON.parse(insertArgs[13])).toMatchObject({ status: 'not_run', verified: false });
    });

    it('ignores client-supplied userId on 3D body POST and enforces authenticated viewerId', async () => {
      jest.mocked(bunnyExecute).mockResolvedValue({ rows: [] } as any);

      const spoofPayload = {
        userId: 'malicious_spoofed_admin',
        name: 'Tenant A Secured Body',
        anthropometrics: {
          heightM: 1.68,
          weightKg: 80,
          shoulderWidthM: 0.47,
          chestCircM: 0.96,
          waistCircM: 0.81,
          hipsCircM: 0.96,
        },
      };
      const req = makeMockRequest('/api/avatar/3d-body', 'POST', userAToken, spoofPayload);
      const res = await createBody(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.body.userId).toBe('tenant_user_a');
      expect(data.body.userId).not.toBe('malicious_spoofed_admin');
      expect(data.body.boneCount).toBe(0);
      expect(data.body.riggingStatus).toBe('not_started');
    });

    it('does not report fabricated face-analysis metrics', () => {
      expect(() => analyzeFaceGeometry()).toThrow(FaceAnalysisUnavailableError);
    });

    it('retires the legacy endpoint that returned source video as a completed render', async () => {
      const res = await createAvatarJob();
      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('/api/avatar/inhouse/video');
    });

    it('rejects cross-user binding when user B attempts to attach 3D body to user A twin', async () => {
      // Mock that twin belongs to user A
      jest.mocked(bunnyExecute).mockResolvedValue({
        rows: [{ user_id: 'tenant_user_a' }],
      } as any);

      const crossUserPayload = {
        twinId: 'twin_user_a_private',
        name: 'Unauthorized Cross Body',
        anthropometrics: {
          heightM: 1.7,
          weightKg: 75,
          shoulderWidthM: 0.45,
          chestCircM: 0.9,
          waistCircM: 0.8,
          hipsCircM: 0.9,
        },
      };
      const req = makeMockRequest('/api/avatar/3d-body', 'POST', userBToken, crossUserPayload);
      const res = await createBody(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden: You do not own the referenced digital twin.');
    });
  });

  describe('3. Cross-User Tenant Isolation Queries', () => {
    it('filters digital twins so user B only queries their own tenant records', async () => {
      jest.mocked(bunnyExecute).mockResolvedValue({ rows: [] } as any);

      const reqB = makeMockRequest('/api/avatar/digital-twin', 'GET', userBToken);
      await getTwins(reqB);

      const queryCall = jest.mocked(bunnyExecute).mock.calls.find(c => {
        const stmt = c[0] as any;
        return typeof stmt === 'object' && stmt.sql?.includes('WHERE user_id = ?');
      });
      expect(queryCall).toBeDefined();
      expect((queryCall![0] as any).args).toEqual(['tenant_user_b']);
    });

    it('filters 3D bodies so user B only queries their own tenant records', async () => {
      jest.mocked(bunnyExecute).mockResolvedValue({ rows: [] } as any);

      const reqB = makeMockRequest('/api/avatar/3d-body', 'GET', userBToken);
      await getBodies(reqB);

      const queryCall = jest.mocked(bunnyExecute).mock.calls.find(c => {
        const stmt = c[0] as any;
        return typeof stmt === 'object' && stmt.sql?.includes('WHERE user_id = ?');
      });
      expect(queryCall).toBeDefined();
      expect((queryCall![0] as any).args).toEqual(['tenant_user_b']);
    });
  });
});
