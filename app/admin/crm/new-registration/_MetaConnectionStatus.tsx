'use client';

import { useEffect, useRef, useState } from 'react';
import { registrationFetch } from '@/lib/registrationClient';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

type Health = { healthy: boolean; latencyMs: number; qualityRating?: string; error?: string; registrationAutomationConfigured?: boolean };

export function MetaConnectionStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const check = async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const response = await registrationFetch('/api/admin/crm/whatsapp/health?provider=meta', { signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.data) throw new Error(result.error || 'Meta health check unavailable.');
      if (!controller.signal.aborted) setHealth(result.data);
    } catch (error) {
      if (!controller.signal.aborted) setHealth({ healthy: false, latencyMs: 0, error: error instanceof Error ? error.message : 'Meta health check failed.' });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  useEffect(() => {
    void check();
    return () => requestRef.current?.abort();
  }, []);

  return (
    <section aria-label="Meta WhatsApp connection" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {health?.healthy ? <CheckCircle size={16} className="shrink-0 text-emerald-600" /> : <AlertCircle size={16} className="shrink-0 text-amber-600" />}
        <div>
          <span className="font-semibold text-slate-800">Meta WhatsApp</span>
          <p role="status" className="text-xs text-slate-500">
            {loading ? 'Checking connection...' : health?.healthy
              ? `Connected · API ${health.latencyMs} ms · Quality ${health.qualityRating || 'unknown'}`
              : health?.error || 'Not checked'}
          </p>
          {health?.registrationAutomationConfigured === false && (
            <p role="alert" className="text-xs text-amber-700">Automatic delivery is unavailable: the server cron secret is not configured.</p>
          )}
        </div>
      </div>
      <button type="button" disabled={loading} onClick={() => void check()} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Recheck
      </button>
    </section>
  );
}
