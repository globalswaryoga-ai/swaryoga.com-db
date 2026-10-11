/** @jest-environment node */
jest.mock('@/lib/registrationAuth', () => ({ registrationViewer: jest.fn() }));
jest.mock('@/lib/workshopOfferRepository', () => ({ listOfferRecords: jest.fn(), patchOfferRecord: jest.fn(), readOfferState: jest.fn(), writeOfferState: jest.fn() }));
jest.mock('@/lib/workshopOfferContacts', () => ({ offerContact: jest.fn() }));

import { registrationViewer } from '@/lib/registrationAuth';
import { listOfferRecords, patchOfferRecord, writeOfferState } from '@/lib/workshopOfferRepository';
import { offerContact } from '@/lib/workshopOfferContacts';
import { GET, PATCH } from '@/app/api/admin/crm/workshop-offer/records/route';
import { POST as saveState } from '@/app/api/admin/crm/workshop-offer/state/route';

describe('Offer routes preserve authenticated account boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(registrationViewer).mockReturnValue({ userId: 'tenant-1', superAdmin: false });
    jest.mocked(listOfferRecords).mockResolvedValue({});
    jest.mocked(offerContact).mockResolvedValue({ id: 'response-1' });
  });
  const request = (body: unknown) => new Request('http://localhost/api/offer', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  it('rejects unauthenticated reads and writes before any database call', async () => {
    jest.mocked(registrationViewer).mockReturnValue(null);
    expect((await GET(request({}))).status).toBe(401);
    expect((await PATCH(request({ leadId: 'response-1', patch: {} }))).status).toBe(401);
    expect(listOfferRecords).not.toHaveBeenCalled();
  });
  it('rejects a response belonging to another account', async () => {
    jest.mocked(offerContact).mockResolvedValue(undefined);
    expect((await PATCH(request({ leadId: 'foreign', patch: { amount: '100' } }))).status).toBe(404);
    expect(patchOfferRecord).not.toHaveBeenCalled();
  });
  it('does not persist an invalid received payment', async () => {
    expect((await PATCH(request({ leadId: 'response-1', previous: {}, patch: { status: 'received', amount: '100', date: '2026-02-30', paymentMode: 'upi' } }))).status).toBe(400);
    expect(patchOfferRecord).not.toHaveBeenCalled();
  });
  it('saves valid confirmed payment only in the current tenant with viewer audit', async () => {
    const patch = { status: 'received', amount: '100.50', date: '2026-10-11', paymentMode: 'upi' };
    expect((await PATCH(request({ leadId: 'response-1', previous: {}, patch }))).status).toBe(200);
    expect(patchOfferRecord).toHaveBeenCalledWith('tenant-1', 'response-1', { ...patch, needsVerification: false, updatedByUserId: 'tenant-1' }, {});
  });
  it('rejects credential keys in offer state without storing them', async () => {
    expect((await saveState(request({ action: 'autosave', patch: { crm_token: 'do-not-save' }, previous: {} }))).status).toBe(400);
    expect(writeOfferState).not.toHaveBeenCalled();
  });
  it('rejects old unversioned clients and stale payment snapshots', async () => {
    expect((await saveState(request({ crm_offers: '[]' }))).status).toBe(409);
    expect(writeOfferState).not.toHaveBeenCalled();
    jest.mocked(listOfferRecords).mockResolvedValue({ 'response-1': { remark: 'newer' } });
    expect((await PATCH(request({ leadId: 'response-1', previous: { remark: 'older' }, patch: { remark: 'overwrite' } }))).status).toBe(409);
    expect(patchOfferRecord).not.toHaveBeenCalled();
  });
  it('returns the confirmed offer snapshot with tenant-scoped expected values', async () => {
    const patch = { crm_offers: [{ id: 'batch', name: 'Edited' }] };
    const previous = { crm_offers: [] };
    jest.mocked(writeOfferState).mockResolvedValue(patch);
    const response = await saveState(request({ action: 'autosave', patch, previous }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, saved: patch });
    expect(writeOfferState).toHaveBeenCalledWith('tenant-1', patch, previous);
  });
});
