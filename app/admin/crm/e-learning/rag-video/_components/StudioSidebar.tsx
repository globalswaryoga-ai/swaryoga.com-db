'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Brain,
  Video,
  Languages,
  Film,
  BookOpen,
  Library,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Database,
  Clapperboard,
  Radio,
  Mic,
  Palette,
  FileText,
  Layers,
  Sliders,
  Presentation,
} from 'lucide-react';

export type StudioSection =
  // In-House Zero-Expense HeyGen Digital Twin Studio
  | 'inhouse-heygen-studio'
  // 8 Main Studio Modules + Dedicated Avatar Edit Section
  | 'avatar-video'
  | 'avatar-edit'
  | 'voice-avatar'
  | 'background-appearance'
  | 'final-avatars'
  | 'video-to-text-emotion'
  | 'text-grammar-checker'
  | 'text-multilingual'
  | 'ppt-studio'
  | 'animation-10s'
  | 'custom-animation-creator'
  | '3d-animation-engine'
  | 'video-production-studio'
  // Legacy / Extended Studio Tools
  | 'avatar-studio'
  | 'avatar-setting'
  | 'rag-setting'
  | 'video-setting'
  | 'video-recipe'
  | 'media-creation'
  | 'one-lang-to-multi'
  | 'video-dubbing'
  | 'ebook-main'
  | 'ebook-one-to-all';

interface StudioSidebarProps {
  activeSection: StudioSection;
  onSelectSection: (section: StudioSection) => void;
  jobsCount?: number;
  avatarsCount?: number;
}

export default function StudioSidebar({
  activeSection,
  onSelectSection,
  jobsCount = 0,
  avatarsCount = 0,
}: StudioSidebarProps) {
  const [showExtended, setShowExtended] = useState(true);

  // The Primary Modules from Requirements + Avatar Edit Section + In-House Studio
  const mainModules = [
    {
      id: 'inhouse-heygen-studio' as StudioSection,
      num: '🌟',
      label: 'In-House HeyGen Studio',
      subtitle: 'Self-Hosted 3D/2D Avatar & Free Voice',
      icon: Sparkles,
      color: 'text-emerald-400',
      activeBg: 'from-emerald-600/35 via-teal-600/25 to-emerald-600/35 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg',
      badge: '100% FREE',
    },
    {
      id: 'avatar-video' as StudioSection,
      num: '1',
      label: 'Avatar Creation (Video)',
      subtitle: 'Upload, Camera Record & Face Extract',
      icon: Video,
      color: 'text-purple-400',
      activeBg: 'from-purple-600/30 to-indigo-600/20 border-purple-500 ring-1 ring-purple-500/40',
      badge: avatarsCount > 0 ? `${avatarsCount}` : undefined,
    },
    {
      id: 'avatar-edit' as StudioSection,
      num: '✏️',
      label: 'Avatar Edit & Customizer',
      subtitle: 'Clothes, Postures, Framing & 3D Stage',
      icon: Sliders,
      color: 'text-amber-400',
      activeBg: 'from-amber-600/30 via-orange-600/25 to-amber-600/30 border-amber-500 ring-1 ring-amber-500/50 shadow-md',
      badge: 'EDIT',
    },
    {
      id: 'voice-avatar' as StudioSection,
      num: '2',
      label: 'Voice Avatar Creation',
      subtitle: 'Clone, Audio Sample, Pitch & Speed',
      icon: Mic,
      color: 'text-amber-400',
      activeBg: 'from-amber-600/30 to-orange-600/20 border-amber-500 ring-1 ring-amber-500/40',
    },
    {
      id: 'background-appearance' as StudioSection,
      num: '3',
      label: 'Background & Appearance',
      subtitle: '20 Scenes, Outfits & Multi-Avatars',
      icon: Palette,
      color: 'text-emerald-400',
      activeBg: 'from-emerald-600/30 to-teal-600/20 border-emerald-500 ring-1 ring-emerald-500/40',
    },
    {
      id: 'final-avatars' as StudioSection,
      num: '4',
      label: 'My Final Avatars',
      subtitle: 'Video + Voice + Scene 9-Step Library',
      icon: Sparkles,
      color: 'text-amber-400',
      activeBg: 'from-amber-500/30 via-orange-500/25 to-amber-500/30 border-amber-400 ring-1 ring-amber-400/50 shadow-md',
      badge: 'Core',
    },
    {
      id: 'video-to-text-emotion' as StudioSection,
      num: '5',
      label: 'Video to Text & Emotions',
      subtitle: 'Whisper timestamps & avatar cue suggestions',
      icon: Film,
      color: 'text-rose-400',
      activeBg: 'from-rose-600/30 to-pink-600/20 border-rose-500 ring-1 ring-rose-500/40',
    },
    {
      id: 'text-grammar-checker' as StudioSection,
      num: '6',
      label: 'Text Grammar Checker',
      subtitle: 'Original, Corrected & Improved Flow',
      icon: FileText,
      color: 'text-indigo-400',
      activeBg: 'from-indigo-600/30 to-blue-600/20 border-indigo-500 ring-1 ring-indigo-500/40',
    },
    {
      id: 'text-multilingual' as StudioSection,
      num: '7',
      label: 'One Text to Multi-Languages',
      subtitle: 'Hindi, Marathi, English, Gujarati, etc.',
      icon: Languages,
      color: 'text-teal-400',
      activeBg: 'from-teal-600/30 to-emerald-600/20 border-teal-500 ring-1 ring-teal-500/40',
    },
    {
      id: 'ppt-studio' as StudioSection,
      num: '8',
      label: 'AI Visual PPT Studio',
      subtitle: 'Imagery Slides, 3-Colors, Editable',
      icon: Presentation,
      color: 'text-amber-400',
      activeBg: 'from-amber-600/35 via-orange-600/25 to-amber-600/35 border-amber-500 ring-1 ring-amber-500/50 shadow-md',
      badge: 'Visual AI',
    },
    {
      id: 'animation-10s' as StudioSection,
      num: '9',
      label: '10s AI Animation & Video',
      subtitle: 'Remedies, Asanas, Mudras & Mohan Sir',
      icon: Film,
      color: 'text-emerald-400',
      activeBg: 'from-emerald-600/35 via-teal-600/25 to-emerald-600/35 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md',
      badge: '10s B-Roll',
    },
    {
      id: 'custom-animation-creator' as StudioSection,
      num: '✨',
      label: 'Custom 0–30s Animation Creator',
      subtitle: '5s Chunks, Props, Kinematics & Admin Approval',
      icon: Sparkles,
      color: 'text-cyan-400',
      activeBg: 'from-cyan-600/35 via-teal-600/25 to-cyan-600/35 border-cyan-500 ring-1 ring-cyan-500/50 shadow-md',
      badge: '0-30s Foolproof',
    },
    {
      id: '3d-animation-engine' as StudioSection,
      num: '3D',
      label: '3D/4D Animation Engine',
      subtitle: 'Anatomy, Lungs, Diaphragm, Chakras & MP4',
      icon: Layers,
      color: 'text-cyan-400',
      activeBg: 'from-cyan-600/35 via-teal-600/25 to-cyan-600/35 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg',
      badge: '3D/4D WebGL',
    },
    {
      id: 'video-production-studio' as StudioSection,
      num: '10',
      label: 'Video / Shorts / Live Studio',
      subtitle: 'Avatar + PPT PiP + 10s B-Roll, Publish',
      icon: Clapperboard,
      color: 'text-rose-400',
      activeBg: 'from-rose-600/30 via-pink-600/25 to-rose-600/30 border-rose-500 ring-1 ring-rose-500/50 shadow-lg',
      badge: 'Production',
    },
  ];

  // Extended / Legacy Tools
  const extendedTools = [
    {
      id: 'avatar-studio' as StudioSection,
      label: 'Avatar Studio Master',
      subtitle: 'Complete AI Avatar Studio & Presets',
      icon: Sparkles,
      color: 'text-amber-400',
      badge: 'PRO',
    },
    {
      id: 'video-dubbing' as StudioSection,
      label: 'One Video to Multi Dub',
      subtitle: 'Split, Transcribe & Audio Dubbing',
      icon: Film,
      color: 'text-amber-400',
      badge: jobsCount > 0 ? `${jobsCount}` : undefined,
    },
    {
      id: 'rag-setting' as StudioSection,
      label: 'RAG Knowledge Setting',
      subtitle: 'Knowledge Ingestion & Yogic Vocabulary',
      icon: Brain,
      color: 'text-indigo-400',
    },
    {
      id: 'video-setting' as StudioSection,
      label: 'Video Enhancer Setting',
      subtitle: '1080p GFPGAN Enhancer & Aspect Ratio',
      icon: Video,
      color: 'text-blue-400',
    },
    {
      id: 'video-recipe' as StudioSection,
      label: 'Video Recipe Editor',
      subtitle: 'Mix Avatar, Images & Video in Multi-Lang',
      icon: Clapperboard,
      color: 'text-rose-400',
    },
    {
      id: 'media-creation' as StudioSection,
      label: 'M-Creation',
      subtitle: 'One to Multi • Videos, Shorts & Live',
      icon: Radio,
      color: 'text-cyan-400',
    },
    {
      id: 'ebook-main' as StudioSection,
      label: 'E-Book Main',
      subtitle: 'Lecture-to-Prose Chapter Editor',
      icon: BookOpen,
      color: 'text-rose-400',
    },
    {
      id: 'ebook-one-to-all' as StudioSection,
      label: 'E-Book One to All',
      subtitle: 'Multi-Language Complete PDF Compiler',
      icon: Library,
      color: 'text-teal-400',
    },
  ];

  return (
    <aside className="w-full lg:w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col shrink-0">
      {/* Studio Brand Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/70">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/admin/crm/e-learning"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Courses</span>
          </Link>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Swar AI Studio
          </span>
        </div>

        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>🕉️</span>
          <span>AI Avatar & Video Studio</span>
        </h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Complete 8-Module Multilingual Production Engine
        </p>
      </div>

      {/* Navigation Menu */}
      <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
        <div className="px-2 pb-1 text-[10px] font-bold tracking-wider text-amber-400/90 uppercase flex items-center justify-between">
          <span>8 Core Studio Modules</span>
          <span className="text-slate-500 font-mono">1-8</span>
        </div>

        {/* 8 Primary Modules */}
        {mainModules.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeSection === item.id ||
            (item.id === 'avatar-video' && activeSection === 'avatar-setting') ||
            (item.id === 'text-multilingual' && activeSection === 'one-lang-to-multi');

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 flex items-center gap-2.5 group cursor-pointer ${
                isActive
                  ? `bg-gradient-to-r ${item.activeBg} text-white shadow-md`
                  : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isActive ? 'bg-amber-500 text-black shadow' : 'bg-slate-800 text-slate-300 group-hover:text-white'
                }`}
              >
                {item.num}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold truncate group-hover:text-white">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {item.subtitle}
                </p>
              </div>

              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                  isActive ? 'text-amber-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                }`}
              />
            </button>
          );
        })}

        {/* Collapsible Extended Tools */}
        <div className="pt-3 border-t border-slate-800/80 mt-2">
          <button
            type="button"
            onClick={() => setShowExtended((prev) => !prev)}
            className="w-full px-2 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 hover:text-white uppercase flex items-center justify-between rounded-lg hover:bg-slate-800/50 cursor-pointer"
          >
            <span>Extended Studio Tools</span>
            {showExtended ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {showExtended && (
            <div className="space-y-1 mt-1 pl-1">
              {extendedTools.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSection(item.id)}
                    className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 border-slate-700 text-white shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={14} className={item.color} />
                    <span className="text-xs font-medium truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
