'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Plus, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';

interface ChartListItem { _id: string; personName: string; }
interface MatchListItem {
  _id: string;
  label?: string;
  groomChartId?: { _id: string; personName: string };
  brideChartId?: { _id: string; personName: string };
  updatedAt: string;
}

export default function KpMatchmakingDataEntryPage() {
  const token = useAuth();
  const router = useRouter();

  const [chartList, setChartList] = useState<ChartListItem[]>([]);
  const [records, setRecords] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [label, setLabel] = useState('');
  const [groomChartId, setGroomChartId] = useState('');
  const [brideChartId, setBrideChartId] = useState('');

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [chartsRes, recordsRes] = await Promise.all([
        fetch('/api/admin/crm/kp-astro/charts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/crm/kp-astro/matchmaking', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const chartsJson = await chartsRes.json();
      const recordsJson = await recordsRes.json();
      setChartList(Array.isArray(chartsJson.data) ? chartsJson.data : []);
      setRecords(Array.isArray(recordsJson.data) ? recordsJson.data : []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    if (!token) return;
    if (!groomChartId || !brideChartId) { setError('Select both groom and bride charts'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/kp-astro/matchmaking', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label || undefined, groomChartId, brideChartId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create match');
      setLabel(''); setGroomChartId(''); setBrideChartId(''); setShowForm(false);
      router.push(`/admin/crm/kp-astro/matchmaking/workspace?matchId=${json.data._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create match');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Delete this match-making record? This cannot be undone.')) return;
    try {
      await fetch(`/api/admin/crm/kp-astro/matchmaking/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setRecords((prev) => prev.filter((r) => r._id !== id));
    } catch {
      setError('Failed to delete record');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Heart className="h-6 w-6 text-indigo-500" />Match Making</span>}
        subtitle="Pick two existing birth charts to compare for Kundali Milan"
        action={
          <div className="flex items-center gap-3">
            <Link href="/admin/crm/kp-astro/data-entry" className="text-sm text-indigo-600 hover:underline">← Data entry</Link>
            <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Cancel' : 'New Match'}
            </button>
          </div>
        }
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {chartList.length < 2 && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You need at least two saved birth charts before creating a match. <Link href="/admin/crm/kp-astro/charts" className="underline font-medium">Add birth charts</Link>.
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional, e.g. 'Sharma-Verma match')" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Groom's Chart</label>
              <select value={groomChartId} onChange={(e) => setGroomChartId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">— select —</option>
                {chartList.map((c) => <option key={c._id} value={c._id}>{c.personName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Bride's Chart</label>
              <select value={brideChartId} onChange={(e) => setBrideChartId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">— select —</option>
                {chartList.map((c) => <option key={c._id} value={c._id}>{c.personName}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Create & Continue'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Saved Matches</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-400">No matches yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((r) => (
              <div key={r._id} className="flex items-center justify-between py-3">
                <Link href={`/admin/crm/kp-astro/matchmaking/workspace?matchId=${r._id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                  {r.label || `${r.groomChartId?.personName || '?'} ↔ ${r.brideChartId?.personName || '?'}`}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{new Date(r.updatedAt).toLocaleDateString('en-IN')}</span>
                  <button onClick={() => handleDelete(r._id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
