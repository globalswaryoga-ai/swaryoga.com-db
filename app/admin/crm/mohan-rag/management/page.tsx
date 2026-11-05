'use client';

import { useEffect, useRef, useState, type ReactNode, type ElementType } from 'react';
import Link from 'next/link';
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BookOpen, Brain,
  ChevronRight, CircleHelp, Dna, FileSearch, FileText, FlaskConical, Globe2,
  HardDrive, Languages, LayoutDashboard, ListChecks, LockKeyhole, Mic2, Network,
  Search, Settings2, ShieldCheck, Sparkles, Upload, UserRoundCog, Users, Video, FileAudio, SpellCheck,
  Heart, Flame, RefreshCw, CheckCircle2, Loader2, X, Trash2, Cpu,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { compressAudioForWhisper } from '@/lib/clientAudioCompressor';
import { parseAvatarScript } from '@/lib/avatarEmotionParser';
import { ELEARNING_LANGUAGES } from '@/lib/elearningLanguages';
import {
  WORKSHOP_OPTIONS,
  DAY_OPTIONS,
  TOPIC_OPTIONS,
  getLibraryCorpusText,
  stripToPurePlainText,
} from '@/lib/mohanRag/masterLibraryCorpus';
import {
  countKnowledgeSourcesByModule,
  filterKnowledgeSourcesByLanguage,
} from '@/lib/mohanRag/libraryLanguageFilter';
import LibraryDashboardView from '@/lib/mohanRag/LibraryDashboardView';
import GrammarCheckerWorkspace from '@/lib/mohanRag/GrammarCheckerWorkspace';
import PlainTextWorkspace from '@/lib/mohanRag/PlainTextWorkspace';
import HummerEmotionWorkspace from '@/lib/mohanRag/HummerEmotionWorkspace';
import { SixStepPipelineView } from '@/components/admin/crm/mohan-rag/SixStepPipelineView';
import FourWorkersPipelineView from '@/components/admin/crm/mohan-rag/FourWorkersPipelineView';
import MohanSirAvatarDnaLibrary from '@/components/admin/crm/mohan-rag/MohanSirAvatarDnaLibrary';
import YouTubeChannelIntake from '@/components/admin/crm/mohan-rag/YouTubeChannelIntake';
import VoiceMicInputButton from '@/components/admin/crm/mohan-rag/VoiceMicInputButton';
import { SUPPORTED_27_LANGUAGES } from '@/lib/mohanRag/multiLanguageSynthesisEngine';
import type { MohanRagModule } from '@/lib/mohanRag/knowledgeRepository';

type SectionId =
  | 'overview' | 'library' | 'why' | 'level1' | 'level2' | 'level3'
  | 'aahar_shastra' | 'children' | 'youth' | 'garbh_sanskar' | 'weight_loss' | 'meditation_sadhana'
  | 'general' | 'research' | 'ingestion' | 'search' | 'instructions' | 'avatar-dna' | 'avatar'
  | 'youtube-dna' | 'connection' | 'analytics' | 'settings';

type NavItem = { id: SectionId; label: string; icon: ElementType };

function formatPdfPageCoverage(stats: any): string {
  if (!stats || !Number.isFinite(stats.totalPages) || !Number.isFinite(stats.extractedPages)) return '';
  const total = stats.totalPages as number;
  const extracted = stats.extractedPages as number;
  const missing = Array.isArray(stats.pagesWithoutText) ? stats.pagesWithoutText.filter((page: unknown) => Number.isInteger(page)) as number[] : [];
  if (!total) return ' PDF page count could not be determined.';
  if (extracted === total) return ` Text extracted from all ${total} PDF pages.`;
  const pageList = missing.slice(0, 12).join(', ');
  const more = missing.length > 12 ? `, and ${missing.length - 12} more` : '';
  return ` Text extracted from ${extracted} of ${total} PDF pages. Pages with no selectable text: ${pageList || 'unknown'}${more}. These may be scanned/image-only or blank pages and need OCR if they contain content.`;
}

async function requestProofreadText(content: string, language: string, token: string): Promise<string> {
  const response = await fetch('/api/admin/crm/mohan-rag/proofread', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, language }),
  });
  const data = await readManagementApiJson(response);
  if (!response.ok) throw new Error(data.error || 'Could not check spelling');
  if (typeof data.correctedText !== 'string' || !data.correctedText.trim()) throw new Error('Spell check returned no text. Your source is unchanged.');
  return data.correctedText;
}

async function correctAndSaveKnowledgeSource(sourceId: string, token: string): Promise<boolean> {
  const getResponse = await fetch(`/api/admin/crm/mohan-rag/knowledge/${sourceId}`, { headers: { Authorization: `Bearer ${token}` } });
  const current = await readManagementApiJson(getResponse);
  if (!getResponse.ok) throw new Error(current.error || 'Could not open source for correction');
  const correctedText = await requestProofreadText(current.source.content || '', current.source.language || 'auto', token);
  if (correctedText.trim() === String(current.source.content || '').trim()) return false;
  const saveResponse = await fetch(`/api/admin/crm/mohan-rag/knowledge/${sourceId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: correctedText }),
  });
  const saved = await readManagementApiJson(saveResponse);
  if (!saveResponse.ok) throw new Error(saved.error || 'Could not save corrected source');
  return true;
}

function SpellcheckReview({ text, language, onApply, onDiscard }: { text: string; language: string; onApply: () => void; onDiscard: () => void }) {
  return <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-violet-950">Proofread preview</h4><p className="mt-1 text-xs text-violet-800">Review the suggested spelling and spacing. Your source has not changed yet.</p></div><div className="flex gap-2"><button type="button" onClick={onDiscard} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Discard</button><button type="button" onClick={onApply} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white">Use corrected text</button></div></div><pre lang={language === 'auto' ? undefined : language} className={`mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-violet-100 bg-white p-3 text-sm leading-6 text-slate-800 ${devanagariFontClass(text, language)}`}>{text}</pre></div>;
}

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Workshops & Modules',
    items: [
      { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
      { id: 'library' as const, label: 'Library (All Sources)', icon: BookOpen },
      { id: 'level1' as const, label: 'Level 1: Basic Swar Yoga', icon: BookOpen },
      { id: 'level2' as const, label: 'Level 2: Aham Brahmasmi', icon: BookOpen },
      { id: 'level3' as const, label: 'Level-3 (Ashtavakra Dhyan)', icon: BookOpen },
      { id: 'aahar_shastra' as const, label: 'Aahar Shastra (Diet & Digestion)', icon: Flame },
      { id: 'children' as const, label: 'Children Yoga (बाल संस्कार)', icon: Sparkles },
      { id: 'youth' as const, label: 'Youth Yoga (युवा योग)', icon: Activity },
      { id: 'garbh_sanskar' as const, label: 'Pregnancy (Garbh Sanskar)', icon: Heart },
      { id: 'weight_loss' as const, label: 'Weight Loss Program', icon: Flame },
      { id: 'meditation_sadhana' as const, label: 'Meditation Sadhana', icon: Brain },
      { id: 'why' as const, label: 'Why Swar Yoga?', icon: Sparkles },
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
      { id: 'youtube-dna' as const, label: 'YouTube Channel Intake', icon: Video },
      { id: 'avatar-dna' as const, label: 'Avatar DNA Library', icon: Dna },
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
    title: 'Level 1: Basic & Master Swar Yoga',
    purpose: 'Answer from approved Level 1 lessons and source material (Bhojan, Pani, Gas, Sleep).',
    access: 'Level 1 sources only',
    boundary: 'Do not expose Level 2 or Level 3 knowledge.',
  },
  {
    id: 'level2' as const,
    title: 'Level 2: Aham Brahmasmi',
    purpose: 'Answer using approved Level 1 and Level 2 materials (Samyama, 6 Ripu, Panch Tatva, Photographer vs Creator).',
    access: 'Level 1 + Level 2 sources',
    boundary: 'Do not expose Level 3 knowledge.',
  },
  {
    id: 'level3' as const,
    title: 'Level-3 (Ashtavakra Dhyan)',
    purpose: 'Answer using approved Level 1, Level 2, and Level 3 materials (History vs Potential, My Dear Mind, 5 Truths, Shivoham).',
    access: 'Level 1 + Level 2 + Level 3 sources',
    boundary: 'Advanced answers require approved Level 3 sources.',
  },
  {
    id: 'aahar_shastra' as const,
    title: 'Aahar Shastra (Diet, Jatharagni & Digestion)',
    purpose: 'Digestive fire (Jatharagni), food elements, 45-min water rules, and eating according to Surya Nadi.',
    access: 'Approved Aahar Shastra sources',
    boundary: 'Align with authentic Swar Yoga meal and water rules.',
  },
  {
    id: 'children' as const,
    title: 'Children Yoga (बाल संस्कार)',
    purpose: 'Memory enhancement, concentration games, brain hemisphere balancing for kids.',
    access: 'Approved Children Yoga sources',
    boundary: 'Simple, joyful breathing practices.',
  },
  {
    id: 'youth' as const,
    title: 'Youth Yoga (युवा योग)',
    purpose: 'Youth vitality, stress management, study focus, and emotional harmony.',
    access: 'Approved Youth Yoga sources',
    boundary: 'Practical teen and student breath mastery.',
  },
  {
    id: 'garbh_sanskar' as const,
    title: 'Pregnancy (Garbh Sanskar Shibir)',
    purpose: 'Prenatal breathing, mother-child prana bond, and peaceful Chandra Nadi states.',
    access: 'Approved Garbh Sanskar sources',
    boundary: 'Safe, gentle prenatal guidance.',
  },
  {
    id: 'weight_loss' as const,
    title: 'Weight Loss Program',
    purpose: 'Metabolic fire ignition, Surya Nadi meal schedule, fat reduction without starving.',
    access: 'Approved Weight Loss sources',
    boundary: 'No extreme diet starvation claims.',
  },
  {
    id: 'meditation_sadhana' as const,
    title: 'Meditation Sadhana',
    purpose: 'Deep sadhana: Navaratri Dhyan, 7 Chakras, 45-minute Samyama, and Dash Onkar Gayatri.',
    access: 'Approved Meditation sources',
    boundary: 'Advanced inner sadhana.',
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

export type LibraryViewTab = 'library' | 'dashboard' | 'spellcheck' | 'grammar' | 'plaintext' | 'humor' | 'pipeline' | 'fourworkers';

export default function MohanRagManagementPage() {
  const authToken = useAuth();
  const [active, setActive] = useState<SectionId>('overview');
  const [libraryTab, setLibraryTab] = useState<LibraryViewTab>('library');

  // Shared Multilingual Knowledge Pipeline State (flows across all stages)
  const [pipelineLang, setPipelineLang] = useState('mr');
  const [pipelineWorkshop, setPipelineWorkshop] = useState('all');
  const [pipelineDay, setPipelineDay] = useState('all');
  const [pipelineTopic, setPipelineTopic] = useState('all');
  const [pipelineText, setPipelineText] = useState(() => getLibraryCorpusText('mr', 'all', 'all', 'all'));

  // Auto-populate pipeline text with authentic spoken video lecture from database instead of static PDF outline
  useEffect(() => {
    if (!authToken) return;
    if (pipelineText && (pipelineText.includes('सर्व कार्यशाळा व १६ दिवसांचा संपूर्ण अभ्यासक्रम') || pipelineText.includes('मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)'))) {
      fetch('/api/admin/crm/mohan-rag/knowledge?module=level1', { headers: { Authorization: `Bearer ${authToken}` } })
        .then(r => r.json())
        .then(d => {
          const list = Array.isArray(d.sources) ? d.sources : [];
          const realSources = list.filter((s: any) => (s.contentLength || s.content?.length || 0) > 5000 && !s.title?.toLowerCase().includes('syllabus'));
          realSources.sort((a: any, b: any) => (b.contentLength || b.content?.length || 0) - (a.contentLength || a.content?.length || 0));
          const top = realSources[0];
          if (top) {
            fetch(`/api/admin/crm/mohan-rag/knowledge/${top.id}`, { headers: { Authorization: `Bearer ${authToken}` } })
              .then(sr => sr.json())
              .then(sd => {
                if (sd.source?.content) {
                  setPipelineText(sd.source.content.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim());
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [authToken]);

  const isSpellMode = active === 'library' && !['library', 'dashboard'].includes(libraryTab);
  const showMainSidebar = !isSpellMode;
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
              href="/admin/crm/mohan-rag/monitor"
              className="px-3.5 py-2 rounded-xl text-xs font-black text-emerald-950 bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <span>🩺</span>
              <span>Health Monitor</span>
            </Link>
            <Link
              href="/podcasts"
              target="_blank"
              className="px-3.5 py-2 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-300 to-emerald-300 hover:from-amber-200 hover:to-emerald-200 shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <span>🎙️</span>
              <span>Podcasts Hub</span>
            </Link>
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

        <div className={showMainSidebar ? "grid min-h-[70vh] grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]" : "min-h-[70vh] w-full"}>
          {showMainSidebar && (
            <aside className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto">
              {/* Direct One-Click Navigation to Creation Hub under Mohan RAG */}
              <div className="mb-4">
                <Link
                  href="/admin/crm/mohan-rag/creation-hub"
                  className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 p-3 text-xs font-black text-white shadow-md hover:from-purple-600 hover:to-indigo-600 transition"
                  title="Open Creation Hub (Factory Review)"
                >
                  <span className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-300" />
                    <span>🏭 Creation Hub (Factory Review)</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-purple-200" />
                </Link>
              </div>

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
          )}

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

                {/* Row of Library Tabs: Library (Default), Dashboard, Spell Checker, Grammar Checker, Plain Text, Humor & Emotion Text */}
                {active === 'library' && (
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {/* 1. Library */}
                    <button
                      type="button"
                      onClick={() => setLibraryTab('library')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-xs ${
                        libraryTab === 'library'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-700/25 ring-1 ring-emerald-500'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Library</span>
                    </button>

                    {/* 2. Dashboard */}
                    <button
                      type="button"
                      onClick={() => setLibraryTab('dashboard')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-xs ${
                        libraryTab === 'dashboard'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-700/25 ring-1 ring-emerald-500'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>

                    {/* 2. Spell Checker (with book symbol) */}
                    <button
                      type="button"
                      onClick={() => setLibraryTab('spellcheck')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-xs ${
                        libraryTab === 'spellcheck'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-700/25 ring-1 ring-emerald-500'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Spell Checker</span>
                    </button>

                    {/* 3. Grammar Checker */}
                    <button
                      type="button"
                      onClick={() => setLibraryTab('grammar')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-xs ${
                        libraryTab === 'grammar'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-700/25 ring-1 ring-emerald-500'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Brain className="w-4 h-4" />
                      <span>Grammar Checker</span>
                    </button>

                    {/* 4. Plain Text */}
                    <button
                      type="button"
                      onClick={() => setLibraryTab('plaintext')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-xs ${
                        libraryTab === 'plaintext'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-700/25 ring-1 ring-emerald-500'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Plain Text</span>
                    </button>

                    {/* 5. Humor & Emotion Text */}
                    <button
                      type="button"
                      onClick={() => setLibraryTab('humor')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-xs ${
                        libraryTab === 'humor'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-700/25 ring-1 ring-emerald-500'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Text with Humor &amp; Emotion</span>
                    </button>

                    {/* 6. 6-Step Blueprint Pipeline */}
                    <button
                      type="button"
                      onClick={() => setLibraryTab('pipeline')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-xs ${
                        libraryTab === 'pipeline'
                          ? 'bg-emerald-800 text-white shadow-emerald-900/30 ring-2 ring-emerald-500'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>⚡ 6-Step Blueprint Pipeline</span>
                    </button>

                    {/* 7. 4-Worker Pipeline */}
                    <button
                      type="button"
                      onClick={() => setLibraryTab('fourworkers')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-xs ${
                        libraryTab === 'fourworkers'
                          ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-emerald-900/40 ring-2 ring-emerald-400'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      <span>⚙️ 4-Worker Pipeline</span>
                    </button>
                  </div>
                )}
              </div>
              <StatusPill muted>System Operational • Active Admin Session</StatusPill>
            </div>

            {active === 'overview' && <Overview onSelect={setActive} />}
            {active === 'library' && (
              libraryTab === 'dashboard' ? (
                <LibraryDashboardView
                  token={authToken}
                  onNavigateStage={(tab) => setLibraryTab(tab)}
                  onSelectSection={(sec) => setActive(sec as SectionId)}
                />
              ) : libraryTab === 'library' ? (
                <Library
                  token={authToken}
                  onForwardToPipeline={(data) => {
                    if (data.text) setPipelineText(data.text);
                    if (data.topic) setPipelineTopic(data.topic);
                    if (data.workshop) setPipelineWorkshop(data.workshop);
                    if (data.language && data.language !== 'auto') setPipelineLang(data.language);
                    setLibraryTab('spellcheck');
                  }}
                />
              ) : libraryTab === 'grammar' ? (
                <GrammarCheckerWorkspace
                  token={authToken}
                  selectedLang={pipelineLang}
                  onLanguageSelect={setPipelineLang}
                  selectedWorkshop={pipelineWorkshop}
                  onWorkshopChange={setPipelineWorkshop}
                  selectedDay={pipelineDay}
                  onDayChange={setPipelineDay}
                  selectedTopic={pipelineTopic}
                  onTopicChange={setPipelineTopic}
                  text={pipelineText}
                  onTextChange={setPipelineText}
                  onProceedToPlainText={() => setLibraryTab('plaintext')}
                />
              ) : libraryTab === 'plaintext' ? (
                <PlainTextWorkspace
                  token={authToken}
                  selectedLang={pipelineLang}
                  onLanguageSelect={setPipelineLang}
                  selectedWorkshop={pipelineWorkshop}
                  onWorkshopChange={setPipelineWorkshop}
                  selectedDay={pipelineDay}
                  onDayChange={setPipelineDay}
                  selectedTopic={pipelineTopic}
                  onTopicChange={setPipelineTopic}
                  text={pipelineText}
                  onTextChange={setPipelineText}
                  onProceedToHumor={() => setLibraryTab('humor')}
                />
              ) : libraryTab === 'humor' ? (
                <HummerEmotionWorkspace
                  token={authToken}
                  selectedLang={pipelineLang}
                  onLanguageSelect={setPipelineLang}
                  selectedWorkshop={pipelineWorkshop}
                  onWorkshopChange={setPipelineWorkshop}
                  selectedDay={pipelineDay}
                  onDayChange={setPipelineDay}
                  selectedTopic={pipelineTopic}
                  onTopicChange={setPipelineTopic}
                  text={pipelineText}
                  onTextChange={setPipelineText}
                />
              ) : libraryTab === 'fourworkers' ? (
                <FourWorkersPipelineView
                  token={authToken}
                  onNavigateToTab={(tab, _topic, text) => {
                    if (text) setPipelineText(text);
                    if (['plaintext', 'spellcheck', 'grammar', 'humor', 'pipeline'].includes(tab)) {
                      setLibraryTab(tab as LibraryViewTab);
                    }
                  }}
                />
              ) : libraryTab === 'pipeline' ? (
                <SixStepPipelineView
                  token={authToken}
                  initialTopic={pipelineTopic !== 'all' ? pipelineTopic : 'Swar Yoga Day-1'}
                  initialText={pipelineText}
                  initialLanguage={pipelineLang}
                />
              ) : (
                <SpellCheckerModule
                  token={authToken}
                  activeTab={libraryTab}
                  sharedLang={pipelineLang}
                  onLangChange={setPipelineLang}
                  sharedWorkshop={pipelineWorkshop}
                  onWorkshopChange={setPipelineWorkshop}
                  sharedDay={pipelineDay}
                  onDayChange={setPipelineDay}
                  sharedTopic={pipelineTopic}
                  onTopicChange={setPipelineTopic}
                  sharedText={pipelineText}
                  onTextChange={setPipelineText}
                  onProceedToGrammar={() => setLibraryTab('grammar')}
                  onProceedToPlainText={() => setLibraryTab('plaintext')}
                />
              )
            )}
            {currentModule && active !== 'research' && (
              <KnowledgeModulePanel
                module={currentModule}
                token={authToken}
                onOpenInSpellCheck={(source) => {
                  const clean = (source.content || '').replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
                  setPipelineText(clean);
                  setPipelineTopic(`src_${source.id}`);
                  setPipelineWorkshop(source.moduleId);
                  if (source.language && source.language !== 'auto') {
                    const normLang = source.language.startsWith('mr') || source.language.includes('marathi') ? 'mr' : source.language.startsWith('hi') || source.language.includes('hindi') ? 'hi' : 'en';
                    setPipelineLang(normLang);
                  }
                  setActive('library');
                  setLibraryTab('spellcheck');
                }}
              />
            )}
            {active === 'research' && <ResearchDetails token={authToken} />}
            {active === 'ingestion' && <IngestionDetails token={authToken} />}
            {active === 'search' && <SearchDetails token={authToken} />}
            {active === 'instructions' && <InstructionDetails />}
            {active === 'avatar-dna' && <MohanSirAvatarDnaLibrary token={authToken} />}
            {active === 'youtube-dna' && <YouTubeChannelIntake token={authToken} />}
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
    aahar_shastra: 'Manage approved Aahar Shastra sources and transcripts.',
    weight_loss: 'Manage approved weight-loss program sources and transcripts.',
    garbh_sanskar: 'Manage approved Garbh Sanskar sources and transcripts.',
    children: 'Manage approved Children Yoga sources and transcripts.',
    youth: 'Manage approved Youth Yoga sources and transcripts.',
    meditation_sadhana: 'Manage approved Meditation Sadhana sources and transcripts.',
    general: 'Separate approved general education from Swar Yoga teachings.',
    research: 'Collect cited research into drafts for human review before publication.',
    ingestion: 'Track source files, transcripts, processing and approval as one traceable flow.',
    search: 'Inspect retrieval sources and permission behavior before answers are released.',
    instructions: 'Set shared answer principles while retaining independent module rules.',
    'avatar-dna': 'Browse all created Mohan Sir DNA looks, facial landmark expressions, vocal cadence, and deploy active avatar styles anywhere.',
    'youtube-dna': 'Discover videos accessible from the Swar Yoga channel and review the Bunny-backed inventory before transcript and DNA analysis.',
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
  contentLength?: number;
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

function Library({
  token,
  onForwardToPipeline,
}: {
  token: string | null;
  onForwardToPipeline?: (data: {
    text: string;
    topic: string;
    workshop: string;
    language: string;
  }) => void;
}) {
  const [sources, setSources] = useState<KnowledgeSourceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [moduleId, setModuleId] = useState<MohanRagModule | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [source, setSource] = useState<KnowledgeSourceView | null>(null);
  const [view, setView] = useState<'plain' | 'cues'>('plain');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [isFixingLang, setIsFixingLang] = useState(false);
  const [filterMsg, setFilterMsg] = useState('');
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixMsg, setAutoFixMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisMsg, setSynthesisMsg] = useState('');

  const handleSynthesizeTopic = async (targetTopic: string) => {
    if (!token || !targetTopic) return;
    setIsSynthesizing(true);
    setSynthesisMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/topics/auto-translate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'synthesize_topic',
          topic: targetTopic,
          moduleId: moduleId || 'level1',
          targetLanguages: ['en', 'hi', 'mr', 'es', 'de', 'fr', 'ja', 'sa'],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to synthesize');
      setSynthesisMsg(data.message || `Successfully synthesized "${targetTopic}" across all languages!`);
      const refreshed = await fetch(`/api/admin/crm/mohan-rag/knowledge?module=${moduleId}`, { headers: { Authorization: `Bearer ${token}` } });
      const refreshedData = await readManagementApiJson(refreshed);
      if (Array.isArray(refreshedData.sources)) {
        setSources(prev => {
          const others = prev.filter(s => s.moduleId !== moduleId);
          return [...others, ...refreshedData.sources];
        });
      }
    } catch (err: any) {
      setSynthesisMsg(err.message || 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };
  const [autoFixingId, setAutoFixingId] = useState<string | null>(null);

  const handleScanAutoFix = async () => {
    if (!token) return;
    setIsScanning(true);
    setAutoFixMsg('');
    try {
      const res = await fetch(`/api/admin/crm/mohan-rag/ai-recheck-autofix?module=${moduleId || 'all'}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setScanResult(data.scan);
      setShowScanModal(true);
    } catch (err: any) {
      setAutoFixMsg(err.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAutoFixSingle = async (sourceId: string) => {
    if (!token) return;
    setIsAutoFixing(true);
    setAutoFixingId(sourceId);
    setAutoFixMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/ai-recheck-autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'fix_single', sourceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-fix failed');
      setAutoFixMsg(data.result?.message || 'Successfully auto-fixed video source with authentic spoken audio!');
      if (source && source.id === sourceId) {
        await openSource(source);
      }
      if (moduleId) {
        const resp = await fetch(`/api/admin/crm/mohan-rag/knowledge?module=${moduleId}`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await readManagementApiJson(resp);
        if (Array.isArray(d.sources)) {
          setSources(prev => prev.map(s => {
            const updated = (d.sources as KnowledgeSourceView[]).find(x => x.id === s.id);
            return updated || s;
          }));
        }
      }
      if (showScanModal) {
        handleScanAutoFix();
      }
    } catch (err: any) {
      setAutoFixMsg(err.message || 'Auto-fix failed');
    } finally {
      setIsAutoFixing(false);
      setAutoFixingId(null);
    }
  };

  const handleAutoFixBatch = async (limit = 5) => {
    if (!token) return;
    setIsAutoFixing(true);
    setAutoFixMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/ai-recheck-autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'batch', moduleId: moduleId || undefined, limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch auto-fix failed');
      setAutoFixMsg(`Batch complete! Successfully auto-fixed ${data.result?.fixed} sources (${data.result?.failed} failed).`);
      handleScanAutoFix();
      if (source) {
        await openSource(source);
      }
    } catch (err: any) {
      setAutoFixMsg(err.message || 'Batch auto-fix failed');
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handleDeleteLibrarySource = async (sourceId: string, title: string) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${sourceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete');
      }
      setSources(prev => prev.filter(s => s.id !== sourceId));
      if (source?.id === sourceId) {
        clearSource();
      }
      setAutoFixMsg(`Source "${title}" deleted successfully.`);
      setTimeout(() => setAutoFixMsg(''), 4000);
    } catch (err: any) {
      alert(`Could not delete: ${err.message}`);
    }
  };

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
  const filteredSources = filterKnowledgeSourcesByLanguage(sources, langFilter);
  const moduleSources = filteredSources.filter(item => item.moduleId === moduleId);
  const topics = Array.from(new Set(moduleSources.map(item => item.topic.trim() || 'Uncategorized'))).sort((a, b) => a.localeCompare(b));
  const topicSources = moduleSources.filter(item => (item.topic.trim() || 'Uncategorized') === topic);
  const detailedSource = source ? { ...source, content: source.content || '' } : null;
  const parsed = detailedSource ? parseAvatarScript(detailedSource.content) : null;
  const plainText = detailedSource?.content.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '') || '';
  const hasCues = Boolean(detailedSource?.content.match(/\[(?:[a-z_]+:\d{1,3}|face:[a-z_]+)\]/i));

  const isVideoSource = Boolean(
    detailedSource && (
      detailedSource.originalFileName?.match(/\.(mp4|mov|webm|mp3|m4a|wav)$/i) ||
      detailedSource.sourceType === 'bunny_stream' ||
      detailedSource.sourceType === 'youtube' ||
      detailedSource.sourceType === 'mp4' ||
      (detailedSource as any).originalFileUrl?.includes('.mp4') ||
      (detailedSource as any).sourceReference?.includes('.mp4')
    )
  );

  const isDummyOrPdfData = Boolean(
    detailedSource && isVideoSource && (
      detailedSource.content.length < 900 ||
      (plainText.includes('मार्गदर्शक: मोहन काळबुर्गी') && detailedSource.content.length < 3500) ||
      (plainText.includes('दिवस ') && plainText.includes('अभ्यासक्रम') && detailedSource.content.length < 3500) ||
      (plainText.includes('[00:00–01:00]') && plainText.includes('[10:00–11:00]') && detailedSource.content.length < 1500)
    )
  );

  const handleLanguageAction = async (targetLang: 'hi' | 'mr' | 'en', action: 'reassign' | 'standardize') => {
    if (!token || !detailedSource) return;
    setIsFixingLang(true);
    setFilterMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/sources/language-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sourceId: detailedSource.id, targetLanguage: targetLang, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update language');
      setFilterMsg(data.message || 'Updated successfully!');
      if (data.source) {
        setSource(data.source);
        setSources(prev => prev.map(s => s.id === data.source.id ? data.source : s));
      }
    } catch (err: any) {
      setFilterMsg(err.message || 'Operation failed');
    } finally {
      setIsFixingLang(false);
    }
  };

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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleScanAutoFix}
              disabled={isScanning}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 px-3.5 py-2 text-xs font-black text-white shadow-md hover:from-amber-400 hover:to-orange-500 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-yellow-200" />}
              <span>{isScanning ? 'Scanning Video Audio...' : '⚡ AI Re-Check & Auto-Fix Video Sources'}</span>
            </button>
            {(moduleId || topic || source) && <button type="button" onClick={() => { setModuleId(null); setTopic(null); setSource(null); }} className="rounded-lg px-3 py-2 text-sm font-semibold">All six libraries</button>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>Library</span>{activeModule && <><ChevronRight className="h-3 w-3" /><button type="button" onClick={() => { setTopic(null); setSource(null); }} className="rounded-md px-2 py-1 text-xs">{activeModule.title}</button></>}{topic && <><ChevronRight className="h-3 w-3" /><button type="button" onClick={clearSource} className="rounded-md px-2 py-1 text-xs">{topic}</button></>}{source && <><ChevronRight className="h-3 w-3" /><span className="font-medium text-slate-700">{source.title}</span></>}</div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Language Filter:</span>
            {[
              { code: 'all', label: '🌐 All Languages' },
              { code: 'mr', label: '🚩 Marathi (MR)' },
              { code: 'hi', label: '🕉️ Hindi (HI)' },
              { code: 'en', label: '🇬🇧 English (EN)' },
            ].map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLangFilter(l.code);
                  setTopic(null);
                  setSource(null);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  langFilter === l.code
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {l.label}
              </button>
            ))}

            {/* Selector for the other 24 Global Languages */}
            <div className="relative inline-flex items-center">
              <select
                value={['all', 'mr', 'hi', 'en'].includes(langFilter) ? '' : langFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setLangFilter(val);
                    setTopic(null);
                    setSource(null);
                  }
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition outline-none cursor-pointer ${
                  !['all', 'mr', 'hi', 'en'].includes(langFilter)
                    ? 'border-emerald-600 bg-emerald-800 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title="Select from 27 global translated languages"
              >
                <option value="" disabled>
                  🌍 More Languages ({SUPPORTED_27_LANGUAGES.length - 3}) ▾
                </option>
                {SUPPORTED_27_LANGUAGES.filter((l) => !['mr', 'hi', 'en'].includes(l.code)).map((l) => (
                  <option key={l.code} value={l.code} className="text-slate-900 bg-white">
                    {l.native} ({l.name}) — {l.code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filter Pill if non-standard language is active */}
            {!['all', 'mr', 'hi', 'en'].includes(langFilter) && (
              <button
                type="button"
                onClick={() => setLangFilter('all')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
              >
                <span>Clear ({langFilter.toUpperCase()})</span>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Voice Microphone Input on the Language Bar */}
          <div className="flex items-center gap-2">
            <VoiceMicInputButton
              onTranscript={(spokenText) => {
                // If Mohan Sir speaks a topic or word, search/match it
                const found = sources.find((s) =>
                  s.title.toLowerCase().includes(spokenText.toLowerCase()) ||
                  s.topic.toLowerCase().includes(spokenText.toLowerCase())
                );
                if (found) {
                  setModuleId(found.moduleId);
                  setTopic(found.topic);
                  setSource(found);
                }
              }}
              buttonText="माईक (Voice Filter)"
            />
          </div>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {loading && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading library contents…</p>}

      {!moduleId && !loading && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{modules.map((item, index) => {
        const count = countKnowledgeSourcesByModule(sources, item.id, langFilter);
        return <button key={item.id} type="button" data-tone={toneFor(index)} onClick={() => { setModuleId(item.id); setTopic(null); setSource(null); }} className="mohan-rag-overview-card group min-h-36 rounded-2xl p-5 text-left transition"><div className="flex items-start justify-between gap-2"><h4 className="font-semibold text-slate-900">{item.title}</h4><span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700">{count} {count === 1 ? 'source' : 'sources'}</span></div><p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{item.purpose}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">Browse topics <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span></button>;
      })}</div>}

      {activeModule && !topic && !loading && <section className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">Topics in {activeModule.title}</h3><p className="text-sm text-slate-500">{moduleSources.length} saved sources · topics are based on source metadata.</p></div><button type="button" onClick={() => setModuleId(null)} className="rounded-lg px-3 py-2 text-sm font-semibold">All libraries</button></div>{topics.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{topics.map((item, index) => {
        const count = moduleSources.filter(sourceItem => (sourceItem.topic.trim() || 'Uncategorized') === item).length;
        return (
          <div key={item} data-tone={toneFor(index)} className="mohan-rag-overview-card group rounded-2xl p-4 text-left transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-slate-900">{item}</h4>
                <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600">{count}</span>
              </div>
              <button
                type="button"
                onClick={() => setTopic(item)}
                className="mt-2 text-xs font-semibold text-slate-600 hover:text-emerald-900 block text-left"
              >
                Open sources in this topic →
              </button>
            </div>
            {onForwardToPipeline && (
              <button
                type="button"
                onClick={async () => {
                  const matching = moduleSources.filter(sourceItem => (sourceItem.topic.trim() || 'Uncategorized') === item);
                  matching.sort((a, b) => ((b as any).content?.length || 0) - ((a as any).content?.length || 0));
                  const first = matching[0];
                  if (first) {
                    let textContent = '';
                    try {
                      const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${first.id}`, { headers: { Authorization: `Bearer ${token}` } });
                      const d = await readManagementApiJson(res);
                      textContent = d.source?.content || '';
                    } catch {}
                    const clean = textContent.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
                    onForwardToPipeline({
                      text: clean,
                      topic: item,
                      workshop: activeModule?.id || 'level1',
                      language: first.language === 'auto' ? 'mr' : first.language,
                    });
                  }
                }}
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-emerald-700 hover:bg-emerald-600 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>🚀 Forward Topic to Spell Check & Grammar</span>
              </button>
            )}
          </div>
        );
      })}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">{langFilter === 'all' ? 'No sources have been added to this library yet.' : `No sources tagged ${langFilter.toUpperCase()} are in this library. Sources tagged AUTO are not included in language-specific filters.`}</div>}</section>}

      {activeModule && topic && !source && !loading && (
        <section className="space-y-4">
          {/* Master Topic Synthesis Banner Card */}
          <div className="rounded-2xl border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-700 px-2.5 py-0.5 text-xs font-black uppercase text-white shadow-xs">
                    {activeModule.title}
                  </span>
                  <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                    ⏱️ ~{Math.max(5, Math.round(topicSources.reduce((acc, s) => acc + (s.contentLength || 0), 0) / 1000 * 0.75))} mins total
                  </span>
                </div>
                <h3 className="mt-1 text-xl font-black text-slate-900">
                  Topic: {topic}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Multi-Source Synthesizer: Combines unique stories and emotional nuances across Marathi, Hindi & English into 27-Language Master Blueprints.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isSynthesizing}
                  onClick={() => handleSynthesizeTopic(topic)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Synthesize all language sources for this topic and produce verified 27-language scripts"
                >
                  {isSynthesizing ? <Loader2 className="h-4 w-4 animate-spin text-yellow-300" /> : <Sparkles className="h-4 w-4 text-yellow-300" />}
                  <span>{isSynthesizing ? 'Synthesizing 27 Languages...' : '⚡ Synthesize & Auto-Translate into 27 Languages'}</span>
                </button>

                <button type="button" onClick={() => setTopic(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                  All topics
                </button>
              </div>
            </div>

            {/* Language Availability Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-100">
              <span className="text-[11px] font-bold text-slate-600">Available In:</span>
              {Array.from(new Set(topicSources.map(s => s.language?.toLowerCase() || 'auto'))).map(lang => (
                <span key={lang} className="rounded-md bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[11px] font-extrabold text-emerald-900">
                  {lang === 'mr' ? '🚩 Marathi' : lang === 'hi' ? '🕉️ Hindi' : lang === 'en' ? '🇬🇧 English' : lang.toUpperCase()}
                </span>
              ))}
              <span className="text-[11px] text-slate-500">
                · {topicSources.length} lecture recording(s) cataloged
              </span>
            </div>

            {synthesisMsg && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-100/70 p-3 text-xs font-bold text-emerald-950 flex items-center justify-between">
                <span>{synthesisMsg}</span>
                <button type="button" onClick={() => setSynthesisMsg('')} className="text-emerald-800 font-black ml-2 hover:underline">Dismiss</button>
              </div>
            )}
          </div>

          {/* Sequential One-by-One Source Cards List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Individual Lecture Recordings ({topicSources.length})
              </h4>
              <button
                type="button"
                disabled={isAutoFixing}
                onClick={() => handleAutoFixBatch(5)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-600 transition"
              >
                {isAutoFixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-yellow-300" />}
                <span>Auto-Fix Outline Videos</span>
              </button>
            </div>

            {topicSources.length ? (
              <div className="flex flex-col gap-3">
                {topicSources.map((item, index) => {
                  const cLen = Number(item.contentLength || item.content?.length || 0);
                  const isVideo = Boolean(
                    item.originalFileName?.match(/\.(mp4|mov|webm|mp3|m4a|wav)$/i) ||
                    item.sourceType === 'bunny_stream' ||
                    item.sourceType === 'youtube' ||
                    item.sourceType === 'mp4'
                  );
                  const isOutline = isVideo && cLen < 900;

                  return (
                    <div
                      key={item.id}
                      data-tone={toneFor(index)}
                      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div onClick={() => openSource(item)} className="cursor-pointer flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                            item.language === 'mr' ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : item.language === 'hi' ? 'bg-orange-100 text-orange-900 border border-orange-300'
                              : item.language === 'en' ? 'bg-sky-100 text-sky-900 border border-sky-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}>
                            {item.language === 'mr' ? '🚩 Marathi' : item.language === 'hi' ? '🕉️ Hindi' : item.language === 'en' ? '🇬🇧 English' : item.language.toUpperCase()}
                          </span>

                          {isVideo && (
                            isOutline ? (
                              <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-black uppercase">⚠️ PDF Outline</span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase">✅ Audio ({(cLen / 1000).toFixed(1)}k chars)</span>
                            )
                          )}

                          <StatusPill muted>{item.status}</StatusPill>
                        </div>

                        <h4 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-emerald-900 transition">
                          {item.title}
                        </h4>

                        <p className="text-xs text-slate-500">
                          📁 {item.originalFileName || 'Text source'} · ⏱️ ~{Math.max(1, Math.round(cLen / 750))} mins speech · {item.sourceType}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => openSource(item)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          👁️ View Text
                        </button>

                        {isOutline && (
                          <button
                            type="button"
                            disabled={isAutoFixing}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutoFixSingle(item.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="AI Worker: Transcribe real video audio"
                          >
                            {isAutoFixing && autoFixingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-amber-300" />}
                            <span>{isAutoFixing && autoFixingId === item.id ? 'Fixing...' : '⚡ Auto-Fix Audio'}</span>
                          </button>
                        )}

                        {onForwardToPipeline && (
                          <button
                            type="button"
                            onClick={async () => {
                              let textContent = '';
                              try {
                                const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                const d = await readManagementApiJson(res);
                                textContent = d.source?.content || '';
                              } catch {}
                              const clean = textContent.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
                              onForwardToPipeline({
                                text: clean,
                                topic: item.topic,
                                workshop: item.moduleId,
                                language: item.language === 'auto' ? 'mr' : item.language,
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-sky-700 hover:bg-sky-800 px-3 py-1.5 text-xs font-black text-white shadow-xs transition active:scale-95 cursor-pointer"
                            title="Forward text to Spell Check and Verb-Only Grammar Corrector"
                          >
                            🚀 Correct & Grammar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLibrarySource(item.id, item.title);
                          }}
                          className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 transition cursor-pointer"
                          title="Delete this source from library"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                {langFilter === 'all'
                  ? 'No sources have been added to this topic yet.'
                  : `No sources tagged ${langFilter.toUpperCase()} are in this topic. Click '⚡ Synthesize & Auto-Translate into 27 Languages' to auto-generate from original Marathi/Hindi recordings.`}
              </p>
            )}
          </div>
        </section>
      )}

      {detailedSource && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-violet-50 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{activeModule?.title} · {topic}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{detailedSource.title}</h3><p className="mt-1 text-xs text-slate-500">{detailedSource.originalFileName || 'Text source'} · {detailedSource.status} · {detailedSource.language.toUpperCase()}</p></div>
            <div className="flex items-center gap-2 flex-wrap">
              {onForwardToPipeline && (
                <button
                  type="button"
                  onClick={() => onForwardToPipeline({
                    text: plainText,
                    topic: detailedSource.topic,
                    workshop: detailedSource.moduleId,
                    language: detailedSource.language === 'auto' ? 'mr' : detailedSource.language,
                  })}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-xs font-black text-white shadow-md hover:from-emerald-500 hover:to-teal-600 transition active:scale-95 cursor-pointer"
                >
                  <span>🚀 Forward to Spell Check & Grammar Pipeline</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDeleteLibrarySource(detailedSource.id, detailedSource.title)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 px-3.5 py-2 text-xs font-bold text-red-700 shadow-xs transition active:scale-95 cursor-pointer"
                title="Permanently delete this source from library"
              >
                <span>🗑️</span>
                <span>Delete</span>
              </button>
              <button type="button" onClick={clearSource} className="rounded-lg px-3 py-2 text-sm font-semibold">Back to sources</button>
            </div>
          </div>
          {isDummyOrPdfData && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-amber-100/70 to-orange-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 font-black text-xl shadow">⚠️</div>
                <div>
                  <h4 className="text-sm font-black text-amber-950">PDF Outline Detected in Video Record ({detailedSource.content.length} characters)</h4>
                  <p className="mt-0.5 text-xs font-medium text-amber-800">
                    This video source currently contains brief syllabus/PDF notes instead of authentic spoken video speech.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isAutoFixing}
                onClick={() => handleAutoFixSingle(detailedSource.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 text-xs font-black text-white shadow-md hover:from-emerald-500 hover:to-teal-600 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isAutoFixing && autoFixingId === detailedSource.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-300" />}
                <span>{isAutoFixing && autoFixingId === detailedSource.id ? 'AI Worker Transcribing Real Video...' : '⚡ AI Worker: Transcribe & Auto-Fix Real Video Speech'}</span>
              </button>
            </div>
          )}
          {autoFixMsg && (
            <p className="mt-2 rounded-lg bg-emerald-100 p-2.5 text-xs font-bold text-emerald-900 border border-emerald-300">{autoFixMsg}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-amber-950">Active Language:</span>
              <span className="rounded-full bg-amber-200 border border-amber-300 px-3 py-0.5 text-xs font-extrabold text-amber-950 uppercase">{detailedSource.language}</span>
              <span className="text-xs text-amber-800">(If lecture is in Hindi or mixed, standardize below):</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isFixingLang}
                onClick={() => handleLanguageAction('hi', 'standardize')}
                className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                {isFixingLang ? 'Processing...' : '✨ Clean & Standardize to Hindi'}
              </button>
              <button
                type="button"
                disabled={isFixingLang}
                onClick={() => handleLanguageAction('mr', 'standardize')}
                className="rounded-lg bg-orange-700 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-orange-600 disabled:opacity-50"
              >
                {isFixingLang ? 'Processing...' : '🚩 Clean & Standardize to Marathi'}
              </button>
              <button
                type="button"
                disabled={isFixingLang}
                onClick={() => handleLanguageAction('hi', 'reassign')}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tag HI
              </button>
              <button
                type="button"
                disabled={isFixingLang}
                onClick={() => handleLanguageAction('mr', 'reassign')}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tag MR
              </button>
            </div>
          </div>
          {filterMsg && (
            <p className="mt-2 rounded-lg bg-emerald-100 p-2.5 text-xs font-semibold text-emerald-900 border border-emerald-200">{filterMsg}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" aria-pressed={view === 'plain'} onClick={() => setView('plain')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === 'plain' ? 'ring-2 ring-emerald-300' : ''}`}>Plain text</button><button type="button" aria-pressed={view === 'cues'} onClick={() => setView('cues')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === 'cues' ? 'ring-2 ring-violet-300' : ''}`}>Emotion & face cues</button></div></div>
          {view === 'plain' ? <pre lang={detailedSource.language === 'auto' ? undefined : detailedSource.language} className={`max-h-[65vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-7 text-slate-800 ${devanagariFontClass(plainText, detailedSource.language)}`}>{plainText || 'Loading source text…'}</pre> : <div className="space-y-3 p-5">{hasCues ? <><p className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs leading-5 text-violet-900">Cue tags are suggestions inferred from transcript wording. They do not represent measured facial observations from video frames.</p>{parsed?.segments.map(segment => <article key={`${segment.index}-${segment.rawText.slice(0, 24)}`} className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-2 flex flex-wrap gap-2">{segment.emotions.filter(cue => cue.tag !== 'face').map((cue, index) => <span key={`${cue.tag}-${index}`} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{cue.name} · {cue.intensity}%</span>)}{segment.facialExpression && <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900">Face · {segment.facialExpression.replace(/_/g, ' ')}</span>}</div><p lang={detailedSource.language === 'auto' ? undefined : detailedSource.language} className={`whitespace-pre-wrap text-sm leading-6 text-slate-800 ${devanagariFontClass(segment.cleanText, detailedSource.language)}`}>{segment.cleanText}</p></article>)}</> : <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/60 p-8 text-center"><p className="font-semibold text-slate-800">No emotion or face tags in this source</p><p className="mt-1 text-sm text-slate-600">Tags are added to MP3/MP4 transcripts when annotation succeeds. Plain text sources remain untagged unless cues are added manually.</p></div>}</div>}
        </section>}

      {showScanModal && scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white font-bold text-xl">⚡</div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">AI Worker · Video Audio Health Re-Check</h3>
                  <p className="text-xs text-amber-100">Scan results for authentic spoken video recordings in Library</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="rounded-xl p-2 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 border-b border-slate-200 bg-slate-50 p-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Video Records</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{scanResult.videoSources}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-center">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Authentic Spoken Audio</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{scanResult.healthyVideoSources}</p>
              </div>
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-center">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Needs Fix (PDF/Outline)</p>
                <p className="mt-1 text-2xl font-black text-amber-700">{scanResult.needingFixSources}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Video Sources List</h4>
                {scanResult.needingFixSources > 0 && (
                  <button
                    type="button"
                    disabled={isAutoFixing}
                    onClick={() => handleAutoFixBatch(5)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-xs font-black text-white shadow hover:from-emerald-500 hover:to-teal-600 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isAutoFixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-300" />}
                    <span>{isAutoFixing ? 'Auto-Fixing in Background...' : '⚡ Auto-Fix Next 5 Sources (Batch AI Worker)'}</span>
                  </button>
                )}
              </div>

              {scanResult.sources.map((s: any) => (
                <div
                  key={s.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition ${
                    s.needsFix
                      ? 'border-amber-300 bg-amber-50/60'
                      : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        s.needsFix ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {s.needsFix ? '⚠️ Needs Fix' : '✅ Authentic Audio'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{s.moduleId} · {s.language}</span>
                      <span className="text-[10px] text-slate-400">({s.contentLength} chars)</span>
                    </div>
                    <h5 className="mt-1 text-sm font-bold text-slate-900">{s.title}</h5>
                    <p className="mt-0.5 text-xs text-slate-600">{s.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.needsFix ? (
                      <button
                        type="button"
                        disabled={isAutoFixing}
                        onClick={() => handleAutoFixSingle(s.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm transition disabled:opacity-50 cursor-pointer active:scale-95"
                      >
                        {isAutoFixing && autoFixingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        <span>{isAutoFixing && autoFixingId === s.id ? 'Fixing...' : 'Fix Now'}</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">AI Worker transcribes real audio directly from Bunny Video CDN into Bunny Database.</p>
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpellCheckerModule({
  token,
  activeTab,
  sharedLang,
  onLangChange,
  sharedWorkshop,
  onWorkshopChange,
  sharedDay,
  onDayChange,
  sharedTopic,
  onTopicChange,
  sharedText,
  onTextChange,
  onProceedToGrammar,
  onProceedToPlainText,
}: {
  token: string | null;
  activeTab?: LibraryViewTab;
  sharedLang?: string;
  onLangChange?: (l: string) => void;
  sharedWorkshop?: string;
  onWorkshopChange?: (w: string) => void;
  sharedDay?: string;
  onDayChange?: (d: string) => void;
  sharedTopic?: string;
  onTopicChange?: (t: string) => void;
  sharedText?: string;
  onTextChange?: (t: string) => void;
  onProceedToGrammar?: () => void;
  onProceedToPlainText?: () => void;
}) {
  const [selectedLang, setSelectedLang] = useState(sharedLang || 'mr');
  const [langSearch, setLangSearch] = useState('');

  // 2nd Header Navigation State: Workshop, Day, Topic & Active selection
  const [selectedWorkshop, setSelectedWorkshop] = useState(sharedWorkshop || 'all');
  const [selectedDay, setSelectedDay] = useState(sharedDay || 'all');
  const [selectedTopic, setSelectedTopic] = useState(sharedTopic || 'all');

  const [activeWorkshop, setActiveWorkshop] = useState(sharedWorkshop || 'all');
  const [activeDay, setActiveDay] = useState(sharedDay || 'all');
  const [activeTopic, setActiveTopic] = useState(sharedTopic || 'all');

  // Immediately load the complete Master Marathi Corpus by default
  const [text, setText] = useState(() => sharedText || getLibraryCorpusText('mr', 'all', 'all', 'all'));
  const [oldText, setOldText] = useState('');
  const [checkingSpell, setCheckingSpell] = useState(false);
  const [checkingGrammarMode, setCheckingGrammarMode] = useState<'SOV' | 'SVO' | null>(null);
  const [translating, setTranslating] = useState(false);
  const [savingCorpus, setSavingCorpus] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [dbLibraryTopics, setDbLibraryTopics] = useState<Array<{ id: string; label: string; count: number; sourceId?: string }>>([]);
  const [dbSources, setDbSources] = useState<Array<{ id: string; title: string; topic: string; length: number; language: string }>>([]);

  // Dynamically load actual topics and sources from the Library Database for the active language
  useEffect(() => {
    if (!token) return;
    let isCancelled = false;
    const fetchDbTopics = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedWorkshop !== 'all') params.set('module', selectedWorkshop);
        if (selectedLang) params.set('language', selectedLang);
        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`/api/admin/crm/mohan-rag/knowledge${queryStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await readManagementApiJson(res);
        const sources = Array.isArray(data.sources) ? data.sources : [];
        const mappedSources = sources.map((s: any) => ({
          id: String(s.id),
          title: String(s.title || 'Untitled Source'),
          topic: String(s.topic || ''),
          length: Number(s.contentLength || s.content?.length || 0),
          language: String(s.language || selectedLang),
        }));
        const topicMap = new Map<string, { count: number; sourceId: string; maxLen: number }>();
        for (const s of sources) {
          const tName = (s.topic || s.title || 'Uncategorized').trim();
          const sLen = Number(s.contentLength || s.content?.length || 0);
          const existing = topicMap.get(tName);
          if (existing) {
            existing.count += 1;
            if (sLen > existing.maxLen) {
              existing.maxLen = sLen;
              existing.sourceId = s.id;
            }
          } else {
            topicMap.set(tName, { count: 1, sourceId: s.id, maxLen: sLen });
          }
        }
        const topicsList: Array<{ id: string; label: string; count: number; sourceId?: string }> = [];
        for (const [name, meta] of topicMap.entries()) {
          topicsList.push({
            id: name,
            label: name,
            count: meta.count,
            sourceId: meta.sourceId,
          });
        }
        if (!isCancelled) {
          setDbSources(mappedSources);
          setDbLibraryTopics(topicsList);

          // AUTO-LOAD REAL VIDEO LECTURE DATA IF CURRENT TEXT IS STATIC PDF SYLLABUS
          if (!sharedText && sources.length > 0 && selectedTopic === 'all' && (!text || text.includes('सर्व कार्यशाळा व १६ दिवसांचा संपूर्ण अभ्यासक्रम') || text.includes('मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)'))) {
            const realSources = sources.filter((s: any) => Number(s.contentLength || s.content?.length || 0) > 500);
            realSources.sort((a: any, b: any) => Number(b.contentLength || b.content?.length || 0) - Number(a.contentLength || a.content?.length || 0));
            const primarySource = realSources[0] || sources[0];
            if (primarySource) {
              try {
                const sRes = await fetch(`/api/admin/crm/mohan-rag/knowledge/${primarySource.id}`, { headers: { Authorization: `Bearer ${token}` } });
                const sData = await readManagementApiJson(sRes);
                const rawContent = sData.source?.content || '';
                const clean = rawContent.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
                if (clean) {
                  updateWorkingText(clean);
                  setSelectedTopic(`src_${primarySource.id}`);
                  setStatusMsg(`✅ Loaded real lecture "${primarySource.title}" (${clean.length.toLocaleString()} characters) from Library Database.`);
                }
              } catch {}
            }
          }
        }
      } catch {}
    };
    fetchDbTopics();
    return () => { isCancelled = true; };
  }, [token, selectedWorkshop, selectedLang]);

  // Keep internal module state synced when parent pipeline switches tabs or updates props
  useEffect(() => {
    if (sharedLang && sharedLang !== selectedLang) {
      setSelectedLang(sharedLang);
    }
  }, [sharedLang]);

  useEffect(() => {
    if (sharedText !== undefined && sharedText !== text) {
      setText(sharedText);
    }
  }, [sharedText]);

  useEffect(() => {
    if (sharedWorkshop && sharedWorkshop !== selectedWorkshop) {
      setSelectedWorkshop(sharedWorkshop);
      setActiveWorkshop(sharedWorkshop);
    }
  }, [sharedWorkshop]);

  useEffect(() => {
    if (sharedDay && sharedDay !== selectedDay) {
      setSelectedDay(sharedDay);
      setActiveDay(sharedDay);
    }
  }, [sharedDay]);

  useEffect(() => {
    if (sharedTopic && sharedTopic !== selectedTopic) {
      setSelectedTopic(sharedTopic);
      setActiveTopic(sharedTopic);
    }
  }, [sharedTopic]);

  const updateWorkingText = (newVal: string) => {
    setText(newVal);
    if (onTextChange) onTextChange(newVal);
  };

  const workshopOptions = WORKSHOP_OPTIONS;
  const dayOptions = DAY_OPTIONS;
  const topicOptions = TOPIC_OPTIONS;

  const filteredLanguages = ELEARNING_LANGUAGES.filter(lang => {
    if (!langSearch.trim()) return true;
    const q = langSearch.toLowerCase();
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  const SOV_LANGUAGES = ['hi', 'mr', 'kn', 'sa', 'ta', 'te', 'ml', 'gu', 'bn', 'pa', 'or', 'ja', 'ko'];
  const isLanguageSOV = SOV_LANGUAGES.includes(selectedLang.toLowerCase());
  const detectedSyntax: 'SOV' | 'SVO' = isLanguageSOV ? 'SOV' : 'SVO';

  const currentLangObj = ELEARNING_LANGUAGES.find(l => l.code === selectedLang) || ELEARNING_LANGUAGES[0];
  const currentWorkshopLabel = workshopOptions.find(w => w.id === activeWorkshop)?.label || 'All Workshops';
  const currentDayLabel = dayOptions.find(d => d.id === activeDay)?.label || 'All Days';
  const currentTopicList = topicOptions[activeWorkshop] || topicOptions.all;
  const currentDbTopic = dbLibraryTopics.find(t => 
    t.id === activeTopic || 
    t.label === activeTopic || 
    `lib_topic_${t.label}` === activeTopic ||
    activeTopic.replace(/^lib_topic_/, '') === t.label
  );
  const currentTopicLabel = currentDbTopic 
    ? currentDbTopic.label 
    : (currentTopicList.find(t => t.id === activeTopic)?.label || activeTopic || `All Topics (${currentLangObj.name})`);

  const handleLanguageSelect = (code: string) => {
    setSelectedLang(code);
    if (onLangChange) onLangChange(code);
    setOldText(text);
    const newCorpus = getLibraryCorpusText(code, selectedWorkshop, selectedDay, selectedTopic);
    updateWorkingText(newCorpus);
    const langObj = ELEARNING_LANGUAGES.find(l => l.code === code);
    setStatusMsg(`Loaded ${langObj?.name || code} master library corpus.`);
  };

  const handleSelectTopic = async (topicId: string) => {
    setSelectedTopic(topicId);
    setActiveTopic(topicId);
    if (onTopicChange) onTopicChange(topicId);

    // 1. Check if user selected an individual video lecture / source
    const rawSrcId = topicId.startsWith('src_') ? topicId.replace(/^src_/, '') : topicId;
    const directSource = dbSources.find(s => s.id === rawSrcId);
    if (directSource) {
      try {
        setStatusMsg(`Loading "${directSource.title}" from Library Database...`);
        const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${directSource.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await readManagementApiJson(res);
        const raw = d.source?.content || '';
        const clean = raw.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
        if (clean) {
          setOldText(text);
          updateWorkingText(clean);
          setStatusMsg(`✅ Loaded "${directSource.title}" (${Math.round(clean.length / 5)} words) from Library. Ready for Spell Check & AI Grammar!`);
          return;
        }
      } catch (err: any) {
        setStatusMsg(`Failed to load source from library: ${err.message}`);
      }
    }

    // 2. Check if user selected an actual library topic group from Bunny database
    const match = dbLibraryTopics.find(t => 
      t.id === topicId || 
      t.label === topicId || 
      `topic_${t.id}` === topicId ||
      `lib_topic_${t.label}` === topicId ||
      topicId.replace(/^lib_topic_/, '') === t.label
    );
    if (match && match.sourceId) {
      try {
        setStatusMsg(`Loading "${match.label}" from Library Database...`);
        const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${match.sourceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await readManagementApiJson(res);
        const raw = d.source?.content || '';
        const clean = raw.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
        if (clean) {
          setOldText(text);
          updateWorkingText(clean);
          setStatusMsg(`✅ Loaded "${match.label}" (${match.count} sources) from Library. Ready for Spell Check & Grammar!`);
          return;
        }
      } catch (err: any) {
        setStatusMsg(`Failed to load from library: ${err.message}`);
      }
    }

    // 3. If 'all' or no specific source was selected, prioritize the real video lecture data from dbSources!
    if (dbSources.length > 0) {
      const realSources = dbSources.filter(s => s.length > 500);
      realSources.sort((a, b) => b.length - a.length);
      const topSource = realSources[0] || dbSources[0];
      if (topSource) {
        try {
          setStatusMsg(`Loading real lecture "${topSource.title}" from Library Database...`);
          const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${topSource.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const d = await readManagementApiJson(res);
          const raw = d.source?.content || '';
          const clean = raw.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
          if (clean) {
            setOldText(text);
            updateWorkingText(clean);
            setSelectedTopic(`src_${topSource.id}`);
            setStatusMsg(`✅ Loaded real lecture "${topSource.title}" (${clean.length.toLocaleString()} characters) from Library.`);
            return;
          }
        } catch {}
      }
    }

    const newCorpus = getLibraryCorpusText(selectedLang, selectedWorkshop, selectedDay, topicId);
    setOldText(text);
    updateWorkingText(newCorpus);
    const chosenTopic = (topicOptions[selectedWorkshop] || topicOptions.all).find(t => t.id === topicId)?.label || topicId;
    const chosenWorkshop = workshopOptions.find(w => w.id === selectedWorkshop)?.label || selectedWorkshop;
    setStatusMsg(`Loaded "${chosenTopic}" (${chosenWorkshop}) in ${currentLangObj.name}. Previous data archived below.`);
  };

  const handleSubmitNavigation = async () => {
    setActiveWorkshop(selectedWorkshop);
    setActiveDay(selectedDay);
    if (onWorkshopChange) onWorkshopChange(selectedWorkshop);
    if (onDayChange) onDayChange(selectedDay);
    await handleSelectTopic(selectedTopic);
  };

  const handleSaveToCorpus = async () => {
    if (!token || !text.trim()) return;
    setSavingCorpus(true);
    setStatusMsg('Saving to Master Corpus in Bunny Database...');
    try {
      const validModule = ['why', 'level1', 'level2', 'level3', 'general', 'research'].includes(selectedWorkshop)
        ? selectedWorkshop
        : 'level1';
      const res = await fetch('/api/admin/crm/mohan-rag/knowledge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: validModule,
          title: `${currentLangObj.name} - ${currentTopicLabel}`.slice(0, 150),
          topic: currentTopicLabel.slice(0, 150),
          content: text,
          language: ['hi', 'mr', 'en'].includes(selectedLang) ? selectedLang : 'auto',
          sourceReference: `Master Library [${selectedWorkshop} • ${selectedDay} • ${selectedTopic}]`,
        }),
      });
      const data = await readManagementApiJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setStatusMsg(`✅ Successfully saved "${currentTopicLabel}" to Bunny Database!`);
    } catch (err: any) {
      setStatusMsg(`❌ Save notice: ${err.message}`);
    } finally {
      setSavingCorpus(false);
    }
  };

  const handleSpellCheck = async () => {
    if (!token || !text.trim()) return;
    setCheckingSpell(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/proofread', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, language: selectedLang }),
      });
      const data = await readManagementApiJson(res);
      if (!res.ok) throw new Error(data.error || 'Spell check failed');
      if (data.correctedText) {
        setOldText(text);
        updateWorkingText(data.correctedText);
        setStatusMsg(`✅ Spell check completed for ${currentLangObj.name}: orthography & character integrity verified (verbatim vocabulary strictly preserved)`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setCheckingSpell(false);
    }
  };

  const handleGrammarCheck = async (syntax?: 'SOV' | 'SVO') => {
    if (!token || !text.trim()) return;
    const targetSyntax = syntax || detectedSyntax;
    setCheckingGrammarMode(targetSyntax);
    setStatusMsg('');
    try {
      const res = await fetch('/api/avatar/grammar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: selectedLang, syntaxStructure: targetSyntax }),
      });
      const data = await readManagementApiJson(res);
      if (!res.ok) throw new Error(data.error || `${targetSyntax} grammar check failed`);
      const corrected = data.data?.correctedText || data.correctedText || data.corrected;
      if (corrected) {
        setOldText(text);
        updateWorkingText(corrected);
        setStatusMsg(`✅ AI Grammar (${targetSyntax}) applied: ${targetSyntax === 'SOV' ? 'SOV (Subject-Object-Verb) verbs adjusted, nouns/objects untouched' : 'SVO (Subject-Verb-Object) agreement verified, sacred terms preserved'}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setCheckingGrammarMode(null);
    }
  };

  const handleAutoTranslate = async () => {
    if (!text.trim()) return;
    setTranslating(true);
    setStatusMsg(`Auto-converting content to ${currentLangObj.name} (${currentLangObj.nativeName})...`);
    try {
      const res = await fetch('/api/avatar/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: text, targetLang: selectedLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');
      const translated = data.translatedText || data.translatedScript || data.cleanText;
      if (translated) {
        setOldText(text);
        updateWorkingText(translated);
        setStatusMsg(`✅ Auto-converted to ${currentLangObj.name} (${currentLangObj.nativeName}) with sacred terminology preserved`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Translation error: ${err.message}`);
    } finally {
      setTranslating(false);
    }
  };

  const [extractingHummer, setExtractingHummer] = useState(false);

  const handleExtractHummerText = async () => {
    if (!token || !text.trim()) return;
    setExtractingHummer(true);
    setStatusMsg('Extracting genuine voice emotions, pauses & humour annotations for Avatar...');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/hummer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: selectedLang }),
      });
      const data = await readManagementApiJson(res);
      if (!res.ok) throw new Error(data.error || 'Hummer emotion extraction failed');
      if (data.hummerText) {
        setOldText(text);
        setText(data.hummerText);
        setStatusMsg('✅ Emotional Hummer Text generated: genuine voice delivery tags [CALM], [EXPLAINING], [EMPHASIS], [SMILING], [HUMOROUS] added for Avatar training!');
      }
    } catch (err: any) {
      setStatusMsg(`❌ Emotion Extraction Error: ${err.message}`);
    } finally {
      setExtractingHummer(false);
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 130));

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Sidebar: ALL 27+ LANGUAGES */}
      <div className="w-full lg:w-80 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              ALL 27+ LANGUAGES
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {filteredLanguages.length} Languages
          </span>
        </div>

        {/* Search */}
        <div className="relative mt-3 pb-3 border-b border-slate-100">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={langSearch}
            onChange={e => setLangSearch(e.target.value)}
            placeholder="Search Marathi, Hindi, English..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>

        {/* Languages Scrollable List */}
        <div className="mt-3 max-h-72 overflow-y-auto space-y-1 pr-1">
          {filteredLanguages.map(lang => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm shrink-0">{lang.flag}</span>
                  <span className="truncate">
                    {lang.name} <span className={isSelected ? 'text-emerald-100' : 'text-slate-500'}>({lang.nativeName})</span>
                  </span>
                </div>
                {isSelected && <span className="text-white text-xs font-bold shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 w-full space-y-4">
        {/* 2nd Header Navigation: Workshop, Day, Topic & Submit */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Workshop Dropdown */}
            <div className="flex flex-col gap-1 min-w-[150px] flex-1 sm:flex-initial">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <span>📚</span> Workshop Name
              </label>
              <select
                value={selectedWorkshop}
                onChange={e => {
                  setSelectedWorkshop(e.target.value);
                  setSelectedTopic('all');
                }}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {workshopOptions.map(w => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>

            {/* Day Dropdown */}
            <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <span>📅</span> Select Day
              </label>
              <select
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {dayOptions.map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Topic Dropdown */}
            <div className="flex flex-col gap-1 min-w-[200px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <span>🎯</span> Select Topic
              </label>
              <select
                value={selectedTopic}
                onChange={e => handleSelectTopic(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {dbSources.length > 0 && (
                  <optgroup label={`📹 All Saved Video Lectures & Sources (${dbSources.length} from Library)`}>
                    {dbSources.map(s => (
                      <option key={`src_${s.id}`} value={`src_${s.id}`}>
                        {s.title} · {s.topic || 'General'} ({s.length ? `${Math.round(s.length / 5)} words` : 'source'})
                      </option>
                    ))}
                  </optgroup>
                )}
                {dbLibraryTopics.length > 0 && (
                  <optgroup label={`📁 Saved Topic Groups (${dbLibraryTopics.length} groups)`}>
                    {dbLibraryTopics.map(t => (
                      <option key={`topic_${t.id}`} value={`topic_${t.id}`}>
                        📁 {t.label} ({t.count} {t.count === 1 ? 'source' : 'sources'})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="📖 Master Teaching Syllabus Reference">
                  {(topicOptions[selectedWorkshop] || topicOptions.all).map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col gap-1 self-end">
              <label className="text-[10px] font-black uppercase tracking-wider text-transparent select-none hidden sm:block">
                Submit
              </label>
              <button
                type="button"
                onClick={handleSubmitNavigation}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition active:scale-95 shadow-md shadow-emerald-700/25 ring-1 ring-emerald-500 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Submit</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb & Title */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 flex-wrap">
              <span className="text-emerald-700">▶ {currentLangObj.name}</span>
              <span>&gt;</span>
              <span>{currentWorkshopLabel}</span>
              {activeDay !== 'all' && (
                <>
                  <span>&gt;</span>
                  <span>{currentDayLabel}</span>
                </>
              )}
              <span>&gt;</span>
              <span className="text-slate-700">{currentTopicLabel}</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              {currentTopicLabel}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              {wordCount} words • ~{readTime}m
            </span>
            <button
              type="button"
              disabled={savingCorpus}
              onClick={handleSaveToCorpus}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>💾</span>
              <span>{savingCorpus ? 'Saving…' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Master Corpus Box */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Box Header */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Master Teaching Corpus &amp; Lecture Script
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Word-for-word transcript in {currentLangObj.name}. Spoken vocabulary is strictly preserved.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Auto-Convert / Translate button */}
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={translating}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                title={`Auto-convert and dub into ${currentLangObj.name} while preserving verbatim terms`}
              >
                <span>✨</span>
                <span>{translating ? 'Converting...' : `Auto-Convert to ${currentLangObj.name}`}</span>
              </button>

              {/* Spell Check */}
              <button
                type="button"
                onClick={handleSpellCheck}
                disabled={checkingSpell}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>A</span>
                <span>{checkingSpell ? 'Checking...' : 'Spell Check →'}</span>
              </button>

              {/* Intelligent AI Grammar (Auto SVO / SOV based on language) */}
              <button
                type="button"
                onClick={() => handleGrammarCheck()}
                disabled={checkingGrammarMode !== null}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title={`Smart AI Grammar: Automatically uses ${detectedSyntax} for ${currentLangObj.name}`}
              >
                <span>🧠</span>
                <span>{checkingGrammarMode ? 'Checking...' : `AI Grammar (${detectedSyntax}) →`}</span>
              </button>

              {/* Explicit SOV Button (Subject-Object-Verb for Indian languages) */}
              <button
                type="button"
                onClick={() => handleGrammarCheck('SOV')}
                disabled={checkingGrammarMode !== null}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50 ${
                  detectedSyntax === 'SOV'
                    ? 'text-sky-800 bg-sky-100/80 border border-sky-300 ring-1 ring-sky-300'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                }`}
                title="Force SOV (Subject-Object-Verb) for Indian languages (Hindi, Marathi, Kannada) - verb adjusted, nouns untouched"
              >
                <span>SOV</span>
              </button>

              {/* Explicit SVO Button (Subject-Verb-Object for English & Global languages) */}
              <button
                type="button"
                onClick={() => handleGrammarCheck('SVO')}
                disabled={checkingGrammarMode !== null}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50 ${
                  detectedSyntax === 'SVO'
                    ? 'text-indigo-800 bg-indigo-100/80 border border-indigo-300 ring-1 ring-indigo-300'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                }`}
                title="Force SVO (Subject-Verb-Object) for English and foreign languages - verbs adjusted, nouns untouched"
              >
                <span>SVO</span>
              </button>

              {/* Pipeline Stage Navigation: Forward to Next Stages */}
              {onProceedToGrammar && (
                <button
                  type="button"
                  onClick={() => {
                    if (onTextChange) onTextChange(text);
                    onProceedToGrammar();
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 shadow-md shadow-sky-800/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5 ml-1"
                  title="Forward this verified text to AI Grammar stage"
                >
                  <span>Forward to AI Grammar</span>
                  <span>→</span>
                </button>
              )}
              {onProceedToPlainText && (
                <button
                  type="button"
                  onClick={() => {
                    if (onTextChange) onTextChange(text);
                    onProceedToPlainText();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Forward to Plain Text Workspace"
                >
                  <span>Plain Text</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>

          {/* Status notification */}
          {statusMsg && (
            <div className="mx-5 mt-3 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
              <span>{statusMsg}</span>
              <button type="button" onClick={() => setStatusMsg('')} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
            </div>
          )}

          {/* Upper Textarea: Active Working Area */}
          <div className="p-5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
              <span>Active Working &amp; Correction Area</span>
              <span className="text-[10px] text-slate-400 font-normal">Edit directly or run Spell/Grammar AI</span>
            </label>
            <textarea
              rows={8}
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full text-sm font-mono text-slate-800 bg-white border border-slate-200 rounded-xl p-4 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-inner"
              placeholder="Paste or edit lecture transcript here..."
            />
          </div>
        </div>

        {/* Bottom Preview Area: Prior Versions & Master Reference Corpus */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Prior Version &amp; Master Reference Corpus (Bottom Archive)
              </h4>
            </div>
            {oldText && (
              <button
                type="button"
                onClick={() => {
                  const current = text;
                  setText(oldText);
                  setOldText(current);
                  setStatusMsg('Restored previous version to working area');
                }}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <span>↺</span>
                <span>Restore to Working Area</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Whenever you filter, submit, translate, or correct, the previous text automatically archives here so work is never lost.
          </p>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 font-mono leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap select-all">
            {oldText || 'No prior version yet. As soon as you filter, submit, or apply spell/grammar check, the previous text will be displayed here for instant comparison.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeModulePanel({
  module,
  token,
  onOpenInSpellCheck,
}: {
  module: typeof modules[number];
  token: string | null;
  onOpenInSpellCheck?: (source: KnowledgeSourceView) => void;
}) {
  const [sources, setSources] = useState<KnowledgeSourceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [proofreading, setProofreading] = useState(false);
  const [proofreadPreview, setProofreadPreview] = useState('');
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
  const [spellcheckBusyId, setSpellcheckBusyId] = useState('');
  const [ebookDraft, setEbookDraft] = useState<{ sourceId: string; title: string; language: string; content: string } | null>(null);
  const [activeResearchEbookId, setActiveResearchEbookId] = useState('');
  const [researchEbookInlineDrafts, setResearchEbookInlineDrafts] = useState<Record<string, { title: string; language: string; content: string } | null>>({});
  const [researchEbookLoadingId, setResearchEbookLoadingId] = useState('');
  const [researchCopiedId, setResearchCopiedId] = useState('');
  const [activeEbookId, setActiveEbookId] = useState('');
  const [ebookInlineDrafts, setEbookInlineDrafts] = useState<Record<string, { title: string; language: string; content: string } | null>>({});
  const [ebookLoadingId, setEbookLoadingId] = useState('');
  const [fourWorkersBusyId, setFourWorkersBusyId] = useState('');
  const [copiedId, setCopiedId] = useState('');
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

  const proofreadContent = async () => {
    if (!token || !content.trim()) return;
    setProofreading(true); setError(''); setNotice(''); setProofreadPreview('');
    try { setProofreadPreview(await requestProofreadText(content, language, token)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not check spelling'); }
    finally { setProofreading(false); }
  };

  const correctSavedSource = async (source: KnowledgeSourceView) => {
    if (!token) return;
    setSpellcheckBusyId(source.id); setError(''); setNotice('');
    try {
      const changed = await correctAndSaveKnowledgeSource(source.id, token);
      setNotice(changed ? 'Spelling and grammar corrections saved as a draft. Review the text, then approve it again for retrieval.' : 'The checker found no suggested changes.');
      if (changed && previewId === source.id) { setPreviewId(''); setPreviewText(''); }
      await loadSources();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not correct source text'); }
    finally { setSpellcheckBusyId(''); }
  };

  const importSourceFile = async (file?: File) => {
    if (!file || !token) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const maxVideoUploadBytes = 5 * 1024 * 1024 * 1024;
    if (file.size > maxVideoUploadBytes) { setImportError('MP4 and MP3 uploads must be 5 GB or smaller; PDF and Word files must be 150 MB or smaller.'); return; }
    if (file.size > 150 * 1024 * 1024 && (!['mp4', 'mp3', 'm4a', 'webm', 'mov', 'wav'].includes(extension || '') || module.id === 'research')) {
      setImportError('PDF, Word, and research report imports must be 150 MB or smaller. Media up to 5 GB can be streamed to Bunny and queued from a knowledge library.'); return;
    }
    if (module.id === 'research' && !sourceReference.trim()) {
      setImportError('Enter the research source citation or URL before importing.');
      return;
    }
    setImporting(true); setImportError(''); setImportMessage(''); setProofreadPreview('');
    try {
      if (file.size > 150 * 1024 * 1024) {
        const params = new URLSearchParams({
          module: module.id, topic, language, fileName: file.name,
          title: title.trim() || file.name.replace(/\.[^.]+$/, ''), size: String(file.size),
        });
        setImportMessage('Streaming original media to Bunny; MP4 audio will be converted to MP3 in the overnight transcription job…');
        const queuedResponse = await fetch(`/api/admin/crm/mohan-rag/ingestion/upload?${params}`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream' }, body: file,
        });
        const queued = await readManagementApiJson(queuedResponse);
        if (!queuedResponse.ok) throw new Error(queued.error || 'Could not upload and queue large media');
        setImportMessage(`${queued.message} Check Ingestion & Jobs for progress; the completed transcript will appear as a review draft.`);
        return;
      }
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
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not import source');
      const imported = data.source as KnowledgeSourceView | null;
      if (!imported || typeof imported.id !== 'string' || !imported.id) {
        await loadSources();
        throw new Error('The file was processed, but the server did not return its saved source record. Check the Library before uploading it again.');
      }
      setEditingId(imported.id); setTitle(imported.title); setContent(imported.content || ''); setTopic(imported.topic || ''); setSourceReference(imported.sourceReference || ''); setLanguage(imported.language || 'auto');
      const cueNote = data.avatarCuesAdded ? ' Avatar emotion and face-expression suggestions were added for the clone; these are transcript-based suggestions, not measured facial observations.' : data.avatarCueWarning ? ` ${data.avatarCueWarning}` : '';
      const correctionNote = data.transcriptCorrectionApplied ? ' Transcript was proofread in the selected language without translation.' : data.transcriptCorrectionWarning ? ` ${data.transcriptCorrectionWarning}` : '';
      const pdfCoverage = formatPdfPageCoverage(data.pdfPageStats);
      let proofreadNote = '';
      if ((extension === 'pdf' || extension === 'docx') && imported.content) {
        setProofreading(true);
        setImportMessage('Text imported. Checking all words, Hindi spelling, and PDF line breaks; the original stays unchanged until you apply the preview…');
        try {
          const suggestion = await requestProofreadText(imported.content, language, token);
          if (suggestion.trim() !== imported.content.trim()) {
            setProofreadPreview(suggestion);
            proofreadNote = ' A full spelling correction preview is ready below the editor. Review it and choose whether to apply it.';
          } else proofreadNote = ' The checker found no suggested spelling changes.';
        } catch (cause) {
          proofreadNote = ` Spell check could not finish: ${cause instanceof Error ? cause.message : 'unknown error'}. You can run Check spelling manually.`;
        } finally { setProofreading(false); }
      }
      setImportMessage(`${data.extractedCharacters.toLocaleString()} characters extracted.${pdfCoverage}${correctionNote}${proofreadNote}${cueNote} Review the text below, then save corrections and approve it for retrieval.`);
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
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not load extracted text');
      setPreviewId(source.id); setPreviewText(data.source.content || 'No extracted text is stored for this source.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load extracted text'); }
  };

  const createEbookDraft = async (source: KnowledgeSourceView) => {
    if (!token) return;
    setEbookBusyId(source.id); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${source.id}/ebook`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceLanguage: source.language !== 'auto' ? source.language : ebookSourceLanguage, targetLanguage: ebookTargetLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create e-book chapter');
      const draftObj = { sourceId: source.id, title: data.sourceTitle || source.title, language: data.draft.language, content: data.draft.content };
      setEbookDraft(draftObj);
      setEbookInlineDrafts(prev => ({ ...prev, [source.id]: draftObj }));
      setActiveEbookId(source.id);
      setNotice('E-book chapter draft created and saved. Review it before publishing.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create e-book chapter'); }
    finally { setEbookBusyId(''); }
  };

  const viewSavedEbookDraft = async (source: KnowledgeSourceView) => {
    if (!token) return;
    if (activeEbookId === source.id) {
      setActiveEbookId('');
      return;
    }
    setActiveEbookId(source.id);
    setEbookLoadingId(source.id);
    setError('');
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${source.id}/ebook`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load e-book drafts');
      const latest = data.drafts?.[0];
      if (!latest) {
        setNotice(`Generating initial E-book chapter for "${source.title}"…`);
        await createEbookDraft(source);
        return;
      }
      const draftObj = { sourceId: source.id, title: source.title, language: latest.language, content: latest.content };
      setEbookDraft(draftObj);
      setEbookInlineDrafts(prev => ({ ...prev, [source.id]: draftObj }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load e-book drafts');
    } finally {
      setEbookLoadingId('');
    }
  };

  const deleteEbookDraft = async (sourceId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this saved E-book chapter?')) return;
    setEbookBusyId(sourceId);
    setError('');
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${sourceId}/ebook`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete e-book');
      setEbookInlineDrafts(prev => {
        const next = { ...prev };
        delete next[sourceId];
        return next;
      });
      if (activeEbookId === sourceId) setActiveEbookId('');
      if (ebookDraft?.sourceId === sourceId) setEbookDraft(null);
      setNotice('E-book chapter deleted successfully.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete e-book');
    } finally {
      setEbookBusyId('');
    }
  };

  const triggerSourceFourWorkers = async (source: KnowledgeSourceView) => {
    if (!token) return;
    setFourWorkersBusyId(source.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/four-workers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_single', sourceId: source.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to run 4-worker pipeline');
      setNotice(`✅ 4-Worker Pipeline successfully transcribed and distributed "${source.title}" everywhere! (${data.report?.worker1_conversion?.charCount || 0} characters)`);
      if (data.report?.worker1_conversion?.text) {
        setPreviewText(data.report.worker1_conversion.text);
      }
      await loadSources();
    } catch (err: any) {
      setError(err.message || 'Pipeline execution failed');
    } finally {
      setFourWorkersBusyId('');
    }
  };

  const copyInlineEbook = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2500);
    } catch {}
  };

  const downloadInlineDraft = (draft: { title: string; language: string; content: string }) => {
    const blob = new Blob([`# ${draft.title}\n\n${draft.content}\n`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${draft.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-${draft.language}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadEbookDraft = () => {
    if (!ebookDraft) return;
    downloadInlineDraft(ebookDraft);
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Add or import a source</h3><p className="mt-1 text-xs text-slate-500">PDF and Word files up to 150 MB are extracted here. MP4 and MP3 media up to 5 GB stream to Bunny; large videos are converted to MP3 in the overnight job, transcribed in segments with emotion and face cues, then added as a review draft.</p></div><StatusPill muted>Text + file sources</StatusPill></div>
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
        <div className="text-xs text-slate-700 md:col-span-2"><div className="mb-1.5 flex flex-wrap items-center justify-between gap-2"><label htmlFor="mohan-rag-source-content">Approved teaching text</label><button type="button" onClick={proofreadContent} disabled={proofreading || !content.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 disabled:opacity-50"><SpellCheck className="h-3.5 w-3.5" />{proofreading ? 'Checking all words…' : 'Check all words'}</button></div><textarea id="mohan-rag-source-content" lang={language === 'auto' ? undefined : language} spellCheck value={content} onChange={event => { setContent(event.target.value); setProofreadPreview(''); }} rows={8} maxLength={500_000} className={`w-full resize-y rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus:border-yellow-400/50 ${devanagariFontClass(content, language)}`} placeholder="Paste or write the source material. Keep source-specific teachings together." />{proofreadPreview && <SpellcheckReview text={proofreadPreview} language={language} onDiscard={() => setProofreadPreview('')} onApply={() => { setContent(proofreadPreview); setProofreadPreview(''); setNotice('Corrected text applied to the editor. Review it and save when ready.'); }} />}</div>
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
            <div className="flex flex-wrap gap-2">
              <button onClick={() => togglePreview(source)} className="rounded-md border border-violet-200 px-2.5 py-1.5 text-xs text-violet-900 hover:bg-violet-50">{previewId === source.id ? 'Hide text' : 'View extracted text'}</button>
              <button
                disabled={Boolean(spellcheckBusyId)}
                onClick={() => {
                  if (onOpenInSpellCheck) {
                    onOpenInSpellCheck(source);
                  } else {
                    correctSavedSource(source);
                  }
                }}
                className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                title="Open directly in Spell Check & AI Grammar Workspace"
              >
                <SpellCheck className="mr-1 inline h-3.5 w-3.5" />
                {spellcheckBusyId === source.id ? 'Correcting…' : 'Correct spelling & grammar →'}
              </button>
              {source.originalFileUrl && <a href={source.originalFileUrl} target="_blank" rel="noreferrer" className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs text-slate-700">Open original</a>}
              <button onClick={() => sourceAction(source, 'edit')} className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900">Edit</button>
              {source.status !== 'approved' && <button onClick={() => sourceAction(source, 'approved')} className="rounded-md border border-emerald-300 px-2.5 py-1.5 text-xs text-emerald-800 hover:bg-emerald-900/30">Approve</button>}
              {source.status !== 'rejected' && <button onClick={() => sourceAction(source, 'rejected')} className="rounded-md border border-yellow-300 px-2.5 py-1.5 text-xs text-yellow-800 hover:bg-yellow-900/30">Reject</button>}
              <button
                onClick={() => sourceAction(source, 'delete')}
                className="rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 flex items-center gap-1 cursor-pointer transition shadow-xs"
                title={`Delete ${source.title}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                Delete
              </button>
            </div>
          </div>
          {previewId === source.id && (
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
              {/* Worker 2 Quality Warning Banner if Dummy / Outline */}
              {(previewText.length < 600 || (previewText.startsWith('Title: ') && previewText.includes('Video Duration:')) || (previewText.includes('[00:00–01:00]') && previewText.includes('[10:00–11:00]') && previewText.length < 2000)) && (
                <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900">⚠️ Worker 2 Alert: Needs Real Spoken Audio Transcription</p>
                      <p className="text-amber-800 text-[11px] mt-0.5">
                        This source contains only brief catalog metadata or outline placeholders ({previewText.length} characters). Real spoken lecture speech has not been transcribed yet.
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={fourWorkersBusyId === source.id}
                    onClick={() => triggerSourceFourWorkers(source)}
                    className="rounded-lg bg-gradient-to-r from-amber-500 to-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:from-amber-400 hover:to-emerald-500 transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {fourWorkersBusyId === source.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {fourWorkersBusyId === source.id ? 'Running 4-Worker Pipeline...' : '⚡ Run 4-Worker Pipeline (Convert & Distribute Everywhere)'}
                  </button>
                </div>
              )}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-violet-950">Extracted source text</p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={fourWorkersBusyId === source.id}
                    onClick={() => triggerSourceFourWorkers(source)}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    {fourWorkersBusyId === source.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                    {fourWorkersBusyId === source.id ? 'Processing...' : 'Run 4-Worker Pipeline'}
                  </button>
                  <button
                    disabled={Boolean(spellcheckBusyId)}
                    onClick={() => { if (onOpenInSpellCheck) onOpenInSpellCheck(source); else correctSavedSource(source); }}
                    className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    <SpellCheck className="mr-1 inline h-3.5 w-3.5" />
                    {spellcheckBusyId === source.id ? 'Correcting…' : 'Correct spelling & grammar →'}
                  </button>
                </div>
              </div>
              <pre lang={source.language === 'auto' ? undefined : source.language} className={`max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-violet-200 bg-emerald-50 p-4 text-xs leading-6 text-slate-700 ${devanagariFontClass(previewText, source.language)}`}>
                {previewText}
              </pre>
            </div>
          )}
          {activeEbookId === source.id && (
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
              {ebookLoadingId === source.id ? (
                <div className="flex items-center gap-2 py-3 text-xs font-semibold text-violet-900">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-700 border-t-transparent" />
                  Checking saved e-book drafts for this source…
                </div>
              ) : ebookInlineDrafts[source.id] ? (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-violet-200/60 pb-3">
                    <div>
                      <h4 className="font-bold text-violet-950">📖 E-Book Chapter · {ebookInlineDrafts[source.id]?.title}</h4>
                      <p className="mt-0.5 text-xs text-violet-700">Language: <span className="font-semibold uppercase">{ebookInlineDrafts[source.id]?.language}</span> · Grounded authentic Swar Yoga teaching</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => copyInlineEbook(source.id, ebookInlineDrafts[source.id]!.content)}
                        className="rounded-lg border border-violet-300 bg-white px-2.5 py-1 text-xs font-semibold text-violet-900 shadow-2xs hover:bg-violet-50"
                      >
                        {copiedId === source.id ? '✓ Copied' : 'Copy text'}
                      </button>
                      <button
                        onClick={() => downloadInlineDraft(ebookInlineDrafts[source.id]!)}
                        className="rounded-lg bg-violet-700 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-violet-800"
                      >
                        Download Markdown
                      </button>
                      <button
                        onClick={() => deleteEbookDraft(source.id)}
                        disabled={ebookBusyId === source.id}
                        className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 shadow-2xs hover:bg-red-100 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        title="Delete this saved E-book chapter"
                      >
                        <span>🗑️</span>
                        <span>{ebookBusyId === source.id ? 'Deleting…' : 'Delete E-Book'}</span>
                      </button>
                      <button
                        onClick={() => setActiveEbookId('')}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <pre
                    lang={ebookInlineDrafts[source.id]?.language}
                    className={`max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-violet-200 bg-white p-4 text-xs leading-6 text-slate-800 shadow-inner ${devanagariFontClass(ebookInlineDrafts[source.id]?.content || '', ebookInlineDrafts[source.id]?.language)}`}
                  >
                    {ebookInlineDrafts[source.id]?.content}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                  <div>
                    <h4 className="text-xs font-bold text-violet-950">No saved e-book chapter for this source yet.</h4>
                    <p className="mt-1 text-[11px] text-violet-700">
                      Convert this approved lecture into a publication-ready Swar Yoga book chapter with the click of a button.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={ebookBusyId === source.id}
                      onClick={() => createEbookDraft(source)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-violet-700 hover:to-purple-700 active:scale-95 disabled:opacity-50"
                    >
                      {ebookBusyId === source.id ? '⚡ Generating Chapter…' : '⚡ Generate E-Book Chapter Now'}
                    </button>
                    <button
                      onClick={() => setActiveEbookId('')}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
  contentLength?: number;
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
  const [proofreading, setProofreading] = useState(false);
  const [proofreadPreview, setProofreadPreview] = useState('');
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
  const [spellcheckBusyId, setSpellcheckBusyId] = useState('');
  const [ebookDraft, setEbookDraft] = useState<{ sourceId: string; title: string; language: string; content: string } | null>(null);
  const [activeResearchEbookId, setActiveResearchEbookId] = useState('');
  const [researchEbookInlineDrafts, setResearchEbookInlineDrafts] = useState<Record<string, { title: string; language: string; content: string } | null>>({});
  const [researchEbookLoadingId, setResearchEbookLoadingId] = useState('');
  const [researchCopiedId, setResearchCopiedId] = useState('');

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

  const proofreadContent = async () => {
    if (!token || !content.trim()) return;
    setProofreading(true); setError(''); setNotice(''); setProofreadPreview('');
    try { setProofreadPreview(await requestProofreadText(content, language, token)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not check spelling'); }
    finally { setProofreading(false); }
  };

  const correctSavedReport = async (report: ResearchReportSource) => {
    if (!token) return;
    setSpellcheckBusyId(report.id); setError(''); setNotice('');
    try {
      const changed = await correctAndSaveKnowledgeSource(report.id, token);
      setNotice(changed ? 'Spelling and grammar corrections saved as a draft. Review the report, then approve it again.' : 'The checker found no suggested changes.');
      await loadReports();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not correct report text'); }
    finally { setSpellcheckBusyId(''); }
  };

  const importResearchFile = async (file?: File) => {
    if (!file || !token) return;
    if (file.size > 150 * 1024 * 1024) { setImportError('Research report imports must be smaller than 150 MB.'); return; }
    if (!sourceReference.trim()) {
      setImportError('Enter the research source citation or URL before importing.');
      return;
    }
    setImporting(true); setImportError(''); setImportMessage(''); setProofreadPreview('');
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
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not import research source');
      const imported = data.source as ResearchReportSource | null;
      if (!imported || typeof imported.id !== 'string' || !imported.id) {
        await loadReports();
        throw new Error('The file was processed, but the server did not return its saved research record. Refresh the research list before uploading it again.');
      }
      setSelected(imported); setTitle(imported.title); setTopic(imported.topic || ''); setSourceReference(imported.sourceReference || ''); setLanguage(imported.language || 'en'); setContent(imported.content || '');
      const cueNote = data.avatarCuesAdded ? ' Avatar delivery and face-expression suggestions were added from transcript wording, not measured from video frames.' : data.avatarCueWarning ? ` ${data.avatarCueWarning}` : '';
      const correctionNote = data.transcriptCorrectionApplied ? ' Transcript was proofread in the selected language without translation.' : data.transcriptCorrectionWarning ? ` ${data.transcriptCorrectionWarning}` : '';
      const pdfCoverage = formatPdfPageCoverage(data.pdfPageStats);
      let proofreadNote = '';
      if ((extension === 'pdf' || extension === 'docx') && imported.content) {
        setProofreading(true);
        setImportMessage('Research text imported. Checking all words, Hindi spelling, and PDF line breaks; the original stays unchanged until you apply the preview…');
        try {
          const suggestion = await requestProofreadText(imported.content, language, token);
          if (suggestion.trim() !== imported.content.trim()) {
            setProofreadPreview(suggestion);
            proofreadNote = ' A full spelling correction preview is ready below the editor. Review it and choose whether to apply it.';
          } else proofreadNote = ' The checker found no suggested spelling changes.';
        } catch (cause) {
          proofreadNote = ` Spell check could not finish: ${cause instanceof Error ? cause.message : 'unknown error'}. You can run Check spelling manually.`;
        } finally { setProofreading(false); }
      }
      setImportMessage(`${data.extractedCharacters.toLocaleString()} characters extracted.${pdfCoverage}${correctionNote}${proofreadNote}${cueNote} Verify the citation and review the text before approval.`);
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
      const draftObj = { sourceId: report.id, title: data.sourceTitle || report.title, language: data.draft.language, content: data.draft.content };
      setEbookDraft(draftObj);
      setResearchEbookInlineDrafts(prev => ({ ...prev, [report.id]: draftObj }));
      setActiveResearchEbookId(report.id);
      setNotice('E-book chapter draft created and saved. Review it before publishing.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create e-book chapter'); }
    finally { setEbookBusyId(''); }
  };

  const viewResearchEbookDraft = async (report: ResearchReportSource) => {
    if (!token) return;
    if (activeResearchEbookId === report.id) {
      setActiveResearchEbookId('');
      return;
    }
    setActiveResearchEbookId(report.id);
    setResearchEbookLoadingId(report.id);
    setError('');
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/knowledge/${report.id}/ebook`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load e-book drafts');
      const latest = data.drafts?.[0];
      if (!latest) {
        setResearchEbookInlineDrafts(prev => ({ ...prev, [report.id]: null }));
        return;
      }
      const draftObj = { sourceId: report.id, title: report.title, language: latest.language, content: latest.content };
      setEbookDraft(draftObj);
      setResearchEbookInlineDrafts(prev => ({ ...prev, [report.id]: draftObj }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load e-book drafts');
    } finally {
      setResearchEbookLoadingId('');
    }
  };

  const copyResearchInlineEbook = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setResearchCopiedId(id);
      setTimeout(() => setResearchCopiedId(''), 2500);
    } catch {}
  };

  const downloadResearchInlineDraft = (draft: { title: string; language: string; content: string }) => {
    const blob = new Blob([`# ${draft.title}\n\n${draft.content}\n`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${draft.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-${draft.language}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
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
    <section className="rounded-2xl border border-emerald-200 bg-white p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{selected ? 'Edit research draft' : 'Add research draft'}</h3><p className="mt-1 text-xs text-slate-500">Editing an approved report returns it to draft review.</p></div>{selected && <button onClick={clearForm} className="text-xs text-slate-700 underline">Cancel edit</button>}</div><div className="grid gap-3 md:grid-cols-2"><label className="text-xs text-slate-700">Report title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={300} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="Research report title" /></label><label className="text-xs text-slate-700">Topic<input value={topic} onChange={event => setTopic(event.target.value)} maxLength={300} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="e.g. PCOD" /></label><label className="text-xs text-slate-700">Source citation<input value={sourceReference} onChange={event => setSourceReference(event.target.value)} maxLength={1000} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="Author · date · journal · DOI / URL" /></label><label className="text-xs text-slate-700">Report language<select value={language} onChange={event => setLanguage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option></select></label><div className="text-xs text-slate-700 md:col-span-2"><div className="mb-1.5 flex flex-wrap items-center justify-between gap-2"><label htmlFor="mohan-rag-research-content">Research report</label><button type="button" onClick={proofreadContent} disabled={proofreading || !content.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 disabled:opacity-50"><SpellCheck className="h-3.5 w-3.5" />{proofreading ? 'Checking all words…' : 'Check all words'}</button></div><textarea id="mohan-rag-research-content" lang={language} spellCheck value={content} onChange={event => { setContent(event.target.value); setProofreadPreview(''); }} rows={10} maxLength={500_000} className={`w-full resize-y rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 ${devanagariFontClass(content, language)}`} placeholder={`Definition and scope:\nEstablished scientific findings:\nResearch design and evidence quality:\nTraditional Swar Yoga perspective:\nPossible connections or hypotheses:\nLimitations and precautions:\nConclusion and references:`} />{proofreadPreview && <SpellcheckReview text={proofreadPreview} language={language} onDiscard={() => setProofreadPreview('')} onApply={() => { setContent(proofreadPreview); setProofreadPreview(''); setNotice('Corrected text applied to the editor. Review it and save when ready.'); }} />}</div></div>{(error || notice) && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${error ? 'bg-red-500/10 text-red-700' : 'bg-emerald-500/10 text-emerald-700'}`}>{error || notice}</p>}<div className="mt-3 flex justify-end"><button onClick={saveReport} disabled={saving || !title.trim() || !topic.trim() || !content.trim()} className="rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-40">{saving ? 'Saving…' : selected ? 'Save draft changes' : 'Save as draft'}</button></div></section>
    <section className="rounded-2xl border border-emerald-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Research source library</h3><p className="mt-1 text-xs text-slate-500">Open extracted report text, review citations, and create E-book chapters from approved research.</p></div><div className="flex flex-wrap items-center gap-2"><select value={ebookSourceLanguage} onChange={event => setEbookSourceLanguage(event.target.value)} className="rounded-lg border border-emerald-200 bg-white px-2 py-2 text-xs text-slate-900"><option value="en">Source: English</option><option value="hi">Source: Hindi</option><option value="mr">Source: Marathi</option></select><select value={ebookTargetLanguage} onChange={event => setEbookTargetLanguage(event.target.value)} className="rounded-lg border border-emerald-200 bg-white px-2 py-2 text-xs text-slate-900"><option value="en">E-book: English</option><option value="hi">E-book: Hindi</option><option value="mr">E-book: Marathi</option></select><button onClick={loadReports} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs text-slate-700">Refresh</button></div></div>
      {loading ? <p className="py-6 text-center text-sm text-slate-500">Loading reports…</p> : !reports.length ? <p className="rounded-xl border border-dashed border-emerald-200 px-4 py-8 text-center text-sm text-slate-500">No research reports yet.</p> : <div className="space-y-2">{reports.map(report => <article key={report.id} className="rounded-xl border border-emerald-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium text-slate-900">{report.title}</h4><StatusPill muted>{report.status}</StatusPill></div><p className="mt-1 text-xs text-slate-500">{report.topic} · {report.language} · {report.chunkCount || 0} chunks · {report.extractionType || 'text'}{report.sourceReference ? ` · ${report.sourceReference}` : ''}</p>{report.originalFileName && <p className="mt-1 text-xs text-violet-800">Original: {report.originalFileName} {report.originalFileUrl && <a href={report.originalFileUrl} target="_blank" rel="noreferrer" className="underline">Open file</a>}</p>}</div>
          <div className="flex flex-wrap gap-2">
            <button disabled={Boolean(spellcheckBusyId)} onClick={() => correctSavedReport(report)} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-50"><SpellCheck className="mr-1 inline h-3.5 w-3.5" />{spellcheckBusyId === report.id ? 'Correcting…' : 'Correct spelling & grammar'}</button>
            <button onClick={() => openReport(report)} className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs text-slate-700">Open / edit text</button>
            {report.status !== 'approved' && <button onClick={() => reportAction(report, 'approved')} className="rounded-md border border-emerald-300 px-2.5 py-1.5 text-xs text-emerald-800">Approve</button>}
            {report.status !== 'rejected' && <button onClick={() => reportAction(report, 'rejected')} className="rounded-md border border-yellow-300 px-2.5 py-1.5 text-xs text-yellow-800">Reject</button>}
            <button
              onClick={() => reportAction(report, 'delete')}
              className="rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 flex items-center gap-1 cursor-pointer transition shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              Delete
            </button>
          </div>
        </div>
        {activeResearchEbookId === report.id && (
          <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
            {researchEbookLoadingId === report.id ? (
              <div className="flex items-center gap-2 py-3 text-xs font-semibold text-violet-900">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-700 border-t-transparent" />
                Checking saved e-book drafts for this report…
              </div>
            ) : researchEbookInlineDrafts[report.id] ? (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-violet-200/60 pb-3">
                  <div>
                    <h4 className="font-bold text-violet-950">📖 E-Book Chapter · {researchEbookInlineDrafts[report.id]?.title}</h4>
                    <p className="mt-0.5 text-xs text-violet-700">Language: <span className="font-semibold uppercase">{researchEbookInlineDrafts[report.id]?.language}</span> · Grounded authentic Swar Yoga research</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => copyResearchInlineEbook(report.id, researchEbookInlineDrafts[report.id]!.content)}
                      className="rounded-lg border border-violet-300 bg-white px-2.5 py-1 text-xs font-semibold text-violet-900 shadow-2xs hover:bg-violet-50"
                    >
                      {researchCopiedId === report.id ? '✓ Copied' : 'Copy text'}
                    </button>
                    <button
                      onClick={() => downloadResearchInlineDraft(researchEbookInlineDrafts[report.id]!)}
                      className="rounded-lg bg-violet-700 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-violet-800"
                    >
                      Download Markdown
                    </button>
                    <button
                      onClick={() => setActiveResearchEbookId('')}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <pre
                  lang={researchEbookInlineDrafts[report.id]?.language}
                  className={`max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-violet-200 bg-white p-4 text-xs leading-6 text-slate-800 shadow-inner ${devanagariFontClass(researchEbookInlineDrafts[report.id]?.content || '', researchEbookInlineDrafts[report.id]?.language)}`}
                >
                  {researchEbookInlineDrafts[report.id]?.content}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                <div>
                  <h4 className="text-xs font-bold text-violet-950">No saved e-book chapter for this report yet.</h4>
                  <p className="mt-1 text-[11px] text-violet-700">
                    Convert this approved research into a publication-ready Swar Yoga book chapter with the click of a button.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={ebookBusyId === report.id}
                    onClick={() => createResearchEbookDraft(report)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-violet-700 hover:to-purple-700 active:scale-95 disabled:opacity-50"
                  >
                    {ebookBusyId === report.id ? '⚡ Generating Chapter…' : '⚡ Generate E-Book Chapter Now'}
                  </button>
                  <button
                    onClick={() => setActiveResearchEbookId('')}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </article>)}</div>}
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
  const [startingWorker, setStartingWorker] = useState(false);
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
    if (uploadFile.size > 5 * 1024 * 1024 * 1024) { setError('Media uploads must be 5 GB or smaller.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      let response: Response;
      if (uploadFile.size > 150 * 1024 * 1024) {
        const params = new URLSearchParams({ module: moduleId, topic, language, fileName: uploadFile.name, title: uploadFile.name.replace(/\.[^.]+$/, ''), size: String(uploadFile.size) });
        response = await fetch(`/api/admin/crm/mohan-rag/ingestion/upload?${params}`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': uploadFile.type || 'application/octet-stream' }, body: uploadFile,
        });
      } else {
        const form = new FormData();
        form.set('file', uploadFile);
        form.set('moduleId', moduleId);
        form.set('topic', topic);
        form.set('language', language);
        response = await fetch('/api/admin/crm/mohan-rag/ingestion/upload', {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
        });
      }
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not upload media');
      setUploadFile(null);
      setNotice(`${uploadFile.name} uploaded to Bunny and queued. ${data.message}`);
      await loadJobs();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not upload media'); }
    finally { setSaving(false); }
  };

  const processQueuedJobs = async () => {
    if (!token) return;
    setStartingWorker(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/ingestion/process-now', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 5 }),
      });
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not start the video transcription worker');
      setNotice(`${data.message} Completed transcripts appear in Library (All Sources) as reviewable sources, not in the separate Master Teaching Corpus.`);
      await loadJobs();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the video transcription worker');
    } finally { setStartingWorker(false); }
  };

  const retryJob = async (jobId: string) => {
    if (!token) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/ingestion', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', jobId }),
      });
      const data = await readManagementApiJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not retry this video job');
      setNotice(data.message || 'Job queued for retry.');
      await loadJobs();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not retry this video job');
    } finally { setSaving(false); }
  };

  const statusStyle: Record<string, string> = { queued: 'border-amber-200 bg-amber-50 text-amber-800', processing: 'border-blue-200 bg-blue-50 text-blue-800', completed: 'border-emerald-200 bg-emerald-50 text-emerald-800', failed: 'border-rose-200 bg-rose-50 text-rose-800' };
  return <div className="space-y-5">
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-violet-50 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Bunny media transcription queue</p><h3 className="mt-1 text-lg font-semibold text-slate-900">MP4/MP3 to timestamped text</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Uploaded media is stored in Bunny and transcribed by the background worker. Completed transcripts appear in Library (All Sources) as drafts to review; they do not appear in the separate Master Teaching Corpus automatically.</p></div><span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">Automatic: 10 PM–6 AM · Asia/Kolkata</span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-xs font-medium text-slate-600">Knowledge library<select value={moduleId} onChange={event => setModuleId(event.target.value as MohanRagModule)} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900">{modules.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Topic (optional)<input value={topic} onChange={event => setTopic(event.target.value)} maxLength={300} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="e.g. Swar Yoga basics" /></label><label className="text-xs font-medium text-slate-600">Language<select value={language} onChange={event => setLanguage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="auto">Auto detect</option><option value="hi">Hindi</option><option value="mr">Marathi</option><option value="en">English</option></select></label></div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-sky-200 bg-white p-4"><div className="flex items-center gap-2"><Upload className="h-4 w-4 text-sky-700"/><h4 className="text-sm font-semibold text-slate-900">Upload from this device</h4></div><p className="mt-1 text-xs text-slate-600">MP4, WebM, MOV, MP3, M4A, or WAV · up to 5 GB. Large files stream directly to Bunny; long audio is split into MP3 segments for transcription and word-level correction.</p><input type="file" accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,.mp4,.webm,.mov,.mp3,.m4a,.wav" onChange={event => setUploadFile(event.target.files?.[0] || null)} className="mt-3 block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:font-semibold file:text-sky-900 hover:file:bg-sky-200"/><div className="mt-3 flex items-center justify-between gap-2"><span className="min-w-0 truncate text-xs text-slate-500">{uploadFile ? `${uploadFile.name} · ${(uploadFile.size / 1024 / 1024).toFixed(1)} MB` : 'Choose a media file'}</span><button type="button" disabled={saving || !uploadFile} onClick={uploadMedia} className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? 'Uploading…' : 'Upload & queue'}</button></div></div>
        <div className="rounded-xl border border-violet-200 bg-white p-4"><div className="flex items-center gap-2"><Video className="h-4 w-4 text-violet-700"/><h4 className="text-sm font-semibold text-slate-900">Add video URLs</h4></div><p className="mt-1 text-xs text-slate-600">Paste up to 500 URLs. Bunny URLs are reused in place; YouTube media is downloaded to Bunny for processing.</p><textarea value={urls} onChange={event => setUrls(event.target.value)} rows={4} maxLength={1_100_000} className="mt-3 w-full resize-y rounded-xl border border-violet-200 bg-white px-3 py-3 font-mono text-xs leading-5 text-slate-900" placeholder={'https://www.youtube.com/watch?v=abcdefghijk\nhttps://your-zone.b-cdn.net/videos/lesson.mp4'} /><div className="mt-2 flex justify-end"><button type="button" disabled={saving || !urls.trim()} onClick={addUrls} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? 'Adding…' : 'Queue URLs'}</button></div></div>
      </div>
      {(notice || error) && <div className="mt-3 space-y-2">{notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p>}{error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>}</div>}
      <p className="mt-3 text-xs leading-5 text-slate-500">Worker runs automatically during the overnight window. Server needs FFmpeg, yt-dlp for YouTube URLs, Bunny Storage/Database, and OpenAI transcription. Emotion and facial-expression tags are AI delivery suggestions from transcript wording; this does not visually analyze a face in the video.</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Recent video jobs</h3>
          <p className="mt-1 text-xs text-slate-500">Completed items create transcript sources in the selected library. Refresh to see updates; click Run queued jobs to start processing now.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={loadJobs} disabled={loading || startingWorker} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
            {loading ? 'Refreshing…' : 'Refresh queue'}
          </button>
          <button type="button" onClick={processQueuedJobs} disabled={startingWorker || loading || saving || !jobs.some(job => job.status === 'queued')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {startingWorker ? 'Starting…' : 'Run queued jobs now'}
          </button>
        </div>
      </div>
      {jobs.length ? (
        <div className="space-y-2">
          {jobs.map(job => {
            const guid = (job.sourceUrl + ' ' + (job.originalFileUrl || '')).match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)?.[0];
            const isBunny = job.provider === 'bunny' || job.sourceUrl.includes('mediadelivery.net') || (job.originalFileUrl && job.originalFileUrl.includes('mediadelivery.net'));
            const previewUrl = guid ? `https://iframe.mediadelivery.net/play/606386/${guid}` : (job.originalFileUrl || job.sourceUrl);

            return (
              <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-3 hover:border-emerald-300 transition">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{job.provider}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle[job.status] || statusStyle.queued}`}>{job.status}</span>
                      <span className="text-xs text-slate-500">{job.moduleId} · {job.topic || 'No topic'}</span>
                      {job.title && <span className="text-xs font-bold text-slate-800">· {job.title}</span>}
                    </div>
                    <p className="mt-1 max-w-3xl break-all text-xs text-slate-700">{job.sourceUrl}</p>
                    {job.errorMessage && <p className="mt-1 text-xs text-rose-700">{job.errorMessage}</p>}
                    {job.status === 'completed' && job.sourceId && <p className="mt-1 text-xs text-emerald-700">Transcript saved to the {job.moduleId} library. Open Library (All Sources) to review it.</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.status === 'failed' && <button type="button" onClick={() => retryJob(job.id)} disabled={saving} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-800 disabled:opacity-50">Retry</button>}
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition active:scale-95 cursor-pointer"
                      title="Watch video in Bunny Stream player"
                    >
                      <span>▶️ Play Video</span>
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{loading ? 'Loading queue…' : 'No video URLs queued yet.'}</p>
      )}
    </section>
    <div className="grid gap-4 xl:grid-cols-2"><DetailCard title="Bunny links" icon={HardDrive}>Direct Bunny CDN MP3/MP4 URLs are read from Bunny and are not copied or re-uploaded. Bunny Stream player links are converted to their Bunny CDN video URL. Bunny media is streamed through FFmpeg and can be up to 5 GB.</DetailCard><DetailCard title="YouTube links" icon={Video}>Public videos are downloaded with yt-dlp. Private videos need an authorized cookies file configured as YOUTUBE_COOKIES_FILE on the server. YouTube downloads remain capped at 350 MB; audio is converted to compact MP3 before transcription.</DetailCard></div>
  </div>;
}

function SearchDetails({ token }: { token: string | null }) {
  const [query, setQuery] = useState('');
  const [moduleId, setModuleId] = useState('level1');
  const [language, setLanguage] = useState('auto');
  const [searchMode, setSearchMode] = useState<'mohan_sir' | 'web_ai'>('mohan_sir');
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

  const runSearch = async (mode: 'mohan_sir' | 'web_ai' = searchMode) => {
    if (!token || !query.trim()) return;
    setSearchMode(mode);
    setLoading(true); setError(''); setResult(null); setVideoJob(null); setRenderError('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/search', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, moduleId, language, searchMode: mode }),
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
      <DetailCard title="Grounded answer preview & Knowledge Search" icon={Search}>
        <p className="mb-4 text-slate-700">
          Ask any question to test Mohan Sir’s approved RAG database or compare with modern online AI web intelligence.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">
            Question
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="e.g. why we have to do lunch in surya nadi, let me know in simple way"
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Language
            <select
              value={language}
              onChange={event => setLanguage(event.target.value)}
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-200"
            >
              <option value="auto">Auto detect</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-700">
            Knowledge module / learner boundary
            <select
              value={moduleId}
              onChange={event => setModuleId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-200"
            >
              {modules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}
            </select>
          </label>
        </div>

        {/* Two distinct search buttons */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {/* Button 1: Mohan Sir's Data */}
          <button
            type="button"
            disabled={loading || !query.trim()}
            onClick={() => runSearch('mohan_sir')}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md transition active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              searchMode === 'mohan_sir' && loading
                ? 'bg-emerald-700 ring-2 ring-emerald-400'
                : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-900/20'
            }`}
            title="Ground answer strictly in Mohan Sir's approved Swar Yoga lectures, transcripts & master library corpus"
          >
            <span>🕉️</span>
            <span>{loading && searchMode === 'mohan_sir' ? 'Searching Mohan Sir’s Data…' : 'Mohan Sir’s Data'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Button 2: Online Web Search from AI */}
          <button
            type="button"
            disabled={loading || !query.trim()}
            onClick={() => runSearch('web_ai')}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md transition active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              searchMode === 'web_ai' && loading
                ? 'bg-indigo-700 ring-2 ring-indigo-400'
                : 'bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-700 hover:from-sky-500 hover:to-indigo-500 shadow-indigo-900/20'
            }`}
            title="Answer using modern online AI web search, anatomical science & global yogic knowledge"
          >
            <span>🌐</span>
            <span>{loading && searchMode === 'web_ai' ? 'Searching Online AI Web…' : 'Online Web Search from AI'}</span>
            <Sparkles className="h-4 w-4" />
          </button>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</p>}
      </DetailCard>

      {result && <div className="space-y-4">
        <section className="rounded-2xl border border-emerald-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">
                {result.searchMode === 'web_ai' ? 'Online AI Web Answer' : 'Draft Answer from Mohan Sir’s Data'}
              </h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                result.searchMode === 'web_ai'
                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {result.searchMode === 'web_ai' ? '🌐 Online AI Web Search' : '🕉️ Mohan Sir Approved RAG'}
              </span>
            </div>
            <StatusPill muted>{result.sufficientContext ? 'Sources found' : 'Insufficient context'}</StatusPill>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{result.answer}</p>
          {result.sufficientContext && result.citations?.length > 0 && <><button onClick={generateAvatarVideo} disabled={language === 'auto' || result.language !== language || videoJob?.status === 'rendering' || videoJob?.status === 'completed'} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-500 disabled:opacity-50"><Video className="h-4 w-4" />{videoJob?.status === 'rendering' ? 'Rendering your clone video…' : videoJob?.status === 'completed' ? 'Clone video ready' : 'Generate video with My Clone'}</button>{(language === 'auto' || result.language !== language) && <p className="mt-2 text-xs text-slate-500">Choose a verified voice language and rerun the answer preview before generating your clone video.</p>}</>}</section>
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
