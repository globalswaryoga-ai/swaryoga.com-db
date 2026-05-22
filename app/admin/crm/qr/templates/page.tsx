'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { Search, Plus, Pencil, Trash2, X, Eye, Copy, Bold, Italic, Strikethrough, Smile, ChevronLeft, Loader2, FileText, Image as ImageIcon, Video, Phone, ExternalLink, Tag, Upload, File, Play } from 'lucide-react';

// ── WhatsApp Template Limits ──
const LIMITS = {
  HEADER_TEXT: 60,
  BODY_TEXT: 1024,
  FOOTER_TEXT: 60,
  BUTTON_TEXT: 25,
  TEMPLATE_NAME: 512,
  MAX_BUTTONS: 3,
};

// Character counter
function CharCount({ current, max }: { current: number; max: number }) {
  const pct = (current / max) * 100;
  return (
    <span className={`text-[11px] ${pct >= 100 ? 'text-red-600 font-bold' : pct >= 80 ? 'text-amber-600' : 'text-gray-400'}`}>
      {current}/{max}
    </span>
  );
}

type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
type TemplateButton = { type: ButtonType; title: string; url?: string; phoneNumber?: string };

type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

type Template = {
  _id: string;
  templateName: string;
  templateContent: string;
  category?: string;
  language?: string;
  status?: string;
  provider?: string;
  createdAt?: string;
  headerFormat?: string;
  headerContent?: string;
  footerText?: string;
  buttons?: TemplateButton[];
  imageFile?: { url: string; fileName: string; mimeType: string; sizeBytes: number };
  videoUrl?: string;
  documents?: Array<{ url: string; fileName: string; mimeType: string; sizeBytes: number }>;
};

function formatWA(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~(.+?)~/g, '<del>$1</del>');
}

function insertAround(el: HTMLTextAreaElement | null, value: string, l: string, r: string) {
  if (!el) return value;
  const s = el.selectionStart ?? 0;
  const e = el.selectionEnd ?? 0;
  return `${value.slice(0, s)}${l}${value.slice(s, e)}${r}${value.slice(e)}`;
}

const EMOJIS = ['😊', '🙏', '✅', '📌', '🔥', '🎉', '📞', '📍', '💰', '🎯', '⭐', '💪'];

export default function QRTemplatesPage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');

  // Create / Edit state
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState('MARKETING');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);

  // Media state
  const [headerType, setHeaderType] = useState<HeaderType>('NONE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Fetch templates (QR provider only) ──
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmFetch('/api/admin/crm/templates', { params: { provider: 'qr', limit: 200 } });
      const list = res?.data?.templates ?? res?.templates ?? [];
      setTemplates(list);
    } catch (e: any) {
      setError(e.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [crmFetch]);

  useEffect(() => { if (token) fetchTemplates(); }, [token]);

  // Filter
  const filtered = useMemo(() => templates.filter(t => {
    if (searchQuery && !t.templateName.toLowerCase().includes(searchQuery.toLowerCase()) && !t.templateContent.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterLanguage && t.language !== filterLanguage) return false;
    return true;
  }), [templates, searchQuery, filterCategory, filterLanguage]);

  // ── Create / Save ──
  const resetForm = () => {
    setTemplateName(''); setLanguage('en'); setCategory('MARKETING');
    setHeaderText(''); setBodyText(''); setFooterText('');
    setButtons([]); setEditingId(null);
    setHeaderType('NONE'); setMediaUrl(''); setMediaFileName('');
  };

  const openCreate = () => { resetForm(); setMode('create'); };

  const openEdit = (t: Template) => {
    setEditingId(t._id);
    setTemplateName(t.templateName);
    setLanguage(t.language || 'en');
    setCategory(t.category || 'MARKETING');
    setBodyText(t.templateContent || '');
    setFooterText(t.footerText || '');
    setButtons(t.buttons?.length ? t.buttons : []);
    // Determine header type from existing template
    const fmt = (t.headerFormat || '').toUpperCase();
    if (fmt === 'IMAGE' && (t.imageFile?.url || (t.headerContent && t.headerContent.startsWith('http')))) {
      setHeaderType('IMAGE'); setMediaUrl(t.imageFile?.url || t.headerContent || ''); setMediaFileName(t.imageFile?.fileName || 'image'); setHeaderText('');
    } else if (fmt === 'VIDEO' && (t.videoUrl || (t.headerContent && t.headerContent.startsWith('http')))) {
      setHeaderType('VIDEO'); setMediaUrl(t.videoUrl || t.headerContent || ''); setMediaFileName('video'); setHeaderText('');
    } else if (fmt === 'DOCUMENT' && t.documents?.length) {
      setHeaderType('DOCUMENT'); setMediaUrl(t.documents[0].url || ''); setMediaFileName(t.documents[0].fileName || 'document'); setHeaderText('');
    } else if (t.headerContent && !t.headerContent.startsWith('http')) {
      setHeaderType('TEXT'); setHeaderText(t.headerContent); setMediaUrl(''); setMediaFileName('');
    } else {
      setHeaderType('NONE'); setHeaderText(''); setMediaUrl(''); setMediaFileName('');
    }
    setMode('edit');
  };

  const handleSave = async () => {
    if (!templateName.trim()) { setError('Template name is required'); return; }
    if (!bodyText.trim()) { setError('Message body is required'); return; }
    if (bodyText.length > LIMITS.BODY_TEXT) { setError(`Body text exceeds ${LIMITS.BODY_TEXT} characters`); return; }
    if (headerText.length > LIMITS.HEADER_TEXT) { setError(`Header text exceeds ${LIMITS.HEADER_TEXT} characters`); return; }
    if (footerText.length > LIMITS.FOOTER_TEXT) { setError(`Footer text exceeds ${LIMITS.FOOTER_TEXT} characters`); return; }

    setSaving(true);
    setError(null);
    try {
      const body: any = {
        templateName: templateName.trim(),
        category,
        language,
        templateContent: bodyText.trim(),
        provider: 'qr',
        status: 'approved',
        footerText: footerText.trim() || undefined,
        buttons: buttons.filter(b => b.title.trim()).map(b => ({
          type: b.type,
          title: b.title.trim(),
          ...(b.type === 'URL' && b.url ? { url: b.url } : {}),
          ...(b.type === 'PHONE_NUMBER' && b.phoneNumber ? { phoneNumber: b.phoneNumber } : {}),
        })),
      };

      // Set header based on type
      if (headerType === 'TEXT' && headerText.trim()) {
        body.headerFormat = 'TEXT';
        body.headerContent = headerText.trim();
      } else if (headerType === 'IMAGE' && mediaUrl) {
        body.headerFormat = 'IMAGE';
        body.headerContent = mediaUrl;
        body.imageFile = { url: mediaUrl, fileName: mediaFileName, mimeType: 'image/jpeg', sizeBytes: 0 };
      } else if (headerType === 'VIDEO' && mediaUrl) {
        body.headerFormat = 'VIDEO';
        body.headerContent = mediaUrl;
        body.videoUrl = mediaUrl;
      } else if (headerType === 'DOCUMENT' && mediaUrl) {
        body.headerFormat = 'DOCUMENT';
        body.headerContent = mediaUrl;
        body.documents = [{ url: mediaUrl, fileName: mediaFileName, mimeType: 'application/pdf', sizeBytes: 0 }];
      }

      if (mode === 'edit' && editingId) {
        await crmFetch(`/api/admin/crm/templates/${editingId}`, { method: 'PUT', body });
        setSuccess('Template updated!');
      } else {
        await crmFetch('/api/admin/crm/templates', { method: 'POST', body });
        setSuccess('Template created!');
      }
      setTimeout(() => setSuccess(null), 3000);
      resetForm();
      setMode('list');
      await fetchTemplates();
    } catch (e: any) {
      setError(e.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await crmFetch(`/api/admin/crm/templates/${id}`, { method: 'DELETE' });
      await fetchTemplates();
      setSuccess('Template deleted'); setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) { setError(e.message || 'Failed to delete'); }
  };

  const duplicateTemplate = (t: Template) => {
    resetForm();
    setTemplateName(t.templateName + '_copy');
    setLanguage(t.language || 'en');
    setCategory(t.category || 'MARKETING');
    setHeaderText(t.headerContent && !t.headerContent.startsWith('http') ? t.headerContent : '');
    setBodyText(t.templateContent || '');
    setFooterText(t.footerText || '');
    setButtons(t.buttons?.length ? [...t.buttons] : []);
    // Copy media
    const fmt = (t.headerFormat || '').toUpperCase();
    if (fmt === 'IMAGE') { setHeaderType('IMAGE'); setMediaUrl(t.imageFile?.url || t.headerContent || ''); setMediaFileName(t.imageFile?.fileName || 'image'); setHeaderText(''); }
    else if (fmt === 'VIDEO') { setHeaderType('VIDEO'); setMediaUrl(t.videoUrl || t.headerContent || ''); setMediaFileName('video'); setHeaderText(''); }
    else if (fmt === 'DOCUMENT' && t.documents?.length) { setHeaderType('DOCUMENT'); setMediaUrl(t.documents[0].url); setMediaFileName(t.documents[0].fileName || 'document'); setHeaderText(''); }
    else if (t.headerContent && !t.headerContent.startsWith('http')) { setHeaderType('TEXT'); setHeaderText(t.headerContent); setMediaUrl(''); }
    else { setHeaderType('NONE'); setHeaderText(''); setMediaUrl(''); }
    setMode('create');
  };

  // ── Media upload handler ──
  const handleMediaUpload = async (file: globalThis.File) => {
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) { setError('File too large. Max 25MB.'); return; }

    setUploading(true);
    setUploadProgress(10);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      setUploadProgress(30);

      const res = await fetch('/api/admin/crm/whatsapp/media-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setUploadProgress(80);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setMediaUrl(data.url);
      setMediaFileName(file.name);
      setUploadProgress(100);
      setSuccess('Media uploaded!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to upload media');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const getAcceptTypes = () => {
    if (headerType === 'IMAGE') return 'image/jpeg,image/png,image/webp,image/gif';
    if (headerType === 'VIDEO') return 'video/mp4,video/quicktime,video/webm';
    if (headerType === 'DOCUMENT') return 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return '';
  };

  const applyFormat = (l: string, r: string) => {
    setBodyText(prev => insertAround(bodyRef.current, prev, l, r));
    requestAnimationFrame(() => bodyRef.current?.focus());
  };

  const addEmoji = (em: string) => {
    setBodyText(prev => {
      const el = bodyRef.current;
      if (!el) return prev + em;
      const s = el.selectionStart ?? prev.length;
      return `${prev.slice(0, s)}${em}${prev.slice(s)}`;
    });
    requestAnimationFrame(() => bodyRef.current?.focus());
  };

  // ── Builder + Preview UI ──
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setMode('list'); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{mode === 'edit' ? 'Edit Template' : 'Create Template'}</h1>
                <p className="text-xs text-gray-500">QR WhatsApp · Auto-approved · No Meta review needed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setMode('list'); resetForm(); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition">
                {saving ? 'Saving…' : mode === 'edit' ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="max-w-6xl mx-auto px-6 pt-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3 flex justify-between">{error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button></div>}
          {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 mb-3">{success}</div>}
        </div>

        {/* Builder + Preview */}
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
              {/* Name + Meta */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                    placeholder="welcome_message"
                    className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    maxLength={LIMITS.TEMPLATE_NAME}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">lowercase, numbers, underscore only</span>
                    <CharCount current={templateName.length} max={LIMITS.TEMPLATE_NAME} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="OTP">OTP</option>
                  </select>
                </div>
              </div>

              {/* Header Type Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Header (optional)</label>
                <div className="flex items-center gap-2 mb-3">
                  {(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'] as HeaderType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setHeaderType(type); if (type !== headerType) { setMediaUrl(''); setMediaFileName(''); setHeaderText(''); } }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${headerType === type ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {type === 'NONE' && <X className="w-3 h-3" />}
                      {type === 'TEXT' && <FileText className="w-3 h-3" />}
                      {type === 'IMAGE' && <ImageIcon className="w-3 h-3" />}
                      {type === 'VIDEO' && <Video className="w-3 h-3" />}
                      {type === 'DOCUMENT' && <File className="w-3 h-3" />}
                      {type === 'NONE' ? 'None' : type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                {/* Text Header */}
                {headerType === 'TEXT' && (
                  <div>
                    <input
                      type="text"
                      value={headerText}
                      onChange={e => setHeaderText(e.target.value)}
                      placeholder="Header text"
                      className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      maxLength={LIMITS.HEADER_TEXT + 10}
                    />
                    <div className="flex justify-end mt-0.5"><CharCount current={headerText.length} max={LIMITS.HEADER_TEXT} /></div>
                  </div>
                )}

                {/* Media Upload (Image / Video / Document) */}
                {(headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') && (
                  <div className="space-y-3">
                    {/* Upload area */}
                    {!mediaUrl ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition"
                      >
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-600">
                          Click to upload {headerType === 'IMAGE' ? 'an image' : headerType === 'VIDEO' ? 'a video' : 'a document'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {headerType === 'IMAGE' ? 'JPG, PNG, WebP, GIF · Max 25MB' : headerType === 'VIDEO' ? 'MP4, MOV, WebM · Max 25MB' : 'PDF, DOC, DOCX · Max 25MB'}
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={getAcceptTypes()}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ''; }}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        {/* Preview */}
                        {headerType === 'IMAGE' && (
                          <div className="bg-gray-100 flex items-center justify-center p-2">
                            <img src={mediaUrl} alt="Header" className="max-h-40 rounded-lg object-contain" />
                          </div>
                        )}
                        {headerType === 'VIDEO' && (
                          <div className="bg-black flex items-center justify-center">
                            <video src={mediaUrl} controls className="max-h-40 w-full" />
                          </div>
                        )}
                        {headerType === 'DOCUMENT' && (
                          <div className="bg-gray-50 p-4 flex items-center gap-3">
                            <File className="w-8 h-8 text-red-500" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{mediaFileName}</p>
                              <p className="text-[10px] text-gray-400">Document attached</p>
                            </div>
                          </div>
                        )}
                        {/* File info + remove */}
                        <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between">
                          <span className="text-xs text-gray-600 truncate flex-1">{mediaFileName}</span>
                          <button
                            type="button"
                            onClick={() => { setMediaUrl(''); setMediaFileName(''); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium ml-2 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Upload progress */}
                    {uploading && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                          <span className="text-xs text-gray-600">Uploading…</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Or paste URL */}
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Or paste a URL directly</label>
                      <input
                        type="url"
                        value={mediaUrl}
                        onChange={e => { setMediaUrl(e.target.value); setMediaFileName(e.target.value.split('/').pop() || 'media'); }}
                        placeholder={headerType === 'IMAGE' ? 'https://example.com/image.jpg' : headerType === 'VIDEO' ? 'https://example.com/video.mp4' : 'https://example.com/doc.pdf'}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-800">Message Body *</label>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => applyFormat('*', '*')} className="w-7 h-7 rounded border hover:bg-gray-50 flex items-center justify-center" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => applyFormat('_', '_')} className="w-7 h-7 rounded border hover:bg-gray-50 flex items-center justify-center" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => applyFormat('~', '~')} className="w-7 h-7 rounded border hover:bg-gray-50 flex items-center justify-center" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
                    <div className="w-px h-5 bg-gray-200 mx-1" />
                    {EMOJIS.slice(0, 8).map(em => (
                      <button key={em} type="button" onClick={() => addEmoji(em)} className="w-7 h-7 rounded border hover:bg-gray-50 flex items-center justify-center text-sm">{em}</button>
                    ))}
                  </div>
                </div>
                <textarea
                  ref={bodyRef}
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                  placeholder="Type your message here…"
                  rows={8}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
                  spellCheck
                  maxLength={LIMITS.BODY_TEXT + 100}
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-gray-400">Bold: *text* | Italic: _text_ | Strike: ~text~</span>
                  <CharCount current={bodyText.length} max={LIMITS.BODY_TEXT} />
                </div>
              </div>

              {/* Footer */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Footer Text</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={e => setFooterText(e.target.value)}
                  placeholder="Optional footer"
                  className="w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  maxLength={LIMITS.FOOTER_TEXT + 10}
                />
                <div className="flex justify-end mt-0.5"><CharCount current={footerText.length} max={LIMITS.FOOTER_TEXT} /></div>
              </div>

              {/* Buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-800">Buttons (max {LIMITS.MAX_BUTTONS})</label>
                  {buttons.length < LIMITS.MAX_BUTTONS && (
                    <button type="button" onClick={() => setButtons(prev => [...prev, { type: 'QUICK_REPLY', title: '' }])} className="text-sm font-medium text-green-600 hover:text-green-700">+ Add Button</button>
                  )}
                </div>
                <div className="space-y-3">
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={btn.type}
                          onChange={e => setButtons(prev => prev.map((b, i) => i === idx ? { ...b, type: e.target.value as ButtonType } : b))}
                          className="text-xs px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="QUICK_REPLY">Quick Reply</option>
                          <option value="URL">URL</option>
                          <option value="PHONE_NUMBER">Phone</option>
                        </select>
                        <input
                          type="text"
                          value={btn.title}
                          onChange={e => setButtons(prev => prev.map((b, i) => i === idx ? { ...b, title: e.target.value } : b))}
                          placeholder="Button text"
                          className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                          maxLength={LIMITS.BUTTON_TEXT + 5}
                        />
                        <CharCount current={btn.title.length} max={LIMITS.BUTTON_TEXT} />
                        <button type="button" onClick={() => setButtons(prev => prev.filter((_, i) => i !== idx))} className="p-1 hover:bg-red-50 rounded text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                      {btn.type === 'URL' && (
                        <input
                          type="url"
                          value={btn.url || ''}
                          onChange={e => setButtons(prev => prev.map((b, i) => i === idx ? { ...b, url: e.target.value } : b))}
                          placeholder="https://example.com"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      )}
                      {btn.type === 'PHONE_NUMBER' && (
                        <input
                          type="tel"
                          value={btn.phoneNumber || ''}
                          onChange={e => setButtons(prev => prev.map((b, i) => i === idx ? { ...b, phoneNumber: e.target.value } : b))}
                          placeholder="+919309986820"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50">
                <h3 className="text-sm font-bold text-gray-900">WhatsApp Preview</h3>
                <p className="text-[10px] text-gray-500">Live preview of your template</p>
              </div>
              <div className="p-4" style={{ background: '#E5DDD5' }}>
                <div className="max-w-[92%] bg-white rounded-2xl overflow-hidden shadow-sm">
                  {/* Media header preview */}
                  {headerType === 'IMAGE' && mediaUrl && (
                    <img src={mediaUrl} alt="Header" className="w-full max-h-40 object-cover" />
                  )}
                  {headerType === 'VIDEO' && mediaUrl && (
                    <div className="bg-black relative flex items-center justify-center h-32">
                      <video src={mediaUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center"><Play className="w-5 h-5 text-gray-700 ml-0.5" /></div>
                      </div>
                    </div>
                  )}
                  {headerType === 'DOCUMENT' && mediaUrl && (
                    <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b">
                      <File className="w-5 h-5 text-red-500" />
                      <span className="text-xs text-gray-700 truncate">{mediaFileName}</span>
                    </div>
                  )}
                  <div className="px-4 py-3">
                    {headerType === 'TEXT' && headerText.trim() && <div className="text-xs font-bold text-gray-900 mb-2">{headerText}</div>}
                    <div className="text-sm text-gray-800 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatWA(bodyText || 'Your message…') }} />
                    {footerText.trim() && <div className="mt-2 pt-2 border-t text-[11px] text-gray-500">{footerText}</div>}
                    <div className="text-[10px] text-gray-400 mt-1 text-right">12:00 pm ✓✓</div>
                  </div>
                </div>
                {buttons.filter(b => b.title.trim()).length > 0 && (
                  <div className="mt-2 max-w-[92%] space-y-1.5">
                    {buttons.filter(b => b.title.trim()).slice(0, 3).map((b, i) => (
                      <button key={i} className="w-full bg-white border rounded-xl px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-gray-50 flex items-center justify-center gap-1.5">
                        {b.type === 'URL' && <ExternalLink className="w-3.5 h-3.5" />}
                        {b.type === 'PHONE_NUMBER' && <Phone className="w-3.5 h-3.5" />}
                        {b.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t bg-gray-50 text-[11px] text-gray-500">
                <strong>Status:</strong> <span className="text-green-600 font-semibold">Auto-Approved</span> · QR WhatsApp only
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QR WhatsApp Templates</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create and manage message templates for QR WhatsApp broadcasts</p>
          </div>
          <button onClick={openCreate} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition shadow-sm">
            <Plus className="w-4 h-4" /> Create Template
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Alerts */}
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4 flex justify-between">{error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button></div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 mb-4">{success}</div>}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates…"
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500">
            <option value="">All Categories</option>
            <option value="MARKETING">Marketing</option>
            <option value="UTILITY">Utility</option>
            <option value="OTP">OTP</option>
          </select>
          <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500">
            <option value="">All Languages</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </select>
          <span className="text-sm text-gray-500">{filtered.length} templates</span>
        </div>

        {/* Template Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">No templates found</h3>
            <p className="text-sm text-gray-400 mb-4">Create your first QR WhatsApp template to get started</p>
            <button onClick={openCreate} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm">+ Create Template</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <div key={t._id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition group">
                {/* Card Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{t.templateName}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        t.category === 'MARKETING' ? 'bg-purple-100 text-purple-700' :
                        t.category === 'UTILITY' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>{t.category}</span>
                      <span className="text-[10px] text-gray-400">{t.language === 'hi' ? 'HI' : t.language === 'mr' ? 'MR' : 'EN'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Approved</span>
                      {t.headerFormat && t.headerFormat !== 'TEXT' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          t.headerFormat === 'IMAGE' ? 'bg-sky-100 text-sky-700' :
                          t.headerFormat === 'VIDEO' ? 'bg-pink-100 text-pink-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {t.headerFormat === 'IMAGE' ? '📷' : t.headerFormat === 'VIDEO' ? '🎬' : '📄'} {t.headerFormat}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => setPreviewOpen(previewOpen === t._id ? null : t._id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Preview"><Eye className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => duplicateTemplate(t)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Duplicate"><Copy className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => deleteTemplate(t._id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </div>
                {/* Image Preview Thumbnail */}
                {t.headerFormat === 'IMAGE' && (t.imageFile?.url || (t.headerContent && t.headerContent.startsWith('http'))) && (
                  <div className="relative w-full h-28 bg-gray-100 overflow-hidden">
                    <img 
                      src={t.imageFile?.url || t.headerContent} 
                      alt="" 
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                {/* Video Preview Thumbnail */}
                {t.headerFormat === 'VIDEO' && (t.videoUrl || (t.headerContent && t.headerContent.startsWith('http'))) && (
                  <div className="relative w-full h-28 bg-gray-900 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                )}
                {/* Document Preview */}
                {t.headerFormat === 'DOCUMENT' && t.documents?.[0] && (
                  <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b">
                    <File className="w-6 h-6 text-red-500" />
                    <span className="text-xs text-gray-700 truncate flex-1">{t.documents[0].fileName || 'Document'}</span>
                  </div>
                )}
                {/* Card Body - Content Preview */}
                <div className="px-4 py-3">
                  {t.headerContent && !t.headerContent.startsWith('http') && (
                    <p className="text-xs font-bold text-gray-800 mb-1">{t.headerContent}</p>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{t.templateContent}</p>
                  {t.footerText && <p className="text-[11px] text-gray-400 mt-1">{t.footerText}</p>}
                  {t.buttons && t.buttons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.buttons.filter((b: any) => b.title?.trim()).map((b: any, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200 font-medium">
                          {b.type === 'URL' ? '🔗' : b.type === 'PHONE_NUMBER' ? '📞' : '↩️'} {b.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Card Footer */}
                <div className="px-4 py-2 border-t bg-gray-50 text-[10px] text-gray-400">
                  Created {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                </div>

                {/* Inline Preview */}
                {previewOpen === t._id && (
                  <div className="border-t p-4" style={{ background: '#E5DDD5' }}>
                    <div className="max-w-[90%] bg-white rounded-2xl overflow-hidden shadow-sm">
                      {/* Media in preview */}
                      {t.headerFormat === 'IMAGE' && (t.imageFile?.url || (t.headerContent && t.headerContent.startsWith('http'))) && (
                        <img src={t.imageFile?.url || t.headerContent} alt="" className="w-full max-h-36 object-cover" />
                      )}
                      {t.headerFormat === 'VIDEO' && (t.videoUrl || (t.headerContent && t.headerContent.startsWith('http'))) && (
                        <div className="bg-black relative flex items-center justify-center h-28">
                          <video src={t.videoUrl || t.headerContent} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"><Play className="w-4 h-4 text-gray-700 ml-0.5" /></div></div>
                        </div>
                      )}
                      {t.headerFormat === 'DOCUMENT' && t.documents?.[0] && (
                        <div className="bg-gray-100 px-3 py-2 flex items-center gap-2 border-b">
                          <File className="w-5 h-5 text-red-500" />
                          <span className="text-xs text-gray-700 truncate">{t.documents[0].fileName || 'Document'}</span>
                        </div>
                      )}
                      <div className="px-4 py-3">
                        {t.headerContent && !t.headerContent.startsWith('http') && <div className="text-xs font-bold text-gray-900 mb-2">{t.headerContent}</div>}
                        <div className="text-sm text-gray-800 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatWA(t.templateContent || '') }} />
                        {t.footerText && <div className="mt-2 pt-2 border-t text-[11px] text-gray-500">{t.footerText}</div>}
                        <div className="text-[10px] text-gray-400 mt-1 text-right">12:00 pm ✓✓</div>
                      </div>
                    </div>
                    {t.buttons && t.buttons.filter((b: any) => b.title?.trim()).length > 0 && (
                      <div className="mt-2 max-w-[90%] space-y-1">
                        {t.buttons.filter((b: any) => b.title?.trim()).map((b: any, i: number) => (
                          <div key={i} className="bg-white border rounded-xl px-3 py-2 text-sm font-medium text-green-700 text-center">{b.title}</div>
                        ))}
                      </div>
                    )}
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
