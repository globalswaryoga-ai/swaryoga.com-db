import Link from 'next/link';
import LifePlannerRestoreBackup from '@/components/LifePlannerRestoreBackup';

export default function LifePlannerDashboardHome() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <LifePlannerRestoreBackup />
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-swar-text">Welcome back</h2>
          <p className="text-sm sm:text-base text-swar-text-secondary mt-1 leading-relaxed">
            Start with a vision, add milestones, then break it into goals, tasks, and daily routines.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <Link
            href="/life-planner/dashboard/vision"
            className="rounded-2xl bg-swar-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-swar-primary-hover transition shadow-md touch-target text-center active:scale-95 min-h-10"
          >
            + Create vision
          </Link>
          <Link
            href="/life-planner/dashboard/tasks"
            className="rounded-2xl border border-swar-border bg-swar-primary-light px-4 py-2.5 text-sm font-medium text-swar-primary hover:bg-swar-border transition touch-target text-center active:scale-95 min-h-10"
          >
            View tasks
          </Link>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-semibold text-swar-text">Quick actions</h3>
        <p className="text-xs sm:text-sm text-swar-text-secondary mt-1">Easy buttons for mobile to add new items fast.</p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <Link
            href="/life-planner/dashboard/vision?create=1"
            className="rounded-2xl bg-swar-primary px-3 py-3 text-sm font-semibold text-white hover:bg-swar-primary-hover transition text-center active:scale-95"
          >
            + Vision
          </Link>
          <Link
            href="/life-planner/dashboard/action-plan?create=1"
            className="rounded-2xl bg-swar-primary px-3 py-3 text-sm font-semibold text-white hover:bg-swar-primary-hover transition text-center active:scale-95"
          >
            + Action Plan
          </Link>
          <Link
            href="/life-planner/dashboard/tasks?create=1"
            className="rounded-2xl bg-swar-accent px-3 py-3 text-sm font-semibold text-white hover:bg-swar-accent-hover transition text-center active:scale-95"
          >
            + Task
          </Link>
          <Link
            href="/life-planner/dashboard/words?create=1"
            className="rounded-2xl bg-swar-primary px-3 py-3 text-sm font-semibold text-white hover:bg-swar-primary-hover transition text-center active:scale-95"
          >
            + Word
          </Link>
          <Link
            href="/life-planner/dashboard/reminders?create=1"
            className="rounded-2xl bg-swar-primary px-3 py-3 text-sm font-semibold text-white hover:bg-swar-primary-hover transition text-center active:scale-95"
          >
            + Reminder
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-max">
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-swar-primary-light p-4 sm:p-5 flex flex-col">
          <p className="text-xs uppercase tracking-[0.3em] text-swar-accent font-bold">Today</p>
          <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-semibold text-swar-text">Daily focus</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-swar-text-secondary flex-grow leading-relaxed">See your tasks due today, your routine checklist, and quick reminders.</p>
          <div className="mt-3 sm:mt-4 flex gap-2">
            <Link className="rounded-xl bg-swar-primary px-3 py-2 text-xs sm:text-sm text-white hover:bg-swar-primary-hover transition font-medium touch-target text-center flex-1" href="/life-planner/dashboard/daily">
              Open
            </Link>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-swar-primary-light p-4 sm:p-5 flex flex-col">
          <p className="text-xs uppercase tracking-[0.3em] text-swar-accent font-bold">Overview</p>
          <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-semibold text-swar-text">Calendar View</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-swar-text-secondary flex-grow leading-relaxed">See all visions, goals, tasks, and reminders with symbols on calendar.</p>
          <div className="mt-3 sm:mt-4 flex gap-2">
            <Link className="rounded-xl bg-swar-primary px-3 py-2 text-xs sm:text-sm text-white hover:bg-swar-primary-hover transition font-medium touch-target text-center flex-1" href="/life-planner/dashboard/calendar">
              Open
            </Link>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-swar-primary-light p-4 sm:p-5 flex flex-col md:col-span-2 lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.3em] text-swar-accent font-bold">Download</p>
          <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-semibold text-swar-text">Vision Details</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-swar-text-secondary flex-grow leading-relaxed">Download vision hierarchy as PDF with progress report.</p>
          <div className="mt-3 sm:mt-4 flex gap-2">
            <Link className="rounded-xl bg-swar-primary px-3 py-2 text-xs sm:text-sm text-white hover:bg-swar-primary-hover transition font-medium touch-target text-center flex-1" href="/life-planner/dashboard/vision-download">
              Open
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-swar-primary-light p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-semibold text-swar-text">Next steps</h3>
        <ul className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-swar-text-secondary list-disc pl-5">
          <li>Vision: add image, start/end date, milestones.</li>
          <li>Tasks/Todos: status (not started/working/pending/completed/overdue), priority, repeat.</li>
          <li>Views: daily / weekly / monthly / yearly.</li>
          <li>Progress: beautiful report cards + charts (next iteration).</li>
        </ul>
      </div>
    </div>
  );
}
