/** @jest-environment node */

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
jest.mock('@/lib/registrationAuth', () => ({
  registrationViewer: jest.fn(() => ({ userId: 'admincrm', superAdmin: true })),
  registrationLeadOwned: jest.fn(() => true),
}));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ loadBunnyLeads: jest.fn() }));
jest.mock('@/lib/bunny-forms-db', () => ({ listForms: jest.fn(), listSubmissions: jest.fn() }));
jest.mock('@/lib/registrationState', () => ({
  ...jest.requireActual('@/lib/registrationState'),
  readRegistrationState: jest.fn(), replaceRegistrationStateIfUnchanged: jest.fn(),
}));
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn() }));
jest.mock('@/lib/bunny-storage', () => ({ fetchFromStorage: jest.fn() }));
jest.mock('@/lib/bunnyBroadcastRepository', () => ({ ensureBroadcastSchema: jest.fn() }));
jest.mock('@/lib/whatsapp', () => ({ normalizePhone: (value: string) => value }));

import { POST, PUT } from '@/app/api/admin/crm/new-registration/triggers/route';
import { processRegistrationSchedules } from '@/lib/registrationAutomation';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { readRegistrationState, replaceRegistrationStateIfUnchanged } from '@/lib/registrationState';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { registrationDecisionKey } from '@/lib/registrationAiConfig';

describe('Leads Management to Bunny Meta broadcast connection', () => {
  const decisionKey = registrationDecisionKey('batch', 'response');
  const state = {
    crm_hindi_workshops: [{ id: 'batch', language: 'Hindi', formId: 'form' }],
    [decisionKey]: { status: 'approval_3', screeningPassed: true },
  };
  const body = {
    channel: 'meta', dates: ['2026-10-11'], time: '09:00', timeZone: 'Asia/Kolkata', repeat: 'none',
    template: 'template', leadIds: ['crm-lead'], responseIds: ['response'], batchId: 'batch', targetCategory: 'Approval-3',
  };
  const request = (data = body, method = 'POST') => new Request('https://example.test/api/triggers', { method, body: JSON.stringify(data) });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(readRegistrationState).mockResolvedValue(state);
    jest.mocked(loadBunnyLeads).mockResolvedValue([{ _id: 'crm-lead', email: 'lead@example.test', phoneNumber: '919999999999' }]);
    jest.mocked(listForms).mockResolvedValue([{ formId: 'form', workshopName: 'Hindi' }] as never);
    jest.mocked(listSubmissions).mockResolvedValue([{ id: 'response', formId: 'form', email: 'lead@example.test' }] as never);
    jest.mocked(bunnyExecute).mockResolvedValue({ rows: [{
      document_id: 'template', template_name: 'welcome', status: 'approved', data_json: '{}', language: 'en',
    }] } as never);
    jest.mocked(bunnyBatch).mockResolvedValue([{ rowsAffected: 1 }, { rowsAffected: 1 }, { rowsAffected: 1 }] as never);
    jest.mocked(replaceRegistrationStateIfUnchanged).mockResolvedValue(true);
  });

  it('saves the canonical CRM audience with its batch-specific form response identity', async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    const saved = (await response.json()).data;
    expect(saved.responseAudience).toEqual([{ responseId: 'response', leadId: 'crm-lead' }]);
    expect(saved.leadIds).toEqual(['crm-lead']);
  });

  it('rechecks form decisions when queuing rather than losing them under CRM identity', async () => {
    const trigger = { ...body, status: 'active', id: 'trigger', responseAudience: [{ responseId: 'response', leadId: 'crm-lead' }] };
    expect(await processRegistrationSchedules({ ...state, crm_ai_triggers: [trigger] }, [
      { _id: 'crm-lead', phoneNumber: '919999999999' },
    ], 'admincrm', true, new Date('2026-10-11T04:00:00Z'))).toEqual({ queued: 1 });
    expect(bunnyBatch).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ sql: expect.stringContaining('INSERT INTO broadcast_runs_sql') }),
    ]));
    jest.mocked(bunnyBatch).mockClear();
    await processRegistrationSchedules({ ...state, [decisionKey]: { status: 'approval_3', isRejected: true }, crm_ai_triggers: [trigger] }, [
      { _id: 'crm-lead', phoneNumber: '919999999999' },
    ], 'admincrm', true, new Date('2026-10-11T04:00:00Z'));
    expect(bunnyBatch).not.toHaveBeenCalled();
  });

  it('blocks wrong-batch and rejected form responses at schedule creation', async () => {
    expect((await POST(request({ ...body, batchId: 'different-batch' }))).status).toBe(400);
    jest.mocked(readRegistrationState).mockResolvedValue({ ...state, [decisionKey]: { isRejected: true } });
    expect((await POST(request())).status).toBe(400);
    expect(replaceRegistrationStateIfUnchanged).not.toHaveBeenCalled();
  });

  it('does not delete the original schedule if editing is not allowed', async () => {
    jest.mocked(readRegistrationState).mockResolvedValue({ ...state, crm_ai_triggers: [{ id: 'existing', batchId: 'batch' }] });
    const response = await PUT(request({ ...body, id: 'existing' } as typeof body, 'PUT'));
    expect(response.status).toBe(409);
    expect(replaceRegistrationStateIfUnchanged).not.toHaveBeenCalled();
  });
});
