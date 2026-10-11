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

export async function saveRegistrationSnapshot(patch: Record<string, unknown>, previous: Record<string, unknown>,
  options?: { allowBatchRemoval?: boolean }) {
  const response = await registrationFetch('/api/admin/crm/new-registration/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'autosave', patch, previous, ...options }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Registration changes were not saved. Reload and retry.');
  return data.saved as Record<string, unknown>;
}

export async function saveRegistrationWorkshop(listKey: string, workshop: Record<string, unknown>, previous?: Record<string, unknown>) {
  const response = await registrationFetch('/api/admin/crm/new-registration/workshop-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listKey, workshop, previous }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save workshop settings');
  return data;
}
