'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';

interface LifePlannerImageUploadProps {
  onImageUrlChange: (url: string) => void;
  currentImageUrl?: string;
  label?: string;
  maxSizeMB?: number;
}

export default function LifePlannerImageUpload({
  onImageUrlChange,
  currentImageUrl,
  label = 'Upload Image',
  maxSizeMB = 5,
}: LifePlannerImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '');
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!imageUrl.trim()) {
      setError('Please enter a valid image URL');
      return;
    }

    // Validate URL
    try {
      new URL(imageUrl);
      setPreview(imageUrl);
      onImageUrlChange(imageUrl);
    } catch {
      setError('Invalid URL format');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        setError(`File size must be less than ${maxSizeMB}MB. Your file is ${fileSizeMB.toFixed(2)}MB`);
        setLoading(false);
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        setLoading(false);
        return;
      }

      // Create FormData with file
      const formData = new FormData();
      formData.append('file', file);

      // Upload to Life Planner Bunny endpoint
      const response = await fetch('/api/life-planner/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      const uploadedUrl = data.url;

      setPreview(uploadedUrl);
      setImageUrl(uploadedUrl);
      onImageUrlChange(uploadedUrl);
      setUploadMode('url'); // Switch back to URL mode to show the result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImageUrl('');
    setPreview(null);
    onImageUrlChange('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-swar-text">{label}</label>

      {/* Preview */}
      {preview && (
        <div className="relative group">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-40 sm:h-48 object-cover rounded-xl border-2 border-emerald-200"
          />
          <button
            onClick={clearImage}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2 border-b border-swar-border">
        <button
          onClick={() => {
            setUploadMode('url');
            setError(null);
          }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            uploadMode === 'url'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-swar-text-secondary hover:text-swar-text'
          }`}
          type="button"
        >
          Paste URL
        </button>
        <button
          onClick={() => {
            setUploadMode('file');
            setError(null);
          }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            uploadMode === 'file'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-swar-text-secondary hover:text-swar-text'
          }`}
          type="button"
        >
          Upload File
        </button>
      </div>

      {/* URL Input Mode */}
      {uploadMode === 'url' && (
        <form onSubmit={handleUrlSubmit} className="space-y-2">
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-4 py-2.5 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm min-h-10"
          >
            {loading ? 'Processing...' : 'Use Image URL'}
          </button>
        </form>
      )}

      {/* File Upload Mode */}
      {uploadMode === 'file' && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={loading}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full px-4 py-2.5 border-2 border-dashed border-emerald-300 rounded-lg hover:border-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium text-swar-text"
            type="button"
          >
            <Upload size={18} />
            {loading ? 'Uploading...' : 'Click to Upload or Drag & Drop'}
          </button>
          <p className="text-xs text-swar-text-secondary text-center">
            Max {maxSizeMB}MB • JPG, PNG, WebP supported
          </p>
        </div>
      )}
    </div>
  );
}
