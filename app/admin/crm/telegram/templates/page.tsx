'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  Send, FileEdit, Plus, Trash2, Search, Loader2, AlertTriangle,
  CheckCircle2, Eye, Image as ImageIcon, Video, FileText, ChevronDown,
  ChevronUp, ArrowLeft
} from 'lucide-react';

type Template = {
  _id: string;
  templateName: string;
  templateContent: string;
  headerContent?: string;
  footerText?: string;
  category: string;
  language: string;
  status: string;
  provider: string;
  buttons?: Array<{ title: string }>;
  imageFile?: { url: string; fileName: string };
  documents?: Array<{ url: string; fileName: string }>;
  videoUrl?: string;
  createdAt: string;
  usageCount?: number;
};

export default function TelegramTemplatesPage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFooter, setFormFooter] = useState('');
  const [formButtons, setFormButtons] = useState<string[]>([]);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!token) return;
    try {
      const res = await crmFetch('/api/admin/crm/templates?provider=telegram&limit=100');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {}
    setLoading(false);
  }, [token, crmFetch]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const resetEditor = () => {
    setEditingId(null);
    setFormName('');
    setFormContent('');
    setFormFooter('');
    setFormButtons([]);
    setFormImageUrl('');
    setFormVideoUrl('');
  };

  const openEditor = (tmpl?: Template) => {
    if (tmpl) {
      setEditingId(tmpl._id);
      setFormName(tmpl.templateName);
      setFormContent(tmpl.templateContent || '');
      setFormFooter(tmpl.footerText || '');
      setFormButtons(tmpl.buttons?.map(b => b.title) || []);
      setFormImageUrl(tmpl.imageFile?.url || '');
      setFormVideoUrl(tmpl.videoUrl || '');
    } else {
      resetEditor();
    }
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formContent.trim()) {
      setError('Template name and content are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        templateName: formName.trim(),
        templateContent: formContent.trim(),
        footerText: formFooter.trim(),
        provider: 'telegram',
        category: 'MARKETING',
        language: 'en',
        status: 'approved', // Telegram templates don't need approval
        buttons: formButtons.filter(b => b.trim()).map(b => ({ title: b.trim() })),
      };

      if (formImageUrl.trim()) {
        payload.imageFile = { url: formImageUrl.trim(), fileName: 'image' };
        payload.headerFormat = 'IMAGE';
      }
      if (formVideoUrl.trim()) {
        payload.videoUrl = formVideoUrl.trim();
        payload.headerFormat = 'VIDEO';
      }

      const method = editingId ? 'PUT' : 'POST';
      if (editingId) payload.id = editingId;

      const res = await crmFetch('/api/admin/crm/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save template');
      } else {
        setSuccess(editingId ? 'Template updated' : 'Template created');
        setShowEditor(false);
        resetEditor();
        loadTemplates();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await crmFetch('/api/admin/crm/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        loadTemplates();
        setSuccess('Template deleted');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {}
  };

  const filteredTemplates = templates.filter(t =>
    t.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.templateContent?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin/crm/telegram" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Telegram Templates</h1>
              <p className="text-xs text-gray-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Alerts */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">×</button>
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 flex items-center gap-2 text-green-300 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {/* Editor */}
        {showEditor && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? 'Edit Template' : 'New Telegram Template'}
            </h3>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Template Name *</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g., welcome_message"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Message Content *</label>
              <textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                rows={4}
                placeholder="Hello {{name}}! Welcome to our channel..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Supports HTML: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;code&gt;code&lt;/code&gt;
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image URL (optional)</label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={e => setFormImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Video URL (optional)</label>
                <input
                  type="text"
                  value={formVideoUrl}
                  onChange={e => setFormVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Footer (optional)</label>
              <input
                type="text"
                value={formFooter}
                onChange={e => setFormFooter(e.target.value)}
                placeholder="Reply STOP to unsubscribe"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Buttons (optional)</label>
              {formButtons.map((btn, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={btn}
                    onChange={e => {
                      const nb = [...formButtons];
                      nb[i] = e.target.value;
                      setFormButtons(nb);
                    }}
                    placeholder={`Button ${i + 1}`}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setFormButtons(formButtons.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-300 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {formButtons.length < 3 && (
                <button
                  onClick={() => setFormButtons([...formButtons, ''])}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  + Add Button
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => { setShowEditor(false); resetEditor(); }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        {!showEditor && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Template List */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileEdit className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{templates.length === 0 ? 'No templates yet' : 'No matching templates'}</p>
            {templates.length === 0 && (
              <button
                onClick={() => openEditor()}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300"
              >
                Create Your First Template
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map(tmpl => (
              <div
                key={tmpl._id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedTemplate(expandedTemplate === tmpl._id ? null : tmpl._id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                      <FileEdit className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{tmpl.templateName}</h4>
                      <p className="text-xs text-gray-400 truncate">{tmpl.templateContent?.slice(0, 60)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {tmpl.imageFile?.url && <ImageIcon className="w-3 h-3 text-gray-500" />}
                    {tmpl.videoUrl && <Video className="w-3 h-3 text-gray-500" />}
                    {expandedTemplate === tmpl._id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {expandedTemplate === tmpl._id && (
                  <div className="border-t border-gray-800 p-3 space-y-3">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-sm text-gray-200 whitespace-pre-wrap">{tmpl.templateContent}</p>
                      {tmpl.footerText && (
                        <p className="text-xs text-gray-500 mt-2 border-t border-gray-700 pt-2">{tmpl.footerText}</p>
                      )}
                      {tmpl.buttons && tmpl.buttons.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {tmpl.buttons.map((b, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full">{b.title}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); openEditor(tmpl); }}
                        className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(tmpl._id); }}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                      <span className="text-[10px] text-gray-500 ml-auto">
                        Created {new Date(tmpl.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
