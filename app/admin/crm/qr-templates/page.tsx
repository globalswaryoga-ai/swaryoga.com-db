'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';

interface Template {
  _id: string;
  templateName: string;
  provider?: string;
  category: string;
  language?: string;
  templateContent: string;
  headerFormat?: string;
  headerContent?: string;
  imageFile?: { url: string; fileName?: string };
  headerMedia?: { kind?: string; url?: string };
  footerText?: string;
  buttons?: Array<{ title?: string; type?: string; url?: string }>;
  variables?: string[];
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export default function QRTemplatesPage() {
  const router = useRouter();
  const token = useAuth();
  const inFlightRef = useRef(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | Template['status']>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [page, setPage] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const pageSize = 20;
  const allSelectedOnPage = templates.length > 0 && templates.every(t => selectedIds.has(t._id));
  const someSelectedOnPage = templates.some(t => selectedIds.has(t._id));

  useEffect(() => { setBulkOpen(selectedIds.size >= 2); }, [selectedIds]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allSelectedOnPage) templates.forEach(t => n.delete(t._id));
      else templates.forEach(t => n.add(t._id));
      return n;
    });
  }, [allSelectedOnPage, templates]);

  const toggleOne = useCallback((id: string, force?: boolean) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      const should = force ?? !n.has(id);
      if (should) n.add(id); else n.delete(id);
      return n;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const fetchTemplates = useCallback(async () => {
    if (inFlightRef.current || !token) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      setError(null);
      const url = new URL('/api/admin/crm/templates', window.location.origin);
      url.searchParams.set('provider', 'qr');
      url.searchParams.set('limit', String(pageSize));
      url.searchParams.set('skip', String((page - 1) * pageSize));
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || `Failed: ${res.status}`);
      }
      const data = await res.json();
      setTemplates(data?.templates || []);
      setTotalTemplates(data?.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [token, page, statusFilter]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!token) return;
    if (!mountedRef.current) { mountedRef.current = true; fetchTemplates(); }
  }, [token, fetchTemplates]);

  useEffect(() => {
    if (!token || !mountedRef.current) return;
    fetchTemplates();
  }, [statusFilter, page, token, fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      const url = new URL('/api/admin/crm/templates', window.location.origin);
      url.searchParams.set('templateId', id);
      const res = await fetch(url.toString(), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error || 'Delete failed'); }
      if (selectedTemplate?._id === id) setSelectedTemplate(null);
      fetchTemplates();
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} template(s)?`)) return;
    try {
      setError(null);
      await Promise.all(Array.from(selectedIds).map(async id => {
        const url = new URL('/api/admin/crm/templates', window.location.origin);
        url.searchParams.set('templateId', id);
        const res = await fetch(url.toString(), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error || 'Delete failed'); }
      }));
      clearSelection();
      fetchTemplates();
    } catch (e) { setError(e instanceof Error ? e.message : 'Bulk delete failed'); }
  };

  const getStatusColor = (s: string) => ({
    draft: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    pending_approval: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    disabled: 'bg-gray-100 text-gray-800 border-gray-200',
  }[s] || 'bg-gray-100 text-gray-800 border-gray-200');

  const getStatusIcon = (s: string) => ({ draft: '✏️', pending_approval: '⏳', approved: '✅', rejected: '❌', disabled: '⛔' }[s] || '📄');

  const getPreviewImageUrl = (t: Template) =>
    t.imageFile?.url ||
    t.headerMedia?.url ||
    ((['IMAGE', 'VIDEO'].includes((t.headerFormat || '').toUpperCase()) && t.headerContent?.startsWith('http')) ? t.headerContent : null) ||
    null;

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/crm/qr')} className="text-gray-400 hover:text-green-600 text-sm flex items-center gap-1 transition-colors">← QR WhatsApp</button>
            <PageHeader title={<span className="text-gray-900 font-bold text-xl md:text-2xl">💚 QR Templates</span>} action={null} />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={toggleSelectAll} className="px-3 py-2 rounded-lg font-semibold bg-white text-gray-700 border border-green-600 hover:bg-green-50 text-sm">All</button>
                <button onClick={() => setBulkOpen(true)} className="px-3 py-2 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 text-sm">Actions ({selectedIds.size})</button>
                <button onClick={clearSelection} className="px-3 py-2 rounded-lg font-semibold bg-white text-gray-700 border border-red-200 hover:border-red-400 text-sm">Clear</button>
              </div>
            )}
            <button
              onClick={() => router.push('/admin/crm/qr?tab=templates&create=true')}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
            >
              + Create QR Template
            </button>
            <button
              onClick={() => router.push('/admin/crm/qr-broadcast')}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
            >
              📢 New Broadcast
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          <strong>💡 QR Templates:</strong> Templates here are used exclusively with the QR WhatsApp bridge. They are auto-approved — no Meta submission needed.
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-gray-700 font-semibold text-sm mb-2">Filter by Status</label>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'draft', 'pending_approval', 'approved', 'rejected', 'disabled'] as const).map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-4 py-2 rounded-lg font-medium transition-all border ${statusFilter === s ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'}`}>
                {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? <LoadingSpinner /> : error ? <AlertBox type="error" message={error} onClose={() => setError(null)} /> : (
          <div className="space-y-4">
            {/* Bulk actions */}
            {bulkOpen && selectedIds.size > 0 && (
              <div className="bg-white border-2 border-green-600 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-lg">
                <div className="text-gray-900 font-bold">Selected: {selectedIds.size}</div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={clearSelection} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">Close</button>
                  <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Delete selected</button>
                </div>
              </div>
            )}

            {/* Table + Sidebar */}
            <div className="flex gap-6 items-start">
              {/* Table */}
              <div className={`transition-all duration-300 ${selectedTemplate ? 'w-3/5' : 'w-full'}`}>
                {templates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl">
                    No QR templates found.{' '}
                    <button onClick={() => router.push('/admin/crm/qr?tab=templates')} className="text-green-600 font-semibold hover:underline">Create your first QR template</button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase w-8">
                              <input type="checkbox" checked={allSelectedOnPage} ref={el => { if (el) el.indeterminate = someSelectedOnPage && !allSelectedOnPage; }} onChange={toggleSelectAll} className="h-4 w-4 accent-green-600" />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase w-10">Sr.</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">Template Name</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">Header</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">Month</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">Created</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {templates.map((t, idx) => {
                            const checked = selectedIds.has(t._id);
                            const isActive = selectedTemplate?._id === t._id;
                            const d = new Date(t.createdAt);
                            const month = d.toLocaleString('en-US', { month: 'short' }).toLowerCase() + '-' + String(d.getFullYear()).slice(-2);
                            const imgUrl = getPreviewImageUrl(t);
                            return (
                              <tr key={t._id} onClick={() => setSelectedTemplate(t)}
                                className={`cursor-pointer transition-colors ${isActive ? 'bg-green-50 border-l-4 border-l-green-600' : 'hover:bg-gray-50'}`}>
                                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                  <input type="checkbox" checked={checked} onChange={e => toggleOne(t._id, e.target.checked)} className="h-4 w-4 accent-green-600" />
                                </td>
                                <td className="px-3 py-3 text-gray-500 font-mono text-xs">{(page - 1) * pageSize + idx + 1}</td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    {imgUrl && <img src={imgUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border" />}
                                    <span className="font-semibold text-gray-900 truncate max-w-[200px]">{t.templateName}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-xs text-gray-500">{t.headerFormat && t.headerFormat !== 'NONE' ? t.headerFormat : '—'}</td>
                                <td className="px-3 py-3 text-gray-600 capitalize text-xs font-medium">{month}</td>
                                <td className="px-3 py-3 text-gray-500 capitalize text-xs">{t.category?.toLowerCase()}</td>
                                <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{d.toLocaleDateString('en-IN')}</td>
                                <td className="px-3 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(t.status)}`}>
                                    <span className="text-[10px]">{getStatusIcon(t.status)}</span>{t.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {totalTemplates > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 text-sm font-medium">Previous</button>
                        <div className="text-gray-500 text-xs font-medium">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalTemplates)} of {totalTemplates}</div>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= totalTemplates} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 text-sm font-medium">Next</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Sidebar */}
              {selectedTemplate && (() => {
                const t = selectedTemplate;
                const imgUrl = getPreviewImageUrl(t);
                const variables = [...new Set((t.templateContent.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) || []).map(m => m.slice(1, -1)))];
                return (
                  <div className="w-2/5 sticky top-4">
                    <div className="bg-white rounded-xl border-2 border-green-600 shadow-lg overflow-hidden">
                      <div className="bg-green-600 px-5 py-3 flex items-center justify-between">
                        <h3 className="text-white font-bold text-sm truncate flex-1 mr-2">💚 QR Template Preview</h3>
                        <button onClick={() => setSelectedTemplate(null)} className="text-white/80 hover:text-white text-xl font-bold">&times;</button>
                      </div>
                      <div className="p-5 max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
                        <div>
                          <h4 className="text-gray-900 font-bold text-lg break-words">{t.templateName}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(t.status)}`}>{getStatusIcon(t.status)} {t.status}</span>
                            <span className="text-xs text-gray-500 capitalize">{t.category?.toLowerCase()}</span>
                            {t.language && <span className="text-xs text-gray-500">| {t.language}</span>}
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">💚 QR</span>
                          </div>
                        </div>

                        {/* WhatsApp dark preview */}
                        <div className="bg-[#0b141a] rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-2 text-center">QR WhatsApp Preview</p>
                          <div className="bg-[#025c4c] rounded-2xl overflow-hidden max-w-xs mx-auto shadow-xl">
                            {imgUrl && (
                              <div className="relative">
                                <img src={imgUrl} alt="" className="w-full max-h-44 object-cover" />
                                <div className="absolute bottom-1 right-2 bg-black/50 px-1.5 py-0.5 rounded text-[10px] text-white">
                                  {(t.headerFormat || '').toUpperCase() === 'VIDEO' ? '🎥 Video' : '🖼️ Image'}
                                </div>
                              </div>
                            )}
                            <div className="bg-[#005c4b] p-4">
                              <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{t.templateContent}</p>
                              {t.footerText && <p className="text-white/60 text-xs mt-2 pt-2 border-t border-white/20">{t.footerText}</p>}
                              {t.buttons && t.buttons.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                                  {t.buttons.map((b, i) => <p key={i} className="text-white/80 text-xs">🔘 {b.title}</p>)}
                                </div>
                              )}
                              <div className="flex justify-end mt-2">
                                <span className="text-xs text-white/60">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {variables.length > 0 && (
                          <div>
                            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Variables</label>
                            <div className="flex gap-1.5 flex-wrap">
                              {variables.map(v => <span key={v} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded border border-yellow-200 font-mono">{v}</span>)}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-400 space-y-0.5 pt-1 border-t border-gray-100">
                          <div><span className="font-semibold text-gray-500">Created:</span> {new Date(t.createdAt).toLocaleDateString('en-IN')}</div>
                          <div><span className="font-semibold text-gray-500">Updated:</span> {new Date(t.updatedAt).toLocaleDateString('en-IN')}</div>
                          {t.headerFormat && t.headerFormat !== 'NONE' && <div><span className="font-semibold text-gray-500">Header:</span> {t.headerFormat}</div>}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <div className="flex gap-2">
                            <button onClick={() => router.push(`/admin/crm/qr?tab=templates&edit=${t._id}`)} className="flex-1 px-3 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm">✏️ Edit</button>
                            <button onClick={() => router.push(`/admin/crm/qr-broadcast?templateId=${t._id}`)} className="flex-1 px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">📢 Broadcast</button>
                          </div>
                          <button onClick={() => { handleDelete(t._id); }} className="w-full px-3 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm">🗑️ Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
