'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Play,
  Layers,
  ArrowRight,
  User,
  Mic,
  Palette,
  Shirt,
  Volume2,
  Film,
  Sliders,
  Move,
  RotateCw,
  FlipHorizontal,
  Check,
} from 'lucide-react';
import {
  FinalAvatar,
  VideoAvatar,
  VoiceAvatar,
} from '@/lib/bunnyAvatarStudioRepository';
import {
  MASTER_BACKGROUNDS,
  MASTER_CLOTHING,
  BackgroundItem,
  ClothingItem,
} from '@/lib/avatarStudioMasterConfig';

interface Module4Props {
  token?: string | null;
  onSelectFinalAvatarForStudio?: (avatar: FinalAvatar) => void;
  onNavigateToEditAvatar?: (avatar?: FinalAvatar) => void;
  preselectedVideoId?: string | null;
  preselectedBgId?: string | null;
  preselectedClothId?: string | null;
}

export default function Module4FinalAvatars({
  token,
  onSelectFinalAvatarForStudio,
  onNavigateToEditAvatar,
  preselectedVideoId,
  preselectedBgId,
  preselectedClothId,
}: Module4Props) {
  const [finalAvatars, setFinalAvatars] = useState<FinalAvatar[]>([]);
  const [videoAvatars, setVideoAvatars] = useState<VideoAvatar[]>([]);
  const [voiceAvatars, setVoiceAvatars] = useState<VoiceAvatar[]>([]);
  const [loading, setLoading] = useState(true);

  // 9-Step Creation Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Wizard Data
  const [wizardName, setWizardName] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState(preselectedVideoId || '');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [selectedBgId, setSelectedBgId] = useState(preselectedBgId || 'bg_kitchen');
  const [selectedClothId, setSelectedClothId] = useState(preselectedClothId || 'cloth_white_kurta');
  const [selectedStyle, setSelectedStyle] = useState('teaching');
  const [selectedEmotion, setSelectedEmotion] = useState('smile:80');
  const [selectedLang, setSelectedLang] = useState('hi');
  const [isSaving, setIsSaving] = useState(false);

  // Avatar Framing & Positioning in Step 7
  const [avatarPosX, setAvatarPosX] = useState(0); // -50% to +50%
  const [avatarPosY, setAvatarPosY] = useState(0); // -30% to +30%
  const [avatarScale, setAvatarScale] = useState(100); // 50% to 160%
  const [avatarFlipped, setAvatarFlipped] = useState(false);
  const [activeCutoutUrl, setActiveCutoutUrl] = useState<string>(
    'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png'
  );

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/avatar/studio-hub');
      const data = await res.json();
      if (data.success) {
        setFinalAvatars(data.finalAvatars || []);
        setVideoAvatars(data.videoAvatars || []);
        setVoiceAvatars(data.voiceAvatars || []);
        if (preselectedVideoId) {
          setSelectedVideoId(preselectedVideoId);
          setIsWizardOpen(true);
        } else if (data.videoAvatars?.[0]) {
          setSelectedVideoId(data.videoAvatars[0].id);
        }
        if (data.voiceAvatars?.[0]) setSelectedVoiceId(data.voiceAvatars[0].id);
      }
    } catch (err) {
      console.error('Fetch final avatars error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const activeVideo = videoAvatars.find((v) => v.id === selectedVideoId) || videoAvatars[0];
  const activeVoice = voiceAvatars.find((v) => v.id === selectedVoiceId) || voiceAvatars[0];
  const activeBg = MASTER_BACKGROUNDS.find((b) => b.id === selectedBgId) || MASTER_BACKGROUNDS[0];
  const activeCloth = MASTER_CLOTHING.find((c) => c.id === selectedClothId) || MASTER_CLOTHING[0];

  const handleSaveFinalAvatar = async () => {
    if (!wizardName.trim()) {
      alert('Please enter a name for your Final Avatar.');
      return;
    }
    setIsSaving(true);
    try {
      const payload: Partial<FinalAvatar> = {
        name: wizardName.trim(),
        videoAvatarId: selectedVideoId,
        voiceAvatarId: selectedVoiceId,
        backgroundId: selectedBgId,
        clothingId: selectedClothId,
        defaultSpeakingStyle: selectedStyle,
        defaultEmotion: selectedEmotion,
        defaultLanguage: selectedLang,
        previewImageUrl: activeBg?.imageUrl || activeVideo?.thumbnailUrl || 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80',
      };

      const res = await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_final_avatar', payload }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        setFinalAvatars((prev) => [data.item, ...prev]);
        setIsWizardOpen(false);
        setWizardName('');
        setStep(1);
      }
    } catch (err) {
      console.error('Save final avatar error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFinalAvatar = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Final Avatar?')) return;
    try {
      await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_final_avatar', payload: { id } }),
      });
      setFinalAvatars((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Delete final avatar error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-500 flex items-center justify-center text-black font-black shadow-lg">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 4: My Final Avatars (Avatar Library)
              </h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Production Combinations
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Combine Video Twins + Voice Profiles + Background Environments + Wardrobe into reusable production avatars.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsWizardOpen(true);
            setStep(1);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 self-start cursor-pointer"
        >
          <Plus size={16} />
          <span>Create New Final Avatar (9 Steps)</span>
        </button>
      </div>

      {/* 9-STEP CREATION WIZARD MODAL */}
      {isWizardOpen && (
        <div className="p-6 bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl space-y-6 animate-in fade-in duration-200">
          {/* Steps Progress Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Step {step} of 9
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {step === 1 && 'Step 1 & 2: Avatar Name & Identity'}
                {step === 2 && 'Step 3: Select Video Avatar (Digital Twin)'}
                {step === 3 && 'Step 4: Select Voice Avatar Profile'}
                {step === 4 && 'Step 5: Select Background Environment'}
                {step === 5 && 'Step 6: Select Clothing & Appearance'}
                {step === 6 && 'Step 7: Default Speaking Style & Emotion'}
                {step === 7 && 'Step 8 & 9: Preview & Save Final Avatar'}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  ← Back
                </button>
              )}
              {step < 7 && (
                <button
                  onClick={() => {
                    if (step === 1 && !wizardName.trim()) {
                      alert('Please enter an avatar name first.');
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold cursor-pointer flex items-center gap-1 shadow"
                >
                  <span>Next Step</span>
                  <ArrowRight size={13} />
                </button>
              )}
              <button
                onClick={() => setIsWizardOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer ml-2"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* STEP 1: Name */}
          {step === 1 && (
            <div className="max-w-xl space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Final Avatar Title
                </label>
                <input
                  type="text"
                  value={wizardName}
                  onChange={(e) => setWizardName(e.target.value)}
                  placeholder="e.g. Swar Teacher Hindi (Vedic Ashram) or Ayurvedic Chef Host"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Give a memorable title describing where and how this final avatar is used.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Primary Presentation Language
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="hi">🇮🇳 Hindi (हिंदी)</option>
                  <option value="mr">🚩 Marathi (मराठी)</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="gu">🇮🇳 Gujarati (ગુજરાતી)</option>
                  <option value="kn">🇮🇳 Kannada (ಕನ್ನಡ)</option>
                  <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: Pick Video Avatar */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Select which digital twin face to use for this combination:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoAvatars.map((v) => {
                  const sel = selectedVideoId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVideoId(v.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        sel ? 'bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-500/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img src={v.thumbnailUrl} alt={v.name} className="w-full aspect-video object-cover rounded-xl mb-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{v.name}</span>
                        {sel && <CheckCircle2 size={16} className="text-amber-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Pick Voice Avatar */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Select the voice identity for this avatar:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {voiceAvatars.map((vc) => {
                  const sel = selectedVoiceId === vc.id;
                  return (
                    <div
                      key={vc.id}
                      onClick={() => setSelectedVoiceId(vc.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                        sel ? 'bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-500/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                          <Mic size={16} />
                        </span>
                        {sel && <CheckCircle2 size={16} className="text-amber-400" />}
                      </div>
                      <h4 className="text-xs font-bold text-white">{vc.name}</h4>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {vc.gender} • {vc.speakingStyle} • Speed {vc.speed}x
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Pick Background */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Select the background scene environment:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                {MASTER_BACKGROUNDS.map((b) => {
                  const sel = selectedBgId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBgId(b.id)}
                      className={`p-2 rounded-xl border cursor-pointer transition-all ${
                        sel ? 'bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-500/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img src={b.imageUrl} alt={b.name} className="w-full h-20 object-cover rounded-lg mb-1" />
                      <span className="text-[11px] font-bold text-white block truncate">{b.name}</span>
                      <span className="text-[10px] text-slate-400 block">{b.category}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Pick Clothing */}
          {step === 5 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Select wardrobe outfit:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MASTER_CLOTHING.map((c) => {
                  const sel = selectedClothId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedClothId(c.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                        sel ? 'bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-500/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{c.icon}</span>
                        {sel && <CheckCircle2 size={16} className="text-amber-400" />}
                      </div>
                      <h4 className="text-xs font-bold text-white">{c.name}</h4>
                      <p className="text-[10px] text-slate-400 leading-tight">{c.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: Speaking Style & Default Emotion */}
          {step === 6 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Default Speaking Style</label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="teaching">Teaching (गुरु व्याख्यान)</option>
                  <option value="conversational">Conversational (सहज संवाद)</option>
                  <option value="motivational">Motivational (उत्साहवर्धक)</option>
                  <option value="spiritual">Spiritual (शांत ध्यान)</option>
                  <option value="storytelling">Storytelling (कथा शैली)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Default Base Emotion</label>
                <select
                  value={selectedEmotion}
                  onChange={(e) => setSelectedEmotion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="smile:80">😊 Gentle Smile (80%)</option>
                  <option value="teaching:85">🧘 Masterclass Instruction (85%)</option>
                  <option value="spiritual:95">🕉️ Deep Stillness (95%)</option>
                  <option value="serious:90">🧐 Vedic Seriousness (90%)</option>
                  <option value="inspire:85">✨ Inspirational (85%)</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 7: Full Preview & Save */}
          {step === 7 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl group">
                    <img src={activeBg?.imageUrl} alt="Background" className="w-full h-full object-cover brightness-75 select-none" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute inset-0 flex items-end justify-center pointer-events-none overflow-hidden">
                      <img
                        src={
                          activeCutoutUrl ||
                          activeVideo?.cutoutUrl ||
                          activeVideo?.transparentAvatarUrl ||
                          'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png'
                        }
                        alt="Avatar"
                        style={{
                          transform: `translate(${avatarPosX}%, ${avatarPosY}%) scale(${avatarScale / 100}) scaleX(${avatarFlipped ? -1 : 1})`,
                          transformOrigin: 'bottom center',
                          transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
                        }}
                        className="w-64 h-72 sm:w-72 sm:h-80 md:w-80 md:h-96 object-contain object-bottom filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)] select-none pointer-events-auto"
                      />
                    </div>
                    <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                      <span className="px-2 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-bold border border-amber-500/30">
                        {activeBg?.badge} • {activeBg?.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/80 text-[10px] text-white font-semibold">
                        {activeCloth?.icon} {activeCloth?.name}
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[9px] font-mono text-emerald-400 border border-emerald-500/30 pointer-events-none">
                      1080p Neural Preview
                    </div>
                  </div>

                  {/* Interactive Framing Controls for Mohan Sir */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <Move size={12} />
                        <span>Edit Avatar Position & Scale</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { setAvatarPosX(0); setAvatarPosY(0); setAvatarScale(100); setAvatarFlipped(false); }}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw size={10} />
                        <span>Center</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5">
                          <span>Horizontal (X)</span>
                          <span className="font-mono text-amber-300">{avatarPosX}%</span>
                        </div>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          value={avatarPosX}
                          onChange={(e) => setAvatarPosX(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5">
                          <span>Vertical (Y)</span>
                          <span className="font-mono text-amber-300">{avatarPosY}%</span>
                        </div>
                        <input
                          type="range"
                          min={-30}
                          max={30}
                          value={avatarPosY}
                          onChange={(e) => setAvatarPosY(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5">
                          <span>Scale / Zoom</span>
                          <span className="font-mono text-amber-300">{avatarScale}%</span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={160}
                          value={avatarScale}
                          onChange={(e) => setAvatarScale(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setAvatarFlipped(!avatarFlipped)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          avatarFlipped ? 'bg-purple-600/30 text-purple-300 border-purple-500' : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <FlipHorizontal size={11} />
                        <span>{avatarFlipped ? 'Mirrored' : 'Normal'}</span>
                      </button>

                      {/* Cutout Presets */}
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-slate-500">Pose:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCutoutUrl('https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png');
                            setSelectedClothId('cloth_white_kurta');
                          }}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            selectedClothId === 'cloth_white_kurta' ? 'bg-amber-500 text-black font-bold' : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          White Kurta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCutoutUrl('https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png');
                            setSelectedClothId('cloth_chef_apron');
                          }}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            selectedClothId === 'cloth_chef_apron' ? 'bg-amber-500 text-black font-bold' : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          Chef Apron
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCutoutUrl('https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png');
                            setSelectedClothId('cloth_saffron_vedic');
                          }}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            selectedClothId === 'cloth_saffron_vedic' ? 'bg-amber-500 text-black font-bold' : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          Saffron
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-base font-bold text-white">{wizardName}</h4>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5 font-sans">
                      <div><strong>Video Twin:</strong> {activeVideo?.name}</div>
                      <div><strong>Voice Profile:</strong> {activeVoice?.name}</div>
                      <div><strong>Background:</strong> {activeBg?.name}</div>
                      <div><strong>Wardrobe:</strong> {activeCloth?.name}</div>
                      <div><strong>Speaking Style:</strong> {selectedStyle} ({selectedEmotion})</div>
                      <div><strong>Primary Language:</strong> {selectedLang.toUpperCase()}</div>
                      <div><strong>Framing:</strong> X: {avatarPosX}%, Y: {avatarPosY}%, Zoom: {avatarScale}%</div>
                    </div>

                    {onNavigateToEditAvatar && (
                      <button
                        type="button"
                        onClick={() => onNavigateToEditAvatar()}
                        className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sliders size={13} />
                        <span>Open Full 3D Avatar Customizer & Props ➔</span>
                      </button>
                    )}
                  </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveFinalAvatar}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-sm rounded-xl shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Saving Final Avatar...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Confirm & Save Final Avatar to Library</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Grid of Saved Final Avatars */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Final Avatar Library</span>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {finalAvatars.length} Ready Avatars
          </span>
        </h3>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading avatars...</div>
        ) : finalAvatars.length === 0 ? (
          <div className="py-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
            <Sparkles size={36} className="mx-auto text-slate-600" />
            <p className="text-sm font-bold text-slate-300">No Final Avatars Saved</p>
            <p className="text-xs text-slate-500">Create your first composite avatar combining video, voice, and background.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {finalAvatars.map((avatar) => {
              const bg = MASTER_BACKGROUNDS.find((b) => b.id === avatar.backgroundId);
              const cloth = MASTER_CLOTHING.find((c) => c.id === avatar.clothingId);
              return (
                <div
                  key={avatar.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <img
                      src={avatar.previewImageUrl}
                      alt={avatar.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-85"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] text-amber-300 font-bold border border-amber-500/30">
                        {bg?.badge || 'Studio'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] text-white font-semibold">
                        {cloth?.icon || '⚪'} {cloth?.name.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {avatar.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 capitalize">
                      Style: <strong>{avatar.defaultSpeakingStyle}</strong> • Lang: <strong>{avatar.defaultLanguage.toUpperCase()}</strong>
                    </p>
                  </div>

                  <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteFinalAvatar(avatar.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Delete final avatar"
                      >
                        <Trash2 size={13} />
                      </button>

                      <button
                        onClick={() => {
                          if (onNavigateToEditAvatar) {
                            onNavigateToEditAvatar(avatar);
                          } else {
                            setWizardName(avatar.name);
                            setSelectedVideoId(avatar.videoAvatarId);
                            setSelectedVoiceId(avatar.voiceAvatarId);
                            if (avatar.backgroundId) setSelectedBgId(avatar.backgroundId);
                            if (avatar.clothingId) setSelectedClothId(avatar.clothingId);
                            setSelectedStyle(avatar.defaultSpeakingStyle);
                            setSelectedEmotion(avatar.defaultEmotion);
                            setSelectedLang(avatar.defaultLanguage);
                            setStep(7);
                            setIsWizardOpen(true);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit Avatar Framing, Clothes & Props"
                      >
                        <Sliders size={12} />
                        <span>Edit Avatar</span>
                      </button>
                    </div>

                    {onSelectFinalAvatarForStudio && (
                      <button
                        onClick={() => onSelectFinalAvatarForStudio(avatar)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-[11px] shadow active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Film size={12} />
                        <span>Use in Video Studio ➔</span>
                      </button>
                    )}
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
