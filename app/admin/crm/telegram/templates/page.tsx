'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  Send, FileEdit, Plus, Trash2, Search, Loader2, AlertTriangle,
  CheckCircle2, Image as ImageIcon, Video, ChevronDown,
  ChevronUp, ArrowLeft, Bold, Italic, Underline, Strikethrough,
  Code, Link2, SmilePlus, Type, FileUp, X
} from 'lucide-react';

/* ─── Types ─── */
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

/* ─── Emoji palette ─── */
const EMOJI_GROUPS: Record<string, string[]> = {
  'Smileys': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😋','😛','🤔','🤗','🤫','🤭','😐','😑','😶','🙄','😏','😬','😌','😔','😷','🤒','🤕','🥺','😢','😭','😤','😡','🥱','😴'],
  'Gestures': ['👍','👎','👏','🙏','🤝','✌️','🤞','🤟','🤘','👌','🤙','💪','👋','🖐️','✋','👆','👇','👈','👉','☝️'],
  'Hearts': ['❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝'],
  'Objects': ['🎯','🔥','⭐','✨','💡','📌','📎','📝','📅','📢','📣','🔔','🎉','🎊','🏆','🥇','💰','💎','📱','💻','📧','✅','❌','⚠️','🚀','💐','🌸','🌺','🍀','🌈'],
  'Symbols': ['➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','🔄','✳️','❇️','🔴','🟢','🔵','🟡','⚪','⚫','🟠','🟣','🔶','🔷','▶️','◀️','🔸','🔹','💠','©️','®️','™️'],
};

/* ─── Sanitize HTML for preview (allow only Telegram-safe tags) ─── */
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'code', 'pre', 'a'];

function sanitizeTelegramHtml(raw: string): string {
  // Escape everything first, then unescape allowed tags
  let html = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Restore allowed opening/closing tags
  for (const tag of ALLOWED_TAGS) {
    // opening tag (with optional href for <a>)
    html = html.replace(
      new RegExp(`&lt;(${tag})(\\s[^&]*?)?&gt;`, 'gi'),
      (_, t, attrs) => `<${t.toLowerCase()}${attrs ? attrs.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : ''}>`,
    );
    // closing tag
    html = html.replace(new RegExp(`&lt;/${tag}&gt;`, 'gi'), `</${tag.toLowerCase()}>`);
  }

  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br/>');
  return html;
}

/* ─── Telegram Preview Component ─── */
function TelegramPreview({
  headerContent, content, footerText, imageUrl, videoUrl, documents, buttons,
}: {
  headerContent: string; content: string; footerText: string;
  imageUrl: string; videoUrl: string;
  documents: Array<{ url: string; fileName: string }>;
  buttons: string[];
}) {
  const bodyHtml = useMemo(() => sanitizeTelegramHtml(content), [content]);

  return (
    <div className="bg-[#0e1621] rounded-2xl p-4 min-h-[300px] flex flex-col">
      {/* Chat header bar */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-700/50 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">S</div>
        <div>
          <p className="text-sm font-medium text-white">Swar Yoga Bot</p>
          <p className="text-[10px] text-gray-400">bot</p>
        </div>
      </div>

      {/* Message bubble */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="max-w-[90%] self-start">
          {/* Image */}
          {imageUrl && (
            <div className="rounded-t-xl overflow-hidden mb-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="preview" className="w-full max-h-48 object-cover bg-gray-800" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}

          {/* Video */}
          {videoUrl && !imageUrl && (
            <div className="rounded-t-xl overflow-hidden mb-0 bg-gray-800 flex items-center justify-center h-32">
              <div className="text-center">
                <Video className="w-8 h-8 text-blue-400 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{videoUrl}</p>
              </div>
            </div>
          )}

          <div className={`bg-[#182533] ${imageUrl || (videoUrl && !imageUrl) ? 'rounded-b-xl' : 'rounded-xl'} p-3 shadow`}>
            {/* Header */}
            {headerContent && (
              <p className="text-sm font-bold text-white mb-1">{headerContent}</p>
            )}

            {/* Body */}
            {content ? (
              <div
                className="text-sm text-gray-100 whitespace-pre-wrap break-words [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through [&_strike]:line-through [&_del]:line-through [&_code]:bg-gray-700/50 [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_pre]:bg-gray-700/50 [&_pre]:p-2 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-xs [&_a]:text-blue-400 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : (
              <p className="text-sm text-gray-500 italic">Start typing your message...</p>
            )}

            {/* Documents */}
            {documents.filter(d => d.url).length > 0 && (
              <div className="mt-2 space-y-1">
                {documents.filter(d => d.url).map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-700/30 rounded-lg p-2">
                    <FileUp className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs text-gray-300 truncate">{doc.fileName || doc.url}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            {footerText && (
              <p className="text-[11px] text-gray-500 mt-2">{footerText}</p>
            )}

            {/* Timestamp */}
            <p className="text-[10px] text-gray-500 text-right mt-1">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Inline buttons */}
          {buttons.filter(b => b.trim()).length > 0 && (
            <div className="mt-1 space-y-1">
              {buttons.filter(b => b.trim()).map((btn, i) => (
                <button key={i} className="w-full py-2 bg-[#182533] hover:bg-[#1e3044] text-blue-400 text-sm rounded-lg border border-gray-700/30 transition-colors">
                  {btn}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function TelegramTemplatesPage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formHeaderContent, setFormHeaderContent] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFooter, setFormFooter] = useState('');
  const [formButtons, setFormButtons] = useState<string[]>([]);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formDocuments, setFormDocuments] = useState<Array<{ url: string; fileName: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTab, setEmojiTab] = useState<string>(Object.keys(EMOJI_GROUPS)[0]);
  const emojiRef = useRef<HTMLDivElement>(null);

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

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resetEditor = () => {
    setEditingId(null);
    setFormName('');
    setFormHeaderContent('');
    setFormContent('');
    setFormFooter('');
    setFormButtons([]);
    setFormImageUrl('');
    setFormVideoUrl('');
    setFormDocuments([]);
    setShowEmojiPicker(false);
  };

  const openEditor = (tmpl?: Template) => {
    if (tmpl) {
      setEditingId(tmpl._id);
      setFormName(tmpl.templateName);
      setFormHeaderContent(tmpl.headerContent || '');
      setFormContent(tmpl.templateContent || '');
      setFormFooter(tmpl.footerText || '');
      setFormButtons(tmpl.buttons?.map(b => b.title) || []);
      setFormImageUrl(tmpl.imageFile?.url || '');
      setFormVideoUrl(tmpl.videoUrl || '');
      setFormDocuments(tmpl.documents || []);
    } else {
      resetEditor();
    }
    setShowEditor(true);
  };

  /* ─── Formatting helpers (wrap selected text in textarea) ─── */
  const wrapSelection = (openTag: string, closeTag: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = formContent;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    const wrapped = `${openTag}${selected}${closeTag}`;
    setFormContent(before + wrapped + after);
    // Restore focus & cursor
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setFormContent(prev => prev + text);
      return;
    }
    const start = ta.selectionStart;
    const before = formContent.substring(0, start);
    const after = formContent.substring(start);
    setFormContent(before + text + after);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formContent.trim()) {
      setError('Template name and content are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        templateName: formName.trim(),
        templateContent: formContent.trim(),
        headerContent: formHeaderContent.trim(),
        footerText: formFooter.trim(),
        provider: 'telegram',
        category: 'MARKETING',
        language: 'en',
        status: 'approved',
        buttons: formButtons.filter(b => b.trim()).map(b => ({ title: b.trim() })),
      };

      // Determine header format
      if (formImageUrl.trim()) {
        payload.imageFile = { url: formImageUrl.trim(), fileName: 'image' };
        payload.headerFormat = 'IMAGE';
      } else if (formVideoUrl.trim()) {
        payload.videoUrl = formVideoUrl.trim();
        payload.headerFormat = 'VIDEO';
      } else if (formHeaderContent.trim()) {
        payload.headerFormat = 'TEXT';
      } else {
        payload.headerFormat = 'NONE';
      }

      if (formVideoUrl.trim()) payload.videoUrl = formVideoUrl.trim();

      // Documents
      const validDocs = formDocuments.filter(d => d.url.trim());
      if (validDocs.length) {
        payload.documents = validDocs.map(d => ({
          url: d.url.trim(),
          fileName: d.fileName.trim() || d.url.trim().split('/').pop() || 'document',
        }));
        if (!formImageUrl.trim() && !formVideoUrl.trim()) payload.headerFormat = 'DOCUMENT';
      }

      const method = editingId ? 'PUT' : 'POST';
      if (editingId) payload.id = editingId;

      const res = await crmFetch('/api/admin/crm/templates', {
        method,
        body: payload,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await crmFetch('/api/admin/crm/templates', {
        method: 'DELETE',
        body: { id },
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

  /* ─── Formatting toolbar button ─── */
  const FmtBtn = ({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
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

      <div className="max-w-7xl mx-auto p-4 space-y-4">
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

        {/* ══════════════ EDITOR (side-by-side: form + preview) ══════════════ */}
        {showEditor && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ── Left: Form ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                {editingId ? 'Edit Template' : 'New Telegram Template'}
              </h3>

              {/* Template Name */}
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

              {/* Header Content */}
              <div>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <Type className="w-3 h-3" /> Header Text (optional)
                </label>
                <input
                  type="text"
                  value={formHeaderContent}
                  onChange={e => setFormHeaderContent(e.target.value)}
                  placeholder="e.g., Welcome to Swar Yoga!"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Message Content with Toolbar */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Message Content *</label>

                {/* Formatting Toolbar */}
                <div className="flex items-center gap-0.5 bg-gray-800 border border-gray-700 border-b-0 rounded-t-lg px-2 py-1.5 flex-wrap">
                  <FmtBtn icon={Bold} title="Bold" onClick={() => wrapSelection('<b>', '</b>')} />
                  <FmtBtn icon={Italic} title="Italic" onClick={() => wrapSelection('<i>', '</i>')} />
                  <FmtBtn icon={Underline} title="Underline" onClick={() => wrapSelection('<u>', '</u>')} />
                  <FmtBtn icon={Strikethrough} title="Strikethrough" onClick={() => wrapSelection('<s>', '</s>')} />
                  <FmtBtn icon={Code} title="Code" onClick={() => wrapSelection('<code>', '</code>')} />
                  <FmtBtn icon={Link2} title="Link" onClick={() => {
                    const url = prompt('Enter URL:');
                    if (url) wrapSelection(`<a href="${url}">`, '</a>');
                  }} />
                  <div className="w-px h-5 bg-gray-700 mx-1" />

                  {/* Emoji Picker */}
                  <div className="relative" ref={emojiRef}>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      title="Emoji"
                      className={`p-1.5 rounded transition-colors ${showEmojiPicker ? 'bg-gray-700 text-white' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`}
                    >
                      <SmilePlus className="w-4 h-4" />
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-80 max-h-72 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex gap-1 px-2 pt-2 pb-1 border-b border-gray-700 flex-wrap">
                          {Object.keys(EMOJI_GROUPS).map(g => (
                            <button
                              key={g}
                              onClick={() => setEmojiTab(g)}
                              className={`px-2 py-1 text-[10px] rounded-md transition-colors ${emojiTab === g ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                        {/* Grid */}
                        <div className="p-2 grid grid-cols-10 gap-0.5 max-h-52 overflow-y-auto">
                          {EMOJI_GROUPS[emojiTab]?.map((emoji, i) => (
                            <button
                              key={i}
                              onClick={() => { insertAtCursor(emoji); setShowEmojiPicker(false); }}
                              className="p-1 text-lg hover:bg-gray-700 rounded transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick symbols */}
                  <div className="w-px h-5 bg-gray-700 mx-1" />
                  {['•', '→', '✓', '★', '△', '◆', '|', '—'].map(sym => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => insertAtCursor(sym)}
                      title={`Insert ${sym}`}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-sm font-mono"
                    >
                      {sym}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={6}
                  placeholder="Hello {{name}}! Welcome to our channel..."
                  className="w-full bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                />
              </div>

              {/* Media: Image & Video URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <ImageIcon className="w-3 h-3" /> Image URL
                  </label>
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={e => setFormImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Video className="w-3 h-3" /> Video URL
                  </label>
                  <input
                    type="text"
                    value={formVideoUrl}
                    onChange={e => setFormVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Documents */}
              <div>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <FileUp className="w-3 h-3" /> Documents (URL)
                </label>
                {formDocuments.map((doc, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={doc.url}
                      onChange={e => {
                        const nd = [...formDocuments];
                        nd[i] = { ...nd[i], url: e.target.value };
                        setFormDocuments(nd);
                      }}
                      placeholder="https://example.com/file.pdf"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={doc.fileName}
                      onChange={e => {
                        const nd = [...formDocuments];
                        nd[i] = { ...nd[i], fileName: e.target.value };
                        setFormDocuments(nd);
                      }}
                      placeholder="filename.pdf"
                      className="w-36 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button onClick={() => setFormDocuments(formDocuments.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 p-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {formDocuments.length < 5 && (
                  <button
                    onClick={() => setFormDocuments([...formDocuments, { url: '', fileName: '' }])}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    + Add Document
                  </button>
                )}
              </div>

              {/* Footer */}
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
                    <button onClick={() => setFormButtons(formButtons.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 p-2">
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

              {/* Actions */}
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

            {/* ── Right: Live Preview ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <h3 className="text-sm font-semibold text-gray-300">Live Preview</h3>
              </div>
              <TelegramPreview
                headerContent={formHeaderContent}
                content={formContent}
                footerText={formFooter}
                imageUrl={formImageUrl}
                videoUrl={formVideoUrl}
                documents={formDocuments}
                buttons={formButtons}
              />
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

        {/* ══════════════ TEMPLATE LIST ══════════════ */}
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
                    {(tmpl.documents?.length ?? 0) > 0 && <FileUp className="w-3 h-3 text-gray-500" />}
                    {expandedTemplate === tmpl._id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {expandedTemplate === tmpl._id && (
                  <div className="border-t border-gray-800 p-3 space-y-3">
                    {/* Render saved template using the same preview component */}
                    <TelegramPreview
                      headerContent={tmpl.headerContent || ''}
                      content={tmpl.templateContent || ''}
                      footerText={tmpl.footerText || ''}
                      imageUrl={tmpl.imageFile?.url || ''}
                      videoUrl={tmpl.videoUrl || ''}
                      documents={tmpl.documents || []}
                      buttons={tmpl.buttons?.map(b => b.title) || []}
                    />
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
