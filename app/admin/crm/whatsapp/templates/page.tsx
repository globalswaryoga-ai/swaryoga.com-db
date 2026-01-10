'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner, AlertBox } from '@/components/admin/crm';

type HeaderMedia =
  | null
  | {
      kind: 'image' | 'video';
      file: File;
      objectUrl: string;
    };

function insertAroundSelection(
  el: HTMLTextAreaElement | null,
  value: string,
  wrapLeft: string,
  wrapRight: string
) {
  if (!el) return value;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);
  return `${before}${wrapLeft}${selected || ''}${wrapRight}${after}`;
}

function buildPreviewText(opts: {
  headerText: string;
  bodyText: string;
  footerText: string;
  buttons: Array<{ title: string }>;
}) {
  const parts: string[] = [];
  if (opts.headerText.trim()) parts.push(opts.headerText.trim());
  if (opts.bodyText.trim()) parts.push(opts.bodyText.trim());
  if (opts.footerText.trim()) parts.push(opts.footerText.trim());
  if (opts.buttons.some((b) => b.title.trim())) {
    parts.push('');
    parts.push(
      opts.buttons
        .filter((b) => b.title.trim())
        .map((b) => `• ${b.title.trim()}`)
        .join('\n')
    );
  }
  return parts.join('\n\n');
}

type Template = {
  _id: string;
  templateName: string;
  templateContent: string;
  category?: string;
  language?: string;
  status?: string;
  createdAt?: string;
  headerFormat?: string;
  headerContent?: string;
  footerText?: string;
  imageFile?: {
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt?: string;
  };
  documents?: Array<{
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt?: string;
  }>;
  videoUrl?: string;
};

type StatusType = 'all' | 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'disabled';

function TemplatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  // Bulk selection + header actions
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);

  useEffect(() => {
    setBulkActionsOpen(selectedTemplateIds.size >= 2);
  }, [selectedTemplateIds]);

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

  // Structured builder (edit)
  const [editHeaderText, setEditHeaderText] = useState('');
  const [editBodyText, setEditBodyText] = useState('');
  const [editFooterText, setEditFooterText] = useState('');
  const [editButtons, setEditButtons] = useState<Array<{ title: string }>>([{ title: '' }]);
  const [editHeaderMedia, setEditHeaderMedia] = useState<HeaderMedia>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editDocuments, setEditDocuments] = useState<File[]>([]);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const editBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiRow = ['😊', '🙏', '✅', '📌', '🔥', '🎉', '📞', '📍'];

  const previewButtons = useMemo(
    () => editButtons.filter((b) => b.title.trim()).slice(0, 3),
    [editButtons]
  );

  const previewText = useMemo(
    () =>
      buildPreviewText({
        headerText: editHeaderText,
        bodyText: editBodyText,
        footerText: editFooterText,
        buttons: editButtons,
      }),
    [editHeaderText, editBodyText, editFooterText, editButtons]
  );

  const applyFormat = useCallback((wrapLeft: string, wrapRight: string) => {
    setEditBodyText((prev) => insertAroundSelection(editBodyRef.current, prev, wrapLeft, wrapRight));
    requestAnimationFrame(() => editBodyRef.current?.focus());
  }, []);

  const addEmoji = useCallback((emoji: string) => {
    setEditBodyText((prev) => {
      const el = editBodyRef.current;
      if (!el) return prev + emoji;
      const start = el.selectionStart ?? prev.length;
      const end = el.selectionEnd ?? prev.length;
      return `${prev.slice(0, start)}${emoji}${prev.slice(end)}`;
    });
    requestAnimationFrame(() => editBodyRef.current?.focus());
  }, []);

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
      const templatesFromApi =
        (Array.isArray(res?.data?.templates) ? res.data.templates : null) ??
        (Array.isArray(res?.templates) ? res.templates : null) ??
        [];
      setTemplates(templatesFromApi);
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

  const allSelectedOnPage = filteredTemplates.length > 0 && filteredTemplates.every((t) => selectedTemplateIds.has(t._id));
  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        for (const t of filteredTemplates) next.delete(t._id);
      } else {
        for (const t of filteredTemplates) next.add(t._id);
      }
      return next;
    });
  }, [allSelectedOnPage, filteredTemplates]);

  const bulkDeleteSelected = useCallback(async () => {
    const ids = Array.from(selectedTemplateIds);
    if (!ids.length) return;
    const ok = window.confirm(`Delete ${ids.length} selected template(s)? This cannot be undone.`);
    if (!ok) return;
    try {
      setError(null);
      await Promise.all(ids.map((id) => crmFetch(`/api/admin/crm/templates/${id}`, { method: 'DELETE' })));
      clearTemplateSelection();
      await fetchTemplates();
      setSuccess('Templates deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete failed');
    }
  }, [clearTemplateSelection, crmFetch, fetchTemplates, selectedTemplateIds]);

  const saveEdit = async () => {
    if (!editingId || !editForm.templateName) {
      setError('Name is required');
      return;
    }

    const resolvedContent = previewText || editForm.templateContent;
    if (!String(resolvedContent || '').trim()) {
      setError('Content is required');
      return;
    }

    try {
      setLoading(true);

      const resolvedHeaderFormat: 'IMAGE' | 'VIDEO' | 'TEXT' | undefined = editHeaderMedia
        ? editHeaderMedia.kind === 'image'
          ? 'IMAGE'
          : 'VIDEO'
        : editHeaderText.trim()
          ? 'TEXT'
          : undefined;

      const resolvedHeaderContent =
        resolvedHeaderFormat === 'IMAGE'
          ? String((templates.find((t) => t._id === editingId) as any)?.imageFile?.url || '').trim() || undefined
          : resolvedHeaderFormat === 'VIDEO'
            ? editVideoUrl.trim() || undefined
            : editHeaderText.trim() || undefined;

      const resolvedHeaderMedia =
        resolvedHeaderFormat === 'IMAGE' || resolvedHeaderFormat === 'VIDEO'
          ? {
              kind: resolvedHeaderFormat === 'VIDEO' ? 'video' : 'image',
              url: resolvedHeaderContent || '',
            }
          : null;

      const body: any = {
        ...editForm,
        templateContent: resolvedContent,
        headerFormat: resolvedHeaderFormat,
        // IMPORTANT: IMAGE/VIDEO headers expect the MEDIA URL here.
        headerContent: resolvedHeaderContent,
        headerMedia: resolvedHeaderMedia || undefined,
        footerText: editFooterText.trim() || undefined,
        content: {
          headerText: editHeaderText,
          hasHeaderMedia: Boolean(editHeaderMedia),
          bodyText: editBodyText,
          footerText: editFooterText,
          buttons: editButtons,
        },
      };

      // Add media fields if present
      if (editImageFile) {
        const formData = new FormData();
        formData.append('file', editImageFile);
        formData.append('fileType', 'image');
        
        const uploadRes = await fetch('/api/admin/crm/templates/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Image upload failed');
        const uploadData = await uploadRes.json();
        body.imageFile = uploadData?.data ?? uploadData;

        // If this template uses an image header, keep headerContent in sync.
        if (body.headerFormat === 'IMAGE' && body.imageFile?.url) {
          body.headerContent = String(body.imageFile.url);
          body.headerMedia = { kind: 'image', url: String(body.imageFile.url) };
        }
      }

      if (editDocuments.length > 0) {
        const docUrls: any[] = [];
        for (const doc of editDocuments) {
          const formData = new FormData();
          formData.append('file', doc);
          formData.append('fileType', 'document');
          
          const uploadRes = await fetch('/api/admin/crm/templates/upload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!uploadRes.ok) throw new Error('Document upload failed');
          const uploadData = await uploadRes.json();
          docUrls.push(uploadData?.data ?? uploadData);
        }
        body.documents = docUrls;
      }

      if (editVideoUrl.trim()) {
        body.videoUrl = editVideoUrl.trim();
      }

      await crmFetch(`/api/admin/crm/templates/${editingId}`, {
        method: 'PUT',
        body,
      });
      
      setEditingId(null);
      await fetchTemplates();
      setSuccess('Template updated!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
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

    // Best-effort parse: prefer structured fields if available, else fall back to templateContent.
    const headerText = String(template.headerContent || '').trim();
    const footerText = String(template.footerText || '').trim();
    const content = String(template.templateContent || '').trim();
    let body = content;
    if (headerText && body.startsWith(headerText)) body = body.slice(headerText.length).trim();
    if (footerText && body.endsWith(footerText)) body = body.slice(0, Math.max(0, body.length - footerText.length)).trim();

    setEditHeaderText(headerText);
    setEditFooterText(footerText);
    setEditBodyText(body);
    setEditButtons([{ title: "" }]);

    // Set media fields from existing template
    if (template.headerFormat === "IMAGE" && template.imageFile?.url) {
      setEditHeaderMedia({ kind: "image", file: null as any, objectUrl: template.imageFile.url });
    } else if (template.headerFormat === "VIDEO" && template.videoUrl) {
      setEditHeaderMedia({ kind: "video", file: null as any, objectUrl: template.videoUrl });
    } else {
      setEditHeaderMedia(null);
    }
    
    setEditImageFile(null);
    setEditDocuments([]);
    setEditVideoUrl(template.videoUrl || "");
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
            href="/admin/crm/templates/builder"
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

          {/* Bulk actions (header) */}
          {selectedTemplateIds.size > 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="font-semibold text-emerald-900">Selected: {selectedTemplateIds.size}</div>

                <button
                  onClick={clearTemplateSelection}
                  className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 rounded-lg font-semibold hover:bg-emerald-100 transition-colors"
                >
                  Clear
                </button>

                <button
                  onClick={toggleSelectAllOnPage}
                  className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 rounded-lg font-semibold hover:bg-emerald-100 transition-colors"
                  title="Select/deselect all templates in current view"
                >
                  Actions All
                </button>

                <button
                  onClick={() => setBulkActionsOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Actions
                </button>

                <button
                  onClick={bulkDeleteSelected}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  title="Delete selected templates"
                >
                  Delete Selected
                </button>
              </div>

              <div className="text-sm text-emerald-900/70">Tip: select 2+ templates to auto-open actions.</div>
            </div>
          ) : null}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : editingId ? (
            // Edit Mode
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Editor */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-gray-900">Edit Template</div>
                        <div className="text-xs text-gray-500">Builder + live preview</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                          onClick={() => applyFormat('*', '*')}
                          title="Bold (*text*)"
                        >
                          <span style={{ fontWeight: 800 }}>B</span>
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                          onClick={() => applyFormat('_', '_')}
                          title="Italic (_text_)"
                        >
                          <span style={{ fontStyle: 'italic' }}>I</span>
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                          onClick={() => setEditingId(null)}
                          title="Close"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Template Name *</label>
                        <input
                          type="text"
                          value={editForm.templateName}
                          onChange={(e) => setEditForm({ ...editForm, templateName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                          spellCheck
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Language</label>
                          <select
                            value={editForm.language}
                            onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                          >
                            <option value="en">EN</option>
                            <option value="hi">HI</option>
                            <option value="mr">MR</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
                          <select
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                          >
                            <option value="MARKETING">Marketing</option>
                            <option value="TRANSACTIONAL">Transactional</option>
                            <option value="OTP">OTP</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                          >
                            <option value="draft">Draft</option>
                            <option value="pending_approval">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5 space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Header text</label>
                        <input
                          type="text"
                          value={editHeaderText}
                          onChange={(e) => setEditHeaderText(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                          spellCheck
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-900">Image / Video (always on top)</label>
                          {editHeaderMedia ? (
                            <button
                              type="button"
                              className="text-sm font-semibold text-red-600 hover:text-red-700"
                              onClick={() => setEditHeaderMedia(null)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                            <div>
                              <div className="font-semibold text-gray-900">📷 Add Image</div>
                              <div className="text-xs text-gray-500">Preview only</div>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const objectUrl = URL.createObjectURL(f);
                                setEditHeaderMedia({ kind: 'image', file: f, objectUrl });
                              }}
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                            <div>
                              <div className="font-semibold text-gray-900">🎬 Add Video</div>
                              <div className="text-xs text-gray-500">Preview only</div>
                            </div>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const objectUrl = URL.createObjectURL(f);
                                setEditHeaderMedia({ kind: 'video', file: f, objectUrl });
                              }}
                            />
                          </label>
                        </div>
                        {editHeaderMedia ? (
                          <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                            {editHeaderMedia.kind === 'image' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={editHeaderMedia.objectUrl} alt="Header" className="w-full max-h-64 object-cover" />
                            ) : (
                              <video src={editHeaderMedia.objectUrl} controls className="w-full max-h-64 object-cover" />
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-900">Other text</label>
                          <div className="flex gap-1">
                            {emojiRow.map((em) => (
                              <button
                                key={em}
                                type="button"
                                className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50"
                                onClick={() => addEmoji(em)}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          ref={(el) => {
                            editBodyRef.current = el;
                          }}
                          rows={8}
                          value={editBodyText}
                          onChange={(e) => setEditBodyText(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                          spellCheck
                        />
                        <div className="mt-2 text-xs text-gray-500">
                          Tips: bold with <code>*text*</code>, italic with <code>_text_</code>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Footer text</label>
                        <input
                          type="text"
                          value={editFooterText}
                          onChange={(e) => setEditFooterText(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                          spellCheck
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-900">Button(s)</label>
                          <button
                            type="button"
                            className="text-sm font-semibold text-[#1E7F43] hover:text-[#166235]"
                            onClick={() => setEditButtons((prev) => (prev.length >= 3 ? prev : [...prev, { title: '' }]))}
                          >
                            + Add button
                          </button>
                        </div>
                        <div className="space-y-2">
                          {editButtons.map((b, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                placeholder={`Button ${idx + 1} title`}
                                value={b.title}
                                onChange={(e) =>
                                  setEditButtons((prev) => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                                }
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                                spellCheck
                              />
                              {editButtons.length > 1 ? (
                                <button
                                  type="button"
                                  className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50"
                                  onClick={() => setEditButtons((prev) => prev.filter((_, i) => i !== idx))}
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Media Section */}
                      <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h4 className="text-sm font-semibold text-gray-900">📦 Media & Attachments</h4>
                        
                        {/* Image Upload */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">📷 Image (max 25MB)</label>
                          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 cursor-pointer bg-white">
                            <span className="text-sm text-gray-600">Choose image or drag & drop</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                            />
                          </label>
                          {editImageFile && (
                            <div className="mt-2 flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                              <span className="text-sm text-green-700">{editImageFile.name}</span>
                              <button
                                type="button"
                                onClick={() => setEditImageFile(null)}
                                className="text-sm text-red-600 hover:text-red-700 font-semibold"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Document Upload */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">📎 Documents (max 50MB each)</label>
                          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 cursor-pointer bg-white">
                            <span className="text-sm text-gray-600">Add PDF, DOC, XLS, etc.</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files) {
                                  setEditDocuments(prev => [...prev, ...Array.from(e.target.files || [])]);
                                }
                              }}
                            />
                          </label>
                          {editDocuments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {editDocuments.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                                  <span className="text-sm text-green-700 truncate">{doc.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditDocuments(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Video URL */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">🎬 Video URL</label>
                          <input
                            type="url"
                            placeholder="https://example.com/video.mp4"
                            value={editVideoUrl}
                            onChange={(e) => setEditVideoUrl(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                          />
                          {editVideoUrl && (
                            <div className="mt-2 text-xs text-gray-600">✅ Video URL set</div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="flex-1 px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-xl font-semibold transition-colors"
                        >
                          Update Template
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="lg:col-span-1">
                  <div className="lg:sticky lg:top-6 bg-white rounded-2xl border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200">
                      <div className="text-lg font-bold text-gray-900">Preview</div>
                      <div className="text-xs text-gray-500">Right-side live preview</div>
                    </div>
                    <div className="p-5">
                      <div className="rounded-2xl border border-gray-200 overflow-hidden" style={{ background: '#E5DDD5' }}>
                        <div className="p-4">
                          <div className="max-w-[92%] rounded-2xl px-4 py-3 shadow-sm" style={{ background: '#ffffff' }}>
                            {editHeaderText.trim() ? (
                              <div className="text-xs font-semibold text-gray-900 mb-2">{editHeaderText}</div>
                            ) : null}

                            {editHeaderMedia ? (
                              <div className="mb-3 rounded-xl overflow-hidden border border-gray-200">
                                {editHeaderMedia.kind === 'image' ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={editHeaderMedia.objectUrl} alt="Preview" className="w-full max-h-64 object-cover" />
                                ) : (
                                  <video src={editHeaderMedia.objectUrl} controls className="w-full max-h-64 object-cover" />
                                )}
                              </div>
                            ) : null}

                            <div className="text-sm text-gray-800 whitespace-pre-wrap">{editBodyText.trim() || 'Your message…'}</div>

                            {editFooterText.trim() ? (
                              <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-600">{editFooterText}</div>
                            ) : null}
                          </div>

                          {previewButtons.length ? (
                            <div className="mt-3 max-w-[92%]">
                              {previewButtons.map((b, idx) => (
                                <div key={idx} className="mt-2">
                                  <button
                                    type="button"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-[#1E7F43] hover:bg-gray-50"
                                  >
                                    {b.title}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 text-xs text-gray-500">
                        Preview text saved as template content:
                        <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 whitespace-pre-wrap">
                          {previewText || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                href="/admin/crm/templates/builder"
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
                    {/* Select */}
                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedTemplateIds.has(t._id)}
                          onChange={() => toggleTemplateSelection(t._id)}
                          className="h-4 w-4 accent-emerald-600 cursor-pointer"
                        />
                        Select
                      </label>

                      <div className="text-xs text-gray-500">
                        {allSelectedOnPage ? 'All selected' : ''}
                      </div>
                    </div>

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

                    {/* Media Display Section */}
                    {(t.imageFile || (t.documents && t.documents.length > 0) || t.videoUrl) && (
                      <div className="space-y-3 py-3 border-t border-b border-gray-200">
                        {/* Image Thumbnail */}
                        {t.imageFile && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-700">📷 Image</p>
                            <div className="h-24 w-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center">
                              <img
                                src={t.imageFile.url}
                                alt="Template image"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /%3E%3C/svg%3E';
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 truncate">{t.imageFile.fileName}</p>
                          </div>
                        )}

                        {/* Document Count */}
                        {t.documents && t.documents.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-700">📎 Documents ({t.documents.length})</p>
                            <div className="flex gap-2 flex-wrap">
                              {t.documents.map((doc, idx) => (
                                <div key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded truncate max-w-[150px]" title={doc.fileName}>
                                  {doc.fileName}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Video Indicator */}
                        {t.videoUrl && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-700">🎬 Video attached</p>
                            <a
                              href={t.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline truncate block"
                            >
                              View video →
                            </a>
                          </div>
                        )}
                      </div>
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

      {/* Bulk actions modal (simple) */}
      {bulkActionsOpen && selectedTemplateIds.size > 0 ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="font-bold text-gray-900">Bulk actions</div>
              <button
                type="button"
                onClick={() => setBulkActionsOpen(false)}
                className="text-gray-500 hover:text-gray-800 font-bold text-xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="text-sm text-gray-600">Selected templates: {selectedTemplateIds.size}</div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={bulkDeleteSelected}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                Delete selected
              </button>
              <button
                type="button"
                onClick={() => {
                  clearTemplateSelection();
                  setBulkActionsOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold"
              >
                Clear
              </button>
            </div>

            <div className="text-xs text-gray-500">
              Note: bulk actions are available when you select two or more templates.
            </div>
          </div>
        </div>
      ) : null}
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
