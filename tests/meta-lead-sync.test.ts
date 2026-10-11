/** @jest-environment node */
jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
jest.mock('@/lib/registrationAuth', () => ({ registrationViewer: jest.fn(() => ({ superAdmin: true })) }));
jest.mock('@/lib/whatsapp', () => ({ normalizePhone: (value: string) => value.replace(/\D/g, '') }));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ loadBunnyLeads: jest.fn(), saveBunnyLead: jest.fn() }));

import { POST } from '@/app/api/admin/crm/meta-leads/sync/route';
import { loadBunnyLeads, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import type { NextRequest } from 'next/server';

describe('Bunny-only Meta lead sync', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.META_PAGE_ACCESS_TOKEN;
  const fields = [{ name: 'phone_number', values: ['919999999999'] }, { name: 'full_name', values: ['Student'] }];
  const request = () => new Request('https://example.test/sync', { method: 'POST', body: JSON.stringify({ formId: 'form' }) }) as NextRequest;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.META_PAGE_ACCESS_TOKEN = 'test-token';
    global.fetch = jest.fn().mockResolvedValue(Response.json({ data: [{ id: 'response', field_data: fields }] }));
    jest.mocked(loadBunnyLeads).mockResolvedValue([]);
    jest.mocked(saveBunnyLead).mockImplementation(async lead => ({ ...lead, _id: 'saved' }));
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.META_PAGE_ACCESS_TOKEN;
    else process.env.META_PAGE_ACCESS_TOKEN = originalToken;
  });

  it('starts a new lead before stage-one screening rather than bypassing AI-9A', async () => {
    expect((await POST(request())).status).toBe(200);
    expect(saveBunnyLead).toHaveBeenCalledWith(expect.objectContaining({ status: 'new', createdByUserId: 'system' }));
    expect(loadBunnyLeads).toHaveBeenCalledTimes(1);
  });

  it('skips unchanged historical responses without overwriting their stage', async () => {
    jest.mocked(loadBunnyLeads).mockResolvedValue([{
      _id: 'saved', phoneNumber: '919999999999', createdByUserId: 'system', status: 'stage_3_new',
      metadata: { metaFormId: 'form', metaLeadId: 'response', rawFieldData: fields },
    }]);
    expect(await (await POST(request())).json()).toMatchObject({ syncedCount: 0, unchangedCount: 1 });
    expect(saveBunnyLead).not.toHaveBeenCalled();
  });

  it('does not merge a shared Meta response into a tenant-owned contact', async () => {
    jest.mocked(loadBunnyLeads).mockResolvedValue([{ _id: 'private', phoneNumber: '919999999999', createdByUserId: 'tenant' }]);
    await POST(request());
    expect(saveBunnyLead).toHaveBeenCalledWith(expect.objectContaining({ createdByUserId: 'system', status: 'new' }));
  });

  it('stops a repeated pagination cycle explicitly', async () => {
    const warning = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockImplementation(async () => Response.json({ data: [], paging: { next: 'https://graph.facebook.com/duplicate' } }));
    try {
      expect((await POST(request())).status).toBe(500);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(saveBunnyLead).not.toHaveBeenCalled();
    } finally { warning.mockRestore(); }
  });
});
