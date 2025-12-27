'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';

interface CTA {
  id: string;
  type: 'QUICK_REPLY' | 'CALL_TO_ACTION_URL' | 'CALL_TO_ACTION_CATALOG' | 'CALL_TO_ACTION_PHONE' | 'LIST_MESSAGE';
  text: string;
  url?: string;
  catalogId?: string;
  phoneNumber?: string;
  listSections?: Array<{ title: string; items: Array<{ id: string; title: string }> }>;
}

interface ButtonAction {
  id: string;
  label: string;
  actionType: 'link' | 'catalog' | 'list' | 'phone' | 'text';
  url?: string;
  catalogId?: string;
  phoneNumber?: string;
  listItems?: string[];
}

type PreviewToken = { type: 'text' | 'bold' | 'italic' | 'strike' | 'var'; value: string };

type HeaderFormat = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

const COLOR_THEMES = [
  { name: 'Emerald', primary: '#10b981', accent: '#059669', bg: '#064e3b', text: '#d1fae5' },
  { name: 'Blue', primary: '#3b82f6', accent: '#1d4ed8', bg: '#0c2340', text: '#dbeafe' },
  { name: 'Purple', primary: '#a855f7', accent: '#7c3aed', bg: '#2d1b4e', text: '#e9d5ff' },
  { name: 'Orange', primary: '#f97316', accent: '#ea580c', bg: '#431407', text: '#ffedd5' },
  { name: 'Pink', primary: '#ec4899', accent: '#be185d', bg: '#500724', text: '#fce7f3' },
  { name: 'Indigo', primary: '#6366f1', accent: '#4338ca', bg: '#1e1b4b', text: '#e0e7ff' },
];

function renderWhatsAppText(raw: string): PreviewToken[] {
  const out: PreviewToken[] = [];
  const s = String(raw || '');
  const regex = /(\*[^*\n]+\*)|(_[^_\n]+_)|(~[^~\n]+~)|(\{[a-zA-Z_][a-zA-Z0-9_]*\})/g;
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

export default function TemplateBuilderPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('en');
  const [headerFormat, setHeaderFormat] = useState<HeaderFormat>('NONE');
  const [headerContent, setHeaderContent] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [buttons, setButtons] = useState<ButtonAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const currentTheme = COLOR_THEMES[selectedTheme];
  const previewTokens = useMemo(() => renderWhatsAppText(bodyText), [bodyText]);

  const extractVariables = (content: string) => {
    const matches = content.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) || [];
    return [...new Set(matches.map((m) => m.slice(1, -1)))];
  };

  const variables = useMemo(() => extractVariables(bodyText), [bodyText]);

  const addButton = () => {
    const newButton: ButtonAction = {
      id: Math.random().toString(36).substr(2, 9),
      label: `Button ${buttons.length + 1}`,
      actionType: 'link',
      url: '',
    };
    setButtons([...buttons, newButton]);
  };

  const updateButton = (id: string, updates: Partial<ButtonAction>) => {
    setButtons(buttons.map((btn) => (btn.id === id ? { ...btn, ...updates } : btn)));
  };

  const removeButton = (id: string) => {
    setButtons(buttons.filter((btn) => btn.id !== id));
  };

  const wrapText = (left: string, right: string) => {
    if (!contentRef.current) return;
    const start = contentRef.current.selectionStart ?? bodyText.length;
    const end = contentRef.current.selectionEnd ?? bodyText.length;
    const selected = bodyText.slice(start, end);
    const newText = bodyText.slice(0, start) + left + selected + right + bodyText.slice(end);
    setBodyText(newText);

    requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.focus();
        contentRef.current.setSelectionRange(start + left.length, end + left.length);
      }
    });
  };

  const insertVariable = (varName: string) => {
    if (!contentRef.current) return;
    const start = contentRef.current.selectionStart ?? bodyText.length;
    const newText = bodyText.slice(0, start) + `{${varName}}` + bodyText.slice(start);
    setBodyText(newText);

    requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.focus();
        contentRef.current.setSelectionRange(start + varName.length + 2, start + varName.length + 2);
      }
    });
  };

  const handleSave = async (asDraft = true) => {
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }
    if (!bodyText.trim()) {
      setError('Message content is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await crm.fetch('/api/admin/crm/templates', {
        method: 'POST',
        body: {
          templateName,
          category,
          language,
          templateContent: bodyText,
          headerFormat: headerFormat === 'NONE' ? undefined : headerFormat,
          headerContent: headerContent || undefined,
          footerText: footerText || undefined,
          variables,
          buttons: buttons.length > 0 ? buttons : undefined,
          theme: { colorIndex: selectedTheme, themeName: currentTheme.name },
          status: asDraft ? 'draft' : 'pending_approval',
        },
      });

      setSuccess(`Template ${asDraft ? 'saved as draft' : 'submitted for approval'}!`);
      setTimeout(() => {
        router.push('/admin/crm/templates');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!token) router.push('/admin/login');
  }, [token, router]);

  if (!token) return <LoadingSpinner />;

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: currentTheme.bg }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="📝 Create Message Template"
          subtitle="Design your WhatsApp message with preview, buttons, and formatting"
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ========== LEFT: EDITOR ========== */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Info */}
            <div className="rounded-xl border p-6" style={{ borderColor: `${currentTheme.primary}40`, backgroundColor: `${currentTheme.bg}aa` }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: currentTheme.accent }}>
                📋 Template Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: currentTheme.text }}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Welcome Message, Appointment Reminder"
                    className="w-full px-4 py-2 rounded-lg border-2 bg-opacity-20 focus:outline-none transition-all"
                    style={{
                      borderColor: `${currentTheme.primary}60`,
                      backgroundColor: `${currentTheme.primary}10`,
                      color: 'white',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: currentTheme.text }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 bg-opacity-20 focus:outline-none transition-all"
                    style={{
                      borderColor: `${currentTheme.primary}60`,
                      backgroundColor: `${currentTheme.primary}10`,
                      color: 'white',
                    }}
                  >
                    <option value="MARKETING">📢 Marketing</option>
                    <option value="TRANSACTIONAL">📦 Transactional</option>
                    <option value="OTP">🔐 OTP / Security</option>
                    <option value="ACCOUNT_UPDATE">👤 Account Update</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: currentTheme.text }}>
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 bg-opacity-20 focus:outline-none transition-all"
                    style={{
                      borderColor: `${currentTheme.primary}60`,
                      backgroundColor: `${currentTheme.primary}10`,
                      color: 'white',
                    }}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: currentTheme.text }}>
                    Header Type
                  </label>
                  <select
                    value={headerFormat}
                    onChange={(e) => setHeaderFormat(e.target.value as HeaderFormat)}
                    className="w-full px-4 py-2 rounded-lg border-2 bg-opacity-20 focus:outline-none transition-all"
                    style={{
                      borderColor: `${currentTheme.primary}60`,
                      backgroundColor: `${currentTheme.primary}10`,
                      color: 'white',
                    }}
                  >
                    <option value="NONE">None</option>
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                </div>
              </div>

              {headerFormat !== 'NONE' && (
                <div className="mt-4">
                  <label className="block text-sm mb-2" style={{ color: currentTheme.text }}>
                    Header Content ({headerFormat})
                  </label>
                  <input
                    type="text"
                    value={headerContent}
                    onChange={(e) => setHeaderContent(e.target.value)}
                    placeholder={
                      headerFormat === 'TEXT'
                        ? 'Enter text...'
                        : `Enter ${headerFormat.toLowerCase()} URL...`
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 bg-opacity-20 focus:outline-none transition-all"
                    style={{
                      borderColor: `${currentTheme.primary}60`,
                      backgroundColor: `${currentTheme.primary}10`,
                      color: 'white',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="rounded-xl border p-6" style={{ borderColor: `${currentTheme.primary}40`, backgroundColor: `${currentTheme.bg}aa` }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: currentTheme.accent }}>
                💬 Message Body
              </h3>

              {/* Formatting Toolbar */}
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => wrapText('*', '*')}
                  className="px-3 py-1.5 rounded-lg font-bold transition-all hover:opacity-80"
                  style={{ backgroundColor: currentTheme.primary, color: 'white' }}
                  title="Bold"
                >
                  B
                </button>
                <button
                  onClick={() => wrapText('_', '_')}
                  className="px-3 py-1.5 rounded-lg italic transition-all hover:opacity-80"
                  style={{ backgroundColor: currentTheme.primary, color: 'white' }}
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => wrapText('~', '~')}
                  className="px-3 py-1.5 rounded-lg line-through transition-all hover:opacity-80"
                  style={{ backgroundColor: currentTheme.primary, color: 'white' }}
                  title="Strikethrough"
                >
                  S
                </button>

                <div className="w-px" style={{ backgroundColor: `${currentTheme.primary}40` }} />

                <div className="text-sm" style={{ color: currentTheme.text }}>
                  Insert Variable:
                </div>
                <button
                  onClick={() => insertVariable('name')}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ backgroundColor: `${currentTheme.accent}40`, color: currentTheme.text }}
                >
                  {'{'} name {'}'}
                </button>
                <button
                  onClick={() => insertVariable('phone')}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ backgroundColor: `${currentTheme.accent}40`, color: currentTheme.text }}
                >
                  {'{'} phone {'}'}
                </button>
                <button
                  onClick={() => insertVariable('date')}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ backgroundColor: `${currentTheme.accent}40`, color: currentTheme.text }}
                >
                  {'{'} date {'}'}
                </button>
              </div>

              {/* Text Area */}
              <textarea
                ref={contentRef}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Type your message here...
Use *text* for bold, _text_ for italic, ~text~ for strikethrough
Use {variable} for dynamic content"
                className="w-full px-4 py-3 rounded-lg border-2 h-40 font-mono text-sm focus:outline-none transition-all resize-none"
                style={{
                  borderColor: `${currentTheme.primary}60`,
                  backgroundColor: `${currentTheme.primary}10`,
                  color: 'white',
                }}
              />

              {/* Variables Display */}
              {variables.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: `${currentTheme.primary}40` }}>
                  <p className="text-sm mb-2" style={{ color: currentTheme.text }}>
                    Variables detected:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variables.map((v) => (
                      <span
                        key={v}
                        className="px-3 py-1 rounded-lg text-sm font-mono"
                        style={{ backgroundColor: `${currentTheme.accent}30`, color: currentTheme.text }}
                      >
                        {'{'}
                        {v}
                        {'}'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="rounded-xl border p-6" style={{ borderColor: `${currentTheme.primary}40`, backgroundColor: `${currentTheme.bg}aa` }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: currentTheme.accent }}>
                📌 Footer & Buttons
              </h3>

              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ color: currentTheme.text }}>
                  Footer Text (Optional)
                </label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="e.g., Powered by Swar Yoga"
                  maxLength={60}
                  className="w-full px-4 py-2 rounded-lg border-2 bg-opacity-20 focus:outline-none transition-all"
                  style={{
                    borderColor: `${currentTheme.primary}60`,
                    backgroundColor: `${currentTheme.primary}10`,
                    color: 'white',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: `${currentTheme.text}aa` }}>
                  {footerText.length}/60 characters
                </p>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                {buttons.map((btn, idx) => (
                  <div
                    key={btn.id}
                    className="p-4 rounded-lg border-2"
                    style={{ borderColor: `${currentTheme.primary}40`, backgroundColor: `${currentTheme.primary}05` }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold" style={{ color: currentTheme.text }}>
                        Button {idx + 1}
                      </h4>
                      <button
                        onClick={() => removeButton(btn.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: currentTheme.text }}>
                          Button Label
                        </label>
                        <input
                          type="text"
                          value={btn.label}
                          onChange={(e) => updateButton(btn.id, { label: e.target.value })}
                          placeholder="e.g., Visit Website"
                          maxLength={20}
                          className="w-full px-3 py-2 rounded-lg border text-sm bg-opacity-20 focus:outline-none transition-all"
                          style={{
                            borderColor: `${currentTheme.primary}60`,
                            backgroundColor: `${currentTheme.primary}20`,
                            color: 'white',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-xs mb-1" style={{ color: currentTheme.text }}>
                          Action Type
                        </label>
                        <select
                          value={btn.actionType}
                          onChange={(e) =>
                            updateButton(btn.id, { actionType: e.target.value as ButtonAction['actionType'] })
                          }
                          className="w-full px-3 py-2 rounded-lg border text-sm bg-opacity-20 focus:outline-none transition-all"
                          style={{
                            borderColor: `${currentTheme.primary}60`,
                            backgroundColor: `${currentTheme.primary}20`,
                            color: 'white',
                          }}
                        >
                          <option value="link">🔗 Link</option>
                          <option value="catalog">📦 Catalog</option>
                          <option value="list">📋 List</option>
                          <option value="phone">📞 Phone</option>
                          <option value="text">💬 Text Reply</option>
                        </select>
                      </div>
                    </div>

                    {/* Action-specific fields */}
                    {btn.actionType === 'link' && (
                      <div className="mt-3">
                        <label className="block text-xs mb-1" style={{ color: currentTheme.text }}>
                          URL
                        </label>
                        <input
                          type="url"
                          value={btn.url || ''}
                          onChange={(e) => updateButton(btn.id, { url: e.target.value })}
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 rounded-lg border text-sm bg-opacity-20 focus:outline-none transition-all"
                          style={{
                            borderColor: `${currentTheme.primary}60`,
                            backgroundColor: `${currentTheme.primary}20`,
                            color: 'white',
                          }}
                        />
                      </div>
                    )}

                    {btn.actionType === 'phone' && (
                      <div className="mt-3">
                        <label className="block text-xs mb-1" style={{ color: currentTheme.text }}>
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={btn.phoneNumber || ''}
                          onChange={(e) => updateButton(btn.id, { phoneNumber: e.target.value })}
                          placeholder="+919876543210"
                          className="w-full px-3 py-2 rounded-lg border text-sm bg-opacity-20 focus:outline-none transition-all"
                          style={{
                            borderColor: `${currentTheme.primary}60`,
                            backgroundColor: `${currentTheme.primary}20`,
                            color: 'white',
                          }}
                        />
                      </div>
                    )}

                    {btn.actionType === 'catalog' && (
                      <div className="mt-3">
                        <label className="block text-xs mb-1" style={{ color: currentTheme.text }}>
                          Catalog ID
                        </label>
                        <input
                          type="text"
                          value={btn.catalogId || ''}
                          onChange={(e) => updateButton(btn.id, { catalogId: e.target.value })}
                          placeholder="Your catalog ID"
                          className="w-full px-3 py-2 rounded-lg border text-sm bg-opacity-20 focus:outline-none transition-all"
                          style={{
                            borderColor: `${currentTheme.primary}60`,
                            backgroundColor: `${currentTheme.primary}20`,
                            color: 'white',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {buttons.length < 3 && (
                  <button
                    onClick={addButton}
                    className="w-full py-2 rounded-lg border-2 border-dashed transition-all font-semibold"
                    style={{
                      borderColor: currentTheme.primary,
                      color: currentTheme.primary,
                    }}
                  >
                    + Add Button ({buttons.length}/3)
                  </button>
                )}
              </div>
            </div>

            {/* Color Theme Selector */}
            <div className="rounded-xl border p-6" style={{ borderColor: `${currentTheme.primary}40`, backgroundColor: `${currentTheme.bg}aa` }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: currentTheme.accent }}>
                🎨 Color Theme
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {COLOR_THEMES.map((theme, idx) => (
                  <button
                    key={theme.name}
                    onClick={() => setSelectedTheme(idx)}
                    className={`p-4 rounded-lg border-2 transition-all font-semibold ${
                      selectedTheme === idx ? 'border-white' : 'border-transparent opacity-60 hover:opacity-80'
                    }`}
                    style={{ backgroundColor: theme.bg, color: theme.primary }}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========== RIGHT: LIVE PREVIEW ========== */}
          <div className="lg:col-span-1 sticky top-8">
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${currentTheme.primary}60`, backgroundColor: '#000' }}>
              {/* Phone Frame */}
              <div className="p-4">
                <div
                  className="rounded-3xl border-8 border-gray-800 overflow-hidden shadow-2xl"
                  style={{ borderColor: '#1f2937' }}
                >
                  {/* Phone Header */}
                  <div
                    className="px-4 py-2 text-center text-xs font-semibold"
                    style={{ backgroundColor: currentTheme.primary, color: 'white' }}
                  >
                    Swar Yoga CRM
                  </div>

                  {/* Chat Bubble */}
                  <div className="bg-gray-950 p-4 min-h-96 flex flex-col justify-center space-y-3">
                    {/* Header */}
                    {headerFormat !== 'NONE' && (
                      <div
                        className="rounded-lg p-3 text-xs text-center text-white mb-2"
                        style={{ backgroundColor: currentTheme.primary }}
                      >
                        [{headerFormat}] {headerContent || 'Header'}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className="rounded-2xl p-4 max-w-xs"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      <div className="text-white text-sm leading-relaxed">
                        {previewTokens.map((token, idx) => {
                          if (token.type === 'text')
                            return (
                              <span key={idx}>{token.value}</span>
                            );
                          if (token.type === 'bold')
                            return (
                              <strong key={idx}>{token.value}</strong>
                            );
                          if (token.type === 'italic')
                            return (
                              <em key={idx}>{token.value}</em>
                            );
                          if (token.type === 'strike')
                            return (
                              <s key={idx}>{token.value}</s>
                            );
                          if (token.type === 'var')
                            return (
                              <span
                                key={idx}
                                className="px-1 rounded text-xs"
                                style={{ backgroundColor: `rgba(0,0,0,0.3)` }}
                              >
                                {'{'}
                                {token.value}
                                {'}'}
                              </span>
                            );
                          return null;
                        })}
                      </div>
                    </div>

                    {/* Footer */}
                    {footerText && (
                      <div className="text-center text-xs text-gray-400 mt-2">
                        {footerText}
                      </div>
                    )}

                    {/* Buttons Preview */}
                    {buttons.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {buttons.map((btn) => (
                          <button
                            key={btn.id}
                            className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-all"
                            style={{ backgroundColor: currentTheme.accent }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone Footer */}
                  <div className="bg-gray-900 px-4 py-3 flex justify-around text-2xl">
                    💬 ☎️ ⋮
                  </div>
                </div>

                {/* Action Buttons Below Phone */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="w-full py-3 rounded-lg font-bold transition-all text-white"
                    style={{
                      backgroundColor: currentTheme.primary,
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    {saving ? '⏳ Saving...' : '💾 Save as Draft'}
                  </button>

                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="w-full py-3 rounded-lg font-bold transition-all text-white"
                    style={{
                      backgroundColor: currentTheme.accent,
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    {saving ? '⏳ Saving...' : '📤 Submit for Approval'}
                  </button>

                  <button
                    onClick={() => router.push('/admin/crm/templates')}
                    className="w-full py-3 rounded-lg font-bold transition-all"
                    style={{
                      backgroundColor: `${currentTheme.primary}30`,
                      color: currentTheme.primary,
                    }}
                  >
                    ← Back to Templates
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
