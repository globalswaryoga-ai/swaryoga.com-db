'use client';

import React, { useState } from 'react';
import {
  Palette,
  Shirt,
  Users,
  Image as ImageIcon,
  Check,
  Sparkles,
  ExternalLink,
  Sliders,
  Maximize2,
  Layers,
  Box,
  Eye,
} from 'lucide-react';
import Avatar3DCanvas from './Avatar3DCanvas';
import {
  BACKGROUND_CATEGORIES,
  MASTER_BACKGROUNDS,
  MASTER_CLOTHING,
  MULTI_AVATAR_LAYOUTS,
  MASTER_POSTURES,
  BackgroundItem,
  ClothingItem,
  MultiAvatarLayout,
  AvatarPostureItem,
} from '@/lib/avatarStudioMasterConfig';
import { VideoAvatar } from '@/lib/bunnyAvatarStudioRepository';

interface Module3Props {
  selectedAvatar?: VideoAvatar | null;
  avatarCutoutUrl?: string | null;
  selectedBackgroundId?: string;
  selectedClothingId?: string;
  selectedLayoutId?: string;
  onSelectBackground?: (bg: BackgroundItem) => void;
  onSelectClothing?: (cloth: ClothingItem) => void;
  onSelectLayout?: (layout: MultiAvatarLayout) => void;
  onProceedToFinalAvatar?: (options: { backgroundId: string; clothingId: string; layoutId: string }) => void;
}

export default function Module3BackgroundStudio({
  selectedAvatar,
  avatarCutoutUrl,
  selectedBackgroundId = 'bg_kitchen',
  selectedClothingId = 'cloth_chef_apron',
  selectedLayoutId = 'single_center',
  onSelectBackground,
  onSelectClothing,
  onSelectLayout,
  onProceedToFinalAvatar,
}: Module3Props) {
  const [activeTab, setActiveTab] = useState<'backgrounds' | 'clothing' | 'postures' | 'multi_avatar'>('backgrounds');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [bgBlur, setBgBlur] = useState<number>(0);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#FFFFFF');
  const [glassesEnabled, setGlassesEnabled] = useState<boolean>(false);
  const [tilakEnabled, setTilakEnabled] = useState<boolean>(true);
  const [is3DMode, setIs3DMode] = useState<boolean>(true);

  // Local active selections
  const [curBgId, setCurBgId] = useState<string>(selectedBackgroundId);
  const [curClothId, setCurClothId] = useState<string>(selectedClothingId);
  const [curLayoutId, setCurLayoutId] = useState<string>(selectedLayoutId);
  const [curPostureId, setCurPostureId] = useState<string>('posture_standing');

  const filteredBackgrounds =
    selectedCategory === 'All'
      ? MASTER_BACKGROUNDS
      : MASTER_BACKGROUNDS.filter((b) => b.category === selectedCategory);

  const activeBg = MASTER_BACKGROUNDS.find((b) => b.id === curBgId) || MASTER_BACKGROUNDS[0];
  const activeCloth = MASTER_CLOTHING.find((c) => c.id === curClothId) || MASTER_CLOTHING[0];
  const activeLayout = MULTI_AVATAR_LAYOUTS.find((l) => l.id === curLayoutId) || MULTI_AVATAR_LAYOUTS[0];
  const activePosture = MASTER_POSTURES.find((p) => p.id === curPostureId) || MASTER_POSTURES[0];

  const handlePickBg = (bg: BackgroundItem) => {
    setCurBgId(bg.id);
    onSelectBackground?.(bg);
  };

  const handlePickPosture = (posture: AvatarPostureItem) => {
    setCurPostureId(posture.id);
  };

  const handlePickCloth = (cloth: ClothingItem) => {
    setCurClothId(cloth.id);
    onSelectClothing?.(cloth);
  };

  const handlePickLayout = (layout: MultiAvatarLayout) => {
    setCurLayoutId(layout.id);
    onSelectLayout?.(layout);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-black font-black shadow-lg">
            <Palette size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 3: Background, Clothing & Appearance Studio
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                20 Categories • Outfits • Multi-Avatars
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select high-definition environments (Kitchen, Library, Swimming Tank, Nature), wardrobe clothing, and multi-avatar scene layouts.
            </p>
          </div>
        </div>

        {/* Studio Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start text-xs font-bold">
          <button
            onClick={() => setActiveTab('backgrounds')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'backgrounds' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon size={14} />
            <span>20 Backgrounds</span>
          </button>
          <button
            onClick={() => setActiveTab('clothing')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'clothing' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shirt size={14} />
            <span>Clothing & Looks</span>
          </button>
          <button
            onClick={() => setActiveTab('postures')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'postures' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>3D Body Postures & Yoga</span>
          </button>
          <button
            onClick={() => setActiveTab('multi_avatar')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'multi_avatar' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Multi-Avatars in Scene</span>
          </button>
        </div>
      </div>

      {/* Live Composited Preview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Layers size={15} className="text-emerald-400" />
              <span>Stage Composition Preview</span>
            </span>

            {/* 3D vs 2D Mode Switch */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setIs3DMode(true)}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  is3DMode ? 'bg-teal-500 text-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box size={13} />
                <span>Option A: 3D WebGL Rig</span>
              </button>
              <button
                onClick={() => setIs3DMode(false)}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !is3DMode ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={13} />
                <span>2D Stage View</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span>Posture: <strong className="text-teal-400">{activePosture.name}</strong></span>
            <span>•</span>
            <span>Background: <strong className="text-emerald-400">{activeBg.name}</strong></span>
            <span>•</span>
            <span>Outfit: <strong className="text-amber-400">{activeCloth.name}</strong></span>

            {onProceedToFinalAvatar && (
              <button
                onClick={() =>
                  onProceedToFinalAvatar({
                    backgroundId: curBgId,
                    clothingId: curClothId,
                    layoutId: curLayoutId,
                  })
                }
                className="ml-2 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Save to Final Avatar ➔</span>
              </button>
            )}
          </div>
        </div>

        {/* Viewport: 3D WebGL Rig (Option A) vs 2D Stage Composite */}
        {is3DMode ? (
          <Avatar3DCanvas
            avatarCutoutUrl={
              avatarCutoutUrl ||
              selectedAvatar?.cutoutUrl ||
              selectedAvatar?.transparentAvatarUrl ||
              'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png'
            }
            postureId={curPostureId}
            backgroundUrl={customUrl || activeBg.imageUrl}
            clothingName={activeCloth.name}
            clothingId={curClothId}
            blur={bgBlur}
            tilakEnabled={tilakEnabled}
            glassesEnabled={glassesEnabled}
          />
        ) : (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner group">
            {/* Background Layer with blur support */}
            {activeBg.category === 'Plain Background' ? (
              <div className="w-full h-full bg-[#00cc44] flex items-center justify-center font-black text-black/30 text-2xl tracking-widest uppercase">
                CHROMA KEY GREEN (#00FF00)
              </div>
            ) : (
              <img
                src={customUrl || activeBg.imageUrl}
                alt={activeBg.name}
                style={{ filter: `blur(${bgBlur}px)` }}
                className="w-full h-full object-cover transition-all duration-300"
              />
            )}

            {/* Overlay Vibe */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            {/* Avatars according to Layout - Uses Extracted Digital Twin Cutout */}
            {activeLayout.avatarCount === 1 ? (
              <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
                <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] flex flex-col items-center justify-end">
                  {/* Extracted Mohan Sir Clean Cutout with drop-shadow and depth */}
                  <img
                    src={
                      avatarCutoutUrl ||
                      selectedAvatar?.cutoutUrl ||
                      selectedAvatar?.transparentAvatarUrl ||
                      'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png'
                    }
                    alt={selectedAvatar?.name || 'Mohan Sir Extracted Avatar'}
                    className="w-full h-full object-contain object-bottom filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)]"
                  />

                  {/* Subtle clothing style badge / attire overlay indicator */}
                  <div className="absolute bottom-3 inset-x-8 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-500/40 text-center shadow-xl">
                    <span className="text-xs text-emerald-300 font-extrabold flex items-center justify-center gap-2">
                      <span>{activeCloth.icon}</span>
                      <span>Mohan Sir in {activeCloth.name}</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-0 flex justify-around px-6 pointer-events-none">
                <div className="relative w-48 h-64 sm:w-56 sm:h-72 flex flex-col items-center justify-end">
                  <img
                    src={
                      avatarCutoutUrl ||
                      selectedAvatar?.cutoutUrl ||
                      selectedAvatar?.transparentAvatarUrl ||
                      'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png'
                    }
                    alt="Host Avatar"
                    className="w-full h-full object-contain object-bottom filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.95)]"
                  />
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] bg-black/90 px-2 py-0.5 rounded-md text-emerald-300 font-bold border border-emerald-500/40 whitespace-nowrap">
                    Presenter 1 ({activeCloth.name})
                  </span>
                </div>
                <div className="relative w-44 h-56 sm:w-52 sm:h-64 flex flex-col items-center justify-end">
                  <img
                    src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80"
                    alt="Guest / Student Avatar"
                    className="w-40 h-40 sm:w-48 sm:h-48 object-cover object-top rounded-full filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.9)] border-2 border-amber-400/50"
                  />
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] bg-black/80 px-2 py-0.5 rounded-md text-amber-300 font-bold whitespace-nowrap">
                    Presenter 2 (Guest / Student)
                  </span>
                </div>
              </div>
            )}

            {/* Floating Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur text-[11px] text-emerald-300 font-bold border border-emerald-500/30">
                {activeBg.badge}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur text-[11px] text-white font-semibold border border-slate-700/60">
                {activeCloth.icon} {activeCloth.name}
              </span>
            </div>

            {/* Quick Blur Slider in preview */}
            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2 text-xs text-slate-300">
              <span>Background Blur:</span>
              <input
                type="range"
                min="0"
                max="10"
                value={bgBlur}
                onChange={(e) => setBgBlur(Number(e.target.value))}
                className="w-20 accent-emerald-400 cursor-pointer"
              />
              <span className="font-mono text-emerald-400 font-bold text-[11px]">{bgBlur}px</span>
            </div>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: 20 BACKGROUND CATEGORIES */}
      {activeTab === 'backgrounds' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs">
            {['All', ...BACKGROUND_CATEGORIES].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Custom Upload bar */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs font-bold text-slate-300 shrink-0 flex items-center gap-1.5">
              <ExternalLink size={14} className="text-emerald-400" />
              <span>Custom Image / Video Scene URL:</span>
            </span>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Paste direct CDN image or video URL for your kitchen, studio, or resort..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 w-full"
            />
            {customUrl && (
              <button
                onClick={() => setCustomUrl('')}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold shrink-0 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Backgrounds Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredBackgrounds.map((bg) => {
              const isSelected = curBgId === bg.id;
              return (
                <div
                  key={bg.id}
                  onClick={() => handlePickBg(bg)}
                  className={`rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-slate-800 shadow-xl'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    {bg.category === 'Plain Background' ? (
                      <div className="w-full h-full bg-[#00cc44] flex items-center justify-center font-black text-black/40 text-xs">
                        CHROMA GREEN
                      </div>
                    ) : (
                      <img
                        src={bg.imageUrl}
                        alt={bg.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                      {bg.badge}
                    </span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-400 text-black flex items-center justify-center font-bold text-[11px] shadow">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {bg.name}
                      </h5>
                      <p className="text-[10px] text-slate-400 leading-snug mt-1">
                        {bg.description}
                      </p>
                    </div>
                    <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-800/80 mt-2">
                      <span>Category: {bg.category}</span>
                      <span className="text-emerald-400 font-bold">{isSelected ? 'Active' : 'Select'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CLOTHING & APPEARANCE */}
      {activeTab === 'clothing' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Shirt size={16} className="text-amber-400" />
                <span>Select Wardrobe Outfit & Clothing Style</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Preserve Mohan Sir&apos;s face identity while changing outfits from Chef Aprons to Vedic Kurtas.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tilakEnabled}
                  onChange={(e) => setTilakEnabled(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Chandan Tilak (चन्दन तिलक)</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={glassesEnabled}
                  onChange={(e) => setGlassesEnabled(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Reading Glasses (चश्मा)</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MASTER_CLOTHING.map((cloth) => {
              const isSelected = curClothId === cloth.id;
              return (
                <div
                  key={cloth.id}
                  onClick={() => handlePickCloth(cloth)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-800 shadow-xl'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{cloth.icon}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white group-hover:text-amber-300">
                        {cloth.name}
                      </h5>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">
                        {cloth.description}
                      </p>
                    </div>

                    {/* Color Swatches */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">
                        Available Shades:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {cloth.availableColors.map((hex) => (
                          <span
                            key={hex}
                            style={{ backgroundColor: hex }}
                            className="w-4 h-4 rounded-full border border-slate-700 inline-block shadow-xs"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-3 border-t border-slate-800/80 text-[10px] text-slate-500 uppercase font-semibold">
                    Category: {cloth.category}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 3D BODY & YOGA POSTURES */}
      {activeTab === 'postures' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-teal-400" />
                <span>3D Body Postures & Dynamic Activities (शारीरिक मुद्रा एवं योग आसन)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch Mohan Sir&apos;s physical posture between Standing Keynote, Desk Sitting, Sukhasana, Lotus, Asanas, and Activities.
              </p>
            </div>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2.5 py-1 rounded-full font-bold">
              54-Joint Rig • Inverse Kinematics Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MASTER_POSTURES.map((posture) => {
              const isSelected = curPostureId === posture.id;
              return (
                <div
                  key={posture.id}
                  onClick={() => handlePickPosture(posture)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                    isSelected
                      ? 'border-teal-400 ring-2 ring-teal-400/40 bg-slate-800 shadow-xl'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{posture.icon}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-teal-400 text-black flex items-center justify-center font-bold text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white group-hover:text-teal-300">
                        {posture.name}
                      </h5>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">
                        {posture.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-3 border-t border-slate-800/80 text-[10px] text-teal-400 uppercase font-semibold flex items-center justify-between">
                    <span>{posture.category}</span>
                    <span className="text-slate-500 font-mono">Dist {posture.cameraDistance}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MULTI-AVATAR STAGING */}
      {activeTab === 'multi_avatar' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-teal-400" />
              <span>Multi-Avatar Scene Staging (एकाधिक अवतार दृश्य)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose single avatar, dual presenter interview, or teacher & student dialogue.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MULTI_AVATAR_LAYOUTS.map((layout) => {
              const isSelected = curLayoutId === layout.id;
              return (
                <div
                  key={layout.id}
                  onClick={() => handlePickLayout(layout)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                    isSelected
                      ? 'border-teal-400 ring-2 ring-teal-400/40 bg-slate-800 shadow-xl'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{layout.icon}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-teal-400 text-black flex items-center justify-center font-bold text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-white group-hover:text-teal-300">
                      {layout.name}
                    </h5>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      {layout.description}
                    </p>
                  </div>

                  <div className="pt-2 mt-3 border-t border-slate-800 text-[10px] text-teal-400 font-bold">
                    {layout.avatarCount} Presenter{layout.avatarCount > 1 ? 's' : ''} in Scene
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
