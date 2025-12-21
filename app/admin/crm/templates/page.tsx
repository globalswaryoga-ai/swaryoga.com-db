'use client';

import { useCallback, useEffect, useState } from 'react';
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
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Template['status']>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    templateName: '',
    category: 'MARKETING',
    templateContent: '',
  });
  const [page, setPage] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);

  const pageSize = 20;

  const fetchTemplates = useCallback(async () => {
    try {
      const result = await crm.fetch('/api/admin/crm/templates', {
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
  }, [crm, page, pageSize, statusFilter]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchTemplates();
  }, [token, router, fetchTemplates]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crm.fetch('/api/admin/crm/templates', {
        method: 'POST',
        body: {
          templateName: formData.templateName,
          category: formData.category,
          templateContent: formData.templateContent,
          status: 'draft',
        },
      });

      setShowCreateModal(false);
      setFormData({ templateName: '', category: 'MARKETING', templateContent: '' });
      setPage(1);
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Message Templates"
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
            >
              + Create Template
            </button>
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

        {/* Create Template Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl border border-purple-500/50 p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Create Template</h2>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
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
                <div>
                  <label className="block text-purple-200 text-sm mb-2">Content *</label>
                  <div className="text-purple-300 text-xs mb-2">Use {`{variableName}`} for variables</div>
                  <textarea
                    required
                    value={formData.templateContent}
                    onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
                    rows={6}
                    maxLength={1000}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 resize-none font-mono"
                    placeholder={`Hi {name}, welcome to our community!\n\nYour account is ready.`}
                  />
                  <div className="text-purple-300 text-xs mt-1">{formData.templateContent.length}/1000</div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
