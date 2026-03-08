'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  RefreshCw,
  Eye,
  ExternalLink,
  Copy,
  Globe,
  X,
  CheckCircle2,
  Archive,
  BarChart3,
  Users,
  MousePointer,
  Settings,
  GripVertical,
  Trash,
} from 'lucide-react';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  mapToField?: string;
}

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  primaryColor?: string;
  form: {
    fields: FormField[];
    submitButtonText: string;
    successMessage: string;
    redirectUrl?: string;
  };
  leadSettings: {
    assignToUser?: string;
    addTags?: string[];
    setStatus?: string;
  };
  stats: {
    views: number;
    submissions: number;
    conversionRate: number;
  };
  createdAt: string;
  publishedAt?: string;
}

const PAGE_TEMPLATES = [
  { id: 'blank', name: 'Blank Page', description: 'Start from scratch' },
  { id: 'lead_capture', name: 'Lead Capture', description: 'Simple lead generation form' },
  { id: 'webinar', name: 'Webinar Registration', description: 'Collect webinar registrations' },
  { id: 'contact', name: 'Contact Form', description: 'General contact/inquiry form' },
  { id: 'newsletter', name: 'Newsletter Signup', description: 'Email subscription form' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-orange-100 text-orange-700',
};

const FIELD_TYPES = [
  { id: 'text', name: 'Text' },
  { id: 'email', name: 'Email' },
  { id: 'phone', name: 'Phone' },
  { id: 'textarea', name: 'Textarea' },
  { id: 'select', name: 'Dropdown' },
  { id: 'checkbox', name: 'Checkbox' },
  { id: 'number', name: 'Number' },
  { id: 'date', name: 'Date' },
];

export default function LandingPagesPage() {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [usage, setUsage] = useState({ pages: 0, maxPages: 1, canCreate: true });
  const [plan, setPlan] = useState('free');
  const [tenantSlug, setTenantSlug] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<LandingPage | null>(null);
  const [showSubmissions, setShowSubmissions] = useState<LandingPage | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Create form
  const [newPage, setNewPage] = useState({
    name: '',
    title: '',
    subtitle: '',
    template: 'blank',
  });

  useEffect(() => {
    const slug = localStorage.getItem('tenantSlug') || '';
    setTenantSlug(slug);
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/landing-pages?tenant=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
        setUsage(data.usage || { pages: 0, maxPages: 1, canCreate: true });
        setPlan(data.plan || 'free');
      }
    } catch (err) {
      console.error('Failed to fetch pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPage = async () => {
    if (!newPage.name.trim()) {
      alert('Please enter a page name');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/landing-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          name: newPage.name,
          title: newPage.title || newPage.name,
          subtitle: newPage.subtitle,
          template: newPage.template,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreate(false);
        setNewPage({ name: '', title: '', subtitle: '', template: 'blank' });
        fetchPages();
        // Open editor for new page
        if (data.page) {
          setShowEdit(data.page);
        }
      } else {
        alert(data.error || 'Failed to create page');
      }
    } catch (err) {
      console.error('Failed to create page:', err);
      alert('Failed to create page');
    } finally {
      setSaving(false);
    }
  };

  const updatePage = async (updates: Partial<LandingPage>) => {
    if (!showEdit) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/landing-pages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          pageId: showEdit.id,
          ...updates,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowEdit(data.page);
        fetchPages();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update page');
      }
    } catch (err) {
      console.error('Failed to update page:', err);
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!confirm('Delete this landing page? This cannot be undone.')) return;

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/landing-pages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, pageId }),
      });
      fetchPages();
    } catch (err) {
      console.error('Failed to delete page:', err);
    }
  };

  const fetchSubmissions = async (page: LandingPage) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/landing-pages/submit?tenant=${slug}&pageId=${page.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setShowSubmissions(page);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  };

  const copyPageUrl = (slug: string) => {
    const url = `${window.location.origin}/lp/${slug}`;
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  };

  const addFormField = () => {
    if (!showEdit) return;
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false,
    };
    updatePage({
      form: {
        ...showEdit.form,
        fields: [...showEdit.form.fields, newField],
      },
    });
  };

  const updateFormField = (fieldId: string, updates: Partial<FormField>) => {
    if (!showEdit) return;
    const updatedFields = showEdit.form.fields.map(f =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    setShowEdit({
      ...showEdit,
      form: { ...showEdit.form, fields: updatedFields },
    });
  };

  const removeFormField = (fieldId: string) => {
    if (!showEdit) return;
    const updatedFields = showEdit.form.fields.filter(f => f.id !== fieldId);
    setShowEdit({
      ...showEdit,
      form: { ...showEdit.form, fields: updatedFields },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
              <p className="text-gray-600">Create forms to capture leads</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchPages}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              disabled={!usage.canCreate}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              New Page
            </button>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pages</span>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{usage.pages} / {usage.maxPages}</p>
            <p className="text-sm text-gray-500">{plan} plan</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Views</span>
              <Eye className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold mt-2">
              {pages.reduce((sum, p) => sum + p.stats.views, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Submissions</span>
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-2">
              {pages.reduce((sum, p) => sum + p.stats.submissions, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Pages List */}
        {pages.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No landing pages yet</h3>
            <p className="text-gray-600 mb-4">Create your first landing page to start collecting leads</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => (
              <div key={page.id} className="bg-white rounded-xl border hover:shadow-md transition">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{page.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{page.title}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[page.status]}`}>
                      {page.status}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-lg font-bold text-gray-900">{page.stats.views}</p>
                      <p className="text-xs text-gray-500">Views</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-lg font-bold text-gray-900">{page.stats.submissions}</p>
                      <p className="text-xs text-gray-500">Leads</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-lg font-bold text-gray-900">{page.stats.conversionRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">Conv.</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEdit(page)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => fetchSubmissions(page)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Data
                    </button>
                    <button
                      onClick={() => copyPageUrl(page.slug)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {page.status === 'published' && (
                      <a
                        href={`/lp/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Open Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => deletePage(page.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Page Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Create Landing Page</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
                <input
                  type="text"
                  value={newPage.name}
                  onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Free Consultation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                <input
                  type="text"
                  value={newPage.title}
                  onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Get Your Free Consultation Today"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={newPage.subtitle}
                  onChange={(e) => setNewPage({ ...newPage, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Fill out the form below to get started"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAGE_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setNewPage({ ...newPage, template: template.id })}
                      className={`p-3 border rounded-lg text-left transition ${
                        newPage.template === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-gray-500">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={createPage}
                disabled={saving || !newPage.name.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Page Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold">Edit Landing Page</h2>
                <p className="text-sm text-gray-500">{showEdit.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[showEdit.status]}`}>
                  {showEdit.status}
                </span>
                <button onClick={() => setShowEdit(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Tabs-like sections */}
              <div className="space-y-8">
                {/* Basic Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Page Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
                      <input
                        type="text"
                        value={showEdit.name}
                        onChange={(e) => setShowEdit({ ...showEdit, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={showEdit.status}
                        onChange={(e) => setShowEdit({ ...showEdit, status: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                      <input
                        type="text"
                        value={showEdit.title}
                        onChange={(e) => setShowEdit({ ...showEdit, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={showEdit.subtitle || ''}
                        onChange={(e) => setShowEdit({ ...showEdit, subtitle: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                      <input
                        type="color"
                        value={showEdit.primaryColor || '#3b82f6'}
                        onChange={(e) => setShowEdit({ ...showEdit, primaryColor: e.target.value })}
                        className="w-full h-10 border rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                      <input
                        type="color"
                        value={showEdit.backgroundColor || '#ffffff'}
                        onChange={(e) => setShowEdit({ ...showEdit, backgroundColor: e.target.value })}
                        className="w-full h-10 border rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Form Fields</h3>
                    <button
                      onClick={addFormField}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Field
                    </button>
                  </div>
                  <div className="space-y-3">
                    {showEdit.form.fields.map((field, idx) => (
                      <div key={field.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <GripVertical className="w-5 h-5 text-gray-400 mt-2 cursor-move" />
                        <div className="flex-1 grid grid-cols-4 gap-3">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateFormField(field.id, { label: e.target.value })}
                            className="px-2 py-1.5 border rounded text-sm"
                            placeholder="Label"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => updateFormField(field.id, { type: e.target.value })}
                            className="px-2 py-1.5 border rounded text-sm"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => updateFormField(field.id, { placeholder: e.target.value })}
                            className="px-2 py-1.5 border rounded text-sm"
                            placeholder="Placeholder"
                          />
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-sm">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateFormField(field.id, { required: e.target.checked })}
                              />
                              Required
                            </label>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFormField(field.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Settings */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Form Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Submit Button Text</label>
                      <input
                        type="text"
                        value={showEdit.form.submitButtonText}
                        onChange={(e) => setShowEdit({
                          ...showEdit,
                          form: { ...showEdit.form, submitButtonText: e.target.value }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URL (optional)</label>
                      <input
                        type="url"
                        value={showEdit.form.redirectUrl || ''}
                        onChange={(e) => setShowEdit({
                          ...showEdit,
                          form: { ...showEdit.form, redirectUrl: e.target.value }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Success Message</label>
                      <textarea
                        value={showEdit.form.successMessage}
                        onChange={(e) => setShowEdit({
                          ...showEdit,
                          form: { ...showEdit.form, successMessage: e.target.value }
                        })}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Lead Settings */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Lead Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Lead Status</label>
                      <select
                        value={showEdit.leadSettings.setStatus || 'new'}
                        onChange={(e) => setShowEdit({
                          ...showEdit,
                          leadSettings: { ...showEdit.leadSettings, setStatus: e.target.value }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="interested">Interested</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Add Tags (comma separated)</label>
                      <input
                        type="text"
                        value={(showEdit.leadSettings.addTags || []).join(', ')}
                        onChange={(e) => setShowEdit({
                          ...showEdit,
                          leadSettings: {
                            ...showEdit.leadSettings,
                            addTags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="landing-page, promo"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-between sticky bottom-0 bg-white">
              <div className="text-sm text-gray-500">
                URL: <code className="bg-gray-100 px-2 py-0.5 rounded">/lp/{showEdit.slug}</code>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEdit(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updatePage(showEdit)}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold">Form Submissions</h2>
                <p className="text-sm text-gray-500">{showSubmissions.name} - {submissions.length} submissions</p>
              </div>
              <button onClick={() => setShowSubmissions(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No submissions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Date</th>
                        {showSubmissions.form.fields.slice(0, 4).map(f => (
                          <th key={f.id} className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                            {f.label}
                          </th>
                        ))}
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Lead</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </td>
                          {showSubmissions.form.fields.slice(0, 4).map(f => (
                            <td key={f.id} className="px-4 py-3 text-sm">
                              {sub.data[f.id] || '-'}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-sm">
                            {sub.leadId ? (
                              <span className="text-green-600">Created</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
