'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  FileText, Phone, PhoneIncoming, PhoneOutgoing, Plus, Search,
  Edit3, Trash2, Copy, Check, X, ChevronDown, ChevronRight,
  ChevronLeft, Eye, EyeOff, Tag, Clock, Sparkles, Save,
  RefreshCw, ArrowLeft, Bot, Loader2, ToggleLeft, ToggleRight,
  MessageSquare, Zap, BookOpen, Settings,
} from 'lucide-react';

// ── Color palette ──
const COLORS = {
  indigo:  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)' },
  blue:    { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)' },
  cyan:    { main: '#06B6D4', light: '#22D3EE', bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.2)' },
  violet:  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)' },
  amber:   { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  pink:    { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  orange:  { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  pageBg:  '#F8FAFC',
};

interface CallTemplate {
  _id: string;
  key: string;
  name: string;
  description: string;
  category: 'outbound' | 'inbound' | 'both';
  language: 'hi' | 'en' | 'both';
  promptText: string;
  isActive: boolean;
  isDefault: boolean;
  variables: string[];
  tags: string[];
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_CONFIG = {
  outbound: { label: 'Outbound', icon: PhoneOutgoing, color: COLORS.emerald },
  inbound:  { label: 'Inbound',  icon: PhoneIncoming, color: COLORS.blue },
  both:     { label: 'Both',     icon: Phone,         color: COLORS.violet },
};

const LANG_LABELS: Record<string, string> = { hi: 'Hindi', en: 'English', both: 'Hindi & English' };

export default function CallTemplatesPage() {
  const token = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<CallTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<CallTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '', description: '', category: 'outbound' as string,
    language: 'both' as string, promptText: '', tags: '' as string,
    variables: '' as string,
  });

  // Create form state
  const [createForm, setCreateForm] = useState({
    key: '', name: '', description: '', category: 'outbound',
    language: 'both', promptText: '', tags: '', variables: '',
  });

  // ── Fetch templates ──
  const fetchTemplates = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/calls/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data.templates || []);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchTemplates();
  }, [fetchTemplates, token]);

  // ── Filter templates ──
  const filteredTemplates = templates.filter(t => {
    if (filterCategory && t.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.key.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
    }
    return true;
  });

  const outboundCount = templates.filter(t => t.category === 'outbound' || t.category === 'both').length;
  const inboundCount = templates.filter(t => t.category === 'inbound' || t.category === 'both').length;

  // ── Select template ──
  const selectTemplate = (t: CallTemplate) => {
    setSelectedTemplate(t);
    setEditMode(false);
    setEditForm({
      name: t.name, description: t.description, category: t.category,
      language: t.language, promptText: t.promptText,
      tags: t.tags.join(', '), variables: t.variables.join(', '),
    });
  };

  // ── Save edit ──
  const handleSave = async () => {
    if (!selectedTemplate || !token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTemplate._id,
          name: editForm.name,
          description: editForm.description,
          category: editForm.category,
          language: editForm.language,
          promptText: editForm.promptText,
          tags: editForm.tags.split(',').map(s => s.trim()).filter(Boolean),
          variables: editForm.variables.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTemplates();
        setSelectedTemplate({ ...selectedTemplate, ...data.data.template });
        setEditMode(false);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Create template ──
  const handleCreate = async () => {
    if (!token) return;
    if (!createForm.key || !createForm.name || !createForm.promptText) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crm/calls/templates', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          tags: createForm.tags.split(',').map(s => s.trim()).filter(Boolean),
          variables: createForm.variables.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTemplates();
        setShowCreateModal(false);
        setCreateForm({ key: '', name: '', description: '', category: 'outbound', language: 'both', promptText: '', tags: '', variables: '' });
      }
    } catch (err) {
      console.error('Create failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete template ──
  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/calls/templates', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTemplates();
        if (selectedTemplate?._id === id) setSelectedTemplate(null);
        setDeleteConfirm('');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // ── Toggle active ──
  const toggleActive = async (t: CallTemplate) => {
    if (!token) return;
    try {
      await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t._id, isActive: !t.isActive }),
      });
      await fetchTemplates();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  // ── Copy prompt ──
  const copyPrompt = (t: CallTemplate) => {
    navigator.clipboard.writeText(t.promptText);
    setCopiedId(t._id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  // ── Duplicate template ──
  const duplicateTemplate = async (t: CallTemplate) => {
    if (!token) return;
    const newKey = `${t.key}_copy_${Date.now()}`;
    try {
      const res = await fetch('/api/admin/crm/calls/templates', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey,
          name: `${t.name} (Copy)`,
          description: t.description,
          category: t.category,
          language: t.language,
          promptText: t.promptText,
          tags: t.tags,
          variables: t.variables,
        }),
      });
      if (res.ok) await fetchTemplates();
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  if (!token || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.pageBg }}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="text-gray-500 text-sm">Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: COLORS.pageBg }}>
      {/* ── Top header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin/crm/calls')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.orange.main}, ${COLORS.amber.main})` }}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Call Scripts & Templates</h1>
              <p className="text-xs text-gray-400 mt-0.5">Manage Sakshi&apos;s AI call prompts — Inbound &amp; Outbound</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchTemplates} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 transition" title="Refresh">
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition hover:shadow-xl"
              style={{ background: `linear-gradient(135deg, ${COLORS.indigo.main}, ${COLORS.violet.main})` }}
            >
              <Plus className="h-4 w-4" /> New Template
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="px-6 pb-3 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: COLORS.indigo.main }} />
            <span className="text-gray-500">{templates.length} Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PhoneOutgoing className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-gray-500">{outboundCount} Outbound</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PhoneIncoming className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-gray-500">{inboundCount} Inbound</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-gray-500">{templates.filter(t => t.isActive).length} Active</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 120px)' }}>

        {/* ── Left sidebar: Template list ── */}
        <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
          {/* Search & filter */}
          <div className="px-3 py-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>
            <div className="flex gap-1.5">
              {['', 'outbound', 'inbound', 'both'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterCategory === cat ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  {cat === '' ? 'All' : cat === 'both' ? 'Both' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Template cards */}
          <div className="flex-1 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <FileText className="h-8 w-8 mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No templates found</p>
              </div>
            ) : (
              filteredTemplates.map(t => {
                const catConf = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.both;
                const CatIcon = catConf.icon;
                const isSelected = selectedTemplate?._id === t._id;

                return (
                  <button
                    key={t._id}
                    onClick={() => selectTemplate(t)}
                    className={`w-full px-4 py-3.5 flex items-start gap-3 transition text-left border-b border-gray-50 ${isSelected ? '' : 'hover:bg-gray-50/80'}`}
                    style={{
                      backgroundColor: isSelected ? catConf.color.bg : undefined,
                      borderLeft: isSelected ? `3px solid ${catConf.color.main}` : '3px solid transparent',
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `linear-gradient(135deg, ${catConf.color.main}, ${catConf.color.light})` }}>
                      <CatIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 truncate">{t.name}</span>
                        {!t.isActive && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-400 rounded-md">OFF</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{t.description || t.key}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md" style={{ background: catConf.color.bg, color: catConf.color.main }}>
                          {catConf.label}
                        </span>
                        <span className="text-[10px] text-gray-300">{LANG_LABELS[t.language] || t.language}</span>
                        {t.isDefault && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 rounded-md">Default</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Right side: Template detail / editor ── */}
        <main className="flex-1 overflow-y-auto">
          {!selectedTemplate ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ background: `linear-gradient(135deg, ${COLORS.orange.main}20, ${COLORS.amber.main}20)` }}>
                <Bot className="h-10 w-10 text-orange-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">Sakshi&apos;s Call Scripts</h2>
              <p className="text-sm text-gray-400 max-w-md">
                Select a template from the left to view or edit. Each template defines how Sakshi speaks during AI calls — her greeting, conversation flow, and closing.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg">
                <div className="p-4 rounded-2xl bg-white border border-gray-100 text-center">
                  <PhoneOutgoing className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                  <div className="text-xs font-semibold text-gray-700">Outbound</div>
                  <div className="text-[10px] text-gray-400 mt-1">Sakshi calls leads</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-gray-100 text-center">
                  <PhoneIncoming className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-xs font-semibold text-gray-700">Inbound</div>
                  <div className="text-[10px] text-gray-400 mt-1">Leads call Swar Yoga</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-gray-100 text-center">
                  <Sparkles className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                  <div className="text-xs font-semibold text-gray-700">Custom</div>
                  <div className="text-[10px] text-gray-400 mt-1">Your own scripts</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {/* Template header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const catConf = CATEGORY_CONFIG[selectedTemplate.category] || CATEGORY_CONFIG.both;
                      const CatIcon = catConf.icon;
                      return (
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${catConf.color.main}, ${catConf.color.light})` }}>
                          <CatIcon className="h-7 w-7 text-white" />
                        </div>
                      );
                    })()}
                    <div>
                      {editMode ? (
                        <input
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="text-xl font-bold text-gray-900 border-b-2 border-indigo-300 outline-none pb-1 bg-transparent"
                        />
                      ) : (
                        <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-lg" style={{ background: CATEGORY_CONFIG[selectedTemplate.category]?.color.bg, color: CATEGORY_CONFIG[selectedTemplate.category]?.color.main }}>
                          {CATEGORY_CONFIG[selectedTemplate.category]?.label}
                        </span>
                        <span className="text-xs text-gray-400">{LANG_LABELS[selectedTemplate.language]}</span>
                        <span className="text-xs text-gray-300">Key: {selectedTemplate.key}</span>
                        {selectedTemplate.isDefault && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600 rounded-lg">Built-in</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition shadow-lg shadow-emerald-500/25"
                          style={{ background: `linear-gradient(135deg, ${COLORS.emerald.main}, #059669)` }}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save
                        </button>
                        <button
                          onClick={() => { setEditMode(false); selectTemplate(selectedTemplate); }}
                          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditMode(true)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition shadow-lg shadow-indigo-500/25"
                          style={{ background: `linear-gradient(135deg, ${COLORS.indigo.main}, ${COLORS.violet.main})` }}
                        >
                          <Edit3 className="h-4 w-4" /> Edit
                        </button>
                        <button onClick={() => copyPrompt(selectedTemplate)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition" title="Copy prompt">
                          {copiedId === selectedTemplate._id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <button onClick={() => duplicateTemplate(selectedTemplate)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition" title="Duplicate">
                          <Plus className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleActive(selectedTemplate)} className="p-2 rounded-xl hover:bg-gray-100 transition" title={selectedTemplate.isActive ? 'Deactivate' : 'Activate'}>
                          {selectedTemplate.isActive ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-gray-300" />}
                        </button>
                        {deleteConfirm === selectedTemplate._id ? (
                          <div className="flex items-center gap-1 ml-2">
                            <button onClick={() => handleDelete(selectedTemplate._id)} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium">Confirm</button>
                            <button onClick={() => setDeleteConfirm('')} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(selectedTemplate._id)} className="p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-400 transition" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Description */}
                {editMode ? (
                  <div className="mt-4">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                    <input
                      value={editForm.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                      placeholder="Brief description of this template..."
                    />
                  </div>
                ) : (
                  selectedTemplate.description && (
                    <p className="mt-3 text-sm text-gray-500">{selectedTemplate.description}</p>
                  )
                )}

                {/* Meta info row */}
                {editMode ? (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
                      <select
                        value={editForm.category}
                        onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                      >
                        <option value="outbound">Outbound</option>
                        <option value="inbound">Inbound</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Language</label>
                      <select
                        value={editForm.language}
                        onChange={e => setEditForm({ ...editForm, language: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                      >
                        <option value="both">Hindi & English</option>
                        <option value="hi">Hindi</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Variables (comma-separated)</label>
                      <input
                        value={editForm.variables}
                        onChange={e => setEditForm({ ...editForm, variables: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                        placeholder="leadName, lang, workshopName"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Tags (comma-separated)</label>
                      <input
                        value={editForm.tags}
                        onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                        placeholder="follow-up, reminder"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-4 flex-wrap">
                    {selectedTemplate.variables.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Settings className="h-3.5 w-3.5 text-gray-300" />
                        <span className="text-xs text-gray-400">Variables:</span>
                        {selectedTemplate.variables.map(v => (
                          <span key={v} className="px-2 py-0.5 text-[10px] font-mono font-medium bg-indigo-50 text-indigo-600 rounded-md">{`{{${v}}}`}</span>
                        ))}
                      </div>
                    )}
                    {selectedTemplate.tags.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-gray-300" />
                        {selectedTemplate.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded-md">{tag}</span>
                        ))}
                      </div>
                    )}
                    {selectedTemplate.usageCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-300">
                        <Zap className="h-3.5 w-3.5" />
                        Used {selectedTemplate.usageCount} times
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Clock className="h-3.5 w-3.5" />
                      Updated {new Date(selectedTemplate.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Prompt text ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-700">Prompt Script</span>
                  </div>
                  {!editMode && (
                    <button onClick={() => copyPrompt(selectedTemplate)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                      {copiedId === selectedTemplate._id ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                    </button>
                  )}
                </div>
                <div className="p-6">
                  {editMode ? (
                    <textarea
                      value={editForm.promptText}
                      onChange={e => setEditForm({ ...editForm, promptText: e.target.value })}
                      rows={24}
                      className="w-full px-4 py-3 text-sm font-mono leading-relaxed rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-y"
                      placeholder="Enter Sakshi's prompt script here..."
                    />
                  ) : (
                    <pre className="text-sm font-mono leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
                      {selectedTemplate.promptText}
                    </pre>
                  )}
                </div>
              </div>

              {/* ── Variable guide ── */}
              {!editMode && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">Variable Reference</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-gray-50">
                      <span className="font-mono font-medium text-indigo-600">{`{{leadName}}`}</span>
                      <span className="text-gray-400 ml-2">Lead&apos;s display name or &quot;ji&quot;</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50">
                      <span className="font-mono font-medium text-indigo-600">{`{{lang}}`}</span>
                      <span className="text-gray-400 ml-2">Hindi or English</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50">
                      <span className="font-mono font-medium text-indigo-600">{`{{workshopName}}`}</span>
                      <span className="text-gray-400 ml-2">Name of the workshop</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50">
                      <span className="font-mono font-medium text-indigo-600">{`{{customPrompt}}`}</span>
                      <span className="text-gray-400 ml-2">Custom instructions (answers, etc.)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.indigo.main}, ${COLORS.violet.main})` }}>
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">New Call Template</h3>
                  <p className="text-xs text-gray-400">Create a new prompt script for Sakshi</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Template Key *</label>
                  <input
                    value={createForm.key}
                    onChange={e => setCreateForm({ ...createForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                    placeholder="e.g. renewal_reminder"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Display Name *</label>
                  <input
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                    placeholder="e.g. Renewal Reminder"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <input
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                  placeholder="Brief description of when to use this template"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                  <select
                    value={createForm.category}
                    onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Language</label>
                  <select
                    value={createForm.language}
                    onChange={e => setCreateForm({ ...createForm, language: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                  >
                    <option value="both">Hindi & English</option>
                    <option value="hi">Hindi</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Variables (comma-separated)</label>
                  <input
                    value={createForm.variables}
                    onChange={e => setCreateForm({ ...createForm, variables: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                    placeholder="leadName, lang, workshopName"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tags (comma-separated)</label>
                  <input
                    value={createForm.tags}
                    onChange={e => setCreateForm({ ...createForm, tags: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                    placeholder="reminder, renewal"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Prompt Script *</label>
                <textarea
                  value={createForm.promptText}
                  onChange={e => setCreateForm({ ...createForm, promptText: e.target.value })}
                  rows={14}
                  className="w-full px-4 py-3 text-sm font-mono leading-relaxed rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-y"
                  placeholder={`You are Sakshi, the official AI assistant of Swar Yoga...\n\nWrite the full prompt script here. Use {{leadName}}, {{lang}}, {{workshopName}} as variables.`}
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.key || !createForm.name || !createForm.promptText}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition hover:shadow-xl disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${COLORS.indigo.main}, ${COLORS.violet.main})` }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
