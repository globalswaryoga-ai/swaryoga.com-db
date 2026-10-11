/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
jest.mock('@/lib/workshopOfferClient', () => {
  const { createOfferAutosave } = jest.requireActual('@/lib/workshopOfferAutosave');
  const send = jest.fn(async patch => patch);
  return { offerAutosave: createOfferAutosave(send), send };
});
import * as client from '@/lib/workshopOfferClient';
import { useOfferAutosave } from '@/hooks/useOfferAutosave';

describe('Offer edit-only autosave lifecycle', () => {
  let send: jest.Mock;
  beforeEach(() => {
    send = (client as unknown as { send: jest.Mock }).send;
    send.mockClear();
    client.offerAutosave.hydrate({ crm_offers: [], crm_offer_lead_edits: {} });
  });
  it('does not upload defaults, hydration, new batch keys, or reopen snapshots', async () => {
    const { rerender, unmount } = renderHook(({ snapshot, enabled }) => useOfferAutosave(snapshot, enabled), {
      initialProps: { snapshot: { crm_offers: '[]' } as Record<string, unknown>, enabled: false },
    });
    rerender({ snapshot: { crm_offers: [{ id: 'saved' }], crm_offer_filters_b1: { main: 'saved' } }, enabled: true });
    await act(async () => {});
    expect(send).not.toHaveBeenCalled();
    rerender({ snapshot: { crm_offers: [{ id: 'saved' }], crm_offer_filters_b2: { main: 'other' } }, enabled: true });
    await act(async () => {});
    expect(send).not.toHaveBeenCalled();
    unmount();
    renderHook(() => useOfferAutosave({ crm_offers: [{ id: 'saved' }] }, true));
    await act(async () => {});
    expect(send).not.toHaveBeenCalled();
  });
  it('saves only real changed fields and exposes failed edits for retry', async () => {
    const initial = { crm_offers: [], crm_offer_lead_edits: {} };
    const { result, rerender } = renderHook(({ snapshot }) => useOfferAutosave(snapshot, true), { initialProps: { snapshot: initial as Record<string, unknown> } });
    send.mockRejectedValueOnce(new Error('Database outage'));
    rerender({ snapshot: { ...initial, crm_offer_lead_edits: { response: { answer: 'Edited' } } } });
    await waitFor(() => expect(result.current.error).toBe('Database outage'));
    expect(send.mock.calls[0]).toEqual([{ crm_offer_lead_edits: { response: { answer: 'Edited' } } }, { crm_offer_lead_edits: {} }]);
    await act(async () => { await result.current.retry(); });
    expect(result.current.error).toBe('');
    expect(result.current.pending).toBe(false);
  });
});
