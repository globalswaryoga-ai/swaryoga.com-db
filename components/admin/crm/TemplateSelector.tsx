'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Search, FileText, Image, Video, File, Check, ChevronDown, RefreshCw, Send } from 'lucide-react';

// Template type matching the API response
export type WhatsAppTemplate = {
  _id: string;
  templateName: string;
  templateContent: string;
  category?: string;
  language?: string;
  status?: string;
  createdAt?: string;
  headerFormat?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerContent?: string;
  footerText?: string;
  imageFile?: {
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  };
  documents?: Array<{
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  videoUrl?: string;
  buttons?: Array<{ title: string; type?: string; url?: string; phoneNumber?: string }>;
};

interface TemplateSelectorProps {
  token: string | null;
  onSelect: (template: WhatsAppTemplate) => void;
  selectedTemplateId?: string;
  onClose?: () => void;
  showSearch?: boolean;
  showFilters?: boolean;
  showPreview?: boolean;
  mode?: 'dropdown' | 'modal' | 'inline';
  className?: string;
  maxHeight?: string;
}

// WhatsApp text formatting function
function formatWhatsAppText(text: string): string {
  if (!text) return '';
  let formatted = text;
  formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
  formatted = formatted.replace(/~([^~]+)~/g, '<del>$1</del>');
  return formatted;
}

// Parse template content to extract header, body, footer, buttons
// Matches templates page parsing exactly
function parseTemplateContent(template: WhatsAppTemplate) {
  const lines = (template.templateContent || '').split('\n').filter(l => l.trim());
  
  // Extract text header from first line if it starts with * (bold marker)
  const firstLineIsBold = lines[0]?.startsWith('*') && lines[0]?.endsWith('*');
  const textHeader = firstLineIsBold ? lines[0].replace(/^\*|\*$/g, '').trim() : '';
  
  // headerContent from DB might be URL (for IMAGE type) - don't display URLs
  const dbHeaderContent = template.headerContent || '';
  const isUrlHeader = dbHeaderContent.startsWith('http') || dbHeaderContent.startsWith('blob:');
  
  // Use text header from templateContent, or non-URL headerContent from DB
  const headerText = textHeader || (isUrlHeader ? '' : dbHeaderContent);
  
  const footerText = template.footerText || '';
  
  // Extract buttons from content (lines starting with •, -, or [QUICK_REPLY])
  const buttonLines = lines.filter(l => 
    l.trim().startsWith('•') || 
    l.includes('[QUICK_REPLY]') ||
    l.includes('• [')
  );
  const buttons = buttonLines.map(b => ({
    title: b.replace(/^[•\-]\s*/, '')
           .replace(/\[QUICK_REPLY\]\s*/g, '')
           .trim()
  })).filter(b => b.title.length > 0 && b.title.length < 50);
  
  // Also use buttons from template.buttons if present and no buttons parsed
  const finalButtons = buttons.length > 0 ? buttons : (template.buttons || []);
  
  // Body is everything except header (first bold line), buttons, footer, and URLs
  const bodyLines = lines.filter((l, idx) => {
    const trimmed = l.trim();
    // Skip button lines
    if (trimmed.startsWith('•') || l.includes('[QUICK_REPLY]')) return false;
    // Skip first line if it's the header
    if (idx === 0 && firstLineIsBold) return false;
    // Skip footer line
    if (footerText && trimmed === footerText.trim()) return false;
    // Skip URLs (http://, https://, blob:)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) return false;
    return true;
  });
  const body = bodyLines.join('\n').trim();

  return {
    headerText,
    body,
    footer: footerText,
    buttons: finalButtons,
  };
}

// Template preview component (WhatsApp style - matches templates page exactly)
function TemplatePreview({ template, token }: { template: WhatsAppTemplate; token: string | null }) {
  const [imageError, setImageError] = useState(false);

  // Use direct S3 URL (bucket is public-read for template images)
  const imageUrl = template.imageFile?.url || '';
  const isValidImageUrl = imageUrl && !imageUrl.startsWith('blob:') && imageUrl.startsWith('http');

  // Parse template content
  const parsed = useMemo(() => parseTemplateContent(template), [template]);

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden" style={{ background: '#E5DDD5' }}>
      <div className="p-4">
        {/* WhatsApp message bubble */}
        <div className="max-w-[92%] rounded-2xl overflow-hidden shadow-sm" style={{ background: '#ffffff' }}>
          {/* Header Image */}
          {template.imageFile && (
            <div className="w-full bg-gray-100 rounded-t-xl overflow-hidden">
              {!isValidImageUrl || imageError ? (
                <div className="w-full h-40 flex items-center justify-center bg-gray-100">
                  <div className="text-gray-400 text-center">
                    <div className="text-3xl mb-1">🖼️</div>
                    <div className="text-xs">Image</div>
                  </div>
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt="Template header"
                  className="w-full max-h-48 object-cover"
                  onError={() => setImageError(true)}
                />
              )}
            </div>
          )}

          {/* Header Video */}
          {template.videoUrl && !template.imageFile && (
            <div className="w-full bg-gray-900 flex items-center justify-center py-8 rounded-t-xl">
              <Video className="w-12 h-12 text-white opacity-60" />
            </div>
          )}

          {/* Message Content */}
          <div className="px-4 py-3">
            {/* Header Text (bold) */}
            {parsed.headerText && (
              <div className="text-sm font-bold text-gray-900 mb-1">
                {parsed.headerText}
              </div>
            )}

            {/* Body Text */}
            <div
              className="text-[13px] text-gray-800 whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatWhatsAppText(parsed.body || '') }}
            />

            {/* Footer */}
            {parsed.footer && (
              <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                {parsed.footer}
              </div>
            )}
          </div>
        </div>

        {/* Buttons (outside bubble like WhatsApp) */}
        {parsed.buttons && parsed.buttons.length > 0 && (
          <div className="mt-2 max-w-[92%]">
            {parsed.buttons.slice(0, 3).map((btn, idx) => (
              <div key={idx} className="mt-2">
                <button
                  type="button"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-[#1E7F43] text-center hover:bg-gray-50 transition-colors"
                >
                  {btn.title || 'Button'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Template card for list view
function TemplateCard({
  template,
  isSelected,
  onClick,
  onUse,
}: {
  template: WhatsAppTemplate;
  isSelected: boolean;
  onClick: () => void;
  onUse: () => void;
}) {
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'MARKETING':
        return '📢';
      case 'TRANSACTIONAL':
        return '💳';
      case 'OTP':
        return '🔐';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'disabled':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const hasMedia = template.imageFile || template.videoUrl || (template.documents && template.documents.length > 0);

  return (
    <div
      className={`w-full text-left p-3 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-[#00A884] bg-[#E6F4EC] ring-2 ring-[#00A884]/20'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox for selection */}
        <div 
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            isSelected 
              ? 'bg-[#00A884] border-[#00A884] text-white' 
              : 'border-gray-300 hover:border-[#00A884] bg-white'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {isSelected && <Check size={14} strokeWidth={3} />}
        </div>

        {/* Media indicator */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'bg-[#00A884] text-white' : 'bg-gray-100 text-gray-500'
        }`}>
          {hasMedia ? (
            template.imageFile ? (
              <Image size={18} />
            ) : template.videoUrl ? (
              <Video size={18} />
            ) : (
              <File size={18} />
            )
          ) : (
            <FileText size={18} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-between">
            <span className="font-bold text-gray-900 truncate">{template.templateName}</span>
            {/* Quick Use Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUse();
              }}
              className="px-3 py-1 bg-[#00A884] hover:bg-[#008f6f] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              <Send size={12} />
              Use
            </button>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {template.language && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                {template.language.toUpperCase()}
              </span>
            )}
            {template.category && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-semibold">
                {getCategoryIcon(template.category)} {template.category}
              </span>
            )}
            {template.status && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${getStatusColor(template.status)}`}>
                {template.status}
              </span>
            )}
          </div>

          {/* Preview text - cleaned of [QUICK_REPLY] markers */}
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
            {(template.templateContent || '')
              .replace(/•\s*\[QUICK_REPLY\][^\n]*/gi, '')
              .replace(/\[QUICK_REPLY\][^\n]*/gi, '')
              .trim()
              .substring(0, 100)}
            {(template.templateContent?.length || 0) > 100 ? '...' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function TemplateSelector({
  token,
  onSelect,
  selectedTemplateId,
  onClose,
  showSearch = true,
  showFilters = true,
  showPreview = true,
  mode = 'inline',
  className = '',
  maxHeight = '500px',
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/crm/templates?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load templates');

      const data = await res.json();
      const templatesFromApi =
        (Array.isArray(data?.data?.templates) ? data.data.templates : null) ??
        (Array.isArray(data?.templates) ? data.templates : null) ??
        [];

      setTemplates(templatesFromApi);

      // Set preview to selected template if exists
      if (selectedTemplateId) {
        const selected = templatesFromApi.find((t: WhatsAppTemplate) => t._id === selectedTemplateId);
        if (selected) setPreviewTemplate(selected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [token, selectedTemplateId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.templateContent.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !filterCategory || t.category === filterCategory;
      const matchesLanguage = !filterLanguage || t.language === filterLanguage;
      return matchesSearch && matchesCategory && matchesLanguage;
    });
  }, [templates, searchQuery, filterCategory, filterLanguage]);

  // Get unique categories and languages for filters
  const categories = useMemo(() => {
    return Array.from(new Set(templates.map((t) => t.category).filter(Boolean)));
  }, [templates]);

  const languages = useMemo(() => {
    return Array.from(new Set(templates.map((t) => t.language).filter(Boolean)));
  }, [templates]);

  const handleSelect = (template: WhatsAppTemplate) => {
    // Set preview for display
    setPreviewTemplate(template);
  };

  const handleUseTemplate = (template: WhatsAppTemplate) => {
    console.log('[TemplateSelector] Using template:', template.templateName);
    onSelect(template);
    if (onClose) onClose();
  };

  // Double-click on card to immediately use template
  const handleDoubleClick = (template: WhatsAppTemplate) => {
    handleUseTemplate(template);
  };

  const content = (
    <div className={`flex flex-col ${className}`} style={{ maxHeight }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">📋 Message Templates</h3>
          <p className="text-xs text-gray-500">{filteredTemplates.length} templates available</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTemplates}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      {(showSearch || showFilters) && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-2">
          {showSearch && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00A884]/20 focus:border-[#00A884] outline-none"
              />
            </div>
          )}

          {showFilters && (
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00A884]/20 focus:border-[#00A884] outline-none bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'MARKETING' ? '📢' : cat === 'TRANSACTIONAL' ? '💳' : '🔐'} {cat}
                  </option>
                ))}
              </select>

              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00A884]/20 focus:border-[#00A884] outline-none bg-white"
              >
                <option value="">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === 'en' ? '🇬🇧' : '🇮🇳'} {lang?.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Template List */}
        <div className={`${showPreview && previewTemplate ? 'w-1/2' : 'w-full'} overflow-y-auto p-3 space-y-2`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 text-sm mb-2">{error}</p>
              <button
                type="button"
                onClick={fetchTemplates}
                className="text-sm text-[#00A884] font-semibold hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {searchQuery || filterCategory || filterLanguage
                  ? 'No templates match your filters'
                  : 'No templates available'}
              </p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <TemplateCard
                key={template._id}
                template={template}
                isSelected={selectedTemplateId === template._id || previewTemplate?._id === template._id}
                onClick={() => handleSelect(template)}
                onUse={() => handleUseTemplate(template)}
              />
            ))
          )}
        </div>

        {/* Preview Panel */}
        {showPreview && previewTemplate && (
          <div className="w-1/2 border-l border-gray-200 p-3 bg-gray-50 overflow-y-auto">
            <div className="mb-3">
              <h4 className="font-bold text-gray-900 text-sm">{previewTemplate.templateName}</h4>
              <p className="text-xs text-gray-500">Preview</p>
            </div>
            <TemplatePreview template={previewTemplate} token={token} />
            
            {/* Use Template Button */}
            <button
              type="button"
              onClick={() => handleUseTemplate(previewTemplate)}
              className="w-full mt-4 px-4 py-3 bg-[#00A884] hover:bg-[#008f6f] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Check size={18} />
              Use This Template
            </button>
          </div>
        )}
      </div>
      
      {/* Footer with Use Template button (when template selected but no preview panel) */}
      {!showPreview && previewTemplate && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => handleUseTemplate(previewTemplate)}
            className="w-full px-4 py-3 bg-[#00A884] hover:bg-[#008f6f] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Check size={18} />
            Use Template: {previewTemplate.templateName}
          </button>
        </div>
      )}
    </div>
  );

  // Render based on mode
  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
          {content}
        </div>
      </div>
    );
  }

  if (mode === 'dropdown') {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
        {content}
      </div>
    );
  }

  // inline mode (default)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {content}
    </div>
  );
}

// Export the template type for use in other components
export { formatWhatsAppText };
