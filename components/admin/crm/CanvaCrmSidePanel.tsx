'use client';

import React, { useState, useEffect } from 'react';
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
  Award
} from 'lucide-react';

export interface CanvaCrmSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialDesignId?: string;
  aspectRatio?: '16:9' | 'A4' | 'A4_landscape';
  slideData?: {
    slideNumber?: number;
    heading?: string;
    description?: string;
    themeColor?: string;
    themeType?: string;
    metaphor?: string;
    imageUrl?: string;
    bulletPoints?: string[];
  };
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
}

// Preset Swar Yoga templates
const PRESET_TEMPLATES = [
  { id: 'DAGw5Hx3Vmo', label: '16:9 Swar Yoga Slides', type: '16:9' },
  { id: 'EAHW508uKP4', label: 'A4 Official Receipt', type: 'A4' },
  { id: 'EAGcert92Swar', label: 'A4 Swar Yoga Certificate', type: 'A4_landscape' },
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
}: CanvaCrmSidePanelProps) {
  const [activeTab, setActiveTab] = useState<'canva' | 'native'>('canva');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [designInput, setDesignInput] = useState<string>(initialDesignId);
  const [activeDesignId, setActiveDesignId] = useState<string>(initialDesignId || 'DAGw5Hx3Vmo');
  const [copied, setCopied] = useState<boolean>(false);

  // Sync initialDesignId when prop changes
  useEffect(() => {
    if (initialDesignId) {
      setDesignInput(initialDesignId);
      setActiveDesignId(extractDesignId(initialDesignId));
    }
  }, [initialDesignId]);

  // Helper to extract clean Canva Design ID from full URL or bare ID
  function extractDesignId(input: string): string {
    const trimmed = (input || '').trim();
    if (!trimmed) return '';
    // If user pasted a full URL e.g. https://www.canva.com/design/DAGw5Hx3Vmo/view...
    const match = trimmed.match(/design\/([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Or brand templates: /brand/brand-templates/EAHW508uKP4
    const brandMatch = trimmed.match(/brand-templates\/([A-Za-z0-9_-]+)/);
    if (brandMatch && brandMatch[1]) {
      return brandMatch[1];
    }
    // Otherwise treat as raw ID
    return trimmed.split('?')[0].split('/')[0];
  }

  const handleApplyDesign = () => {
    const clean = extractDesignId(designInput);
    if (clean) {
      setActiveDesignId(clean);
    }
  };

  const handleCopyDesignLink = () => {
    const embedUrl = `https://www.canva.com/design/${activeDesignId}/view?embed`;
    navigator.clipboard.writeText(embedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          isExpanded ? 'w-full lg:w-[92vw]' : 'w-full sm:w-[560px] md:w-[680px] lg:w-[820px]'
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
                Embedded directly inside Swar Yoga CRM • No external page needed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs mr-1">
              <button
                type="button"
                onClick={() => setActiveTab('canva')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  activeTab === 'canva'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Canva Embed
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('native')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  activeTab === 'native'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Native Studio
              </button>
            </div>

            {/* Expand / Minimize Width */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title={isExpanded ? 'Collapse width' : 'Expand full width'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition"
              title="Close panel"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Tab 1: Canva Embedded Frame */}
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
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
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
                  onClick={handleCopyDesignLink}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Copy Embed URL"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
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
                    <span>Live Canva In-CRM Embed • Changes sync automatically</span>
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

        {/* Tab 2: Native In-CRM Visual Studio */}
        {activeTab === 'native' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
            {/* Visual Canvas Render */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Native In-CRM Live Canvas ({aspectRatio})</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  100% Offline Capable • Zero External Dependencies
                </span>
              </div>

              {/* 16:9 Slide Preview */}
              {aspectRatio === '16:9' && slideData && (
                <div
                  className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl relative flex flex-col justify-between p-6 border border-slate-700/60"
                  style={{
                    backgroundColor: slideData.themeColor || '#1e1b4b',
                    backgroundImage: slideData.imageUrl
                      ? `linear-gradient(to right, rgba(15,23,42,0.92) 40%, rgba(15,23,42,0.4)), url(${slideData.imageUrl})`
                      : 'radial-gradient(ellipse at top left, rgba(245,158,11,0.15), transparent)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-black/40 px-2.5 py-1 rounded-full border border-amber-400/20">
                      Swar Yoga Masterclass • Slide #{slideData.slideNumber || 1}
                    </span>
                    {slideData.metaphor && (
                      <span className="text-[10px] text-slate-300 bg-slate-950/60 px-2.5 py-0.5 rounded-full">
                        Metaphor: {slideData.metaphor}
                      </span>
                    )}
                  </div>

                  <div className="my-auto max-w-[75%] space-y-2">
                    <h2 className="text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-md">
                      {slideData.heading || 'स्वर योग: नाड़ी और स्वर विज्ञान'}
                    </h2>
                    {slideData.description && (
                      <p className="text-xs lg:text-sm text-slate-200/90 leading-relaxed font-medium drop-shadow">
                        {slideData.description}
                      </p>
                    )}
                    {slideData.bulletPoints && slideData.bulletPoints.length > 0 && (
                      <ul className="space-y-1 pt-2">
                        {slideData.bulletPoints.slice(0, 3).map((bp, i) => (
                          <li key={i} className="text-xs text-amber-200 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>{bp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/10 pt-2">
                    <span>swaryoga.com</span>
                    <span>3-Color Energy Progression</span>
                  </div>
                </div>
              )}

              {/* A4 Receipt Preview */}
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
                      <span className="font-bold">{receiptData?.studentName || 'Student'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Workshop / Program:</span>
                      <span className="font-bold">{receiptData?.workshopName || 'Swar Yoga Masterclass'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-bold text-sm text-indigo-900">
                      <span>Amount Paid:</span>
                      <span>₹{receiptData?.amount || '0'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* A4 Landscape Certificate Preview */}
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
                    {certificateData?.studentName || 'Participant Name'}
                  </h3>
                  <p className="text-xs text-slate-700 max-w-md mx-auto">
                    for successfully mastering the sacred breath science in{' '}
                    <span className="font-bold">{certificateData?.workshopName || 'Swar Yoga Masterclass'}</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Helper Notes */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
              <p className="font-bold text-slate-300">💡 Why In-CRM Canva?</p>
              <p>
                Opening external <code className="text-cyan-300">canva.com/design/create</code> tabs fails with 400 Bad Request because Canva does not accept raw GET parameters.
                This embedded side panel keeps you 100% inside your CRM workflow without losing context or encountering errors.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

