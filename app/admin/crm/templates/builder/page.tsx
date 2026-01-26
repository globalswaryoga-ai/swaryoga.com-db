'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox } from '@/components/admin/crm';

type ImageFile = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type VideoFile = {
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

type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'CATALOG';

type TemplateButton = {
  type: ButtonType;
  title: string;
  url?: string;
  phoneNumber?: string;
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
  buttons: TemplateButton[];
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
        .map((b) => {
          let extra = '';
          if (b.type === 'URL') extra = ` (🔗 ${b.url})`;
          if (b.type === 'PHONE_NUMBER') extra = ` (📞 ${b.phoneNumber})`;
          if (b.type === 'CATALOG') extra = ` (🛍️ Catalog)`;
          return `• [${b.type}] ${b.title.trim()}${extra}`;
        })
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
  const [buttons, setButtons] = useState<TemplateButton[]>([{ type: 'QUICK_REPLY', title: '' }]);

  // Format: TEXT | IMAGE | VIDEO | DOCUMENT | NONE
  const [headerFormat, setHeaderFormat] = useState('TEXT');
  const [headerImage, setHeaderImage] = useState<ImageFile | null>(null);
  const [headerVideo, setHeaderVideo] = useState<VideoFile | null>(null);
  const [headerDocument, setHeaderDocument] = useState<DocumentFile | null>(null);

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
    async (file: File, fileType: 'image' | 'video' | 'document') => {
      // 1. Create local preview URL immediately
      const localUrl = URL.createObjectURL(file);
      const tempFile = {
        url: localUrl,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      };

      if (fileType === 'image') {
        setHeaderImage(tempFile);
        setHeaderFormat('IMAGE');
      } else if (fileType === 'video') {
       setHeaderVideo(tempFile);
       setHeaderFormat('VIDEO');
      } else {
        setHeaderDocument(tempFile);
        setHeaderFormat('DOCUMENT');
      }

      if (!templateName.trim()) {
        // Just fail silently on upload but keep preview, or warn? 
        // Better: require name for upload but show preview. 
        // Actually, user prompts "name required" so we can't upload without it.
        // But for preview, we already set it.
        // We'll just alert and return, but the preview will show.
        setError('Please enter a template name to enable final upload');
        return null;
      }

      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', fileType);
        // Create a safe ID string
        const safeId = (templateName || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        formData.append('templateId', safeId);

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

        const uploadedFile = data.data;

        // 3. Update state with REAL S3 URL
        if (fileType === 'image') {
          setHeaderImage(uploadedFile);
        } else if (fileType === 'video') {
         setHeaderVideo(uploadedFile);
        } else {
          setHeaderDocument(uploadedFile);
        }

        return uploadedFile;
      } catch (err) {
        // Keep the local preview even if S3 upload fails
        // The tempFile with blob URL is already set above
        console.error('Upload failed:', err);
        setError(err instanceof Error ? err.message : 'Upload failed - using local preview');
        // Return the temp file so preview still works
        return tempFile;
      } finally {
        setUploading(false);
      }
    },
    [token, templateName]
  );

  const onPickImage = useCallback(
    async (file: File) => {
      await uploadFile(file, 'image');
    },
    [uploadFile]
  );

  const onPickVideo = useCallback(
    async (file: File) => {
      await uploadFile(file, 'video');
    },
    [uploadFile]
  );

  const onPickDocument = useCallback(
    async (file: File) => {
      await uploadFile(file, 'document');
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
      // Determine final header content
      let resolvedHeaderContent: string | undefined = undefined;
      let resolvedHeaderMedia: { kind: 'image' | 'video' | 'document'; url: string } | null = null;

      if (headerFormat === 'TEXT') {
          resolvedHeaderContent = headerText.trim() || undefined;
      } else if (headerFormat === 'IMAGE' && headerImage) {
          resolvedHeaderContent = headerImage.url;
          resolvedHeaderMedia = { kind: 'image', url: headerImage.url };
      } else if (headerFormat === 'VIDEO' && headerVideo) {
          resolvedHeaderContent = headerVideo.url;
          resolvedHeaderMedia = { kind: 'video', url: headerVideo.url };
      } else if (headerFormat === 'DOCUMENT' && headerDocument) {
          resolvedHeaderContent = headerDocument.url;
          resolvedHeaderMedia = { kind: 'document', url: headerDocument.url };
      }

      await crmFetch('/api/admin/crm/templates', {
        method: 'POST',
        body: {
          templateName: templateName.trim(),
          category,
          language,
          // We can construct a simple reliable string representation
          templateContent: buildPreviewText({ headerText, bodyText, footerText, buttons }),
          headerFormat,
          headerContent: resolvedHeaderContent,
          headerMedia: resolvedHeaderMedia || undefined,
          bodyText: bodyText.trim(),
          footerText: footerText.trim() || undefined,
          // Store richer button structure in the API if needed, but for now we map to what backend expects
          // or ideally, we send the whole object. Let's assume backend accepts extra fields or we pack them.
          // Since the prompt asks for the functionality, let's assume I can send rich button data.
          buttons: buttons.map((b) => ({ 
            title: b.title || '', 
            type: b.type,
            url: b.url,
            phoneNumber: b.phoneNumber
          })),
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
            <p className="text-gray-600 mt-1">Design rich message templates with media support (up to 25MB)</p>
          </div>
          <Link
            href="/admin"
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold transition-colors"
          >
            🏠 Home
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
                <div className="text-lg font-bold text-gray-900">Template Editor</div>
                <div className="text-xs text-gray-500">Design your message structure (Header - Body - Footer)</div>
              </div>

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

              <div className="px-5 pb-5 space-y-5">
                
                {/* Header Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Header Type</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    {(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'NONE'] as const).map(fmt => (
                       <button
                         key={fmt}
                         type="button"
                         onClick={() => setHeaderFormat(fmt)}
                         className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                           headerFormat === fmt 
                             ? 'bg-white text-[#1E7F43] shadow-sm' 
                             : 'text-gray-500 hover:text-gray-700'
                         }`}
                       >
                         {fmt}
                       </button>
                    ))}
                  </div>
                </div>

                {/* Header Content Inputs */}
                {headerFormat === 'TEXT' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Header Text</label>
                    <input
                      type="text"
                      placeholder="Enter header text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    />
                  </div>
                )}

                {headerFormat === 'IMAGE' && (
                   <div>
                     <label className="block text-sm font-semibold text-gray-900 mb-2">Header Image</label>
                     {!headerImage ? (
                       <label className="flex items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1E7F43] hover:bg-gray-50 cursor-pointer transition-colors">
                         <div className="text-center">
                           <div className="text-2xl mb-2">📷</div>
                           <div className="font-semibold text-gray-900">Upload Image</div>
                           <div className="text-xs text-gray-500">JPG, PNG (up to 25MB)</div>
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
                       <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group">
                         <img src={headerImage.url} alt="Header" className="w-full max-h-64 object-cover" />
                         <button 
                           type="button"
                           onClick={() => setHeaderImage(null)}
                           className="absolute top-2 right-2 bg-white/90 text-red-600 px-3 py-1 rounded-lg text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           Remove
                         </button>
                         <div className="px-4 py-2 bg-gray-100 text-xs text-gray-600 flex justify-between">
                            <span>{headerImage.fileName}</span>
                            <span>{(headerImage.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                         </div>
                       </div>
                     )}
                   </div>
                )}

                {headerFormat === 'VIDEO' && (
                   <div>
                     <label className="block text-sm font-semibold text-gray-900 mb-2">Header Video</label>
                     {!headerVideo ? (
                       <label className="flex items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1E7F43] hover:bg-gray-50 cursor-pointer transition-colors">
                         <div className="text-center">
                           <div className="text-2xl mb-2">🎬</div>
                           <div className="font-semibold text-gray-900">Upload Video</div>
                           <div className="text-xs text-gray-500">MP4, 3GP (up to 25MB)</div>
                         </div>
                         <input
                           type="file"
                           accept="video/*"
                           className="hidden"
                           disabled={uploading}
                           onChange={(e) => {
                             const f = e.target.files?.[0];
                             if (f) onPickVideo(f);
                           }}
                         />
                       </label>
                     ) : (
                       <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group">
                         <video src={headerVideo.url} controls className="w-full max-h-64 bg-black" />
                         <button 
                           type="button"
                           onClick={() => setHeaderVideo(null)}
                           className="absolute top-2 right-2 bg-white/90 text-red-600 px-3 py-1 rounded-lg text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           Remove
                         </button>
                         <div className="px-4 py-2 bg-gray-100 text-xs text-gray-600 flex justify-between">
                            <span>{headerVideo.fileName}</span>
                            <span>{(headerVideo.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                         </div>
                       </div>
                     )}
                   </div>
                )}

                {headerFormat === 'DOCUMENT' && (
                   <div>
                     <label className="block text-sm font-semibold text-gray-900 mb-2">Header Document</label>
                     {!headerDocument ? (
                       <label className="flex items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1E7F43] hover:bg-gray-50 cursor-pointer transition-colors">
                         <div className="text-center">
                           <div className="text-2xl mb-2">📄</div>
                           <div className="font-semibold text-gray-900">Upload Document</div>
                           <div className="text-xs text-gray-500">PDF, DOC, XLS (up to 25MB)</div>
                         </div>
                         <input
                           type="file"
                           accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                           className="hidden"
                           disabled={uploading}
                           onChange={(e) => {
                             const f = e.target.files?.[0];
                             if (f) onPickDocument(f);
                           }}
                         />
                       </label>
                     ) : (
                       <div className="relative flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                         <div className="text-2xl">📄</div>
                         <div className="flex-1 overflow-hidden">
                            <div className="font-semibold text-sm truncate">{headerDocument.fileName}</div>
                            <div className="text-xs text-gray-500">{(headerDocument.sizeBytes / 1024 / 1024).toFixed(2)} MB</div>
                         </div>
                         <button 
                           type="button"
                           onClick={() => setHeaderDocument(null)}
                           className="text-red-600 text-xs font-bold px-2 py-1 hover:bg-red-50 rounded"
                         >
                           Remove
                         </button>
                       </div>
                     )}
                   </div>
                )}


                {/* Body Text */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Message Body</label>
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
                    spellCheck
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Bold: <code>*text*</code> | Italic: <code>_text_</code> | Variables: <code>{'{{firstName}}'}</code>
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Footer Text</label>
                  <input
                    type="text"
                    placeholder="Optional footer text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                    spellCheck
                  />
                </div>

                {/* Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Buttons (optional)</label>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#1E7F43] hover:text-[#166235]"
                      onClick={() =>
                        setButtons((prev) =>
                          prev.length >= 3 ? prev : [...prev, { type: 'QUICK_REPLY', title: '' }]
                        )
                      }
                    >
                      + Add button
                    </button>
                  </div>
                  <div className="space-y-3">
                    {buttons.map((b, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Button {idx + 1}</label>
                          {buttons.length > 1 && (
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                              onClick={() =>
                                setButtons((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                            >
                              REMOVE
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <select
                              value={b.type}
                              onChange={(e) =>
                                setButtons((prev) =>
                                  prev.map((x, i) =>
                                    i === idx ? { ...x, type: e.target.value as ButtonType, title: '', url: '', phoneNumber: '' } : x
                                  )
                                )
                              }
                              className="w-1/3 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#1E7F43]"
                            >
                              <option value="QUICK_REPLY">Reply</option>
                              <option value="URL">Link (URL)</option>
                              <option value="PHONE_NUMBER">Phone</option>
                              <option value="CATALOG">Catalog</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Button text"
                              value={b.title}
                              onChange={(e) =>
                                setButtons((prev) =>
                                  prev.map((x, i) =>
                                    i === idx ? { ...x, title: e.target.value } : x
                                  )
                                )
                              }
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#1E7F43]"
                              maxLength={25}
                            />
                          </div>

                          {b.type === 'URL' && (
                            <input
                              type="url"
                              placeholder="https://example.com/join"
                              value={b.url || ''}
                              onChange={(e) =>
                                setButtons((prev) =>
                                  prev.map((x, i) =>
                                    i === idx ? { ...x, url: e.target.value } : x
                                  )
                                )
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#1E7F43]"
                            />
                          )}

                          {b.type === 'PHONE_NUMBER' && (
                             <input
                               type="tel"
                               placeholder="+91 99999 99999"
                               value={b.phoneNumber || ''}
                               onChange={(e) =>
                                 setButtons((prev) =>
                                   prev.map((x, i) =>
                                     i === idx ? { ...x, phoneNumber: e.target.value } : x
                                   )
                                 )
                               }
                               className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#1E7F43]"
                             />
                           )}
                           
                           {b.type === 'CATALOG' && (
                             <div className="text-xs text-gray-500 italic">
                               Opens your default WhatsApp catalog.
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                <div className="text-xs text-gray-500">Live preview</div>
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
                      {/* Header Preview */}
                      {headerFormat === 'TEXT' && headerText.trim() && (
                        <div className="text-sm font-bold text-gray-900 mb-2">{headerText}</div>
                      )}
                      
                      {headerFormat === 'IMAGE' && headerImage && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-gray-100">
                          {/* Changed from object-cover to h-auto to show full image */}
                          <img src={headerImage.url} alt="Preview" className="w-full h-auto" />
                        </div>
                      )}

                      {headerFormat === 'VIDEO' && headerVideo && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 bg-black flex items-center justify-center">
                           <video src={headerVideo.url} controls className="w-full max-h-64" />
                        </div>
                      )}

                      {headerFormat === 'DOCUMENT' && headerDocument && (
                        <div className="mb-3 p-3 rounded-lg border border-gray-100 bg-gray-50 flex items-center gap-3">
                           <div className="text-2xl">📄</div>
                           <div className="text-sm text-gray-700 truncate max-w-full">{headerDocument.fileName}</div>
                        </div>
                      )}

                      {/* Body Preview */}
                      <div
                        className="text-sm text-gray-800 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: formatPreviewMessage(
                            bodyText.trim() || 'Your message…'
                          ),
                        }}
                      />

                      {/* Footer Preview */}
                      {footerText.trim() && (
                        <div className="mt-2 pt-1 text-[11px] text-gray-500">
                          {footerText}
                        </div>
                      )}
                    </div>

                    {/* Buttons Preview */}
                    {previewButtons.length > 0 && (
                      <div className="mt-3 max-w-[92%]">
                        {previewButtons.map((b, idx) => (
                          <div key={idx} className="mt-2">
                            <button
                              type="button"
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-[#1E7F43] shadow-sm"
                            >
                              {b.title}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  <div className="font-semibold mb-2">Content saved:</div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono text-[10px]">
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
