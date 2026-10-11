/** @jest-environment node */
jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
jest.mock('@/lib/registrationAuth', () => ({ registrationViewer: jest.fn(() => ({ superAdmin: true })) }));
jest.mock('@/lib/whatsapp', () => ({ normalizePhone: (value: string) => value.replace(/\D/g, '') }));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ loadBunnyLeads: jest.fn() }));
jest.mock('@/lib/bunnyMetaLeadIngestion', () => ({ persistMetaFormLead: jest.fn() }));

import { POST } from '@/app/api/admin/crm/meta-leads/sync/route';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { persistMetaFormLead } from '@/lib/bunnyMetaLeadIngestion';
import type { NextRequest } from 'next/server';

describe('Bunny-only Meta lead sync', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.META_PAGE_ACCESS_TOKEN;
  const originalSecret = process.env.META_APP_SECRET;
  const fields = [{ name: 'phone_number', values: ['919999999999'] }, { name: 'full_name', values: ['Student'] }];
  const request = () => new Request('https://example.test/sync', { method: 'POST', body: JSON.stringify({ formId: 'form' }) }) as NextRequest;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.META_PAGE_ACCESS_TOKEN = 'test-token';
    delete process.env.META_APP_SECRET;
    global.fetch = jest.fn().mockResolvedValue(Response.json({ data: [{ id: 'response', field_data: fields }] }));
    jest.mocked(loadBunnyLeads).mockResolvedValue([]);
    jest.mocked(persistMetaFormLead).mockImplementation(async lead => ({ ...lead, _id: 'saved' }));
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.META_PAGE_ACCESS_TOKEN;
    else process.env.META_PAGE_ACCESS_TOKEN = originalToken;
    if (originalSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = originalSecret;
  });

  it('starts a new lead before stage-one screening rather than bypassing AI-9A', async () => {
    expect((await POST(request())).status).toBe(200);
    expect(persistMetaFormLead).toHaveBeenCalledWith(expect.objectContaining({ status: 'new', createdByUserId: 'system' }));
    expect(loadBunnyLeads).toHaveBeenCalledTimes(1);
  });

  it('skips unchanged historical responses without overwriting their stage', async () => {
    jest.mocked(loadBunnyLeads).mockResolvedValue([{
      _id: 'saved', phoneNumber: '919999999999', createdByUserId: 'system', status: 'stage_3_new',
      metadata: { metaFormId: 'form', metaLeadId: 'response', rawFieldData: fields },
    }]);
    expect(await (await POST(request())).json()).toMatchObject({ syncedCount: 0, unchangedCount: 1 });
    expect(persistMetaFormLead).not.toHaveBeenCalled();
  });

  it('does not merge a shared Meta response into a tenant-owned contact', async () => {
    jest.mocked(loadBunnyLeads).mockResolvedValue([{ _id: 'private', phoneNumber: '919999999999', createdByUserId: 'tenant' }]);
    await POST(request());
    expect(persistMetaFormLead).toHaveBeenCalledWith(expect.objectContaining({ createdByUserId: 'system', status: 'new' }));
  });

  it('stops a repeated pagination cycle explicitly', async () => {
    const warning = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockImplementation(async () => Response.json({ data: [], paging: { next: 'https://graph.facebook.com/duplicate' } }));
    try {
      expect((await POST(request())).status).toBe(500);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(persistMetaFormLead).not.toHaveBeenCalled();
    } finally { warning.mockRestore(); }
  });

  it('preserves appsecret_proof across pagination requests when fetching multiple pages', async () => {
    process.env.META_APP_SECRET = 'secret123';
    const calls: string[] = [];
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      calls.push(url);
      if (calls.length === 1) {
        return Response.json({
          data: [{ id: 'lead_1', field_data: fields }],
          paging: { next: 'https://graph.facebook.com/v24.0/form/leads?access_token=test-token&limit=100&after=cursor123' },
        });
      }
      return Response.json({
        data: [{ id: 'lead_2', field_data: [{ name: 'phone_number', values: ['918888888888'] }, { name: 'full_name', values: ['Second'] }] }],
      });
    });

    const res = await POST(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalFetched).toBe(2);
    expect(calls.length).toBe(2);
    // Verify page 2 has appsecret_proof appended
    expect(calls[1]).toContain('appsecret_proof=');
    expect(calls[1]).toContain('after=cursor123');
    expect(persistMetaFormLead).toHaveBeenCalledTimes(2);
  });
});
