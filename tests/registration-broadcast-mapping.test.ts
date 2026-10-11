/** @jest-environment node */
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } }));
jest.mock('@/lib/auth', () => ({ verifyToken: () => ({ userId: 'admincrm', isAdmin: true }) }));
jest.mock('@/lib/crm-handlers', () => ({
  getViewerUserId: () => 'admincrm', isSuperAdmin: () => true,
  handleCrmError: (error: Error) => Response.json({ error: error.message }, { status: 500 }),
}));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ loadBunnyLeads: jest.fn(), saveBunnyLead: jest.fn() }));
jest.mock('@/lib/bunnyBroadcastRepository', () => ({
  getTemplateById: jest.fn(), broadcastRunCreate: jest.fn(), broadcastRunMessageInsertMany: jest.fn(),
}));
jest.mock('@/lib/registrationAudienceRepository', () => ({ loadRegistrationAudience: jest.fn(), mapRegistrationRecipients: jest.fn() }));

import { POST } from '@/app/api/admin/crm/broadcast-runs/route';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { getTemplateById, broadcastRunCreate, broadcastRunMessageInsertMany } from '@/lib/bunnyBroadcastRepository';
import { loadRegistrationAudience, mapRegistrationRecipients } from '@/lib/registrationAudienceRepository';

describe('Broadcast saved registration selection', () => {
  const row = { id: 'batch:response', registrationBatchId: 'batch', responseId: 'response',
    phoneNumber: '919876543210', registrationDecision: { status: 'approval_1' } };
  const selection = { batchId: 'batch', responseId: 'response', category: 'Approvel-1' };
  const request = (target: unknown) => new Request('https://example.test/api/broadcast-runs', {
    method: 'POST', headers: { authorization: 'Bearer test' },
    body: JSON.stringify({ templateId: 'template', target }),
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getTemplateById).mockResolvedValue({ _id: 'template', status: 'approved' });
    jest.mocked(loadBunnyLeads).mockResolvedValue([
      { _id: 'mapped', phoneNumber: row.phoneNumber },
      { _id: 'unselected', phoneNumber: '919999999999' },
    ]);
    jest.mocked(loadRegistrationAudience).mockResolvedValue({ state: {}, leads: [], rows: [row] });
    jest.mocked(mapRegistrationRecipients).mockResolvedValue([{ ...row, leadId: 'mapped' }]);
    jest.mocked(broadcastRunCreate).mockResolvedValue({ _id: 'run' });
    jest.mocked(broadcastRunMessageInsertMany).mockResolvedValue(undefined);
  });

  it('maps only selected approved responses, never falling back to all contacts', async () => {
    const response = await POST(request({ registrationSelections: [selection] }) as never);
    expect(response.status).toBe(201);
    expect(broadcastRunMessageInsertMany).toHaveBeenCalledWith([
      { runId: 'run', leadId: 'mapped', phoneNumber: row.phoneNumber },
    ]);
  });
  it.each([
    { ...selection, responseId: 'missing' },
    { ...selection, batchId: 'other' },
    { ...selection, category: 'Approvel-2' },
  ])('rejects a stale or forged selection %j before creating contacts', async selected => {
    expect((await POST(request({ registrationSelections: [selected] }) as never)).status).toBe(409);
    expect(mapRegistrationRecipients).not.toHaveBeenCalled();
    expect(broadcastRunCreate).not.toHaveBeenCalled();
  });
  it('rejects an unapproved template before mapping', async () => {
    jest.mocked(getTemplateById).mockResolvedValue({ _id: 'template', status: 'pending_approval' });
    expect((await POST(request({ registrationSelections: [selection] }) as never)).status).toBe(400);
    expect(mapRegistrationRecipients).not.toHaveBeenCalled();
  });
  it('does not create an empty broadcast for an invalid or blocked audience', async () => {
    jest.mocked(loadBunnyLeads).mockResolvedValue([{ _id: 'blocked', isBlocked: true, phoneNumber: row.phoneNumber }]);
    expect((await POST(request({ type: 'leadIds', leadIds: ['blocked'] }) as never)).status).toBe(400);
    expect(broadcastRunCreate).not.toHaveBeenCalled();
  });
});
