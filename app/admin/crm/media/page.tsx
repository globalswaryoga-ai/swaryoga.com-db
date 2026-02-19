'use client';

import { useState, useRef } from 'react';
import { Upload, Image, Video, FileText, Globe, Lock, Users, Settings, Trash2, Copy, ExternalLink, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Link from 'next/link';
import { MediaPreview, detectMediaType } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';

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
  const token = useAuth();
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
      label: 'Public', 
      icon: Globe, 
      description: 'Anyone can view (website, community feed)',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50 border-green-200'
    },
    { 
      id: 'admin' as AccessLevel, 
      label: 'Admin Only', 
      icon: Lock, 
      description: 'Only admins can access (reports, internal docs)',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50 border-red-200'
    },
    { 
      id: 'community' as AccessLevel, 
      label: 'Community Members', 
      icon: Users, 
      description: 'Only community members can view',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 border-purple-200'
    },
  ];

  const fileTypes = [
    { id: 'images' as FileType, label: 'Images', icon: Image, accept: 'image/*' },
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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`✅ File uploaded successfully!`);
        setUploadedFiles(prev => [{
          id: Date.now().toString(),
          name: files[0].name,
          url: data.url,
          accessLevel,
          fileType,
          communityId: accessLevel === 'community' ? selectedCommunity : undefined,
          size: files[0].size,
          uploadedAt: new Date(),
        }, ...prev]);
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

  return (
    <div className="dark-theme min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">📁 Media Manager</h1>
            <p className="text-slate-400">Upload and manage files with proper access control</p>
          </div>
          <Link
            href="/admin/crm/media/settings"
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
          >
            <Settings size={18} />
            S3 Settings
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Access Level Selection */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Lock size={20} className="text-purple-400" />
                Access Level
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {accessLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setAccessLevel(level.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      accessLevel === level.id
                        ? `bg-gradient-to-br ${level.color} border-transparent text-white shadow-lg`
                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <level.icon size={24} className="mb-2" />
                    <p className="font-bold">{level.label}</p>
                    <p className="text-xs opacity-80 mt-1">{level.description}</p>
                  </button>
                ))}
              </div>

              {/* Community Selection (only for community access) */}
              {accessLevel === 'community' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Community</label>
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                  >
                    {communities.filter(c => c.id !== 'global').map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* File Type Selection */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-400" />
                File Type
              </h2>
              <div className="flex gap-4">
                {fileTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setFileType(type.id)}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      fileType === type.id
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <type.icon size={24} className="mx-auto mb-2" />
                    <p className="font-bold text-center">{type.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Upload size={20} className="text-green-400" />
                Upload File
              </h2>

              {error && (
                <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-300">
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg flex items-center gap-2 text-green-300">
                  <CheckCircle size={20} />
                  {success}
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  uploading
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-600 hover:border-green-500 hover:bg-slate-700/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept={fileTypes.find(t => t.id === fileType)?.accept}
                  className="hidden"
                  disabled={uploading}
                />
                
                {uploading ? (
                  <div className="space-y-4">
                    <Loader size={48} className="mx-auto text-blue-400 animate-spin" />
                    <p className="text-slate-300">Uploading...</p>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={48} className="mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-300 font-medium">Click or drag file to upload</p>
                    <p className="text-slate-500 text-sm mt-2">
                      {fileType === 'images' && 'JPG, PNG, GIF, WebP (max 25MB)'}
                      {fileType === 'videos' && 'MP4, WebM, MOV (max 2GB)'}
                      {fileType === 'documents' && 'PDF, DOC, XLS, TXT (max 50MB)'}
                    </p>
                  </>
                )}
              </div>

              {/* Upload Path Preview */}
              <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">File will be uploaded to:</p>
                <code className="text-sm text-green-400">
                  {accessLevel === 'public' && `public/${fileType}/`}
                  {accessLevel === 'admin' && `admin/${fileType}/`}
                  {accessLevel === 'community' && `community/${selectedCommunity}/${fileType}/`}
                </code>
              </div>
            </div>
          </div>

          {/* Recent Uploads */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">📋 Recent Uploads</h2>
            
            {uploadedFiles.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Image size={48} className="mx-auto mb-3 opacity-50" />
                <p>No files uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {uploadedFiles.map((file) => {
                  // Proxy S3 URLs for display
                  const proxiedUrl = getProxiedMediaUrl(file.url, token);
                  return (
                  <div 
                    key={file.id}
                    className="p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                  >
                    {/* Media Preview */}
                    <div className="mb-3">
                      <MediaPreview 
                        media={{
                          url: proxiedUrl,
                          type: detectMediaType(file.url),
                          name: file.name,
                          size: file.size,
                        }}
                        size="sm"
                        showDownload={true}
                      />
                    </div>
                    
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{file.name}</p>
                        <p className="text-slate-400 text-xs">{formatFileSize(file.size)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            file.accessLevel === 'public' ? 'bg-green-900/50 text-green-400' :
                            file.accessLevel === 'admin' ? 'bg-red-900/50 text-red-400' :
                            'bg-purple-900/50 text-purple-400'
                          }`}>
                            {file.accessLevel === 'public' && '🌐 Public'}
                            {file.accessLevel === 'admin' && '🔒 Admin'}
                            {file.accessLevel === 'community' && `👥 ${file.communityId}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => copyUrl(file.url)}
                          className={`p-2 rounded-lg transition-all ${
                            copiedUrl === file.url
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          }`}
                          title="Copy URL"
                        >
                          {copiedUrl === file.url ? <CheckCircle size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Access Level Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-900/30 border border-green-800 rounded-xl p-4">
            <h3 className="text-green-400 font-bold flex items-center gap-2">
              <Globe size={18} /> Public Files
            </h3>
            <p className="text-green-300/70 text-sm mt-2">
              Used for: Community posts, website images, public content. 
              <strong> Global community content goes here.</strong>
            </p>
          </div>
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
            <h3 className="text-red-400 font-bold flex items-center gap-2">
              <Lock size={18} /> Admin Files
            </h3>
            <p className="text-red-300/70 text-sm mt-2">
              Used for: Internal reports, admin documents, sensitive data. 
              Accessed via signed URLs only.
            </p>
          </div>
          <div className="bg-purple-900/30 border border-purple-800 rounded-xl p-4">
            <h3 className="text-purple-400 font-bold flex items-center gap-2">
              <Users size={18} /> Community Files
            </h3>
            <p className="text-purple-300/70 text-sm mt-2">
              Used for: Exclusive community videos, member documents. 
              <strong> Non-shareable, members only.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
