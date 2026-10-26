'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  User,
  Camera,
  Mic,
  Video,
  Upload,
  Trash2,
  CheckCircle2,
  Sparkles,
  Loader2,
  Volume2,
  Layers,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import AdminMediaRecorder from './AdminMediaRecorder';

interface AvatarPreset {
  avatarId: string;
  name: string;
  avatarType: 'face_photo' | 'video_clip' | 'voice_sample';
  mediaUrl: string;
  thumbnailUrl?: string;
  language: string;
  notes?: string;
  createdAt: string;
}

interface AvatarSettingsViewProps {
  token: string | null;
  selectedAvatarId?: string;
  onSelectAvatarId?: (avatarId: string) => void;
}

const VOICE_OPTIONS = [
  { id: 'onyx', name: 'Onyx (Deep, Grounded Male)', desc: 'Ideal for meditative Sadhana & slow instruction' },
  { id: 'alloy', name: 'Alloy (Balanced & Authoritative)', desc: 'Standard crisp teaching tone' },
  { id: 'echo', name: 'Echo (Calm, Resonant Male)', desc: 'Gentle yogic guidance' },
  { id: 'fable', name: 'Fable (Warm Storyteller)', desc: 'Philosophical & scripture lectures' },
  { id: 'nova', name: 'Nova (Dynamic Female)', desc: 'Energetic practice pacing' },
  { id: 'shimmer', name: 'Shimmer (Clarity Female)', desc: 'Calm breathwork pacing' },
];

export default function AvatarSettingsView({
  token,
  selectedAvatarId,
  onSelectAvatarId,
}: AvatarSettingsViewProps) {
  const [avatars, setAvatars] = useState<AvatarPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const [activeVoice, setActiveVoice] = useState('onyx');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualType, setManualType] = useState<'face_photo' | 'video_clip' | 'voice_sample'>('face_photo');
  const [savingManual, setSavingManual] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAvatars = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/e-learning/ai-video/avatars', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAvatars(data.data);
      }
    } catch (e: any) {
      console.warn('Could not load avatars:', e?.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAvatars();
    const storedVoice = localStorage.getItem('mohan_preferred_voice');
    if (storedVoice) setActiveVoice(storedVoice);
  }, [fetchAvatars]);

  const handleSelectVoice = (voiceId: string) => {
    setActiveVoice(voiceId);
    localStorage.setItem('mohan_preferred_voice', voiceId);
  };

  const handleDelete = async (avatarId: string) => {
    if (!token || !window.confirm('Delete this avatar preset?')) return;
    setDeletingId(avatarId);
    try {
      const res = await fetch(`/api/admin/e-learning/ai-video/avatars?id=${avatarId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAvatars((prev) => prev.filter((a) => a.avatarId !== avatarId));
      }
    } catch {
      setErrorMsg('Failed to delete avatar');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualUrl.trim() || !token) return;
    setSavingManual(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/e-learning/ai-video/avatars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: manualName.trim(),
          mediaUrl: manualUrl.trim(),
          avatarType: manualType,
          language: 'hi',
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAvatars((prev) => [data.data, ...prev]);
        setManualName('');
        setManualUrl('');
      } else {
        setErrorMsg(data.error || 'Failed to save preset');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error');
    } finally {
      setSavingManual(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Avatar Setting (Mohan Sir Avatar & Voice Presets)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage Mohan Sir&apos;s face portraits, reference video clips, and voice samples used for multi-language video dubbing.
          </p>
        </div>

        <button
          onClick={() => setShowRecorder((prev) => !prev)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 self-start"
        >
          <Camera className="w-4 h-4" />
          {showRecorder ? 'Hide Live Camera' : 'Record New Avatar / Voice'}
        </button>
      </div>

      {/* Featured Banner: AI Avatar Creation Studio with Scenes & Languages */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 border-2 border-amber-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
            🕉️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                New AI Avatar & Emotion Studio (Kitchen, Clothes & Multilingual Play)
              </h3>
              <span className="text-[10px] font-bold bg-amber-400 text-black px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Change background scenes (Kitchen & Recipes, Vedic Ashram, Product Studio), clothes/wardrobe, select language & listen to audio in real time!
            </p>
          </div>
        </div>
        <Link
          href="/admin/avatar-studio"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-black font-extrabold text-xs shadow-lg shrink-0 flex items-center gap-1.5 transition-all active:scale-95 text-center justify-center"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch AI Avatar Studio ➔</span>
        </Link>
      </div>

      {/* Embedded Live Recorder */}
      {showRecorder && (
        <div className="p-4 bg-slate-900/80 border border-purple-500/30 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              Live Studio Recorder (1080p WebM to Bunny CDN)
            </span>
            <span className="text-[10px] text-slate-400">Captures high-res face portrait or voice sample</span>
          </div>
          <AdminMediaRecorder
            token={token}
            onSavedPreset={(preset) => {
              if (preset) setAvatars((prev) => [preset, ...prev]);
              setShowRecorder(false);
            }}
          />
        </div>
      )}

      {/* Voice Clone Selection */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Default Voice Persona for Spoken Lectures</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Select Mohan Sir&apos;s primary vocal delivery style when rendering dubs into English, Spanish, Russian, German, etc.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {VOICE_OPTIONS.map((v) => {
            const isSelected = activeVoice === v.id;
            return (
              <div
                key={v.id}
                onClick={() => handleSelectVoice(v.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{v.name}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saved Avatar Presets Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Saved Mohan Sir Avatar Presets</h3>
          </div>
          <span className="text-xs text-slate-400">{avatars.length} Presets Available</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            Loading avatar presets...
          </div>
        ) : avatars.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-4">
            <User className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-300 font-medium">No avatar presets found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Click &quot;Record New Avatar / Voice&quot; above to capture Mohan Sir&apos;s face or enter a photo URL below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {avatars.map((av) => {
              const isSelected = selectedAvatarId === av.mediaUrl;
              return (
                <div
                  key={av.avatarId}
                  className={`bg-slate-950/70 border rounded-xl overflow-hidden p-3 transition-all ${
                    isSelected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Media Preview */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2.5 flex items-center justify-center">
                    {av.avatarType === 'voice_sample' ? (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Mic className="w-6 h-6 text-purple-400" />
                        <span className="text-[10px]">Voice Sample Audio</span>
                        <audio controls src={av.mediaUrl} className="h-6 w-40 mt-1" />
                      </div>
                    ) : av.avatarType === 'video_clip' ? (
                      <video src={av.mediaUrl} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={av.mediaUrl} alt={av.name} className="w-full h-full object-cover" />
                    )}

                    <span className="absolute top-1.5 left-1.5 text-[9px] uppercase font-bold bg-black/70 backdrop-blur-sm text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">
                      {av.avatarType.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate">{av.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(av.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => onSelectAvatarId?.(av.mediaUrl)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isSelected ? 'Active Preset ✓' : 'Use for Dubbing'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(av.mediaUrl, av.avatarId)}
                      title="Copy CDN URL"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    >
                      {copiedId === av.avatarId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(av.avatarId)}
                      disabled={deletingId === av.avatarId}
                      title="Delete Preset"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Preset Addition */}
      <form onSubmit={handleAddManual} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5 text-purple-400" />
          Link Existing Photo / Video / CDN URL as Mohan Sir Avatar
        </h3>
        {errorMsg && (
          <div className="p-2 text-xs bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {errorMsg}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            placeholder="Preset Name (e.g. Mohan Sir Studio Portrait)"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          />
          <input
            type="text"
            placeholder="Bunny CDN URL (https://...)"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          />
          <div className="flex gap-2">
            <select
              value={manualType}
              onChange={(e) => setManualType(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="face_photo">Face Photo</option>
              <option value="video_clip">Video Clip</option>
              <option value="voice_sample">Voice Sample</option>
            </select>
            <button
              type="submit"
              disabled={savingManual}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {savingManual ? 'Saving...' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
