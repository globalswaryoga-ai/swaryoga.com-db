'use client';

import React from 'react';
import { VideoIcon, Upload, Loader, ArrowRight, Heart, MessageCircle, Edit, Trash2 } from 'lucide-react';

interface Video {
  _id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  s3Url?: string;
  youtubeVideoId?: string;
  duration?: number;
  createdAt: string;
  views?: number;
  likes?: any[];
  comments?: any[];
  source?: 'youtube_import' | 's3_upload';
}

interface VideosPanelProps {
  videos: Video[];
  loading: boolean;
  activeTab: string;
  authToken: string | null;
  onFetchVideos: () => void;
  onShowAddYouTubeModal: () => void;
  onShowUploadVideoModal: () => void;
  onDeleteVideo: (videoId: string) => void;
  onEditVideo: (video: Video) => void;
  onOpenComments: (video: Video) => void;
  getProxiedMediaUrl: (url: string, token: string | null) => string;
}

export const VideosPanel: React.FC<VideosPanelProps> = ({
  videos,
  loading,
  activeTab,
  authToken,
  onFetchVideos,
  onShowAddYouTubeModal,
  onShowUploadVideoModal,
  onDeleteVideo,
  onEditVideo,
  onOpenComments,
  getProxiedMediaUrl,
}) => {
  if (activeTab !== 'videos') return null;

  return (
    <div className="flex-1 overflow-auto bg-slate-50/80 p-6">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">📹 Community Videos</h3>
            <p className="text-sm text-slate-500">AWS uploads and YouTube links (non-shareable)</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onFetchVideos}
              className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center gap-2"
            >
              <Loader size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={onShowAddYouTubeModal}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2"
            >
              ▶ Add YouTube
            </button>
            <button
              onClick={onShowUploadVideoModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center gap-2"
            >
              <Upload size={16} />
              Upload Video
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-4">
          <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading videos...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 h-[400px] flex flex-col items-center justify-center text-center p-20 shadow-sm">
          <VideoIcon size={48} className="text-slate-200 mb-6" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Videos Yet</h3>
          <p className="text-slate-500 text-sm mb-6">Upload videos to share exclusive content with this community.</p>
          <button
            onClick={onShowUploadVideoModal}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center gap-2"
          >
            <Upload size={18} />
            Upload First Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => (
            <div key={video._id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-lg transition-all group">
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center relative">
                {video.thumbnailUrl ? (
                  <img
                    src={video.source === 'youtube_import'
                      ? video.thumbnailUrl
                      : getProxiedMediaUrl(video.thumbnailUrl, authToken)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <VideoIcon size={48} className="text-purple-300" />
                )}
                {video.duration && video.duration > 0 && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-lg font-bold">
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                  </span>
                )}
                {/* Source badge */}
                <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${
                  video.source === 'youtube_import'
                    ? 'bg-red-600 text-white'
                    : 'bg-purple-600 text-white'
                }`}>
                  {video.source === 'youtube_import' ? '▶ YouTube' : '☁️ AWS'}
                </span>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-slate-900 mb-1 line-clamp-2">{video.title}</h4>
                {video.description && (
                  <p className="text-xs text-slate-500 mb-2 line-clamp-2">{video.description}</p>
                )}
                <p className="text-xs text-slate-400 mb-3">
                  Added {new Date(video.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 px-2 py-1">
                      {video.views || 0}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-all flex items-center gap-1"
                      title="Likes"
                    >
                      <Heart size={14} className={Array.isArray(video.likes) && video.likes.length > 0 ? 'fill-red-500 text-red-500' : ''} />
                      <span className="text-xs">{Array.isArray(video.likes) ? video.likes.length : 0}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenComments(video); }}
                      className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg transition-all flex items-center gap-1"
                      title="Comments"
                    >
                      <MessageCircle size={14} />
                      <span className="text-xs">{Array.isArray(video.comments) ? video.comments.length : 0}</span>
                    </button>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {video.source === 'youtube_import' && video.youtubeVideoId && (
                      <a
                        href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-all text-red-500 border border-red-100"
                        title="Open on YouTube"
                      >
                        <ArrowRight size={16} />
                      </a>
                    )}
                    {video.s3Url && video.source !== 'youtube_import' && (
                      <a
                        href={getProxiedMediaUrl(video.s3Url, authToken)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-purple-600 hover:text-white rounded-lg transition-all text-purple-500 border border-purple-100"
                      >
                        <ArrowRight size={16} />
                      </a>
                    )}
                    <button
                      onClick={() => onEditVideo(video)}
                      className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-indigo-500 border border-indigo-100"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteVideo(video._id)}
                      className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-all text-red-500 border border-red-100"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
