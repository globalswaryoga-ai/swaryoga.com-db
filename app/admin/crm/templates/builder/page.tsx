'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox } from '@/components/admin/crm';

// Meta WhatsApp Template Character Limits
const LIMITS = {
  HEADER_TEXT: 60,
  BODY_TEXT: 1024,
  FOOTER_TEXT: 60,
  BUTTON_TEXT: 25,
  TEMPLATE_NAME: 512,
};

// Character counter component with visual feedback
function CharacterCounter({ current, max, label }: { current: number; max: number; label?: string }) {
  const percentage = (current / max) * 100;
  const isWarning = percentage >= 80 && percentage < 100;
  const isError = percentage >= 100;
  
  return (
    <div className={`text-xs ${isError ? 'text-red-600 font-semibold' : isWarning ? 'text-amber-600' : 'text-gray-500'}`}>
      {label && <span>{label}: </span>}
      {current}/{max} {isError && '⚠️ Limit exceeded'}
    </div>
  );
}

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
  const searchParams = useSearchParams();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  // Provider: 'meta' (needs Meta approval) or 'qr' (no approval, QR only)
  const providerParam = searchParams?.get('provider');
  const [provider, setProvider] = useState<'meta' | 'qr'>(providerParam === 'qr' ? 'qr' : 'meta');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiCorrecting, setAiCorrecting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

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

  // Spell check state for suggestions popup
  const [spellSuggestions, setSpellSuggestions] = useState<{ word: string; suggestions: string[]; field: 'body' | 'header' | 'footer'; position: { x: number; y: number } } | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const headerRef = useRef<HTMLInputElement | null>(null);
  const footerRef = useRef<HTMLInputElement | null>(null);

  // Validation checks
  const isOverLimit = useMemo(() => ({
    templateName: templateName.length > LIMITS.TEMPLATE_NAME,
    headerText: headerText.length > LIMITS.HEADER_TEXT,
    bodyText: bodyText.length > LIMITS.BODY_TEXT,
    footerText: footerText.length > LIMITS.FOOTER_TEXT,
    buttons: buttons.some(b => b.title.length > LIMITS.BUTTON_TEXT),
  }), [templateName, headerText, bodyText, footerText, buttons]);

  const hasValidationErrors = Object.values(isOverLimit).some(Boolean);

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

  // Handle right-click on misspelled words for suggestions
  const handleSpellCheck = useCallback(async (
    e: React.MouseEvent<HTMLTextAreaElement | HTMLInputElement>,
    field: 'body' | 'header' | 'footer'
  ) => {
    const target = e.target as HTMLTextAreaElement | HTMLInputElement;
    const text = target.value;
    
    // Get the word at cursor position
    const cursorPos = target.selectionStart || 0;
    const words = text.split(/\s+/);
    let charCount = 0;
    let selectedWord = '';
    let wordStart = 0;
    
    for (const word of words) {
      if (cursorPos >= charCount && cursorPos <= charCount + word.length) {
        selectedWord = word.replace(/[.,!?;:'"()]/g, '');
        wordStart = charCount;
        break;
      }
      charCount += word.length + 1;
    }
    
    if (selectedWord && selectedWord.length > 2) {
      // Use AI to get spelling suggestions
      try {
        const res = await crmFetch('/api/admin/crm/spell-suggest', {
          method: 'POST',
          body: JSON.stringify({ word: selectedWord, language }),
        });
        const data = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setSpellSuggestions({
            word: selectedWord,
            suggestions: data.suggestions,
            field,
            position: { x: e.clientX, y: e.clientY },
          });
        }
      } catch (err) {
        console.error('Spell check error:', err);
      }
    }
  }, [crmFetch, language]);

  // Apply spelling correction
  const applySuggestion = useCallback((suggestion: string) => {
    if (!spellSuggestions) return;
    
    const { word, field } = spellSuggestions;
    
    if (field === 'body') {
      setBodyText(prev => prev.replace(new RegExp(`\\b${word}\\b`, 'gi'), suggestion));
    } else if (field === 'header') {
      setHeaderText(prev => prev.replace(new RegExp(`\\b${word}\\b`, 'gi'), suggestion));
    } else if (field === 'footer') {
      setFooterText(prev => prev.replace(new RegExp(`\\b${word}\\b`, 'gi'), suggestion));
    }
    
    setSpellSuggestions(null);
  }, [spellSuggestions]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = () => setSpellSuggestions(null);
    if (spellSuggestions) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [spellSuggestions]);

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
  }, [bodyText, token]);

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
          provider, // 'meta' or 'qr'
          category,
          language,
          // Store ONLY the body text, not buttons - they're stored separately
          templateContent: bodyText.trim(),
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
      router.push(`/admin/crm/templates?success=created&provider=${provider}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Spell suggestions popup */}
      {spellSuggestions && (
        <div 
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2 min-w-[150px]"
          style={{ left: spellSuggestions.position.x, top: spellSuggestions.position.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs text-gray-500 px-2 py-1 border-b mb-1">
            Replace &quot;{spellSuggestions.word}&quot; with:
          </div>
          {spellSuggestions.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applySuggestion(s)}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-[#1E7F43] hover:text-white rounded transition-colors"
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSpellSuggestions(null)}
            className="block w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 border-t mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Template</h1>
            <p className="text-gray-600 mt-1">Design rich message templates with media support (up to 25MB)</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowGuidelines(!showGuidelines)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                showGuidelines 
                  ? 'bg-[#1E7F43] text-white' 
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
              }`}
            >
              📋 {showGuidelines ? 'Hide' : 'View'} Meta Guidelines
            </button>
            <Link
              href="/admin"
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold transition-colors"
            >
              🏠 Home
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {/* Meta Guidelines Panel */}
        {showGuidelines && (
          <div className="mb-6 p-5 bg-gradient-to-r from-indigo-50 to-indigo-50 border border-indigo-200 rounded-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-gray-900 mb-3">📋 Meta WhatsApp Template Guidelines</h3>
              <button 
                type="button" 
                onClick={() => setShowGuidelines(false)}
                className="text-gray-400 hover:text-gray-600"
              >✕</button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                  <div className="font-semibold text-indigo-800 mb-1">✅ Content Requirements</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• Use proper grammar and spelling</li>
                    <li>• Include clear opt-out instructions for marketing</li>
                    <li>• Variables format: {"{{1}}"}, {"{{2}}"}, etc.</li>
                    <li>• Be concise and clear in messaging</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-white rounded-xl border border-green-100">
                  <div className="font-semibold text-green-800 mb-1">📏 Character Limits</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• Header text: <strong>{LIMITS.HEADER_TEXT}</strong> characters max</li>
                    <li>• Body text: <strong>{LIMITS.BODY_TEXT}</strong> characters max</li>
                    <li>• Footer text: <strong>{LIMITS.FOOTER_TEXT}</strong> characters max</li>
                    <li>• Button text: <strong>{LIMITS.BUTTON_TEXT}</strong> characters max</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-red-100">
                  <div className="font-semibold text-red-800 mb-1">❌ Avoid These</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• URL shorteners (bit.ly, tinyurl)</li>
                    <li>• Misleading or deceptive content</li>
                    <li>• Threats or abusive language</li>
                    <li>• Impersonating other businesses</li>
                    <li>• Financial/medical advice without disclaimer</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-white rounded-xl border border-amber-100">
                  <div className="font-semibold text-amber-800 mb-1">⏱️ Approval Timeline</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• <strong>UTILITY/AUTH:</strong> Instant to few hours</li>
                    <li>• <strong>MARKETING:</strong> 24-48 hours review</li>
                    <li>• Rejection? Edit and resubmit</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {hasValidationErrors && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700 font-semibold">⚠️ Character limit exceeded - please reduce text length</div>
          </div>
        )}
        {uploading && (
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="text-sm text-indigo-700">📤 Uploading file to S3...</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="text-lg font-bold text-gray-900">Template Editor</div>
                <div className="text-xs text-gray-500">Design your message structure (Header - Body - Footer)</div>
              </div>

              {/* Provider Selection */}
              <div className="px-5 pt-5 pb-2">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Template Type *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setProvider('meta')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                      provider === 'meta'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">📘</span>
                      <span className="font-bold">Meta Template</span>
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      Requires approval • Works in both inboxes
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider('qr')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                      provider === 'qr'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">📱</span>
                      <span className="font-bold">QR Template</span>
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      Auto-approved • QR inbox only
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Template Name *</label>
                    <CharacterCounter current={templateName.length} max={LIMITS.TEMPLATE_NAME} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Welcome Message"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent ${
                      isOverLimit.templateName ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    maxLength={LIMITS.TEMPLATE_NAME}
                    spellCheck
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
                      <option value="UTILITY">🔧 Utility</option>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-900">Header Text</label>
                      <CharacterCounter current={headerText.length} max={LIMITS.HEADER_TEXT} />
                    </div>
                    <input
                      ref={headerRef}
                      type="text"
                      placeholder="Enter header text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      onContextMenu={(e) => handleSpellCheck(e, 'header')}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent ${
                        isOverLimit.headerText ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                      maxLength={LIMITS.HEADER_TEXT + 10}
                      spellCheck
                    />
                    <div className="mt-1 text-xs text-gray-400">💡 Right-click on underlined words for spelling suggestions</div>
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
                         <img src={getProxiedMediaUrl(headerImage.url, token)} alt="Header" className="w-full max-h-64 object-cover" />
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
                    <label className="block text-sm font-semibold text-gray-900">Message Body *</label>
                    <div className="flex items-center gap-2">
                      <CharacterCounter current={bodyText.length} max={LIMITS.BODY_TEXT} />
                      <div className="w-px h-5 bg-gray-200 mx-1" />
                      <button
                        type="button"
                        className="px-3 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                        onClick={applyAutocorrectBody}
                        disabled={!bodyText.trim() || aiCorrecting || uploading}
                        title="AI Auto-correct spelling & grammar"
                      >
                        {aiCorrecting ? '⏳' : '✅ Fix'}
                      </button>

                      <button
                        type="button"
                        className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 font-extrabold"
                        onClick={() => applyFormat('*', '*')}
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 italic font-semibold"
                        onClick={() => applyFormat('_', '_')}
                        title="Italic"
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
                    onContextMenu={(e) => handleSpellCheck(e, 'body')}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm ${
                      isOverLimit.bodyText ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    spellCheck={true}
                    lang="en"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Bold: <code>*text*</code> | Italic: <code>_text_</code> | Variables: <code>{'{{1}}'}</code></span>
                    <span className="text-gray-400">💡 Right-click misspelled words for suggestions</span>
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">Footer Text</label>
                    <CharacterCounter current={footerText.length} max={LIMITS.FOOTER_TEXT} />
                  </div>
                  <input
                    ref={footerRef}
                    type="text"
                    placeholder="Optional footer text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    onContextMenu={(e) => handleSpellCheck(e, 'footer')}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent ${
                      isOverLimit.footerText ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    maxLength={LIMITS.FOOTER_TEXT + 10}
                    spellCheck={true}
                    lang="en"
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
                            <div className="flex-1 relative">
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
                                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-[#1E7F43] ${
                                  b.title.length > LIMITS.BUTTON_TEXT ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                }`}
                                maxLength={LIMITS.BUTTON_TEXT + 5}
                              />
                              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${
                                b.title.length > LIMITS.BUTTON_TEXT ? 'text-red-500 font-semibold' : 'text-gray-400'
                              }`}>
                                {b.title.length}/{LIMITS.BUTTON_TEXT}
                              </span>
                            </div>
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
                    href="/admin/crm/meta/templates"
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-center"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={saving || uploading || hasValidationErrors}
                    className="flex-1 px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
                  >
                    {saving ? 'Creating…' : uploading ? 'Uploading…' : hasValidationErrors ? '⚠️ Fix Errors First' : '+ Create Template'}
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
                          <img src={getProxiedMediaUrl(headerImage.url, token)} alt="Preview" className="w-full h-auto" />
                        </div>
                      )}

                      {headerFormat === 'VIDEO' && headerVideo && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 bg-black flex items-center justify-center">
                           <video src={getProxiedMediaUrl(headerVideo.url, token)} controls className="w-full max-h-64" />
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
