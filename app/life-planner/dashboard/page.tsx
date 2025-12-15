import Link from 'next/link';
import LifePlannerRestoreBackup from '@/components/LifePlannerRestoreBackup';

export default function LifePlannerDashboardHome() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <LifePlannerRestoreBackup />
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1 leading-relaxed">
            Start with a vision, add milestones, then break it into goals, tasks, and daily routines.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <Link
            href="/life-planner/dashboard/vision"
            className="rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white hover:from-red-600 hover:to-pink-600 transition shadow-eco touch-target text-center active:scale-95 min-h-10"
          >
            + Create vision
          </Link>
          <Link
            href="/life-planner/dashboard/tasks"
            className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-pink-100 transition touch-target text-center active:scale-95 min-h-10"
          >
            View tasks
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-max">
        <div className="rounded-2xl sm:rounded-3xl border border-pink-100 bg-pink-50 p-4 sm:p-5 flex flex-col">
          <p className="text-xs uppercase tracking-[0.3em] text-red-600 font-bold">Today</p>
          <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-semibold text-gray-900">Daily focus</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 flex-grow leading-relaxed">See your tasks due today, your routine checklist, and quick reminders.</p>
          <div className="mt-3 sm:mt-4 flex gap-2">
            <Link className="rounded-xl bg-green-100 px-3 py-2 text-xs sm:text-sm text-green-700 hover:bg-green-200 transition font-medium touch-target text-center flex-1" href="/life-planner/dashboard/daily">
              Open
            </Link>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-pink-100 bg-pink-50 p-4 sm:p-5 flex flex-col">
          <p className="text-xs uppercase tracking-[0.3em] text-red-600 font-bold">This week</p>
          <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-semibold text-gray-900">Weekly review</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 flex-grow leading-relaxed">Plan your week, set priorities, and track progress against your vision.</p>
          <div className="mt-3 sm:mt-4 flex gap-2">
            <Link className="rounded-xl bg-green-100 px-3 py-2 text-xs sm:text-sm text-green-700 hover:bg-green-200 transition font-medium touch-target text-center flex-1" href="/life-planner/dashboard/weekly">
              Open
            </Link>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-pink-100 bg-pink-50 p-4 sm:p-5 flex flex-col md:col-span-2 lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.3em] text-red-600 font-bold">Reports</p>
          <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-semibold text-gray-900">Progress report</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 flex-grow leading-relaxed">Weekly, monthly, yearly completion and overdue breakdowns.</p>
          <div className="mt-3 sm:mt-4 flex gap-2">
            <Link className="rounded-xl bg-green-100 px-3 py-2 text-xs sm:text-sm text-green-700 hover:bg-green-200 transition font-medium touch-target text-center flex-1" href="/life-planner/dashboard/progress">
              Open
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-pink-200 bg-pink-50 p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Next steps</h3>
        <ul className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-700 list-disc pl-5">
          <li>Vision: add image, start/end date, milestones.</li>
          <li>Tasks/Todos: status (not started/working/pending/completed/overdue), priority, repeat.</li>
          <li>Views: daily / weekly / monthly / yearly.</li>
          <li>Progress: beautiful report cards + charts (next iteration).</li>
        </ul>
      </div>
    </div>
  );
}
