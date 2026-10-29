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
  href: string;
  bgGradient: string;
  badge?: string;
}

interface MasterCard {
  id: 'vision' | 'sadhana' | 'tools' | 'today';
  title: string;
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
      tagline: 'Daily focus, seasonal Ayurvedic diet, wellness & calendar',
      themeColor: 'from-[#d97706] to-[#b45309]',
      accentBg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Sun,
      apps: [
        {
          id: 'daily_page',
          name: 'Daily Page',
          subtitle: 'Habits & routine',
          icon: Sun,
          href: '/life-planner/dashboard/daily',
          bgGradient: 'from-amber-500 to-orange-600',
          badge: 'Today',
        },
        {
          id: 'rutucharya',
          name: 'Rutucharya',
          subtitle: 'Ayurvedic season guide',
          icon: Leaf,
          href: '/life-planner/dashboard/ritucharya',
          bgGradient: 'from-emerald-600 to-green-700',
        },
        {
          id: 'health',
          name: 'Health',
          subtitle: 'Vitals & wellness',
          icon: HeartPulse,
          href: '/life-planner/dashboard/health',
          bgGradient: 'from-rose-500 to-red-600',
        },
        {
          id: 'calendar',
          name: 'Calendar',
          subtitle: 'Tithi & Swar timings',
          icon: CalendarDays,
          href: '/life-planner/dashboard/calendar',
          bgGradient: 'from-sky-600 to-blue-700',
        },
      ],
    },
    {
      id: 'sadhana',
      title: 'My Sadhana',
      tagline: 'Yogic breath, meditation, timer & inner focus',
      themeColor: 'from-[#ff7a18] to-[#d95300]',
      accentBg: 'bg-orange-50 text-orange-800 border-orange-200',
      icon: Flame,
      apps: [
        {
          id: 'sadhana_page',
          name: 'Sadhana Page',
          subtitle: 'Daily morning & evening practice',
          icon: Flame,
          href: '/life-planner/dashboard/sadhana',
          bgGradient: 'from-orange-600 to-amber-700',
          badge: 'Daily',
        },
        {
          id: 'stopwatch',
          name: 'Stopwatch',
          subtitle: 'Kumbhaka retention',
          icon: Flame,
          href: '/life-planner/dashboard/sadhana?tab=stopwatch',
          bgGradient: 'from-red-500 to-orange-600',
          badge: 'Live',
        },
        {
          id: 'timer',
          name: 'Timer',
          subtitle: 'Singing bowl chimes',
          icon: Timer,
          href: '/life-planner/dashboard/sadhana?tab=timer',
          bgGradient: 'from-amber-500 to-yellow-600',
          badge: 'Sound',
        },
        {
          id: 'meditations',
          name: 'Meditations',
          subtitle: 'Swar Dhyana audio',
          icon: Play,
          href: '/life-planner/dashboard/sadhana?tab=meditation',
          bgGradient: 'from-indigo-600 to-blue-700',
        },
        {
          id: 'samyama',
          name: 'Samyama',
          subtitle: 'Patanjali Tratak focus',
          icon: CircleDot,
          href: '/life-planner/dashboard/sadhana?tab=samyama',
          bgGradient: 'from-purple-600 to-violet-800',
        },
      ],
    },
    {
      id: 'vision',
      title: 'My Vision',
      tagline: 'Life mission, goals, milestones & long-term targets',
      themeColor: 'from-[#0b3d2e] to-[#1b5e20]',
      accentBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: Target,
      apps: [
        {
          id: 'vision_board',
          name: 'Vision',
          subtitle: 'Life blueprint',
          icon: Target,
          href: '/life-planner/dashboard/vision',
          bgGradient: 'from-emerald-600 to-teal-700',
        },
        {
          id: 'action_plan',
          name: 'Action Plan',
          subtitle: 'Strategic roadmap',
          icon: Flag,
          href: '/life-planner/dashboard/action-plan',
          bgGradient: 'from-teal-600 to-cyan-700',
        },
        {
          id: 'goals',
          name: 'Goals',
          subtitle: 'Measurable targets',
          icon: Trophy,
          href: '/life-planner/dashboard/goals',
          bgGradient: 'from-amber-500 to-orange-600',
        },
        {
          id: 'tasks',
          name: 'Tasks',
          subtitle: 'Milestone tasks',
          icon: CheckSquare,
          href: '/life-planner/dashboard/tasks',
          bgGradient: 'from-orange-500 to-rose-600',
        },
        {
          id: 'events',
          name: 'Events',
          subtitle: 'Key dates & camps',
          icon: Calendar,
          href: '/life-planner/dashboard/events',
          bgGradient: 'from-blue-600 to-indigo-700',
        },
        {
          id: 'download_vision',
          name: 'Download Vision',
          subtitle: 'Printable PDF',
          icon: Download,
          href: '/life-planner/dashboard/vision-download',
          bgGradient: 'from-purple-600 to-pink-700',
          badge: 'PDF',
        },
      ],
    },
    {
      id: 'tools',
      title: 'My Tools',
      tagline: 'Fast daily todos, reminders, affirmations & contacts',
      themeColor: 'from-[#1e40af] to-[#1e3a8a]',
      accentBg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: ListTodo,
      apps: [
        {
          id: 'todo',
          name: 'To Do',
          subtitle: 'Swar-aligned tasks',
          icon: ListTodo,
          href: '/life-planner/dashboard/todos',
          bgGradient: 'from-blue-600 to-indigo-700',
        },
        {
          id: 'reminder',
          name: 'Reminder',
          subtitle: 'Alarms & Swar alerts',
          icon: Bell,
          href: '/life-planner/dashboard/reminders',
          bgGradient: 'from-amber-600 to-orange-700',
        },
        {
          id: 'words',
          name: 'Words',
          subtitle: 'Power affirmations',
          icon: BookOpen,
          href: '/life-planner/dashboard/words',
          bgGradient: 'from-emerald-600 to-teal-700',
        },
        {
          id: 'diamond_people',
          name: 'Diamond People',
          subtitle: 'Mentors & inner circle',
          icon: Users,
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
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06),0_2px_4px_-1px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 transition active:scale-95 shadow-[0_2px_6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] border border-slate-200/80 flex items-center justify-center"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-xs">
                  {activeFolder ? `Folder: ${currentFolder?.title}` : 'Swar Yoga Life Planner'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {activeFolder ? currentFolder?.title : 'L-Planner Launchpad'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* Direct Link: L-Plan Diagnostic & Guide Page */}
            <Link
              href="/life-planner"
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-200 shadow-xs hover:shadow active:scale-95"
              title="Open L-Plan Diagnostic Chart & Breath Frequencies"
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>L-Plan Guide</span>
            </Link>

            {/* Toggle between "Folders (4 Cards)" and "All (19 Apps)" */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 shadow-inner">
              <button
                onClick={() => {
                  setViewMode('folders');
                  setActiveFolder(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${viewMode === 'folders' && !activeFolder
                  ? 'bg-white text-slate-900 shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Folder className="w-4 h-4 text-emerald-700" />
                <span>4 Cards</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('all');
                  setActiveFolder(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${viewMode === 'all'
                  ? 'bg-white text-slate-900 shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <LayoutGrid className="w-4 h-4 text-orange-600" />
                <span>All Apps (18)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar (Smartphone App Drawer Style) */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search any function (e.g. Vision, Timer, Stopwatch, To-Do, Health)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-inner"
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

        {/* Language Selector Dropdown (27 Languages - Scrollable Custom Menu, Strictly No Urdu) */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
              <span>🌐</span>
              <span>Language:</span>
            </span>
            <div className="relative flex-1" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs flex items-center justify-between gap-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition cursor-pointer"
                title="Select Language"
              >
                <span className="truncate flex items-center gap-1.5">
                  <span>{PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.flag}</span>
                  <span>{PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium">({PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.nativeName})</span>
                  {selectedLanguage === 'en' && <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded font-semibold">— Default</span>}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
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
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-sm">{lang.flag}</span>
                          <span className="font-semibold">{lang.name}</span>
                          <span className="text-[11px] text-slate-500 font-normal">({lang.nativeName})</span>
                          {lang.code === 'en' && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                              Default
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 font-bold" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={handleSaveLanguage}
              disabled={isSavingLang}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap ${
                languageSaved
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
              title="Save Selected Language"
            >
              <span>{languageSaved ? '✓ Saved' : isSavingLang ? 'Saving...' : 'Save'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
              Selected: <strong className="text-slate-800">{PLANNER_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}</strong>
            </span>
            {languageSaved && (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
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
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-6 space-y-4 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
              Search Results ({filteredApps.length})
            </h2>
          </div>
          {filteredApps.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No functions found matching "{searchQuery}".</p>
          ) : (
            <div className="grid grid-cols-4 gap-4 sm:gap-6">
              {filteredApps.map((app) => (
                <AppCircleCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </div>
      ) : activeFolder && currentFolder ? (
        /* ========================================================= */
        /* Inside A Folder View (After tapping one of the 4 cards) */
        /* ========================================================= */
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-6 sm:p-8 space-y-6 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
          {/* Folder Banner */}
          <div
            className={`p-6 rounded-2xl bg-gradient-to-r ${currentFolder.themeColor} text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_10px_20px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.3)]`}
          >
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Folder Category</span>
              <h2 className="text-2xl sm:text-3xl font-black">{currentFolder.title}</h2>
              <p className="text-xs sm:text-sm text-white/85">{currentFolder.tagline}</p>
            </div>
            <button
              onClick={() => setActiveFolder(null)}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm border border-white/30"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to 4 Cards</span>
            </button>
          </div>

          {/* Sub-Apps in 4-Column Round Cards */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              {currentFolder.apps.length} Apps inside {currentFolder.title}
            </p>
            <div className="grid grid-cols-4 gap-4 sm:gap-6 py-2">
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
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-6 sm:p-8 space-y-6 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">All Functions (18 Cards in 4 Columns)</h2>
              <p className="text-xs text-slate-500">Tap any icon to open the module instantly</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 sm:gap-6 py-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {masterCards.map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => setActiveFolder(card.id)}
                  className="group cursor-pointer rounded-3xl border border-white/90 bg-white/90 backdrop-blur-md p-5 transition-all duration-300 hover:-translate-y-1.5 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_20px_35px_-10px_rgba(15,23,42,0.12),inset_0_1px_1px_rgba(255,255,255,1)] ring-1 ring-slate-900/5 active:scale-[0.98] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.themeColor} text-white shadow-[0_6px_14px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition group-hover:scale-105`}
                      >
                        <IconComp className="w-6 h-6 stroke-[2.2] drop-shadow-sm" />
                      </div>
                      <span className="text-slate-400 text-sm font-bold group-hover:translate-x-0.5 transition-transform">
                        ›
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">{card.tagline}</p>
                    </div>
                  </div>

                  {/* Micro-preview of 4 round icons inside */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5">
                      {card.apps.slice(0, 4).map((a) => {
                        const SubIcon = a.icon;
                        return (
                          <div
                            key={a.id}
                            className={`w-7 h-7 rounded-full bg-gradient-to-tr ${a.bgGradient} border-2 border-white shadow-[0_2px_5px_rgba(0,0,0,0.15)] flex items-center justify-center text-white`}
                            title={a.name}
                          >
                            <SubIcon className="w-3.5 h-3.5" />
                          </div>
                        );
                      })}
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
          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-6 sm:p-8 space-y-8 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">4 Column App Grid</h3>
                <p className="text-xs text-slate-500">Tap any round card to launch instantly</p>
              </div>
            </div>

            {masterCards.map((category) => (
              <div key={category.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${category.themeColor} shadow-sm`} />
                    <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">
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

                <div className="grid grid-cols-4 gap-4 sm:gap-6 py-1">
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
// Reusable Round App Icon Card (Smartphone Style with Light 3D Effect)
// ==========================================
function AppCircleCard({ app, showFolderBadge }: { app: SubApp & { folderName?: string }; showFolderBadge?: boolean }) {
  const IconComponent = app.icon;

  return (
    <Link
      href={app.href}
      className="group flex flex-col items-center text-center focus:outline-none transition-all duration-200"
    >
      <div className="relative">
        {/* Outer 3D Pedestal Ring */}
        <div className="p-1 rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-200 shadow-[0_6px_14px_rgba(15,23,42,0.08),0_2px_4px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,1)] group-hover:-translate-y-1.5 group-hover:shadow-[0_12px_22px_rgba(15,23,42,0.16)] active:translate-y-0.5 active:scale-95 transition-all duration-200">
          {/* Inner 3D Glassy Orb */}
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr ${app.bgGradient} text-white relative overflow-hidden flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.25)]`}
          >
            {/* Top Specular 3D Reflection */}
            <div className="absolute top-0 inset-x-2 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />
            <IconComponent className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.2] drop-shadow-sm" />
          </div>
        </div>
        {app.badge && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.15)] border border-white">
            {app.badge}
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-0.5 w-full">
        <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition truncate max-w-full tracking-tight">
          {app.name}
        </p>
        <p className="text-[10px] font-medium text-slate-400 truncate max-w-full hidden sm:block">
          {app.subtitle}
        </p>
      </div>
    </Link>
  );
}
