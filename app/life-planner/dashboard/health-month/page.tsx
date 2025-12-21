'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { DailyHealthPlan, FoodPlanItem } from '@/lib/types/lifePlanner';

const iso = (d: Date) => d.toISOString().split('T')[0];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function progressForPlan(plan: DailyHealthPlan | null): { total: number; done: number; percent: number } {
  if (!plan) return { total: 0, done: 0, percent: 0 };

  const routines = Array.isArray(plan.routines) ? plan.routines : [];
  const routineItems = routines.filter((r) => String(r?.title || '').trim().length > 0);
  const routineDone = routineItems.filter((r) => Boolean((r as any).completed)).length;

  const food = Array.isArray((plan as any).foodPlanItems) ? (((plan as any).foodPlanItems as FoodPlanItem[]) || []) : [];
  const foodItems = food.filter((f) => String(f?.title || '').trim().length > 0);
  const foodDone = foodItems.filter((f) => Boolean((f as any).completed)).length;

  const total = routineItems.length + foodItems.length;
  const done = routineDone + foodDone;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, percent };
}

export default function HealthMonthPage() {
  const [plans, setPlans] = useState<DailyHealthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await lifePlannerStorage.getDailyHealthPlans();
        if (!alive) return;
        setPlans(Array.isArray(saved) ? (saved as DailyHealthPlan[]) : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const monthLabel = useMemo(() => {
    return month.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [month]);

  const calendar = useMemo(() => {
    const first = startOfMonth(month);
    const firstDow = first.getDay(); // 0=Sun
    const totalDays = daysInMonth(month);

    const cells: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ date: null, day: null });

    for (let d = 1; d <= totalDays; d++) {
      const date = iso(new Date(month.getFullYear(), month.getMonth(), d));
      cells.push({ date, day: d });
    }

    // pad to full weeks
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [month]);

  const monthStats = useMemo(() => {
    const inMonth = plans.filter((p) => {
      const dt = new Date(`${p.date}T00:00:00`);
      return dt.getFullYear() === month.getFullYear() && dt.getMonth() === month.getMonth();
    });

    const days = inMonth.length;
    const total = inMonth.reduce((sum, p) => sum + progressForPlan(p).total, 0);
    const done = inMonth.reduce((sum, p) => sum + progressForPlan(p).done, 0);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { days, total, done, percent };
  }, [plans, month]);

  return (
    <div
      className="bg-gradient-to-br from-swar-bg to-swar-primary/5 rounded-2xl border border-swar-border"
      style={{ fontFamily: 'Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}
    >
      <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-swar-text mb-2">Monthly Health Progress</h1>
            <p className="text-swar-text-secondary">Daily routine + food plan completion for the whole month.</p>
          </div>
          <Link
            href="/life-planner/dashboard/health"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-swar-text hover:border-swar-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Health
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonth((m) => addMonths(m, -1))}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white hover:bg-swar-bg transition flex items-center justify-center"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-bold text-swar-text-secondary">Month</p>
                <p className="text-lg font-extrabold text-swar-text">{monthLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white hover:bg-swar-bg transition flex items-center justify-center"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="text-sm text-swar-text-secondary">
              <span className="font-semibold text-swar-text">{monthStats.percent}%</span> month progress • {monthStats.done}/{monthStats.total} checks
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-7 gap-2 text-xs font-bold text-swar-text-secondary mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-10 text-center text-swar-text-secondary">Loading…</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {calendar.map((cell, idx) => {
                if (!cell.date) {
                  return <div key={idx} className="aspect-square rounded-xl bg-swar-bg border border-gray-100" />;
                }

                const plan = plans.find((p) => p?.date === cell.date) || null;
                const { total, done, percent } = progressForPlan(plan);

                const tint =
                  percent >= 80
                    ? 'bg-emerald-50 border-emerald-200'
                    : percent >= 50
                      ? 'bg-amber-50 border-amber-200'
                      : percent > 0
                        ? 'bg-sky-50 border-sky-200'
                        : 'bg-white border-gray-200';

                return (
                  <Link
                    key={cell.date}
                    href={`/life-planner/dashboard/health?date=${encodeURIComponent(cell.date)}`}
                    className={`aspect-square rounded-xl border p-2 hover:shadow-sm transition ${tint} flex flex-col justify-between`}
                    title="Open this day"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-extrabold text-swar-text">{cell.day}</div>
                      <div className="text-[11px] font-bold text-swar-text-secondary">{percent}%</div>
                    </div>
                    <div className="text-[11px] text-swar-text-secondary">
                      {total > 0 ? (
                        <span>
                          <span className="font-semibold text-swar-text">{done}</span>/{total}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-white/70 border border-white/60 overflow-hidden">
                      <div className="h-full bg-emerald-600" style={{ width: `${percent}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
