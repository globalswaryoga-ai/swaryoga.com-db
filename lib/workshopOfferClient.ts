'use client';
import { createOfferAutosave } from '@/lib/workshopOfferAutosave';

let loadedCacheScope = '';
export const offerAutosave = createOfferAutosave(async (patch, previous) => {
  if (loadedCacheScope !== cachePrefix()) throw new Error('Your CRM account changed. Reload before saving offer settings.');
  const response = await window.fetch('/api/admin/crm/workshop-offer/state', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${offerToken()}` },
    body: JSON.stringify({ action: 'autosave', patch, previous }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Offer changes were not saved. Retry before leaving.');
  for (const [key, value] of Object.entries(data.saved || {})) offerStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  return data.saved;
});

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
      await offerAutosave.save(JSON.parse(init.body));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
  const response = await window.fetch(url, { ...init, headers, cache: 'no-store' });
  if (url === '/api/admin/crm/workshop-offer/state' && (!init.method || init.method === 'GET') && response.ok) {
    const state = await response.clone().json();
    if (loadedCacheScope && loadedCacheScope !== cachePrefix()) throw new Error('Your CRM account changed. Reload the browser before editing offers.');
    loadedCacheScope = cachePrefix();
    offerAutosave.hydrate(state);
    for (const key of Object.keys(window.localStorage).filter(key => key.startsWith(cachePrefix() + 'crm_'))) window.localStorage.removeItem(key);
    for (const [key, value] of Object.entries(state)) offerStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  return response;
}

export async function offerJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await offerFetch(`/api/admin/crm/workshop-offer/${path}`, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Offer request failed (${response.status})`);
  return data as T;
}
