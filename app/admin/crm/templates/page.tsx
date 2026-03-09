'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  PageHeader,
  LoadingSpinner,
  AlertBox,
} from '@/components/admin/crm';

interface Template {
  _id: string;
  templateName: string;
  provider?: 'meta';
  category: 'MARKETING' | 'OTP' | 'UTILITY' | 'ACCOUNT_UPDATE' | string;
  language?: string;
  templateContent: string;
  headerFormat?: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | string;
  headerContent?: string;
  headerMedia?: { kind?: 'image' | 'video'; url?: string };
  footerText?: string;
  buttons?: Array<{ title?: string }>;
  variables?: string[];
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

type TemplatePreviewPayload = {
  headerMedia?: { kind?: 'image' | 'video'; url?: string };
  buttons?: Array<{ title?: string }>;
  body?: string;
  footer?: string;
};

function safeParseTemplatePreview(content: string): TemplatePreviewPayload | null {
  try {
    const trimmed = String(content || '').trim();
    if (!trimmed) return null;
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = (parsed as any).preview && typeof (parsed as any).preview === 'object' ? (parsed as any).preview : parsed;
    return {
      headerMedia: candidate?.headerMedia,
      buttons: Array.isArray(candidate?.buttons) ? candidate.buttons : undefined,
      body: typeof candidate?.body === 'string' ? candidate.body : undefined,
      footer: typeof candidate?.footer === 'string' ? candidate.footer : undefined,
    };
  } catch {
    return null;
  }
}

export default function TemplatesPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const inFlightRef = useRef(false);

  // Bulk selection + header actions
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  useEffect(() => {
    setBulkActionsOpen(selectedTemplateIds.size >= 2);
  }, [selectedTemplateIds]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<'all' | 'meta'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Template['status']>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [page, setPage] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [syncLoading, setSyncLoading] = useState(false);

  const pageSize = 20;

  const allSelectedOnPage = templates.length > 0 && templates.every((t) => selectedTemplateIds.has(t._id));
  const someSelectedOnPage = templates.some((t) => selectedTemplateIds.has(t._id));

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        templates.forEach((t) => next.delete(t._id));
      } else {
        templates.forEach((t) => next.add(t._id));
      }
      return next;
    });
  }, [allSelectedOnPage, templates]);

  const toggleTemplateSelection = useCallback((templateId: string, opts?: { force?: boolean }) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      const exists = next.has(templateId);
      const shouldSelect = opts?.force ?? !exists;
      if (shouldSelect) next.add(templateId);
      else next.delete(templateId);
      return next;
    });
  }, []);

  const clearTemplateSelection = useCallback(() => {
    setSelectedTemplateIds(new Set());
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setError(null);
      const result = await crmFetch('/api/admin/crm/templates', {
        params: {
          limit: pageSize,
          skip: (page - 1) * pageSize,
          status: statusFilter === 'all' ? undefined : statusFilter,
          provider: providerFilter === 'all' ? undefined : providerFilter,
        },
      });

      setTemplates(result?.templates || []);
      setTotalTemplates(result?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      inFlightRef.current = false;
    }
  }, [crmFetch, page, pageSize, statusFilter, providerFilter]);

  const initialFetchDoneRef = useRef(false);

  useEffect(() => {
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    
    // Only auto-fetch on mount. Subsequent fetches happen via pagination or filter changes.
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;
    
    fetchTemplates();
  }, [token, router, fetchTemplates]);

  // Re-fetch when filters or page changes
  useEffect(() => {
    if (!token || !initialFetchDoneRef.current) return;
    fetchTemplates();
  }, [statusFilter, providerFilter, page, token, fetchTemplates]);

  const handleApproveTemplate = async (templateId: string) => {
    try {
      await crm.fetch('/api/admin/crm/templates', {
        method: 'PUT',
        body: { templateId, action: 'approve' },
      });
      fetchTemplates();
      alert('✅ Template approved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleRejectTemplate = async (templateId: string) => {
    const reason = prompt('Enter rejection reason (optional):', '');
    if (reason === null) return; // User cancelled
    
    try {
      await crm.fetch('/api/admin/crm/templates', {
        method: 'PUT',
        body: { templateId, action: 'reject', rejectionReason: reason || 'Rejected from CRM UI' },
      });
      fetchTemplates();
      alert('❌ Template rejected successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await crm.fetch('/api/admin/crm/templates', {
        method: 'DELETE',
        params: { templateId },
      });
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleSyncMetaTemplates = async () => {
    setSyncLoading(true);
    try {
      setError(null);
      const result = await crm.fetch('/api/admin/crm/templates/meta/sync', {
        params: { import: 'true' },
      });

      if (result?.success === false) {
        setError(result?.error || 'Sync failed');
      } else {
        const syncResults = result?.results || [];
        const imported = syncResults.filter((r: any) => r.action === 'imported').length;
        const updated = syncResults.filter((r: any) => r.action === 'updated').length;
        
        alert(`✅ Sync completed!\n📥 Imported: ${imported} new templates\n🔄 Updated: ${updated} existing templates`);
        
        // Refresh the template list
        setPage(1);
        fetchTemplates();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync templates from Meta');
    } finally {
      setSyncLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      pending_approval: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      disabled: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      draft: '✏️',
      pending_approval: '⏳',
      approved: '✅',
      rejected: '❌',
      disabled: '⛔',
    };
    return icons[status] || '📄';
  };

  const extractVariables = (content: string) => {
    const matches = content.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) || [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PageHeader
            title={<span className="text-gray-900 font-bold text-xl md:text-2xl">Message Templates</span>}
            action={null} // Moving actions to below for better mobile layout control
          />
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {selectedTemplateIds.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={toggleSelectAllOnPage}
                    className="flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold transition-all bg-white text-gray-700 border border-green-600 hover:bg-green-50 text-sm whitespace-nowrap"
                    title="Select/deselect all on this page"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkActionsOpen(true)}
                    className="flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold transition-all bg-green-600 text-white hover:bg-green-700 text-sm whitespace-nowrap"
                    title="Bulk actions"
                  >
                    Actions ({selectedTemplateIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={clearTemplateSelection}
                    className="flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold transition-all bg-white text-gray-700 border border-red-200 hover:border-red-400 text-sm"
                  >
                    Clear
                  </button>
                </div>
              )}

              <button
                onClick={() => router.push(`/admin/crm/templates/builder${providerFilter !== 'all' ? `?provider=${providerFilter}` : ''}`)}
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <i className="ph-bold ph-plus-circle text-lg"></i>
                Create {providerFilter === 'meta' ? 'Meta ' : ''}Template
              </button>

              <button
                onClick={handleSyncMetaTemplates}
                disabled={syncLoading}
                title="Sync Meta-approved templates into CRM and update their status"
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <i className={`ph-bold ${syncLoading ? 'ph-spinner animate-spin' : 'ph-arrows-counterclockwise'} text-lg`}></i>
                {syncLoading ? 'Syncing...' : 'Sync from Meta'}
              </button>
            </div>
        </div>

        {/* Provider Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          <button
            onClick={() => { setProviderFilter('all'); setPage(1); }}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              providerFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Templates
          </button>
          <button
            onClick={() => { setProviderFilter('meta'); setPage(1); }}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              providerFilter === 'meta'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-green-700'
            }`}
          >
            <span>📱</span> Meta
            <span className="text-[10px] opacity-80">(Approved)</span>
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800">
          <strong>💡 Workflow:</strong> New Meta templates require approval before use. Click the "Pending Approval" tab to review and approve/reject templates.
        </div>

        {/* Pending Approval Alert */}
        {templates.some(t => t.status === 'pending_approval') && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <strong>Templates Pending Approval</strong>
                <p className="mt-1 text-amber-800">
                  {templates.filter(t => t.status === 'pending_approval').length} template(s) waiting for approval. 
                  Review them in the "Pending Approval" tab and approve or reject them.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('pending_approval');
                    setPage(1);
                  }}
                  className="mt-2 px-3 py-1 bg-amber-700 text-white rounded font-semibold text-xs hover:bg-amber-800 transition-colors"
                >
                  View Pending
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Filter */}
        <div className="overflow-x-auto pb-2">
          <label className="block text-gray-700 font-semibold text-sm mb-2">Filter by Status</label>
          <div className="flex gap-2 min-w-max">
            {(['all', 'draft', 'pending_approval', 'approved', 'rejected', 'disabled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all border ${
                  statusFilter === status
                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {crm.loading ? (
          <LoadingSpinner />
        ) : error ? (
          <AlertBox type="error" message={error} onClose={() => setError(null)} />
        ) : (
          <div className="space-y-4">
            {/* Bulk actions panel */}
            {bulkActionsOpen && selectedTemplateIds.size > 0 && (
              <div className="bg-white border-2 border-green-600 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-lg">
                <div className="text-gray-900 font-bold">Selected: {selectedTemplateIds.size}</div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={clearTemplateSelection}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = window.confirm(`Delete ${selectedTemplateIds.size} selected template(s)? This cannot be undone.`);
                      if (!ok) return;
                      try {
                        setError(null);
                        await Promise.all(
                          Array.from(selectedTemplateIds).map((templateId) =>
                            crm.fetch('/api/admin/crm/templates', { method: 'DELETE', params: { templateId } })
                          )
                        );
                        clearTemplateSelection();
                        fetchTemplates();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Bulk delete failed');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Delete selected
                  </button>
                </div>
              </div>
            )}

            {/* Table + Sidebar Layout */}
            <div className="flex gap-6 items-start">
              {/* LEFT: Templates Table */}
              <div className={`transition-all duration-300 ${selectedTemplate ? 'w-3/5' : 'w-full'}`}>
                {templates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl">
                    No templates found. <button onClick={() => router.push('/admin/crm/templates/builder')} className="text-green-600 font-semibold hover:underline">Create your first template</button> to get started!
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-8">
                              <input
                                type="checkbox"
                                checked={allSelectedOnPage}
                                ref={(el) => { if (el) el.indeterminate = someSelectedOnPage && !allSelectedOnPage; }}
                                onChange={toggleSelectAllOnPage}
                                className="h-4 w-4 accent-green-600"
                                aria-label="Select all"
                              />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10">Sr.</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Template Name</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Month</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Language</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {templates.map((template, idx) => {
                            const checked = selectedTemplateIds.has(template._id);
                            const isActive = selectedTemplate?._id === template._id;
                            const createdDate = new Date(template.createdAt);
                            const monthLabel = createdDate.toLocaleString('en-US', { month: 'short' }).toLowerCase() + '-' + String(createdDate.getFullYear()).slice(-2);
                            return (
                              <tr
                                key={template._id}
                                onClick={() => setSelectedTemplate(template)}
                                className={`cursor-pointer transition-colors ${
                                  isActive
                                    ? 'bg-green-50 border-l-4 border-l-green-600'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => toggleTemplateSelection(template._id, { force: e.target.checked })}
                                    className="h-4 w-4 accent-green-600"
                                    aria-label={checked ? 'Deselect' : 'Select'}
                                  />
                                </td>
                                <td className="px-3 py-3 text-gray-500 font-mono text-xs">{(page - 1) * pageSize + idx + 1}</td>
                                <td className="px-3 py-3">
                                  <div className="font-semibold text-gray-900 truncate max-w-[220px]" title={template.templateName}>{template.templateName}</div>
                                </td>
                                <td className="px-3 py-3 text-gray-600 capitalize text-xs font-medium">{monthLabel}</td>
                                <td className="px-3 py-3 text-gray-600 text-xs">{template.language || '—'}</td>
                                <td className="px-3 py-3 text-gray-500 capitalize text-xs">{template.category?.toLowerCase()}</td>
                                <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{createdDate.toLocaleDateString('en-IN')}</td>
                                <td className="px-3 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(template.status)}`}>
                                    <span className="text-[10px]">{getStatusIcon(template.status)}</span>
                                    {template.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalTemplates > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors font-medium text-sm"
                        >
                          Previous
                        </button>
                        <div className="text-gray-500 text-xs font-medium">
                          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalTemplates)} of {totalTemplates}
                        </div>
                        <button
                          onClick={() => setPage(p => p + 1)}
                          disabled={page * pageSize >= totalTemplates}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors font-medium text-sm"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: Preview Sidebar */}
              {selectedTemplate && (() => {
                const parsedPreview = safeParseTemplatePreview(selectedTemplate.templateContent);
                const previewBody = parsedPreview?.body ?? selectedTemplate.templateContent;
                const previewFooter = parsedPreview?.footer ?? selectedTemplate.footerText ?? '';
                const previewButtons = (parsedPreview?.buttons && parsedPreview.buttons.length ? parsedPreview.buttons : selectedTemplate.buttons) || [];
                const previewHeaderMedia = parsedPreview?.headerMedia ?? selectedTemplate.headerMedia;
                const variables = extractVariables(previewBody);

                return (
                  <div className="w-2/5 sticky top-4">
                    <div className="bg-white rounded-xl border-2 border-green-600 shadow-lg overflow-hidden">
                      {/* Sidebar Header */}
                      <div className="bg-green-600 px-5 py-3 flex items-center justify-between">
                        <h3 className="text-white font-bold text-sm truncate flex-1 mr-2">Template Preview</h3>
                        <button
                          onClick={() => setSelectedTemplate(null)}
                          className="text-white/80 hover:text-white text-xl leading-none font-bold"
                          title="Close preview"
                        >
                          &times;
                        </button>
                      </div>

                      <div className="p-5 max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
                        {/* Template Name & Meta */}
                        <div>
                          <h4 className="text-gray-900 font-bold text-lg break-words">{selectedTemplate.templateName}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedTemplate.status)}`}>
                              {getStatusIcon(selectedTemplate.status)} {selectedTemplate.status}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">{selectedTemplate.category?.toLowerCase()}</span>
                            {selectedTemplate.language && (
                              <span className="text-xs text-gray-500">| {selectedTemplate.language}</span>
                            )}
                          </div>
                        </div>

                        {/* WhatsApp-style Message Preview */}
                        <div className="bg-[#e5ddd5] rounded-xl p-4">
                          <div className="bg-white rounded-lg shadow-sm p-3 space-y-2 max-w-full">
                            {/* Header media */}
                            {previewHeaderMedia?.url && (
                              <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                {previewHeaderMedia.kind === 'video' ? (
                                  <video src={previewHeaderMedia.url} controls className="w-full max-h-48 object-cover" />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={previewHeaderMedia.url} alt="Header" className="w-full max-h-48 object-cover" />
                                )}
                              </div>
                            )}

                            {/* Body */}
                            <p className="text-gray-800 text-sm whitespace-pre-wrap break-words leading-relaxed">{previewBody}</p>

                            {/* Footer */}
                            {previewFooter && (
                              <p className="text-gray-400 text-xs whitespace-pre-wrap break-words border-t border-gray-100 pt-1.5">{previewFooter}</p>
                            )}

                            {/* Buttons */}
                            {previewButtons.length > 0 && (
                              <div className="border-t border-gray-100 pt-2 space-y-1.5">
                                {previewButtons.map((b, idx) => (
                                  <div
                                    key={`preview-btn-${idx}`}
                                    className="w-full text-center text-sm font-medium text-indigo-600 bg-gray-50 border border-gray-200 rounded-lg py-2"
                                  >
                                    {b?.title || `Button ${idx + 1}`}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Variables */}
                        {variables.length > 0 && (
                          <div>
                            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Variables</label>
                            <div className="flex gap-1.5 flex-wrap">
                              {variables.map((v) => (
                                <span key={v} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded border border-yellow-200 font-mono">{v}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Details */}
                        <div className="text-xs text-gray-400 space-y-0.5 pt-1 border-t border-gray-100">
                          <div><span className="font-semibold text-gray-500">Created:</span> {new Date(selectedTemplate.createdAt).toLocaleDateString('en-IN')}</div>
                          <div><span className="font-semibold text-gray-500">Updated:</span> {new Date(selectedTemplate.updatedAt).toLocaleDateString('en-IN')}</div>
                          {selectedTemplate.headerFormat && selectedTemplate.headerFormat !== 'NONE' && (
                            <div><span className="font-semibold text-gray-500">Header:</span> {selectedTemplate.headerFormat}</div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/admin/crm/meta/templates?edit=${selectedTemplate._id}`)}
                              className="flex-1 px-3 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                            >
                              ✏️ Edit
                            </button>
                            {(selectedTemplate.status === 'draft' || selectedTemplate.status === 'pending_approval') && (
                              <button
                                onClick={() => router.push(`/admin/crm/templates/builder?templateId=${selectedTemplate._id}`)}
                                className="flex-1 px-3 py-2.5 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-sm"
                              >
                                📝 Builder
                              </button>
                            )}
                          </div>

                          {(selectedTemplate.status === 'draft' || selectedTemplate.status === 'pending_approval') && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  handleApproveTemplate(selectedTemplate._id);
                                  setSelectedTemplate(null);
                                }}
                                className="flex-1 px-3 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors shadow-sm"
                              >
                                ✅ Approve
                              </button>
                              <button
                                onClick={() => {
                                  handleRejectTemplate(selectedTemplate._id);
                                  setSelectedTemplate(null);
                                }}
                                className="flex-1 px-3 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors shadow-sm"
                              >
                                ❌ Reject
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              handleDeleteTemplate(selectedTemplate._id);
                              setSelectedTemplate(null);
                            }}
                            className="w-full px-3 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
                          >
                            🗑️ Delete
                          </button>
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
