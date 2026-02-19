'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Video, 
  Film, 
  Loader2, 
  Search, 
  X, 
  Check,
  Upload,
  Play,
  Clock,
  Eye,
  Tag,
  Filter
} from 'lucide-react';

interface ContentItem {
  _id: string;
  title: string;
  description: string;
  communityId: string;
  communityName: string;
  communityType: string;
  thumbnailUrl?: string;
  duration?: number;
  source: 'manual' | 'zoom';
  isCommon: boolean;
  tags: string[];
  views: number;
  createdAt: string;
  uploadedBy: string;
}

interface Community {
  _id: string;
  name: string;
  type: string;
}

export default function AdminRecordingsVideosPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'recording'>('all');
  const [filterCommunity, setFilterCommunity] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    communityId: '',
    isCommon: false,
    tags: '',
    contentType: 'video' as 'video' | 'recording',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    recordings: 0,
    videos: 0,
  });

  useEffect(() => {
    fetchContent();
  }, [filterType, filterCommunity]);

  async function fetchContent() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('type', filterType);
      if (filterCommunity) params.set('communityId', filterCommunity);
      
      const res = await fetch(`/api/admin/communities/recordings-videos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.success) {
        setContent(data.content || []);
        setCommunities(data.communities || []);
        setStats(data.stats || { total: 0, recordings: 0, videos: 0 });
      } else {
        setError(data.error || 'Failed to fetch content');
      }
    } catch (err) {
      setError('Failed to fetch content');
    } finally {
      setLoading(false);
    }
  }

  function openUploadModal() {
    setEditingContent(null);
    setForm({
      title: '',
      description: '',
      communityId: communities[0]?._id || '',
      isCommon: false,
      tags: '',
      contentType: 'video',
    });
    setSelectedFile(null);
    setUploadProgress(0);
    setShowModal(true);
  }

  function openEditModal(item: ContentItem) {
    setEditingContent(item);
    setForm({
      title: item.title,
      description: item.description || '',
      communityId: item.communityId,
      isCommon: item.isCommon,
      tags: item.tags.join(', '),
      contentType: item.source === 'zoom' ? 'recording' : 'video',
    });
    setSelectedFile(null);
    setShowModal(true);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid video format. Allowed: MP4, WebM, MOV, AVI');
        return;
      }
      
      // Validate file size (2GB max for long recordings)
      const maxSize = 2 * 1024 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Video too large. Maximum size is 2GB');
        return;
      }
      
      setSelectedFile(file);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!form.communityId) {
      alert('Please select a community');
      return;
    }
    if (!editingContent && !selectedFile) {
      alert('Please select a video file');
      return;
    }

    setSaving(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');

      if (editingContent) {
        // Update existing content
        const res = await fetch('/api/admin/communities/recordings-videos', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            contentId: editingContent._id,
            title: form.title,
            description: form.description,
            communityId: form.communityId,
            isCommon: form.isCommon,
            tags: form.tags.split(',').map(t => t.trim()).filter(t => t),
          }),
        });

        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchContent();
        } else {
          alert(data.error || 'Failed to update content');
        }
      } else {
        // Upload new content
        const formData = new FormData();
        formData.append('video', selectedFile!);
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('communityId', form.communityId);
        formData.append('isCommon', form.isCommon.toString());
        formData.append('tags', form.tags);
        formData.append('contentType', form.contentType);

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 500);

        const res = await fetch('/api/admin/communities/recordings-videos', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchContent();
        } else {
          alert(data.error || 'Failed to upload content');
        }
      }
    } catch (err) {
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contentId: string) {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    setDeleting(contentId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/communities/recordings-videos?contentId=${contentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        fetchContent();
      } else {
        alert(data.error || 'Failed to delete content');
      }
    } catch (err) {
      alert('Failed to delete content');
    } finally {
      setDeleting(null);
    }
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const filteredContent = content.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.communityName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCommunityColor = (type: string) => {
    switch (type) {
      case 'global': return 'bg-teal-100 text-teal-700';
      case 'old_sadhak': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/communities" 
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Recordings & Videos</h1>
                <p className="text-sm text-gray-500">Upload and manage community content</p>
              </div>
            </div>
            <button
              onClick={openUploadModal}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-md"
            >
              <Upload className="h-5 w-5" />
              <span className="hidden sm:inline">Upload Content</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Film className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.videos}</p>
                <p className="text-sm text-gray-500">Videos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Play className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.recordings}</p>
                <p className="text-sm text-gray-500">Recordings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'video' | 'recording')}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="video">Videos Only</option>
              <option value="recording">Recordings Only</option>
            </select>
            <select
              value={filterCommunity}
              onChange={(e) => setFilterCommunity(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              <option value="">All Communities</option>
              {communities.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
            <p className="text-gray-500 mb-4">Upload your first video or recording</p>
            <button
              onClick={openUploadModal}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium"
            >
              Upload Content
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContent.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-md group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100">
                  {item.thumbnailUrl ? (
                    <img 
                      src={item.thumbnailUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.source === 'zoom' ? (
                        <Play className="h-12 w-12 text-gray-300" />
                      ) : (
                        <Video className="h-12 w-12 text-gray-300" />
                      )}
                    </div>
                  )}
                  {/* Duration badge */}
                  {item.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {formatDuration(item.duration)}
                    </div>
                  )}
                  {/* Type badge */}
                  <div className={`absolute top-2 left-2 text-xs font-medium px-2 py-1 rounded ${
                    item.source === 'zoom' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-blue-500 text-white'
                  }`}>
                    {item.source === 'zoom' ? 'Recording' : 'Video'}
                  </div>
                  {/* Common badge */}
                  {item.isCommon && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Common
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                  )}
                  
                  {/* Community badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getCommunityColor(item.communityType)}`}>
                      {item.communityName}
                    </span>
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{item.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {item.views}
                      </span>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        disabled={deleting === item._id}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === item._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingContent ? 'Edit Content' : 'Upload Content'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* File upload (only for new content) */}
              {!editingContent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video File *
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      selectedFile 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
                    }`}
                  >
                    {selectedFile ? (
                      <div>
                        <Video className="h-10 w-10 text-green-500 mx-auto mb-2" />
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Click to select a video</p>
                        <p className="text-xs text-gray-400 mt-1">MP4, WebM, MOV, AVI (max 2GB)</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Content Type (only for new content) */}
              {!editingContent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, contentType: 'video' })}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        form.contentType === 'video'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Video className="h-5 w-5" />
                      <span className="font-medium">Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, contentType: 'recording' })}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        form.contentType === 'recording'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Play className="h-5 w-5" />
                      <span className="font-medium">Recording</span>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Pranayama Session - Day 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Describe this content..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Community *
                </label>
                <select
                  value={form.communityId}
                  onChange={(e) => setForm({ ...form, communityId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                >
                  <option value="">Select a community</option>
                  {communities.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., pranayama, beginner, morning"
                />
              </div>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={form.isCommon}
                  onChange={(e) => setForm({ ...form, isCommon: e.target.checked })}
                  className="rounded text-green-600 focus:ring-green-500 h-5 w-5"
                />
                <div>
                  <span className="font-medium text-gray-900">Common Content</span>
                  <p className="text-xs text-gray-500">Visible to all members in the community</p>
                </div>
              </label>

              {/* Upload Progress */}
              {saving && !editingContent && uploadProgress > 0 && (
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {editingContent ? 'Save Changes' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
