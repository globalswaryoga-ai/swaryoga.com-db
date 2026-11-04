'use client';

import React from 'react';
import {
  Upload, BookOpen, Brain, FileText, Sparkles, Languages,
  Network, UserRoundCog, Activity, ShieldCheck, HardDrive,
  ArrowRight, CheckCircle2, Clock, Globe2, FileAudio, Video, Search,
  PlayCircle, RefreshCw, Layers
} from 'lucide-react';
import type { LibraryViewTab } from '@/app/admin/crm/mohan-rag/management/page';

interface LibraryDashboardViewProps {
  token: string | null;
  onNavigateStage: (tab: LibraryViewTab) => void;
  onSelectSection: (sectionId: string) => void;
  onLoadTopicCorpus?: (lang: string, workshop: string, day: string, topic: string) => void;
}

export default function LibraryDashboardView({
  token,
  onNavigateStage,
  onSelectSection,
  onLoadTopicCorpus,
}: LibraryDashboardViewProps) {

  // 9 Stages of the AI Library Processing Pipeline
  const pipelineStages = [
    {
      stage: 'Stage 1',
      id: 'raw',
      title: 'Raw Library',
      nativeTitle: 'कच्ची लायब्ररी',
      icon: Upload,
      emoji: '📥',
      gradient: 'from-sky-500 via-blue-600 to-indigo-600',
      borderTone: 'border-sky-300 hover:border-sky-500',
      shadowTone: 'shadow-sky-500/15',
      badge: 'Original Files',
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
      description: 'Store immutable master teaching recordings (PDF, MP3, MP4). Zero data loss, original files kept permanently available for reference.',
      metrics: '45+ Files Extracted • Audio/Video/PDF',
      actionLabel: 'Inspect Raw Materials',
      onClick: () => onSelectSection('ingestion'),
    },
    {
      stage: 'Stage 2',
      id: 'spellcheck',
      title: 'Spell Checker',
      nativeTitle: 'शब्दशुद्धी व वेलांटी',
      icon: BookOpen,
      emoji: '🔤',
      gradient: 'from-emerald-500 via-teal-600 to-green-600',
      borderTone: 'border-emerald-300 hover:border-emerald-500',
      shadowTone: 'shadow-emerald-500/15',
      badge: 'Verbatim Orthography',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      description: 'Corrects speech-to-text recognition errors and Devanagari matras only. Sacred terms (स्वर, नाडी, इडा, पिंगळा, सुषुम्ना) strictly preserved.',
      metrics: 'Speech-to-Text • Broken Words Fix',
      actionLabel: 'Open Spell Checker',
      onClick: () => onNavigateStage('spellcheck'),
    },
    {
      stage: 'Stage 3',
      id: 'grammar',
      title: 'Grammar Checker',
      nativeTitle: 'द्वैत व्याकरण इंजिन',
      icon: Brain,
      emoji: '🧠',
      gradient: 'from-indigo-500 via-purple-600 to-pink-600',
      borderTone: 'border-indigo-300 hover:border-indigo-500',
      shadowTone: 'shadow-indigo-500/15',
      badge: 'Dual SOV / SVO Engine',
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      description: 'Language-aware grammar: Natural SOV (Subject-Object-Verb) for Marathi/Hindi vs SVO for English. Modifies ONLY verbs (क्रियापद).',
      metrics: 'SOV (MR/HI) • SVO (EN) Compliant',
      actionLabel: 'Launch Grammar AI',
      onClick: () => onNavigateStage('grammar'),
    },
    {
      stage: 'Stage 4',
      id: 'plaintext',
      title: 'Plain Text Master',
      nativeTitle: 'शुद्ध पाठ्य सामग्री',
      icon: FileText,
      emoji: '📄',
      gradient: 'from-amber-500 via-orange-600 to-amber-700',
      borderTone: 'border-amber-300 hover:border-amber-500',
      shadowTone: 'shadow-amber-500/15',
      badge: '100% Verbatim Master',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      description: 'Clean teaching transcripts with Workshop, Topic, Session #, Language, and Teacher name. No summarization; full knowledge retained.',
      metrics: '16 Days Full Corpus • 40-Page Notes',
      actionLabel: 'View Plain Text',
      onClick: () => onNavigateStage('plaintext'),
    },
    {
      stage: 'Stage 5',
      id: 'humor',
      title: 'Emotional Hummer Text',
      nativeTitle: 'भावमुद्रा व आवाजाची शैली',
      icon: Sparkles,
      emoji: '🎭',
      gradient: 'from-fuchsia-500 via-rose-600 to-purple-600',
      borderTone: 'border-fuchsia-300 hover:border-fuchsia-500',
      shadowTone: 'shadow-fuchsia-500/15',
      badge: 'AI Avatar Expression',
      badgeColor: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
      description: 'Voice delivery tags for Avatar: [CALM], [EXPLAINING], [EMPHASIS], [PAUSE], [HUMOROUS], [SMILING], [INSPIRATIONAL] and jokes.',
      metrics: '14 Voice Emotions • Natural Delivery',
      actionLabel: 'View Hummer Text',
      onClick: () => onNavigateStage('humor'),
    },
    {
      stage: 'Stage 6',
      id: 'multilingual',
      title: 'Multilingual Engine',
      nativeTitle: 'बहुभाषिक ज्ञान कोष',
      icon: Languages,
      emoji: '🌐',
      gradient: 'from-teal-500 via-cyan-600 to-blue-600',
      borderTone: 'border-teal-300 hover:border-teal-500',
      shadowTone: 'shadow-teal-500/15',
      badge: '27+ Languages',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      description: 'Original approved master translated into Marathi, Hindi, English, and 27+ languages. Sacred Sanskrit terminology untouched.',
      metrics: 'Tri-Lingual Master (MR • HI • EN)',
      actionLabel: 'Explore Multilingual Data',
      onClick: () => onNavigateStage('spellcheck'),
    },
    {
      stage: 'Stage 7',
      id: 'rag',
      title: 'RAG Knowledge Chunks',
      nativeTitle: 'नॉलेज चंक्स व शोध',
      icon: Network,
      emoji: '⚡',
      gradient: 'from-violet-500 via-purple-600 to-indigo-700',
      borderTone: 'border-violet-300 hover:border-violet-500',
      shadowTone: 'shadow-violet-500/15',
      badge: 'Semantic Retrieval',
      badgeColor: 'bg-violet-50 text-violet-800 border-violet-200',
      description: 'Vector-indexed knowledge chunks with strict module boundaries, source citations, and student access governance.',
      metrics: 'Approved Chunks • Bunny Edge SQL',
      actionLabel: 'Inspect RAG Retrieval',
      onClick: () => onSelectSection('search'),
    },
    {
      stage: 'Stage 8',
      id: 'avatar',
      title: 'AI Avatar — Digital Twin',
      nativeTitle: 'डिजिटल क्लोन व आवाज',
      icon: UserRoundCog,
      emoji: '🎙️',
      gradient: 'from-rose-500 via-pink-600 to-red-600',
      borderTone: 'border-rose-300 hover:border-rose-500',
      shadowTone: 'shadow-rose-500/15',
      badge: 'Mohan Sir Clone',
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      description: 'Plain Text determines WHAT the avatar teaches; Hummer Text determines HOW it speaks, smiles, pauses, and expresses.',
      metrics: 'HeyGen Synced • Authorized Voice',
      actionLabel: 'Open Avatar Studio',
      onClick: () => onSelectSection('avatar'),
    },
    {
      stage: 'Stage 9',
      id: 'history',
      title: 'Processing History',
      nativeTitle: 'प्रक्रिया इतिहास व नोंदी',
      icon: Activity,
      emoji: '📜',
      gradient: 'from-slate-600 via-slate-700 to-slate-900',
      borderTone: 'border-slate-300 hover:border-slate-500',
      shadowTone: 'shadow-slate-500/15',
      badge: 'Audit & Rollback',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      description: 'Full version control, stage-by-stage audit trail, background queue status, and 1-click restore functionality.',
      metrics: '100% Traceable • Version History',
      actionLabel: 'View Queue History',
      onClick: () => onSelectSection('ingestion'),
    },
  ];

  // Workshop Syllabus Cards
  const workshopCards = [
    {
      id: 'level1',
      title: 'Level 1 (L-1) Foundations Workshop',
      marathiTitle: 'लेवल १: स्वर योग पायाभूत कार्यशाळा (१६ दिवस)',
      badge: '16 Days Full Corpus',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: '🌱',
      description: 'भोजन व पाणी नियम, जल चिकित्सा, गॅस, झोप, ॐ प्राणायाम, ध्यान, अजपा-जप, आहार शास्त्र, ५ तत्त्वे, सुषुम्ना, नाडी परिवर्तन व द्वेष मुक्ती.',
      lecturesCount: '24+ Video Lectures',
      langCoverage: 'Marathi • Hindi • English',
    },
    {
      id: 'why',
      title: 'Why Swar Yoga? (स्वर योग का?)',
      marathiTitle: 'स्वर योग परिचय व वैज्ञानिक महत्त्व',
      badge: 'Core Philosophy',
      badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
      icon: '🌟',
      description: 'नाडी विज्ञान, डावी व उजवी नाकपुडी चक्र (Nasal Cycle), नर्व्हस सिस्टीम समतोल, तणावमुक्ती आणि आधुनिक जीवनशैलीतील महत्त्व.',
      lecturesCount: '3 Master Videos',
      langCoverage: 'Marathi • Hindi • English',
    },
    {
      id: 'level2',
      title: 'Level 2 (L-2) Intermediate Sadhana',
      marathiTitle: 'लेवल २: कुंभक, तत्त्व ध्यान व प्राणायाम',
      badge: 'Intermediate Sadhana',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
      icon: '🔥',
      description: 'प्रगत प्राणायाम, कुंभक विधी, पंच महातत्त्व गहन ध्यान, तिथी, वार आणि चंद्र-सूर्य नाडी कालचक्र ताळमेळ.',
      lecturesCount: 'Deep Sadhana Units',
      langCoverage: 'Syllabus Verified',
    },
    {
      id: 'level3',
      title: 'Level 3 (L-3) Mastery & Kundalini',
      marathiTitle: 'लेवल ३: कुंडलिनी जागरण व सूक्ष्म स्वर निदान',
      badge: 'Mastery Level',
      badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
      icon: '👑',
      description: 'सुषुम्ना नाडीचा निरंतर प्रवाह, कुंडलिनी शक्तीचे उर्ध्वगमन, सूक्ष्म स्वर निदान आणि आत्मसाक्षात्कार साधना.',
      lecturesCount: 'Master Units',
      langCoverage: 'Advanced RAG',
    },
    {
      id: 'general',
      title: 'General Topics & Aahar Shastra',
      marathiTitle: 'सामान्य तत्त्वे, आहार शास्त्र व ऋतूचर्या',
      badge: 'Nutrition & Lifestyle',
      badgeColor: 'text-teal-700 bg-teal-50 border-teal-200',
      icon: '🍲',
      description: 'अन्नमय कोश शुद्धी, सात्विक-राजसिक-तामसिक अन्न, ६ ऋतूंची ऋतूचर्या, ५ चवींचा समतोल, आणि अवयवांचे नैसर्गिक डिटॉक्स.',
      lecturesCount: 'Complete Food Science',
      langCoverage: 'Full Guidelines',
    },
    {
      id: 'research',
      title: 'Scientific Research & Evidence Reports',
      marathiTitle: 'स्वर योग संशोधन अहवाल व वैद्यकीय पुरावे',
      badge: 'Peer-Reviewed Science',
      badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
      icon: '🔬',
      description: 'Nasal Cycle & Autonomic Nervous System, EEG Brain Hemispheric Synchronization, HRV Vagal Tone studies and clinical citations.',
      lecturesCount: 'Medical Citations',
      langCoverage: 'Draft Review Ready',
    },
  ];

  // Key Marathi & Multilingual Queue Highlights (45 Videos)
  const recentTeachingFiles = [
    { id: '1', day: 'Day 1', title: 'भोजन आणि पाणी नियम (Bhojan & Pani)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=dJJEpSFXY9E', status: 'Queued for Transcribe' },
    { id: '2', day: 'Day 2', title: 'पाणी, गॅस आणि झोप (Pani Gas Sleep)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=tnON5VNwCeU', status: 'Queued for Transcribe' },
    { id: '3', day: 'Day 3', title: 'ॐ प्राणायाम आणि चक्र (Om Pranayama Chakra)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=vsDvWOusePY', status: 'Queued for Transcribe' },
    { id: '4', day: 'Day 4', title: 'ध्यान आणि मनःशांती (Meditation)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=TBXncpxqfs4', status: 'Queued for Transcribe' },
    { id: '5', day: 'Day 5', title: 'अजपा-जप साधना (Ajapa-Jap)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=sbDX_hK0Jn0', status: 'Queued for Transcribe' },
    { id: '6', day: 'Day 6', title: 'आहार आणि पचनक्रिया १ (Food Digestion 1)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=0f9LqY0fTr8', status: 'Queued for Transcribe' },
    { id: '7', day: 'Day 7', title: 'तामसिक आणि राजसिक आहार (Tamas Rajas)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=p1yMH5ktRMM', status: 'Queued for Transcribe' },
    { id: '8', day: 'Day 8', title: 'राजसिक आणि सात्विक आहार (Rajas Satvik)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=wABcWxXNL2Y', status: 'Queued for Transcribe' },
    { id: '9', day: 'Day 9', title: 'सात्विक आहार व पंचतत्व (Satvik Panch Tatva)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=0VnfjynTHl0', status: 'Queued for Transcribe' },
    { id: '10', day: 'Day 10', title: 'सुषुम्ना नाडी जागरण (Sushumna Nadi)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=VxClaNi8UqQ', status: 'Queued for Transcribe' },
    { id: '11', day: 'Day 11', title: 'प्रतिबंधक विज्ञान १ (Food Preventing 1)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=IZJsfHliElY', status: 'Queued for Transcribe' },
    { id: '12', day: 'Day 12', title: 'प्रतिबंधक विज्ञान २ (Food Preventing 2)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=DkvL5uX3d-8', status: 'Queued for Transcribe' },
    { id: '14', day: 'Day 14', title: 'नाडी कामकाज आणि कार्यप्रणाली (Nadi Kamkaj)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=EqoNsXbvDKs', status: 'Queued for Transcribe' },
    { id: '15', day: 'Day 15', title: 'नाडी बदल व निसर्ग समतोल (Nadi Switch)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=cIdO0E6_rjc', status: 'Queued for Transcribe' },
    { id: '16', day: 'Day 16', title: 'द्वेष मुक्ती आणि चित्तशुद्धी (Dwesh)', lang: 'Marathi', url: 'https://www.youtube.com/watch?v=sCBPAYDBVVQ', status: 'Queued for Transcribe' },
    { id: 'master_notes', day: 'Master Notes', title: 'Hindi L-1 Final Master Notes (40 Pages)', lang: 'Hindi', url: 'Bunny SQL: b5a1068b-161b', status: 'Approved Master (58KB)' },
    { id: 'mahiti', day: 'Mahiti Satra', title: 'मराठी माहिती सत्र - संपूर्ण कार्यशाळा (1h 26m)', lang: 'Marathi', url: 'Bunny Stream: 6bb1194e-0bee', status: 'Approved Audio/Video' },
  ];

  return (
    <div className="space-y-7 pb-10">
      {/* Top Glossy Stat Summary Bar */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-b from-white via-white to-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              Teaching Corpus
            </span>
            <span className="text-lg">📚</span>
          </div>
          <div className="text-2xl font-black text-slate-900">45+ Lectures</div>
          <p className="text-xs text-slate-500 mt-1">Level 1 to 3 • Why Swar Yoga • Aahar</p>
        </div>

        <div className="rounded-2xl border-2 border-sky-300/80 bg-gradient-to-b from-white via-white to-sky-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-full">
              Languages
            </span>
            <span className="text-lg">🌐</span>
          </div>
          <div className="text-2xl font-black text-slate-900">27+ Languages</div>
          <p className="text-xs text-slate-500 mt-1">Marathi • Hindi • English Master</p>
        </div>

        <div className="rounded-2xl border-2 border-indigo-300/80 bg-gradient-to-b from-white via-white to-indigo-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded-full">
              AI Pipeline
            </span>
            <span className="text-lg">⚡</span>
          </div>
          <div className="text-2xl font-black text-slate-900">9 Active Stages</div>
          <p className="text-xs text-slate-500 mt-1">Raw → Spell → Grammar → Plain → Hummer</p>
        </div>

        <div className="rounded-2xl border-2 border-rose-300/80 bg-gradient-to-b from-white via-white to-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-full">
              AI Avatar Ready
            </span>
            <span className="text-lg">🎙️</span>
          </div>
          <div className="text-2xl font-black text-slate-900">Mohan Sir Clone</div>
          <p className="text-xs text-slate-500 mt-1">HeyGen Voice &amp; Delivery Synced</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: THE 9 AI LIBRARY PROCESSING STAGES (3D CARDS)     */}
      {/* ------------------------------------------------------------- */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="text-xl">🔄</span>
              <span>AI Library Processing Pipeline (9 Stages)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any stage card to inspect, correct, approve, or generate knowledge versions
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
            Pipeline: Raw → Spell → Grammar → Plain → Hummer → RAG → Avatar
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                onClick={stage.onClick}
                className={`group relative overflow-hidden rounded-[22px] bg-white p-5 border-2 ${stage.borderTone} shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between`}
              >
                {/* Specular gloss effect */}
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-slate-100/40 via-transparent to-transparent pointer-events-none rounded-t-[22px]" />

                <div>
                  {/* Card Header: Icon & Badge */}
                  <div className="flex items-center justify-between mb-3.5 relative z-10">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${stage.gradient} flex items-center justify-center text-white shadow-sm border border-white/40 group-hover:scale-105 transition-transform`}>
                      <span className="text-lg">{stage.emoji}</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${stage.badgeColor}`}>
                      {stage.stage}: {stage.badge}
                    </span>
                  </div>

                  {/* Title & Native Title */}
                  <div className="relative z-10">
                    <h4 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center justify-between">
                      <span>{stage.title}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <div className="text-[11px] font-bold text-emerald-800/80 mt-0.5">
                      {stage.nativeTitle}
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {stage.description}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Metrics & CTA */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between relative z-10 text-xs">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {stage.metrics}
                  </span>
                  <span className="font-bold text-emerald-700 group-hover:underline flex items-center gap-1">
                    <span>{stage.actionLabel}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: ALL WORKSHOP & MASTER SYLLABUS CARDS              */}
      {/* ------------------------------------------------------------- */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="text-xl">📚</span>
              <span>All Workshops &amp; Master Knowledge Units</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse complete syllabus units with authentic Marathi, Hindi &amp; English verbatim lecture notes
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateStage('spellcheck')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>📖</span>
            <span>Open Master Working Area</span>
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workshopCards.map((w) => (
            <div
              key={w.id}
              onClick={() => onNavigateStage('spellcheck')}
              className="rounded-[22px] border-2 border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform">
                    <span>{w.icon}</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${w.badgeColor}`}>
                    {w.badge}
                  </span>
                </div>
                <h4 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {w.title}
                </h4>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {w.marathiTitle}
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {w.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-500">
                  {w.lecturesCount}
                </span>
                <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Open Workshop</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: RECENT TEACHING MATERIALS & QUEUED VIDEOS ROSTER  */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span className="text-lg">🎬</span>
              <span>Teaching Recordings &amp; Multilingual Files Roster</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              45 queued and approved lecture files across Marathi, Hindi, and English with 1-click stage actions
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
            {recentTeachingFiles.length} Live Items Displayed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="pb-2.5">Session / Day</th>
                <th className="pb-2.5">Lecture Title</th>
                <th className="pb-2.5">Original Language</th>
                <th className="pb-2.5">Source Reference</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Pipeline Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {recentTeachingFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 font-bold text-slate-900 whitespace-nowrap">
                    {file.day}
                  </td>
                  <td className="py-2.5 font-semibold text-slate-800">
                    {file.title}
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                      <span>{file.lang === 'Marathi' ? '🚩' : file.lang === 'Hindi' ? '🇮🇳' : '🇬🇧'}</span>
                      <span>{file.lang}</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-[11px] font-mono text-slate-500 max-w-[200px] truncate">
                    {file.url}
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      <span>{file.status}</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onNavigateStage('spellcheck')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
                        title="Open in Spell Checker"
                      >
                        Spell
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigateStage('grammar')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                        title="Open in Grammar AI"
                      >
                        Grammar
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigateStage('plaintext')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                        title="View Plain Text"
                      >
                        Plain
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigateStage('humor')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 transition cursor-pointer"
                        title="View Hummer Emotion Text"
                      >
                        Hummer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

