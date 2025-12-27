'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner, AlertBox } from '@/components/admin/crm';

type Template = {
  _id: string;
  templateName: string;
  templateContent: string;
  category?: string;
  language?: string;
  status?: string;
  createdAt?: string;
};

type StatusType = 'all' | 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'disabled';

function TemplatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusType>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    templateName: '',
    templateContent: '',
    category: 'MARKETING',
    language: 'en',
    status: 'draft',
  });

  // Status counts
  const getTemplateStatus = (t: Template): StatusType => {
    if (!t.status || t.status === 'draft') return 'draft';
    return t.status as StatusType;
  };

  const statusCounts = {
    all: templates.length,
    draft: templates.filter(t => !t.status || t.status === 'draft').length,
    pending_approval: templates.filter(t => t.status === 'pending_approval').length,
    approved: templates.filter(t => t.status === 'approved').length,
    rejected: templates.filter(t => t.status === 'rejected').length,
    disabled: templates.filter(t => t.status === 'disabled').length,
  };

  // Filter templates based on all criteria
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = searchQuery === '' || 
      t.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.templateContent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = filterLanguage === '' || t.language === filterLanguage;
    const matchesCategory = filterCategory === '' || t.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || getTemplateStatus(t) === filterStatus;
    return matchesSearch && matchesLanguage && matchesCategory && matchesStatus;
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmFetch('/api/admin/crm/templates', {
        params: { limit: 200, skip: 0 },
      });
      setTemplates(Array.isArray(res?.templates) ? res.templates : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [crmFetch]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const successParam = searchParams.get('success');
    if (successParam === 'created') {
      setSuccess('Template created successfully!');
      setTimeout(() => setSuccess(null), 3000);
      router.replace('/admin/crm/whatsapp/templates');
    }

    fetchTemplates();
  }, [token, router, searchParams, fetchTemplates]);

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await crmFetch(`/api/admin/crm/templates/${id}`, { method: 'DELETE' });
      await fetchTemplates();
      setSuccess('Template deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.templateName || !editForm.templateContent) {
      setError('Name and content are required');
      return;
    }

    try {
      await crmFetch(`/api/admin/crm/templates/${editingId}`, {
        method: 'PUT',
        body: editForm,
      });
      setEditingId(null);
      await fetchTemplates();
      setSuccess('Template updated!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const openEdit = (template: Template) => {
    setEditingId(template._id);
    setEditForm({
      templateName: template.templateName,
      templateContent: template.templateContent,
      category: template.category || 'MARKETING',
      language: template.language || 'en',
      status: template.status || 'draft',
    });
  };

  const statusButtons = [
    { key: 'all' as const, label: 'All', icon: '📋' },
    { key: 'draft' as const, label: 'Draft', icon: '📝' },
    { key: 'pending_approval' as const, label: 'Pending', icon: '⏳' },
    { key: 'approved' as const, label: 'Approved', icon: '✅' },
    { key: 'rejected' as const, label: 'Rejected', icon: '❌' },
    { key: 'disabled' as const, label: 'Disabled', icon: '🚫' },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* SIDEBAR */}
      <div className="w-72 bg-white border-r border-gray-200 shadow-sm flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <Link
            href="/admin/crm/whatsapp"
            className="flex items-center gap-2 text-[#1E7F43] hover:text-[#166235] font-semibold transition-colors mb-4 text-sm"
          >
            ← Back to WhatsApp
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
          <p className="text-sm text-gray-600 mt-1">Manage message templates</p>
        </div>

        {/* Create Button */}
        <div className="p-4 border-b border-gray-200">
          <Link
            href="/admin/crm/whatsapp/templates/new"
            className="w-full px-4 py-3 rounded-lg bg-[#1E7F43] hover:bg-[#166235] text-white font-semibold text-center transition-all block"
          >
            + Create Template
          </Link>
        </div>

        {/* Status Filters */}
        <div className="p-4 border-b border-gray-200 space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Status Filters</p>
          {statusButtons.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all text-left flex items-center justify-between ${
                filterStatus === key
                  ? 'bg-[#1E7F43] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{icon} {label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filterStatus === key
                  ? 'bg-white text-[#1E7F43]'
                  : 'bg-gray-300 text-gray-700'
              }`}>
                {statusCounts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Language Filter */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
            Language
          </label>
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
          >
            <option value="">All Languages</option>
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 Hindi</option>
            <option value="mr">🇮🇳 Marathi</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
            Category
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
          >
            <option value="">All Categories</option>
            <option value="MARKETING">📢 Marketing</option>
            <option value="TRANSACTIONAL">💳 Transactional</option>
            <option value="OTP">🔐 OTP</option>
          </select>
        </div>

        {/* Search */}
        <div className="p-4 flex-1 flex flex-col">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
            Search
          </label>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
          />
          <div className="mt-auto pt-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{filteredTemplates.length}</div>
            <div className="text-xs text-gray-500">Templates Found</div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => fetchTemplates()}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Templates</h1>
            <p className="text-gray-600 mt-1">Create and manage message templates for broadcasts</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
          {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : editingId ? (
            // Edit Mode
            <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 shadow-md p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Edit Template</h2>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={editForm.templateName}
                  onChange={(e) => setEditForm({ ...editForm, templateName: e.target.value })}
                  placeholder="e.g., Order Confirmation"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Language
                  </label>
                  <select
                    value={editForm.language}
                    onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="hi">🇮🇳 Hindi</option>
                    <option value="mr">🇮🇳 Marathi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Category
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  >
                    <option value="MARKETING">📢 Marketing</option>
                    <option value="TRANSACTIONAL">💳 Transactional</option>
                    <option value="OTP">🔐 OTP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  >
                    <option value="draft">📝 Draft</option>
                    <option value="pending_approval">⏳ Pending</option>
                    <option value="approved">✅ Approved</option>
                    <option value="rejected">❌ Rejected</option>
                    <option value="disabled">🚫 Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Message Content *
                </label>
                <textarea
                  rows={6}
                  value={editForm.templateContent}
                  onChange={(e) => setEditForm({ ...editForm, templateContent: e.target.value })}
                  placeholder={'Message content...\n\nYou can use variables like {{firstName}}, {{phone}}, {{email}}'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Tip: Use {'{{variable}}'} for dynamic content</p>
              </div>

              {editForm.templateContent && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">📱 Preview:</p>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap bg-white p-3 rounded border border-blue-100">
                    {editForm.templateContent}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
                >
                  Update Template
                </button>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            // Empty State
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterLanguage || filterCategory || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first template to get started'}
              </p>
              <Link
                href="/admin/crm/whatsapp/templates/new"
                className="inline-block px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
              >
                + Create Template
              </Link>
            </div>
          ) : (
            // Template Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((t) => (
                <div
                  key={t._id}
                  className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-lg text-gray-900 flex-1 line-clamp-2">
                        {t.templateName}
                      </h3>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2 flex-wrap">
                      {t.language && (
                        <span className="px-3 py-1 bg-[#E6F4EC] text-[#1E7F43] text-xs font-semibold rounded-full">
                          {t.language === 'en' ? '🇬🇧' : t.language === 'hi' ? '🇮🇳' : '🇮🇳'} {t.language.toUpperCase()}
                        </span>
                      )}
                      {t.category && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {t.category === 'MARKETING' ? '📢' : t.category === 'TRANSACTIONAL' ? '💳' : '🔐'} {t.category}
                        </span>
                      )}
                      {t.status && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          t.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : t.status === 'pending_approval'
                            ? 'bg-yellow-100 text-yellow-700'
                            : t.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : t.status === 'disabled'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {t.status === 'approved' ? '✅' : t.status === 'pending_approval' ? '⏳' : t.status === 'rejected' ? '❌' : t.status === 'disabled' ? '🚫' : '📝'} {t.status || 'Draft'}
                        </span>
                      )}
                    </div>

                    {/* Content Preview */}
                    <p className="text-gray-600 text-sm line-clamp-4 min-h-16 bg-gray-50 p-3 rounded">
                      {t.templateContent}
                    </p>

                    {/* Metadata */}
                    {t.createdAt && (
                      <p className="text-xs text-gray-500">
                        Created: {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => openEdit(t)}
                        className="flex-1 px-3 py-2 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold text-sm transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteTemplate(t._id)}
                        className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold text-sm transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <TemplatesContent />
    </Suspense>
  );
}
