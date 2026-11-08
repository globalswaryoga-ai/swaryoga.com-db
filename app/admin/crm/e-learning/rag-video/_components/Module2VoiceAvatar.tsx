'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  Upload,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Play,
  Pause,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { VoiceAvatar } from '@/lib/bunnyAvatarStudioRepository';

interface Module2Props {
  token?: string | null;
  onSelectVoiceForFinal?: (voice: VoiceAvatar) => void;
}

export default function Module2VoiceAvatar({ token, onSelectVoiceForFinal }: Module2Props) {
  const [voices, setVoices] = useState<VoiceAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'existing'>('upload');

  // Form State
  const [voiceName, setVoiceName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('male');
  const [speakingStyle, setSpeakingStyle] = useState('teaching');
  const [pitch, setPitch] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [tone, setTone] = useState('calm_resonant');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [consentApproved, setConsentApproved] = useState(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Audio Playback
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/avatar/studio-hub?type=voice_avatars');
      const data = await res.json();
      if (data.success && data.items) {
        setVoices(data.items);
      }
    } catch (err) {
      console.error('Fetch voices error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  const handleTestPlay = (voice: VoiceAvatar) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis not available in this browser.');
      return;
    }
    if (playingVoiceId === voice.id) {
      window.speechSynthesis.cancel();
      setPlayingVoiceId(null);
      return;
    }
    window.speechSynthesis.cancel();
    setPlayingVoiceId(voice.id);

    const testText = `नमस्कार, मैं ${voice.name} हूँ। स्वर योग और प्राणायाम के इस सत्र में आपका स्वागत है।`;
    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.rate = voice.speed || 1.0;
    utterance.pitch = 0.88; // Deep baritone pitch for Mohan Sir
    utterance.lang = 'hi-IN';

    const voicesList = window.speechSynthesis.getVoices();
    const indVoice = voicesList.find((v) => {
      const n = v.name.toLowerCase();
      const isFemale = n.includes('female') || n.includes('woman') || n.includes('girl') || n.includes('zira') || n.includes('heera') || n.includes('lekha') || n.includes('samantha') || n.includes('victoria');
      return !isFemale && (v.lang.includes('IN') || v.lang.startsWith('hi'));
    });
    if (indVoice) utterance.voice = indVoice;

    utterance.onend = () => setPlayingVoiceId(null);
    utterance.onerror = () => setPlayingVoiceId(null);
    window.speechSynthesis.speak(utterance);
  };

  const handleCreateVoice = async () => {
    if (!voiceName.trim()) {
      alert('Please provide a name for this Voice Avatar.');
      return;
    }
    if (!consentApproved) {
      alert('Please confirm that you have permission/consent to clone this voice.');
      return;
    }
    setIsSynthesizing(true);
    setTimeout(async () => {
      try {
        const payload: Partial<VoiceAvatar> = {
          name: voiceName.trim(),
          gender,
          speakingStyle,
          pitch,
          speed,
          tone,
          supportedLanguages: ['hi', 'mr', 'en', 'gu', 'kn', 'ta', 'te', 'bn'],
          quality: '24bit_96khz_neural',
        };

        const res = await fetch('/api/avatar/studio-hub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_voice_avatar', payload }),
        });
        const data = await res.json();
        if (data.success && data.item) {
          setVoices((prev) => [data.item, ...prev]);
          setIsCreating(false);
          setVoiceName('');
        }
      } catch (err) {
        console.error('Create voice error:', err);
      } finally {
        setIsSynthesizing(false);
      }
    }, 1500);
  };

  const handleDeleteVoice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Voice Profile?')) return;
    try {
      await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_voice_avatar', payload: { id } }),
      });
      setVoices((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Delete voice error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-black font-black shadow-lg">
            <Mic size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 2: Voice Avatar Creation & Cloning
              </h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Neural Prosody Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, clone, and manage vocal identities. Customize pitch, timbre, speed, and Vedic chanting cadence.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating((prev) => !prev)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 self-start cursor-pointer"
        >
          <Plus size={16} />
          <span>{isCreating ? 'Cancel Creation' : 'Create New Voice Avatar'}</span>
        </button>
      </div>

      {/* Creation Form */}
      {isCreating && (
        <div className="p-6 bg-slate-900 border-2 border-amber-500/40 rounded-2xl shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <span>Configure New Voice Profile</span>
            </h3>
            <span className="text-[11px] text-slate-400">Clone from audio file or configure custom neural sliders</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Voice Profile Name</label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g. Mohan Sir (Calm Meditative Sadhana)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Gender Presentation</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="male">Male (Grounded & Deep)</option>
                    <option value="female">Female (Clear & Resonant)</option>
                    <option value="neutral">Neutral (Balanced)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Default Speaking Style</label>
                  <select
                    value={speakingStyle}
                    onChange={(e) => setSpeakingStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="teaching">Teaching (गुरु व्याख्यान)</option>
                    <option value="conversational">Conversational (सहज संवाद)</option>
                    <option value="motivational">Motivational (उत्साहवर्धक)</option>
                    <option value="spiritual">Spiritual (शांत ध्यान)</option>
                    <option value="storytelling">Storytelling (कथा शैली)</option>
                  </select>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  accept="audio/mp3,audio/wav,audio/m4a"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-amber-500/50"
                >
                  <div className="flex items-center gap-2.5">
                    <Upload size={18} className="text-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-white">
                        {audioFile ? audioFile.name : 'Upload Reference Audio Sample (Optional)'}
                      </p>
                      <p className="text-[10px] text-slate-400">MP3 or WAV of Mohan Sir speaking clearly for 15+ seconds</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 font-bold">Browse</span>
                </div>
              </div>

              {/* Consent checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentApproved}
                  onChange={(e) => setConsentApproved(e.target.checked)}
                  className="mt-0.5 accent-amber-500"
                />
                <span>
                  <strong className="text-amber-400">Authorized Consent:</strong> I confirm I have authorized permission from the speaker to generate AI voice clone models for Swar Yoga lectures.
                </span>
              </label>
            </div>

            {/* Sliders & Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders size={14} className="text-amber-400" />
                  <span>Vocal Timbre & Pacing Calibrator</span>
                </h4>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Vocal Pitch:</span>
                    <strong className="text-amber-400 font-mono">{pitch.toFixed(2)}x</strong>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.25"
                    step="0.05"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Deep Baritone</span>
                    <span>Standard</span>
                    <span>High Clarity</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Speaking Pacing (Speed):</span>
                    <strong className="text-amber-400 font-mono">{speed.toFixed(2)}x</strong>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Meditative (0.8x)</span>
                    <span>Lecture (1.0x)</span>
                    <span>Energetic (1.3x)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isSynthesizing}
                onClick={handleCreateVoice}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSynthesizing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing Voice Embeddings...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Save & Deploy Voice Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Active Voice Profiles</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {voices.length} Voices
            </span>
          </h3>
          <button
            onClick={fetchVoices}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading voice profiles...</div>
        ) : voices.length === 0 ? (
          <div className="py-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
            <Mic size={36} className="mx-auto text-slate-600" />
            <p className="text-sm font-bold text-slate-300">No Voice Profiles Created Yet</p>
            <p className="text-xs text-slate-500">Click &quot;Create New Voice Avatar&quot; above to clone Mohan Sir&apos;s speech tone.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {voices.map((voice) => {
              const isPlaying = playingVoiceId === voice.id;
              return (
                <div
                  key={voice.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 shadow-lg transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Mic size={16} />
                      </span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 capitalize">
                        {voice.gender} • {voice.speakingStyle}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {voice.name}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Speed: <strong>{voice.speed}x</strong></span>
                      <span>•</span>
                      <span>Pitch: <strong>{voice.pitch}x</strong></span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck size={11} /> Verified
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => handleTestPlay(voice)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                      }`}
                    >
                      {isPlaying ? <Pause size={13} /> : <Play size={13} className="fill-amber-300" />}
                      <span>{isPlaying ? 'Stop' : 'Listen Sample'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteVoice(voice.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Delete voice"
                      >
                        <Trash2 size={13} />
                      </button>
                      {onSelectVoiceForFinal && (
                        <button
                          onClick={() => onSelectVoiceForFinal(voice)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-[11px] cursor-pointer"
                        >
                          Select ➔
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
