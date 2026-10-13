import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { registrationFetch } from '@/lib/registrationClient';

export function useRegistrationLeads({
  token, formId, language, refresh, ready, setLeads, setLoading, onError,
}: {
  token: string | null;
  formId: string;
  language: string;
  refresh: number;
  ready: boolean;
  setLeads: Dispatch<SetStateAction<any[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  onError: (message: string) => void;
}) {
  useEffect(() => {
    if (!ready || !token) return;
    const controller = new AbortController();
    const cacheKey = `crm_leads_cache_${language || 'all'}_${formId || 'all'}`;

    // Instant hydration from cache so table renders immediately with zero buffering
    let hasCached = false;
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLeads(parsed);
            hasCached = true;
          }
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }

    const load = async () => {
      // Only show blocking loading state if no cached data was available
      if (!hasCached) {
        setLoading(true);
      }
      try {
        const params = new URLSearchParams({ formId, language });
        const response = await registrationFetch(`/api/admin/crm/new-registration/leads?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.data)) throw new Error(data.error || 'Failed to load saved form data');
        if (!controller.signal.aborted) {
          setLeads(data.data);
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(cacheKey, JSON.stringify(data.data));
            }
          } catch {
            // Ignore quota errors
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) onError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
    // The toast callback is not stable; data identity drives loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, formId, language, refresh, ready, setLeads, setLoading]);
}
