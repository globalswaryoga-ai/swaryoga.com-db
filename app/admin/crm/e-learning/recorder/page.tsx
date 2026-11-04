'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeft, Video, Mic, Sparkles, Trash2, ExternalLink, 
  Play, CheckCircle2, ShieldCheck, Film, RefreshCw, Loader2, ArrowRight
} from 'lucide-react';
import AdminMediaRecorder from '../rag-video/_components/AdminMediaRecorder';

export default function AdminMobileRecorderPage() {
  const router = useRouter();
  const token = useAuth();
  const [avatars, setAvatars] = useState<any[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [activeTab, setActiveTab] = useState<'recorder' | 'presets'>('recorder');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Superadmin check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || '';
    let legacyPerms: string[] = [];
    let pv2: any = null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = u?.userId || resolvedUserId;
        legacyPerms = Array.isArray(u?.permissions) ? u.permissions : [];
        pv2 = u?.permissionsV2 || null;
      } catch {}
    }
    setIsSuperAdmin(
      resolvedUserId === 'admin' || 
      resolvedUserId === 'admincrm' || 
      legacyPerms.includes('all') || 
      pv2?.isSuperAdmin === true
    );
  }, []);

  // Fetch saved avatars
  const fetchAvatars = useCallback(async () => {
    if (!token) return;
    setLoadingAvatars(true);
    try {
      const res = await fetch('/api/admin/e-learning/ai-video/avatars', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAvatars(data.data);
      }
    } catch (e) {
      console.warn('Could not fetch avatars:', e);
    } finally {
      setLoadingAvatars(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  // Handle Delete Preset
  const handleDeleteAvatar = async (id: string) => {
    if (!confirm('Are you sure you want to remove this avatar/voice preset?') || !token) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/e-learning/ai-video/avatars?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAvatars((prev) => prev.filter((a) => a.avatarId !== id));
      }
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-3 sm:p-6 pb-24">
      {/* Top Header Navigation */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6">
        <Link
          href="/admin/crm/mohan-rag"
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Mohan RAG</span>
        </Link>

        {/* Tab switch */}
        <div className="flex items-center bg-gray-900 border border-gray-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('recorder')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'recorder'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Live Recorder
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Saved Presets</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-purple-300">
              {avatars.length}
            </span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Recording Studio View */}
        {activeTab === 'recorder' && (
          <div className="space-y-4">
            <AdminMediaRecorder
              token={token}
              onSavedPreset={(preset) => {
                setAvatars((prev) => [preset, ...prev]);
              }}
              onMediaReady={(media) => {
                // Navigate to RAG Studio with preset preselected
                router.push(`/admin/crm/e-learning/rag-video?mediaUrl=${encodeURIComponent(media.url)}&title=${encodeURIComponent(media.name)}`);
              }}
            />

            {/* Quick Tips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-gray-950 border border-gray-800/80 rounded-2xl">
                <span className="text-purple-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                  <Film className="w-3.5 h-3.5" /> 1080p Video Tips
                </span>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Record with good lighting on your face. Keep your head centered and look directly at the phone camera.
                </p>
              </div>

              <div className="p-3.5 bg-gray-950 border border-gray-800/80 rounded-2xl">
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                  <Mic className="w-3.5 h-3.5" /> Studio Voice Tips
                </span>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Speak clearly in Hindi or Marathi for 1 minute in a quiet room. The AI uses this to clone your exact voice.
                </p>
              </div>

              <div className="p-3.5 bg-gray-950 border border-gray-800/80 rounded-2xl">
                <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Bunny CDN
                </span>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  All recordings are permanently saved on high-speed Bunny CDN and securely linked to your database.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Saved Presets View */}
        {activeTab === 'presets' && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Your Avatar & Voice Library</h3>
                <p className="text-xs text-gray-400">Manage all saved faces, video clips, and voice samples</p>
              </div>
              <button
                onClick={fetchAvatars}
                disabled={loadingAvatars}
                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAvatars ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingAvatars ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-purple-400" />
                <span className="text-xs">Loading library...</span>
              </div>
            ) : avatars.length === 0 ? (
              <div className="py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-2xl p-6">
                <Video className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                <p className="text-xs text-gray-400 font-semibold mb-1">No saved presets yet</p>
                <p className="text-[11px] text-gray-500 mb-4">Record your first avatar video or voice sample above.</p>
                <button
                  onClick={() => setActiveTab('recorder')}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
                >
                  Open Live Recorder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {avatars.map((avatar) => (
                  <div
                    key={avatar.avatarId}
                    className="p-4 bg-black/60 border border-gray-800 hover:border-purple-500/40 rounded-2xl transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          avatar.avatarType === 'video_clip'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {avatar.avatarType === 'video_clip' ? '🎥 Video Clip' : '🎙️ Voice Sample'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(avatar.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                        {avatar.name}
                      </h4>

                      {/* Media player preview */}
                      <div className="my-3 rounded-xl overflow-hidden bg-gray-950 border border-gray-800 aspect-video flex items-center justify-center">
                        {avatar.avatarType === 'video_clip' ? (
                          <video src={avatar.mediaUrl} controls className="w-full h-full object-cover" />
                        ) : (
                          <audio src={avatar.mediaUrl} controls className="w-full px-2" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-800/80 gap-2">
                      <button
                        onClick={() => handleDeleteAvatar(avatar.avatarId)}
                        disabled={deletingId === avatar.avatarId}
                        className="p-2 rounded-xl hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors text-xs flex items-center gap-1"
                      >
                        {deletingId === avatar.avatarId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Delete</span>
                      </button>

                      <Link
                        href={`/admin/crm/e-learning/rag-video?mediaUrl=${encodeURIComponent(avatar.mediaUrl)}&title=${encodeURIComponent(avatar.name)}`}
                        className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <span>Use for AI Job</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
