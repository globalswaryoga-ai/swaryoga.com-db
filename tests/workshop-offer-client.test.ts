/** @jest-environment node */
import { offerFetch, offerAutosave, offerStorage } from '@/lib/workshopOfferClient';

it('routes offer list edits only to confirmed versioned offer SQL, not registration SQL', async () => {
  const memory: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => memory[key] ?? null,
    setItem: (key: string, value: string) => { memory[key] = value; },
    removeItem: (key: string) => { delete memory[key]; },
  };
  storage.setItem('crm_token', `header.${Buffer.from(JSON.stringify({ userId: 'offer-client-test' })).toString('base64url')}.signature`);
  const network = jest.fn(async (_url: string, init?: RequestInit) => {
    if (!init?.method) return new Response(JSON.stringify({ crm_offers: [{ id: 'saved', name: 'Server value' }] }));
    const body = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ success: true, saved: body.patch }));
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, fetch: network } });
  try {
    await offerFetch('/api/admin/crm/new-registration/state');
    expect(network).toHaveBeenCalledTimes(1);
    expect(offerStorage.getItem('crm_offers')).toBe('[{"id":"saved","name":"Server value"}]');
    const patch = { crm_offers: [{ id: 'saved', name: 'User edit' }] };
    const response = await offerFetch('/api/admin/crm/new-registration/state', { method: 'POST', body: JSON.stringify(patch) });
    expect(response.ok).toBe(true);
    expect(network.mock.calls[1][0]).toBe('/api/admin/crm/workshop-offer/state');
    expect(JSON.parse(String(network.mock.calls[1][1]?.body))).toEqual({
      action: 'autosave', patch, previous: { crm_offers: [{ id: 'saved', name: 'Server value' }] },
    });
    network.mockImplementationOnce(async () => new Response(JSON.stringify({ error: 'Changed in another tab' }), { status: 409 }));
    await expect(offerFetch('/api/admin/crm/new-registration/state', { method: 'POST', body: JSON.stringify({ crm_offers: [] }) })).rejects.toThrow('another tab');
    expect(offerAutosave.status()).toMatchObject({ pending: true, error: 'Changed in another tab' });
    expect(offerStorage.getItem('crm_offers')).toBe('[{"id":"saved","name":"User edit"}]');
  } finally { delete (globalThis as Record<string, unknown>).window; }
});
