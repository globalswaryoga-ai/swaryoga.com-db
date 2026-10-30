'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Sparkles,
  Target,
  Flag,
  Trophy,
  CheckSquare,
  Calendar,
  Download,
  Flame,
  Timer,
  Play,
  CircleDot,
  ListTodo,
  Bell,
  BookOpen,
  Users,
  Sun,
  Leaf,
  HeartPulse,
  CalendarDays,
  LayoutGrid,
  Folder,
  ChevronRight,
  ChevronDown,
  Check,
  ExternalLink,
  Globe,
} from 'lucide-react';
import LifePlannerRestoreBackup from '@/components/LifePlannerRestoreBackup';

interface SubApp {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji?: string;
  href: string;
  bgGradient: string;
  badge?: string;
  tag?: string;
  accentTextColor?: string;
  sideBorderColor?: string;
}

interface MasterCard {
  id: 'vision' | 'sadhana' | 'tools' | 'today';
  title: string;
  emoji?: string;
  tagline: string;
  themeColor: string;
  accentBg: string;
  cardLightBg: string;
  cardBorder: string;
  sideBorderColor: string;
  categoryTag: string;
  accentTextColor: string;
  icon: React.ComponentType<{ className?: string }>;
  apps: SubApp[];
}

export interface PlannerLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

// 27 Global & Indic Languages - English Default, Strictly NO Urdu
export const PLANNER_LANGUAGES: PlannerLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' }, // Default
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🚩' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', flag: '🕉️' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];

export default function LifePlannerDashboardHome() {
  const router = useRouter();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'all'>('folders');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [languageSaved, setLanguageSaved] = useState<boolean>(false);
  const [isSavingLang, setIsSavingLang] = useState<boolean>(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState<boolean>(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load language preference from localStorage / profile on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('swar_planner_lang');
      if (stored && PLANNER_LANGUAGES.some((l) => l.code === stored)) {
        setSelectedLanguage(stored);
      }
    } catch (_) { }
  }, []);

  const handleSaveLanguage = async () => {
    try {
      setIsSavingLang(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('swar_planner_lang', selectedLanguage);
        window.dispatchEvent(new CustomEvent('swar_planner_lang_changed'));
      }
      // Save to Bunny Database via PUT /api/life-planner/data
      await fetch('/api/life-planner/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'preferred_language', data: selectedLanguage }),
      }).catch(() => { });
      setLanguageSaved(true);
      setTimeout(() => setLanguageSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save language preference:', err);
    } finally {
      setIsSavingLang(false);
    }
  };

  const masterCards: MasterCard[] = [
    {
      id: 'today',
      title: "Today's Routine",
      emoji: '☀️',
      tagline: 'Daily routine checklist, rutucharya, health & calendar',
      themeColor: 'from-[#ea580c] via-[#d97706] to-[#b45309]',
      accentBg: 'bg-amber-50 text-amber-800 border-amber-200',
      cardLightBg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white',
      cardBorder: 'border-amber-200/80',
      sideBorderColor: 'border-l-amber-500',
      categoryTag: "TODAY'S ROUTINE",
      accentTextColor: 'text-amber-700',
      icon: Sun,
      apps: [
        {
          id: 'daily_page',
          name: 'Daily Page',
          subtitle: 'Habits, daily routine checklist & progress tracking',
          icon: Sun,
          emoji: '🌅',
          href: '/life-planner/dashboard/daily',
          bgGradient: 'from-amber-400 to-orange-500',
          tag: 'HABITS & ROUTINE',
          accentTextColor: 'text-amber-700',
          sideBorderColor: 'border-l-amber-500',
        },
        {
          id: 'rutucharya',
          name: 'Rutucharya',
          subtitle: 'Ayurvedic seasonal regimen, diet & dosha balance',
          icon: Leaf,
          emoji: '🌿',
          href: '/life-planner/dashboard/ritucharya',
          bgGradient: 'from-emerald-500 to-green-600',
          tag: 'AYURVEDA GUIDE',
          accentTextColor: 'text-emerald-700',
          sideBorderColor: 'border-l-emerald-500',
        },
        {
          id: 'health',
          name: 'Health',
          subtitle: 'Vitals, wellness trackers, water, sleep & body state',
          icon: HeartPulse,
          emoji: '❤️',
          href: '/life-planner/dashboard/health',
          bgGradient: 'from-rose-500 to-red-600',
          tag: 'WELLNESS & VITALS',
          accentTextColor: 'text-rose-700',
          sideBorderColor: 'border-l-rose-500',
        },
        {
          id: 'calendar',
          name: 'Calendar',
          subtitle: 'Tithi, Swar timings, auspicious dates & scheduler',
          icon: CalendarDays,
          emoji: '📅',
          href: '/life-planner/dashboard/calendar',
          bgGradient: 'from-sky-500 to-blue-600',
          tag: 'SWAR TIMINGS',
          accentTextColor: 'text-sky-700',
          sideBorderColor: 'border-l-sky-500',
        },
      ],
    },
    {
      id: 'sadhana',
      title: 'My Sadhana',
      emoji: '🧘‍♂️',
      tagline: 'Sadhana practices, kumbhaka retention, singing bowl timer & meditation',
      themeColor: 'from-[#f97316] via-[#ea580c] to-[#c2410c]',
      accentBg: 'bg-orange-50 text-orange-800 border-orange-200',
      cardLightBg: 'bg-gradient-to-br from-orange-50/90 via-amber-50/40 to-white',
      cardBorder: 'border-orange-200/80',
      sideBorderColor: 'border-l-orange-500',
      categoryTag: 'DAILY SADHANA',
      accentTextColor: 'text-orange-700',
      icon: Flame,
      apps: [
        {
          id: 'sadhana_page',
          name: 'Sadhana Page',
          subtitle: 'Morning & evening spiritual practice sequences',
          icon: Flame,
          emoji: '🧘‍♂️',
          href: '/life-planner/dashboard/sadhana',
          bgGradient: 'from-orange-500 to-amber-600',
          badge: 'Daily',
          tag: 'DAILY PRACTICE',
          accentTextColor: 'text-orange-700',
          sideBorderColor: 'border-l-orange-500',
        },
        {
          id: 'stopwatch',
          name: 'Stopwatch',
          subtitle: 'Kumbhaka breath retention & ratio timer',
          icon: Flame,
          emoji: '⏱️',
          href: '/life-planner/dashboard/sadhana?tab=stopwatch',
          bgGradient: 'from-red-500 to-orange-600',
          badge: 'Live',
          tag: 'KUMBHAKA',
          accentTextColor: 'text-red-700',
          sideBorderColor: 'border-l-red-500',
        },
        {
          id: 'timer',
          name: 'Timer',
          subtitle: 'Singing bowl chimes & periodic intervals',
          icon: Timer,
          emoji: '🔔',
          href: '/life-planner/dashboard/sadhana?tab=timer',
          bgGradient: 'from-amber-500 to-yellow-600',
          badge: 'Sound',
          tag: 'SINGING BOWL',
          accentTextColor: 'text-amber-700',
          sideBorderColor: 'border-l-amber-500',
        },
        {
          id: 'meditations',
          name: 'Meditations',
          subtitle: 'Guided Swar Dhyana audio meditations',
          icon: Play,
          emoji: '🎧',
          href: '/life-planner/dashboard/sadhana?tab=meditation',
          bgGradient: 'from-indigo-600 to-blue-700',
          tag: 'SWAR DHYANA',
          accentTextColor: 'text-indigo-700',
          sideBorderColor: 'border-l-indigo-600',
        },
        {
          id: 'samyama',
          name: 'Samyama',
          subtitle: 'Patanjali Tratak focus & concentration training',
          icon: CircleDot,
          emoji: '🎯',
          href: '/life-planner/dashboard/sadhana?tab=samyama',
          bgGradient: 'from-purple-600 to-violet-800',
          tag: 'TRATAK FOCUS',
          accentTextColor: 'text-purple-700',
          sideBorderColor: 'border-l-purple-600',
        },
      ],
    },
    {
      id: 'vision',
      title: 'My Vision',
      emoji: '🎯',
      tagline: 'Life blueprint, strategic action plan, goals, tasks, events & downloads',
      themeColor: 'from-[#059669] via-[#047857] to-[#065f46]',
      accentBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      cardLightBg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white',
      cardBorder: 'border-emerald-200/80',
      sideBorderColor: 'border-l-emerald-600',
      categoryTag: 'LIFE BLUEPRINT',
      accentTextColor: 'text-emerald-700',
      icon: Target,
      apps: [
        {
          id: 'vision_board',
          name: 'Vision',
          subtitle: 'Life blueprint, dream board & core aspirations',
          icon: Target,
          emoji: '🎯',
          href: '/life-planner/dashboard/vision',
          bgGradient: 'from-emerald-600 to-teal-700',
          tag: 'LIFE BLUEPRINT',
          accentTextColor: 'text-emerald-700',
          sideBorderColor: 'border-l-emerald-600',
        },
        {
          id: 'action_plan',
          name: 'Action Plan',
          subtitle: 'Strategic multi-phase roadmap & execution steps',
          icon: Flag,
          emoji: '🗺️',
          href: '/life-planner/dashboard/action-plan',
          bgGradient: 'from-teal-600 to-cyan-700',
          tag: 'ROADMAP',
          accentTextColor: 'text-teal-700',
          sideBorderColor: 'border-l-teal-600',
        },
        {
          id: 'goals',
          name: 'Goals',
          subtitle: 'Measurable targets, metrics & deadline tracking',
          icon: Trophy,
          emoji: '🏆',
          href: '/life-planner/dashboard/goals',
          bgGradient: 'from-amber-500 to-orange-600',
          tag: 'TARGETS',
          accentTextColor: 'text-amber-700',
          sideBorderColor: 'border-l-amber-500',
        },
        {
          id: 'tasks',
          name: 'Tasks',
          subtitle: 'Actionable sprint tasks & milestone checklists',
          icon: CheckSquare,
          emoji: '📝',
          href: '/life-planner/dashboard/tasks',
          bgGradient: 'from-orange-500 to-rose-600',
          tag: 'SPRINTS',
          accentTextColor: 'text-orange-700',
          sideBorderColor: 'border-l-orange-500',
        },
        {
          id: 'events',
          name: 'Events',
          subtitle: 'Key dates, camps, webinars & retreat schedule',
          icon: Calendar,
          emoji: '🎪',
          href: '/life-planner/dashboard/events',
          bgGradient: 'from-blue-600 to-indigo-700',
          tag: 'EVENTS & CAMPS',
          accentTextColor: 'text-blue-700',
          sideBorderColor: 'border-l-blue-600',
        },
        {
          id: 'download_vision',
          name: 'Download Vision',
          subtitle: 'High resolution printable blueprint PDF export',
          icon: Download,
          emoji: '📥',
          href: '/life-planner/dashboard/vision-download',
          bgGradient: 'from-purple-600 to-pink-700',
          badge: 'PDF',
          tag: 'PRINTABLE PDF',
          accentTextColor: 'text-purple-700',
          sideBorderColor: 'border-l-purple-600',
        },
      ],
    },
    {
      id: 'tools',
      title: 'My Tools',
      emoji: '🛠️',
      tagline: 'Quick to-do list, swar alarms, power words & diamond network',
      themeColor: 'from-[#2563eb] via-[#1d4ed8] to-[#1e40af]',
      accentBg: 'bg-blue-50 text-blue-800 border-blue-200',
      cardLightBg: 'bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white',
      cardBorder: 'border-blue-200/80',
      sideBorderColor: 'border-l-blue-600',
      categoryTag: 'DAILY TOOLS',
      accentTextColor: 'text-blue-700',
      icon: ListTodo,
      apps: [
        {
          id: 'todo',
          name: 'To Do',
          subtitle: 'Swar-aligned daily tasks & prioritized checklist',
          icon: ListTodo,
          emoji: '✅',
          href: '/life-planner/dashboard/todos',
          bgGradient: 'from-blue-600 to-indigo-700',
          tag: 'CHECKLIST',
          accentTextColor: 'text-blue-700',
          sideBorderColor: 'border-l-blue-600',
        },
        {
          id: 'reminder',
          name: 'Reminder',
          subtitle: 'Hourly alarms, Swar shift notifications & alerts',
          icon: Bell,
          emoji: '🔔',
          href: '/life-planner/dashboard/reminders',
          bgGradient: 'from-amber-600 to-orange-700',
          tag: 'SWAR ALARMS',
          accentTextColor: 'text-amber-700',
          sideBorderColor: 'border-l-amber-500',
        },
        {
          id: 'words',
          name: 'Words',
          subtitle: 'Daily power affirmations & Sanskrit mantras',
          icon: BookOpen,
          emoji: '💬',
          href: '/life-planner/dashboard/words',
          bgGradient: 'from-emerald-600 to-teal-700',
          tag: 'MANTRAS',
          accentTextColor: 'text-emerald-700',
          sideBorderColor: 'border-l-emerald-600',
        },
        {
          id: 'diamond_people',
          name: 'Diamond People',
          subtitle: 'Mentors, spiritual guides & core inner circle',
          icon: Users,
          emoji: '💎',
          href: '/life-planner/dashboard/diamond-people',
          bgGradient: 'from-rose-600 to-pink-700',
          tag: 'INNER CIRCLE',
          accentTextColor: 'text-rose-700',
          sideBorderColor: 'border-l-rose-500',
        },
      ],
    },
  ];

  // All apps flattened for search or "All" view
  const allApps = masterCards.flatMap((c) =>
    c.apps.map((a) => ({ ...a, folderName: c.title, folderColor: c.accentBg }))
  );

  const filteredApps = searchQuery.trim()
    ? allApps.filter(
      (a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.folderName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  const currentFolder = masterCards.find((c) => c.id === activeFolder);

  const handleBack = () => {
    if (activeFolder) {
      setActiveFolder(null);
    } else {
      router.back();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <LifePlannerRestoreBackup />

      {/* Top Header Bar with Glossy Orange-to-Green Header (Matches Calendar Overview Design) */}
      {!activeFolder && (
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#059669] text-white p-4 sm:p-6 shadow-[0_12px_28px_rgba(234,88,12,0.22)] border border-white/20">
          {/* Top Specular Gloss Highlight */}
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[26px] pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                onClick={handleBack}
                className="p-2.5 sm:p-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition active:scale-95 shadow-sm border border-white/25 flex items-center justify-center shrink-0 cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-100 bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/30 shadow-xs truncate">
                    Swar Yoga Life Planner
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 truncate drop-shadow-sm">
                  L-Planner Launchpad
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-between sm:justify-start">
              {/* Direct Link: L-Plan Diagnostic & Guide Page */}
              <Link
                href="/life-planner"
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 shadow-xs active:scale-95"
                title="Open L-Plan Diagnostic Chart & Breath Frequencies"
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                <span>L-Plan Guide</span>
              </Link>

              {/* Toggle between "3D Cards (4 Sections)" and "All (18 Apps)" */}
              <div className="flex items-center gap-1 p-1 bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                <button
                  onClick={() => {
                    setViewMode('folders');
                    setActiveFolder(null);
                  }}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${viewMode === 'folders' && !activeFolder
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white'
                    }`}
                >
                  <Folder className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
                  <span>4 Cards</span>
                </button>
                <button
                  onClick={() => {
                    setViewMode('all');
                    setActiveFolder(null);
                  }}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${viewMode === 'all'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white'
                    }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                  <span>All Apps (18)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar (Smartphone App Drawer Style with High-Contrast White Surface) */}
          <div className="relative z-10 mt-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search any function (e.g. Vision, Timer, Stopwatch, To-Do, Health)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white/95 backdrop-blur-md border border-white/50 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/80 focus:bg-white transition shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-200/80 rounded-full w-5 h-5 flex items-center justify-center shadow-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Language Selector Bar (Compact, Mobile-Fit, Glossy Inset) */}
          <div className="relative z-10 mt-3 pt-3 border-t border-white/20 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 w-full min-w-0">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0" ref={langDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                  className="w-full min-w-0 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs flex items-center justify-between gap-1.5 focus:outline-none focus:ring-2 focus:ring-white/50 transition cursor-pointer"
                  title="Select Language"
                >
                  <div className="truncate min-w-0 flex items-center gap-1.5 text-left">
                    <span className="text-xs shrink-0">🌐</span>
                    <span className="shrink-0">{PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.flag}</span>
                    <span className="truncate font-bold text-white">{PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}</span>
                    <span className="text-[10px] text-white/80 font-medium hidden sm:inline">({PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.nativeName})</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/80 shrink-0 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Scrollable Language Dropdown */}
                {isLangDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-2xl bg-white border border-slate-200/90 shadow-2xl z-50 py-1 divide-y divide-slate-100 text-left">
                    {PLANNER_LANGUAGES.map((lang) => {
                      const isSelected = selectedLanguage === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            setIsLangDropdownOpen(false);
                            setLanguageSaved(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition hover:bg-emerald-50/80 ${isSelected ? 'bg-emerald-50/90 text-emerald-900 font-bold' : 'text-slate-700'
                            }`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <span className="text-sm shrink-0">{lang.flag}</span>
                            <span className="font-semibold truncate">{lang.name}</span>
                            <span className="text-[11px] text-slate-500 font-normal shrink-0">({lang.nativeName})</span>
                            {lang.code === 'en' && (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold shrink-0">
                                Default
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveLanguage}
                disabled={isSavingLang}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm active:scale-95 whitespace-nowrap min-w-[58px] cursor-pointer ${languageSaved
                  ? 'bg-white text-emerald-800'
                  : 'bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30'
                  }`}
                title="Save Selected Language"
              >
                <span>{languageSaved ? '✓ Saved' : isSavingLang ? '...' : 'Save'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between xs:justify-end gap-1.5 text-[11px] font-semibold text-white/90 shrink-0">
              <span className="bg-white/20 px-2 py-0.5 rounded-full border border-white/30 truncate">
                {PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}
              </span>
              {languageSaved && (
                <span className="text-emerald-900 font-bold bg-white px-2 py-0.5 rounded-full border border-white shrink-0">
                  ✓ Saved
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Search Results (When user types in search box) */}
      {/* ========================================================= */}
      {searchQuery.trim() !== '' ? (
        <div className="bg-white/95 backdrop-blur-md rounded-[26px] border border-slate-200/90 p-4 sm:p-6 space-y-4 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
              Search Results ({filteredApps.length})
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
          {filteredApps.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No functions found matching "{searchQuery}".</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredApps.map((app) => (
                <PlannerModuleCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </div>
      ) : activeFolder && currentFolder ? (
        /* ========================================================= */
        /* Inside A Folder View (3D Squircle Cards Pattern) */
        /* ========================================================= */
        <div className="space-y-5">
          {/* Top Folder Banner with Glossy Specular Highlight */}
          <div
            className={`relative overflow-hidden p-5 sm:p-6 rounded-[26px] bg-gradient-to-r ${currentFolder.themeColor} text-white flex items-center justify-between gap-3 shadow-[0_12px_28px_rgba(0,0,0,0.14)] border border-white/20`}
          >
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[26px] pointer-events-none" />
            <div className="relative z-10 space-y-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/90 bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30">
                  Folder Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 tracking-tight drop-shadow-sm">
                <span className="text-2xl">{currentFolder.emoji || '☀️'}</span>
                <span>{currentFolder.title}</span>
              </h2>
              <p className="text-xs sm:text-sm text-white/95 font-medium leading-relaxed">
                {currentFolder.tagline}
              </p>
            </div>
            <button
              onClick={() => setActiveFolder(null)}
              className="relative z-10 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white flex flex-col items-center justify-center transition active:scale-95 shadow-sm shrink-0 min-w-[70px] cursor-pointer"
              title="Back to All Cards"
            >
              <span className="text-base font-bold leading-none">←</span>
              <span className="text-xs font-bold leading-tight mt-1">Back</span>
            </button>
          </div>

          {/* 3D Squircle Cards Grid for this folder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {currentFolder.apps.map((app) => (
              <PlannerModuleCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      ) : viewMode === 'all' ? (
        /* ========================================================= */
        /* "All Apps" 3D Squircle Grid View (18 Cards) */
        /* ========================================================= */
        <div className="bg-white/95 backdrop-blur-md rounded-[26px] border border-slate-200/90 p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">All Functions (18 3D Module Cards)</h2>
              <p className="text-xs text-slate-500">Tap any card or link to launch the module instantly</p>
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200">
              18 Modules Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 py-1">
            {allApps.map((app) => (
              <PlannerModuleCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* The 4 Master Cards View */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Top 4 Master Folder Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {masterCards.map((card) => {
              const IconComp = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => setActiveFolder(card.id)}
                  className={`group cursor-pointer rounded-[22px] border ${card.cardBorder} ${card.cardLightBg} backdrop-blur-md p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1.5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)] active:scale-[0.98] flex flex-col justify-between space-y-4 border-l-4 ${card.sideBorderColor}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`relative w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.themeColor} text-white shadow-[0_6px_14px_rgba(0,0,0,0.15)] flex items-center justify-center transition group-hover:scale-105 overflow-hidden`}
                      >
                        <div className="absolute top-0.5 inset-x-1 h-3.5 bg-gradient-to-b from-white/40 to-transparent rounded-t-xl pointer-events-none" />
                        <IconComp className="w-6 h-6 stroke-[2.2] drop-shadow-sm text-white" />
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-white/80 border border-slate-200/60 text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                        {card.apps.length} APPS
                      </span>
                    </div>

                    <div>
                      <h3 className={`text-base font-bold ${card.accentTextColor} group-hover:opacity-80 transition flex items-center gap-1`}>
                        <span>{card.title}</span>
                        <span className="text-xs transition-transform group-hover:translate-x-1">→</span>
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{card.tagline}</p>
                    </div>
                  </div>

                  {/* Micro-preview of squircle icons inside */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5">
                      {card.apps.slice(0, 4).map((a) => (
                        <div
                          key={a.id}
                          className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${a.bgGradient} border-2 border-white shadow-[0_2px_5px_rgba(0,0,0,0.15)] flex items-center justify-center text-white text-xs`}
                          title={a.name}
                        >
                          {a.emoji ? <span>{a.emoji}</span> : <a.icon className="w-3.5 h-3.5" />}
                        </div>
                      ))}
                    </div>
                    <span className={`text-xs font-bold ${card.accentTextColor} flex items-center gap-0.5 group-hover:translate-x-1 transition`}>
                      <span>Explore</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Life Planner Modules: All Sections with 3D Squircle Cards */}
          <div className="space-y-6">
            {masterCards.map((category) => (
              <div
                key={category.id}
                className="bg-white/90 backdrop-blur-md rounded-[26px] border border-slate-200/80 p-4 sm:p-6 space-y-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{category.emoji}</span>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                        {category.title}
                      </h4>
                      <p className="text-xs text-slate-500 hidden sm:block">{category.tagline}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveFolder(category.id)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 hover:bg-emerald-100/70 transition"
                  >
                    <span>View category</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Approved 3D Squircle Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-1">
                  {category.apps.map((app) => (
                    <PlannerModuleCard key={app.id} app={app} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Approved 3D Squircle Module Card
// Matches media_1793350244998_5140c00c.png:
// - 3D Squircle Icon with top specular shine
// - Right-aligned uppercase Tag Pill
// - Bold Contrast Color Title with hover arrow
// - 2-line Description
// - Border divider line
// - "Open module →" footer link
// ==========================================
function PlannerModuleCard({ app }: { app: SubApp & { folderName?: string } }) {
  const IconComponent = app.icon;
  const tag = app.badge || app.tag || 'MODULE';
  const textClass = app.accentTextColor || 'text-slate-900';
  const sideBorder = app.sideBorderColor || 'border-l-emerald-500';

  return (
    <div
      className={`group rounded-[22px] bg-white border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between border-l-4 ${sideBorder}`}
    >
      <div className="p-4 sm:p-5 pb-3">
        {/* Top Row: 3D Squircle Icon + Tag Pill */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div
            className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${app.bgGradient} shadow-[0_6px_16px_rgba(0,0,0,0.14)] flex items-center justify-center text-white shrink-0 overflow-hidden`}
          >
            {/* Top Specular Shine */}
            <div className="absolute top-0.5 inset-x-1 h-3.5 bg-gradient-to-b from-white/40 to-transparent rounded-t-xl pointer-events-none" />
            {app.emoji ? (
              <span className="text-2xl select-none drop-shadow-sm leading-none">{app.emoji}</span>
            ) : (
              <IconComponent className="w-5 h-5 text-white stroke-[2.2] drop-shadow-sm" />
            )}
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-slate-100/90 border border-slate-200/60 text-slate-500 font-bold text-[10px] sm:text-[11px] tracking-wider uppercase">
            {tag}
          </span>
        </div>

        {/* Title with hover arrow */}
        <Link
          href={app.href}
          className={`font-bold text-base sm:text-[17px] tracking-tight ${textClass} group-hover:opacity-85 transition flex items-center gap-1.5`}
        >
          <span>{app.name}</span>
          <span className="text-sm transition-transform duration-200 group-hover:translate-x-1">→</span>
        </Link>

        {/* Subtitle / Description */}
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mt-1 line-clamp-2">
          {app.subtitle}
        </p>
      </div>

      {/* Bottom Footer Link */}
      <Link
        href={app.href}
        className="border-t border-slate-100 px-4 py-3 sm:px-5 flex items-center justify-between bg-slate-50/60 group-hover:bg-slate-100/80 transition"
      >
        <span className={`text-xs font-bold ${textClass}`}>Open module</span>
        <span className={`text-xs font-bold ${textClass} transition-transform duration-200 group-hover:translate-x-1`}>
          →
        </span>
      </Link>
    </div>
  );
}

// ==========================================
// Reusable Round App Icon Card (For compact orbs)
// ==========================================
function AppCircleCard({ app }: { app: SubApp & { folderName?: string }; showFolderBadge?: boolean }) {
  const IconComponent = app.icon;

  return (
    <Link
      href={app.href}
      className="group flex flex-col items-center text-center focus:outline-none transition-all duration-200 min-w-0"
    >
      <div className="relative mb-2">
        {/* Outer 3D Pedestal Ring with soft shadow */}
        <div className="p-[3px] rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-200 shadow-[0_8px_18px_rgba(15,23,42,0.12),0_2px_4px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,1)] group-hover:-translate-y-1.5 group-hover:shadow-[0_14px_26px_rgba(15,23,42,0.18)] active:translate-y-0.5 active:scale-95 transition-all duration-200">
          {/* Inner 3D Glassy Orb */}
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr ${app.bgGradient} text-white relative overflow-hidden flex items-center justify-center text-2xl sm:text-3xl shadow-[inset_0_2px_5px_rgba(255,255,255,0.7),inset_0_-3px_5px_rgba(0,0,0,0.3)]`}
          >
            {/* Top Specular 3D Crescent Reflection */}
            <div className="absolute top-0 inset-x-2 h-[46%] bg-gradient-to-b from-white/60 to-transparent rounded-t-full pointer-events-none" />
            {app.emoji ? (
              <span className="select-none drop-shadow-sm text-2xl sm:text-3xl leading-none">{app.emoji}</span>
            ) : (
              <IconComponent className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2] drop-shadow-sm" />
            )}
          </div>
        </div>
        {app.badge && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[8px] xs:text-[9px] px-1.5 py-0.2 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.15)] border border-white">
            {app.badge}
          </span>
        )}
      </div>

      <div className="w-full min-w-0 px-0.5">
        <p className="text-[11px] xs:text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition leading-snug tracking-tight text-center break-words hyphens-auto">
          {app.name}
        </p>
      </div>
    </Link>
  );
}
