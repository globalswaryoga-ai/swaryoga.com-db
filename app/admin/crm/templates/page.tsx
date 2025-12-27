'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  category: 'MARKETING' | 'OTP' | 'TRANSACTIONAL' | 'ACCOUNT_UPDATE' | string;
  language?: string;
  templateContent: string;
  headerFormat?: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | string;
  headerContent?: string;
  footerText?: string;
  variables?: string[];
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

type HeaderFormat = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO';

type PreviewToken = { type: 'text' | 'bold' | 'italic' | 'strike' | 'var'; value: string };

function renderWhatsAppText(raw: string): PreviewToken[] {
  // Supported:
  // - bold: *text*
  // - italic: _text_
  // - strike: ~text~
  // - variables: {name}
  const out: PreviewToken[] = [];
  const s = String(raw || '');
  const regex =
    /(\*[^*\n]+\*)|(_[^_\n]+_)|(~[^~\n]+~)|(\{[a-zA-Z_][a-zA-Z0-9_]*\})/g;
  let last = 0;
  for (const m of s.matchAll(regex)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: 'text', value: s.slice(last, idx) });
    const token = m[0];
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      out.push({ type: 'bold', value: token.slice(1, -1) });
    } else if (token.startsWith('_') && token.endsWith('_') && token.length >= 2) {
      out.push({ type: 'italic', value: token.slice(1, -1) });
    } else if (token.startsWith('~') && token.endsWith('~') && token.length >= 2) {
      out.push({ type: 'strike', value: token.slice(1, -1) });
    } else if (token.startsWith('{') && token.endsWith('}')) {
      out.push({ type: 'var', value: token.slice(1, -1) });
    } else {
      out.push({ type: 'text', value: token });
    }
    last = idx + token.length;
  }
  if (last < s.length) out.push({ type: 'text', value: s.slice(last) });
  return out;
}

function wrapSelection(el: HTMLTextAreaElement | null, value: string, left: string, right: string, patch: (next: string) => void) {
  if (!el) return;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + left + selected + right + value.slice(end);
  patch(next);
  // Restore selection after state update.
  requestAnimationFrame(() => {
    try {
      el.focus();
      el.setSelectionRange(start + left.length, end + left.length);
    } catch {
      // ignore
    }
  });
}

export default function TemplatesPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Template['status']>('all');
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingTemplateId, setEditingTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    templateName: '',
    category: 'MARKETING',
    templateContent: '',
    language: 'en',
    headerFormat: 'NONE' as HeaderFormat | 'DOCUMENT',
    headerContent: '',
    footerText: '',
  });
  const [saveMode, setSaveMode] = useState<'draft' | 'submit'>('draft');
  const [page, setPage] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);

  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const pageSize = 20;

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null);
      const result = await crmFetch('/api/admin/crm/templates', {
        params: {
          limit: pageSize,
          skip: (page - 1) * pageSize,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
      });

      setTemplates(result?.templates || []);
      setTotalTemplates(result?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [crmFetch, page, pageSize, statusFilter]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchTemplates();
  }, [token, router, fetchTemplates]);

  const handleUpsertTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const variables = extractVariables(formData.templateContent);
      const desiredStatus = saveMode === 'submit' ? 'pending_approval' : 'draft';
      if (editorMode === 'edit') {
        await crmFetch('/api/admin/crm/templates', {
          method: 'PUT',
          body: {
            templateId: editingTemplateId,
            templateName: formData.templateName,
            category: formData.category,
            language: formData.language,
            templateContent: formData.templateContent,
            headerFormat: formData.headerFormat === 'NONE' ? undefined : formData.headerFormat,
            headerContent: formData.headerContent || undefined,
            footerText: formData.footerText || undefined,
            variables,
            status: desiredStatus,
          },
        });
      } else {
        await crmFetch('/api/admin/crm/templates', {
          method: 'POST',
          body: {
            templateName: formData.templateName,
            category: formData.category,
            language: formData.language,
            templateContent: formData.templateContent,
            headerFormat: formData.headerFormat === 'NONE' ? undefined : formData.headerFormat,
            headerContent: formData.headerContent || undefined,
            footerText: formData.footerText || undefined,
            variables,
            status: desiredStatus,
          },
        });
      }

      setShowEditorModal(false);
      setEditorMode('create');
      setEditingTemplateId('');
      setFormData({
        templateName: '',
        category: 'MARKETING',
        templateContent: '',
        language: 'en',
        headerFormat: 'NONE',
        headerContent: '',
        footerText: '',
      });
      setPage(1);
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const openCreate = () => {
    setEditorMode('create');
    setEditingTemplateId('');
    setSaveMode('draft');
    setFormData({
      templateName: '',
      category: 'MARKETING',
      templateContent: '',
      language: 'en',
      headerFormat: 'NONE',
      headerContent: '',
      footerText: '',
    });
    setShowEditorModal(true);
  };

  const openEdit = (t: Template) => {
    setEditorMode('edit');
    setEditingTemplateId(t._id);
    setSaveMode('draft');
    setFormData({
      templateName: t.templateName || '',
      category: t.category || 'MARKETING',
      templateContent: t.templateContent || '',
      language: t.language || 'en',
      headerFormat: (t.headerFormat as any) || 'NONE',
      headerContent: t.headerContent || '',
      footerText: t.footerText || '',
    });
    setShowEditorModal(true);
  };

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
      draft: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
      pending_approval: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
      approved: 'bg-green-500/20 text-green-200 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-200 border-red-500/30',
      disabled: 'bg-slate-500/20 text-slate-200 border-slate-500/30',
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

  const emojiList = useMemo(() => ['😀', '🙏', '✅', '📌', '📅', '📍', '💰', '🎉', '🧘', '🌿', '☎️', '✨'], []);

  const previewBodyParts = useMemo(() => renderWhatsAppText(formData.templateContent), [formData.templateContent]);

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Message Templates"
          action={
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/admin/crm/templates/builder')}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                ✨ Advanced Builder
              </button>
              <button
                onClick={openCreate}
                className="bg-[#1E7F43] hover:bg-[#166235] text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                + Create Template
              </button>
            </div>
          }
        />

        {/* Status Filter */}
        <div>
          <label className="block text-purple-200 text-sm mb-2">Filter by Status</label>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'draft', 'pending_approval', 'approved', 'rejected', 'disabled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                    : 'bg-slate-800/50 text-purple-200 border border-purple-500/20 hover:border-purple-500/50'
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
            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.length === 0 ? (
                <div className="md:col-span-2 text-center py-12 text-purple-300">
                  No templates found. Create your first template to get started!
                </div>
              ) : (
                templates.map((template) => {
                  const variables = extractVariables(template.templateContent);
                  return (
                    <div
                      key={template._id}
                      className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-white font-semibold text-lg">{template.templateName}</h3>
                          <p className="text-purple-300 text-sm capitalize">{template.category}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium border inline-flex items-center gap-2 ${getStatusColor(template.status)}`}>
                          <span>{getStatusIcon(template.status)}</span>
                          {template.status}
                        </span>
                      </div>

                      {/* Content Preview */}
                      <div className="bg-slate-700/50 rounded-lg p-4 mb-4 max-h-24 overflow-hidden">
                        <p className="text-purple-200 text-sm line-clamp-4">{template.templateContent}</p>
                      </div>

                      {/* Variables */}
                      {variables.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-purple-300 text-xs mb-2">Variables</label>
                          <div className="flex gap-2 flex-wrap">
                            {variables.map((v) => (
                              <span
                                key={v}
                                className="px-2 py-1 bg-purple-500/20 text-purple-200 text-xs rounded border border-purple-500/30"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="text-xs text-purple-300 mb-4 space-y-1">
                        <div>Created: {new Date(template.createdAt).toLocaleDateString()}</div>
                        <div>Updated: {new Date(template.updatedAt).toLocaleDateString()}</div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className="flex-1 px-3 py-1 bg-blue-500/20 text-blue-200 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                        >
                          View
                        </button>
                        {(template.status === 'draft' || template.status === 'pending_approval') && (
                          <button
                            onClick={() => openEdit(template)}
                            className="flex-1 px-3 py-1 bg-purple-500/20 text-purple-200 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {(template.status === 'draft' || template.status === 'pending_approval') && (
                          <>
                            <button
                              onClick={() => handleApproveTemplate(template._id)}
                              className="flex-1 px-3 py-1 bg-green-500/20 text-green-200 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectTemplate(template._id)}
                              className="flex-1 px-3 py-1 bg-red-500/20 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteTemplate(template._id)}
                          className="px-3 py-1 bg-red-500/20 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
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
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg disabled:opacity-50 hover:bg-purple-500/30 transition-colors"
                >
                  Previous
                </button>
                <div className="text-purple-200 text-sm">
                  Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalTemplates)} of {totalTemplates}
                </div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= totalTemplates}
                  className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg disabled:opacity-50 hover:bg-purple-500/30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}

            {/* Add Template Button at Bottom */}
            <div className="flex justify-center pt-8">
              <button
                onClick={openCreate}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg transition-all hover:shadow-lg"
              >
                + Create New Template
              </button>
            </div>
          </div>
        )}

        {/* Template Detail Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl border border-purple-500/50 p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">{selectedTemplate.templateName}</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Category</label>
                  <div className="text-white capitalize">{selectedTemplate.category}</div>
                </div>
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(selectedTemplate.status)}`}>
                    {selectedTemplate.status}
                  </span>
                </div>
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Content</label>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-purple-200 whitespace-pre-wrap font-mono text-sm">
                    {selectedTemplate.templateContent}
                  </div>
                </div>
                {(selectedTemplate.headerFormat && selectedTemplate.headerFormat !== 'NONE') ? (
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Header</label>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-purple-200 text-sm">
                      <div className="text-xs text-purple-300 mb-2">{selectedTemplate.headerFormat}</div>
                      <div className="break-all">{selectedTemplate.headerContent || '-'}</div>
                    </div>
                  </div>
                ) : null}
                {selectedTemplate.footerText ? (
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Footer</label>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-purple-200 text-sm whitespace-pre-wrap">
                      {selectedTemplate.footerText}
                    </div>
                  </div>
                ) : null}
                {extractVariables(selectedTemplate.templateContent).length > 0 && (
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Variables</label>
                    <div className="flex gap-2 flex-wrap">
                      {extractVariables(selectedTemplate.templateContent).map((v) => (
                        <span
                          key={v}
                          className="px-3 py-1 bg-purple-500/20 text-purple-200 rounded-lg border border-purple-500/30 text-sm"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {(selectedTemplate.status === 'draft' || selectedTemplate.status === 'pending_approval') && (
                  <>
                    <button
                      onClick={() => {
                        handleApproveTemplate(selectedTemplate._id);
                        setSelectedTemplate(null);
                      }}
                      className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        handleRejectTemplate(selectedTemplate._id);
                        setSelectedTemplate(null);
                      }}
                      className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Template Modal */}
        {showEditorModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl border border-purple-500/50 p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  {editorMode === 'edit' ? 'Edit Template' : 'Create Template'}
                </h2>
                <button
                  onClick={() => setShowEditorModal(false)}
                  className="text-slate-300 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  // submit button chooses status via saveMode
                  return handleUpsertTemplate(e);
                }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Left: Editor */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-purple-200 text-sm mb-2">Template Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.templateName}
                        onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                        className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g., Welcome Message"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-200 text-sm mb-2">Language</label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="mr">Marathi</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-purple-200 text-sm mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="TRANSACTIONAL">Transactional</option>
                      <option value="OTP">OTP</option>
                      <option value="ACCOUNT_UPDATE">Account Update</option>
                    </select>
                  </div>

                  <div className="bg-slate-900/40 border border-purple-500/20 rounded-xl p-4">
                    <div className="text-white font-semibold mb-3 text-sm">Broadcast title (Header)</div>
                    <div className="text-purple-300 text-xs mb-3">Highlight your brand here, use images or videos, to stand out</div>

                    <div className="flex gap-4 flex-wrap mb-4">
                      {(
                        [
                          { v: 'NONE', label: 'None' },
                          { v: 'TEXT', label: 'Text' },
                          { v: 'IMAGE', label: 'Image' },
                          { v: 'VIDEO', label: 'Video' },
                          { v: 'DOCUMENT', label: 'Document' },
                        ] as const
                      ).map((opt) => (
                        <label key={opt.v} className="flex items-center gap-2 text-purple-100 text-sm">
                          <input
                            type="radio"
                            name="headerFormat"
                            checked={formData.headerFormat === opt.v}
                            onChange={() => setFormData({ ...formData, headerFormat: opt.v, headerContent: '' })}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>

                    {formData.headerFormat !== 'NONE' ? (
                      <div>
                        <label className="block text-purple-200 text-sm mb-2">
                          {formData.headerFormat === 'TEXT'
                            ? 'Header Text'
                            : formData.headerFormat === 'IMAGE'
                              ? 'Image URL'
                              : formData.headerFormat === 'VIDEO'
                                ? 'Video URL'
                                : 'Document URL'}
                        </label>
                        <input
                          type="text"
                          value={formData.headerContent}
                          onChange={(e) => setFormData({ ...formData, headerContent: e.target.value })}
                          className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                          placeholder={
                            formData.headerFormat === 'TEXT'
                              ? 'Enter title text'
                              : 'Paste a public URL'
                          }
                        />
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-purple-200 text-sm mb-2">Body</label>
                      <button
                        type="button"
                        onClick={() => {
                          const name = window.prompt('Variable name (example: name, batchDate)');
                          if (!name) return;
                          const cleaned = String(name).trim();
                          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleaned)) {
                            setError('Invalid variable name. Use letters/numbers/underscore, start with a letter.');
                            return;
                          }
                          const el = contentRef.current;
                          if (!el) return;
                          const placeholder = `{${cleaned}}`;
                          const start = el.selectionStart ?? formData.templateContent.length;
                          const end = el.selectionEnd ?? formData.templateContent.length;
                          const next =
                            formData.templateContent.slice(0, start) +
                            placeholder +
                            formData.templateContent.slice(end);
                          setFormData({ ...formData, templateContent: next });
                          requestAnimationFrame(() => {
                            try {
                              el.focus();
                              el.setSelectionRange(start + placeholder.length, start + placeholder.length);
                            } catch {
                              // ignore
                            }
                          });
                        }}
                        className="text-green-200 text-sm hover:text-green-100"
                      >
                        + Add Variable
                      </button>
                    </div>

                    <div className="text-purple-300 text-xs mb-2">Make your messages personal using variables like {`{name}`}</div>

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <button
                        type="button"
                        onClick={() => wrapSelection(contentRef.current, formData.templateContent, '*', '*', (next) => setFormData({ ...formData, templateContent: next }))}
                        className="px-2 py-1 bg-slate-700/60 border border-purple-500/20 text-purple-100 rounded-lg text-sm hover:border-purple-500/50"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => wrapSelection(contentRef.current, formData.templateContent, '_', '_', (next) => setFormData({ ...formData, templateContent: next }))}
                        className="px-2 py-1 bg-slate-700/60 border border-purple-500/20 text-purple-100 rounded-lg text-sm hover:border-purple-500/50"
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => wrapSelection(contentRef.current, formData.templateContent, '~', '~', (next) => setFormData({ ...formData, templateContent: next }))}
                        className="px-2 py-1 bg-slate-700/60 border border-purple-500/20 text-purple-100 rounded-lg text-sm hover:border-purple-500/50"
                        title="Strikethrough"
                      >
                        S
                      </button>

                      <div className="h-6 w-px bg-purple-500/20" />

                      <div className="flex gap-1 flex-wrap">
                        {emojiList.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              const el = contentRef.current;
                              if (!el) return;
                              const start = el.selectionStart ?? formData.templateContent.length;
                              const end = el.selectionEnd ?? formData.templateContent.length;
                              const next =
                                formData.templateContent.slice(0, start) +
                                em +
                                formData.templateContent.slice(end);
                              setFormData({ ...formData, templateContent: next });
                              requestAnimationFrame(() => {
                                try {
                                  el.focus();
                                  el.setSelectionRange(start + em.length, start + em.length);
                                } catch {
                                  // ignore
                                }
                              });
                            }}
                            className="px-2 py-1 bg-slate-700/60 border border-purple-500/20 text-purple-100 rounded-lg text-sm hover:border-purple-500/50"
                            title={`Insert ${em}`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      ref={(r) => {
                        contentRef.current = r;
                      }}
                      required
                      value={formData.templateContent}
                      onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
                      rows={10}
                      maxLength={1024}
                      className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 resize-none font-mono"
                      placeholder={`Hi {name} 🙏\n\nWelcome to Swar Yoga! *\n\nBatch: {batchDate} 📅`}
                    />
                    <div className="text-purple-300 text-xs mt-1 text-right">{formData.templateContent.length}/1024</div>
                  </div>

                  <div>
                    <label className="block text-purple-200 text-sm mb-2">Footer (optional)</label>
                    <input
                      type="text"
                      value={formData.footerText}
                      onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                      className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g., Reply STOP to unsubscribe"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowEditorModal(false)}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={() => setSaveMode('draft')}
                      className="flex-1 px-4 py-2 bg-slate-800/60 border border-green-500/30 text-green-200 rounded-lg font-semibold hover:border-green-500/60 transition-colors"
                    >
                      Save as draft
                    </button>
                    <button
                      type="submit"
                      onClick={() => setSaveMode('submit')}
                      className="flex-1 px-4 py-2 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
                    >
                      Save and submit
                    </button>
                  </div>
                </div>

                {/* Right: WhatsApp Preview */}
                <div className="space-y-4 lg:sticky lg:top-6">
                  <div className="text-white font-semibold">Preview</div>
                  <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-4">
                    <div className="mx-auto w-full max-w-sm rounded-3xl bg-slate-950 border border-slate-700 overflow-hidden">
                      <div className="bg-[#075E54] px-4 py-3 text-white text-sm font-semibold">
                        WhatsApp
                      </div>
                      <div className="bg-[#0b141a] p-4 min-h-[380px]">
                        <div className="max-w-[85%] bg-[#1f2c34] rounded-2xl px-3 py-2 text-[#e9edef] text-sm">
                          {formData.headerFormat !== 'NONE' ? (
                            <div className="mb-2">
                              {formData.headerFormat === 'TEXT' ? (
                                <div className="font-semibold">{formData.headerContent || 'Header text'}</div>
                              ) : formData.headerFormat === 'IMAGE' ? (
                                formData.headerContent ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={formData.headerContent}
                                    alt="Header"
                                    className="w-full rounded-xl border border-slate-700"
                                  />
                                ) : (
                                  <div className="w-full rounded-xl border border-slate-700 bg-slate-900/40 text-slate-300 text-xs p-3">
                                    Image preview
                                  </div>
                                )
                              ) : formData.headerFormat === 'VIDEO' ? (
                                formData.headerContent ? (
                                  <video
                                    src={formData.headerContent}
                                    controls
                                    className="w-full rounded-xl border border-slate-700"
                                  />
                                ) : (
                                  <div className="w-full rounded-xl border border-slate-700 bg-slate-900/40 text-slate-300 text-xs p-3">
                                    Video preview
                                  </div>
                                )
                              ) : formData.headerFormat === 'DOCUMENT' ? (
                                <div className="w-full rounded-xl border border-slate-700 bg-slate-900/40 text-slate-200 text-xs p-3 break-all">
                                  {formData.headerContent ? (
                                    <a
                                      href={formData.headerContent}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-200 underline"
                                    >
                                      {formData.headerContent}
                                    </a>
                                  ) : (
                                    'Document link'
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="whitespace-pre-wrap break-words">
                            {previewBodyParts.map((p, idx) => {
                              if (p.type === 'bold') {
                                return (
                                  <strong key={idx} className="font-semibold text-white">
                                    {p.value}
                                  </strong>
                                );
                              }
                              if (p.type === 'italic') {
                                return (
                                  <em key={idx} className="italic">
                                    {p.value}
                                  </em>
                                );
                              }
                              if (p.type === 'strike') {
                                return (
                                  <span key={idx} className="line-through text-slate-300">
                                    {p.value}
                                  </span>
                                );
                              }
                              if (p.type === 'var') {
                                return (
                                  <span
                                    key={idx}
                                    className="px-1 rounded bg-yellow-400/20 text-yellow-200 border border-yellow-400/30"
                                    title="Variable"
                                  >
                                    {'{'}{p.value}{'}'}
                                  </span>
                                );
                              }
                              return <span key={idx}>{p.value}</span>;
                            })}
                          </div>

                          {formData.footerText ? (
                            <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-300">
                              {formData.footerText}
                            </div>
                          ) : null}

                          <div className="mt-2 text-[10px] text-slate-400 text-right">12:45 PM</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-purple-200 text-xs">
                    Tip: Use *bold* and variables like {`{name}`} to personalize.
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
