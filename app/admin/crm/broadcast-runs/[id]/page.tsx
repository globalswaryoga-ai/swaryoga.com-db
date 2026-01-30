'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';

type RunRow = any;

type RunMessageRow = {
  _id: string;
  status: string;
  phoneNumber: string;
  failureReason?: string;
  provider?: string;
  waMessageId?: string;
  lead?: {
    _id: string;
    name?: string;
    status?: string;
    workshopName?: string;
    labels?: string[];
  } | null;
};

export default function BroadcastRunDetailsPage() {
  const token = useAuth();
  const crm = useCRM({ token });
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const id = String(params?.id || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunRow | null>(null);
  const [messages, setMessages] = useState<RunMessageRow[]>([]);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  const statusFilter = sp.get('status') || '';

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);

      const res: any = await crm.fetch(`/api/admin/crm/broadcast-runs/${encodeURIComponent(id)}${qs.toString() ? `?${qs.toString()}` : ''}`, {
        method: 'GET',
      });

      setRun(res?.data?.run || null);
      setMessages(Array.isArray(res?.data?.messages) ? res.data.messages : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load broadcast run');
    } finally {
      setLoading(false);
    }
  }, [crm, id, statusFilter]);

  useEffect(() => {
    if (!token) return;
    void fetchData();
  }, [token, fetchData]);

  // Trigger the broadcast run manually
  const triggerRun = async () => {
    if (!token || !id) return;
    setTriggerLoading(true);
    setTriggerResult(null);
    try {
      const res = await fetch('/api/admin/crm/broadcast-runs/run', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId: id }),
      });
      const data = await res.json();
      if (data.success) {
        const stats = data.data || {};
        setTriggerResult(`✅ Run triggered! Sent: ${stats.sent || 0}, Failed: ${stats.failed || 0}, Skipped: ${stats.skipped || 0}`);
        // Refresh data after a short delay
        setTimeout(() => fetchData(), 1500);
      } else {
        setTriggerResult(`❌ ${data.error || 'Failed to trigger run'}`);
      }
    } catch (err: any) {
      setTriggerResult(`❌ ${err.message || 'Error triggering run'}`);
    } finally {
      setTriggerLoading(false);
    }
  };

  const stats = useMemo(() => {
    const s = run?.stats || {};
    return {
      total: Number(s.total || 0),
      pending: Number(s.pending || 0),
      sent: Number(s.sent || 0),
      failed: Number(s.failed || 0),
      skipped: Number(s.skipped || 0),
      pct: Number(s.total || 0) ? Math.round(((Number(s.sent || 0) + Number(s.failed || 0) + Number(s.skipped || 0)) / Number(s.total || 0)) * 100) : 0,
    };
  }, [run]);

  const setStatus = (status: string) => {
    const qs = new URLSearchParams(sp.toString());
    if (status) qs.set('status', status);
    else qs.delete('status');
    router.push(`/admin/crm/broadcast-runs/${encodeURIComponent(id)}${qs.toString() ? `?${qs.toString()}` : ''}`);
  };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>📡 Broadcast Run</div>
          <div style={{ color: '#6B7280', fontSize: 13 }}>ID: {id}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Show "Run Now" button for scheduled/pending runs */}
          {run && (run.status === 'scheduled' || run.status === 'pending' || (stats.pending > 0 && run.status !== 'completed')) && (
            <button
              type="button"
              className="wa-btn"
              style={{ background: '#10B981', color: 'white', fontWeight: 700 }}
              onClick={triggerRun}
              disabled={triggerLoading}
            >
              {triggerLoading ? '⏳ Running...' : '▶️ Run Now'}
            </button>
          )}
          <Link href="/admin/crm/broadcast" className="wa-btn" style={{ textDecoration: 'none' }}>
            ← Back
          </Link>
        </div>
      </div>

  {error ? <AlertBox type="error" message={error} /> : null}
      {triggerResult ? <AlertBox type={triggerResult.startsWith('✅') ? 'success' : 'error'} message={triggerResult} /> : null}
      {loading ? <LoadingSpinner /> : null}

      {run ? (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
            {[
              { k: 'Total', v: stats.total },
              { k: 'Pending', v: stats.pending },
              { k: 'Sent', v: stats.sent },
              { k: 'Failed', v: stats.failed },
              { k: 'Skipped', v: stats.skipped },
            ].map((x) => (
              <div key={x.k} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, background: 'white' }}>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{x.k}</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{x.v}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>Progress</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{stats.pct}%</div>
            </div>
            <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: '#EEF2FF', overflow: 'hidden' }}>
              <div style={{ width: `${stats.pct}%`, height: '100%', background: '#4F46E5' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['', 'pending', 'sending', 'sent', 'failed', 'skipped'].map((s) => (
              <button
                key={s || 'all'}
                type="button"
                className="wa-btn"
                style={{ fontSize: 12, padding: '6px 10px', background: statusFilter === s ? '#111827' : undefined, color: statusFilter === s ? 'white' : undefined }}
                onClick={() => setStatus(s)}
              >
                {s ? s : 'all'}
              </button>
            ))}
          </div>

          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: 12, borderBottom: '1px solid #E5E7EB', fontWeight: 800 }}>Recipients</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: 12, color: '#6B7280' }}>
                    <th style={{ padding: 10 }}>Lead</th>
                    <th style={{ padding: 10 }}>Phone</th>
                    <th style={{ padding: 10 }}>Status</th>
                    <th style={{ padding: 10 }}>Provider</th>
                    <th style={{ padding: 10 }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m._id} style={{ borderTop: '1px solid #F3F4F6', fontSize: 13 }}>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontWeight: 700 }}>{m.lead?.name || m.lead?._id || '-'}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{m.lead?.workshopName || ''}</div>
                      </td>
                      <td style={{ padding: 10 }}>{m.phoneNumber}</td>
                      <td style={{ padding: 10, fontWeight: 700 }}>{m.status}</td>
                      <td style={{ padding: 10 }}>{m.provider || '-'}</td>
                      <td style={{ padding: 10, color: '#6B7280' }}>{m.failureReason || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
