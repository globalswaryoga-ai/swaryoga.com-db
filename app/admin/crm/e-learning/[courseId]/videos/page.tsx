'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, Edit2, Trash2, Video, GripVertical, Upload, Link as LinkIcon, X, Save, CloudUpload, Loader2, ShieldAlert, Check } from 'lucide-react';

interface VideoItem {
  _id: string;
  title: string;
  description?: string;
  bunnyVideoId?: string;
  duration: number;
  thumbnail?: string;
  order: number;
  sectionId?: string;
  isFree: boolean;
  isActive: boolean;
}

interface Section {
  _id: string;
  title: string;
  order: number;
}

interface Course {
  _id: string;
  slug: string;
  content: { en: { title: string } };
}

export default function VideosPage({ params }: { params: { courseId: string } }) {
  const router = useRouter();
  const token = useAuth();
  const { courseId } = params;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check superadmin status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || '';
    let legacyPerms: string[] = [];
    let pv2: any = null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = (u?.userId as string) || resolvedUserId;
        legacyPerms = Array.isArray(u?.permissions) ? u.permissions : [];
        pv2 = u?.permissionsV2 || null;
      } catch {
        // ignore
      }
    }
    const superAdmin =
      resolvedUserId === 'admin' ||
      resolvedUserId === 'admincrm' ||
      legacyPerms.includes('all') ||
      pv2?.isSuperAdmin === true;
    setIsSuperAdmin(superAdmin);
    setAuthChecked(true);
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [coursesRes, videosRes, sectionsRes] = await Promise.all([
        fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/recorded-courses/videos?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/recorded-courses/sections?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      const [coursesData, videosData, sectionsData] = await Promise.all([
        coursesRes.json(),
        videosRes.json(),
        sectionsRes.json(),
      ]);
      
      if (coursesData.success) {
        const found = coursesData.courses?.find((c: Course) => c._id === courseId);
        setCourse(found || null);
      }
      
      if (videosData.success) {
        setVideos(videosData.videos || []);
      }
      
      if (sectionsData.success) {
        setSections(sectionsData.sections || []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, courseId]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  const deleteVideo = async (videoId: string) => {
    if (!token || !confirm('Delete this video?')) return;
    
    try {
      const res = await fetch(`/api/admin/recorded-courses/videos?id=${videoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        setVideos(prev => prev.filter(v => v._id !== videoId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!token || !authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Non-superadmin - show access denied while redirecting
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">E-Learning management requires super admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/admin/crm/e-learning"
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {course?.content?.en?.title || 'Course Videos'}
          </h1>
          <p className="text-sm text-gray-400">
            Manage videos for this course • {videos.length} videos
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors"
        >
          <Plus size={18} />
          Add Video
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
          <span className="ml-3 text-gray-400">Loading videos...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
          {error}
          <button onClick={fetchData} className="ml-4 text-yellow-400 underline hover:no-underline">Retry</button>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800">
          <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Videos Yet</h3>
          <p className="text-gray-400 mb-6">Add your first video to this course</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors"
          >
            Add Video
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {videos
            .sort((a, b) => a.order - b.order)
            .map((video, idx) => (
            <div 
              key={video._id} 
              className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-gray-600 cursor-grab">
                  <GripVertical size={20} />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-yellow-400 font-bold border border-gray-700">
                  {idx + 1}
                </div>
                <div className="w-20 h-14 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{video.title}</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400">{formatDuration(video.duration || 0)}</span>
                    {video.bunnyVideoId && (
                      <span className="text-green-400 text-xs">Bunny: {video.bunnyVideoId.slice(0, 8)}...</span>
                    )}
                    {video.isFree && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Free</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingVideo(video);
                      setShowEditModal(true);
                    }}
                    className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors"
                    title="Edit Video"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => deleteVideo(video._id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Delete Video"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Video Modal */}
      {showAddModal && (
        <AddVideoModal
          token={token}
          courseId={courseId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchData();
          }}
        />
      )}

      {/* Edit Video Modal */}
      {showEditModal && editingVideo && (
        <EditVideoModal
          token={token}
          video={editingVideo}
          onClose={() => {
            setShowEditModal(false);
            setEditingVideo(null);
          }}
          onUpdated={() => {
            setShowEditModal(false);
            setEditingVideo(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function EditVideoModal({ token, video, onClose, onUpdated }: {
  token: string;
  video: VideoItem;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || '');
  const [thumbnail, setThumbnail] = useState(video.thumbnail || '');
  const [duration, setDuration] = useState(video.duration.toString());
  const [isFree, setIsFree] = useState(video.isFree);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/recorded-courses/videos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoId: video._id,
          title,
          description,
          thumbnail: thumbnail || undefined,
          duration: parseInt(duration) || 0,
          isFree,
        }),
      });

      if (res.ok) {
        onUpdated();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update video');
      }
    } catch (err) {
      setError('Error saving video');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Edit Video</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              placeholder="Enter video title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Thumbnail URL (Optional)</label>
            <input
              type="url"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              placeholder="https://example.com/thumbnail.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">Image URL for video thumbnail (recommended: 16:9 aspect ratio, min 320x180px)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Video Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="Enter video length in minutes (e.g., 15)"
              />
              <p className="text-xs text-gray-500 mt-1">Total length of the video in minutes</p>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
                />
                Free Preview
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Update Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddVideoModal({ token, courseId, onClose, onAdded }: {
  token: string;
  courseId: string;
  onClose: () => void;
  onAdded: () => void
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bunnyVideoId, setBunnyVideoId] = useState('');
  const [duration, setDuration] = useState('0');
  const [thumbnail, setThumbnail] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Upload state
  const [uploadMode, setUploadMode] = useState<'bunny' | 'pc' | 'youtube'>('bunny');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractVideoIdFromUrl = (input: string): string => {
    // If it's already just a video ID, return as-is
    if (!input.includes('/')) return input;

    // Extract videoId from HLS URL: https://vz-xxx.b-cdn.net/videoId/playlist.m3u8
    try {
      const url = new URL(input);
      const pathParts = url.pathname.split('/').filter(p => p);
      if (pathParts.length >= 2) {
        return pathParts[pathParts.length - 2]; // videoId is before /playlist.m3u8
      }
    } catch (e) {
      // If URL parsing fails, assume it's a video ID
    }
    return input;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setUploadError('Please select a video file');
        return;
      }
      // Validate file size (max 2GB)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        setUploadError('File size must be less than 2GB');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);

      // Auto-fill title from filename if empty
      if (!title) {
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  };

  const uploadToBunny = async (): Promise<string | null> => {
    if (!selectedFile) return null;
    
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      // Step 1: Get upload URL from our API
      const initRes = await fetch('/api/admin/bunny/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          title: title || selectedFile.name,
        }),
      });
      
      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || 'Failed to initialize upload');
      }
      
      const { videoId, uploadUrl, accessKey } = await initRes.json();
      
      // Step 2: Upload file directly to Bunny
      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('AccessKey', accessKey);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(selectedFile);
      });
      
      setUploadProgress(100);
      return videoId;
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSaving(true);

    try {
      let finalBunnyId = bunnyVideoId;
      let finalVideoUrl = '';

      // Upload from PC if in PC mode and file selected
      if (uploadMode === 'pc' && selectedFile) {
        const uploadedId = await uploadToBunny();
        if (!uploadedId) {
          setSaving(false);
          return; // Upload error already set
        }
        finalBunnyId = uploadedId;
      } else if (uploadMode === 'bunny') {
        // Extract video ID from HLS URL if a full URL was pasted
        finalBunnyId = extractVideoIdFromUrl(bunnyVideoId);
      } else if (uploadMode === 'youtube') {
        // Store YouTube URL directly
        finalVideoUrl = youtubeUrl;
        finalBunnyId = ''; // Clear bunny ID for YouTube videos
      }

      // Create video record
      const res = await fetch('/api/admin/recorded-courses/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          title,
          description,
          bunnyVideoId: finalBunnyId || undefined,
          videoUrl: finalVideoUrl || undefined,
          thumbnail: thumbnail || undefined,
          duration: parseInt(duration) || 0,
          isFree,
          isActive: true,
        }),
      });

      if (res.ok) {
        onAdded();
      } else {
        const errData = await res.json();
        setUploadError(errData.error || 'Failed to save video');
      }
    } catch (err) {
      console.error('Save error:', err);
      setUploadError('Failed to save video');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Add New Video</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Video Source Toggle */}
          <div>
            <label className="block text-sm font-medium text-green-400 mb-3">Video Source</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setUploadMode('bunny'); setYoutubeUrl(''); }}
                className={`flex items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all text-xs sm:text-sm ${
                  uploadMode === 'bunny'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <LinkIcon size={18} />
                <span className="font-medium">Bunny HLS</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('pc')}
                className={`flex items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all text-xs sm:text-sm ${
                  uploadMode === 'pc'
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <Upload size={18} />
                <span className="font-medium">Upload</span>
              </button>
              <button
                type="button"
                onClick={() => { setUploadMode('youtube'); setSelectedFile(null); setBunnyVideoId(''); }}
                className={`flex items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all text-xs sm:text-sm ${
                  uploadMode === 'youtube'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <LinkIcon size={18} />
                <span className="font-medium">YouTube</span>
              </button>
            </div>
          </div>

          {/* Bunny HLS URL Input */}
          {uploadMode === 'bunny' && (
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Bunny HLS URL or Video ID</label>
              <input
                type="text"
                value={bunnyVideoId}
                onChange={(e) => setBunnyVideoId(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none font-mono"
                placeholder="https://vz-xxx.b-cdn.net/videoId/playlist.m3u8 or just videoId"
              />
              <p className="text-xs text-gray-500 mt-1">Paste HLS URL from Bunny dashboard or just the video ID</p>
            </div>
          )}

          {/* YouTube URL Input */}
          {uploadMode === 'youtube' && (
            <div>
              <label className="block text-sm font-medium text-red-400 mb-2">YouTube Video URL (Private)</label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none font-mono"
                placeholder="https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID"
              />
              <p className="text-xs text-gray-500 mt-1">Enter private YouTube video URL. Make sure it's set to private in YouTube settings.</p>
            </div>
          )}

          {/* PC Upload */}
          {uploadMode === 'pc' && (
            <div>
              <label className="block text-sm font-medium text-yellow-400 mb-2">Upload Video File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="bg-black border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Video className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-gray-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  {uploading && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-yellow-400">Uploading to Bunny...</span>
                        <span className="text-white">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group"
                >
                  <CloudUpload className="w-12 h-12 text-gray-600 group-hover:text-yellow-400 mx-auto mb-3 transition-colors" />
                  <p className="text-white font-medium">Click to select video file</p>
                  <p className="text-sm text-gray-500 mt-1">MP4, MOV, WebM • Max 2GB</p>
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
              {uploadError}
            </div>
          )}

          <div className="border-t border-gray-800 pt-5">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Video Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="Enter video title"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Thumbnail URL (Optional)</label>
            <input
              type="url"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              placeholder="https://example.com/thumbnail.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">Image URL for video thumbnail (recommended: 16:9 aspect ratio, min 320x180px)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Video Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="Enter video length in minutes (e.g., 15)"
              />
              <p className="text-xs text-gray-500 mt-1">Total length of the video in minutes</p>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
                />
                Free Preview Video
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading || saving}
              className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || saving || (uploadMode === 'bunny' && !bunnyVideoId) || (uploadMode === 'pc' && !selectedFile) || (uploadMode === 'youtube' && !youtubeUrl)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {(saving || uploading) && <Loader2 size={18} className="animate-spin" />}
              {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Add Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
