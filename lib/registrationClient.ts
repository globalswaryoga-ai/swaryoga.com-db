import { getAuthToken } from '@/hooks/useAuth';

export function registrationFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return globalThis.fetch(input, { ...init, headers, cache: 'no-store' });
}

export async function saveRegistrationState(state: Record<string, unknown>) {
  const response = await registrationFetch('/api/admin/crm/new-registration/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save registration settings');
  return data;
}
