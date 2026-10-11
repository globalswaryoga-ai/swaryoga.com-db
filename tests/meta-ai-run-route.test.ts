/** @jest-environment node */
jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyBatch: jest.fn() }));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ loadBunnyLeads: jest.fn() }));
jest.mock('@/lib/registrationAuth', () => ({
  registrationViewer: jest.fn(),
  registrationLeadOwned: jest.fn(),
}));
jest.mock('@/lib/registrationState', () => ({
  readRegistrationState: jest.fn(),
  registrationWorkshops: jest.fn(),
}));
jest.mock('@/lib/registrationAutomation', () => ({ processRegistrationApprovals: jest.fn() }));
jest.mock('@/lib/registrationMetaReport', () => ({
  matchesMetaBatch: (lead: { workshopId: string }, workshopId: string) => lead.workshopId === workshopId,
}));

import { POST } from '@/app/api/admin/crm/meta-leads/bulk-update/route';
import { registrationViewer, registrationLeadOwned } from '@/lib/registrationAuth';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { registrationWorkshops } from '@/lib/registrationState';
import { processRegistrationApprovals } from '@/lib/registrationAutomation';

describe('Immediate saved Meta AI run', () => {
  const request = () => new Request('https://example.test/api/meta-ai', {
    method: 'POST', body: JSON.stringify({ action: 'run-ai', workshopId: 'batch' }),
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(registrationViewer).mockReturnValue({ userId: 'tenant', superAdmin: false });
    jest.mocked(registrationLeadOwned).mockImplementation(lead => lead.createdByUserId === 'tenant');
    jest.mocked(registrationWorkshops).mockReturnValue([{ id: 'batch', metadata: { ai9CConfig: { isActive: true } } }]);
    jest.mocked(loadBunnyLeads).mockResolvedValue([
      { _id: 'owned', createdByUserId: 'tenant', workshopId: 'batch', status: 'stage_2_new' },
      { _id: 'foreign', createdByUserId: 'another', workshopId: 'batch', status: 'stage_2_new' },
      { _id: 'other-batch', createdByUserId: 'tenant', workshopId: 'different', status: 'stage_2_new' },
    ]);
    jest.mocked(processRegistrationApprovals).mockImplementation(async (_state, leads) => {
      leads.forEach(lead => { lead.status = 'stage_3_new'; });
      return [];
    });
  });
  it('runs persisted rules on all accessible batch leads, without client-side candidate filtering', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ scannedCount: 1, modifiedCount: 1 });
    expect(processRegistrationApprovals).toHaveBeenCalledWith(
      { crm_workshops: [expect.objectContaining({ id: 'batch' })] },
      [expect.objectContaining({ _id: 'owned' })], 'tenant', false,
    );
  });
  it('reports an empty batch honestly', async () => {
    jest.mocked(loadBunnyLeads).mockResolvedValue([]);
    expect(await (await POST(request())).json()).toMatchObject({ scannedCount: 0, modifiedCount: 0 });
  });
  it('requires authentication and a saved batch', async () => {
    jest.mocked(registrationViewer).mockReturnValue(null);
    expect((await POST(request())).status).toBe(401);
    jest.mocked(registrationViewer).mockReturnValue({ userId: 'tenant', superAdmin: false });
    jest.mocked(registrationWorkshops).mockReturnValue([]);
    expect((await POST(request())).status).toBe(400);
    expect(processRegistrationApprovals).not.toHaveBeenCalled();
  });
});
