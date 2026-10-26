'use client';

import { useEffect } from 'react';

/**
 * CrmStorageGuard protects the CRM from crashes caused by localStorage quota exhaustion
 * or unhandled storage exceptions. It ensures that any setItem calls in any CRM component
 * or third-party script fail gracefully without throwing uncaught QuotaExceededError or
 * crashing Electron / browser tabs.
 */
export default function CrmStorageGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as any;
    if (win.__crmStorageGuarded) return;
    win.__crmStorageGuarded = true;

    try {
      const origSetItem = window.localStorage.setItem.bind(window.localStorage);
      window.localStorage.setItem = function (key: string, value: string) {
        try {
          origSetItem(key, value);
        } catch (err) {
          console.warn(`[CrmStorageGuard] localStorage.setItem prevented crash for "${key}":`, err);
          try {
            // Free up space by evicting stale or oversized registration caches
            const candidates: string[] = [];
            for (let i = 0; i < window.localStorage.length; i++) {
              const k = window.localStorage.key(i);
              if (k && (k.includes('_lead_ids') || k.includes('_insights') || k.includes('_ids_') || k.startsWith('crm_temp_'))) {
                candidates.push(k);
              }
            }
            for (const cand of candidates.slice(0, 10)) {
              window.localStorage.removeItem(cand);
            }
            // Retry once after pruning
            origSetItem(key, value);
          } catch (_) {
            // Quota is still exceeded; fail silently so the application does not crash
          }
        }
      };
    } catch (_) {}
  }, []);

  return null;
}
