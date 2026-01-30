'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  PageHeader,
  LoadingSpinner,
  AlertBox,
} from '@/components/admin/crm';

interface Template {
  _id: string;
  templateName: string;
  provider?: 'meta' | 'qr';
  category: 'MARKETING' | 'OTP' | 'TRANSACTIONAL' | 'ACCOUNT_UPDATE' | string;
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
  const [providerFilter, setProviderFilter] = useState<'all' | 'meta' | 'qr'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Template['status']>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [page, setPage] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);

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
      router.push('/admin/login');
      return;
    }
    
    // Only auto-fetch on mount. Subsequent fetches happen via pagination or filter changes.
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;
    
    fetchTemplates();
  }, [token, router, fetchTemplates]);

  const handleApproveTemplate = async (templateId: string) => {
    try {
      await crm.fetch('/api/admin/crm/templates', {
        method: 'PUT',
        body: { templateId, action: 'approve' },
      });
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleRejectTemplate = async (templateId: string) => {
    try {
      await crm.fetch('/api/admin/crm/templates', {
        method: 'PUT',
        body: { templateId, action: 'reject', rejectionReason: 'Rejected from CRM UI' },
      });
      fetchTemplates();
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      pending_approval: 'bg-blue-100 text-blue-800 border-blue-200',
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
                Create {providerFilter === 'qr' ? 'QR ' : providerFilter === 'meta' ? 'Meta ' : ''}Template
              </button>
            </div>
        </div>

        {/* Provider Tabs (Meta vs QR) */}
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
          <button
            onClick={() => { setProviderFilter('qr'); setPage(1); }}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              providerFilter === 'qr'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-teal-700'
            }`}
          >
            <span>📲</span> QR Only
            <span className="text-[10px] opacity-80">(No approval)</span>
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>💡 Tip:</strong> Meta templates require WhatsApp approval and can be used in both Meta Inbox and QR WhatsApp. 
          QR templates don&apos;t need approval and work only in QR WhatsApp.
        </div>

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
          <div className="space-y-6">
            {/* Bulk actions panel (auto open when 2+ selected) */}
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

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {templates.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-4 text-center py-12 text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl">
                  No templates found. <button onClick={() => router.push('/admin/crm/templates/builder')} className="text-green-600 font-semibold hover:underline">Create your first template</button> to get started!
                </div>
              ) : (
                templates.map((template) => {
                  const parsedPreview = safeParseTemplatePreview(template.templateContent);
                  const previewBody = parsedPreview?.body ?? template.templateContent;
                  const previewFooter = parsedPreview?.footer ?? template.footerText ?? '';
                  const previewButtons = (parsedPreview?.buttons && parsedPreview.buttons.length ? parsedPreview.buttons : template.buttons) || [];
                  const previewHeaderMedia = parsedPreview?.headerMedia ?? template.headerMedia;

                  const variables = extractVariables(previewBody);
                  const checked = selectedTemplateIds.has(template._id);
                  return (
                    <div
                      key={template._id}
                      className="bg-white border-2 border-green-600 rounded-xl p-6 shadow-md transition-all hover:shadow-xl"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-gray-900 font-bold text-lg">{template.templateName}</h3>
                          <p className="text-gray-500 text-sm capitalize">{template.category}</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleTemplateSelection(template._id, { force: e.target.checked })}
                            className="h-5 w-5 mt-1 accent-green-600"
                            aria-label={checked ? 'Deselect template' : 'Select template'}
                          />
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium border inline-flex items-center gap-2 shadow-sm ${getStatusColor(template.status)}`}>
                          <span>{getStatusIcon(template.status)}</span>
                          {template.status}
                        </span>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3 border border-gray-200">
                        {/* Header media */}
                        {previewHeaderMedia?.url ? (
                          <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                            {previewHeaderMedia.kind === 'video' ? (
                              <video
                                src={previewHeaderMedia.url}
                                controls
                                className="w-full max-h-40 object-cover"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={previewHeaderMedia.url}
                                alt="Header"
                                className="w-full max-h-40 object-cover"
                              />
                            )}
                          </div>
                        ) : null}

                        {/* Body */}
                        <div className="max-h-20 overflow-hidden">
                          <p className="text-gray-800 text-sm line-clamp-4 whitespace-pre-wrap break-words font-medium">{previewBody}</p>
                        </div>

                        {/* Footer */}
                        {previewFooter ? (
                          <div className="text-gray-500 text-xs border-t border-gray-200 pt-2 whitespace-pre-wrap break-words">
                            {previewFooter}
                          </div>
                        ) : null}

                        {/* Buttons */}
                        {previewButtons.length ? (
                          <div className="space-y-2">
                            {previewButtons.slice(0, 3).map((b, idx) => (
                              <div
                                key={`${template._id}-btn-${idx}`}
                                className="w-full text-center text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg py-2"
                              >
                                {b?.title || `Button ${idx + 1}`}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {/* Variables */}
                      {variables.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-gray-500 text-xs mb-2 font-semibold uppercase tracking-wider">Variables</label>
                          <div className="flex gap-2 flex-wrap">
                            {variables.map((v) => (
                              <span
                                key={v}
                                className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded border border-yellow-200 font-mono"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="text-xs text-gray-400 mb-4 space-y-1">
                        <div>Created: {new Date(template.createdAt).toLocaleDateString()}</div>
                        <div>Updated: {new Date(template.updatedAt).toLocaleDateString()}</div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          View
                        </button>
                        {(template.status === 'draft' || template.status === 'pending_approval') && (
                          <button
                            onClick={() => router.push(`/admin/crm/templates/builder?templateId=${template._id}`)}
                            className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                          >
                            Edit
                          </button>
                        )}
                        {(template.status === 'draft' || template.status === 'pending_approval') && (
                          <>
                            <button
                              onClick={() => handleApproveTemplate(template._id)}
                              className="flex-1 px-3 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectTemplate(template._id)}
                              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteTemplate(template._id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalTemplates > 0 && (
              <div className="flex items-center justify-between pt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors font-medium"
                >
                  Previous
                </button>
                <div className="text-gray-600 text-sm font-medium">
                  Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalTemplates)} of {totalTemplates}
                </div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= totalTemplates}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors font-medium"
                >
                  Next
                </button>
              </div>
            )}


          </div>
        )}

        {/* Template Detail Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border-2 border-green-600 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{selectedTemplate.templateName}</h2>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-gray-500 font-semibold text-xs uppercase mb-1">Category</label>
                  <div className="text-gray-900 capitalize font-medium">{selectedTemplate.category}</div>
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold text-xs uppercase mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(selectedTemplate.status)}`}>
                    {selectedTemplate.status}
                  </span>
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold text-xs uppercase mb-1">Content</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-800 whitespace-pre-wrap font-sans text-sm shadow-inner">
                    {selectedTemplate.templateContent}
                  </div>
                </div>
                {(selectedTemplate.headerFormat && selectedTemplate.headerFormat !== 'NONE') ? (
                  <div>
                    <label className="block text-gray-500 font-semibold text-xs uppercase mb-1">Header</label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-800 text-sm">
                      <div className="text-xs text-gray-400 font-semibold mb-2">{selectedTemplate.headerFormat}</div>
                      <div className="break-all">{selectedTemplate.headerContent || '-'}</div>
                    </div>
                  </div>
                ) : null}
                {selectedTemplate.footerText ? (
                  <div>
                    <label className="block text-gray-500 font-semibold text-xs uppercase mb-1">Footer</label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-800 text-sm whitespace-pre-wrap">
                      {selectedTemplate.footerText}
                    </div>
                  </div>
                ) : null}
                {extractVariables(selectedTemplate.templateContent).length > 0 && (
                  <div>
                    <label className="block text-gray-500 font-semibold text-xs uppercase mb-1">Variables</label>
                    <div className="flex gap-2 flex-wrap">
                      {extractVariables(selectedTemplate.templateContent).map((v) => (
                        <span
                          key={v}
                          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-200 text-sm font-mono"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {(selectedTemplate.status === 'draft' || selectedTemplate.status === 'pending_approval') && (
                  <>
                    <button
                      onClick={() => {
                        handleApproveTemplate(selectedTemplate._id);
                        setSelectedTemplate(null);
                      }}
                      className="flex-1 px-4 py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold transition-colors shadow-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        handleRejectTemplate(selectedTemplate._id);
                        setSelectedTemplate(null);
                      }}
                      className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
