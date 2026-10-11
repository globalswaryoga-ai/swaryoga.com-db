jest.mock('@/lib/registrationClient', () => ({ registrationFetch: jest.fn() }));
import { renderHook, waitFor } from '@testing-library/react';
import { useRegistrationLeads } from '@/hooks/useRegistrationLeads';
import { registrationFetch } from '@/lib/registrationClient';

it('loads the selected saved form from Bunny, not Google, and refetches only the selected connection', async () => {
  const setLeads = jest.fn();
  const setLoading = jest.fn();
  jest.mocked(registrationFetch).mockResolvedValue({
    ok: true, json: async () => ({ data: [{ id: 'response', formId: 'crm-form' }] }),
  } as Response);
  const { rerender } = renderHook(({ formId, ready }) => useRegistrationLeads({
    token: 'test', formId, language: 'Hindi', refresh: 0, ready,
    setLeads, setLoading, onError: jest.fn(),
  }), { initialProps: { formId: 'crm-form', ready: true } });
  await waitFor(() => expect(setLeads).toHaveBeenCalledWith([{ id: 'response', formId: 'crm-form' }]));
  expect(registrationFetch).toHaveBeenCalledWith('/api/admin/crm/new-registration/leads?formId=crm-form&language=Hindi', expect.any(Object));
  rerender({ formId: 'different-form', ready: true });
  await waitFor(() => expect(registrationFetch).toHaveBeenCalledWith('/api/admin/crm/new-registration/leads?formId=different-form&language=Hindi', expect.any(Object)));
  rerender({ formId: '', ready: false });
  expect(registrationFetch).toHaveBeenCalledTimes(2);
});
