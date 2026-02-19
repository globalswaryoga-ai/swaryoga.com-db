'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, MediaPreview, formatFileSize } from '@/components/admin/crm';

/**
 * Convert S3 URLs to proxied URLs for authenticated access
 * S3 bucket has "Block Public Access" enabled, so we need to proxy through API
 */
function getProxiedMediaUrl(url: string, authToken: string | null): string {
  if (!url) return url;
  
  // Check if it's an S3 URL (our bucket)
  const isS3Url = url.includes('.s3.') && url.includes('.amazonaws.com');
  
  if (isS3Url && authToken) {
    // Proxy through our API which will generate a signed URL and fetch the content
    return `/api/admin/crm/media/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(authToken)}`;
  }
  
  return url;
}

type ImageFile = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type DocumentFile = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
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
  const [aiCorrecting, setAiCorrecting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [templateName, setTemplateName] = useState('');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState('MARKETING');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<Array<{ title: string }>>([{ title: '' }]);

  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [documentFiles, setDocumentFiles] = useState<DocumentFile[]>([]);
  const [videoUrl, setVideoUrl] = useState('');

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

  const uploadFile = useCallback(
    async (file: File, fileType: 'image' | 'document') => {
      if (!templateName.trim()) {
        setError('Please enter a template name first');
        return null;
      }

      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', fileType);
        formData.append('templateId', templateName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now());

        const res = await fetch('/api/admin/crm/templates/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        return null;
      } finally {
        setUploading(false);
      }
    },
    [token, templateName]
  );

  const onPickImage = useCallback(
    async (file: File) => {
      const uploadedFile = await uploadFile(file, 'image');
      if (uploadedFile) {
        setImageFile(uploadedFile);
      }
    },
    [uploadFile]
  );

  const onPickDocument = useCallback(
    async (file: File) => {
      const uploadedFile = await uploadFile(file, 'document');
      if (uploadedFile) {
        setDocumentFiles((prev) => [
          ...prev,
          {
            url: uploadedFile.url,
            fileName: uploadedFile.fileName,
            mimeType: uploadedFile.mimeType,
            sizeBytes: uploadedFile.sizeBytes,
          },
        ]);
      }
    },
    [uploadFile]
  );

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
      return `${prev.slice(0, start)}${emoji}${prev.slice(end)}`;
    });
    requestAnimationFrame(() => bodyRef.current?.focus());
  }, []);

  const applyAutocorrectBody = useCallback(async () => {
    if (!bodyText.trim()) return;

    try {
      setAiCorrecting(true);
      const res = await fetch('/api/admin/crm/ai-correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bodyText }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to auto-correct');
      }
      if (typeof json?.correctedText === 'string') {
        setBodyText(json.correctedText);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-correct');
    } finally {
      setAiCorrecting(false);
      requestAnimationFrame(() => bodyRef.current?.focus());
    }
  }, [bodyText]);

  const emojiRow = ['😊', '🙏', '✅', '📌', '🔥', '🎉', '📞', '📍'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    const templateContent = previewText;
    if (!templateContent.trim()) {
      setError('Template content is required (add header/body/footer)');
      return;
    }

    setSaving(true);
    try {
      const resolvedHeaderFormat = imageFile
        ? 'IMAGE'
        : videoUrl.trim()
          ? 'VIDEO'
          : headerText.trim()
            ? 'TEXT'
            : undefined;

      const resolvedHeaderContent = imageFile
        ? imageFile.url
        : videoUrl.trim()
          ? videoUrl.trim()
          : headerText.trim() || undefined;

      const resolvedHeaderMedia =
        resolvedHeaderFormat === 'IMAGE' || resolvedHeaderFormat === 'VIDEO'
          ? {
              kind: resolvedHeaderFormat === 'VIDEO' ? 'video' : 'image',
              url: resolvedHeaderContent || '',
            }
          : null;

      await crmFetch('/api/admin/crm/templates', {
        method: 'POST',
        body: {
          templateName: templateName.trim(),
          category,
          language,
          templateContent,
          headerFormat: resolvedHeaderFormat,
          // IMPORTANT: for image/video headers, headerContent should be the MEDIA URL.
          headerContent: resolvedHeaderContent,
          headerMedia: resolvedHeaderMedia || undefined,
          footerText: footerText.trim() || undefined,
          buttons: buttons.map((b) => ({ title: String(b?.title || '') })),
          imageFile: imageFile || undefined,
          documents: documentFiles.length > 0 ? documentFiles : undefined,
          videoUrl: videoUrl.trim() || undefined,
          variables: [],
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
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Template</h1>
            <p className="text-gray-600 mt-1">Add a new WhatsApp message template with images, videos, and documents</p>
          </div>
          <Link
            href="/admin/crm/whatsapp/templates"
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {uploading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700">📤 Uploading file to S3...</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="text-lg font-bold text-gray-900">Template Builder</div>
                <div className="text-xs text-gray-500">Mobile-friendly card editor with live preview</div>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Template Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., welcome_message"
                    value={templateName}
                    onChange={(e) => {
                      // Auto-format: lowercase, replace spaces with underscore, only a-z, 0-9, _
                      const formatted = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '_')
                        .replace(/[^a-z0-9_]/g, '');
                      setTemplateName(formatted);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ⓘ Meta rules: Only lowercase letters, numbers, and underscore (_). No spaces or capitals.
                  </p>
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
                      <option value="UTILITY">🔧 Utility</option>
                      <option value="OTP">🔐 OTP</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-5">
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">📷 Header Image (always on top)</label>
                    {imageFile && (
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                        onClick={() => setImageFile(null)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {!imageFile ? (
                    <label className="flex items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1E7F43] hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="text-center">
                        <div className="text-2xl mb-2">📷</div>
                        <div className="font-semibold text-gray-900">Click to upload image</div>
                        <div className="text-xs text-gray-500">JPG, PNG, WebP (up to 25MB)</div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onPickImage(f);
                        }}
                      />
                    </label>
                  ) : (
                    <MediaPreview 
                      media={{
                        url: getProxiedMediaUrl(imageFile.url, token),
                        type: 'image',
                        name: imageFile.fileName,
                        size: imageFile.sizeBytes,
                      }}
                      size="md"
                      onRemove={() => setImageFile(null)}
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Message text</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                        onClick={applyAutocorrectBody}
                        disabled={!bodyText.trim() || aiCorrecting || uploading}
                      >
                        {aiCorrecting ? '⏳' : '✅'}
                      </button>

                      <button
                        type="button"
                        className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 font-extrabold"
                        onClick={() => applyFormat('*', '*')}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 italic font-semibold"
                        onClick={() => applyFormat('_', '_')}
                      >
                        I
                      </button>

                      <div className="w-px h-7 bg-gray-200 mx-1" />

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
                    ref={bodyRef}
                    placeholder="Type your message here…"
                    rows={8}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                    spellCheck={true}
                    autoComplete="on"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    lang="en"
                    data-gramm="true"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Bold: <code>*text*</code> | Italic: <code>_text_</code> | Variables: <code>{'{{firstName}}'}</code>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Footer text</label>
                  <input
                    type="text"
                    placeholder="Footer (optional)"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    spellCheck
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Buttons (optional)</label>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#1E7F43] hover:text-[#166235]"
                      onClick={() =>
                        setButtons((prev) =>
                          prev.length >= 3 ? prev : [...prev, { title: '' }]
                        )
                      }
                    >
                      + Add button
                    </button>
                  </div>
                  <div className="space-y-2">
                    {buttons.map((b, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Button ${idx + 1}`}
                          value={b.title}
                          onChange={(e) =>
                            setButtons((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, title: e.target.value } : x
                              )
                            )
                          }
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                          spellCheck
                        />
                        {buttons.length > 1 && (
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50"
                            onClick={() =>
                              setButtons((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">🎬 Video URL (preview only, no upload)</label>
                  <input
                    type="url"
                    placeholder="e.g., https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  />
                  <div className="mt-2 text-xs text-gray-500">Supports YouTube, Vimeo, and embeddable URLs</div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">📄 Documents (PDF, Word, Excel, etc.)</label>
                    {documentFiles.length > 0 && (
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                        onClick={() => setDocumentFiles([])}
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {documentFiles.length === 0 ? (
                    <label className="flex items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1E7F43] hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="text-center">
                        <div className="text-2xl mb-2">📄</div>
                        <div className="font-semibold text-gray-900">Click to upload documents</div>
                        <div className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, PPT, ZIP (up to 50MB each)</div>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onPickDocument(f);
                        }}
                      />
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <MediaPreview 
                        media={documentFiles.map((doc, idx) => ({
                          url: getProxiedMediaUrl(doc.url, token),
                          type: 'document' as const,
                          name: doc.fileName,
                          size: doc.sizeBytes,
                        }))}
                        size="sm"
                        layout="list"
                        onRemove={(index) => setDocumentFiles((prev) => prev.filter((_, i) => i !== index))}
                      />
                      <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 cursor-pointer">
                        <span className="text-sm font-semibold text-[#1E7F43]">+ Add more</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onPickDocument(f);
                          }}
                        />
                      </label>
                    </div>
                  )}
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
                    disabled={saving || uploading}
                    className="flex-1 px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors"
                  >
                    {saving ? 'Creating…' : uploading ? 'Uploading…' : '+ Create Template'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 bg-white rounded-2xl border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="text-lg font-bold text-gray-900">Preview</div>
                <div className="text-xs text-gray-500">WhatsApp message preview</div>
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
                      {headerText.trim() && (
                        <div className="text-xs font-semibold text-gray-900 mb-2">
                          {headerText}
                        </div>
                      )}

                      {imageFile && (
                        <div className="mb-3">
                          <MediaPreview 
                            media={{
                              url: getProxiedMediaUrl(imageFile.url, token),
                              type: 'image',
                              name: imageFile.fileName,
                            }}
                            size="sm"
                            showDownload={false}
                          />
                        </div>
                      )}

                      <div
                        className="text-sm text-gray-800 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: formatPreviewMessage(
                            bodyText.trim() || 'Your message…'
                          ),
                        }}
                      />

                      {footerText.trim() && (
                        <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-600">
                          {footerText}
                        </div>
                      )}
                    </div>

                    {previewButtons.length > 0 && (
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
                    )}

                    {videoUrl.trim() && (
                      <div className="mt-3 text-center">
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          🎬 Watch video
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  <div className="font-semibold mb-2">Content saved:</div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
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
