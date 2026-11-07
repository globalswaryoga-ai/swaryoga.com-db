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
  Compass
} from 'lucide-react';

export interface EditableSlideData {
  slideNumber?: number;
  heading?: string;
  description?: string;
  subHeading?: string;
  themeColor?: string;
  themeType?: string;
  metaphor?: string;
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
  { id: 'EAHW508uKP4', label: 'A4 Official Receipt', type: 'A4' },
  { id: 'EAGcert92Swar', label: 'A4 Swar Yoga Certificate', type: 'A4_landscape' },
];

const ENERGY_COLORS = [
  { label: 'Surya (Solar / Gold)', color: '#F59E0B', icon: Sun },
  { label: 'Sushumna (Wisdom / Indigo)', color: '#6366F1', icon: Compass },
  { label: 'Chandra (Lunar / Teal)', color: '#14B8A6', icon: Moon },
  { label: 'Vedic Gold Charcoal', color: '#D97706', icon: Sparkles },
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
  const [editImageUrl, setEditImageUrl] = useState<string>(slideData?.imageUrl || '');
  const [editBullets, setEditBullets] = useState<string[]>(slideData?.bulletPoints || []);
  const [newBulletText, setNewBulletText] = useState<string>('');

  // Editable local state for receipts
  const [editReceiptStudent, setEditReceiptStudent] = useState<string>(receiptData?.studentName || '');
  const [editReceiptAmount, setEditReceiptAmount] = useState<string | number>(receiptData?.amount || '');
  const [editReceiptWorkshop, setEditReceiptWorkshop] = useState<string>(receiptData?.workshopName || '');

  // Editable local state for certificates
  const [editCertStudent, setEditCertStudent] = useState<string>(certificateData?.studentName || '');
  const [editCertWorkshop, setEditCertWorkshop] = useState<string>(certificateData?.workshopName || '');

  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync state when slideData changes
  useEffect(() => {
    if (slideData) {
      setEditHeading(slideData.heading || '');
      setEditDescription(slideData.description || slideData.subHeading || '');
      setEditMetaphor(slideData.metaphor || '');
      setEditThemeColor(slideData.themeColor || '#6366F1');
      setEditImageUrl(slideData.imageUrl || '');
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
        imageUrl: editImageUrl,
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
          isExpanded ? 'w-full lg:w-[94vw]' : 'w-full sm:w-[600px] md:w-[720px] lg:w-[860px]'
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
                ✏️ Corrections & Editor
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
                <span className="text-[10px] text-slate-400 font-mono">1920 × 1080 Aspect Ratio</span>
              </div>

              {aspectRatio === '16:9' && (
                <div
                  ref={canvasRef}
                  className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl relative flex flex-col justify-between p-6 border border-slate-700/60 transition-colors"
                  style={{
                    backgroundColor: editThemeColor,
                    backgroundImage: editImageUrl
                      ? `linear-gradient(to right, rgba(15,23,42,0.92) 40%, rgba(15,23,42,0.4)), url(${editImageUrl})`
                      : 'radial-gradient(ellipse at top left, rgba(245,158,11,0.15), transparent)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-black/50 px-2.5 py-1 rounded-full border border-amber-400/20">
                      Swar Yoga Masterclass • Slide #{slideData?.slideNumber || 1}
                    </span>
                    {editMetaphor && (
                      <span className="text-[10px] text-slate-200 bg-slate-950/70 px-2.5 py-0.5 rounded-full border border-white/10">
                        Metaphor: {editMetaphor}
                      </span>
                    )}
                  </div>

                  <div className="my-auto max-w-[80%] space-y-2">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-md">
                      {editHeading || 'शीर्षक प्रविष्ट करा (Enter Slide Heading)'}
                    </h2>
                    {editDescription && (
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium drop-shadow">
                        {editDescription}
                      </p>
                    )}
                    {editBullets && editBullets.length > 0 && (
                      <ul className="space-y-1 pt-1.5">
                        {editBullets.map((bp, i) => (
                          <li key={i} className="text-xs text-amber-200 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                            <span>{bp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-300/80 border-t border-white/10 pt-2">
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

            {/* INTERACTIVE CORRECTION FORM */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Sliders size={14} className="text-amber-400" />
                  <span>Interactive Correction Fields</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Type here $\rightarrow$ Preview updates immediately
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

                  {/* Visual Metaphor / Image URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Image URL (Background Metaphor):
                      </label>
                      <input
                        type="text"
                        value={editImageUrl}
                        onChange={(e) => {
                          setEditImageUrl(e.target.value);
                          if (onUpdateSlide) onUpdateSlide({ imageUrl: e.target.value });
                        }}
                        placeholder="https://swaryogacrm.b-cdn.net/..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
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
                  <span>{isSaved ? 'All Corrections Saved to CRM!' : 'Save Corrections & Update CRM'}</span>
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
                  Load Design
                </button>
              </div>

              {/* Quick Preset Selector */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Presets:</span>
                {PRESET_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setDesignInput(tpl.id);
                      setActiveDesignId(tpl.id);
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                      activeDesignId === tpl.id
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={handleCopyForCanva}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 flex items-center gap-1 transition cursor-pointer"
                  title="Copy Slide Text to Paste into Canva Elements"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied Text' : 'Copy Text'}</span>
                </button>

                <a
                  href={`https://www.canva.com/design/${activeDesignId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition shadow cursor-pointer"
                  title="Open in Canva Cloud Editor if you want advanced Canva tools"
                >
                  <span>Open Canva Editor</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Embedded Canva Iframe */}
            <div className="flex-1 relative p-3 flex flex-col min-h-0">
              {activeDesignId ? (
                <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black relative flex flex-col">
                  <iframe
                    key={activeDesignId}
                    src={`https://www.canva.com/design/${activeDesignId}/view?embed`}
                    className="w-full flex-1 border-0"
                    allowFullScreen
                    allow="fullscreen"
                    title="Embedded Canva Workspace"
                  />
                  {/* Footer status inside frame */}
                  <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-cyan-400">Design ID: {activeDesignId}</span>
                    <span>Live Canva Embed • For direct text correction use the &quot;Corrections &amp; Editor&quot; tab above</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                  <Palette size={40} className="text-slate-600 mb-3" />
                  <h4 className="text-sm font-bold text-slate-200">No Canva Design ID Selected</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Enter any Canva design ID or link in the bar above, or choose one of the Swar Yoga presets.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
