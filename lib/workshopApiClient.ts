const LIVE_SITE_ORIGIN = 'https://swaryoga.com';

function isLocalBrowser() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

export async function fetchWorkshopApiJson<T = any>(path: string): Promise<T> {
  const urls = [path];
  if (isLocalBrowser()) {
    urls.push(`${LIVE_SITE_ORIGIN}${path}`);
  }

  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Request failed with ${res.status}`);
      }

      return json as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Workshop API request failed');
}
