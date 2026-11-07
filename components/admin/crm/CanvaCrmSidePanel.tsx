'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Palette,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Download,
  Eye,
  Sliders,
  FileText,
  Award,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sun,
  Moon,
  Compass,
  ZoomIn,
  ZoomOut,
  Crop,
  Video,
  Globe,
  Upload,
  RotateCcw,
  SlidersHorizontal,
  Volume2
} from 'lucide-react';

export interface EditableSlideData {
  slideNumber?: number;
  heading?: string;
  description?: string;
  subHeading?: string;
  themeColor?: string;
  themeType?: string;
  metaphor?: string;
  visualConcept?: string;
  imageUrl?: string;
  bulletPoints?: string[];
}

export interface CanvaCrmSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialDesignId?: string;
  aspectRatio?: '16:9' | 'A4' | 'A4_landscape';
  slideData?: EditableSlideData;
  receiptData?: {
    receiptNumber?: string;
    studentName?: string;
    amount?: number | string;
    date?: string;
    workshopName?: string;
  };
  certificateData?: {
    studentName?: string;
    workshopName?: string;
    completionDate?: string;
    certificateNumber?: string;
  };
  onUpdateSlide?: (updated: Partial<EditableSlideData>) => void;
  onUpdateReceipt?: (updated: any) => void;
  onUpdateCertificate?: (updated: any) => void;
}

// Preset Swar Yoga templates
const PRESET_TEMPLATES = [
  { id: 'DAGw5Hx3Vmo', label: '16:9 Swar Yoga Slides', type: '16:9' },
  { id: 'EAHWzpxbbVw', label: 'A4 Official Receipt', type: 'A4' },
  { id: 'EAGcert92Swar', label: 'A4 Swar Yoga Certificate', type: 'A4_landscape' },
];

const ENERGY_COLORS = [
  { label: 'Surya (Solar / Gold)', color: '#F59E0B', icon: Sun },
  { label: 'Sushumna (Wisdom / Indigo)', color: '#6366F1', icon: Compass },
  { label: 'Chandra (Lunar / Teal)', color: '#14B8A6', icon: Moon },
  { label: 'Vedic Gold Charcoal', color: '#D97706', icon: Sparkles },
];

const BACKGROUND_PRESETS = [
  { label: 'Brain Balance', url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1920&q=80' },
  { label: 'Surya Golden Sun', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80' },
  { label: 'Sadhana Mountain', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1920&q=80' },
  { label: 'Cosmic Prana', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80' },
];

const MULTI_LANGUAGES = [
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
];

export default function CanvaCrmSidePanel({
  isOpen,
  onClose,
  title = 'Canva Studio',
  initialDesignId = '',
  aspectRatio = '16:9',
  slideData,
  receiptData,
  certificateData,
  onUpdateSlide,
  onUpdateReceipt,
  onUpdateCertificate,
}: CanvaCrmSidePanelProps) {
  // Tabs: 'native' (Correction & Visual Studio) or 'canva' (Canva Cloud Embed)
  const [activeTab, setActiveTab] = useState<'native' | 'canva'>('native');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [designInput, setDesignInput] = useState<string>(initialDesignId);
  const [activeDesignId, setActiveDesignId] = useState<string>(initialDesignId || 'DAGw5Hx3Vmo');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Editable local state for real-time live preview corrections
  const [editHeading, setEditHeading] = useState<string>(slideData?.heading || '');
  const [editDescription, setEditDescription] = useState<string>(slideData?.description || slideData?.subHeading || '');
  const [editMetaphor, setEditMetaphor] = useState<string>(slideData?.metaphor || '');
  const [editThemeColor, setEditThemeColor] = useState<string>(slideData?.themeColor || '#6366F1');
  const [editBullets, setEditBullets] = useState<string[]>(slideData?.bulletPoints || []);
  const [newBulletText, setNewBulletText] = useState<string>('');

  // 1) Background Image Controls (Zoom in/out, Blur % in/out, Dim opacity)
  const [bgImageUrl, setBgImageUrl] = useState<string>(slideData?.imageUrl || '');
  const [bgZoom, setBgZoom] = useState<number>(100); // 100% to 250%
  const [bgBlur, setBgBlur] = useState<number>(0); // 0% to 100%
  const [bgDim, setBgDim] = useState<number>(45); // 0% to 90%

  // 2) Single Overlay Image (Crop, Zoom in/out, Position)
  const [showOverlayImage, setShowOverlayImage] = useState<boolean>(false);
  const [overlayImageUrl, setOverlayImageUrl] = useState<string>('');
  const [overlayZoom, setOverlayZoom] = useState<number>(100); // 50% to 200%
  const [overlayCrop, setOverlayCrop] = useState<'none' | 'rounded' | 'circle' | 'card'>('rounded');
  const [overlayPosition, setOverlayPosition] = useState<'right' | 'center' | 'left'>('right');

  // 3) Mohan Sir Talking Screen (50% Split, Round, or Square, Zoom in/out)
  const [showMohanSir, setShowMohanSir] = useState<boolean>(true);
  const [mohanScreenType, setMohanScreenType] = useState<'round' | 'square' | 'split_50'>('round');
  const [mohanZoom, setMohanZoom] = useState<number>(100); // 50% to 200%
  const [mohanPosition, setMohanPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right'>('bottom-right');
  const [mohanSirPhotoUrl, setMohanSirPhotoUrl] = useState<string>('/mohan.jpg');

  // 4) Multi-Language Text Converter
  const [targetLang, setTargetLang] = useState<string>('mr');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [originalSlideText, setOriginalSlideText] = useState<{
    heading: string;
    description: string;
    bullets: string[];
  } | null>(null);

  // Editable local state for receipts
  const [editReceiptStudent, setEditReceiptStudent] = useState<string>(receiptData?.studentName || '');
  const [editReceiptAmount, setEditReceiptAmount] = useState<string | number>(receiptData?.amount || '');
  const [editReceiptWorkshop, setEditReceiptWorkshop] = useState<string>(receiptData?.workshopName || '');

  // Editable local state for certificates
  const [editCertStudent, setEditCertStudent] = useState<string>(certificateData?.studentName || '');
  const [editCertWorkshop, setEditCertWorkshop] = useState<string>(certificateData?.workshopName || '');

  const canvasRef = useRef<HTMLDivElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const overlayFileInputRef = useRef<HTMLInputElement>(null);
  const mohanFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when slideData changes
  useEffect(() => {
    if (slideData) {
      setEditHeading(slideData.heading || '');
      setEditDescription(slideData.description || slideData.subHeading || '');
      setEditMetaphor(slideData.metaphor || '');
      setEditThemeColor(slideData.themeColor || '#6366F1');
      if (slideData.imageUrl) {
        setBgImageUrl(slideData.imageUrl);
      }
      setEditBullets(slideData.bulletPoints || []);
    }
  }, [slideData]);

  // Sync initialDesignId
  useEffect(() => {
    if (initialDesignId) {
      setDesignInput(initialDesignId);
      setActiveDesignId(extractDesignId(initialDesignId));
    }
  }, [initialDesignId]);

  function extractDesignId(input: string): string {
    const trimmed = (input || '').trim();
    if (!trimmed) return '';
    const match = trimmed.match(/design\/([A-Za-z0-9_-]+)/);
    if (match && match[1]) return match[1];
    const brandMatch = trimmed.match(/brand-templates\/([A-Za-z0-9_-]+)/);
    if (brandMatch && brandMatch[1]) return brandMatch[1];
    return trimmed.split('?')[0].split('/')[0];
  }

  const handleApplyDesign = () => {
    const clean = extractDesignId(designInput);
    if (clean) setActiveDesignId(clean);
  };

  // Save corrections to parent deck
  const handleSaveCorrections = () => {
    if (onUpdateSlide) {
      onUpdateSlide({
        heading: editHeading,
        subHeading: editDescription,
        description: editDescription,
        metaphor: editMetaphor,
        visualConcept: editMetaphor,
        themeColor: editThemeColor,
        imageUrl: bgImageUrl,
        bulletPoints: editBullets,
      });
    }

    if (onUpdateReceipt) {
      onUpdateReceipt({
        studentName: editReceiptStudent,
        amount: editReceiptAmount,
        workshopName: editReceiptWorkshop,
      });
    }

    if (onUpdateCertificate) {
      onUpdateCertificate({
        studentName: editCertStudent,
        workshopName: editCertWorkshop,
      });
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Copy text formatted for Canva blocks
  const handleCopyForCanva = () => {
    const textBlocks = [
      `TITLE: ${editHeading}`,
      editDescription ? `SUBTITLE: ${editDescription}` : '',
      editMetaphor ? `METAPHOR: ${editMetaphor}` : '',
      editBullets.length ? `POINTS:\n${editBullets.map((b) => `• ${b}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    navigator.clipboard.writeText(textBlocks);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1-Click PNG Download using html2canvas
  const handleDownloadPng = async () => {
    if (!canvasRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `SwarYoga_Slide_${slideData?.slideNumber || 1}_Corrected.png`;
      a.click();
    } catch (err) {
      console.error('Download PNG failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddBullet = () => {
    if (!newBulletText.trim()) return;
    const updated = [...editBullets, newBulletText.trim()];
    setEditBullets(updated);
    setNewBulletText('');
    if (onUpdateSlide) onUpdateSlide({ bulletPoints: updated });
  };

  const handleRemoveBullet = (index: number) => {
    const updated = editBullets.filter((_, i) => i !== index);
    setEditBullets(updated);
    if (onUpdateSlide) onUpdateSlide({ bulletPoints: updated });
  };

  // Image Upload Reader
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'overlay' | 'mohan') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === 'bg') {
        setBgImageUrl(dataUrl);
      } else if (target === 'overlay') {
        setOverlayImageUrl(dataUrl);
        setShowOverlayImage(true);
      } else if (target === 'mohan') {
        setMohanSirPhotoUrl(dataUrl);
        setShowMohanSir(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Multi-Language Translation Handler
  const handleTranslateAllText = async (langCode: string) => {
    setIsTranslating(true);
    if (!originalSlideText) {
      setOriginalSlideText({
        heading: editHeading,
        description: editDescription,
        bullets: [...editBullets],
      });
    }

    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('crm_token') || '') : '';
      
      const payload = {
        text: `TITLE: ${editHeading}\nDESC: ${editDescription}\nPOINTS: ${editBullets.join(' ||| ')}`,
        sourceLang: 'auto',
        targetLang: langCode,
      };

      const res = await fetch('/api/cloud-translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const translated = data?.translatedText || '';
        if (translated) {
          const titleMatch = translated.match(/TITLE:\s*(.*?)(?=\nDESC:|$)/s);
          const descMatch = translated.match(/DESC:\s*(.*?)(?=\nPOINTS:|$)/s);
          const pointsMatch = translated.match(/POINTS:\s*(.*)/s);

          if (titleMatch && titleMatch[1]) setEditHeading(titleMatch[1].trim());
          if (descMatch && descMatch[1]) setEditDescription(descMatch[1].trim());
          if (pointsMatch && pointsMatch[1]) {
            const rawPoints = pointsMatch[1].trim();
            const pts = rawPoints.split('|||').map((s: string) => s.trim().replace(/^[•\-\*]\s*/, '')).filter(Boolean);
            if (pts.length > 0) setEditBullets(pts);
          }
          return;
        }
      }

      // Fallback: translate individual fields via /api/admin/translate
      const adminRes = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sourceText: `${editHeading}\n${editDescription}`,
          sourceLang: 'hi',
          targetLangs: [langCode],
          style: 'formal',
        }),
      });

      if (adminRes.ok) {
        const adminData = await adminRes.json();
        const first = adminData?.translations?.[0]?.translation;
        if (first) {
          const lines = first.split('\n').filter(Boolean);
          if (lines[0]) setEditHeading(lines[0]);
          if (lines[1]) setEditDescription(lines.slice(1).join(' '));
        }
      }
    } catch (e) {
      console.error('Translation error', e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRevertLanguage = () => {
    if (originalSlideText) {
      setEditHeading(originalSlideText.heading);
      setEditDescription(originalSlideText.description);
      setEditBullets([...originalSlideText.bullets]);
      setOriginalSlideText(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Side-by-Side Drawer */}
      <div
        className={`relative z-10 h-full bg-slate-900 text-slate-100 border-l border-slate-700/80 shadow-2xl flex flex-col transition-all duration-300 ${
          isExpanded ? 'w-full lg:w-[96vw]' : 'w-full sm:w-[650px] md:w-[780px] lg:w-[940px]'
        }`}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow">
              <Palette size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white truncate tracking-tight">
                  {title}
                </h3>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
                  In-CRM Workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Direct correction studio • Real-time live preview • No external tab needed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs mr-1">
              <button
                type="button"
                onClick={() => setActiveTab('native')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  activeTab === 'native'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✏️ Corrections &amp; Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('canva')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  activeTab === 'canva'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎨 Canva Embed
              </button>
            </div>

            {/* Expand / Minimize Width */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title={isExpanded ? 'Collapse width' : 'Expand full width'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition cursor-pointer"
              title="Close panel"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Tab 1: Direct Correction Studio & Live Preview */}
        {activeTab === 'native' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCorrections}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    isSaved
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black'
                  }`}
                >
                  {isSaved ? <Check size={14} /> : <Save size={14} />}
                  <span>{isSaved ? 'Corrections Saved!' : 'Save Corrections to CRM'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyForCanva}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                  title="Copy formatted text to paste into Canva"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy Text for Canva'}</span>
                </button>
              </div>

              {aspectRatio === '16:9' && (
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={isDownloading}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Download size={13} />
                  <span>{isDownloading ? 'Rendering...' : 'Download Slide (PNG)'}</span>
                </button>
              )}
            </div>

            {/* LIVE PREVIEW CANVAS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Eye size={14} />
                  <span>Live Visual Canvas (Updates as you type)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">1920 × 1080 Aspect Ratio</span>
                  {showMohanSir && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-bold">
                      Mohan Sir: {mohanScreenType === 'split_50' ? '50% Split' : mohanScreenType === 'round' ? 'Round PiP' : 'Square PiP'}
                    </span>
                  )}
                </div>
              </div>

              {aspectRatio === '16:9' && (
                <div
                  ref={canvasRef}
                  className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl relative flex flex-col justify-between p-6 border border-slate-700/60 transition-colors"
                  style={{
                    backgroundColor: editThemeColor,
                  }}
                >
                  {/* 1) Background Image Layer with Zoom & Blur */}
                  {bgImageUrl && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
                      <div
                        className="w-full h-full transition-all duration-150"
                        style={{
                          backgroundImage: `url(${bgImageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          transform: `scale(${bgZoom / 100})`,
                          filter: `blur(${Math.round((bgBlur / 100) * 20)}px)`,
                        }}
                      />
                      {/* Contrast Dim Layer */}
                      <div
                        className="absolute inset-0 bg-slate-950 transition-opacity"
                        style={{ opacity: bgDim / 100 }}
                      />
                    </div>
                  )}

                  {/* Top Slide Badge */}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/30 shadow">
                      SWAR YOGA MASTERCLASS • SLIDE #{slideData?.slideNumber || 1}
                    </span>
                    {editMetaphor && (
                      <span className="text-[10px] text-slate-200 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow max-w-[50%] truncate">
                        Metaphor: {editMetaphor}
                      </span>
                    )}
                  </div>

                  {/* Main Content Area */}
                  <div
                    className={`relative z-10 my-auto flex items-center justify-between gap-6 w-full ${
                      mohanScreenType === 'split_50' && showMohanSir ? 'pr-[48%]' : ''
                    }`}
                  >
                    {/* Left Text Block */}
                    <div className="space-y-2 max-w-[85%]">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-md">
                        {editHeading || 'शीर्षक प्रविष्ट करा (Enter Slide Heading)'}
                      </h2>
                      {editDescription && (
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium drop-shadow">
                          {editDescription}
                        </p>
                      )}
                      {editBullets && editBullets.length > 0 && (
                        <ul className="space-y-1.5 pt-1.5">
                          {editBullets.map((bp, i) => (
                            <li key={i} className="text-xs text-amber-200 flex items-start gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></span>
                              <span className="leading-snug">{bp}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* 2) Single Overlay Image (Diagram / Graphic) */}
                    {showOverlayImage && overlayImageUrl && (
                      <div
                        className={`shrink-0 overflow-hidden shadow-2xl transition-all ${
                          overlayPosition === 'center' ? 'mx-auto' : ''
                        } ${
                          overlayCrop === 'circle'
                            ? 'rounded-full aspect-square w-28 sm:w-36 border-2 border-amber-400'
                            : overlayCrop === 'card'
                              ? 'rounded-2xl border-2 border-cyan-400/80 bg-slate-900/80 p-1.5'
                              : overlayCrop === 'rounded'
                                ? 'rounded-2xl border border-white/20'
                                : 'rounded-lg'
                        }`}
                        style={{
                          width: overlayCrop === 'circle' ? undefined : '160px',
                          height: overlayCrop === 'circle' ? undefined : '130px',
                        }}
                      >
                        <img
                          src={overlayImageUrl}
                          alt="Overlay Graphic"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover transition-transform"
                          style={{ transform: `scale(${overlayZoom / 100})` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 3) Mohan Sir Talking Screen */}
                  {showMohanSir && (
                    <div
                      className={`transition-all z-20 ${
                        mohanScreenType === 'split_50'
                          ? 'absolute right-0 top-0 bottom-0 w-[46%] h-full border-l border-amber-400/40 shadow-2xl overflow-hidden bg-slate-950 flex flex-col justify-end p-4'
                          : `absolute ${
                              mohanPosition === 'bottom-left'
                                ? 'bottom-5 left-5'
                                : mohanPosition === 'top-right'
                                  ? 'top-5 right-5'
                                  : 'bottom-5 right-5'
                            } ${
                              mohanScreenType === 'round'
                                ? 'w-24 h-24 sm:w-36 sm:h-36 rounded-full border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                                : 'w-28 h-32 sm:w-40 sm:h-44 rounded-2xl border border-amber-400/60 shadow-2xl'
                            } overflow-hidden bg-slate-900`
                      }`}
                    >
                      {/* Avatar Media Frame */}
                      <div className="w-full h-full relative overflow-hidden">
                        <img
                          src={mohanSirPhotoUrl}
                          alt="Mohan Sir Video Screen"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover transition-transform"
                          style={{ transform: `scale(${mohanZoom / 100})` }}
                        />
                        {/* Prana Speaker Overlay Badge */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] text-white">
                          <span className="flex items-center gap-1 font-bold truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Mohan Sir
                          </span>
                          <span className="text-amber-300 font-mono text-[8px] uppercase">Acharya</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Footer */}
                  <div className="flex items-center justify-between text-[10px] text-slate-300/80 border-t border-white/10 pt-2 relative z-10">
                    <span>swaryoga.com</span>
                    <span>Brain Balance • Swar Science</span>
                  </div>
                </div>
              )}

              {/* Receipt Preview */}
              {aspectRatio === 'A4' && (
                <div className="w-full bg-white text-slate-900 rounded-xl p-6 shadow-2xl border border-slate-300 space-y-4">
                  <div className="flex justify-between items-start border-b pb-4">
                    <div>
                      <h2 className="text-lg font-black text-indigo-900">SWAR YOGA</h2>
                      <p className="text-xs text-slate-500">Official Payment Receipt</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-slate-700">
                        {receiptData?.receiptNumber || 'REC-2026-001'}
                      </p>
                      <p className="text-[11px] text-slate-400">{receiptData?.date || new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Participant Name:</span>
                      <span className="font-bold">{editReceiptStudent || 'Student'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Workshop / Program:</span>
                      <span className="font-bold">{editReceiptWorkshop || 'Swar Yoga Masterclass'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-bold text-sm text-indigo-900">
                      <span>Amount Paid:</span>
                      <span>₹{editReceiptAmount || '0'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Certificate Preview */}
              {aspectRatio === 'A4_landscape' && (
                <div className="w-full bg-amber-50/90 text-amber-950 rounded-xl p-8 shadow-2xl border-4 border-amber-600/40 space-y-4 text-center">
                  <div className="space-y-1">
                    <Award className="mx-auto text-amber-600 mb-1" size={32} />
                    <h2 className="text-xl font-serif font-black tracking-wider text-amber-900">
                      CERTIFICATE OF COMPLETION
                    </h2>
                    <p className="text-[11px] uppercase tracking-widest text-amber-700">
                      SWAR YOGA INTERNATIONAL
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 italic">This is proudly presented to</p>
                  <h3 className="text-xl font-bold font-serif text-amber-950 border-b-2 border-amber-400 pb-1 max-w-sm mx-auto">
                    {editCertStudent || 'Participant Name'}
                  </h3>
                  <p className="text-xs text-slate-700 max-w-md mx-auto">
                    for successfully mastering the sacred breath science in{' '}
                    <span className="font-bold">{editCertWorkshop || 'Swar Yoga Masterclass'}</span>.
                  </p>
                </div>
              )}
            </div>

            {/* ADVANCED MULTI-TOOL SUITE */}
            {aspectRatio === '16:9' && (
              <div className="space-y-4">
                {/* TOOL 1: Background Image Controls (Zoom In/Out, Blur %, Dim) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <ImageIcon size={15} />
                      </div>
                      <h4 className="text-xs font-black text-white">1. Background Image Studio</h4>
                    </div>
                    <span className="text-[10px] text-slate-400">Zoom in/out • Blur % • Dark Dim</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Background Image Source:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={bgImageUrl}
                          onChange={(e) => setBgImageUrl(e.target.value)}
                          placeholder="Paste image URL..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 font-mono focus:border-amber-400 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => bgFileInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                          title="Upload image from computer"
                        >
                          <Upload size={13} />
                          <span>Upload</span>
                        </button>
                        <input
                          ref={bgFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLocalImageUpload(e, 'bg')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Preset Themes:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {BACKGROUND_PRESETS.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setBgImageUrl(p.url)}
                            className="px-2 py-1 text-[10px] font-bold bg-slate-950 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-800 rounded-lg transition"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sliders: Zoom & Blur & Dim */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    {/* Zoom In/Out */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-300 flex items-center gap-1">
                          <ZoomIn size={12} className="text-amber-400" />
                          <span>Background Zoom:</span>
                        </span>
                        <span className="text-amber-300 font-mono">{bgZoom}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBgZoom((prev) => Math.max(100, prev - 10))}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300"
                          title="Zoom out"
                        >
                          <ZoomOut size={13} />
                        </button>
                        <input
                          type="range"
                          min={100}
                          max={250}
                          value={bgZoom}
                          onChange={(e) => setBgZoom(Number(e.target.value))}
                          className="flex-1 accent-amber-500 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setBgZoom((prev) => Math.min(250, prev + 10))}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300"
                          title="Zoom in"
                        >
                          <ZoomIn size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Blur % In/Out */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-300 flex items-center gap-1">
                          <SlidersHorizontal size={12} className="text-cyan-400" />
                          <span>Blur Intensity:</span>
                        </span>
                        <span className="text-cyan-300 font-mono">{bgBlur}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBgBlur((prev) => Math.max(0, prev - 10))}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300"
                          title="Decrease blur"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={bgBlur}
                          onChange={(e) => setBgBlur(Number(e.target.value))}
                          className="flex-1 accent-cyan-500 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setBgBlur((prev) => Math.min(100, prev + 10))}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300"
                          title="Increase blur"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Dark Dim Contrast Overlay */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-300 flex items-center gap-1">
                          <Moon size={12} className="text-indigo-400" />
                          <span>Text Backdrop Dim:</span>
                        </span>
                        <span className="text-indigo-300 font-mono">{bgDim}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={bgDim}
                        onChange={(e) => setBgDim(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* TOOL 2: Single Overlay Image & Crop (Crop Shape, Zoom In/Out) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Crop size={15} />
                      </div>
                      <h4 className="text-xs font-black text-white">2. Diagram / Product Image &amp; Crop</h4>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={showOverlayImage}
                        onChange={(e) => setShowOverlayImage(e.target.checked)}
                        className="rounded border-slate-700 accent-cyan-500"
                      />
                      <span>Show Image on Slide</span>
                    </label>
                  </div>

                  {showOverlayImage && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Image Source:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={overlayImageUrl}
                              onChange={(e) => setOverlayImageUrl(e.target.value)}
                              placeholder="Paste diagram/product image URL..."
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 font-mono focus:border-cyan-400 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => overlayFileInputRef.current?.click()}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                            >
                              <Upload size={13} />
                              <span>Upload</span>
                            </button>
                            <input
                              ref={overlayFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleLocalImageUpload(e, 'overlay')}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Crop &amp; Frame Shape:
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { id: 'none', label: 'Original' },
                              { id: 'rounded', label: 'Rounded' },
                              { id: 'circle', label: 'Circle' },
                              { id: 'card', label: 'Glow Card' },
                            ].map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setOverlayCrop(c.id as any)}
                                className={`py-1 text-[11px] font-bold rounded-lg border text-center transition ${
                                  overlayCrop === c.id
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                }`}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Zoom In/Out for Overlay */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-300">Image Zoom Scale:</span>
                            <span className="text-cyan-300 font-mono">{overlayZoom}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setOverlayZoom((prev) => Math.max(50, prev - 10))}
                              className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300"
                            >
                              <ZoomOut size={13} />
                            </button>
                            <input
                              type="range"
                              min={50}
                              max={200}
                              value={overlayZoom}
                              onChange={(e) => setOverlayZoom(Number(e.target.value))}
                              className="flex-1 accent-cyan-500 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => setOverlayZoom((prev) => Math.min(200, prev + 10))}
                              className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300"
                            >
                              <ZoomIn size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Position */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300 block">Position on Slide:</label>
                          <div className="flex gap-2">
                            {['left', 'center', 'right'].map((pos) => (
                              <button
                                key={pos}
                                type="button"
                                onClick={() => setOverlayPosition(pos as any)}
                                className={`flex-1 py-1 text-[11px] font-bold rounded-lg uppercase border transition ${
                                  overlayPosition === pos
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                }`}
                              >
                                {pos}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TOOL 3: Mohan Sir Talking Screen (50% Split, Round, Square, Zoom) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Video size={15} />
                      </div>
                      <h4 className="text-xs font-black text-white">3. Mohan Sir Talking Screen</h4>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={showMohanSir}
                        onChange={(e) => setShowMohanSir(e.target.checked)}
                        className="rounded border-slate-700 accent-emerald-500"
                      />
                      <span>Enable Talking Screen</span>
                    </label>
                  </div>

                  {showMohanSir && (
                    <div className="space-y-3.5">
                      {/* Screen Style Options: 50% Split, Round, Square */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                          Screen Layout &amp; Shape:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'round', label: '⚪ Round (PiP)', desc: 'Circle aura badge' },
                            { id: 'square', label: '🔲 Square (PiP)', desc: 'Card talking head' },
                            { id: 'split_50', label: '🌓 50% Split Screen', desc: '50% Slide + 50% Video' },
                          ].map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setMohanScreenType(st.id as any)}
                              className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                mohanScreenType === st.id
                                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <div className="font-bold text-xs">{st.label}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Mohan Sir Camera Zoom In/Out */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-300">Camera / Avatar Zoom:</span>
                            <span className="text-emerald-300 font-mono">{mohanZoom}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setMohanZoom((prev) => Math.max(50, prev - 10))}
                              className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300"
                            >
                              <ZoomOut size={13} />
                            </button>
                            <input
                              type="range"
                              min={50}
                              max={200}
                              value={mohanZoom}
                              onChange={(e) => setMohanZoom(Number(e.target.value))}
                              className="flex-1 accent-emerald-500 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => setMohanZoom((prev) => Math.min(200, prev + 10))}
                              className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300"
                            >
                              <ZoomIn size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Corner Position (if PiP mode) */}
                        {mohanScreenType !== 'split_50' && (
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300 block">Corner Position:</label>
                            <div className="flex gap-2">
                              {[
                                { id: 'bottom-right', label: 'Bottom Right' },
                                { id: 'bottom-left', label: 'Bottom Left' },
                                { id: 'top-right', label: 'Top Right' },
                              ].map((pos) => (
                                <button
                                  key={pos.id}
                                  type="button"
                                  onClick={() => setMohanPosition(pos.id as any)}
                                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition ${
                                    mohanPosition === pos.id
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                  }`}
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Custom Video / Photo Upload */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Mohan Sir Video / Avatar Photo:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={mohanSirPhotoUrl}
                            onChange={(e) => setMohanSirPhotoUrl(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-400 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => mohanFileInputRef.current?.click()}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                          >
                            <Upload size={13} />
                            <span>Upload Avatar</span>
                          </button>
                          <input
                            ref={mohanFileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => handleLocalImageUpload(e, 'mohan')}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TOOL 4: Multi-Language Text Converter */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Globe size={15} />
                      </div>
                      <h4 className="text-xs font-black text-white">4. Multi-Language Video Converter</h4>
                    </div>
                    {originalSlideText && (
                      <button
                        type="button"
                        onClick={handleRevertLanguage}
                        className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Revert to Original Language</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Instantly convert slide title, explanation, and bullet points into any target language for localized video lectures:
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {MULTI_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setTargetLang(lang.code)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                          targetLang === lang.code
                            ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.native}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTranslateAllText(targetLang)}
                    disabled={isTranslating}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {isTranslating ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Translating Slide into {MULTI_LANGUAGES.find((l) => l.code === targetLang)?.name}...</span>
                      </>
                    ) : (
                      <>
                        <Globe size={14} />
                        <span>
                          Convert Slide Text into {MULTI_LANGUAGES.find((l) => l.code === targetLang)?.name} ({MULTI_LANGUAGES.find((l) => l.code === targetLang)?.native})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* INTERACTIVE TEXT CORRECTION FORM */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Sliders size={14} className="text-amber-400" />
                  <span>Interactive Text Correction Fields</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Type here &rarr; Preview updates immediately
                </span>
              </div>

              {aspectRatio === '16:9' ? (
                <>
                  {/* Slide Heading Correction */}
                  <div>
                    <label className="text-xs font-bold text-amber-300 block mb-1">
                      Slide Heading (शीर्षक / Main Title):
                    </label>
                    <input
                      type="text"
                      value={editHeading}
                      onChange={(e) => {
                        setEditHeading(e.target.value);
                        if (onUpdateSlide) onUpdateSlide({ heading: e.target.value });
                      }}
                      placeholder="Enter slide heading..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-amber-400 transition"
                    />
                  </div>

                  {/* Subheading / Concept Correction */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Subheading / Explanation (स्पष्टीकरण / ज्ञान सूत्र):
                    </label>
                    <textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => {
                        setEditDescription(e.target.value);
                        if (onUpdateSlide) onUpdateSlide({ subHeading: e.target.value, description: e.target.value });
                      }}
                      placeholder="Enter brief explanation..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 transition"
                    />
                  </div>

                  {/* Energy Flow Color Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Theme Energy Color (3-Color Brain Balance Flow):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ENERGY_COLORS.map((ec) => (
                        <button
                          key={ec.color}
                          type="button"
                          onClick={() => {
                            setEditThemeColor(ec.color);
                            if (onUpdateSlide) onUpdateSlide({ themeColor: ec.color });
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            editThemeColor.toLowerCase() === ec.color.toLowerCase()
                              ? 'border-amber-400 bg-amber-400/20 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                            style={{ backgroundColor: ec.color }}
                          />
                          <span className="truncate text-[11px]">{ec.label.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Metaphor */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Metaphor Tag (उदा. सूर्य, चंद्र, नाडी):
                    </label>
                    <input
                      type="text"
                      value={editMetaphor}
                      onChange={(e) => {
                        setEditMetaphor(e.target.value);
                        if (onUpdateSlide) onUpdateSlide({ metaphor: e.target.value, visualConcept: e.target.value });
                      }}
                      placeholder="e.g. Brain Balance, Golden Sun..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Bullet Points Correction */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Bullet Points (महत्त्वाचे मुद्दे):
                    </label>
                    <div className="space-y-1.5 mb-2">
                      {editBullets.map((bp, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={bp}
                            onChange={(e) => {
                              const updated = [...editBullets];
                              updated[i] = e.target.value;
                              setEditBullets(updated);
                              if (onUpdateSlide) onUpdateSlide({ bulletPoints: updated });
                            }}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet(i)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition cursor-pointer"
                            title="Remove bullet"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add new bullet point..."
                        value={newBulletText}
                        onChange={(e) => setNewBulletText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddBullet()}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddBullet}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : aspectRatio === 'A4' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Participant Name:</label>
                      <input
                        type="text"
                        value={editReceiptStudent}
                        onChange={(e) => setEditReceiptStudent(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Amount Paid (₹):</label>
                      <input
                        type="text"
                        value={editReceiptAmount}
                        onChange={(e) => setEditReceiptAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Workshop Name:</label>
                    <input
                      type="text"
                      value={editReceiptWorkshop}
                      onChange={(e) => setEditReceiptWorkshop(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Student Full Name:</label>
                      <input
                        type="text"
                        value={editCertStudent}
                        onChange={(e) => setEditCertStudent(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Workshop Name:</label>
                      <input
                        type="text"
                        value={editCertWorkshop}
                        onChange={(e) => setEditCertWorkshop(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Save Button at bottom */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveCorrections}
                  className={`w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                    isSaved
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black'
                  }`}
                >
                  {isSaved ? <Check size={16} /> : <Save size={16} />}
                  <span>{isSaved ? 'All Corrections Saved to CRM!' : 'Save Corrections &amp; Update CRM'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Canva Embedded Frame */}
        {activeTab === 'canva' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/40">
            {/* Control Bar: Design ID / URL selector */}
            <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <div className="flex-1 min-w-[240px] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste Canva Design ID or URL (e.g. DAGw5Hx3Vmo)..."
                  value={designInput}
                  onChange={(e) => setDesignInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyDesign()}
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyDesign}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  Load
                </button>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1">
                {PRESET_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setDesignInput(tpl.id);
                      setActiveDesignId(tpl.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      activeDesignId === tpl.id
                        ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              {/* External open link */}
              <a
                href={
                  activeDesignId.startsWith('http')
                    ? activeDesignId
                    : `https://www.canva.com/design/${activeDesignId}/edit`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="Open directly in Canva.com (new tab)"
              >
                <ExternalLink size={15} />
              </a>
            </div>

            {/* Embedded Iframe */}
            <div className="flex-1 w-full h-full relative bg-slate-950">
              {activeDesignId ? (
                <iframe
                  title="Canva Editor"
                  src={
                    activeDesignId.includes('canva.com')
                      ? activeDesignId.includes('embed')
                        ? activeDesignId
                        : `${activeDesignId}?embed`
                      : `https://www.canva.com/design/${activeDesignId}/view?embed`
                  }
                  allow="fullscreen; clipboard-write; camera; microphone"
                  className="w-full h-full border-0 absolute inset-0"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2">
                  <Palette size={32} className="opacity-40" />
                  <p>Enter a Canva Design ID or select a preset template above.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
