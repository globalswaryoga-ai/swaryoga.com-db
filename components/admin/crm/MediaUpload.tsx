'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { MediaPreview, detectMediaType, formatFileSize, MediaFile } from './MediaPreview';

// ======================
// TYPE DEFINITIONS
// ======================

export type UploadFileType = 'image' | 'video' | 'document' | 'all';
export type AccessLevel = 'public' | 'admin' | 'community';

export interface MediaUploadProps {
  /** Callback when files are uploaded successfully */
  onUpload: (files: UploadedFile[]) => void;
  /** Callback when upload fails */
  onError?: (error: string) => void;
  /** Current uploaded files (for showing preview) */
  currentFiles?: MediaFile[];
  /** Callback when a file is removed */
  onRemove?: (index: number) => void;
  /** Accepted file types */
  accept?: UploadFileType;
  /** Maximum number of files */
  maxFiles?: number;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Access level for S3 storage */
  accessLevel?: AccessLevel;
  /** Community ID (required when accessLevel is 'community') */
  communityId?: string;
  /** Custom upload endpoint */
  uploadEndpoint?: string;
  /** Show preview of uploaded files */
  showPreview?: boolean;
  /** Allow multiple files */
  multiple?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class */
  className?: string;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
}

export interface UploadedFile {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  type: 'image' | 'video' | 'document';
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

// ======================
// CONSTANTS
// ======================

const ACCEPT_MAP: Record<UploadFileType, string> = {
  image: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml',
  video: 'video/mp4,video/webm,video/quicktime,video/x-msvideo',
  document: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain',
  all: 'image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain',
};

const DEFAULT_MAX_SIZE: Record<UploadFileType, number> = {
  image: 25,
  video: 500,
  document: 50,
  all: 100,
};

// ======================
// MAIN COMPONENT
// ======================

export function MediaUpload({
  onUpload,
  onError,
  currentFiles = [],
  onRemove,
  accept = 'all',
  maxFiles = 10,
  maxSizeMB,
  accessLevel = 'admin',
  communityId,
  uploadEndpoint = '/api/admin/crm/upload/s3',
  showPreview = true,
  multiple = true,
  compact = false,
  disabled = false,
  className = '',
  label,
  helperText,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const maxSize = maxSizeMB || DEFAULT_MAX_SIZE[accept];
  const acceptString = ACCEPT_MAP[accept];
  
  // Determine file type for S3 categorization
  const getFileCategory = (mimeType: string): 'images' | 'videos' | 'documents' => {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    return 'documents';
  };
  
  // Validate file
  const validateFile = (file: File): string | null => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSize) {
      return `File too large. Max size: ${maxSize}MB`;
    }
    
    // Check file type
    const allowed = acceptString.split(',').some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });
    
    if (!allowed) {
      return `File type not allowed: ${file.type}`;
    }
    
    return null;
  };
  
  // Upload single file
  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', getFileCategory(file.type));
    
    if (accessLevel === 'community' && communityId) {
      formData.append('communityId', communityId);
    }
    
    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Upload failed');
    }
    
    const result = await response.json();
    return result.data;
  };
  
  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;
    
    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - currentFiles.length;
    
    if (fileArray.length > remainingSlots) {
      onError?.(`You can only upload ${remainingSlots} more file(s)`);
      return;
    }
    
    // Validate all files first
    const errors: string[] = [];
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) errors.push(`${file.name}: ${error}`);
    });
    
    if (errors.length > 0) {
      onError?.(errors.join('\n'));
      return;
    }
    
    setUploading(true);
    setProgress(fileArray.map(f => ({ 
      fileName: f.name, 
      progress: 0, 
      status: 'uploading' 
    })));
    
    const uploaded: UploadedFile[] = [];
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        setProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, progress: 50 } : p
        ));
        
        const result = await uploadFile(file);
        if (result) {
          uploaded.push(result);
          setProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, progress: 100, status: 'success' } : p
          ));
        }
      } catch (err) {
        setProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'error', error: err instanceof Error ? err.message : 'Failed' } : p
        ));
      }
    }
    
    if (uploaded.length > 0) {
      onUpload(uploaded);
    }
    
    // Clear progress after delay
    setTimeout(() => {
      setProgress([]);
      setUploading(false);
    }, 2000);
    
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [disabled, maxFiles, currentFiles.length, onError, onUpload, maxSize, acceptString, uploadEndpoint, accessLevel, communityId]);
  
  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  // File type icon
  const FileTypeIcon = () => {
    switch (accept) {
      case 'image': return <ImageIcon size={20} className="text-green-400" />;
      case 'video': return <Video size={20} className="text-purple-400" />;
      case 'document': return <FileText size={20} className="text-indigo-400" />;
      default: return <Upload size={20} className="text-slate-400" />;
    }
  };
  
  // Compact mode
  if (compact) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
            ${disabled ? 'border-slate-700 text-slate-500 cursor-not-allowed' : 
              'border-slate-600 text-slate-300 hover:border-indigo-500 hover:text-indigo-400'}
          `}
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <FileTypeIcon />
          )}
          <span className="text-sm">{label || 'Upload'}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
    );
  }
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      )}
      
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 
            disabled ? 'border-slate-700 bg-slate-800/50 cursor-not-allowed' :
            'border-slate-600 hover:border-slate-500 bg-slate-800/30'}
        `}
      >
        {uploading ? (
          <div className="py-4">
            <Loader2 size={32} className="animate-spin mx-auto text-indigo-400 mb-2" />
            <p className="text-slate-300">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2 mb-3">
              <FileTypeIcon />
            </div>
            <p className="text-slate-300 mb-1">
              {dragActive ? 'Drop files here' : 'Click or drag files to upload'}
            </p>
            <p className="text-sm text-slate-500">
              Max {maxSize}MB per file
              {maxFiles > 1 && ` • Up to ${maxFiles} files`}
            </p>
          </>
        )}
        
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      
      {helperText && (
        <p className="mt-2 text-sm text-slate-500">{helperText}</p>
      )}
      
      {/* Upload progress */}
      {progress.length > 0 && (
        <div className="mt-3 space-y-2">
          {progress.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {p.status === 'uploading' && <Loader2 size={14} className="animate-spin text-indigo-400" />}
              {p.status === 'success' && <CheckCircle size={14} className="text-green-400" />}
              {p.status === 'error' && <AlertCircle size={14} className="text-red-400" />}
              <span className={`truncate flex-1 ${p.status === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                {p.fileName}
              </span>
              {p.error && <span className="text-red-400 text-xs">{p.error}</span>}
            </div>
          ))}
        </div>
      )}
      
      {/* Current files preview */}
      {showPreview && currentFiles.length > 0 && (
        <div className="mt-4">
          <MediaPreview 
            media={currentFiles}
            size="sm"
            onRemove={onRemove}
            showDownload
            showExpand
          />
        </div>
      )}
    </div>
  );
}

export default MediaUpload;
