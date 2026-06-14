'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';

type BankIncomeEntry = {
  id: string;
  statementId?: string;
  bankName: string;
  date: string;
  month: string;
  description: string;
  amount: number;
  name: string;
  workshopName: string;
  tagged: boolean;
};

type BankStatement = {
  id: string;
  bankName: string;
  fileName: string;
  fileUrl: string;
  status: 'parsed' | 'failed';
  entryCount: number;
  createdAt: string;
};

function monthLabel(month: string) {
  if (!month) return '';
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function BankIncomePage() {
  const token = useAuth();

  const [tab, setTab] = useState<'upload' | 'tag' | 'report'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload tab
  const [bankName, setBankName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);

  // Tag tab
  const [untaggedEntries, setUntaggedEntries] = useState<BankIncomeEntry[]>([]);
  const [loadingUntagged, setLoadingUntagged] = useState(false);
  const [workshops, setWorkshops] = useState<string[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, { date: string; amount: string; name: string; workshopName: string }>>({});

  // Report tab
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [reportMonth, setReportMonth] = useState(defaultMonth);
  const [reportBank, setReportBank] = useState('all');
  const [reportEntries, setReportEntries] = useState<BankIncomeEntry[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchStatements = useCallback(async () => {
    if (!token) return;
    setLoadingStatements(true);
    try {
      const res = await fetch('/api/admin/crm/bank-income/statements', { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load statements');
      setStatements(json.statements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statements');
    } finally {
      setLoadingStatements(false);
    }
  }, [token, authHeaders]);

  const fetchWorkshops = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/leads/metadata', { headers: authHeaders });
      const json = await res.json();
      const list = json?.data?.workshops || json?.workshops || [];
      setWorkshops(list);
    } catch {
      setWorkshops([]);
    }
  }, [token, authHeaders]);

  const fetchUntagged = useCallback(async () => {
    if (!token) return;
    setLoadingUntagged(true);
    try {
      const res = await fetch('/api/admin/crm/bank-income/entries?tagged=false', { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load entries');
      const entries: BankIncomeEntry[] = json.entries || [];
      setUntaggedEntries(entries);
      setDrafts(prev => {
        const next = { ...prev };
        entries.forEach(e => {
          if (!next[e.id]) {
            next[e.id] = {
              date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
              amount: String(e.amount),
              name: e.name || '',
              workshopName: e.workshopName || '',
            };
          }
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setLoadingUntagged(false);
    }
  }, [token, authHeaders]);

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoadingReport(true);
    try {
      const params = new URLSearchParams({ month: reportMonth, tagged: 'true' });
      if (reportBank !== 'all') params.set('bankName', reportBank);
      const res = await fetch(`/api/admin/crm/bank-income/entries?${params}`, { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load report');
      setReportEntries(json.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoadingReport(false);
    }
  }, [token, authHeaders, reportMonth, reportBank]);

  useEffect(() => {
    if (!token) return;
    fetchStatements();
    fetchWorkshops();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || tab !== 'tag') return;
    fetchUntagged();
  }, [token, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || tab !== 'report') return;
    fetchReport();
  }, [token, tab, reportMonth, reportBank]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    if (!token || !file || !bankName.trim()) {
      setError('Please enter a bank name and choose a PDF file');
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankName', bankName.trim());
      if (pdfPassword.trim()) formData.append('password', pdfPassword.trim());
      const res = await fetch('/api/admin/crm/bank-income/upload', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      if (json.entryCount > 0) {
        setSuccess(`Found ${json.entryCount} income entries. Go to the Tag tab to label them.`);
      } else {
        setSuccess('Statement uploaded, but no income entries could be detected automatically. Check the statement format.');
      }
      setFile(null);
      await fetchStatements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteStatement = async (s: BankStatement) => {
    if (!token) return;
    if (!confirm(`Delete statement "${s.fileName}" and its ${s.entryCount} entries? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/bank-income/statements/${s.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      setSuccess('Statement deleted');
      await fetchStatements();
      if (tab === 'tag') await fetchUntagged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const updateDraft = (id: string, field: keyof typeof drafts[string], value: string) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveEntry = async (entry: BankIncomeEntry) => {
    if (!token) return;
    const draft = drafts[entry.id];
    if (!draft) return;
    if (!draft.name.trim()) {
      setError('Please enter a name before saving');
      return;
    }
    setSavingIds(prev => new Set(prev).add(entry.id));
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/bank-income/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: draft.date,
          amount: Number(draft.amount),
          name: draft.name.trim(),
          workshopName: draft.workshopName.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      setUntaggedEntries(prev => prev.filter(e => e.id !== entry.id));
      setSuccess('Entry tagged');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const deleteEntry = async (entry: BankIncomeEntry) => {
    if (!token) return;
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/bank-income/entries/${entry.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      setUntaggedEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const reportTotal = useMemo(
    () => reportEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [reportEntries]
  );

  const reportBanks = useMemo(() => {
    const set = new Set(statements.map(s => s.bankName));
    return Array.from(set).sort();
  }, [statements]);

  const exportCSV = () => {
    if (reportEntries.length === 0) return;
    const headers = ['Date', 'Name', 'Workshop', 'Bank', 'Amount'];
    const rows = reportEntries.map(e => [
      e.date ? new Date(e.date).toLocaleDateString('en-IN') : '',
      e.name,
      e.workshopName,
      e.bankName,
      e.amount,
    ]);
    rows.push(['', '', '', 'TOTAL', reportTotal]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-income-${reportMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm" className="text-gray-500 hover:text-gray-700 text-sm">
                ← CRM
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">🏦 Bank Income Tracker</h1>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {(['upload', 'tag', 'report'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {t === 'upload' ? '📤 Upload' : t === 'tag' ? '🏷️ Tag' : '📊 Report'}
                {t === 'tag' && untaggedEntries.length > 0 ? ` (${untaggedEntries.length})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {tab === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Bank Statement (PDF)</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Bank name (e.g. HDFC, SBI, ICICI)"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="password"
                  placeholder="PDF password (if any)"
                  value={pdfPassword}
                  onChange={e => setPdfPassword(e.target.value)}
                  className="sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleUpload}
                  disabled={uploading || !file || !bankName.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold whitespace-nowrap"
                >
                  {uploading ? '⏳ Processing...' : '📤 Upload & Extract'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">If your bank statement PDF is password-protected (e.g. with your PAN or date of birth), enter the password above.</p>
              {reportBanks.length > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Previously used: {reportBanks.map(b => (
                    <button key={b} onClick={() => setBankName(b)} className="underline hover:text-green-700 mr-2">{b}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Statements</h2>
              {loadingStatements ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : statements.length === 0 ? (
                <p className="text-sm text-gray-500">No statements uploaded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-4">Bank</th>
                        <th className="py-2 pr-4">File</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Entries Found</th>
                        <th className="py-2 pr-4">Uploaded</th>
                        <th className="py-2 pr-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {statements.map(s => (
                        <tr key={s.id} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium">{s.bankName}</td>
                          <td className="py-2 pr-4">
                            {s.fileUrl ? (
                              <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{s.fileName}</a>
                            ) : s.fileName}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.status === 'parsed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{s.entryCount}</td>
                          <td className="py-2 pr-4 text-gray-500">{new Date(s.createdAt).toLocaleString('en-IN')}</td>
                          <td className="py-2 pr-4">
                            <button onClick={() => deleteStatement(s)} className="text-red-600 hover:underline text-xs">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'tag' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tag Income Entries</h2>
            {loadingUntagged ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : untaggedEntries.length === 0 ? (
              <p className="text-sm text-gray-500">No untagged entries. Upload a statement to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Description</th>
                      <th className="py-2 pr-2">Amount</th>
                      <th className="py-2 pr-2">Bank</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Workshop</th>
                      <th className="py-2 pr-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {untaggedEntries.map(entry => {
                      const draft = drafts[entry.id] || { date: '', amount: '', name: '', workshopName: '' };
                      const saving = savingIds.has(entry.id);
                      return (
                        <tr key={entry.id} className="border-b border-gray-100 align-top">
                          <td className="py-2 pr-2">
                            <input
                              type="date"
                              value={draft.date}
                              onChange={e => updateDraft(entry.id, 'date', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs w-32"
                            />
                          </td>
                          <td className="py-2 pr-2 max-w-xs">
                            <span className="text-xs text-gray-600">{entry.description}</span>
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              value={draft.amount}
                              onChange={e => updateDraft(entry.id, 'amount', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs w-24"
                            />
                          </td>
                          <td className="py-2 pr-2 text-xs text-gray-500">{entry.bankName}</td>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              placeholder="Name"
                              value={draft.name}
                              onChange={e => updateDraft(entry.id, 'name', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs w-32"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              placeholder="Workshop"
                              list="workshop-options"
                              value={draft.workshopName}
                              onChange={e => updateDraft(entry.id, 'workshopName', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs w-36"
                            />
                          </td>
                          <td className="py-2 pr-2 whitespace-nowrap">
                            <button
                              onClick={() => saveEntry(entry)}
                              disabled={saving}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded text-xs font-semibold mr-2"
                            >
                              {saving ? '...' : 'Save'}
                            </button>
                            <button onClick={() => deleteEntry(entry)} className="text-red-600 hover:underline text-xs">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <datalist id="workshop-options">
                  {workshops.map(w => <option key={w} value={w} />)}
                </datalist>
              </div>
            )}
          </div>
        )}

        {tab === 'report' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Monthly Income Report</h2>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={reportMonth}
                  onChange={e => setReportMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <select
                  value={reportBank}
                  onChange={e => setReportBank(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Banks</option>
                  {reportBanks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <button
                  onClick={exportCSV}
                  disabled={reportEntries.length === 0}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-3">{monthLabel(reportMonth)}</p>

            {loadingReport ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : reportEntries.length === 0 ? (
              <p className="text-sm text-gray-500">No tagged income entries for this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Workshop</th>
                      <th className="py-2 pr-4">Bank</th>
                      <th className="py-2 pr-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportEntries.map(e => (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td className="py-2 pr-4">{e.date ? new Date(e.date).toLocaleDateString('en-IN') : ''}</td>
                        <td className="py-2 pr-4">{e.name}</td>
                        <td className="py-2 pr-4">{e.workshopName}</td>
                        <td className="py-2 pr-4">{e.bankName}</td>
                        <td className="py-2 pr-4 text-right">₹{e.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t-2 border-gray-300">
                      <td className="py-2 pr-4" colSpan={4}>Total</td>
                      <td className="py-2 pr-4 text-right">₹{reportTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
