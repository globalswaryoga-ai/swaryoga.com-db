'use client';

import React, { useState, useMemo } from 'react';
import { VideoIcon, Upload, Loader, ArrowRight, Heart, MessageCircle, Edit, Trash2 } from 'lucide-react';

interface Recording {
  _id: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  s3Url?: string;
  youtubeId?: string;
  youtubeVideoId?: string;
  videoSource?: string;
  duration?: number;
  createdAt: string;
  views?: number;
  likes?: any[];
  comments?: any[];
}

interface RecordingsPanelProps {
  recordings: Recording[];
  loading: boolean;
  activeTab: string;
  authToken: string | null;
  onFetchRecordings: () => void;
  onShowUploadModal: () => void;
  onShowAddYouTubeModal: () => void;
  onDeleteVideo: (videoId: string) => void;
  onEditVideo: (video: Recording) => void;
  onOpenComments: (video: Recording) => void;
  getProxiedMediaUrl: (url: string, token: string | null) => string;
}

export const RecordingsPanel: React.FC<RecordingsPanelProps> = ({
  recordings,
  loading,
  activeTab,
  authToken,
  onFetchRecordings,
  onShowUploadModal,
  onShowAddYouTubeModal,
  onDeleteVideo,
  onEditVideo,
  onOpenComments,
  getProxiedMediaUrl,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);

  const folders = useMemo(() => {
    const folderMap: Record<string, Record<string, Recording[]>> = {};
    recordings.forEach(rec => {
      const parts = rec.title?.split(' > ') || [];
      const folder = parts[0] || 'Uncategorized';
      const playlist = parts[1] || 'Default Batch';

      if (!folderMap[folder]) folderMap[folder] = {};
      if (!folderMap[folder][playlist]) folderMap[folder][playlist] = [];
      folderMap[folder][playlist].push(rec);
    });
    return folderMap;
  }, [recordings]);

  const folderNames = Object.keys(folders);
  const currentFolder = selectedFolder || folderNames[0];
  const playlists = folders[currentFolder] || {};
  const playlistNames = Object.keys(playlists);
  const firstPlaylist = playlistNames[0];
  const heroVideo = firstPlaylist ? playlists[firstPlaylist]?.[0] : null;

  if (activeTab !== 'recordings') return null;

  if (loading) {
    return (
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading recordings...</p>
        </div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center justify-center h-full text-center p-20">
          <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-8">
            <VideoIcon size={48} className="text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No Workshop Recordings Yet</h3>
          <p className="text-slate-400 text-sm mb-8 max-w-md">Upload your workshop recordings organized by Workshop → Batch → Video for easy access.</p>
          <div className="flex gap-4">
            <button
              onClick={onShowUploadModal}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center gap-3 shadow-xl shadow-emerald-500/20"
            >
              <Upload size={20} />
              Upload Recording
            </button>
            <button
              onClick={onShowAddYouTubeModal}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-sm hover:from-red-600 hover:to-red-700 transition-all flex items-center gap-3 shadow-xl shadow-red-500/20"
            >
              ▶ Add YouTube URL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="min-h-full">
        {/* Hero Section with Folder Name */}
        <div className="relative h-[400px] overflow-hidden">
          <div className="absolute inset-0">
            {heroVideo?.thumbnailUrl ? (
              <img
                src={getProxiedMediaUrl(heroVideo.thumbnailUrl, authToken)}
                alt={currentFolder}
                className="w-full h-full object-cover opacity-40"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-end p-8 lg:p-12">
            {/* Top bar with actions */}
            <div className="absolute top-6 right-6 flex gap-3">
              <button
                onClick={onFetchRecordings}
                className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20"
              >
                <Loader size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={onShowUploadModal}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all flex items-center gap-2"
              >
                <Upload size={16} />
                Upload
              </button>
              <button
                onClick={onShowAddYouTubeModal}
                className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all flex items-center gap-2"
              >
                ▶ YouTube
              </button>
            </div>

            {/* Folder tabs */}
            {folderNames.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {folderNames.map(folder => (
                  <button
                    key={folder}
                    onClick={() => { setSelectedFolder(folder); setSelectedPlaylist(null); }}
                    className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                      currentFolder === folder
                        ? 'bg-white text-slate-900'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {folder}
                  </button>
                ))}
              </div>
            )}

            {/* Folder title */}
            <div className="flex items-center gap-4 mb-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                Workshop
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
              {currentFolder}
            </h1>
            <p className="text-slate-300 text-lg">
              {playlistNames.length} Batches • {Object.values(playlists).flat().length} Videos
            </p>
          </div>
        </div>

        {/* Playlist Cards Section */}
        <div className="p-8 lg:p-12 -mt-16 relative z-20">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
            Batches / Playlists
          </h2>

          {!selectedPlaylist ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlistNames.map((playlistName, index) => {
                const playlistVideos = playlists[playlistName];
                const firstVideo = playlistVideos[0];
                const colors = [
                  'from-purple-500 to-pink-500',
                  'from-indigo-500 to-cyan-500',
                  'from-orange-500 to-red-500',
                  'from-emerald-500 to-teal-500',
                  'from-indigo-500 to-purple-500',
                  'from-rose-500 to-orange-500',
                ];

                return (
                  <div
                    key={playlistName}
                    className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-emerald-500/50 transition-all hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer"
                    onClick={() => setSelectedPlaylist(playlistName)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video relative overflow-hidden">
                      {firstVideo?.thumbnailUrl ? (
                        <img
                          src={getProxiedMediaUrl(firstVideo.thumbnailUrl, authToken)}
                          alt={playlistName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center`}>
                          <VideoIcon size={48} className="text-white/50" />
                        </div>
                      )}

                      {/* Overlay with play button */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                          <ArrowRight size={28} className="text-slate-900 ml-1" />
                        </div>
                      </div>

                      {/* Video count badge */}
                      <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-white text-xs font-bold">
                        {playlistVideos.length} videos
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="p-5">
                      <h3 className="font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors">
                        {playlistName}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-sm">
                            {playlistVideos.length} recordings
                          </span>
                          <span className="text-xs text-slate-400">
                            {playlistVideos.reduce((sum: number, v: any) => sum + (v.views || 0), 0)} views
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Heart size={12} /> {playlistVideos.reduce((sum: number, v: any) => sum + (Array.isArray(v.likes) ? v.likes.length : 0), 0)}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <MessageCircle size={12} /> {playlistVideos.reduce((sum: number, v: any) => sum + (Array.isArray(v.comments) ? v.comments.length : 0), 0)}
                          </span>
                        </div>
                        <button className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center gap-2">
                          Play Now <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {/* Back button */}
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="mb-6 px-4 py-2 bg-slate-700/50 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all flex items-center gap-2"
              >
                ← Back to Batches
              </button>

              {/* Playlist header */}
              <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl p-6 mb-8 border border-emerald-500/30">
                <h3 className="text-2xl font-bold text-white mb-2">{selectedPlaylist}</h3>
                <p className="text-slate-300">{playlists[selectedPlaylist]?.length || 0} videos in this batch</p>
              </div>

              {/* Videos grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(playlists[selectedPlaylist] || []).sort((a, b) => {
                  const numA = parseInt(a.title?.match(/Video (\d+)/)?.[1] || '0');
                  const numB = parseInt(b.title?.match(/Video (\d+)/)?.[1] || '0');
                  return numA - numB;
                }).map((recording, index) => (
                  <div key={recording._id} className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-emerald-500/50 transition-all">
                    {/* Video thumbnail */}
                    <div className="aspect-video relative overflow-hidden">
                      {recording.thumbnailUrl ? (
                        <img
                          src={getProxiedMediaUrl(recording.thumbnailUrl, authToken)}
                          alt={recording.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                          <VideoIcon size={40} className="text-slate-500" />
                        </div>
                      )}

                      {/* Play overlay */}
                      {(recording.s3Url || recording.youtubeVideoId || recording.videoSource === 'youtube') && (
                        <a
                          href={
                            recording.youtubeVideoId || recording.videoSource === 'youtube'
                              ? `/api/community/videos/embed?v=${recording._id}&token=${authToken}`
                              : getProxiedMediaUrl(recording.s3Url!, authToken)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                        >
                          <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                            <ArrowRight size={24} className="text-white ml-0.5" />
                          </div>
                        </a>
                      )}

                      {/* Video number badge */}
                      <div className="absolute top-3 left-3 w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {index + 1}
                      </div>

                      {/* Duration */}
                      {recording.duration && (
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 rounded-lg text-white text-xs font-bold">
                          {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                    </div>

                    {/* Video info */}
                    <div className="p-4">
                      <h4 className="font-bold text-white mb-1">
                        {recording.title?.split(' > ').pop() || `Video ${index + 1}`}
                      </h4>
                      {recording.description && (
                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{recording.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs">
                          {new Date(recording.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-1 text-xs font-bold text-slate-400 rounded-lg">
                            {recording.views || 0}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-1"
                          >
                            <Heart size={14} className={Array.isArray(recording.likes) && recording.likes.length > 0 ? 'fill-red-500 text-red-500' : ''} />
                            <span className="text-xs">{Array.isArray(recording.likes) ? recording.likes.length : 0}</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenComments(recording); }}
                            className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all flex items-center gap-1"
                          >
                            <MessageCircle size={14} />
                            <span className="text-xs">{Array.isArray(recording.comments) ? recording.comments.length : 0}</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditVideo(recording); }}
                            className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteVideo(recording._id); }}
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
