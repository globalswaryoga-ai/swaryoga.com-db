'use client';

import { useState, useCallback } from 'react';
import { 
  X, 
  Download, 
  Maximize2, 
  Play, 
  File, 
  FileText, 
  Image as ImageIcon,
  Video,
  ExternalLink,
  Loader2
} from 'lucide-react';

// ======================
// TYPE DEFINITIONS
// ======================

export type MediaType = 'image' | 'video' | 'document' | 'audio' | 'unknown';

export interface MediaFile {
  url: string;
  name?: string;
  type?: MediaType;
  mimeType?: string;
  size?: number;
  thumbnailUrl?: string;
}

export interface MediaPreviewProps {
  /** Single media or array of media files */
  media: MediaFile | MediaFile[] | string | string[];
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show download button */
  showDownload?: boolean;
  /** Show expand/lightbox button */
  showExpand?: boolean;
  /** Allow removal (shows X button) */
  onRemove?: (index: number) => void;
  /** Custom class for container */
  className?: string;
  /** Max items to show before "+N more" */
  maxVisible?: number;
  /** Thumbnail mode - show compact grid */
  thumbnailMode?: boolean;
  /** Alt text for accessibility */
  alt?: string;
}

// ======================
// UTILITY FUNCTIONS
// ======================

/**
 * Detect media type from URL or MIME type
 */
export function detectMediaType(url: string, mimeType?: string): MediaType {
  if (!url) return 'unknown';
  
  // Check by MIME type first
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf' || 
        mimeType.includes('document') || 
        mimeType.includes('spreadsheet') ||
        mimeType.includes('text/')) return 'document';
  }
  
  // Check by file extension
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogg'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (docExts.includes(ext)) return 'document';
  
  // Check URL patterns
  if (url.includes('/image') || url.includes('images/')) return 'image';
  if (url.includes('/video') || url.includes('videos/')) return 'video';
  
  return 'unknown';
}

/**
 * Get filename from URL
 */
export function getFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'file';
    // Decode and clean up
    return decodeURIComponent(filename).replace(/^\d+-/, ''); // Remove timestamp prefix
  } catch {
    return url.split('/').pop() || 'file';
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Normalize media input to array of MediaFile
 */
function normalizeMedia(media: MediaPreviewProps['media']): MediaFile[] {
  if (!media) return [];
  
  const arr = Array.isArray(media) ? media : [media];
  
  return arr.map((item) => {
    if (typeof item === 'string') {
      return {
        url: item,
        type: detectMediaType(item),
        name: getFilenameFromUrl(item),
      };
    }
    return {
      ...item,
      type: item.type || detectMediaType(item.url, item.mimeType),
      name: item.name || getFilenameFromUrl(item.url),
    };
  });
}

// ======================
// SIZE CONFIGURATIONS
// ======================

const sizeClasses = {
  xs: 'w-10 h-10',
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-40 h-40',
  xl: 'w-60 h-60',
};

const iconSizes = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
};

// ======================
// LIGHTBOX COMPONENT
// ======================

interface LightboxProps {
  media: MediaFile;
  onClose: () => void;
  onDownload?: () => void;
}

function Lightbox({ media, onClose, onDownload }: LightboxProps) {
  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
      >
        <X size={24} />
      </button>
      
      {/* Download button */}
      {onDownload && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="absolute top-4 right-16 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <Download size={24} />
        </button>
      )}
      
      {/* Media content */}
      <div 
        className="max-w-[90vw] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === 'image' && (
          <img 
            src={media.url} 
            alt={media.name || 'Preview'} 
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
        )}
        
        {media.type === 'video' && (
          <video 
            src={media.url} 
            controls 
            autoPlay
            className="max-w-full max-h-[85vh] rounded-lg"
          />
        )}
        
        {media.type === 'audio' && (
          <div className="bg-slate-800 p-8 rounded-lg">
            <div className="text-white mb-4 text-center">{media.name}</div>
            <audio src={media.url} controls autoPlay className="w-full min-w-[300px]" />
          </div>
        )}
        
        {media.type === 'document' && (
          <div className="bg-white p-8 rounded-lg text-center">
            <FileText size={64} className="mx-auto mb-4 text-blue-500" />
            <div className="text-lg font-medium mb-2">{media.name}</div>
            {media.size && <div className="text-gray-500 mb-4">{formatFileSize(media.size)}</div>}
            <div className="flex gap-2 justify-center">
              <a 
                href={media.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <ExternalLink size={18} /> Open
              </a>
              <button 
                onClick={onDownload}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center gap-2"
              >
                <Download size={18} /> Download
              </button>
            </div>
          </div>
        )}
        
        {media.type === 'unknown' && (
          <div className="bg-white p-8 rounded-lg text-center">
            <File size={64} className="mx-auto mb-4 text-gray-400" />
            <div className="text-lg">{media.name}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ======================
// SINGLE MEDIA ITEM
// ======================

interface MediaItemProps {
  media: MediaFile;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showDownload?: boolean;
  showExpand?: boolean;
  onRemove?: () => void;
  onExpand?: () => void;
  className?: string;
}

function MediaItem({ 
  media, 
  size, 
  showDownload, 
  showExpand, 
  onRemove, 
  onExpand,
  className = '' 
}: MediaItemProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = media.name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback: open in new tab
      window.open(media.url, '_blank');
    }
  }, [media.url, media.name]);
  
  const iconSize = iconSizes[size];
  
  // Render based on media type
  const renderContent = () => {
    switch (media.type) {
      case 'image':
        return (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <Loader2 size={iconSize} className="animate-spin text-slate-400" />
              </div>
            )}
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <ImageIcon size={iconSize} className="text-slate-500" />
              </div>
            ) : (
              <img 
                src={media.thumbnailUrl || media.url} 
                alt={media.name || 'Image'} 
                className="w-full h-full object-cover"
                onLoad={() => setLoading(false)}
                onError={() => { setError(true); setLoading(false); }}
              />
            )}
          </>
        );
        
      case 'video':
        return (
          <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
            {media.thumbnailUrl ? (
              <img 
                src={media.thumbnailUrl} 
                alt={media.name || 'Video'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <Video size={iconSize} className="text-slate-400" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Play size={20} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
          </div>
        );
        
      case 'audio':
        return (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Play size={16} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
        );
        
      case 'document':
        return (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-2">
            <FileText size={iconSize} className="text-white" />
            {size !== 'xs' && size !== 'sm' && (
              <span className="absolute bottom-1 left-0 right-0 text-[10px] text-white/80 text-center truncate px-1">
                {media.name?.split('.').pop()?.toUpperCase()}
              </span>
            )}
          </div>
        );
        
      default:
        return (
          <div className="w-full h-full bg-slate-700 flex items-center justify-center">
            <File size={iconSize} className="text-slate-400" />
          </div>
        );
    }
  };
  
  return (
    <div 
      className={`
        relative ${sizeClasses[size]} rounded-lg overflow-hidden 
        border border-slate-600 group cursor-pointer
        hover:border-blue-500 transition-colors
        ${className}
      `}
      onClick={onExpand}
    >
      {renderContent()}
      
      {/* Overlay with actions */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
        {showExpand && (
          <button 
            onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
            className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30"
          >
            <Maximize2 size={14} className="text-white" />
          </button>
        )}
        {showDownload && (
          <button 
            onClick={handleDownload}
            className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30"
          >
            <Download size={14} className="text-white" />
          </button>
        )}
      </div>
      
      {/* Remove button */}
      {onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center 
                     opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
        >
          <X size={12} className="text-white" />
        </button>
      )}
    </div>
  );
}

// ======================
// MAIN COMPONENT
// ======================

export function MediaPreview({
  media,
  size = 'md',
  showDownload = true,
  showExpand = true,
  onRemove,
  className = '',
  maxVisible = 4,
  thumbnailMode = false,
  alt,
}: MediaPreviewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const mediaFiles = normalizeMedia(media);
  
  if (mediaFiles.length === 0) return null;
  
  const visibleMedia = maxVisible ? mediaFiles.slice(0, maxVisible) : mediaFiles;
  const hiddenCount = mediaFiles.length - visibleMedia.length;
  
  const handleDownload = useCallback((mediaFile: MediaFile) => {
    const a = document.createElement('a');
    a.href = mediaFile.url;
    a.download = mediaFile.name || 'download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);
  
  // Single media - simpler render
  if (mediaFiles.length === 1 && !thumbnailMode) {
    const singleMedia = mediaFiles[0];
    return (
      <>
        <MediaItem 
          media={singleMedia}
          size={size}
          showDownload={showDownload}
          showExpand={showExpand}
          onRemove={onRemove ? () => onRemove(0) : undefined}
          onExpand={() => setLightboxIndex(0)}
          className={className}
        />
        
        {lightboxIndex !== null && (
          <Lightbox 
            media={singleMedia}
            onClose={() => setLightboxIndex(null)}
            onDownload={() => handleDownload(singleMedia)}
          />
        )}
      </>
    );
  }
  
  // Multiple media - grid render
  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {visibleMedia.map((mediaFile, index) => (
          <MediaItem 
            key={`${mediaFile.url}-${index}`}
            media={mediaFile}
            size={thumbnailMode ? 'sm' : size}
            showDownload={showDownload}
            showExpand={showExpand}
            onRemove={onRemove ? () => onRemove(index) : undefined}
            onExpand={() => setLightboxIndex(index)}
          />
        ))}
        
        {hiddenCount > 0 && (
          <div 
            className={`
              ${sizeClasses[thumbnailMode ? 'sm' : size]} rounded-lg 
              bg-slate-700 flex items-center justify-center cursor-pointer
              hover:bg-slate-600 transition-colors border border-slate-600
            `}
            onClick={() => setLightboxIndex(maxVisible)}
          >
            <span className="text-slate-300 font-medium">+{hiddenCount}</span>
          </div>
        )}
      </div>
      
      {lightboxIndex !== null && lightboxIndex < mediaFiles.length && (
        <Lightbox 
          media={mediaFiles[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onDownload={() => handleDownload(mediaFiles[lightboxIndex])}
        />
      )}
    </>
  );
}

// ======================
// ADDITIONAL EXPORTS
// ======================

/**
 * Inline preview for messages (compact version)
 */
export function InlineMediaPreview({ 
  url, 
  type,
  className = '' 
}: { 
  url: string; 
  type?: MediaType;
  className?: string;
}) {
  const mediaType = type || detectMediaType(url);
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Don't render anything if no URL provided or URL is not valid
  // URL must start with http://, https://, data:, blob:, or / (relative URLs for proxied content)
  if (!url || url.trim() === '' || 
      (!url.startsWith('http://') && !url.startsWith('https://') && 
       !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('/'))) {
    return null;
  }
  
  if (mediaType === 'image') {
    // Show fallback on error
    if (imageError) {
      return (
        <div 
          className={`flex items-center gap-2 p-3 bg-slate-100 rounded-lg ${className}`}
          title={`Image failed to load: ${url}`}
        >
          <span className="text-xl">🖼️</span>
          <span className="text-xs text-slate-500">Image not available</span>
        </div>
      );
    }
    
    return (
      <>
        <img 
          src={url} 
          alt="Media" 
          className={`w-full max-w-[320px] rounded-lg cursor-pointer hover:opacity-90 ${className}`}
          onClick={() => setExpanded(true)}
          onError={() => {
            console.warn('[MediaPreview] Failed to load image:', url);
            setImageError(true);
          }}
        />
        {expanded && (
          <Lightbox 
            media={{ url, type: 'image', name: getFilenameFromUrl(url) }}
            onClose={() => setExpanded(false)}
          />
        )}
      </>
    );
  }
  
  if (mediaType === 'video') {
    return (
      <video 
        src={url} 
        controls 
        className={`max-w-[300px] max-h-[200px] rounded-lg ${className}`}
      />
    );
  }
  
  if (mediaType === 'audio') {
    return (
      <audio src={url} controls className={`max-w-[250px] ${className}`} />
    );
  }
  
  // Document or unknown
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`flex items-center gap-2 p-2 bg-slate-700 rounded-lg hover:bg-slate-600 max-w-[200px] ${className}`}
    >
      <FileText size={20} className="text-blue-400 shrink-0" />
      <span className="text-sm text-slate-200 truncate">{getFilenameFromUrl(url)}</span>
    </a>
  );
}

export default MediaPreview;
