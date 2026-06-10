'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface PromoCode {
  code: string;
  discountPercent: number;
  duration: 'month' | 'year';
  active: boolean;
  note?: string;
}

/**
 * Super-admin promo-code manager. Codes are created here and handed out
 * manually — they're never shown to new users. Each gives 5–100% off for a
 * month or a year.
 */
export default function PromoCodesManager({ token }: { token: string | null | undefined }) {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PromoCode>({ code: '', discountPercent: 10, duration: 'month', active: true, note: '' });

  const headers = useCallback(
    (): Record<string, string> => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }),
    [token],
  );

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants/promo-codes', { headers: headers() });
      const data = await res.json().catch(() => ({}));
      setCodes(data?.data?.codes || []);
    } catch {
      setError('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const save = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) { setError('Enter a code'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tenants/promo-codes', { method: 'POST', headers: headers(), body: JSON.stringify({ ...form, code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || data?.error || 'Failed to save');
      setForm({ code: '', discountPercent: 10, duration: 'month', active: true, note: '' });
      fetchCodes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (code: string) => {
    if (!confirm(`Delete promo code "${code}"?`)) return;
    try {
      const res = await fetch(`/api/admin/tenants/promo-codes?code=${encodeURIComponent(code)}`, { method: 'DELETE', headers: headers() });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error?.message || d?.error || 'Failed to delete'); }
      fetchCodes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const toggleActive = async (c: PromoCode) => {
    try {
      await fetch('/api/admin/tenants/promo-codes', { method: 'POST', headers: headers(), body: JSON.stringify({ ...c, active: !c.active }) });
      fetchCodes();
    } catch { /* ignore */ }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Promo Codes</h2>
        <p className="text-sm text-gray-500">Hidden from new users — hand these out manually. 5–100% off for a month or a year.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

      {/* Create / update */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Code</label>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" placeholder="WELCOME50" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Discount %</label>
          <input type="number" min={5} max={100} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Applies for</label>
          <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value as 'month' | 'year' })} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="month">1 Month</option>
            <option value="year">1 Year</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Note (internal)</label>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="For X partner" />
        </div>
        <button onClick={save} disabled={saving || !form.code.trim()} className="bg-indigo-600 text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-40">
          {saving ? 'Saving…' : 'Add / Update'}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
      ) : codes.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-8 text-center text-gray-400 text-sm">No promo codes yet.</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-2xl">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>{['Code', 'Discount', 'Applies for', 'Status', 'Note', ''].map((h) => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {codes.map((c) => (
                <tr key={c.code} className="hover:bg-gray-50/70">
                  <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">{c.code}</td>
                  <td className="px-4 py-2.5 text-gray-700">{c.discountPercent}% off</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.duration === 'year' ? '1 year' : '1 month'}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleActive(c)} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{c.note || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => remove(c.code)} className="text-rose-500 hover:text-rose-700 text-xs font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
