/** @jest-environment node */
jest.mock('@/lib/registrationAuth', () => ({
  registrationViewer: jest.fn(() => ({ userId: 'admincrm', superAdmin: true })),
  registrationLeadOwned: jest.fn(() => true),
}));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ loadBunnyLeads: jest.fn(async () => []) }));
jest.mock('@/lib/bunny-forms-db', () => ({ listForms: jest.fn(async () => []), listSubmissions: jest.fn(async () => []) }));
jest.mock('@/lib/registrationState', () => ({
  ...jest.requireActual('@/lib/registrationValues'),
  readRegistrationState: jest.fn(),
}));
jest.mock('@/lib/registrationFunnel', () => ({ processRegistrationFunnel: jest.fn() }));
import { POST } from '@/app/api/admin/crm/new-registration/funnel/route';
import { readRegistrationState } from '@/lib/registrationState';
import { processRegistrationFunnel } from '@/lib/registrationFunnel';

it('returns newly persisted routing with existing manual gates without rereading the entire state', async () => {
  const key = 'crm_ai_decision_batch_response';
  jest.mocked(readRegistrationState).mockResolvedValue({ [key]: { status: 'new_leads', zoomStatus: 'skipped', zoomGateAudit: { userId: 'admincrm' } } });
  jest.mocked(processRegistrationFunnel).mockResolvedValue({
    processed: 1, passed: 1, pending: 0, errors: [],
    decisionPatch: { [key]: { status: 'approval_1', screeningPassed: true } },
  });
  const response = await POST(new Request('http://localhost/api/funnel', { method: 'POST', body: JSON.stringify({ batchId: 'batch', worker: 'AI-4' }) }));
  expect(response.status).toBe(200);
  expect((await response.json()).decisions.response).toMatchObject({ status: 'approval_1', zoomStatus: 'skipped', zoomGateAudit: { userId: 'admincrm' } });
  expect(readRegistrationState).toHaveBeenCalledTimes(1);
});
