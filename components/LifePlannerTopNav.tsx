'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, CheckSquare, HeartPulse, BarChart3, User, ArrowLeft, Calendar, Gem } from 'lucide-react';
import HealthTracker from './HealthTracker';
import ServerStatus from './ServerStatus';
import { clearSession } from '@/lib/sessionManager';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';

const topTabs = [
  { href: '/life-planner/dashboard/daily', label: 'Daily', icon: CheckSquare },
  { href: '/life-planner/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/life-planner/dashboard/health', label: 'Health', icon: HeartPulse },
  { href: '/life-planner/dashboard/diamond-people', label: 'Diamond', icon: Gem },
  { href: '/life-planner/dashboard/progress', label: 'Progress', icon: BarChart3 },
];

export default function LifePlannerTopNav({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [headerProgress, setHeaderProgress] = useState<null | {
    percent: number;
    details: string;
  }>(null);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    let cancelled = false;

    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

    const compute = async () => {
      try {
        const [tasks, todos, goals, words, reminders, visions, actionPlans] = await Promise.all([
          lifePlannerStorage.getTasks(),
          lifePlannerStorage.getTodos(),
          lifePlannerStorage.getGoals(),
          lifePlannerStorage.getWords(),
          lifePlannerStorage.getReminders(),
          lifePlannerStorage.getVisions(),
          lifePlannerStorage.getActionPlans(),
        ]);

        const safeArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
        const tasksArr = safeArr<any>(tasks);
        const todosArr = safeArr<any>(todos);
        const goalsArr = safeArr<any>(goals);
        const wordsArr = safeArr<any>(words);
        const remindersArr = safeArr<any>(reminders);
        const visionsArr = safeArr<any>(visions);
        const actionPlansArr = safeArr<any>(actionPlans);

        // Goals can live in multiple places (flat goals, vision.goals, actionPlan.goals)
        const derivedFromVisions = visionsArr.flatMap((v: any) => {
          const list = Array.isArray(v?.goals) ? (v.goals as any[]) : [];
          return list
            .filter(Boolean)
            .map((g: any) => ({ ...g, visionId: String(g?.visionId || v?.id || '').trim() }));
        });
        const derivedFromPlans = actionPlansArr
          .filter((p: any) => p?.visionId)
          .flatMap((p: any) => {
            const list = Array.isArray(p?.goals) ? (p.goals as any[]) : [];
            return list.filter(Boolean).map((g: any) => ({ ...g, visionId: String(p.visionId) }));
          });

        const goalsById = new Map<string, any>();
        for (const g of [...goalsArr, ...derivedFromVisions, ...derivedFromPlans]) {
          if (!g?.id) continue;
          goalsById.set(String(g.id), g);
        }
        const allGoals = Array.from(goalsById.values());

        const tasksTotal = tasksArr.length;
        const tasksCompleted = tasksArr.filter((t) => Boolean(t?.completed) || t?.status === 'completed' || Number(t?.progress) >= 100).length;
        const tasksRate = tasksTotal > 0 ? tasksCompleted / tasksTotal : null;

        const todosTotal = todosArr.length;
        const todosCompleted = todosArr.filter((t) => Boolean(t?.completed)).length;
        const todosRate = todosTotal > 0 ? todosCompleted / todosTotal : null;

        const goalsTotal = allGoals.length;
        const goalsCompleted = allGoals.filter((g) => g?.status === 'completed' || Number(g?.progress) >= 100).length;
        const goalsAvgProgress =
          goalsTotal > 0
            ? allGoals.reduce((sum, g) => sum + (Number(g?.progress) || (g?.status === 'completed' ? 100 : 0)), 0) / goalsTotal
            : null;
        const goalsRate = goalsAvgProgress !== null ? goalsAvgProgress / 100 : null;

        const wordsTotal = wordsArr.length;
        const wordsCompleted = wordsArr.filter((w) => w?.status === 'completed').length;
        const wordsRate = wordsTotal > 0 ? wordsCompleted / wordsTotal : null;

        const contributions = [tasksRate, todosRate, goalsRate, wordsRate].filter(
          (v): v is number => typeof v === 'number' && Number.isFinite(v)
        );

        const overall = contributions.length > 0 ? clamp((contributions.reduce((a, b) => a + b, 0) / contributions.length) * 100) : 0;

        // Extra context (kept short so it truncates nicely on mobile)
        const dueTodayTasks = tasksArr.filter((t) => (t?.targetDate || t?.dueDate || t?.startDate) === todayIso).length;
        const dueTodayTodos = todosArr.filter((t) => (t?.dueDate || t?.startDate) === todayIso).length;
        const milestonesCount = actionPlansArr.reduce((sum, p) => sum + (Array.isArray(p?.milestones) ? p.milestones.length : 0), 0);
        const remindersCount = remindersArr.length;

        const parts: string[] = [];
        // Totals as requested
        if (goalsTotal > 0) parts.push(`Goals ${goalsCompleted}/${goalsTotal}`);
        if (tasksTotal > 0) parts.push(`Tasks ${tasksCompleted}/${tasksTotal}`);
        if (todosTotal > 0) parts.push(`Todos ${todosCompleted}/${todosTotal}`);
        if (wordsTotal > 0) parts.push(`Words ${wordsCompleted}/${wordsTotal}`);
        if (dueTodayTasks + dueTodayTodos > 0) parts.push(`Today ${dueTodayTasks + dueTodayTodos}`);
        if (milestonesCount > 0) parts.push(`Milestones ${milestonesCount}`);
        if (remindersCount > 0) parts.push(`Reminders ${remindersCount}`);

        if (cancelled) return;
        setHeaderProgress({
          percent: overall,
          details: parts.join(' • '),
        });
      } catch (e) {
        // Keep header usable even if storage fetch fails.
        if (cancelled) return;
        setHeaderProgress(null);
      }
    };

    compute();

    // Refresh on tab focus/visibility change (cheap, avoids polling).
    const onVis = () => {
      if (document.visibilityState === 'visible') compute();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', compute);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', compute);
    };
  }, [todayIso]);

  const logout = () => {
    // Life planner uses the same JWT as the rest of the app; clear both the planner keys and the main session.
    localStorage.removeItem('lifePlannerUser');
    localStorage.removeItem('lifePlannerToken');
    clearSession();
    router.push('/life-planner/login');
  };

  return (
    <header className="bg-white border-b border-swar-border shadow-sm">
      <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg bg-swar-primary-light hover:bg-swar-primary-light text-swar-primary"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <img
              src="https://i.postimg.cc/xTPRSY4X/swar_yoga_new_logo.png"
              alt="Swar Yoga Logo"
              className="w-10 h-10 rounded-lg"
            />
            <h1 className="text-lg sm:text-2xl font-bold text-swar-primary flex items-center space-x-2 whitespace-nowrap">
              <span>🗓️</span>
              <span>Life Planner</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <HealthTracker />
          <ServerStatus />
          
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          
          <Link
            href="/life-planner/profile"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/life-planner/profile'
                ? 'bg-swar-primary-light text-swar-primary border border-green-300'
                : 'text-swar-text-secondary hover:text-swar-text hover:bg-swar-primary-light'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="hidden sm:inline">Profile</span>
          </Link>

          <button
            onClick={logout}
            className="p-2 rounded-lg bg-swar-primary-light text-red-600 hover:bg-red-200 transition-colors"
            title="Logout"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="border-t border-swar-border px-2 sm:px-4 md:px-6 py-2 overflow-x-auto scroll-smooth">
        <nav className="flex items-center gap-2 min-w-max">
          {topTabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-lg px-3 py-2 text-[11px] sm:text-sm font-medium transition-colors text-center sm:text-left whitespace-nowrap ${
                  active
                    ? 'bg-swar-primary-light text-swar-primary border border-green-300'
                    : 'text-swar-text-secondary hover:text-swar-text hover:bg-swar-primary-light'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {headerProgress && (
        <div className="px-3 sm:px-6 pb-3">
          <div className="flex items-center justify-between gap-3 text-xs text-swar-text-secondary mb-1">
            <span className="font-semibold">Overall progress</span>
            <span className="font-bold text-swar-text">{headerProgress.percent}%</span>
          </div>
          <div className="w-full bg-swar-primary-light rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-swar-primary to-swar-accent h-2 rounded-full transition-all"
              style={{ width: `${headerProgress.percent}%` }}
            />
          </div>
          {headerProgress.details && (
            <p className="mt-1 text-[11px] text-swar-text-secondary truncate">{headerProgress.details}</p>
          )}
        </div>
      )}
    </header>
  );
}
