/**
 * Shared in-memory cache & request deduplicator for /api/crm-site/my-modules
 * Prevents multiple components (CrmSidebar, TrialPaywall) and rapid route transitions
 * from spamming the endpoint and causing browser net::ERR_INSUFFICIENT_RESOURCES.
 */

let inFlightPromise: Promise<any> | null = null;
let cachedData: { data: any; token: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export async function fetchMyModulesDeduped(token: string): Promise<any> {
  if (!token) return null;

  const now = Date.now();
  if (
    cachedData &&
    cachedData.token === token &&
    now - cachedData.timestamp < CACHE_TTL_MS
  ) {
    return cachedData.data;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await fetch('/api/crm-site/my-modules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return null;
      }
      const json = await res.json();
      const d = json?.data || null;
      cachedData = { data: d, token, timestamp: Date.now() };
      return d;
    } catch (err) {
      console.warn('[fetchMyModulesDeduped] network error suppressed:', err);
      return null;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export function clearMyModulesCache(): void {
  cachedData = null;
  inFlightPromise = null;
}

