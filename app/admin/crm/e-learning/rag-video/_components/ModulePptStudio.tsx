'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Presentation,
  Sparkles,
  Palette,
  Image as ImageIcon,
  Clock,
  Edit3,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  CheckCircle2,
  Copy,
  Download,
  Film,
  Maximize2,
  ChevronRight,
  Sun,
  Moon,
  Compass,
  RefreshCw,
  Eye,
  Sliders,
  Play,
  ExternalLink,
} from 'lucide-react';
import { PPT_THEME_PRESETS, PptThemePreset } from '@/app/api/avatar/ppt-generate/route';
import CanvaCrmSidePanel from '@/components/admin/crm/CanvaCrmSidePanel';

export interface EditableSlide {
  id: string;
  slideNumber: number;
  phase: number;
  phaseName: string;
  timeRange: string;
  heading: string;
  subHeading: string;
  visualConcept: string;
  imageUrl: string;
  imageTitle?: string;
  avatarLayout: 'corner_circle' | 'corner_square' | 'split_screen' | 'stage_background';
  avatarPosition?: { x: number; y: number };
  themeColor: string;
  accentColor: string;
  bgGradient: string;
  textColor: string;
  hasAttachedAnimation?: boolean;
  animationTriggerTime?: string;
}

interface ModulePptStudioProps {
  token?: string | null;
  initialScript?: string;
  onSendToVideoStudio?: (slides: EditableSlide[]) => void;
}

export default function ModulePptStudio({
  token,
  initialScript = '',
  onSendToVideoStudio,
}: ModulePptStudioProps) {
  // Pre-configuration states
  const [script, setScript] = useState(
    initialScript ||
      `नमस्कार मित्रों! स्वर योग की इस कक्षा में आप सभी का स्वागत है।
आज हम जानेंगे कि हमारे दोनों नथुने कैसे हमारे मस्तिष्क के दोनों हिस्सों को संतुलित करते हैं।
सूर्य स्वर हमारी दाईं नासिका है जो पिंगला नाड़ी और शारीरिक ऊर्जा को बढ़ाती है।
चंद्र स्वर हमारी बाईं नासिका है जो इड़ा नाड़ी और मानसिक शांति को पोषित करती है।
और जब दोनों स्वर संतुलित होकर सुषुम्ना में प्रवाहित होते हैं, तब ध्यान और समाधि घटित होती है।`
  );

  const [selectedThemeId, setSelectedThemeId] = useState<string>('surya_sushumna_chandra');
  const [duration, setDuration] = useState<'3min' | '30min'>('3min');
  const [language, setLanguage] = useState<string>('hi');
  const [isGenerating, setIsGenerating] = useState(false);

  // Slide Deck Data (Fully Editable)
  const [slides, setSlides] = useState<EditableSlide[]>([]);
  const [attachedAnimations, setAttachedAnimations] = useState<any[]>([]);
  const [playingAnimationId, setPlayingAnimationId] = useState<string | null>(null);
  const [animationPlaybackTime, setAnimationPlaybackTime] = useState<number>(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [curatedLibrary, setCuratedLibrary] = useState<any[]>([]);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isCanvaSidePanelOpen, setIsCanvaSidePanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const slideStageRef = useRef<HTMLDivElement>(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);

  // Drag and drop avatar bubble anywhere on slide stage
  const handleAvatarDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingAvatar(true);

    const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
      if (!slideStageRef.current) return;
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const rect = slideStageRef.current.getBoundingClientRect();
      const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 6), 94);
      const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 8), 92);
      handleUpdateActiveSlide({
        avatarPosition: { x: Math.round(x), y: Math.round(y) },
      });
    };

    const upHandler = () => {
      setIsDraggingAvatar(false);
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', upHandler);
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
    window.addEventListener('touchmove', moveHandler);
    window.addEventListener('touchend', upHandler);
  };

  const snapSlideAvatarTo = (pos: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center') => {
    if (pos === 'bottom-right') handleUpdateActiveSlide({ avatarPosition: { x: 86, y: 76 } });
    if (pos === 'bottom-left') handleUpdateActiveSlide({ avatarPosition: { x: 14, y: 76 } });
    if (pos === 'top-right') handleUpdateActiveSlide({ avatarPosition: { x: 86, y: 24 } });
    if (pos === 'top-left') handleUpdateActiveSlide({ avatarPosition: { x: 14, y: 24 } });
    if (pos === 'center') handleUpdateActiveSlide({ avatarPosition: { x: 50, y: 50 } });
  };

  // Active theme object
  const currentTheme: PptThemePreset =
    PPT_THEME_PRESETS[selectedThemeId] || PPT_THEME_PRESETS.surya_sushumna_chandra;

  const activeSlide = slides[activeSlideIndex] || null;

  // Auto-generate initial slides on first mount if empty
  useEffect(() => {
    if (slides.length === 0) {
      handleGenerateSlides();
    }
  }, []);

  const handleGenerateSlides = async () => {
    if (!script.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/avatar/ppt-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          duration,
          themeId: selectedThemeId,
          language,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSlides(data.data.slides || []);
        if (data.data.curatedLibrary) {
          setCuratedLibrary(data.data.curatedLibrary);
        }
        if (data.data.animations10s) {
          setAttachedAnimations(data.data.animations10s);
        }
        setActiveSlideIndex(0);
      }
    } catch (err) {
      console.error('PPT generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Timer loop for 10-second animation playback on slide
  useEffect(() => {
    let interval: any;
    if (playingAnimationId) {
      interval = setInterval(() => {
        setAnimationPlaybackTime((prev) => {
          if (prev >= 9.8) {
            setPlayingAnimationId(null);
            return 10.0;
          }
          return parseFloat((prev + 0.2).toFixed(1));
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [playingAnimationId]);

  const handlePlay10sAnimation = (animId: string) => {
    setPlayingAnimationId(animId);
    setAnimationPlaybackTime(0);
  };

  // Editable Slide Actions
  const handleUpdateActiveSlide = (fields: Partial<EditableSlide>) => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === activeSlideIndex ? { ...s, ...fields } : s))
    );
  };

  const handleAddSlide = () => {
    const newNum = slides.length + 1;
    const activePhase = activeSlide?.phase || 1;
    const phaseConfig =
      currentTheme.phases.find((p) => p.phase === activePhase) || currentTheme.phases[0];

    const newSlide: EditableSlide = {
      id: `slide_${newNum}_${Date.now()}`,
      slideNumber: newNum,
      phase: activePhase,
      phaseName: phaseConfig.name,
      timeRange: `0${newNum}:00 - 0${newNum + 1}:00`,
      heading: 'नया विजुअल स्लाइड शीर्षक',
      subHeading: 'वैदिक ज्ञान सूत्र',
      visualConcept: 'Visual focus image for deep learning',
      imageUrl:
        curatedLibrary[0]?.url ||
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
      avatarLayout: 'corner_circle',
      themeColor: phaseConfig.color,
      accentColor: phaseConfig.accent,
      bgGradient: phaseConfig.bgGradient,
      textColor: phaseConfig.textColor,
    };

    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideIndex(slides.length);
  };

  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) {
      alert('At least one slide must remain in the deck.');
      return;
    }
    const updated = slides.filter((_, i) => i !== idx);
    setSlides(updated);
    if (activeSlideIndex >= updated.length) {
      setActiveSlideIndex(updated.length - 1);
    }
  };

  const handleMoveSlide = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const copy = [...slides];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    // Re-number
    copy.forEach((s, i) => (s.slideNumber = i + 1));
    setSlides(copy);
    setActiveSlideIndex(targetIdx);
  };

  const handleExportMarkdown = () => {
    let md = `# ${currentTheme.name} - Presentation Deck\n\n`;
    md += `Duration: ${duration} | Slides: ${slides.length} | Language: ${language}\n\n`;
    md += `=====================================================\n\n`;

    slides.forEach((s) => {
      md += `### Slide ${s.slideNumber}: ${s.heading} (${s.timeRange})\n`;
      if (s.subHeading) md += `*${s.subHeading}*\n\n`;
      md += `- Phase: ${s.phaseName} (Color: ${s.themeColor})\n`;
      md += `- Visual Concept: ${s.visualConcept}\n`;
      md += `- Image URL: ${s.imageUrl}\n`;
      md += `- Avatar Layout: ${s.avatarLayout}\n\n`;
      md += `-----------------------------------------------------\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SwarYoga_Visual_PPT_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-black shadow-lg">
            <Presentation size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 8: AI Visual-First PPT Studio (Editable)
              </h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Brain Balance • Heading Only • 3-Color Flow
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Transform lectures into mind-balancing imagery slides with pre-set themes, 3-color energy progression, and full manual editing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCanvaSidePanelOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Open Canva Side Panel inside CRM"
          >
            <Palette size={14} />
            <span>🎨 Canva Studio (In-CRM)</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Export Slides (.md)</span>
          </button>

          {onSendToVideoStudio && (
            <button
              onClick={() => onSendToVideoStudio(slides)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Film size={14} />
              <span>Send to Video Studio ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. PRE-CONFIGURATION BAR: Theme & 3-Color Progression Setup */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Palette size={14} className="text-amber-400" />
              <span>Step 1: Choose Master Theme & 3-Color Energy Flow (Before Generation)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              In a 30-min class, the 3 colors transition automatically every 10 mins (Surya ➔ Sushumna ➔ Chandra) for peak brain focus.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Duration Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDuration('3min')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  duration === '3min' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                3-Min Video (5 Slides)
              </button>
              <button
                type="button"
                onClick={() => setDuration('30min')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  duration === '30min' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                30-Min Class (12 Slides • 3 Phases)
              </button>
            </div>

            {/* Language Picker */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
            >
              <option value="hi">🇮🇳 Hindi (हिंदी)</option>
              <option value="kn">🇮🇳 Kannada (ಕನ್ನಡ)</option>
              <option value="mr">🚩 Marathi (मराठी)</option>
              <option value="en">🇬🇧 English</option>
              <option value="gu">🇮🇳 Gujarati (ગુજરાતી)</option>
              <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
              <option value="te">🇮🇳 Telugu (తెలుగు)</option>
            </select>
          </div>
        </div>

        {/* 4 Theme Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(PPT_THEME_PRESETS).map((preset) => {
            const isSelected = selectedThemeId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => setSelectedThemeId(preset.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40 shadow-lg'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{preset.name.split('(')[0]}</span>
                    {isSelected && <CheckCircle2 size={14} className="text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                {/* 3 Color Palette Bar */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">3-Phase Palette:</span>
                  <div className="grid grid-cols-3 gap-1.5 h-4">
                    {preset.phases.map((p) => (
                      <div
                        key={p.phase}
                        className="rounded-md flex items-center justify-center text-[9px] font-black shadow-sm"
                        style={{ backgroundColor: p.color, color: '#000' }}
                        title={`${p.name} (${p.color})`}
                      >
                        P{p.phase}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Script & Re-Generate Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Paste your lecture or chapter script here..."
            className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
          />

          <button
            disabled={isGenerating || !script.trim()}
            onClick={handleGenerateSlides}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Designing Visual Slides...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Auto-Generate Visual PPT Deck</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. THREE 10-SECOND ANIMATIONS AUTO-ATTACHED TO THIS 3-MINUTE CLASS */}
      {attachedAnimations.length > 0 && (
        <div className="p-4 bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>3x 10-Second Animations Auto-Attached for 3-Minute Class</span>
              </h3>
            </div>
            <span className="text-[11px] text-emerald-300 font-medium font-mono">
              Plays at Minute 1 (00:45s), Minute 2 (01:45s), Minute 3 (02:45s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {attachedAnimations.map((anim) => {
              const isPlaying = playingAnimationId === anim.id;
              return (
                <div
                  key={anim.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                    isPlaying
                      ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/40 shadow-lg'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-amber-400 font-mono">
                      Minute {anim.minute} ({anim.timeTrigger})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      10s Cutaway
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{anim.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {anim.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Linked Slide #{anim.linkedSlideNumber}</span>
                    <button
                      type="button"
                      onClick={() => handlePlay10sAnimation(anim.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                        isPlaying
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>00:{animationPlaybackTime.toFixed(1)}s</span>
                        </>
                      ) : (
                        <>
                          <Play size={11} className="fill-black" />
                          <span>Play 10s Clip</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. THE EDITABLE SLIDE STUDIO WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Slide Deck Navigator & Timeline (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col justify-between max-h-[750px]">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers size={14} className="text-amber-400" />
                <span>Slides ({slides.length})</span>
              </span>
              <button
                onClick={handleAddSlide}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-black font-bold text-[11px] rounded-lg shadow flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Slide</span>
              </button>
            </div>

            {/* Slide Thumbnails Scroll Area */}
            <div className="mt-3 space-y-2 overflow-y-auto max-h-[600px] pr-1">
              {slides.map((s, idx) => {
                const isActive = idx === activeSlideIndex;
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isActive
                        ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/40 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Slide Number & Phase Color Tag */}
                    <div
                      className="w-8 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-black shrink-0 shadow"
                      style={{ backgroundColor: s.themeColor, color: '#000' }}
                    >
                      <span>#{s.slideNumber}</span>
                      <span className="text-[8px] opacity-75">P{s.phase}</span>
                    </div>

                    {/* Thumbnail Image */}
                    <div className="w-14 h-10 rounded-lg bg-black border border-slate-800 overflow-hidden shrink-0">
                      <img src={s.imageUrl} alt={s.heading} className="w-full h-full object-cover" />
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{s.heading}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono">{s.timeRange}</span>
                        <span>•</span>
                        <span className="capitalize">{s.avatarLayout.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {/* Move / Delete Quick Tools */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSlide(idx, 'up');
                        }}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSlide(idx, 'down');
                        }}
                        disabled={idx === slides.length - 1}
                        className="text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Live 16:9 Canvas Slide Preview + Inline Editor (8 cols) */}
        {activeSlide ? (
          <div className="lg:col-span-8 space-y-4">
            {/* The 16:9 Visual Slide Stage */}
            <div
              ref={slideStageRef}
              className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black flex flex-col justify-between p-6 select-none"
            >
              {/* Background HD Image with Overlay */}
              <img
                src={activeSlide.imageUrl}
                alt={activeSlide.heading}
                className="absolute inset-0 w-full h-full object-cover opacity-60 filter brightness-90 contrast-105"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-t ${activeSlide.bgGradient} opacity-85 mix-blend-multiply`}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-black/80" />

              {/* Top Banner: Phase Energy & Timestamp */}
              <div className="relative z-10 flex items-center justify-between text-xs">
                <div
                  className="px-3 py-1 rounded-full text-black font-extrabold text-[11px] shadow-lg flex items-center gap-1.5"
                  style={{ backgroundColor: activeSlide.themeColor }}
                >
                  {activeSlide.phase === 1 && <Sun size={12} />}
                  {activeSlide.phase === 2 && <Compass size={12} />}
                  {activeSlide.phase === 3 && <Moon size={12} />}
                  <span>{activeSlide.phaseName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-300 font-bold bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[11px]">
                    ⏱️ {activeSlide.timeRange}
                  </span>
                  <span className="text-[10px] bg-white/10 backdrop-blur-md text-white font-semibold px-2 py-1 rounded-lg border border-white/10">
                    Slide #{activeSlide.slideNumber} of {slides.length}
                  </span>
                </div>
              </div>

              {/* Middle: THE VISUAL HEADING (Editable directly) */}
              <div className="relative z-10 max-w-2xl my-auto space-y-3">
                <input
                  type="text"
                  value={activeSlide.heading}
                  onChange={(e) => handleUpdateActiveSlide({ heading: e.target.value })}
                  className="w-full text-2xl sm:text-4xl font-black text-white bg-transparent border-b border-transparent hover:border-white/30 focus:border-amber-400 focus:outline-none transition-colors drop-shadow-lg leading-tight"
                  placeholder="Enter main visual heading..."
                  style={{ color: activeSlide.textColor }}
                />

                {activeSlide.subHeading && (
                  <input
                    type="text"
                    value={activeSlide.subHeading}
                    onChange={(e) => handleUpdateActiveSlide({ subHeading: e.target.value })}
                    className="w-full text-sm sm:text-base font-semibold text-amber-300/90 bg-transparent border-b border-transparent hover:border-white/30 focus:border-amber-400 focus:outline-none transition-colors drop-shadow"
                    placeholder="Enter subtitle or Vedic sutra..."
                  />
                )}
              </div>

              {/* Bottom: Avatar Simulation Frame (Corner Circle / Square / Split) */}
              <div className="relative z-10 flex items-end justify-between">
                <div className="flex items-center gap-2 text-[10px] text-slate-300 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <ImageIcon size={12} className="text-amber-400" />
                  <span className="truncate max-w-[280px]">
                    {activeSlide.imageTitle || activeSlide.visualConcept}
                  </span>
                </div>

                {/* Simulated Mohan Sir Video Avatar Placement (Movable anywhere on the slide) */}
                {activeSlide.avatarLayout === 'corner_circle' && (
                  <div
                    onMouseDown={handleAvatarDragStart}
                    onTouchStart={handleAvatarDragStart}
                    className={`w-24 h-24 rounded-full border-2 overflow-hidden shadow-2xl bg-slate-900 flex flex-col items-center justify-center text-center p-2 z-20 cursor-grab active:cursor-grabbing group transition-shadow ${
                      isDraggingAvatar ? 'ring-4 ring-amber-400 scale-105 shadow-amber-500/50' : 'ring-4 ring-black/50'
                    }`}
                    style={
                      activeSlide.avatarPosition
                        ? {
                            position: 'absolute',
                            left: `${activeSlide.avatarPosition.x}%`,
                            top: `${activeSlide.avatarPosition.y}%`,
                            transform: 'translate(-50%, -50%)',
                            borderColor: activeSlide.themeColor,
                          }
                        : { borderColor: activeSlide.themeColor }
                    }
                    title="Click and drag Mohan Sir avatar anywhere on this slide"
                  >
                    <span className="text-[10px] font-bold text-white">Mohan Sir</span>
                    <span className="text-[8px] text-amber-400 font-mono">Avatar PiP</span>
                    <span className="text-[7px] text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity">✥ Drag</span>
                  </div>
                )}

                {activeSlide.avatarLayout === 'corner_square' && (
                  <div
                    onMouseDown={handleAvatarDragStart}
                    onTouchStart={handleAvatarDragStart}
                    className={`w-28 h-20 rounded-xl border-2 overflow-hidden shadow-2xl bg-slate-900 flex flex-col items-center justify-center text-center p-2 z-20 cursor-grab active:cursor-grabbing group transition-shadow ${
                      isDraggingAvatar ? 'ring-4 ring-amber-400 scale-105 shadow-amber-500/50' : 'ring-4 ring-black/50'
                    }`}
                    style={
                      activeSlide.avatarPosition
                        ? {
                            position: 'absolute',
                            left: `${activeSlide.avatarPosition.x}%`,
                            top: `${activeSlide.avatarPosition.y}%`,
                            transform: 'translate(-50%, -50%)',
                            borderColor: activeSlide.themeColor,
                          }
                        : { borderColor: activeSlide.themeColor }
                    }
                    title="Click and drag Mohan Sir avatar anywhere on this slide"
                  >
                    <span className="text-[10px] font-bold text-white">Mohan Sir</span>
                    <span className="text-[8px] text-amber-400 font-mono">Webcam Box</span>
                    <span className="text-[7px] text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity">✥ Drag</span>
                  </div>
                )}

                {activeSlide.avatarLayout === 'split_screen' && (
                  <div
                    className="px-3 py-1 rounded-lg text-black font-extrabold text-[10px] shadow"
                    style={{ backgroundColor: activeSlide.themeColor }}
                  >
                    Split-Screen Mode (60% Slide / 40% Avatar)
                  </div>
                )}
              </div>
            </div>

            {/* Slide Inspector & Quick Editing Controls */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders size={14} className="text-amber-400" />
                  <span>Edit Slide #{activeSlide.slideNumber} Properties</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCanvaSidePanelOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all hover:scale-105"
                    title="Open Canva Side Panel inside CRM"
                  >
                    <Palette size={13} />
                    <span>🎨 Canva Studio (In-CRM)</span>
                  </button>

                  <button
                    onClick={() => setIsImagePickerOpen(!isImagePickerOpen)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <ImageIcon size={13} />
                    <span>Change Image / Metaphor</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSlide(activeSlideIndex)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer border border-rose-800/40"
                  >
                    <Trash2 size={12} />
                    <span>Delete Slide</span>
                  </button>
                </div>
              </div>

              {/* Avatar Layout Selector for this slide */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400">
                    Mohan Sir Avatar Layout & Position:
                  </label>
                  {activeSlide.avatarPosition && (
                    <span className="text-[10px] font-mono text-amber-400">
                      X: {activeSlide.avatarPosition.x}% • Y: {activeSlide.avatarPosition.y}%
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'corner_circle', label: '⚪ Round Corner Bubble' },
                    { id: 'corner_square', label: '⬛ Square Corner Box' },
                    { id: 'split_screen', label: '🌓 Split Screen 60/40' },
                    { id: 'stage_background', label: '🌌 Full Avatar in Front' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() =>
                        handleUpdateActiveSlide({ avatarLayout: l.id as any })
                      }
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        activeSlide.avatarLayout === l.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                {/* Free Drag / Snap Position Buttons */}
                {(activeSlide.avatarLayout === 'corner_circle' || activeSlide.avatarLayout === 'corner_square') && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                      <span>✥ Movable Anywhere (Click &amp; Drag Avatar on Slide):</span>
                      <span className="text-[10px] text-emerald-400 font-normal">Free drag enabled</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { id: 'bottom-right', label: '↘ Bottom Right' },
                        { id: 'bottom-left', label: '↙ Bottom Left' },
                        { id: 'top-right', label: '↗ Top Right' },
                        { id: 'top-left', label: '↖ Top Left' },
                        { id: 'center', label: '⏺ Center' },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => snapSlideAvatarTo(pos.id as any)}
                          className="py-1 text-[9px] font-bold rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-amber-400/50 transition truncate"
                          title={pos.label}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Image Picker Drawer (if opened) */}
              {isImagePickerOpen && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">
                      Pick from Curated Brain-Balance & Swar Yoga Gallery:
                    </span>
                    <button
                      onClick={() => setIsImagePickerOpen(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {curatedLibrary.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => {
                          handleUpdateActiveSlide({
                            imageUrl: img.url,
                            imageTitle: img.title,
                          });
                          setIsImagePickerOpen(false);
                        }}
                        className="group relative rounded-lg overflow-hidden border border-slate-800 hover:border-amber-400 aspect-video cursor-pointer"
                      >
                        <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 text-center">
                          <span className="text-[10px] font-bold text-white">{img.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Upload My Own Image / Clip / PPT Slide */}
                  <div className="pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer shadow flex items-center gap-1.5 shrink-0">
                        <span>📤 Upload My Image / Clip / PPT</span>
                        <input
                          type="file"
                          accept="image/*,video/mp4"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const objectUrl = URL.createObjectURL(file);
                              handleUpdateActiveSlide({
                                imageUrl: objectUrl,
                                imageTitle: file.name,
                              });
                              setIsImagePickerOpen(false);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-400 truncate">PNG, JPG, MP4 or PPT snapshot</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:flex-1">
                      <span className="text-[11px] text-slate-400 shrink-0">Or URL:</span>
                      <input
                        type="text"
                        value={activeSlide.imageUrl}
                        onChange={(e) => handleUpdateActiveSlide({ imageUrl: e.target.value })}
                        placeholder="https://swaryogacrm.b-cdn.net/..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
            <Presentation size={40} className="mx-auto text-slate-600" />
            <h4 className="text-sm font-bold text-slate-300">No Slides In Deck</h4>
            <p className="text-xs text-slate-500">Click &quot;Auto-Generate Visual PPT Deck&quot; to begin.</p>
          </div>
        )}
      </div>
      {/* In-CRM Canva Side Panel (Opens directly beside CRM page, never opens new external tab) */}
      <CanvaCrmSidePanel
        isOpen={isCanvaSidePanelOpen}
        onClose={() => setIsCanvaSidePanelOpen(false)}
        title={`Canva Studio • Slide #${activeSlide?.slideNumber || 1}`}
        aspectRatio="16:9"
        initialDesignId="DAGw5Hx3Vmo"
        slideData={activeSlide ? {
          slideNumber: activeSlide.slideNumber,
          heading: activeSlide.heading,
          description: activeSlide.subHeading || activeSlide.visualConcept,
          subHeading: activeSlide.subHeading,
          themeColor: activeSlide.themeColor,
          themeType: activeSlide.phaseName,
          metaphor: activeSlide.visualConcept,
          imageUrl: activeSlide.imageUrl,
          bulletPoints: [activeSlide.subHeading, activeSlide.visualConcept].filter(Boolean),
        } : undefined}
        onUpdateSlide={(updated) => handleUpdateActiveSlide(updated)}
      />
    </div>
  );
}
