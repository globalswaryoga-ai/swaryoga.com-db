/** @jest-environment node */
jest.mock('next/server', () => ({ NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } }));
jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }));
jest.mock('@/lib/registrationAuth', () => ({ registrationViewer: jest.fn() }));
jest.mock('@/lib/whatsappAccounts', () => ({ getMetaCredentialsForTenant: jest.fn() }));
jest.mock('@/lib/metaHealth', () => ({ probeMetaHealth: jest.fn() }));
jest.mock('@/lib/whatsappProtection', () => ({ checkBridgeHealth: jest.fn(), checkMetaHealth: jest.fn(), getProtectionMetrics: jest.fn() }));
import { GET } from '@/app/api/admin/crm/whatsapp/health/route';
import { verifyToken } from '@/lib/auth';
import { registrationViewer } from '@/lib/registrationAuth';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import { probeMetaHealth } from '@/lib/metaHealth';
import { checkBridgeHealth } from '@/lib/whatsappProtection';
import type { NextRequest } from 'next/server';

describe('Tenant-scoped Meta-only health', () => {
  const request = () => ({
    headers: new Headers({ authorization: 'Bearer test' }),
    nextUrl: new URL('https://example.test/health?provider=meta'),
  }) as NextRequest;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(verifyToken).mockReturnValue({ isAdmin: true, userId: 'tenant' });
    jest.mocked(registrationViewer).mockReturnValue({ userId: 'tenant', superAdmin: false });
    jest.mocked(getMetaCredentialsForTenant).mockResolvedValue(null);
    jest.mocked(probeMetaHealth).mockResolvedValue({ healthy: true, latencyMs: 1200, qualityRating: 'GREEN' });
  });
  it('does not probe shared credentials when a tenant has no connected account', async () => {
    expect(await (await GET(request())).json()).toMatchObject({ data: { healthy: false } });
    expect(probeMetaHealth).not.toHaveBeenCalled();
    expect(checkBridgeHealth).not.toHaveBeenCalled();
  });
  it('checks only the tenant account without waiting for the QR bridge', async () => {
    const credentials = { accessToken: 'test', phoneNumberId: 'number', phoneNumber: '' };
    jest.mocked(getMetaCredentialsForTenant).mockResolvedValue(credentials);
    expect(await (await GET(request())).json()).toMatchObject({ data: { healthy: true } });
    expect(probeMetaHealth).toHaveBeenCalledWith(credentials);
    expect(checkBridgeHealth).not.toHaveBeenCalled();
  });
  it('rejects non-admin authentication', async () => {
    jest.mocked(verifyToken).mockReturnValue({ isAdmin: false, userId: 'student' });
    expect((await GET(request())).status).toBe(403);
    expect(getMetaCredentialsForTenant).not.toHaveBeenCalled();
  });
});
