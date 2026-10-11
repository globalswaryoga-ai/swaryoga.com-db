'use client';

export function offerToken() {
  return window.localStorage.getItem('crm_token') || window.localStorage.getItem('adminToken') || window.localStorage.getItem('token') || '';
}

function cachePrefix() {
  const token = offerToken();
  if (!token) throw new Error('Sign in before editing offer settings');
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  const userId = payload.userId || payload.username || payload.email || payload.id || payload._id;
  if (!userId) throw new Error('Your session has no CRM identity. Sign in again.');
  return `offer_${encodeURIComponent(String(userId))}_`;
}

export const offerStorage = {
  getItem(key: string) { return window.localStorage.getItem(cachePrefix() + key); },
  setItem(key: string, value: string) { window.localStorage.setItem(cachePrefix() + key, value); },
  removeItem(key: string) { window.localStorage.removeItem(cachePrefix() + key); },
  key(index: number) { return Object.keys(window.localStorage).filter(key => key.startsWith(cachePrefix()))[index]?.slice(cachePrefix().length) || null; },
  get length() { return Object.keys(window.localStorage).filter(key => key.startsWith(cachePrefix())).length; },
};

export async function offerFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  let url = String(input);
  const headers = new Headers(init.headers);
  const token = offerToken();
  if (token && url.startsWith('/api/')) headers.set('Authorization', `Bearer ${token}`);
  if (url === '/api/admin/crm/new-registration/state') {
    url = '/api/admin/crm/workshop-offer/state';
    if (init.body && typeof init.body === 'string') {
      const patch = JSON.parse(init.body);
      init = { ...init, body: JSON.stringify(Object.fromEntries(Object.entries(patch).filter(([key]) => key.startsWith('crm_') && !/token|secret|password/i.test(key)))) };
    }
  }
  if (url.startsWith('/api/admin/google-forms/sync?') && (!init.method || init.method === 'GET')) {
    const params = new URL(url, window.location.origin).searchParams;
    url = `/api/admin/crm/new-registration/leads?formId=${encodeURIComponent(params.get('url') || '')}`;
  }
  if (url.startsWith('/api/admin/enquiries?')) {
    const params = new URL(url, window.location.origin).searchParams;
    url = `/api/admin/crm/new-registration/leads?formId=${encodeURIComponent(params.get('workshopId') || '')}`;
  }
  return window.fetch(url, { ...init, headers });
}

export async function offerJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await offerFetch(`/api/admin/crm/workshop-offer/${path}`, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Offer request failed (${response.status})`);
  return data as T;
}
