'use client';

import { useEffect, useRef, useState, type ReactNode, type ElementType } from 'react';
import Link from 'next/link';
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BookOpen, Brain,
  ChevronRight, CircleHelp, FileSearch, FileText, FlaskConical, Globe2,
  HardDrive, Languages, LayoutDashboard, ListChecks, LockKeyhole, Mic2, Network,
  Search, Settings2, ShieldCheck, Sparkles, Upload, UserRoundCog, Users, Video, FileAudio,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { compressAudioForWhisper } from '@/lib/clientAudioCompressor';
import { parseAvatarScript } from '@/lib/avatarEmotionParser';
import type { MohanRagModule } from '@/lib/mohanRag/knowledgeRepository';

type SectionId =
  | 'overview' | 'library' | 'why' | 'level1' | 'level2' | 'level3' | 'general'
  | 'research' | 'ingestion' | 'search' | 'instructions' | 'avatar'
  | 'connection' | 'analytics' | 'settings';

type NavItem = { id: SectionId; label: string; icon: ElementType };

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Knowledge Management',
    items: [
      { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
      { id: 'library' as const, label: 'Library', icon: BookOpen },
      { id: 'why' as const, label: 'Why Swar Yoga?', icon: Sparkles },
      { id: 'level1' as const, label: 'Level 1', icon: BookOpen },
      { id: 'level2' as const, label: 'Level 2', icon: BookOpen },
      { id: 'level3' as const, label: 'Level 3', icon: BookOpen },
      { id: 'general' as const, label: 'General Topics', icon: Globe2 },
      { id: 'research' as const, label: 'Research & Search', icon: FlaskConical },
      { id: 'ingestion' as const, label: 'Ingestion & Jobs', icon: Upload },
      { id: 'search' as const, label: 'Knowledge Search & Test', icon: FileSearch },
      { id: 'instructions' as const, label: 'Global Instructions', icon: ListChecks },
    ],
  },
  {
    title: 'AI Avatar — My Clone',
    items: [
      { id: 'avatar' as const, label: 'Avatar & Voice', icon: UserRoundCog },
      { id: 'connection' as const, label: 'RAG Answer Connection', icon: Network },
    ],
  },
  {
    title: 'Platform Operations',
    items: [
      { id: 'analytics' as const, label: 'Analytics', icon: Activity },
      { id: 'settings' as const, label: 'Settings', icon: Settings2 },
    ],
  },
];

const modules = [
  {
    id: 'why' as const,
    title: 'Why Swar Yoga?',
    purpose: 'Motivation and awareness only. Explain why learning matters; practical HOW instructions stay out of this module.',
    access: 'Standalone module',
    boundary: 'No techniques, step-by-step practices, or unsupported benefit claims.',
  },
  {
    id: 'level1' as const,
    title: 'Level 1',
    purpose: 'Answer from approved Level 1 lessons and source material.',
    access: 'Level 1 sources only',
    boundary: 'Do not expose Level 2 or Level 3 knowledge.',
  },
  {
    id: 'level2' as const,
    title: 'Level 2',
    purpose: 'Answer using approved Level 1 and Level 2 materials, with source-level context.',
    access: 'Level 1 + Level 2 sources',
    boundary: 'Do not expose Level 3 knowledge.',
  },
  {
    id: 'level3' as const,
    title: 'Level 3',
    purpose: 'Answer using approved Level 1, Level 2, and Level 3 materials.',
    access: 'Level 1 + Level 2 + Level 3 sources',
    boundary: 'Advanced answers require approved Level 3 sources.',
  },
  {
    id: 'general' as const,
    title: 'General Topics',
    purpose: 'Handle approved general education while distinguishing it from Swar Yoga teachings.',
    access: 'Approved General Topics sources',
    boundary: 'No diagnosis or unsupported medical claims; show professional-care guidance where relevant.',
  },
  {
    id: 'research' as const,
    title: 'Research & Search Engine',
    purpose: 'A separate, admin-reviewed research corpus. Keep scientific findings distinct from traditional Swar Yoga teachings and hypotheses.',
    access: 'Approved Research reports only',
    boundary: 'Never publish or retrieve research drafts before human review and approval.',
  },
];

async function readManagementApiJson(response: Response) {
  const body = await response.text();
  try { return JSON.parse(body); } catch {
    const route = response.url ? new URL(response.url).pathname : 'RAG Management API';
    throw new Error(`RAG API returned a non-JSON page (HTTP ${response.status}, ${route}). Restart the Next.js dev server to load the latest route, then retry.`);
  }
}

const readiness = 'Text workspace';

function devanagariFontClass(text = '', language = '') {
  return language === 'hi' || language === 'mr' || language === 'sa' || /[\u0900-\u097f]/.test(text)
    ? 'font-devanagari'
    : '';
}

function StatusPill({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-xs ${
      muted 
        ? 'border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900' 
        : 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900'
    }`}>
      <span className={`h-2 w-2 rounded-full ${muted ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
      {children}
    </span>
  );
}

function DetailCard({ title, children, icon: Icon }: { title: string; children: ReactNode; icon: ElementType }) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200">
      <div className="mb-3 flex items-center gap-2.5 text-sm font-bold text-slate-900">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-xs">
          <Icon className="h-4 w-4" />
        </div>
        <span>{title}</span>
      </div>
      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function NotConnected({ children = 'This workflow is not connected to a backend yet.' }: { children?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 p-4 text-sm text-amber-950 shadow-sm">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs mt-0.5">
        <AlertCircle className="h-4 w-4" />
      </div>
      <div><strong className="font-bold text-amber-900">System Ready & Monitored:</strong> <span className="text-amber-900/90 leading-relaxed">{children}</span></div>
    </div>
  );
}

export default function MohanRagManagementPage() {
  const authToken = useAuth();
  const [active, setActive] = useState<SectionId>('overview');
  const allItems: NavItem[] = navGroups.flatMap(group => group.items);
  const current = allItems.find(item => item.id === active) || { id: 'overview', label: 'Overview', icon: LayoutDashboard };
  const CurrentIcon = current.icon;
  const currentModule = modules.find(module => module.id === active);

  return (
    <div className="mohan-rag-management min-h-[calc(100vh-5rem)] bg-white text-slate-900">
      <style jsx global>{`
        /* Global button baseline */
        .mohan-rag-management button.mohan-rag-btn-dark,
        .mohan-rag-management a.mohan-rag-btn-dark {
          background: linear-gradient(135deg, #14251a, #263b2d) !important;
          border-color: #294a36 !important;
          color: #ffffff !important;
          box-shadow: 0 2px 6px rgba(15, 45, 27, 0.12);
          transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }
        
        .mohan-rag-management input:not([type="checkbox"]),
        .mohan-rag-management textarea,
        .mohan-rag-management select {
          background-color: #ffffff !important;
          border-color: #cbd8ce !important;
          color: #0f172a !important;
        }
        .mohan-rag-management input::placeholder,
        .mohan-rag-management textarea::placeholder {
          color: #94a3b8 !important;
        }
        .mohan-rag-management input:focus,
        .mohan-rag-management textarea:focus,
        .mohan-rag-management select:focus {
          outline: 2px solid #059669 !important;
          outline-offset: 1px;
        }

        /* 🌿 Lush Green Card Pattern with Pristine High Contrast */
        .mohan-rag-management .mohan-rag-green-card {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1.5px solid #d1fae5 !important;
          box-shadow: 0 4px 18px rgba(5, 150, 105, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04) !important;
          transition: all 220ms cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .mohan-rag-management .mohan-rag-green-card:hover {
          background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 50%) !important;
          border-color: #10b981 !important;
          box-shadow: 0 12px 28px rgba(5, 150, 105, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06) !important;
          transform: translateY(-2px) !important;
        }
      `}</style>
      <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-6 md:py-6">
        <div className="relative mb-6 overflow-hidden rounded-[24px] bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#059669] text-white p-4 sm:p-5 shadow-[0_12px_28px_rgba(234,88,12,0.22)] border border-white/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Top Specular Gloss Highlight */}
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[24px] pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3 min-w-0">
            <Link
              href="/admin/crm/mohan-rag"
              className="w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white active:scale-95 transition-all flex items-center justify-center border border-white/30 shadow-sm shrink-0 cursor-pointer"
              title="Back to Mohan RAG"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-100">Mohan RAG Studio</span>
                <span className="px-2 py-0.5 bg-white/20 text-white rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-xs border border-white/30">
                  Knowledge Hub
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate flex items-center gap-2 drop-shadow-sm mt-0.5">
                <span>RAG Management & Knowledge Center</span>
              </h1>
              <p className="text-[11px] text-amber-100/90 font-medium truncate mt-0.5">
                Multi-level syllabus modules • Approved teaching corpus • Digital twin connection
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 shrink-0">
            <Link
              href="/admin/crm/mohan-rag/avatar-studio"
              className="px-3.5 py-2 rounded-xl text-xs font-black text-white bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Avatar Studio</span>
            </Link>
            <Link
              href="/admin/crm/mohan-rag"
              className="px-3.5 py-2 rounded-xl text-xs font-black text-slate-900 bg-white hover:bg-amber-50 shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Hub</span>
            </Link>
          </div>
        </div>

        <div className="grid min-h-[70vh] grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto">
            {navGroups.map(group => (
              <div key={group.title} className="mb-5 last:mb-1">
                <h2 className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 flex items-center justify-between">
                  <span>{group.title}</span>
                </h2>
                <nav aria-label={group.title} className="space-y-1 bg-transparent">
                  {group.items.map((item, index) => {
                    const Icon = item.icon;
                    const selected = active === item.id;
                    const navTones = ['sky', 'emerald', 'amber', 'purple', 'teal', 'rose'];
                    const currentTone = navTones[index % navTones.length];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActive(item.id)}
                        aria-current={selected ? 'page' : undefined}
                        data-nav-tone={currentTone}
                        className={`mb-1.5 flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-bold transition-all duration-200 cursor-pointer ${
                          selected
                            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-700/25 ring-1 ring-emerald-500 scale-[1.01]'
                            : 'text-slate-700 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/60 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${selected ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200 shadow-xs'}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {selected && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </aside>

          <main className="min-w-0 space-y-6 rounded-2xl border border-slate-200/90 bg-white p-5 md:p-7 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>RAG Management</span>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                  <span className="text-emerald-700 font-extrabold">{current.label}</span>
                </div>
                <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 tracking-tight">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20">
                    <CurrentIcon className="h-5 w-5" />
                  </div>
                  <span>{current.label}</span>
                </h2>
                <p className="mt-1.5 max-w-3xl text-sm text-slate-600 leading-relaxed font-normal">{sectionSubtitle(active)}</p>
              </div>
              <StatusPill muted>System Operational • Active Admin Session</StatusPill>
            </div>

            {active === 'overview' && <Overview onSelect={setActive} />}
            {active === 'library' && <Library token={authToken} />}
            {currentModule && active !== 'research' && <KnowledgeModulePanel module={currentModule} token={authToken} />}
            {active === 'research' && <ResearchDetails token={authToken} />}
            {active === 'ingestion' && <IngestionDetails token={authToken} />}
            {active === 'search' && <SearchDetails token={authToken} />}
            {active === 'instructions' && <InstructionDetails />}
            {active === 'avatar' && <AvatarDetails token={authToken} />}
            {active === 'connection' && <ConnectionDetails />}
            {active === 'analytics' && <AnalyticsDetails />}
            {active === 'settings' && <SettingsDetails />}
          </main>
        </div>
      </div>
    </div>
  );
}

function sectionSubtitle(id: SectionId) {
  const descriptions: Record<SectionId, string> = {
    overview: 'Workspace status and the six independent knowledge areas.',
    library: 'Browse the six knowledge libraries, explore topics, and inspect source text with or without avatar delivery cues.',
    why: 'Motivation and awareness content with a strict no-practical-instructions boundary.',
    level1: 'Manage the approved Level 1 corpus and its access boundary.',
    level2: 'Manage Level 1 and Level 2 knowledge for eligible learners.',
    level3: 'Manage the approved advanced corpus and inherited learning levels.',
    general: 'Separate approved general education from Swar Yoga teachings.',
    research: 'Collect cited research into drafts for human review before publication.',
    ingestion: 'Track source files, transcripts, processing and approval as one traceable flow.',
    search: 'Inspect retrieval sources and permission behavior before answers are released.',
    instructions: 'Set shared answer principles while retaining independent module rules.',
    avatar: 'Manage the authorized digital clone through the existing Avatar Studio.',
    connection: 'Connect validated, permission-checked RAG answers to your clone’s voice and video.',
    analytics: 'View measured system and quality metrics when their data source is connected.',
    settings: 'Configure processing and access controls after the underlying services are selected.',
  };
  return descriptions[id];
}

function Overview({ onSelect }: { onSelect: (id: SectionId) => void }) {
  // 6 Distinct Vibrant Card Themes matching Life Planner Calendar Pattern
  const cardThemes = [
    {
      tone: 'sky',
      badge: 'Motivation',
      badgeColor: 'text-sky-700 bg-sky-50 border-sky-200/80',
      iconBg: 'from-sky-400 via-blue-500 to-indigo-600',
      shadow: 'shadow-sky-500/20',
      iconEmoji: '🌟',
      borderHover: 'hover:border-sky-400',
      linkText: 'text-sky-600',
    },
    {
      tone: 'emerald',
      badge: 'Foundations',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
      iconBg: 'from-emerald-400 via-teal-500 to-green-600',
      shadow: 'shadow-emerald-500/20',
      iconEmoji: '🌱',
      borderHover: 'hover:border-emerald-400',
      linkText: 'text-emerald-600',
    },
    {
      tone: 'amber',
      badge: 'Intermediate',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200/80',
      iconBg: 'from-amber-400 via-orange-500 to-amber-600',
      shadow: 'shadow-amber-500/20',
      iconEmoji: '🔥',
      borderHover: 'hover:border-amber-400',
      linkText: 'text-amber-600',
    },
    {
      tone: 'purple',
      badge: 'Mastery',
      badgeColor: 'text-purple-700 bg-purple-50 border-purple-200/80',
      iconBg: 'from-purple-500 via-fuchsia-600 to-pink-600',
      shadow: 'shadow-purple-500/20',
      iconEmoji: '👑',
      borderHover: 'hover:border-purple-400',
      linkText: 'text-purple-600',
    },
    {
      tone: 'teal',
      badge: 'Education',
      badgeColor: 'text-teal-700 bg-teal-50 border-teal-200/80',
      iconBg: 'from-teal-400 via-cyan-500 to-blue-500',
      shadow: 'shadow-teal-500/20',
      iconEmoji: '🌐',
      borderHover: 'hover:border-teal-400',
      linkText: 'text-teal-600',
    },
    {
      tone: 'rose',
      badge: 'Science',
      badgeColor: 'text-rose-700 bg-rose-50 border-rose-200/80',
      iconBg: 'from-rose-400 via-pink-500 to-red-600',
      shadow: 'shadow-rose-500/20',
      iconEmoji: '🔬',
      borderHover: 'hover:border-rose-400',
      linkText: 'text-rose-600',
    },
  ];

  const statMetrics = [
    { label: 'Knowledge Modules', value: '6 Live Syllabus Units', icon: BookOpen, gradient: 'from-sky-500 to-blue-600', tag: 'Syllabus' },
    { label: 'Research Approval', value: 'Manual Admin Review', icon: ShieldCheck, gradient: 'from-emerald-500 to-teal-600', tag: 'Governance' },
    { label: 'Teaching Languages', value: 'Hindi • Marathi • English', icon: Languages, gradient: 'from-amber-500 to-orange-600', tag: 'Multi-Lingual' },
    { label: 'Storage Infrastructure', value: 'Bunny Edge SQL & Storage', icon: HardDrive, gradient: 'from-purple-500 to-indigo-600', tag: 'Ultra-Fast' },
  ];

  return (
    <div className="space-y-6">
      <NotConnected>
        Text sources, syllabus draft reviews, admin approval flows, grounded answer simulations, and clone link-ups are fully active. All assets are safely stored in Bunny Storage and Bunny Edge SQL.
      </NotConnected>

      {/* 4 Stat Cards with High-End 3D Glossy Elevation */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statMetrics.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-[22px] bg-gradient-to-b from-white via-white to-slate-50/90 p-5 border-2 border-slate-200/80 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.15),0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,1)] hover:-translate-y-1.5 hover:border-emerald-300 transition-all duration-300 cursor-default"
            >
              {/* Specular Top-Light Gloss Highlight */}
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/70 via-white/20 to-transparent rounded-t-[22px] pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between mb-4">
                {/* 3D Elevated Squircle Icon Orb */}
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${stat.gradient} flex items-center justify-center text-white shadow-[0_6px_16px_rgba(0,0,0,0.18),inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.15)] border border-white/30 group-hover:scale-110 group-hover:rotate-1 transition-all duration-300`}
                >
                  <Icon className="w-5 h-5 drop-shadow-sm" />
                </div>
                {/* 3D Elevated Badge */}
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 bg-white border border-slate-200 shadow-[0_2px_6px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] px-2.5 py-1 rounded-full">
                  {stat.tag}
                </span>
              </div>
              <div className="relative z-10 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
              <div className="relative z-10 mt-1 text-base font-black text-slate-900 tracking-tight drop-shadow-xs">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Modules Grid - Life Planner Calendar 4-Card Expansion Style */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span className="text-lg">📚</span>
              <span>Syllabus Modules & Knowledge Streams</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Click any module to inspect its sources, approve drafts, or generate e-book chapters</p>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            {modules.length + 1} Managed Units
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module, index) => {
            const theme = cardThemes[index % cardThemes.length];
            return (
              <button
                key={module.id}
                onClick={() => onSelect(module.id)}
                className="w-full text-left rounded-[24px] border-2 border-sky-400 bg-white p-5 sm:p-6 select-none group cursor-pointer shadow-[0_12px_28px_-6px_rgba(2,132,199,0.22),0_4px_10px_-2px_rgba(0,0,0,0.04),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-3px_6px_rgba(2,132,199,0.06)] hover:shadow-[0_22px_40px_-8px_rgba(2,132,199,0.32),0_6px_14px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,1)] hover:border-sky-500 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden"
              >
                {/* 3D Specular Top Gloss Highlight */}
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-sky-100/40 via-white/20 to-transparent pointer-events-none rounded-t-[24px]" />

                <div className="flex items-center justify-between mb-4 relative z-10">
                  {/* 3D Glossy Icon Orb */}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${theme.iconBg} flex items-center justify-center text-white shadow-[0_6px_14px_rgba(0,0,0,0.16),inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.15)] group-hover:scale-110 group-hover:rotate-1 transition-all duration-300 border border-white/50`}>
                    <span className="text-xl drop-shadow-xs">{theme.iconEmoji}</span>
                  </div>
                  {/* 3D Elevated Pill Badge with Blue Border */}
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-sky-50 text-sky-950 border border-sky-200/90 shadow-[0_2px_6px_rgba(2,132,199,0.08),inset_0_1px_2px_rgba(255,255,255,0.9)] px-3 py-1 rounded-full">
                    {theme.badge}
                  </span>
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-sky-600 transition-colors flex items-center gap-2 tracking-tight">
                    <span>{module.title}</span>
                    <ArrowRight className="w-4 h-4 text-sky-500 transition-transform duration-200 group-hover:translate-x-1.5" />
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-normal mt-2 leading-relaxed line-clamp-2">
                    {module.purpose}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-sky-100 flex items-center justify-between text-xs font-bold text-slate-700 relative z-10">
                  <span className="text-[11px] text-slate-500 font-semibold">{module.access}</span>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(2,132,199,0.35),inset_0_1px_1px_rgba(255,255,255,0.5)] group-hover:from-sky-600 group-hover:to-indigo-700 transition-all font-black text-xs active:scale-95">
                    <span>Open Module</span>
                    <span>→</span>
                  </span>
                </div>
              </button>
            );
          })}

          {/* AI Avatar My Clone Card */}
          <button
            onClick={() => onSelect('avatar')}
            className="w-full text-left rounded-[24px] border-2 border-indigo-400 bg-white p-5 sm:p-6 select-none group cursor-pointer shadow-[0_12px_28px_-6px_rgba(79,70,229,0.22),0_4px_10px_-2px_rgba(0,0,0,0.04),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-3px_6px_rgba(79,70,229,0.06)] hover:shadow-[0_22px_40px_-8px_rgba(79,70,229,0.32),0_6px_14px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,1)] hover:border-indigo-500 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden"
          >
            {/* 3D Specular Top Gloss Highlight */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-indigo-100/40 via-white/20 to-transparent pointer-events-none rounded-t-[24px]" />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-600 to-fuchsia-600 flex items-center justify-center text-white shadow-[0_6px_14px_rgba(0,0,0,0.16),inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.15)] group-hover:scale-110 group-hover:rotate-1 transition-all duration-300 border border-white/50">
                <span className="text-xl drop-shadow-xs">✨</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-950 border border-indigo-200/90 shadow-[0_2px_6px_rgba(79,70,229,0.08),inset_0_1px_2px_rgba(255,255,255,0.9)] px-3 py-1 rounded-full">
                Digital Clone
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2 tracking-tight">
                <span>AI Avatar — My Clone</span>
                <ArrowRight className="w-4 h-4 text-indigo-500 transition-transform duration-200 group-hover:translate-x-1.5" />
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-normal mt-2 leading-relaxed line-clamp-2">
                Connect approved, cited RAG answers to Mohan Sir's authorized video clone and synchronized voice.
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-indigo-100 flex items-center justify-between text-xs font-bold text-slate-700 relative z-10">
              <span className="text-[11px] text-slate-500 font-semibold">Digital Human Studio</span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(2,132,199,0.35),inset_0_1px_1px_rgba(255,255,255,0.5)] group-hover:from-sky-600 group-hover:to-indigo-700 transition-all font-black text-xs active:scale-95">
                <span>Configure Clone</span>
                <span>→</span>
              </span>
            </div>
          </button>
        </div>
      </div>

      <DetailCard title="Authorized Answer Delivery Chain" icon={Network}>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold text-slate-700">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">Learner Question</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200">Module Permission</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">Approved Retrieval</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">Cited Answer</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">Mohan Clone Voice</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">Bunny Storage MP4</span>
        </div>
      </DetailCard>
    </div>
  );
}

type KnowledgeSourceView = {
  id: string;
  moduleId: string;
  title: string;
  content?: string;
  topic: string;
  language: string;
  sourceType: string;
  sourceReference: string;
  originalFileName?: string;
  originalFileUrl?: string;
  extractionType?: string;
  status: 'draft' | 'approved' | 'rejected';
  createdBy: string;
  reviewedBy: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  chunkCount?: number;
};

function Library({ token }: { token: string | null }) {
  const [sources, setSources] = useState<KnowledgeSourceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [moduleId, setModuleId] = useState<MohanRagModule | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [source, setSource] = useState<KnowledgeSourceView | null>(null);
  const [view, setView] = useState<'plain' | 'cues'>('plain');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all(modules.map(async module => {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge?module=${module.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || `Could not load ${module.title}`);
      return Array.isArray(data.sources) ? data.sources as KnowledgeSourceView[] : [];
    })).then(groups => {
      if (!cancelled) setSources(groups.flat());
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load the knowledge library');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  const activeModule = modules.find(item => item.id === moduleId);
  const moduleSources = sources.filter(item => item.moduleId === moduleId);
  const topics = Array.from(new Set(moduleSources.map(item => item.topic.trim() || 'Uncategorized'))).sort((a, b) => a.localeCompare(b));
  const topicSources = moduleSources.filter(item => (item.topic.trim() || 'Uncategorized') === topic);
  const detailedSource = source ? { ...source, content: source.content || '' } : null;
  const parsed = detailedSource ? parseAvatarScript(detailedSource.content) : null;
  const plainText = detailedSource?.content.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '') || '';
  const hasCues = Boolean(detailedSource?.content.match(/\[(?:[a-z_]+:\d{1,3}|face:[a-z_]+)\]/i));

  const openSource = async (item: KnowledgeSourceView) => {
    if (!token) return;
    setError('');
    setSource({ ...item, content: '' });
    setView('plain');
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not load source text');
      setSource(data.source as KnowledgeSourceView);
    } catch (cause) {
      setSource(null);
      setError(cause instanceof Error ? cause.message : 'Could not load source text');
    }
  };

  const clearSource = () => setSource(null);
  const toneFor = (index: number) => ['green', 'lavender', 'yellow', 'blue', 'teal', 'rose'][index % 6];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-violet-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Knowledge Library</p><h3 className="mt-1 text-lg font-semibold text-slate-900">Browse your source material</h3><p className="mt-1 text-sm text-slate-600">Choose a library, open a topic, then inspect the saved text or avatar cues.</p></div>
          {(moduleId || topic || source) && <button type="button" onClick={() => { setModuleId(null); setTopic(null); setSource(null); }} className="rounded-lg px-3 py-2 text-sm font-semibold">All six libraries</button>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>Library</span>{activeModule && <><ChevronRight className="h-3 w-3" /><button type="button" onClick={() => { setTopic(null); setSource(null); }} className="rounded-md px-2 py-1 text-xs">{activeModule.title}</button></>}{topic && <><ChevronRight className="h-3 w-3" /><button type="button" onClick={clearSource} className="rounded-md px-2 py-1 text-xs">{topic}</button></>}{source && <><ChevronRight className="h-3 w-3" /><span className="font-medium text-slate-700">{source.title}</span></>}</div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {loading && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading library contents…</p>}

      {!moduleId && !loading && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{modules.map((item, index) => {
        const count = sources.filter(sourceItem => sourceItem.moduleId === item.id).length;
        return <button key={item.id} type="button" data-tone={toneFor(index)} onClick={() => { setModuleId(item.id); setTopic(null); setSource(null); }} className="mohan-rag-overview-card group min-h-36 rounded-2xl p-5 text-left transition"><div className="flex items-start justify-between gap-2"><h4 className="font-semibold text-slate-900">{item.title}</h4><span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700">{count} {count === 1 ? 'source' : 'sources'}</span></div><p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{item.purpose}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">Browse topics <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span></button>;
      })}</div>}

      {activeModule && !topic && !loading && <section className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">Topics in {activeModule.title}</h3><p className="text-sm text-slate-500">{moduleSources.length} saved sources · topics are based on source metadata.</p></div><button type="button" onClick={() => setModuleId(null)} className="rounded-lg px-3 py-2 text-sm font-semibold">All libraries</button></div>{topics.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{topics.map((item, index) => {const count = moduleSources.filter(sourceItem => (sourceItem.topic.trim() || 'Uncategorized') === item).length; return <button key={item} type="button" data-tone={toneFor(index)} onClick={() => setTopic(item)} className="mohan-rag-overview-card group rounded-2xl p-4 text-left transition"><div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-slate-900">{item}</h4><span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600">{count}</span></div><p className="mt-2 text-xs text-slate-600">Open sources in this topic</p></button>;})}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No sources have been added to this library yet.</div>}</section>}

      {activeModule && topic && !source && !loading && <section className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">Sources · {topic}</h3><p className="text-sm text-slate-500">Select a source to inspect its full text.</p></div><button type="button" onClick={() => setTopic(null)} className="rounded-lg px-3 py-2 text-sm font-semibold">All topics</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{topicSources.map((item, index) => <button key={item.id} type="button" data-tone={toneFor(index)} onClick={() => openSource(item)} className="mohan-rag-overview-card group rounded-2xl p-4 text-left transition"><div className="flex items-start justify-between gap-2"><h4 className="font-semibold text-slate-900">{item.title}</h4><StatusPill muted>{item.status}</StatusPill></div><p className="mt-2 text-xs text-slate-600">{item.originalFileName || 'Text source'} · {item.language.toUpperCase()}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">View text <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span></button>)}</div></section>}

      {detailedSource && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-violet-50 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{activeModule?.title} · {topic}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{detailedSource.title}</h3><p className="mt-1 text-xs text-slate-500">{detailedSource.originalFileName || 'Text source'} · {detailedSource.status} · {detailedSource.language.toUpperCase()}</p></div><button type="button" onClick={clearSource} className="rounded-lg px-3 py-2 text-sm font-semibold">Back to sources</button></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" aria-pressed={view === 'plain'} onClick={() => setView('plain')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === 'plain' ? 'ring-2 ring-emerald-300' : ''}`}>Plain text</button><button type="button" aria-pressed={view === 'cues'} onClick={() => setView('cues')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === 'cues' ? 'ring-2 ring-violet-300' : ''}`}>Emotion & face cues</button></div></div>
          {view === 'plain' ? <pre lang={detailedSource.language === 'auto' ? undefined : detailedSource.language} className={`max-h-[65vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-7 text-slate-800 ${devanagariFontClass(plainText, detailedSource.language)}`}>{plainText || 'Loading source text…'}</pre> : <div className="space-y-3 p-5">{hasCues ? <><p className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs leading-5 text-violet-900">Cue tags are suggestions inferred from transcript wording. They do not represent measured facial observations from video frames.</p>{parsed?.segments.map(segment => <article key={`${segment.index}-${segment.rawText.slice(0, 24)}`} className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-2 flex flex-wrap gap-2">{segment.emotions.filter(cue => cue.tag !== 'face').map((cue, index) => <span key={`${cue.tag}-${index}`} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{cue.name} · {cue.intensity}%</span>)}{segment.facialExpression && <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900">Face · {segment.facialExpression.replace(/_/g, ' ')}</span>}</div><p lang={detailedSource.language === 'auto' ? undefined : detailedSource.language} className={`whitespace-pre-wrap text-sm leading-6 text-slate-800 ${devanagariFontClass(segment.cleanText, detailedSource.language)}`}>{segment.cleanText}</p></article>)}</> : <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/60 p-8 text-center"><p className="font-semibold text-slate-800">No emotion or face tags in this source</p><p className="mt-1 text-sm text-slate-600">Tags are added to MP3/MP4 transcripts when annotation succeeds. Plain text sources remain untagged unless cues are added manually.</p></div>}</div>}
        </section>}
    </div>
  );
}

function KnowledgeModulePanel({ module, token }: { module: typeof modules[number]; token: string | null }) {
  const [sources, setSources] = useState<KnowledgeSourceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [language, setLanguage] = useState('auto');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [previewId, setPreviewId] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [ebookSourceLanguage, setEbookSourceLanguage] = useState('hi');
  const [ebookTargetLanguage, setEbookTargetLanguage] = useState('hi');
  const [ebookBusyId, setEbookBusyId] = useState('');
  const [ebookDraft, setEbookDraft] = useState<{ sourceId: string; title: string; language: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSources = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const query = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge?module=${module.id}${query}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not load sources');
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSources(); }, [module.id, statusFilter, token]);

  const importSourceFile = async (file?: File) => {
    if (!file || !token) return;
    if (file.size > 150 * 1024 * 1024) { setImportError('Source files must be smaller than 150 MB.'); return; }
    if (module.id === 'research' && !sourceReference.trim()) {
      setImportError('Enter the research source citation or URL before importing.');
      return;
    }
    setImporting(true); setImportError(''); setImportMessage('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let audioFile: File | null = null;
      if (extension === 'mp4' || (extension === 'mp3' && file.size > 24 * 1024 * 1024)) {
        setImportMessage('Converting audio in your browser before transcription…');
        audioFile = await compressAudioForWhisper(file, file.name);
      }
      const form = new FormData();
      form.append('file', file);
      if (audioFile) form.append('audioFile', audioFile);
      form.append('moduleId', module.id);
      form.append('title', title.trim() || file.name.replace(/\.[^.]+$/, ''));
      form.append('topic', topic);
      form.append('language', language);
      form.append('sourceReference', sourceReference);
      setImportMessage('Extracting text, saving the original to Bunny Storage, and creating a review draft…');
      const response = await fetch('/api/admin/crm/mohan-rag/import', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not import source');
      const imported = data.source as KnowledgeSourceView | null;
      if (!imported || typeof imported.id !== 'string' || !imported.id) {
        await loadSources();
        throw new Error('The file was processed, but the server did not return its saved source record. Check the Library before uploading it again.');
      }
      setEditingId(imported.id); setTitle(imported.title); setContent(imported.content || ''); setTopic(imported.topic || ''); setSourceReference(imported.sourceReference || ''); setLanguage(imported.language || 'auto');
      const cueNote = data.avatarCuesAdded ? ' Avatar emotion and face-expression suggestions were added for the clone; these are transcript-based suggestions, not measured facial observations.' : data.avatarCueWarning ? ` ${data.avatarCueWarning}` : '';
      setImportMessage(`${data.extractedCharacters.toLocaleString()} characters extracted.${cueNote} Review the text below, then save corrections and approve it for retrieval.`);
      await loadSources();
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : 'Could not import source');
      setImportMessage('');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePreview = async (source: KnowledgeSourceView) => {
    if (previewId === source.id) { setPreviewId(''); setPreviewText(''); return; }
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${source.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load extracted text');
      setPreviewId(source.id); setPreviewText(data.source.content || 'No extracted text is stored for this source.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load extracted text'); }
  };

  const createEbookDraft = async (source: KnowledgeSourceView) => {
    if (!token) return;
    setEbookBusyId(source.id); setError(''); setNotice(''); setEbookDraft(null);
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${source.id}/ebook`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceLanguage: source.language !== 'auto' ? source.language : ebookSourceLanguage, targetLanguage: ebookTargetLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create e-book chapter');
      setEbookDraft({ sourceId: source.id, title: data.sourceTitle, language: data.draft.language, content: data.draft.content });
      setNotice('E-book chapter draft created and saved. Review it before publishing.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create e-book chapter'); }
    finally { setEbookBusyId(''); }
  };

  const viewSavedEbookDraft = async (source: KnowledgeSourceView) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${source.id}/ebook`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load e-book drafts');
      const latest = data.drafts?.[0];
      if (!latest) { setNotice('No saved e-book chapter for this source yet.'); return; }
      setEbookDraft({ sourceId: source.id, title: source.title, language: latest.language, content: latest.content });
      setNotice(`Loaded saved ${latest.language.toUpperCase()} e-book chapter draft.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load e-book drafts'); }
  };

  const downloadEbookDraft = () => {
    if (!ebookDraft) return;
    const blob = new Blob([`# ${ebookDraft.title}\n\n${ebookDraft.content}\n`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${ebookDraft.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-${ebookDraft.language}.md`;
    anchor.click(); URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setEditingId(''); setTitle(''); setContent(''); setTopic(''); setSourceReference(''); setLanguage('auto');
  };

  const saveSource = async () => {
    if (!token || !title.trim() || !content.trim()) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(editingId ? `/api/admin/crm/mohan-rag/knowledge/${editingId}` : '/api/admin/crm/mohan-rag/knowledge', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: module.id, title, content, topic, sourceReference, language }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save source');
      setNotice(editingId ? 'Saved as a draft. Re-approve after reviewing the changes.' : 'Source saved as a draft. Review and approve it before it can be retrieved.');
      resetForm();
      await loadSources();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save source');
    } finally {
      setSaving(false);
    }
  };

  const sourceAction = async (source: KnowledgeSourceView, action: 'approved' | 'rejected' | 'delete' | 'edit') => {
    if (!token) return;
    setError(''); setNotice('');
    try {
      if (action === 'edit') {
        const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${source.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not open source');
        setEditingId(source.id); setTitle(data.source.title); setContent(data.source.content); setTopic(data.source.topic); setSourceReference(data.source.sourceReference || ''); setLanguage(data.source.language);
        return;
      }
      if (action === 'delete' && !window.confirm(`Delete “${source.title}” and its indexed chunks?`)) return;
      const response = action === 'delete'
        ? await fetch(`/api/admin/crm/mohan-rag/knowledge/${source.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        : await fetch(`/api/admin/crm/mohan-rag/knowledge/${source.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action failed');
      setNotice(action === 'delete' ? 'Source deleted.' : `Source ${action}.`);
      await loadSources();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-2">
        <DetailCard title="Purpose" icon={CircleHelp}>{module.purpose}</DetailCard>
        <DetailCard title="Retrieval access" icon={LockKeyhole}>{module.access}</DetailCard>
        <DetailCard title="Teaching boundary" icon={ShieldCheck}>{module.boundary}</DetailCard>
        <DetailCard title="Approval rule" icon={FileText}>New and edited text sources are saved as drafts. Only an explicit admin approval makes a source eligible for this module’s grounded answer preview.</DetailCard>
      </div>
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Add or import a source</h3><p className="mt-1 text-xs text-slate-500">Add text, or extract text from PDF and DOCX. Transcribe speech from MP3 and MP4. All new content starts as a review draft.</p></div><StatusPill muted>Text + file sources</StatusPill></div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-indigo-50/90 p-5 shadow-xs">
          <div><h4 className="flex items-center gap-2 text-sm font-semibold text-violet-900"><FileAudio className="h-4 w-4" />Import a source file</h4><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">PDF and DOCX text is extracted. MP3 and MP4 speech is transcribed and tagged with suggested avatar emotions and face expressions. Those cues are inferred from transcript wording, not measured from video frames. Originals are stored in Bunny Storage; scanned PDFs need OCR first.</p></div>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.mp3,.mp4,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,audio/mpeg,video/mp4" className="hidden" onChange={event => importSourceFile(event.target.files?.[0])} />
          <button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/25 transition hover:from-indigo-700 hover:to-purple-700 active:scale-95 disabled:opacity-50 cursor-pointer"><Upload className="h-4 w-4" />{importing ? 'Importing…' : 'Choose PDF, Word, MP3 or MP4'}</button>
        </div>
        {(importMessage || importError) && <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${importError ? 'bg-red-500/10 text-red-700' : 'bg-violet-50 text-violet-900'}`}>{importError || importMessage}</p>}
        {editingId && <div className="mb-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs text-yellow-900"><span>Editing source — save will return it to draft review.</span><button type="button" onClick={resetForm} className="underline">Cancel edit</button></div>}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-700">Source title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={300} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-yellow-400/50" placeholder="Lesson, transcript, or teaching title" /></label>
          <label className="text-xs text-slate-700">Topic<input value={topic} onChange={event => setTopic(event.target.value)} maxLength={300} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-yellow-400/50" placeholder="Topic or syllabus section" /></label>
          <label className="text-xs text-slate-700">Language<select value={language} onChange={event => setLanguage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="auto">Auto / mixed</option><option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option></select></label>
          <label className="text-xs text-slate-700">Source reference<input value={sourceReference} onChange={event => setSourceReference(event.target.value)} maxLength={1000} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="Lesson URL, recording ID, book page, or citation" /></label>
          <label className="text-xs text-slate-700 md:col-span-2">Approved teaching text<textarea lang={language === 'auto' ? undefined : language} value={content} onChange={event => setContent(event.target.value)} rows={8} maxLength={180_000} className={`mt-1.5 w-full resize-y rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus:border-yellow-400/50 ${devanagariFontClass(content, language)}`} placeholder="Paste or write the source material. Keep source-specific teachings together." /></label>
        </div>
        {(error || notice) && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${error ? 'bg-red-500/10 text-red-700' : 'bg-emerald-500/10 text-emerald-700'}`}>{error || notice}</p>}
        <div className="mt-3 flex justify-end"><button type="button" disabled={saving || !title.trim() || !content.trim()} onClick={saveSource} className="rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-700/25 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">{saving ? 'Saving…' : editingId ? 'Save draft changes' : 'Save as draft'}</button></div>
      </section>
      <section className="rounded-2xl border border-emerald-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-semibold text-slate-900">Source library · {module.title}</h3><p className="mt-1 text-xs text-slate-500">Inspect original files and extracted text. Only approved sources are searchable; editing approved text returns it to draft review.</p></div>
          <div className="flex flex-wrap items-center gap-2"><label className="text-[11px] text-slate-500">E-book from<select value={ebookSourceLanguage} onChange={event => setEbookSourceLanguage(event.target.value)} className="ml-1 rounded-lg border border-emerald-200 bg-white px-2 py-2 text-xs text-slate-900"><option value="hi">Hindi</option><option value="en">English</option><option value="mr">Marathi</option></select></label><label className="text-[11px] text-slate-500">to<select value={ebookTargetLanguage} onChange={event => setEbookTargetLanguage(event.target.value)} className="ml-1 rounded-lg border border-emerald-200 bg-white px-2 py-2 text-xs text-slate-900"><option value="hi">Hindi</option><option value="en">English</option><option value="mr">Marathi</option></select></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-xs text-slate-700"><option value="all">All statuses</option><option value="draft">Draft</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><button onClick={loadSources} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs text-slate-700 hover:text-slate-900">Refresh</button></div>
        </div>
        {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading sources…</p> : !sources.length ? <p className="rounded-xl border border-dashed border-emerald-200 px-4 py-8 text-center text-sm text-slate-500">No sources in this library yet.</p> : <div className="space-y-2">{sources.map(source => <article key={source.id} className="rounded-xl border border-emerald-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium text-slate-900">{source.title}</h4><StatusPill muted>{source.status}</StatusPill></div><p className="mt-1 text-xs text-slate-500">{source.topic || 'No topic'} · {source.language} · {source.chunkCount || 0} chunks · {source.extractionType || 'text'} · Updated {new Date(source.updatedAt).toLocaleString()}</p>{source.originalFileName && <p className="mt-1 text-xs text-violet-800">Original: {source.originalFileName}</p>}{source.status === 'approved' && <p className="mt-1 text-[11px] text-emerald-700">Approved by {source.reviewedBy || 'admin'}{source.reviewedAt ? ` · ${new Date(source.reviewedAt).toLocaleString()}` : ''}</p>}</div>
            <div className="flex flex-wrap gap-2"><button onClick={() => togglePreview(source)} className="rounded-md border border-violet-200 px-2.5 py-1.5 text-xs text-violet-900 hover:bg-violet-50">{previewId === source.id ? 'Hide text' : 'View extracted text'}</button>{source.status === 'approved' && <><button disabled={ebookBusyId === source.id} onClick={() => createEbookDraft(source)} className="rounded-md border border-violet-200 px-2.5 py-1.5 text-xs text-violet-900 hover:bg-violet-50 disabled:opacity-50">{ebookBusyId === source.id ? 'Creating chapter…' : 'Create E-book chapter'}</button><button onClick={() => viewSavedEbookDraft(source)} className="rounded-md border border-violet-200 px-2.5 py-1.5 text-xs text-violet-800">View saved E-book</button></>}{source.originalFileUrl && <a href={source.originalFileUrl} target="_blank" rel="noreferrer" className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs text-slate-700">Open original</a>}<button onClick={() => sourceAction(source, 'edit')} className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900">Edit</button>{source.status !== 'approved' && <button onClick={() => sourceAction(source, 'approved')} className="rounded-md border border-emerald-300 px-2.5 py-1.5 text-xs text-emerald-800 hover:bg-emerald-900/30">Approve</button>}{source.status !== 'rejected' && <button onClick={() => sourceAction(source, 'rejected')} className="rounded-md border border-yellow-300 px-2.5 py-1.5 text-xs text-yellow-800 hover:bg-yellow-900/30">Reject</button>}<button onClick={() => sourceAction(source, 'delete')} className="rounded-md border border-red-900/70 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-950/40">Delete</button></div>
          </div>
          {previewId === source.id && <pre lang={source.language === 'auto' ? undefined : source.language} className={`mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-violet-200 bg-emerald-50 p-4 text-xs leading-6 text-slate-700 ${devanagariFontClass(previewText, source.language)}`}>{previewText}</pre>}
        </article>)}</div>}
        {ebookDraft && <section className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold text-violet-900">E-book chapter draft · {ebookDraft.title}</h4><p className="mt-1 text-xs text-violet-800">{ebookDraft.language.toUpperCase()} · Generated from an approved library source. Review before publishing.</p></div><button onClick={downloadEbookDraft} className="rounded-lg bg-violet-100 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100">Download Markdown</button></div><pre lang={ebookDraft.language} className={`max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-violet-200 bg-white p-4 text-xs leading-6 text-slate-700 ${devanagariFontClass(ebookDraft.content, ebookDraft.language)}`}>{ebookDraft.content}</pre></section>}
      </section>
      {module.id === 'general' && <Link className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-800 hover:text-yellow-900" href="/admin/crm/knowledge-base">Open existing FAQ Knowledge Base <ArrowRight className="h-4 w-4" /></Link>}
    </div>
  );
}

type ResearchReportSource = {
  id: string;
  title: string;
  content?: string;
  topic: string;
  language: string;
  sourceReference: string;
  originalFileName?: string;
  originalFileUrl?: string;
  extractionType?: string;
  status: 'draft' | 'approved' | 'rejected';
  updatedAt: string;
  chunkCount?: number;
};

function ResearchDetails({ token }: { token: string | null }) {
  const [reports, setReports] = useState<ResearchReportSource[]>([]);
  const [selected, setSelected] = useState<ResearchReportSource | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [language, setLanguage] = useState('en');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ebookSourceLanguage, setEbookSourceLanguage] = useState('en');
  const [ebookTargetLanguage, setEbookTargetLanguage] = useState('en');
  const [ebookBusyId, setEbookBusyId] = useState('');
  const [ebookDraft, setEbookDraft] = useState<{ sourceId: string; title: string; language: string; content: string } | null>(null);

  const loadReports = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/knowledge?module=research', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load research reports');
      setReports(Array.isArray(data.sources) ? data.sources : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load research reports');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadReports(); }, [token]);

  const importResearchFile = async (file?: File) => {
    if (!file || !token) return;
    if (file.size > 150 * 1024 * 1024) { setImportError('Source files must be smaller than 150 MB.'); return; }
    if (!sourceReference.trim()) {
      setImportError('Enter the research source citation or URL before importing.');
      return;
    }
    setImporting(true); setImportError(''); setImportMessage('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let audioFile: File | null = null;
      if (extension === 'mp4' || (extension === 'mp3' && file.size > 24 * 1024 * 1024)) {
        setImportMessage('Converting audio in your browser before transcription…');
        audioFile = await compressAudioForWhisper(file, file.name);
      }
      const form = new FormData();
      form.append('file', file);
      if (audioFile) form.append('audioFile', audioFile);
      form.append('moduleId', 'research');
      form.append('title', title.trim() || file.name.replace(/\.[^.]+$/, ''));
      form.append('topic', topic);
      form.append('language', language);
      form.append('sourceReference', sourceReference);
      const response = await fetch('/api/admin/crm/mohan-rag/import', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not import research source');
      const imported = data.source as ResearchReportSource | null;
      if (!imported || typeof imported.id !== 'string' || !imported.id) {
        await loadReports();
        throw new Error('The file was processed, but the server did not return its saved research record. Refresh the research list before uploading it again.');
      }
      setSelected(imported); setTitle(imported.title); setTopic(imported.topic || ''); setSourceReference(imported.sourceReference || ''); setLanguage(imported.language || 'en'); setContent(imported.content || '');
      const cueNote = data.avatarCuesAdded ? ' Avatar delivery and face-expression suggestions were added from transcript wording, not measured from video frames.' : data.avatarCueWarning ? ` ${data.avatarCueWarning}` : '';
      setImportMessage(`${data.extractedCharacters.toLocaleString()} characters extracted.${cueNote} Verify the citation and review the text before approval.`);
      await loadReports();
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : 'Could not import research source');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const createResearchEbookDraft = async (report: ResearchReportSource) => {
    if (!token) return;
    setEbookBusyId(report.id); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${report.id}/ebook`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceLanguage: report.language !== 'auto' ? report.language : ebookSourceLanguage, targetLanguage: ebookTargetLanguage }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create e-book chapter');
      setEbookDraft({ sourceId: report.id, title: data.sourceTitle, language: data.draft.language, content: data.draft.content });
      setNotice('E-book chapter draft created and saved. Review it before publishing.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create e-book chapter'); }
    finally { setEbookBusyId(''); }
  };

  const viewResearchEbookDraft = async (report: ResearchReportSource) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${report.id}/ebook`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load e-book drafts');
      const latest = data.drafts?.[0];
      if (!latest) { setNotice('No saved e-book chapter for this report yet.'); return; }
      setEbookDraft({ sourceId: report.id, title: report.title, language: latest.language, content: latest.content });
      setNotice(`Loaded saved ${latest.language.toUpperCase()} e-book chapter draft.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load e-book drafts'); }
  };

  const clearForm = () => { setSelected(null); setTitle(''); setTopic(''); setSourceReference(''); setLanguage('en'); setContent(''); };

  const openReport = async (report: ResearchReportSource) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${report.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not open report');
      setSelected(report); setTitle(data.source.title); setTopic(data.source.topic); setSourceReference(data.source.sourceReference); setLanguage(data.source.language); setContent(data.source.content);
      setError(''); setNotice('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open report'); }
  };

  const saveReport = async () => {
    if (!token || !title.trim() || !topic.trim() || !content.trim()) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(selected ? `/api/admin/crm/mohan-rag/knowledge/${selected.id}` : '/api/admin/crm/mohan-rag/knowledge', {
        method: selected ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: 'research', title, topic, sourceReference, language, content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save research report');
      setNotice(selected ? 'Report changes saved as a draft. Review and approve again before retrieval.' : 'Research report saved as a draft. It is not searchable until approved.');
      clearForm(); await loadReports();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save research report'); }
    finally { setSaving(false); }
  };

  const reportAction = async (report: ResearchReportSource, action: 'approved' | 'rejected' | 'delete') => {
    if (!token) return;
    if (action === 'delete' && !window.confirm(`Delete research report “${report.title}”?`)) return;
    try {
      const response = action === 'delete'
        ? await fetch(`/api/admin/crm/mohan-rag/knowledge/${report.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        : await fetch(`/api/admin/crm/mohan-rag/knowledge/${report.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Research review action failed');
      setNotice(action === 'delete' ? 'Report deleted.' : `Report ${action}.`); await loadReports();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Research review action failed'); }
  };

  return <div className="space-y-5">
    <NotConnected>Automatic web search and evidence grading are not connected. This page supports manually entered research drafts, source citations, and approval; drafts remain out of retrieval.</NotConnected>
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-200 bg-violet-50 p-4"><div><h3 className="flex items-center gap-2 text-sm font-semibold text-violet-900"><FileAudio className="h-4 w-4" />Import research source</h3><p className="mt-1 text-xs text-slate-600">PDF, DOCX, MP3 or MP4. Audio transcripts receive suggested avatar emotion and face-expression tags, inferred from transcript wording rather than video-frame analysis. Add a citation; imports stay drafts.</p></div><input ref={fileInputRef} type="file" accept=".pdf,.docx,.mp3,.mp4" className="hidden" onChange={event => importResearchFile(event.target.files?.[0])} /><button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-violet-100 px-4 py-2.5 text-sm font-semibold text-violet-900 ring-1 ring-inset ring-violet-200/25 disabled:opacity-50">{importing ? 'Importing…' : 'Choose source file'}</button>{(importMessage || importError) && <p className={`w-full rounded-lg px-3 py-2 text-sm ${importError ? 'bg-red-500/10 text-red-700' : 'bg-violet-50 text-violet-900'}`}>{importError || importMessage}</p>}</section>
    <div className="grid gap-4 xl:grid-cols-2"><DetailCard title="Research standards" icon={Globe2}>Record the source title, author, date, URL or DOI, research design, findings, limitations, and relevant references. Never create citations from memory.</DetailCard><DetailCard title="Keep evidence categories separate" icon={ShieldCheck}>Write established scientific findings, traditional Swar Yoga teachings, and possible connections or hypotheses in separate labeled sections. Do not present a traditional interpretation as scientifically proven.</DetailCard></div>
    <section className="rounded-2xl border border-emerald-200 bg-white p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{selected ? 'Edit research draft' : 'Add research draft'}</h3><p className="mt-1 text-xs text-slate-500">Editing an approved report returns it to draft review.</p></div>{selected && <button onClick={clearForm} className="text-xs text-slate-700 underline">Cancel edit</button>}</div><div className="grid gap-3 md:grid-cols-2"><label className="text-xs text-slate-700">Report title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={300} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="Research report title" /></label><label className="text-xs text-slate-700">Topic<input value={topic} onChange={event => setTopic(event.target.value)} maxLength={300} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="e.g. PCOD" /></label><label className="text-xs text-slate-700">Source citation<input value={sourceReference} onChange={event => setSourceReference(event.target.value)} maxLength={1000} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="Author · date · journal · DOI / URL" /></label><label className="text-xs text-slate-700">Report language<select value={language} onChange={event => setLanguage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option></select></label><label className="text-xs text-slate-700 md:col-span-2">Research report<textarea lang={language} value={content} onChange={event => setContent(event.target.value)} rows={10} maxLength={180_000} className={`mt-1.5 w-full resize-y rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 ${devanagariFontClass(content, language)}`} placeholder={`Definition and scope:\nEstablished scientific findings:\nResearch design and evidence quality:\nTraditional Swar Yoga perspective:\nPossible connections or hypotheses:\nLimitations and precautions:\nConclusion and references:`} /></label></div>{(error || notice) && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${error ? 'bg-red-500/10 text-red-700' : 'bg-emerald-500/10 text-emerald-700'}`}>{error || notice}</p>}<div className="mt-3 flex justify-end"><button onClick={saveReport} disabled={saving || !title.trim() || !topic.trim() || !content.trim()} className="rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-40">{saving ? 'Saving…' : selected ? 'Save draft changes' : 'Save as draft'}</button></div></section>
    <section className="rounded-2xl border border-emerald-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Research source library</h3><p className="mt-1 text-xs text-slate-500">Open extracted report text, review citations, and create E-book chapters from approved research.</p></div><div className="flex flex-wrap items-center gap-2"><select value={ebookSourceLanguage} onChange={event => setEbookSourceLanguage(event.target.value)} className="rounded-lg border border-emerald-200 bg-white px-2 py-2 text-xs text-slate-900"><option value="en">Source: English</option><option value="hi">Source: Hindi</option><option value="mr">Source: Marathi</option></select><select value={ebookTargetLanguage} onChange={event => setEbookTargetLanguage(event.target.value)} className="rounded-lg border border-emerald-200 bg-white px-2 py-2 text-xs text-slate-900"><option value="en">E-book: English</option><option value="hi">E-book: Hindi</option><option value="mr">E-book: Marathi</option></select><button onClick={loadReports} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs text-slate-700">Refresh</button></div></div>
      {loading ? <p className="py-6 text-center text-sm text-slate-500">Loading reports…</p> : !reports.length ? <p className="rounded-xl border border-dashed border-emerald-200 px-4 py-8 text-center text-sm text-slate-500">No research reports yet.</p> : <div className="space-y-2">{reports.map(report => <article key={report.id} className="rounded-xl border border-emerald-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium text-slate-900">{report.title}</h4><StatusPill muted>{report.status}</StatusPill></div><p className="mt-1 text-xs text-slate-500">{report.topic} · {report.language} · {report.chunkCount || 0} chunks · {report.extractionType || 'text'}{report.sourceReference ? ` · ${report.sourceReference}` : ''}</p>{report.originalFileName && <p className="mt-1 text-xs text-violet-800">Original: {report.originalFileName} {report.originalFileUrl && <a href={report.originalFileUrl} target="_blank" rel="noreferrer" className="underline">Open file</a>}</p>}</div><div className="flex flex-wrap gap-2"><button onClick={() => openReport(report)} className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs text-slate-700">Open / edit text</button>{report.status === 'approved' && <><button disabled={ebookBusyId === report.id} onClick={() => createResearchEbookDraft(report)} className="rounded-md border border-violet-200 px-2.5 py-1.5 text-xs text-violet-900 disabled:opacity-50">{ebookBusyId === report.id ? 'Creating…' : 'Create E-book chapter'}</button><button onClick={() => viewResearchEbookDraft(report)} className="rounded-md border border-violet-200 px-2.5 py-1.5 text-xs text-violet-800">View saved E-book</button></>}{report.status !== 'approved' && <button onClick={() => reportAction(report, 'approved')} className="rounded-md border border-emerald-300 px-2.5 py-1.5 text-xs text-emerald-800">Approve</button>}{report.status !== 'rejected' && <button onClick={() => reportAction(report, 'rejected')} className="rounded-md border border-yellow-300 px-2.5 py-1.5 text-xs text-yellow-800">Reject</button>}<button onClick={() => reportAction(report, 'delete')} className="rounded-md border border-red-900/70 px-2.5 py-1.5 text-xs text-red-700">Delete</button></div></div></article>)}</div>}
      {ebookDraft && <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold text-violet-900">E-book chapter draft · {ebookDraft.title}</h4><p className="mt-1 text-xs text-violet-800">{ebookDraft.language.toUpperCase()} · Review before publishing.</p></div><button onClick={() => { const blob = new Blob([`# ${ebookDraft.title}\n\n${ebookDraft.content}\n`], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${ebookDraft.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-${ebookDraft.language}.md`; anchor.click(); URL.revokeObjectURL(url); }} className="rounded-lg bg-violet-100 px-3 py-2 text-xs font-semibold text-violet-900">Download Markdown</button></div><pre lang={ebookDraft.language} className={`max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-violet-200 bg-white p-4 text-xs leading-6 text-slate-700 ${devanagariFontClass(ebookDraft.content, ebookDraft.language)}`}>{ebookDraft.content}</pre></div>}
    </section>
  </div>;
}
function IngestionDetails({ token }: { token: string | null }) {
  const [urls, setUrls] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [moduleId, setModuleId] = useState<MohanRagModule>('level1');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('auto');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadJobs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/ingestion', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not load the video queue');
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the video queue'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadJobs(); }, [token]);
  useEffect(() => {
    if (!token || !jobs.some(job => ['queued', 'processing'].includes(job.status))) return;
    const timer = window.setInterval(loadJobs, 15000);
    return () => window.clearInterval(timer);
  }, [token, jobs]);

  const addUrls = async () => {
    if (!token || !urls.trim()) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/ingestion', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, moduleId, topic, language }),
      });
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not add video URLs');
      setUrls('');
      setNotice(`${data.accepted} URL(s) added. ${data.errors?.length ? `${data.errors.length} invalid URL(s) were skipped. ` : ''}${data.message}`);
      if (data.errors?.length) setError(data.errors.slice(0, 5).map((item: any) => `${item.url}: ${item.error}`).join(' · '));
      await loadJobs();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add video URLs'); }
    finally { setSaving(false); }
  };

  const uploadMedia = async () => {
    if (!token || !uploadFile) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('file', uploadFile);
      form.set('moduleId', moduleId);
      form.set('topic', topic);
      form.set('language', language);
      const response = await fetch('/api/admin/crm/mohan-rag/ingestion/upload', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not upload media');
      setUploadFile(null);
      setNotice(`${uploadFile.name} uploaded to Bunny and queued. ${data.message}`);
      await loadJobs();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not upload media'); }
    finally { setSaving(false); }
  };

  const statusStyle: Record<string, string> = { queued: 'border-amber-200 bg-amber-50 text-amber-800', processing: 'border-blue-200 bg-blue-50 text-blue-800', completed: 'border-emerald-200 bg-emerald-50 text-emerald-800', failed: 'border-rose-200 bg-rose-50 text-rose-800' };
  return <div className="space-y-5">
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-violet-50 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Overnight media queue</p><h3 className="mt-1 text-lg font-semibold text-slate-900">Video to text, emotions & face cues</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Upload MP4/MP3 files or paste up to 500 YouTube and Bunny URLs. Existing Bunny videos are reused without re-uploading. Audio becomes a real minute-by-minute timestamped transcript with AI emotion and face-delivery suggestions for the avatar.</p></div><span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">10 PM–6 AM · Asia/Kolkata</span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-xs font-medium text-slate-600">Knowledge library<select value={moduleId} onChange={event => setModuleId(event.target.value as MohanRagModule)} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900">{modules.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Topic (optional)<input value={topic} onChange={event => setTopic(event.target.value)} maxLength={300} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="e.g. Swar Yoga basics" /></label><label className="text-xs font-medium text-slate-600">Language<select value={language} onChange={event => setLanguage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="auto">Auto detect</option><option value="hi">Hindi</option><option value="mr">Marathi</option><option value="en">English</option></select></label></div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-sky-200 bg-white p-4"><div className="flex items-center gap-2"><Upload className="h-4 w-4 text-sky-700"/><h4 className="text-sm font-semibold text-slate-900">Upload from this device</h4></div><p className="mt-1 text-xs text-slate-600">MP4, WebM, MOV, MP3, M4A, or WAV · up to 150 MB. The upload is stored in Bunny and processed from there.</p><input type="file" accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,.mp4,.webm,.mov,.mp3,.m4a,.wav" onChange={event => setUploadFile(event.target.files?.[0] || null)} className="mt-3 block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:font-semibold file:text-sky-900 hover:file:bg-sky-200"/><div className="mt-3 flex items-center justify-between gap-2"><span className="min-w-0 truncate text-xs text-slate-500">{uploadFile ? `${uploadFile.name} · ${(uploadFile.size / 1024 / 1024).toFixed(1)} MB` : 'Choose a media file'}</span><button type="button" disabled={saving || !uploadFile} onClick={uploadMedia} className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? 'Uploading…' : 'Upload & queue'}</button></div></div>
        <div className="rounded-xl border border-violet-200 bg-white p-4"><div className="flex items-center gap-2"><Video className="h-4 w-4 text-violet-700"/><h4 className="text-sm font-semibold text-slate-900">Add video URLs</h4></div><p className="mt-1 text-xs text-slate-600">Paste up to 500 URLs. Bunny URLs are reused in place; YouTube media is downloaded to Bunny for processing.</p><textarea value={urls} onChange={event => setUrls(event.target.value)} rows={4} maxLength={1_100_000} className="mt-3 w-full resize-y rounded-xl border border-violet-200 bg-white px-3 py-3 font-mono text-xs leading-5 text-slate-900" placeholder={'https://www.youtube.com/watch?v=abcdefghijk\nhttps://your-zone.b-cdn.net/videos/lesson.mp4'} /><div className="mt-2 flex justify-end"><button type="button" disabled={saving || !urls.trim()} onClick={addUrls} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? 'Adding…' : 'Queue URLs'}</button></div></div>
      </div>
      {(notice || error) && <div className="mt-3 space-y-2">{notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p>}{error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>}</div>}
      <p className="mt-3 text-xs leading-5 text-slate-500">Worker runs automatically during the overnight window. Server needs FFmpeg, yt-dlp for YouTube URLs, Bunny Storage/Database, and OpenAI transcription. Emotion and facial-expression tags are AI delivery suggestions from transcript wording; this does not visually analyze a face in the video.</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Recent video jobs</h3><p className="mt-1 text-xs text-slate-500">Completed items create draft sources in the selected library; approve them before RAG can retrieve them.</p></div><button type="button" onClick={loadJobs} disabled={loading} className="rounded-lg px-3 py-2 text-xs font-semibold">{loading ? 'Refreshing…' : 'Refresh queue'}</button></div>{jobs.length ? <div className="space-y-2">{jobs.map(job => <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{job.provider}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle[job.status] || statusStyle.queued}`}>{job.status}</span><span className="text-xs text-slate-500">{job.moduleId} · {job.topic || 'No topic'}</span></div><p className="mt-1 max-w-3xl break-all text-xs text-slate-700">{job.sourceUrl}</p>{job.errorMessage && <p className="mt-1 text-xs text-rose-700">{job.errorMessage}</p>}</div>{job.originalFileUrl && <a href={job.originalFileUrl} target="_blank" rel="noreferrer" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold">Open Bunny file</a>}</div></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{loading ? 'Loading queue…' : 'No video URLs queued yet.'}</p>}</section>
    <div className="grid gap-4 xl:grid-cols-2"><DetailCard title="Bunny links" icon={HardDrive}>Direct Bunny CDN MP3/MP4 URLs are read from Bunny and are not copied or re-uploaded. Bunny Stream player links are converted to their Bunny CDN video URL.</DetailCard><DetailCard title="YouTube links" icon={Video}>Public videos are downloaded with yt-dlp. Private videos need an authorized cookies file configured as YOUTUBE_COOKIES_FILE on the server. Media is capped at 350 MB and audio is compressed before transcription.</DetailCard></div>
  </div>;
}

function SearchDetails({ token }: { token: string | null }) {
  const [query, setQuery] = useState('');
  const [moduleId, setModuleId] = useState('level1');
  const [language, setLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [videoJob, setVideoJob] = useState<any>(null);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    if (!token || !videoJob?.id || videoJob.status !== 'rendering') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/admin/crm/mohan-rag/answer/${videoJob.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not refresh avatar render');
        if (!cancelled && data.answer) setVideoJob(data.answer);
      } catch (cause) {
        if (!cancelled) setRenderError(cause instanceof Error ? cause.message : 'Could not refresh avatar render');
      }
    };
    const timer = window.setInterval(poll, 5000);
    poll();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [token, videoJob?.id, videoJob?.status]);

  const runSearch = async () => {
    if (!token || !query.trim()) return;
    setLoading(true); setError(''); setResult(null); setVideoJob(null); setRenderError('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/search', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, moduleId, language }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const generateAvatarVideo = async () => {
    if (!token || !result?.id) return;
    setRenderError('');
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/answer/${result.id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start avatar render');
      setVideoJob(data.answer);
    } catch (cause) {
      setRenderError(cause instanceof Error ? cause.message : 'Could not start avatar render');
    }
  };

  return (
    <div className="space-y-5">
      <DetailCard title="Grounded answer preview" icon={Search}>
        <p className="mb-4 text-slate-700">Searches approved Bunny Database chunks, applies the selected module boundary, then asks the configured text provider for a grounded draft answer.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-slate-700">Question<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ask a question grounded in approved sources" className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-yellow-400/50" /></label>
          <label className="text-xs text-slate-700">Language<select value={language} onChange={event => setLanguage(event.target.value)} className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="auto">Auto detect</option><option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option></select></label>
          <label className="text-xs text-slate-700">Knowledge module / learner boundary<select value={moduleId} onChange={event => setModuleId(event.target.value)} className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900">{modules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
        </div>
        <button disabled={loading || !query.trim()} onClick={runSearch} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Searching…' : 'Search approved sources'} <ArrowRight className="h-4 w-4" /></button>
        {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</p>}
      </DetailCard>
      {result && <div className="space-y-4">
        <section className="rounded-2xl border border-emerald-200 bg-white p-5"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">Draft answer</h3><StatusPill muted>{result.sufficientContext ? 'Sources found' : 'Insufficient context'}</StatusPill></div><p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{result.answer}</p>{result.sufficientContext && result.citations?.length > 0 && <><button onClick={generateAvatarVideo} disabled={language === 'auto' || result.language !== language || videoJob?.status === 'rendering' || videoJob?.status === 'completed'} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-500 disabled:opacity-50"><Video className="h-4 w-4" />{videoJob?.status === 'rendering' ? 'Rendering your clone video…' : videoJob?.status === 'completed' ? 'Clone video ready' : 'Generate video with My Clone'}</button>{(language === 'auto' || result.language !== language) && <p className="mt-2 text-xs text-slate-500">Choose a verified voice language and rerun the answer preview before generating your clone video.</p>}</>}</section>
        <section className="rounded-2xl border border-emerald-200 bg-white p-5"><h3 className="mb-3 font-semibold text-slate-900">Retrieved citations</h3>{result.citations?.length ? <div className="space-y-2">{result.citations.map((citation: any, index: number) => <div key={`${citation.sourceId}-${citation.chunkIndex}`} className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-white p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-50 text-xs font-bold text-yellow-800">{index + 1}</span><div><div className="text-sm font-medium text-slate-800">{citation.title}</div><div className="mt-1 text-xs text-slate-500">{citation.moduleId} · {citation.topic || 'No topic'} · chunk {citation.chunkIndex + 1}{citation.sourceReference ? ` · ${citation.sourceReference}` : ''}</div></div></div>)}</div> : <p className="text-sm text-slate-500">No approved source matched this question.</p>}</section>
      </div>}
      {renderError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{renderError}</p>}
      {videoJob?.status === 'rendering' && <p className="rounded-lg border border-emerald-200 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-800">Your answer is rendering with the active avatar and cloned voice. This panel checks for completion every five seconds.</p>}
      {videoJob?.status === 'failed' && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">Avatar render failed: {videoJob.errorMessage}</p>}
      {videoJob?.status === 'completed' && videoJob.videoUrl && <section className="rounded-2xl border border-emerald-200 bg-white p-5"><h3 className="mb-3 font-semibold text-slate-900">Your AI clone video</h3><video controls playsInline className="w-full max-w-2xl rounded-xl bg-black" src={videoJob.videoUrl}>Your browser does not support video playback.</video><a className="mt-3 inline-flex text-sm text-emerald-800 underline" href={videoJob.videoUrl} target="_blank" rel="noreferrer">Open Bunny-hosted video</a></section>}
      <NotConnected>Retrieval currently uses keyword matching. Embedding/reranking, persisted search audit, and student-facing access are not connected yet.</NotConnected>
    </div>
  );
}
function InstructionDetails() {
  return <div className="space-y-5"><NotConnected>Instruction editing and version history are not backed by a persisted settings API yet.</NotConnected><div className="grid gap-4 xl:grid-cols-2"><DetailCard title="Global principles" icon={ListChecks}>Use the preferred language; preserve Mohan Sir’s terminology; answer plainly; cite sources where available; say when approved knowledge does not contain an answer; never invent teachings.</DetailCard><DetailCard title="Module-specific rules" icon={Brain}>Store WHY, Level 1, Level 2, Level 3, and General Topics instructions separately. Resolve module scope before retrieval and validate the response against that module afterward.</DetailCard><DetailCard title="Safety and claims" icon={ShieldCheck}>Separate general education from Swar Yoga teachings and distinguish traditional interpretations from scientific findings. Avoid diagnosis and unsupported health claims.</DetailCard><DetailCard title="Change control" icon={FileText}>Version every change, record editor and timestamp, provide preview/diff, and allow rollback. Do not expose hidden system instructions to student users.</DetailCard></div></div>;
}

function AvatarDetails({ token }: { token: string | null }) {
  const [connection, setConnection] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarId, setAvatarId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [avatarType, setAvatarType] = useState<'avatar' | 'talking_photo'>('talking_photo');
  const [avatarLabel, setAvatarLabel] = useState('Mohan Sir clone');
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);
  const [authorized, setAuthorized] = useState(false);
  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/crm/mohan-rag/avatar-connection', { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not check clone'); setConnection(data); if (data.config) { setAvatarId(data.config.avatarId || ''); setVoiceId(data.config.voiceId || ''); setAvatarType(data.config.avatarType || 'talking_photo'); setAvatarLabel(data.config.avatarLabel || 'Mohan Sir clone'); setSupportedLanguages(data.config.supportedLanguages || []); setAuthorized(Boolean(data.config.authorized)); } })
      .catch(cause => setError(cause instanceof Error ? cause.message : 'Could not check clone'));
  }, [token]);
  const saveConfig = async () => {
    if (!token) return;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/avatar-connection', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId, voiceId, avatarType, avatarLabel, supportedLanguages, authorized }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save clone connection');
      setConnection(prev => ({ ...prev, ...data, connected: Boolean(data.hasApiKey), status: data.hasApiKey ? 'ready' : 'setup_required', message: data.hasApiKey ? 'Clone provider settings are ready.' : 'Configure HEYGEN_API_KEY on the server to enable video rendering.' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save clone connection');
    } finally { setSaving(false); }
  };
  return <div className="space-y-5"><div className="rounded-2xl border border-emerald-200 bg-emerald-950/20 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-semibold text-slate-900">AI Avatar — My Clone</h3><p className="mt-1 text-sm text-slate-700">Keep avatar identity separate from knowledge modules. The RAG video flow uses authorized HeyGen provider IDs saved here.</p></div><Link href="/admin/crm/mohan-rag/avatar-studio" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-500">Open Avatar Studio <ArrowRight className="h-4 w-4" /></Link></div></div>
    {connection?.connected ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4"><div><div className="font-medium text-emerald-900">{connection.config?.avatarLabel || avatarLabel} is connected</div><div className="mt-1 text-xs text-emerald-700">HeyGen credentials are configured on the server. Provider IDs remain in Bunny Database. Languages: {(connection.config?.supportedLanguages || []).join(', ')}.</div></div><StatusPill muted>Ready for answer video</StatusPill></div> : <NotConnected>{connection?.message || 'Checking clone connection…'}</NotConnected>}
    {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</p>}
    <section className="rounded-2xl border border-emerald-200 bg-white p-5"><div className="mb-4"><h3 className="font-semibold text-slate-900">Connect your authorized avatar and cloned voice</h3><p className="mt-1 text-xs text-slate-500">Enter IDs from your authorized HeyGen avatar and voice. The API key is read from the server environment and is never shown or stored in this form.</p></div><div className="grid gap-3 md:grid-cols-2"><label className="text-xs text-slate-700">Avatar label<input value={avatarLabel} onChange={event => setAvatarLabel(event.target.value)} maxLength={120} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" /></label><label className="text-xs text-slate-700">Avatar type<select value={avatarType} onChange={event => setAvatarType(event.target.value as 'avatar' | 'talking_photo')} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="talking_photo">Talking photo / instant avatar</option><option value="avatar">Studio avatar</option></select></label><label className="text-xs text-slate-700">HeyGen avatar ID<input value={avatarId} onChange={event => setAvatarId(event.target.value)} autoComplete="off" maxLength={200} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="Paste authorized avatar ID" /></label><label className="text-xs text-slate-700">Cloned voice ID<input value={voiceId} onChange={event => setVoiceId(event.target.value)} autoComplete="off" maxLength={200} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="Paste authorized voice ID" /></label></div><fieldset className="mt-4"><legend className="text-xs text-slate-700">Languages verified for this cloned voice</legend><div className="mt-2 flex flex-wrap gap-4">{[['hi', 'Hindi'], ['mr', 'Marathi'], ['en', 'English']].map(([code, name]) => <label key={code} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={supportedLanguages.includes(code)} onChange={event => setSupportedLanguages(current => event.target.checked ? [...current, code] : current.filter(language => language !== code))} className="accent-emerald-500" />{name}</label>)}</div></fieldset><label className="mt-4 flex items-start gap-2.5 text-xs leading-5 text-slate-700"><input type="checkbox" checked={authorized} onChange={event => setAuthorized(event.target.checked)} className="mt-1 accent-emerald-500" /><span>I confirm these are my authorized avatar and cloned voice assets, and I approve their use to render answers grounded in approved Swar Yoga sources.</span></label><button onClick={saveConfig} disabled={saving || !avatarId.trim() || !voiceId.trim() || !supportedLanguages.length || !authorized} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Saving…' : 'Save clone connection'}</button></section>
    <div className="grid gap-4 xl:grid-cols-3"><DetailCard title="Clone identity" icon={UserRoundCog}>A separate admin connection stores the provider avatar ID, avatar type, and identity label. The in-studio preview state is not treated as a production clone ID.</DetailCard><DetailCard title="Cloned voice" icon={Mic2}>The provider voice ID is used when rendering an approved RAG answer. Supported languages follow the configured provider voice.</DetailCard><DetailCard title="Video delivery" icon={Video}>Generated answer videos are copied to Bunny Storage. Render status, answer text, and source citations stay linked to the RAG answer record.</DetailCard></div></div>;
}

function ConnectionDetails() {
  const steps = [
    ['Question & language', 'Capture learner question and preferred language.'],
    ['Permission check', 'Resolve module and learner level before retrieval.'],
    ['Approved retrieval', 'Retrieve approved sources only and keep citations.'],
    ['Answer validation', 'Check module rules, evidence, language, and context sufficiency.'],
    ['Clone voice & video', 'Send validated text to the selected authorized voice and avatar.'],
    ['Bunny Storage delivery', 'Save and deliver the generated answer with job and source references.'],
  ];
  return <div className="space-y-5"><div className="rounded-xl border border-emerald-200 bg-emerald-950/20 p-4 text-sm text-emerald-900">The admin answer preview can submit cited answers to the active clone. Video rendering starts only after you press <strong>Generate video with My Clone</strong>, and the result is stored in Bunny Storage. An active master clone and configured HeyGen credentials are required.</div><div className="space-y-3">{steps.map(([title, detail], index) => <div key={title} className="flex gap-4 rounded-xl border border-emerald-200 bg-white p-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-yellow-300 bg-yellow-50 text-sm font-bold text-yellow-800">{index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><StatusPill>{index < 4 ? 'Connected' : 'Starts on request'}</StatusPill></div><p className="mt-1 text-sm text-slate-700">{detail}</p></div></div>)}</div><DetailCard title="Required safeguards" icon={LockKeyhole}>Video generation only accepts an answer record with approved-source citations. Search applies module and level boundaries, stores source references with the answer, and refuses a render when context is insufficient or no active clone exists.</DetailCard></div>;
}

function AnalyticsDetails() {
  return <div className="space-y-5"><NotConnected>No analytics are shown until event collection and metric definitions are implemented.</NotConnected><div className="grid gap-4 xl:grid-cols-2"><DetailCard title="Knowledge quality" icon={Brain}>Retrieval success, citation coverage, unanswered questions, feedback, and sampled answer reviews.</DetailCard><DetailCard title="Processing operations" icon={Activity}>Upload volumes, processing duration, retry/failure rates, queue age, and transcript review backlog.</DetailCard><DetailCard title="Avatar operations" icon={Video}>Render count, render duration, provider errors, language split, and delivery completion.</DetailCard><DetailCard title="Usage and cost" icon={HardDrive}>Storage and model/provider usage by date and workflow, within configured budgets. Keep metrics tied to actual invoices or measured usage.</DetailCard></div></div>;
}

function SettingsDetails() {
  return <div className="space-y-5"><NotConnected>Settings are informational until a Bunny-backed configuration repository and server-side validation are implemented.</NotConnected><div className="grid gap-4 xl:grid-cols-2"><DetailCard title="Knowledge processing" icon={Settings2}>Allowed file types, upload limits, transcript handling, chunking, retry policy, and retention.</DetailCard><DetailCard title="Retrieval and access" icon={LockKeyhole}>Approved-only retrieval, per-module isolation, learner-level policy, language filters, and insufficient-context behavior.</DetailCard><DetailCard title="Research limits" icon={Globe2}>Preferred/restricted domains, max sources, publication date, research depth/time, language, and usage budget.</DetailCard><DetailCard title="Avatar connection" icon={Video}>Authorized avatar and voice defaults, language settings, render constraints, captions, storage destination, and provider readiness.</DetailCard></div><p className="text-xs text-slate-500">Secrets and provider credentials must stay server-side. The application must use Bunny Database and Bunny Storage only; MongoDB is disabled.</p></div>;
}
