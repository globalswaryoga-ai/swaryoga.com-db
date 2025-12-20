import Link from 'next/link';
import {
  CalendarDays,
  ClipboardList,
  Download,
  Flame,
  Sparkles,
  Target,
  Bell,
  BookOpen,
} from 'lucide-react';
import LifePlannerRestoreBackup from '@/components/LifePlannerRestoreBackup';

export default function LifePlannerDashboardHome() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <LifePlannerRestoreBackup />
      {/* Hero */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden bg-white">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b3d2e] via-[#2A5654] to-[#ff7a18] opacity-95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.25),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.18),transparent_55%)]" />

          <div className="relative p-5 sm:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                  <Sparkles className="h-4 w-4" />
                  Life Planner Dashboard
                </div>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">Welcome back</h2>
                <p className="mt-2 text-sm sm:text-base text-white/85 leading-relaxed">
                  Your colors are here: white, green, dark green, orange, and red — now the dashboard feels alive.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                <Link
                  href="/life-planner/dashboard/daily"
                  className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0b3d2e] hover:bg-white/90 transition shadow-md touch-target text-center active:scale-95 min-h-10 inline-flex items-center justify-center gap-2"
                >
                  <Flame className="h-4 w-4" />
                  Open Daily
                </Link>
                <Link
                  href="/life-planner/dashboard/vision?create=1"
                  className="rounded-2xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff6a00] transition shadow-md touch-target text-center active:scale-95 min-h-10 inline-flex items-center justify-center gap-2"
                >
                  <Target className="h-4 w-4" />
                  Create Vision
                </Link>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">White</span>
              <span className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-white">Green</span>
              <span className="rounded-full bg-[#0b3d2e]/35 px-3 py-1 text-xs font-semibold text-white">Dark Green</span>
              <span className="rounded-full bg-orange-500/25 px-3 py-1 text-xs font-semibold text-white">Orange</span>
              <span className="rounded-full bg-red-500/25 px-3 py-1 text-xs font-semibold text-white">Red</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">Quick actions</h3>
            <p className="text-xs sm:text-sm text-swar-text-secondary mt-1">Fast buttons (mobile-friendly) to add items in 1 tap.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-swar-text-secondary">
            <span className="inline-flex items-center gap-1"><Target className="h-4 w-4" /> plan</span>
            <span className="inline-flex items-center gap-1"><ClipboardList className="h-4 w-4" /> do</span>
            <span className="inline-flex items-center gap-1"><Bell className="h-4 w-4" /> remind</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <Link
            href="/life-planner/dashboard/vision?create=1"
            className="rounded-2xl bg-[#0b3d2e] px-3 py-3 text-sm font-semibold text-white hover:opacity-95 transition text-center active:scale-95 inline-flex items-center justify-center gap-2"
          >
            <Target className="h-4 w-4" /> + Vision
          </Link>
          <Link
            href="/life-planner/dashboard/action-plan?create=1"
            className="rounded-2xl bg-emerald-600 px-3 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition text-center active:scale-95 inline-flex items-center justify-center gap-2"
          >
            <ClipboardList className="h-4 w-4" /> + Action Plan
          </Link>
          <Link
            href="/life-planner/dashboard/tasks?create=1"
            className="rounded-2xl bg-orange-500 px-3 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition text-center active:scale-95 inline-flex items-center justify-center gap-2"
          >
            <BookOpen className="h-4 w-4" /> + Task
          </Link>
          <Link
            href="/life-planner/dashboard/words?create=1"
            className="rounded-2xl bg-red-600 px-3 py-3 text-sm font-semibold text-white hover:bg-red-700 transition text-center active:scale-95 inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> + Word
          </Link>
          <Link
            href="/life-planner/dashboard/reminders?create=1"
            className="rounded-2xl border border-swar-border bg-white px-3 py-3 text-sm font-semibold text-swar-text hover:bg-swar-bg transition text-center active:scale-95 inline-flex items-center justify-center gap-2"
          >
            <Bell className="h-4 w-4 text-emerald-700" /> + Reminder
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-max">
        {/* Daily */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50 p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-700 font-bold">Today</p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Flame className="h-5 w-5" />
            </span>
          </div>
          <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-black tracking-tight text-slate-900">Daily focus</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-swar-text-secondary flex-grow leading-relaxed">
            See your active goals/tasks, health routine checklist, and sadhana/diet tracking.
          </p>
          <div className="mt-3 sm:mt-4 flex gap-2">
            <Link
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs sm:text-sm text-white hover:bg-emerald-700 transition font-semibold touch-target text-center flex-1"
              href="/life-planner/dashboard/daily"
            >
              Open
            </Link>
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-orange-50 p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-700 font-bold">Overview</p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </span>
          </div>
          <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-black tracking-tight text-slate-900">Calendar view</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-swar-text-secondary flex-grow leading-relaxed">
            See visions, goals, tasks, and reminders with symbols on a calendar.
          </p>
          <div className="mt-3 sm:mt-4 flex gap-2">
            <Link
              className="rounded-xl bg-orange-500 px-3 py-2 text-xs sm:text-sm text-white hover:bg-orange-600 transition font-semibold touch-target text-center flex-1"
              href="/life-planner/dashboard/calendar"
            >
              Open
            </Link>
          </div>
        </div>

        {/* Download */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-red-50 p-4 sm:p-5 flex flex-col md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700 font-bold">Download</p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
              <Download className="h-5 w-5" />
            </span>
          </div>
          <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-black tracking-tight text-slate-900">Vision details</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-swar-text-secondary flex-grow leading-relaxed">
            Download your full vision hierarchy as a PDF report.
          </p>
          <div className="mt-3 sm:mt-4 flex gap-2">
            <Link
              className="rounded-xl bg-red-600 px-3 py-2 text-xs sm:text-sm text-white hover:bg-red-700 transition font-semibold touch-target text-center flex-1"
              href="/life-planner/dashboard/vision-download"
            >
              Open
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">Next steps</h3>
        <ul className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-swar-text-secondary list-disc pl-5">
          <li><span className="font-semibold text-swar-text">Vision</span>: add image, start/end date, milestones.</li>
          <li><span className="font-semibold text-swar-text">Goals & Tasks</span>: show in Daily by date range (now fixed), set priority/status.</li>
          <li><span className="font-semibold text-swar-text">Views</span>: daily / weekly / monthly / yearly.</li>
          <li><span className="font-semibold text-swar-text">Progress</span>: report cards + charts (next iteration).</li>
        </ul>
      </div>
    </div>
  );
}
