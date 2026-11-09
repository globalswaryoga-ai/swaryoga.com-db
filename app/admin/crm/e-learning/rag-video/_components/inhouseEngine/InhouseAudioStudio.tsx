'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  Sparkles,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Languages,
} from 'lucide-react';
import { InhouseVoiceOption } from '@/lib/avatarEngine/inhouseAudioService';
import { VisemeFrame } from '@/lib/avatarEngine/visemeMapper';

function getAdminAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('adminToken')
    || localStorage.getItem('admin_token')
    || localStorage.getItem('crm_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface InhouseAudioStudioProps {
  onAudioSynthesized?: (data: {
    audioUrl: string;
    durationSeconds: number;
    visemeFrames: VisemeFrame[];
    voiceId: string;
    language: string;
    script: string;
    speed: number;
    pitchHz: number;
  }) => void;
  initialScript?: string;
}

export default function InhouseAudioStudio({
  onAudioSynthesized,
  initialScript = '',
}: InhouseAudioStudioProps) {
  const [scriptText, setScriptText] = useState(
    initialScript ||
      'नमस्ते! मैं मोहन कलबुर्गी हूँ। स्वर योग के इस विशेष सत्र में आपका स्वागत है। आज हम सीखेंगे कि कैसे अपने श्वास के प्रवाह को नियंत्रित करके संपूर्ण स्वास्थ्य, आंतरिक शांति और चेतना को जागृत किया जा सकता है।'
  );

  const [voices, setVoices] = useState<InhouseVoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('hi-IN-MadhurNeural');
  const [speed, setSpeed] = useState<number>(0.98); // 0.8x to 1.3x
  const [pitchHz, setPitchHz] = useState<number>(0); // -10Hz to +10Hz

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [wordCount, setWordCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Voice Catalog on mount
  useEffect(() => {
    async function loadVoices() {
      try {
        const res = await fetch('/api/avatar/inhouse/audio');
        const data = await res.json();
        if (data.success && data.voices) {
          setVoices(data.voices);
          if (!selectedVoiceId && data.voices[0]) {
            setSelectedVoiceId(data.voices[0].id);
          }
        }
      } catch (err: any) {
        console.warn('Failed to fetch voice catalog:', err.message);
      }
    }
    loadVoices();
  }, []);

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId) || voices[0];

  const handleSynthesize = async () => {
    if (!scriptText.trim()) {
      setErrorMsg('Please enter a script text for Mohan Sir to speak.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/avatar/inhouse/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({
          script: scriptText.trim(),
          voiceId: selectedVoiceId,
          language: selectedVoice?.langCode || 'hi',
          speed,
          pitchHz,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize speech');
      }

      setAudioUrl(data.audioUrl);
      setDuration(data.durationSeconds);
      setWordCount(data.wordCount);

      if (onAudioSynthesized) {
        onAudioSynthesized({
          audioUrl: data.audioUrl,
          durationSeconds: data.durationSeconds,
          visemeFrames: data.visemeFrames || [],
          voiceId: data.voiceId,
          language: selectedVoice?.langCode || 'hi',
          script: scriptText,
          speed,
          pitchHz,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during voice synthesis.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAudioUrl = () => {
    if (!audioUrl) return;
    navigator.clipboard.writeText(audioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleApplySample = (sample: string, voiceId: string) => {
    setScriptText(sample);
    setSelectedVoiceId(voiceId);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">In-House Neural Voice Studio</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                Preview TTS • not a voice clone
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Preview voices with approximate text-driven mouth cues. Trained voice cloning and phoneme alignment are not enabled yet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            Provider: <span className="font-bold text-emerald-400">Edge TTS preview</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Editor & Controls */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Languages className="w-4 h-4 text-emerald-400" />
                Spoken Script
              </label>
              <span className="text-xs text-slate-500">
                {scriptText.length} characters • ~{Math.round(scriptText.length / 15)}s
              </span>
            </div>

            <textarea
              rows={6}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Enter what Mohan Sir should say in Hindi, Marathi, English, or regional languages..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm leading-relaxed"
            />

            {/* Speed & Pitch Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Speaking Cadence (Speed)</span>
                  <span className="text-emerald-400 font-semibold">{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.02"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Slow & Meditative</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Vocal Pitch Adjustment</span>
                  <span className="text-emerald-400 font-semibold">{pitchHz > 0 ? `+${pitchHz}` : pitchHz} Hz</span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="1"
                  value={pitchHz}
                  onChange={(e) => setPitchHz(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Deeper Resonance</span>
                  <span>Natural</span>
                  <span>Lighter</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                {errorMsg}
              </div>
            )}

            {/* Generate Trigger Button */}
            <button
              onClick={handleSynthesize}
              disabled={isGenerating}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Synthesizing Speech on In-House Engine...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  Synthesize Voice Audio ($0 Cost)
                </>
              )}
            </button>
          </div>

          {/* Generated Audio Card */}
          {audioUrl && (
            <div className="p-5 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Speech Generated & Stored on Bunny CDN!
                </div>
                <span className="text-xs text-slate-400">
                  Duration: <strong className="text-white">{duration}s</strong> • Words: <strong className="text-white">{wordCount}</strong>
                </span>
              </div>

              {/* Native Audio Element */}
              <audio controls src={audioUrl} className="w-full h-11 rounded-lg" />

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleCopyAudioUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Bunny CDN URL
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy CDN Audio Link
                    </>
                  )}
                </button>

                <a
                  href={audioUrl}
                  download="mohan_sir_speech.mp3"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Download MP3
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Voice Selector & Presets */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3.5">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              Available Neural Voices ({voices.length || 10})
            </h3>
            <p className="text-xs text-slate-400">
              Zero-credit neural voices pre-configured for authentic Indian resonance.
            </p>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {voices.map((v) => {
                const isSelected = v.id === selectedVoiceId;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoiceId(v.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">{v.name}</span>
                          {v.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {v.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{v.tone}</p>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {v.langCode.toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60">
                      <span className="text-slate-500 italic truncate max-w-[200px]">
                        "{v.sampleText.slice(0, 32)}..."
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplySample(v.sampleText, v.id);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-medium text-[11px]"
                      >
                        Use Sample
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
