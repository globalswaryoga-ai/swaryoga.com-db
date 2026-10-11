/** @jest-environment node */
jest.mock('@/lib/registrationAuth', () => ({ registrationViewer: jest.fn(() => ({ userId: 'admincrm', superAdmin: true })) }));
jest.mock('@/lib/workshopOfferContacts', () => ({ offerContact: jest.fn() }));
jest.mock('@/lib/workshopOfferRepository', () => ({ listOfferDesigns: jest.fn(), initOfferSchema: jest.fn() }));
jest.mock('@/lib/bunnyTemplatesRepository', () => ({ getTemplateById: jest.fn(), listTemplates: jest.fn() }));
jest.mock('@/lib/bunnyBroadcastRepository', () => ({ ensureBroadcastSchema: jest.fn() }));
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyBatch: jest.fn() }));
jest.mock('@/lib/whatsapp', () => ({ normalizePhone: (value: string) => value }));

import { POST } from '@/app/api/admin/crm/workshop-offer/delivery/route';
import { offerContact } from '@/lib/workshopOfferContacts';
import { listOfferDesigns } from '@/lib/workshopOfferRepository';
import { getTemplateById } from '@/lib/bunnyTemplatesRepository';
import { bunnyBatch } from '@/lib/bunnyDatabase';

describe('Offer document broadcast delivery', () => {
  const previousSecret = process.env.CRON_SECRET;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-only';
    jest.mocked(listOfferDesigns).mockResolvedValue([{ id: 'receipt-1', kind: 'receipt', status: 'final', leadId: 'response-1', fileUrl: 'https://example.test/receipt.pdf', documentNumber: 'SW-R-1' }]);
    jest.mocked(offerContact).mockResolvedValue({ id: 'response-1', leadId: 'canonical-lead', phoneNumber: '919999999999', name: 'Test Participant' });
    jest.mocked(getTemplateById).mockResolvedValue({ status: 'approved', headerFormat: 'DOCUMENT', templateName: 'receipt' });
  });
  afterAll(() => { if (previousSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousSecret; });
  const request = (patch = {}) => new Request('http://localhost/api/offer', { method: 'POST', body: JSON.stringify({ designId: 'receipt-1', templateId: 'template-1', approved: true, ...patch }) });
  it('requires final approval, a canonical contact and an approved document template', async () => {
    expect((await POST(request({ approved: false }))).status).toBe(400);
    jest.mocked(offerContact).mockResolvedValue({ id: 'response-1' });
    expect((await POST(request())).status).toBe(409);
    expect(bunnyBatch).not.toHaveBeenCalled();
  });
  it('queues the same document once and retains its PDF snapshot for the worker', async () => {
    const first = await (await POST(request())).json();
    const second = await (await POST(request())).json();
    expect(first.runId).toBe(second.runId);
    expect(first.runId).toMatch(/^offer-doc_/);
    const batch = jest.mocked(bunnyBatch).mock.calls[0][0];
    expect(batch[0]).toMatchObject({ sql: expect.stringContaining('ON CONFLICT(document_id) DO NOTHING') });
    expect(batch[1]).toMatchObject({ sql: expect.stringContaining('ON CONFLICT(document_id) DO NOTHING') });
    expect(JSON.parse(String((batch[0] as { args: unknown[] }).args[7])).templateSnapshot.headerMedia).toEqual({ kind: 'document', url: 'https://example.test/receipt.pdf', filename: 'SW-R-1.pdf' });
  });
  it('does not claim a running queue without configured cron authentication', async () => {
    delete process.env.CRON_SECRET;
    expect((await POST(request())).status).toBe(503);
    expect(bunnyBatch).not.toHaveBeenCalled();
  });
});
