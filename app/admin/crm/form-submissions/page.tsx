'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw, Upload, ArrowLeft, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type Submission = {
  _id: string;
  leadNumber?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
  source?: string;
  formType?: string;
  workshopName?: string;
  workshopLanguage?: string;
  workshopMode?: string;
  batchPreference?: string;
  country?: string;
  state?: string;
  gender?: string;
  age?: string | number;
  profession?: string;
  participantStatus?: string;
  city?: string;
  submittedAt?: string;
};

export default function FormSubmissionsPage() {
  const router = useRouter();
  const token = useAuth();
  const [rows, setRows] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadRows = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '10000' });
      if (query.trim()) params.set('q', query.trim());
      const response = await fetch(`/api/admin/crm/form-submissions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load submissions');
      setRows(Array.isArray(data.data) ? data.data : []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // Load once when the authenticated token becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const exportRows = () => {
    if (!rows.length) return;
    const exportData = rows.map(({ _id, ...row }) => ({
      _id,
      ...row,
    }));
    const sheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Form Submissions');
    XLSX.writeFile(workbook, `swar-yoga-form-submissions-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const importExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !token) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/crm/form-submissions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import failed');
      setMessage(`Updated ${data.updated || 0} submission(s). Skipped ${data.skipped || 0} row(s).`);
      if (Array.isArray(data.errors) && data.errors.length) {
        setError(data.errors.slice(0, 5).join(' | '));
      }
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const visibleRows = useMemo(() => rows.slice(0, 200), [rows]);

  if (!token) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button onClick={() => router.push('/admin/crm/form-links')} className="mb-2 flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
              <ArrowLeft size={15} /> Form Links Manager
            </button>
            <h1 className="text-2xl font-black text-slate-900">Form Submissions</h1>
            <p className="mt-1 text-sm text-slate-500">Download submissions, edit them in Excel, and upload the edited file back to Admin.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadRows} disabled={loading} className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={exportRows} disabled={!rows.length || loading} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              <Download size={16} /> Download Excel
            </button>
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
              <Upload size={16} /> Upload Edited Excel
              <input type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} className="hidden" />
            </label>
          </div>
        </div>

        {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</div>}
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && loadRows()} placeholder="Search name, email, lead number, or form type" className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400" />
          <button onClick={loadRows} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Search</button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">All form submissions</h2>
            <span className="text-sm text-slate-500">{total} record(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lead ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">WhatsApp</th><th className="px-4 py-3">Form</th><th className="px-4 py-3">Language</th><th className="px-4 py-3">Workshop Date / Batch</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{row.leadNumber || row._id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.phoneNumber || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.formType || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.workshopLanguage || '—'}</td>
                    <td className="max-w-[300px] px-4 py-3 text-slate-600">{row.batchPreference || '—'}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{row.status || '—'}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {!loading && !visibleRows.length && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No form submissions found.</td></tr>}
              </tbody>
            </table>
          </div>
          {rows.length > 200 && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Showing the first 200 rows on screen. Excel download includes all {rows.length} loaded rows.</p>}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <FileSpreadsheet size={20} className="mt-0.5 shrink-0" />
          <p><strong>Excel editing rule:</strong> keep the exported <code>_id</code> or <code>leadNumber</code> column unchanged. The importer updates existing submissions only and will not create duplicate records.</p>
        </div>
      </div>
    </main>
  );
}
