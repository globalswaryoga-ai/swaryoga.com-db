'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox } from '@/components/admin/crm';

type HeaderMedia =
  | null
  | {
      kind: 'image' | 'video';
      file: File;
      objectUrl: string;
    };

type Attachment =
  | null
  | {
      kind: 'document' | 'image' | 'video';
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
  const next = `${before}${wrapLeft}${selected || ''}${wrapRight}${after}`;
  return next;
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

// WhatsApp-style lightweight formatting preview (safe: escapes HTML first)
function formatPreviewMessage(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

export default function CreateTemplatePage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Builder fields (structured)
  const [templateName, setTemplateName] = useState('');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState('MARKETING');

  // Content order requested:
  // header text -> image/video -> other text -> footer text -> buttons
  const [headerText, setHeaderText] = useState('');
  const [headerMedia, setHeaderMedia] = useState<HeaderMedia>(null);
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<Array<{ title: string }>>([{ title: '' }]);

  const [attachment, setAttachment] = useState<Attachment>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const previewText = useMemo(
    () =>
      buildPreviewText({
        headerText,
        bodyText,
        footerText,
        buttons,
      }),
    [headerText, bodyText, footerText, buttons]
  );

  const previewButtons = useMemo(
    () => buttons.filter((b) => b.title.trim()).slice(0, 3),
    [buttons]
  );

  const onPickHeaderMedia = useCallback((file: File, kind: 'image' | 'video') => {
    const objectUrl = URL.createObjectURL(file);
    setHeaderMedia({ kind, file, objectUrl });
  }, []);

  const onPickAttachment = useCallback((file: File, kind: 'document' | 'image' | 'video') => {
    const objectUrl = URL.createObjectURL(file);
    setAttachment({ kind, file, objectUrl });
  }, []);

  const applyFormat = useCallback(
    (wrapLeft: string, wrapRight: string) => {
      setBodyText((prev) => insertAroundSelection(bodyRef.current, prev, wrapLeft, wrapRight));
      requestAnimationFrame(() => bodyRef.current?.focus());
    },
    []
  );

  const addEmoji = useCallback((emoji: string) => {
    setBodyText((prev) => {
      const el = bodyRef.current;
      if (!el) return prev + emoji;
      const start = el.selectionStart ?? prev.length;
      const end = el.selectionEnd ?? prev.length;
      const next = `${prev.slice(0, start)}${emoji}${prev.slice(end)}`;
      return next;
    });
    requestAnimationFrame(() => bodyRef.current?.focus());
  }, []);

  const emojiRow = ['😊', '🙏', '✅', '📌', '🔥', '🎉', '📞', '📍'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    // Create a backward-compatible templateContent for older views
    const templateContent = previewText;

    if (!templateContent.trim()) {
      setError('Template content is required (add header/body/footer)');
      return;
    }

    setSaving(true);
    try {
      await crmFetch('/api/admin/crm/templates', {
        method: 'POST',
        body: {
          templateName: templateName.trim(),
          category,
          language,
          templateContent,
          headerFormat: headerMedia ? (headerMedia.kind === 'image' ? 'IMAGE' : 'VIDEO') : headerText.trim() ? 'TEXT' : undefined,
          headerContent: headerText.trim() || undefined,
          footerText: footerText.trim() || undefined,
          variables: [],
          // Future-proof: keep a structured snapshot (safe to ignore server-side)
          content: {
            headerText,
            hasHeaderMedia: Boolean(headerMedia),
            bodyText,
            footerText,
            buttons,
            hasAttachment: Boolean(attachment),
          },
        },
      });
      router.push('/admin/crm/whatsapp/templates?success=created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Template</h1>
            <p className="text-gray-600 mt-1">Add a new WhatsApp message template</p>
          </div>
          <Link
            href="/admin/crm/whatsapp/templates"
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-gray-900">Template Builder</div>
                  <div className="text-xs text-gray-500">Mobile-friendly card editor with live preview</div>
                </div>
                <div className="text-xs text-gray-500">Use emoji row tools</div>
              </div>

              {/* Meta */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Template Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Welcome Message"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    >
                      <option value="en">🇬🇧 English</option>
                      <option value="hi">🇮🇳 Hindi</option>
                      <option value="mr">🇮🇳 Marathi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    >
                      <option value="MARKETING">📢 Marketing</option>
                      <option value="TRANSACTIONAL">💳 Transactional</option>
                      <option value="OTP">🔐 OTP</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Structured content */}
              <div className="px-5 pb-5 space-y-5">
                {/* Header text */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Header text</label>
                  <input
                    type="text"
                    placeholder="Header"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    spellCheck
                  />
                </div>

                {/* Header media (always above other text) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Image / Video (always on top)</label>
                    {headerMedia ? (
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                        onClick={() => setHeaderMedia(null)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div>
                        <div className="font-semibold text-gray-900">📷 Add Image</div>
                        <div className="text-xs text-gray-500">Header image preview</div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          onPickHeaderMedia(f, 'image');
                        }}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div>
                        <div className="font-semibold text-gray-900">🎬 Add Video</div>
                        <div className="text-xs text-gray-500">Header video preview</div>
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          onPickHeaderMedia(f, 'video');
                        }}
                      />
                    </label>
                  </div>

                  {headerMedia ? (
                    <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                      {headerMedia.kind === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={headerMedia.objectUrl} alt="Header" className="w-full max-h-64 object-cover" />
                      ) : (
                        <video src={headerMedia.objectUrl} controls className="w-full max-h-64 object-cover" />
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Body text + tools */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Other text</label>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 flex-wrap items-center">
                        <button
                          type="button"
                          className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 font-extrabold"
                          onClick={() => applyFormat('*', '*')}
                          title="Bold (*text*)"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 italic font-semibold"
                          onClick={() => applyFormat('_', '_')}
                          title="Italic (_text_)"
                        >
                          I
                        </button>

                        <div className="w-px h-7 bg-gray-200 mx-1" aria-hidden="true" />

                        {emojiRow.map((em) => (
                          <button
                            key={em}
                            type="button"
                            className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50"
                            onClick={() => addEmoji(em)}
                            title={`Insert ${em}`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <textarea
                    ref={(el) => {
                      bodyRef.current = el;
                    }}
                    placeholder="Type your message here…"
                    rows={8}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                    spellCheck
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Tips: bold with <code>*text*</code>, italic with <code>_text_</code>, variables like <code>{'{{firstName}}'}</code>
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Footer text</label>
                  <input
                    type="text"
                    placeholder="Footer"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    spellCheck
                  />
                </div>

                {/* Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Button(s)</label>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#1E7F43] hover:text-[#166235]"
                      onClick={() => setButtons((prev) => (prev.length >= 3 ? prev : [...prev, { title: '' }]))}
                    >
                      + Add button
                    </button>
                  </div>
                  <div className="space-y-2">
                    {buttons.map((b, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Button ${idx + 1} title`}
                          value={b.title}
                          onChange={(e) =>
                            setButtons((prev) => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                          }
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                          spellCheck
                        />
                        {buttons.length > 1 ? (
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50"
                            onClick={() => setButtons((prev) => prev.filter((_, i) => i !== idx))}
                            title="Remove"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documents / extra attachments (for future send flow) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Attachments (docs/images/videos)</label>
                    {attachment ? (
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                        onClick={() => setAttachment(null)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div className="font-semibold text-gray-900">📄 Document</div>
                      <div className="text-xs text-gray-500">PDF/DOC/etc</div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          onPickAttachment(f, 'document');
                        }}
                      />
                    </label>
                    <label className="px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div className="font-semibold text-gray-900">🖼️ Image</div>
                      <div className="text-xs text-gray-500">Extra image</div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          onPickAttachment(f, 'image');
                        }}
                      />
                    </label>
                    <label className="px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div className="font-semibold text-gray-900">🎞️ Video</div>
                      <div className="text-xs text-gray-500">Extra video</div>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          onPickAttachment(f, 'video');
                        }}
                      />
                    </label>
                  </div>

                  {attachment ? (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      Attached: <span className="font-semibold">{attachment.file.name}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Link
                    href="/admin/crm/whatsapp/templates"
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-center"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors"
                  >
                    {saving ? 'Creating…' : '+ Create Template'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview card */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 bg-white rounded-2xl border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="text-lg font-bold text-gray-900">Preview</div>
                <div className="text-xs text-gray-500">Right-side live preview</div>
              </div>
              <div className="p-5">
                <div
                  className="rounded-2xl border border-gray-200 overflow-hidden"
                  style={{ background: '#E5DDD5' }}
                >
                  <div className="p-4">
                    <div
                      className="max-w-[92%] rounded-2xl px-4 py-3 shadow-sm"
                      style={{ background: '#ffffff' }}
                    >
                      {/* Header */}
                      {headerText.trim() ? (
                        <div className="text-xs font-semibold text-gray-900 mb-2">{headerText}</div>
                      ) : null}

                      {/* Media always above body */}
                      {headerMedia ? (
                        <div className="mb-3 rounded-xl overflow-hidden border border-gray-200">
                          {headerMedia.kind === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={headerMedia.objectUrl} alt="Preview" className="w-full max-h-64 object-cover" />
                          ) : (
                            <video src={headerMedia.objectUrl} controls className="w-full max-h-64 object-cover" />
                          )}
                        </div>
                      ) : null}

                      {/* Body */}
                      <div
                        className="text-sm text-gray-800 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatPreviewMessage(bodyText.trim() || 'Your message…') }}
                      />

                      {/* Footer */}
                      {footerText.trim() ? (
                        <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-600">{footerText}</div>
                      ) : null}
                    </div>

                    {/* Buttons */}
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
        </form>
      </div>
    </div>
  );
}
