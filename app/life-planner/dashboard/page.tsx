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
}

interface MasterCard {
  id: 'vision' | 'sadhana' | 'tools' | 'today';
  title: string;
  emoji?: string;
  tagline: string;
  themeColor: string;
  accentBg: string;
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
    } catch (_) {}
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
      }).catch(() => {});
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
      themeColor: 'from-[#d97706] to-[#b45309]',
      accentBg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Sun,
      apps: [
        {
          id: 'daily_page',
          name: 'Daily Page',
          subtitle: 'Habits & routine',
          icon: Sun,
          emoji: '🌅',
          href: '/life-planner/dashboard/daily',
          bgGradient: 'from-amber-400 to-orange-500',
          badge: 'Today',
        },
        {
          id: 'rutucharya',
          name: 'Rutucharya',
          subtitle: 'Ayurvedic season guide',
          icon: Leaf,
          emoji: '🌿',
          href: '/life-planner/dashboard/ritucharya',
          bgGradient: 'from-emerald-500 to-green-600',
        },
        {
          id: 'health',
          name: 'Health',
          subtitle: 'Vitals & wellness',
          icon: HeartPulse,
          emoji: '❤️',
          href: '/life-planner/dashboard/health',
          bgGradient: 'from-rose-500 to-red-600',
        },
        {
          id: 'calendar',
          name: 'Calendar',
          subtitle: 'Tithi & Swar timings',
          icon: CalendarDays,
          emoji: '📅',
          href: '/life-planner/dashboard/calendar',
          bgGradient: 'from-sky-500 to-blue-600',
        },
      ],
    },
    {
      id: 'sadhana',
      title: 'My Sadhana',
      emoji: '🧘‍♂️',
      tagline: 'Sadhana page routine, stopwatch, singing bowl timer, meditation & samyama',
      themeColor: 'from-[#ff7a18] to-[#d95300]',
      accentBg: 'bg-orange-50 text-orange-800 border-orange-200',
      icon: Flame,
      apps: [
        {
          id: 'sadhana_page',
          name: 'Sadhana Page',
          subtitle: 'Daily morning & evening practice',
          icon: Flame,
          emoji: '🧘‍♂️',
          href: '/life-planner/dashboard/sadhana',
          bgGradient: 'from-orange-500 to-amber-600',
          badge: 'Daily',
        },
        {
          id: 'stopwatch',
          name: 'Stopwatch',
          subtitle: 'Kumbhaka retention',
          icon: Flame,
          emoji: '⏱️',
          href: '/life-planner/dashboard/sadhana?tab=stopwatch',
          bgGradient: 'from-red-500 to-orange-600',
          badge: 'Live',
        },
        {
          id: 'timer',
          name: 'Timer',
          subtitle: 'Singing bowl chimes',
          icon: Timer,
          emoji: '🔔',
          href: '/life-planner/dashboard/sadhana?tab=timer',
          bgGradient: 'from-amber-500 to-yellow-600',
          badge: 'Sound',
        },
        {
          id: 'meditations',
          name: 'Meditations',
          subtitle: 'Swar Dhyana audio',
          icon: Play,
          emoji: '🎧',
          href: '/life-planner/dashboard/sadhana?tab=meditation',
          bgGradient: 'from-indigo-600 to-blue-700',
        },
        {
          id: 'samyama',
          name: 'Samyama',
          subtitle: 'Patanjali Tratak focus',
          icon: CircleDot,
          emoji: '🎯',
          href: '/life-planner/dashboard/sadhana?tab=samyama',
          bgGradient: 'from-purple-600 to-violet-800',
        },
      ],
    },
    {
      id: 'vision',
      title: 'My Vision',
      emoji: '🎯',
      tagline: 'Life blueprint, strategic action plan, goals, tasks, events & downloads',
      themeColor: 'from-[#0b3d2e] to-[#1b5e20]',
      accentBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: Target,
      apps: [
        {
          id: 'vision_board',
          name: 'Vision',
          subtitle: 'Life blueprint',
          icon: Target,
          emoji: '🎯',
          href: '/life-planner/dashboard/vision',
          bgGradient: 'from-emerald-600 to-teal-700',
        },
        {
          id: 'action_plan',
          name: 'Action Plan',
          subtitle: 'Strategic roadmap',
          icon: Flag,
          emoji: '🗺️',
          href: '/life-planner/dashboard/action-plan',
          bgGradient: 'from-teal-600 to-cyan-700',
        },
        {
          id: 'goals',
          name: 'Goals',
          subtitle: 'Measurable targets',
          icon: Trophy,
          emoji: '🏆',
          href: '/life-planner/dashboard/goals',
          bgGradient: 'from-amber-500 to-orange-600',
        },
        {
          id: 'tasks',
          name: 'Tasks',
          subtitle: 'Milestone tasks',
          icon: CheckSquare,
          emoji: '📝',
          href: '/life-planner/dashboard/tasks',
          bgGradient: 'from-orange-500 to-rose-600',
        },
        {
          id: 'events',
          name: 'Events',
          subtitle: 'Key dates & camps',
          icon: Calendar,
          emoji: '🎪',
          href: '/life-planner/dashboard/events',
          bgGradient: 'from-blue-600 to-indigo-700',
        },
        {
          id: 'download_vision',
          name: 'Download Vision',
          subtitle: 'Printable PDF',
          icon: Download,
          emoji: '📥',
          href: '/life-planner/dashboard/vision-download',
          bgGradient: 'from-purple-600 to-pink-700',
          badge: 'PDF',
        },
      ],
    },
    {
      id: 'tools',
      title: 'My Tools',
      emoji: '🛠️',
      tagline: 'Quick to-do list, swar alarms, power words & diamond network',
      themeColor: 'from-[#1e40af] to-[#1e3a8a]',
      accentBg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: ListTodo,
      apps: [
        {
          id: 'todo',
          name: 'To Do',
          subtitle: 'Swar-aligned tasks',
          icon: ListTodo,
          emoji: '✅',
          href: '/life-planner/dashboard/todos',
          bgGradient: 'from-blue-600 to-indigo-700',
        },
        {
          id: 'reminder',
          name: 'Reminder',
          subtitle: 'Alarms & Swar alerts',
          icon: Bell,
          emoji: '🔔',
          href: '/life-planner/dashboard/reminders',
          bgGradient: 'from-amber-600 to-orange-700',
        },
        {
          id: 'words',
          name: 'Words',
          subtitle: 'Power affirmations',
          icon: BookOpen,
          emoji: '💬',
          href: '/life-planner/dashboard/words',
          bgGradient: 'from-emerald-600 to-teal-700',
        },
        {
          id: 'diamond_people',
          name: 'Diamond People',
          subtitle: 'Mentors & inner circle',
          icon: Users,
          emoji: '💎',
          href: '/life-planner/dashboard/diamond-people',
          bgGradient: 'from-rose-600 to-pink-700',
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

      {/* Top Header Bar with Universal Back Arrow */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06),0_2px_4px_-1px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5 p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={handleBack}
              className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 transition active:scale-95 shadow-[0_2px_6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] border border-slate-200/80 flex items-center justify-center shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-xs truncate">
                  {activeFolder ? `Folder: ${currentFolder?.title}` : 'Swar Yoga Life Planner'}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5 truncate">
                {activeFolder ? currentFolder?.title : 'L-Planner Launchpad'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-between sm:justify-start">
            {/* Direct Link: L-Plan Diagnostic & Guide Page */}
            <Link
              href="/life-planner"
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-200 shadow-xs hover:shadow active:scale-95"
              title="Open L-Plan Diagnostic Chart & Breath Frequencies"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>L-Plan Guide</span>
            </Link>

            {/* Toggle between "Folders (4 Cards)" and "All (18 Apps)" */}
            <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 shadow-inner">
              <button
                onClick={() => {
                  setViewMode('folders');
                  setActiveFolder(null);
                }}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${viewMode === 'folders' && !activeFolder
                  ? 'bg-white text-slate-900 shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]'
                  : 'text-slate-600 hover:text-slate-900'
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
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${viewMode === 'all'
                  ? 'bg-white text-slate-900 shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                <span>All Apps (18)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar (Smartphone App Drawer Style) */}
        <div className="mt-3 sm:mt-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search any function (e.g. Vision, Timer, Stopwatch, To-Do, Health)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-200/80 rounded-full w-5 h-5 flex items-center justify-center shadow-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Language Selector Bar (Compact, Mobile-Fit, Never Overflows) */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 w-full min-w-0">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                className="w-full min-w-0 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs flex items-center justify-between gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition cursor-pointer"
                title="Select Language"
              >
                <div className="truncate min-w-0 flex items-center gap-1.5 text-left">
                  <span className="text-xs shrink-0">🌐</span>
                  <span className="shrink-0">{PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.flag}</span>
                  <span className="truncate font-bold text-slate-900">{PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">({PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.nativeName})</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Scrollable Language Dropdown (Max height 240px with smooth scroll) */}
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
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition hover:bg-emerald-50/80 ${
                          isSelected ? 'bg-emerald-50/90 text-emerald-900 font-bold' : 'text-slate-700'
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

            {/* Save Button - shrink-0 ensures it NEVER pushes outside screen boundary */}
            <button
              onClick={handleSaveLanguage}
              disabled={isSavingLang}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs active:scale-95 whitespace-nowrap min-w-[58px] ${
                languageSaved
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
              title="Save Selected Language"
            >
              <span>{languageSaved ? '✓ Saved' : isSavingLang ? '...' : 'Save'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between xs:justify-end gap-1.5 text-[11px] font-semibold text-slate-500 shrink-0">
            <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 truncate">
              {PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}
            </span>
            {languageSaved && (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                ✓ Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Search Results (When user types in search box) */}
      {/* ========================================================= */}
      {searchQuery.trim() !== '' ? (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-4 sm:p-6 space-y-4 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
              Search Results ({filteredApps.length})
            </h2>
          </div>
          {filteredApps.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No functions found matching "{searchQuery}".</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-6">
              {filteredApps.map((app) => (
                <AppCircleCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </div>
      ) : activeFolder && currentFolder ? (
        /* ========================================================= */
        /* Inside A Folder View (Exact match to media_1793311716540_8c05ff1f.jpg) */
        /* ========================================================= */
        <div className="space-y-4 max-w-xl mx-auto">
          {/* Top Folder Banner */}
          <div
            className={`p-4 sm:p-5 rounded-[26px] bg-gradient-to-r ${currentFolder.themeColor} text-white flex items-center justify-between gap-3 shadow-[0_10px_20px_rgba(0,0,0,0.14)]`}
          >
            <div className="space-y-0.5 min-w-0 pr-2">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 truncate tracking-tight">
                <span>{currentFolder.emoji || '☀️'}</span>
                <span>{currentFolder.title}</span>
              </h2>
              <p className="text-xs sm:text-sm text-white/90 font-medium leading-snug">
                {currentFolder.tagline}
              </p>
            </div>
            <button
              onClick={() => setActiveFolder(null)}
              className="px-4 py-2 sm:py-2.5 rounded-2xl bg-white/25 hover:bg-white/35 backdrop-blur-md border border-white/30 text-white flex flex-col items-center justify-center transition active:scale-95 shadow-sm shrink-0 min-w-[62px]"
              title="Back to 4 Cards"
            >
              <span className="text-sm font-bold leading-none">←</span>
              <span className="text-[11px] font-black uppercase tracking-wider leading-none mt-1">Back</span>
            </button>
          </div>

          {/* 4 Column Round App Grid Card */}
          <div className="bg-white rounded-[26px] p-4 sm:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] border border-slate-100">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-4 px-1">
              4 COLUMN ROUND APP GRID (TAP TO LAUNCH)
            </p>
            <div className="grid grid-cols-4 gap-2 xs:gap-3 sm:gap-4 text-center items-start">
              {currentFolder.apps.map((app) => (
                <AppCircleCard key={app.id} app={app} />
              ))}
            </div>
          </div>
        </div>
      ) : viewMode === 'all' ? (
        /* ========================================================= */
        /* "All Apps" 4-Column Grid View (18 Cards) */
        /* ========================================================= */
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">All Functions (18 Cards in 4 Columns)</h2>
              <p className="text-xs text-slate-500">Tap any icon to open the module instantly</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-6 py-1 sm:py-2">
            {allApps.map((app) => (
              <AppCircleCard key={app.id} app={app} showFolderBadge />
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* The 4 Master Cards View */
        /* ========================================================= */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {masterCards.map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => setActiveFolder(card.id)}
                  className="group cursor-pointer rounded-3xl border border-white/90 bg-white/90 backdrop-blur-md p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1.5 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_20px_35px_-10px_rgba(15,23,42,0.12),inset_0_1px_1px_rgba(255,255,255,1)] ring-1 ring-slate-900/5 active:scale-[0.98] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr ${card.themeColor} text-white shadow-[0_6px_14px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition group-hover:scale-105`}
                      >
                        <IconComp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2] drop-shadow-sm" />
                      </div>
                      <span className="text-slate-400 text-sm font-bold group-hover:translate-x-0.5 transition-transform">
                        ›
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">{card.tagline}</p>
                    </div>
                  </div>

                  {/* Micro-preview of 4 round icons inside */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5">
                      {card.apps.slice(0, 4).map((a) => (
                        <div
                          key={a.id}
                          className={`w-7 h-7 rounded-full bg-gradient-to-tr ${a.bgGradient} border-2 border-white shadow-[0_2px_5px_rgba(0,0,0,0.15)] flex items-center justify-center text-white text-xs`}
                          title={a.name}
                        >
                          {a.emoji ? <span>{a.emoji}</span> : <a.icon className="w-3.5 h-3.5" />}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-0.5 group-hover:translate-x-1 transition">
                      <span>Open</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Launchpad: All 4 Master Cards Expanded Inline */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">4 Column App Grid</h3>
                <p className="text-xs text-slate-500">Tap any round card to launch instantly</p>
              </div>
            </div>

            {masterCards.map((category) => (
              <div key={category.id} className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{category.emoji}</span>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
                      {category.title}
                    </h4>
                  </div>
                  <button
                    onClick={() => setActiveFolder(category.id)}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-6 py-1">
                  {category.apps.map((app) => (
                    <AppCircleCard key={app.id} app={app} />
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
// Reusable Round App Icon Card (Exact Match to Preview 3D Orbs)
// ==========================================
function AppCircleCard({ app, showFolderBadge }: { app: SubApp & { folderName?: string }; showFolderBadge?: boolean }) {
  const IconComponent = app.icon;

  return (
    <Link
      href={app.href}
      className="group flex flex-col items-center text-center focus:outline-none transition-all duration-200 min-w-0"
    >
      <div className="relative mb-1">
        {/* Outer 3D Pedestal Ring */}
        <div className="p-[3px] rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-300 shadow-[0_6px_14px_rgba(15,23,42,0.1),0_2px_4px_rgba(15,23,42,0.05),inset_0_1px_1px_rgba(255,255,255,1)] group-hover:-translate-y-1.5 group-hover:shadow-[0_12px_22px_rgba(15,23,42,0.18)] active:translate-y-0.5 active:scale-95 transition-all duration-200">
          {/* Inner 3D Glassy Orb */}
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr ${app.bgGradient} text-white relative overflow-hidden flex items-center justify-center text-2xl sm:text-3xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.25)]`}
          >
            {/* Top Specular 3D Reflection */}
            <div className="absolute top-0 inset-x-2 h-[48%] bg-gradient-to-b from-white/50 to-transparent rounded-t-full pointer-events-none" />
            {app.emoji ? (
              <span className="select-none drop-shadow-sm">{app.emoji}</span>
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

      <div className="w-full min-w-0 px-0.5 mt-1.5">
        <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition leading-tight tracking-tight break-words">
          {app.name}
        </p>
      </div>
    </Link>
  );
}
