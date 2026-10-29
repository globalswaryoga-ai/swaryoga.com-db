'use client';

import React, { useState } from 'react';
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
  ExternalLink,
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
  titleHindi: string;
  tagline: string;
  themeColor: string;
  accentBg: string;
  icon: React.ComponentType<{ className?: string }>;
  apps: SubApp[];
}

export default function LifePlannerDashboardHome() {
  const router = useRouter();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'all'>('folders');
  const [searchQuery, setSearchQuery] = useState('');

  const masterCards: MasterCard[] = [
    {
      id: 'vision',
      title: 'Vision',
      titleHindi: 'संकल्प व ध्येय',
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
      id: 'sadhana',
      title: 'Sadhana',
      titleHindi: 'साधना व अभ्यास',
      tagline: 'Yogic breath, meditation, timer & inner focus',
      themeColor: 'from-[#ff7a18] to-[#d95300]',
      accentBg: 'bg-orange-50 text-orange-800 border-orange-200',
      icon: Flame,
      apps: [
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
      id: 'tools',
      title: 'Tools',
      titleHindi: 'दैनिक साधन व स्मृतियाँ',
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
    {
      id: 'today',
      title: 'Today',
      titleHindi: 'आज का दिन व स्वास्थ्य',
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
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition active:scale-95 shadow-sm flex items-center justify-center"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {activeFolder ? `Folder: ${currentFolder?.title}` : 'Swar Yoga Life Planner'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {activeFolder ? currentFolder?.titleHindi : 'L-Planner Launchpad'}
              </h1>
            </div>
          </div>

          {/* Toggle between "Folders (4 Cards)" and "All (16 Apps)" */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start sm:self-auto">
            <button
              onClick={() => {
                setViewMode('folders');
                setActiveFolder(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                viewMode === 'folders' && !activeFolder
                  ? 'bg-white text-slate-900 shadow-sm'
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
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                viewMode === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-orange-600" />
              <span>All Apps (18)</span>
            </button>
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
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-200/60 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* Search Results (When user types in search box) */}
      {/* ========================================================= */}
      {searchQuery.trim() !== '' ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
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
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Folder Banner */}
          <div
            className={`p-6 rounded-2xl bg-gradient-to-r ${currentFolder.themeColor} text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md`}
          >
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Folder Category</span>
              <h2 className="text-2xl sm:text-3xl font-black">{currentFolder.title}</h2>
              <p className="text-xs sm:text-sm text-white/85">{currentFolder.tagline}</p>
            </div>
            <button
              onClick={() => setActiveFolder(null)}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
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
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
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
                  className="group cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-all hover:shadow-lg active:scale-[0.98] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.themeColor} text-white shadow-md flex items-center justify-center transition group-hover:scale-105`}
                      >
                        <IconComp className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
                        {card.apps.length} apps
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400 font-mono">#{idx + 1}</span>
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition">
                          {card.title}
                        </h3>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{card.titleHindi}</p>
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
                            className={`w-7 h-7 rounded-full bg-gradient-to-tr ${a.bgGradient} border-2 border-white shadow-xs flex items-center justify-center text-white`}
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
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-8 shadow-sm">
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
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${category.themeColor}`} />
                    <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                      {category.title} ({category.titleHindi})
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
// Reusable Round App Icon Card (Smartphone Style)
// ==========================================
function AppCircleCard({ app, showFolderBadge }: { app: SubApp & { folderName?: string }; showFolderBadge?: boolean }) {
  const IconComponent = app.icon;

  return (
    <Link
      href={app.href}
      className="group flex flex-col items-center text-center focus:outline-none transition active:scale-90"
    >
      <div className="relative">
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr ${app.bgGradient} text-white shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200 flex items-center justify-center`}
        >
          <IconComponent className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.2]" />
        </div>
        {app.badge && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full shadow-sm border border-white">
            {app.badge}
          </span>
        )}
      </div>

      <div className="mt-2 space-y-0.5 w-full">
        <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition truncate max-w-full">
          {app.name}
        </p>
        <p className="text-[10px] text-slate-400 truncate max-w-full hidden sm:block">
          {app.subtitle}
        </p>
      </div>
    </Link>
  );
}
