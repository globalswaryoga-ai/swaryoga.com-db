'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Globe,
  Lock,
  Users,
  Settings,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowLeft,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { MediaPreview, detectMediaType } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';

/**
 * Convert S3 URLs to proxied URLs for authenticated access
 */
function getProxiedMediaUrl(url: string, authToken: string | null): string {
  if (!url) return url;

  const needsProxy =
    (url.includes('.s3.') && url.includes('.amazonaws.com')) ||
    url.includes('b-cdn.net') ||
    url.startsWith('/api/media/bunny/');

  if (needsProxy && authToken) {
    return `/api/admin/crm/media/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(authToken)}`;
  }

  return url;
}

type AccessLevel = 'public' | 'admin' | 'community';
type FileType = 'images' | 'videos' | 'documents';

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  accessLevel: AccessLevel;
  fileType: FileType;
  communityId?: string;
  size: number;
  uploadedAt: Date;
}

export default function MediaManagerPage() {
  const hookToken = useAuth();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const activeToken =
      hookToken ||
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      '';
    setToken(activeToken);
  }, [hookToken]);

  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public');
  const [fileType, setFileType] = useState<FileType>('images');
  const [selectedCommunity, setSelectedCommunity] = useState('swar-yoga');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const communities = [
    { id: 'global', name: '🌐 Global (Public)', isPublic: true },
    { id: 'swar-yoga', name: '🧘 Swar Yoga', isPublic: false },
    { id: 'aham-bramhasmi', name: '🔱 Aham Bramhasmi', isPublic: false },
    { id: 'shivoham', name: '🙏 Shivoham', isPublic: false },
    { id: 'astavakra', name: '📿 Astavakra', isPublic: false },
    { id: 'i-am-fit', name: '💪 I Am Fit', isPublic: false },
  ];

  const accessLevels = [
    {
      id: 'public' as AccessLevel,
      label: 'Public Access',
      icon: Globe,
      description: 'Public website, brochures & community feed',
      activeClass: 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs',
      idleClass: 'bg-white border-slate-200 text-slate-700 hover:border-slate-300',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'admin' as AccessLevel,
      label: 'Admin Only',
      icon: Lock,
      description: 'Internal reports, invoices & audit docs',
      activeClass: 'bg-rose-50 border-rose-500 text-rose-800 shadow-2xs',
      idleClass: 'bg-white border-slate-200 text-slate-700 hover:border-slate-300',
      badge: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'community' as AccessLevel,
      label: 'Community Members',
      icon: Users,
      description: 'Restricted to enrolled batch participants',
      activeClass: 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-2xs',
      idleClass: 'bg-white border-slate-200 text-slate-700 hover:border-slate-300',
      badge: 'bg-indigo-100 text-indigo-800',
    },
  ];

  const fileTypes = [
    { id: 'images' as FileType, label: 'Images', icon: ImageIcon, accept: 'image/*' },
    { id: 'videos' as FileType, label: 'Videos', icon: Video, accept: 'video/*' },
    { id: 'documents' as FileType, label: 'Documents', icon: FileText, accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt' },
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    setSuccess('');
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('accessLevel', accessLevel);
    formData.append('fileType', fileType);
    if (accessLevel === 'community') {
      formData.append('communityId', selectedCommunity);
    }

    try {
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`✅ File uploaded successfully!`);
        setUploadedFiles((prev) => [
          {
            id: Date.now().toString(),
            name: files[0].name,
            url: data.url,
            accessLevel,
            fileType,
            communityId: accessLevel === 'community' ? selectedCommunity : undefined,
            size: files[0].size,
            uploadedAt: new Date(),
          },
          ...prev,
        ]);
        setUploadProgress(100);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const publicCount = uploadedFiles.filter((f) => f.accessLevel === 'public').length;
  const adminCount = uploadedFiles.filter((f) => f.accessLevel === 'admin').length;
  const communityCount = uploadedFiles.filter((f) => f.accessLevel === 'community').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Vibrant Gradient Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/admin/crm/social-hub"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Social Hub
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-amber-600">Storage & Assets</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Media Assets & Upload
              </h1>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                Cloud Storage
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Upload and manage images, PDFs, banners, and workshop assets with access control.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/crm/inbound-media"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-semibold rounded-xl shadow-2xs transition"
            >
              <FolderOpen className="w-4 h-4 text-emerald-600" /> WhatsApp Inbound Media
            </Link>
            <Link
              href="/admin/crm/media/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
            >
              <Settings className="w-4 h-4" /> S3 & Storage Settings
            </Link>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Uploads</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{uploadedFiles.length}</h3>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">Active Files</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Public Assets</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{publicCount}</h3>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Website & Social Media</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Vault</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{adminCount}</h3>
              <p className="text-xs text-rose-600 font-semibold mt-0.5">Private Signed URLs</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Community Files</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{communityCount}</h3>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">Enrolled Members Only</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Upload & Recent Files Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Access Level Selector */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                1. Select Access Level
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {accessLevels.map((level) => {
                  const isSelected = accessLevel === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setAccessLevel(level.id)}
                      className={`p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                        isSelected ? level.activeClass : level.idleClass
                      }`}
                    >
                      <level.icon className="w-5 h-5 mb-2" />
                      <p className="font-bold text-sm">{level.label}</p>
                      <p className="text-xs opacity-80 mt-1">{level.description}</p>
                    </button>
                  );
                })}
              </div>

              {accessLevel === 'community' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Target Community / Course
                  </label>
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {communities
                      .filter((c) => c.id !== 'global')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* File Type Selector & Upload Dropzone */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                2. Select Type & Upload
              </h2>

              <div className="flex gap-3">
                {fileTypes.map((type) => {
                  const isSelected = fileType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFileType(type.id)}
                      className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <type.icon className="w-4 h-4" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${
                  uploading
                    ? 'border-amber-500 bg-amber-50/50'
                    : 'border-slate-300 hover:border-amber-500 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept={fileTypes.find((t) => t.id === fileType)?.accept}
                  className="hidden"
                  disabled={uploading}
                />

                {uploading ? (
                  <div className="space-y-3">
                    <Loader className="w-10 h-10 mx-auto text-amber-600 animate-spin" />
                    <p className="text-sm font-bold text-slate-800">Uploading to Cloud Storage...</p>
                    <div className="w-64 max-w-full mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">Click to browse or drag file here</p>
                    <p className="text-xs text-slate-500">
                      {fileType === 'images' && 'PNG, JPG, WebP, SVG (Max 25MB)'}
                      {fileType === 'videos' && 'MP4, WebM, MOV (Max 2GB via Bunny/S3)'}
                      {fileType === 'documents' && 'PDF, DOCX, XLSX, TXT (Max 50MB)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Path preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Storage Target Prefix:</span>
                <code className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {accessLevel === 'public' && `public/${fileType}/`}
                  {accessLevel === 'admin' && `admin/${fileType}/`}
                  {accessLevel === 'community' && `community/${selectedCommunity}/${fileType}/`}
                </code>
              </div>
            </div>
          </div>

          {/* Recent Uploads Side Column */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span>Recent Uploads</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {uploadedFiles.length}
                </span>
              </h2>

              {uploadedFiles.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No files uploaded this session</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {uploadedFiles.map((file) => {
                    const proxiedUrl = getProxiedMediaUrl(file.url, token);
                    return (
                      <div
                        key={file.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:bg-slate-100/60 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500">{formatFileSize(file.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyUrl(file.url)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
                            title="Copy link"
                          >
                            {copiedUrl === file.url ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <div className="pt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              file.accessLevel === 'public'
                                ? 'bg-emerald-100 text-emerald-800'
                                : file.accessLevel === 'admin'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {file.accessLevel.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Cloud CDN Active</span>
              <span className="text-emerald-600 font-bold">● High Availability</span>
            </div>
          </div>
        </div>

        {/* Informational Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border-l-4 border-emerald-500 rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" /> Public Assets
            </h3>
            <p className="text-xs text-slate-600 mt-1.5">
              Available to any visitor. Perfect for homepage posters, workshop banner graphics, and public blog images.
            </p>
          </div>

          <div className="bg-white border-l-4 border-rose-500 rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-600" /> Admin Restricted
            </h3>
            <p className="text-xs text-slate-600 mt-1.5">
              Strictly protected behind temporary presigned HMAC URLs. Used for tax receipts, financial data, and team files.
            </p>
          </div>

          <div className="bg-white border-l-4 border-indigo-500 rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" /> Community Vault
            </h3>
            <p className="text-xs text-slate-600 mt-1.5">
              Secured for enrolled members of specific yoga cohorts and advanced sadhana programs.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
