'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type WebhookEventItem = {
  id: string;
  source?: string;
  kind: string;
  ok?: boolean;
  message?: string;
  phoneNumber?: string;
  waMessageId?: string;
  status?: string;
  receivedAt?: string;
  sample?: any;
};

function kindBadge(kind: string) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border';
  if (kind === 'inbound_message') return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (kind === 'status_update') return `${base} bg-blue-50 text-blue-700 border-blue-200`;
  if (kind === 'verify') return `${base} bg-slate-50 text-slate-700 border-slate-200`;
  if (kind === 'error') return `${base} bg-rose-50 text-rose-700 border-rose-200`;
  return `${base} bg-amber-50 text-amber-800 border-amber-200`;
}

function formatTime(ts?: string) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export default function WebhookEventsPage() {
  const [items, setItems] = useState<WebhookEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [pollMs, setPollMs] = useState(3000);

  const lastReceivedAtRef = useRef<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', '50');
    if (kind) p.set('kind', kind);
    if (phoneNumberId) p.set('phoneNumberId', phoneNumberId);
    const since = lastReceivedAtRef.current;
    if (since) p.set('since', since);
    return p.toString();
  }, [kind, phoneNumberId]);

  async function fetchEvents(resetTail: boolean) {
    try {
      setError(null);
      if (resetTail) {
        lastReceivedAtRef.current = null;
        setLoading(true);
      }

      const url = `/api/admin/crm/whatsapp/webhook-events?${queryString}`;
      const res = await fetch(url, {
        headers: {
          // Uses the same auth token approach as other CRM endpoints.
          authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const newItems: WebhookEventItem[] = Array.isArray(data?.items) ? data.items : [];

      if (resetTail) {
        setItems(newItems);
      } else if (newItems.length) {
        // since filter returns items > last; keep newest-first ordering
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...newItems.filter((i) => !seen.has(i.id)), ...prev];
          return merged.slice(0, 50);
        });
      }

      const newest = newItems[0]?.receivedAt;
      if (newest) lastReceivedAtRef.current = newest;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, phoneNumberId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchEvents(false);
    }, pollMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, queryString]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">WhatsApp Webhook Events</h1>
            <p className="text-sm text-slate-600">
              Live tail of what Meta is sending your webhook (last 50). Use filters to confirm phone_number_id.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Kind</label>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="">All</option>
                <option value="inbound_message">inbound_message</option>
                <option value="status_update">status_update</option>
                <option value="verify">verify</option>
                <option value="unknown">unknown</option>
                <option value="error">error</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">phone_number_id</label>
              <input
                className="h-9 w-64 rounded-md border border-slate-200 bg-white px-3 text-sm"
                placeholder="e.g. 733788303156745"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value.trim())}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Poll</label>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={pollMs}
                onChange={(e) => setPollMs(Number(e.target.value))}
              >
                <option value={1000}>1s</option>
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
              </select>
            </div>

            <button
              className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
              onClick={() => fetchEvents(true)}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-900">Events</div>
              <div className="text-xs text-slate-500">Showing {items.length} / 50</div>
            </div>
          </div>

          {error ? (
            <div className="px-5 py-4 text-sm text-rose-700">{error}</div>
          ) : loading ? (
            <div className="px-5 py-8 text-sm text-slate-600">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-600">No events found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((ev) => (
                <details key={ev.id} className="group px-5 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={kindBadge(ev.kind)}>{ev.kind}</span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {ev.message || ev.status || ev.waMessageId || ev.phoneNumber || ev.id}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {formatTime(ev.receivedAt)}
                          {ev.phoneNumber ? ` • from ${ev.phoneNumber}` : ''}
                          {ev.waMessageId ? ` • id ${ev.waMessageId}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 group-open:hidden">Details</div>
                  </summary>

                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <pre className="overflow-auto text-xs text-slate-700">
{JSON.stringify(ev, null, 2)}
                    </pre>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
