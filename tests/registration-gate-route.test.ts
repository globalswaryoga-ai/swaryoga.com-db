/** @jest-environment node */

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
jest.mock('@/lib/registrationAuth', () => ({
  registrationViewer: jest.fn(),
  registrationLeadOwned: jest.fn(() => true),
}));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ loadBunnyLeads: jest.fn() }));
jest.mock('@/lib/bunny-forms-db', () => ({ listForms: jest.fn(), listSubmissions: jest.fn() }));
jest.mock('@/lib/registrationState', () => ({
  ...jest.requireActual('@/lib/registrationState'),
  readRegistrationState: jest.fn(), saveRegistrationGate: jest.fn(), writeRegistrationState: jest.fn(), mergeRegistrationState: jest.fn(),
}));
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn() }));
jest.mock('@/lib/bunny-storage', () => ({ fetchFromStorage: jest.fn() }));

import { POST } from '@/app/api/admin/crm/new-registration/gates/route';
import { POST as saveState } from '@/app/api/admin/crm/new-registration/state/route';
import { registrationViewer } from '@/lib/registrationAuth';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { saveRegistrationGate, readRegistrationState, writeRegistrationState, mergeRegistrationState } from '@/lib/registrationState';
import { registrationDecisionKey } from '@/lib/registrationAiConfig';

describe('Authenticated registration gate saves', () => {
  const key = registrationDecisionKey('batch', 'response');
  const state = {
    crm_hindi_workshops: [{ id: 'batch', language: 'Hindi', formId: 'form' }],
    [key]: { status: 'approval_1', screeningPassed: true },
  };
  const request = (action: string, id = 'response') => new Request('https://example.test/api/gates', {
    method: 'POST', body: JSON.stringify({ batchId: 'batch', id, action }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(registrationViewer).mockReturnValue({ userId: 'tenant', superAdmin: false });
    jest.mocked(loadBunnyLeads).mockResolvedValue([]);
    jest.mocked(listForms).mockResolvedValue([{ formId: 'form', createdBy: 'tenant', workshopName: 'Hindi' }] as never);
    jest.mocked(listSubmissions).mockResolvedValue([{ id: 'response', formId: 'form', dynamicAnswers: {} }] as never);
    jest.mocked(readRegistrationState).mockResolvedValue(state);
    jest.mocked(saveRegistrationGate).mockResolvedValue(true);
    jest.mocked(writeRegistrationState).mockResolvedValue(undefined);
    jest.mocked(mergeRegistrationState).mockResolvedValue(undefined);
  });

  it('requires an authenticated admin', async () => {
    jest.mocked(registrationViewer).mockReturnValue(null);
    expect((await POST(request('skip_zoom'))).status).toBe(401);
    expect(saveRegistrationGate).not.toHaveBeenCalled();
  });

  it.each(['english', 'hindi', 'marathi', 'kannada'])('rejects even a single unversioned %s batch-list write', async language => {
    const response = await saveState(new Request('https://example.test/api/state', {
      method: 'POST',
      body: JSON.stringify({ [`crm_${language}_workshops`]: JSON.stringify([{ id: 'batch', metadata: {} }]) }),
    }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('preserved') });
    expect(writeRegistrationState).not.toHaveBeenCalled();
  });

  it('does not allow form approval to bypass Zoom through the endpoint', async () => {
    expect((await POST(request('approve'))).status).toBe(409);
    expect(saveRegistrationGate).not.toHaveBeenCalled();
  });

  it('saves only the explicit skip, with viewer identity and tenant scope', async () => {
    expect((await POST(request('skip_zoom'))).status).toBe(200);
    expect(saveRegistrationGate).toHaveBeenCalledWith(key, {
        zoomStatus: 'skipped',
        zoomGateAudit: { action: 'skip_zoom', userId: 'tenant', at: expect.any(String) },
    }, state[key], 'tenant');
  });

  it('rejects a response from another batch or another owner', async () => {
    expect((await POST(request('skip_zoom', 'foreign-response'))).status).toBe(404);
    jest.mocked(listForms).mockResolvedValue([{ formId: 'form', createdBy: 'different-tenant' }] as never);
    expect((await POST(request('skip_zoom'))).status).toBe(404);
    expect(saveRegistrationGate).not.toHaveBeenCalled();
  });

  it('keeps group resolution separate from final approval', async () => {
    expect((await POST(request('skip_group'))).status).toBe(409);
    jest.mocked(readRegistrationState).mockResolvedValue({ ...state, [key]: { isRegistered: true, zoomStatus: 'skipped' } });
    expect((await POST(request('skip_group'))).status).toBe(200);
    expect(saveRegistrationGate).toHaveBeenCalledWith(key,
      { groupStatus: 'skipped', groupGateAudit: { action: 'skip_group', userId: 'tenant', at: expect.any(String) } },
      { isRegistered: true, zoomStatus: 'skipped' }, 'tenant');
  });

  it('reports failed persistence instead of confirming a saved gate', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(saveRegistrationGate).mockRejectedValue(new Error('SQL unavailable'));
    try {
      expect((await POST(request('skip_zoom'))).status).toBe(500);
    } finally {
      log.mockRestore();
    }
  });

  it('reports concurrent changes instead of overwriting another admin decision', async () => {
    jest.mocked(saveRegistrationGate).mockResolvedValue(false);
    expect((await POST(request('skip_zoom'))).status).toBe(409);
  });

  it('prevents ordinary configuration saves from replacing protected gate fields', async () => {
    const response = await saveState(new Request('https://example.test/api/state', {
      method: 'POST', body: JSON.stringify({ [key]: { isRegistered: true } }),
    }));
    expect(response.status).toBe(400);
    expect(mergeRegistrationState).not.toHaveBeenCalled();
  });

  it('merges only supplied decision fields instead of replacing an existing manual gate', async () => {
    const response = await saveState(new Request('https://example.test/api/state', {
      method: 'POST', body: JSON.stringify({ [key]: { status: 'approval_2' } }),
    }));
    expect(response.status).toBe(200);
    expect(mergeRegistrationState).toHaveBeenCalledWith({ [key]: { status: 'approval_2' } }, 'tenant');
    expect(writeRegistrationState).not.toHaveBeenCalled();
  });
});
