'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { ActionPlan, Goal, Milestone, Task, Todo, Vision, Word } from '@/lib/types/lifePlanner';

type LoadState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready' };

const iso = (d: Date) => d.toISOString().split('T')[0];

const normalizeISO = (value?: string | null) => {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
};

const parseISO = (date: string) => new Date(`${date}T00:00:00`);

const isValidISO = (date: string) => {
  if (!date) return false;
  const d = parseISO(date);
  return !Number.isNaN(d.getTime());
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const overlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  if (!isValidISO(aStart) || !isValidISO(aEnd) || !isValidISO(bStart) || !isValidISO(bEnd)) return false;
  const aS = parseISO(aStart);
  const aE = parseISO(aEnd);
  const bS = parseISO(bStart);
  const bE = parseISO(bEnd);
  return aS <= bE && bS <= aE;
};

function completionPercent(input: {
  goals: Goal[];
  tasks: Task[];
  todos: Array<{ completed: boolean }>;
  words: Word[];
}): number {
  const total =
    (input.goals?.length || 0) +
    (input.tasks?.length || 0) +
    (input.todos?.length || 0) +
    (input.words?.length || 0);

  if (total === 0) return 0;

  const completedGoals = (input.goals || []).filter((g) => (g.status === 'completed') || (typeof g.progress === 'number' && g.progress >= 100)).length;
  const completedTasks = (input.tasks || []).filter((t) => !!t.completed || t.status === 'completed').length;
  const completedTodos = (input.todos || []).filter((t) => !!t.completed).length;
  const completedWords = (input.words || []).filter((w) => w.status === 'completed').length;

  const done = completedGoals + completedTasks + completedTodos + completedWords;
  return clamp(Math.round((done / total) * 100), 0, 100);
}

function formatDateLabel(isoDate: string): string {
  if (!isValidISO(isoDate)) return '';
  try {
    return new Date(`${isoDate}T00:00:00`).toLocaleDateString();
  } catch {
    return isoDate;
  }
}

export default function VisionPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visionId = searchParams?.get('visionId') || '';

  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [vision, setVision] = useState<Vision | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  type PrintableTodo = {
    id: string;
    title: string;
    startDate: string;
    dueDate: string;
    completed: boolean;
  };

  useEffect(() => {
    if (!visionId) {
      setLoadState({ status: 'error', message: 'Missing visionId in URL.' });
      return;
    }

    setLoadState({ status: 'loading' });

    (async () => {
      try {
        const [vList, gList, tList, tdList, wList, apList] = await Promise.all([
          lifePlannerStorage.getVisions(),
          lifePlannerStorage.getGoals(),
          lifePlannerStorage.getTasks(),
          lifePlannerStorage.getTodos(),
          lifePlannerStorage.getWords(),
          lifePlannerStorage.getActionPlans(),
        ]);

        const visionsArr = Array.isArray(vList) ? (vList as Vision[]) : [];
        const found = visionsArr.find((v) => v.id === visionId) || null;

        const plansArr = Array.isArray(apList) ? (apList as ActionPlan[]) : [];

        // Goals can exist in three places:
        // 1) Flat goals collection
        // 2) Nested under vision.goals (back-compat)
        // 3) Inside Action Plans (plan.goals) – users expect these too
        const flatGoals = Array.isArray(gList) ? (gList as Goal[]) : [];
        const derivedFromVisions: Goal[] = visionsArr.flatMap((v) => {
          const list = Array.isArray((v as any).goals) ? ((v as any).goals as any[]) : [];
          return list
            .filter(Boolean)
            .map((g: any) => ({ ...g, visionId: String(g?.visionId || v.id || '').trim() } as Goal));
        });
        const derivedFromPlans: Goal[] = plansArr
          .filter((p) => p?.visionId)
          .flatMap((p) => {
            const list = Array.isArray((p as any).goals) ? (((p as any).goals as any[]) || []) : [];
            return list
              .filter(Boolean)
              .map((g: any) =>
                ({
                  ...g,
                  visionId: String(p.visionId),
                  // Map ActionPlanGoal date shape into Goal-like fields used by PDF
                  startDate: g?.startDate,
                  targetDate: g?.endDate,
                } as Goal)
              );
          });

        const byId = new Map<string, Goal>();
        for (const g of [...flatGoals, ...derivedFromVisions, ...derivedFromPlans]) {
          if (!g?.id) continue;
          byId.set(String(g.id), g);
        }

        setVision(found);
        setGoals(Array.from(byId.values()));
        setTasks(Array.isArray(tList) ? (tList as Task[]) : []);
        setTodos(Array.isArray(tdList) ? (tdList as Todo[]) : []);
        setWords(Array.isArray(wList) ? (wList as Word[]) : []);
        setActionPlans(plansArr);

        setLoadState({ status: 'ready' });
      } catch (e: any) {
        setLoadState({ status: 'error', message: e?.message || 'Failed to load data.' });
      }
    })();
  }, [visionId]);

  const visionGoals = useMemo(() => goals.filter((g) => g.visionId === visionId), [goals, visionId]);
  const visionTasks = useMemo(() => tasks.filter((t) => t.visionId === visionId), [tasks, visionId]);

  // If tasks are linked via goalId (common), also include tasks under the vision's goals.
  const goalIds = useMemo(() => new Set(visionGoals.map((g) => g.id)), [visionGoals]);
  const tasksUnderGoals = useMemo(() => tasks.filter((t) => t.goalId && goalIds.has(t.goalId)), [tasks, goalIds]);

  const combinedTasks = useMemo(() => {
    const byId = new Map<string, Task>();
    for (const t of [...visionTasks, ...tasksUnderGoals]) byId.set(t.id, t);
    return Array.from(byId.values());
  }, [visionTasks, tasksUnderGoals]);

  const visionTodos = useMemo<PrintableTodo[]>(() => {
    const byId = new Map<string, PrintableTodo>();

    // 1) Task-embedded todos (Task.todos)
    for (const t of combinedTasks) {
      const taskStart = normalizeISO(t.startDate || t.dueDate) || iso(new Date());
      const taskEnd = normalizeISO(t.dueDate || t.startDate) || taskStart;
      const embedded = Array.isArray((t as any).todos) ? ((t as any).todos as Array<any>) : [];
      for (const td of embedded) {
        const id = String(td?.id || `mini-${t.id}-${td?.title || ''}`);
        const dueDate = normalizeISO(td?.dueDate) || taskEnd;
        byId.set(id, {
          id,
          title: String(td?.title || '').trim() || 'Todo',
          startDate: taskStart,
          dueDate,
          completed: !!td?.completed,
        });
      }
    }

    // 2) Global Todo records linked to tasks
    for (const td of todos) {
      if (!td?.taskId) continue;
      if (!combinedTasks.some((t) => t.id === td.taskId)) continue;
      if (!td?.id) continue;
      byId.set(td.id, {
        id: td.id,
        title: td.title,
        startDate: normalizeISO(td.startDate) || iso(new Date()),
        dueDate: normalizeISO(td.dueDate) || normalizeISO(td.startDate) || iso(new Date()),
        completed: !!td.completed,
      });
    }

    return Array.from(byId.values());
  }, [todos, combinedTasks]);
  const visionWords = useMemo(() => words.filter((w) => String(w.category || '') === String(vision?.category || '')), [words, vision?.category]);

  const milestones = useMemo(() => {
    // Milestones are most reliably stored under Action Plans for a vision.
    const fromPlans = actionPlans
      .filter((p) => p?.visionId === visionId)
      .flatMap((p) => (Array.isArray(p?.milestones) ? (p.milestones as Milestone[]) : []));

    const fromVision = Array.isArray(vision?.milestones) ? (vision?.milestones as Milestone[]) : [];

    const byId = new Map<string, Milestone>();
    for (const m of [...fromPlans, ...fromVision]) {
      if (!m) continue;
      const id = String((m as any).id || `${(m as any).title || ''}-${(m as any).startDate || ''}-${(m as any).endDate || ''}`);
      if (!id) continue;
      byId.set(id, m);
    }

    return Array.from(byId.values());
  }, [actionPlans, vision, visionId]);

  const pageTitle = useMemo(() => {
    if (!vision) return 'Vision PDF';
    return `Vision PDF — ${vision.title}`;
  }, [vision]);

  const overallProgress = useMemo(() => {
    if (typeof vision?.progress === 'number') return clamp(Math.round(vision.progress), 0, 100);
    return completionPercent({
      goals: visionGoals,
      tasks: combinedTasks,
      todos: visionTodos,
      words: visionWords,
    });
  }, [vision?.progress, visionGoals, combinedTasks, visionTodos, visionWords]);

  const summary = useMemo(() => {
    const tasksTotal = combinedTasks.length;
    const tasksCompleted = combinedTasks.filter((t: any) => Boolean(t?.completed) || t?.status === 'completed' || Number(t?.progress) >= 100).length;

    const todosTotal = visionTodos.length;
    const todosCompleted = visionTodos.filter((t) => !!t.completed).length;

    const goalsTotal = visionGoals.length;
    const goalsCompleted = visionGoals.filter((g: any) => g?.status === 'completed' || (typeof g?.progress === 'number' && g.progress >= 100)).length;

    const wordsTotal = visionWords.length;
    const wordsCompleted = visionWords.filter((w: any) => w?.status === 'completed').length;

    return {
      tasksTotal,
      tasksCompleted,
      todosTotal,
      todosCompleted,
      goalsTotal,
      goalsCompleted,
      wordsTotal,
      wordsCompleted,
      milestonesTotal: milestones.length,
    };
  }, [combinedTasks, visionTodos, visionGoals, visionWords, milestones.length]);

  const handlePrint = () => {
    document.title = pageTitle;
    window.print();
  };

  if (loadState.status === 'loading' || loadState.status === 'idle') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-swar-text">Loading vision preview…</p>
      </div>
    );
  }

  if (loadState.status === 'error') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-swar-border px-4 py-2 text-swar-text hover:bg-swar-primary-light"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 font-semibold">
          {loadState.message}
        </div>
      </div>
    );
  }

  if (!vision) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-swar-border px-4 py-2 text-swar-text hover:bg-swar-primary-light"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 font-semibold">
          Vision not found.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Controls (hidden in print) */}
      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-swar-text truncate">Preview: {vision.title}</p>
            <p className="text-xs text-swar-text-secondary">A4 preview • Click “Download PDF” to print/save as PDF</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl border border-swar-border px-4 py-2 text-swar-text hover:bg-swar-primary-light"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-swar-primary px-4 py-2 text-white font-extrabold hover:bg-swar-primary-dark"
            >
              <Printer className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* A4 sheet */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="a4-sheet mx-auto bg-white shadow-xl border border-slate-200">
          {/* Vision Header (H1) */}
          <div className="p-8">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="report-band px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-slate-600">Vision Project Report</p>
                    <p className="text-xs text-slate-600 mt-1">Swar Yoga • Life Planner</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-slate-600">Generated</p>
                    <p className="text-sm font-extrabold text-slate-900">{formatDateLabel(iso(new Date()))}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-6">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-black text-slate-900 leading-tight">{vision.title}</h1>
                    <p className="mt-2 text-sm text-slate-600">
                      Vision Head: <span className="font-extrabold text-slate-900">{String(vision.category || '')}</span>
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-600">Start</p>
                        <p className="font-extrabold text-slate-900">{formatDateLabel(normalizeISO(vision.startDate) || iso(new Date()))}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-600">End</p>
                        <p className="font-extrabold text-slate-900">{formatDateLabel(normalizeISO(vision.endDate) || normalizeISO(vision.startDate) || iso(new Date()))}</p>
                      </div>
                    </div>

                    {(vision.place || typeof vision.budget === 'number') ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {vision.place ? (
                          <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
                            Location: {vision.place}
                          </span>
                        ) : null}
                        {typeof vision.budget === 'number' ? (
                          <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
                            Budget: ₹ {vision.budget}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {vision.description ? (
                      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <p className="text-sm text-slate-800 leading-relaxed">{vision.description}</p>
                      </div>
                    ) : null}

                    {/* Overall progress */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-extrabold text-slate-900">Overall progress</p>
                        <p className="text-sm font-black text-emerald-700">{overallProgress}%</p>
                      </div>
                      <div className="mt-2 h-3 w-full rounded-full bg-emerald-100 overflow-hidden border border-emerald-200">
                        <div className="h-full bg-emerald-600" style={{ width: `${overallProgress}%` }} />
                      </div>
                      <p className="mt-2 text-[11px] text-slate-600">
                        Totals: Goals {summary.goalsCompleted}/{summary.goalsTotal} • Tasks {summary.tasksCompleted}/{summary.tasksTotal} • Todos {summary.todosCompleted}/{summary.todosTotal} • Words {summary.wordsCompleted}/{summary.wordsTotal}
                      </p>
                    </div>
                  </div>

                  <div className="w-56 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        vision.imageUrl ||
                        (vision as any).categoryImageUrl ||
                        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80'
                      }
                      alt={vision.title}
                      className="h-40 w-full object-cover rounded-2xl border border-slate-200"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.src = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <p className="mt-2 text-[11px] text-slate-600">Vision image</p>
                  </div>
                </div>

                {/* KPI cards */}
                <div className="mt-6 kpi-grid">
                  <div className="kpi-card kpi-emerald">
                    <p className="kpi-label">Goals</p>
                    <p className="kpi-value">{summary.goalsCompleted}/{summary.goalsTotal}</p>
                  </div>
                  <div className="kpi-card kpi-orange">
                    <p className="kpi-label">Tasks</p>
                    <p className="kpi-value">{summary.tasksCompleted}/{summary.tasksTotal}</p>
                  </div>
                  <div className="kpi-card kpi-slate">
                    <p className="kpi-label">Todos</p>
                    <p className="kpi-value">{summary.todosCompleted}/{summary.todosTotal}</p>
                  </div>
                  <div className="kpi-card kpi-pink">
                    <p className="kpi-label">Words</p>
                    <p className="kpi-value">{summary.wordsCompleted}/{summary.wordsTotal}</p>
                  </div>
                  <div className="kpi-card kpi-indigo">
                    <p className="kpi-label">Milestones</p>
                    <p className="kpi-value">{summary.milestonesTotal}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="mt-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-2xl font-black text-slate-900">Milestones</h2>
                <p className="text-xs text-slate-600 mt-1">Each milestone lists Goals, Tasks, Todos, and Words in the date range. (No reminders / diamond people in this report)</p>
              </div>

              {milestones.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-sm text-swar-text-secondary italic">No milestones added for this vision.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-6">
                  {milestones.map((m, idx) => {
                    const mStart = normalizeISO(m.startDate) || normalizeISO(vision.startDate) || iso(new Date());
                    const mEnd = normalizeISO(m.endDate) || mStart;

                    const mGoals = visionGoals.filter((g) => {
                      const gs = normalizeISO(g.startDate || g.createdAt) || mStart;
                      const ge = normalizeISO(g.targetDate || g.startDate || g.createdAt) || gs;
                      return overlap(gs, ge, mStart, mEnd);
                    });

                    const mTasks = combinedTasks.filter((t) => {
                      const ts = normalizeISO(t.startDate || t.createdAt) || mStart;
                      const te = normalizeISO(t.dueDate || t.startDate || t.createdAt) || ts;
                      return overlap(ts, te, mStart, mEnd);
                    });

                    const mTodos = visionTodos.filter((td) => {
                      const ts = normalizeISO(td.startDate) || mStart;
                      const te = normalizeISO(td.dueDate || td.startDate) || ts;
                      return overlap(ts, te, mStart, mEnd);
                    });

                    const mWords = visionWords.filter((w) => {
                      const ws = normalizeISO(w.startDate || w.createdAt) || mStart;
                      const we = normalizeISO(w.endDate || w.startDate || w.createdAt) || ws;
                      return overlap(ws, we, mStart, mEnd);
                    });

                    const mProgress = completionPercent({ goals: mGoals, tasks: mTasks, todos: mTodos, words: mWords });

                    return (
                      <div key={m.id || idx} className="milestone-block rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden">
                        <div className="milestone-head px-6 py-5 border-b border-slate-200">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-slate-600">Milestone {idx + 1}</p>
                              <h2 className="text-2xl font-black text-slate-900">{m.title || 'Untitled milestone'}</h2>
                              {m.description ? <p className="mt-1 text-sm text-slate-600">{m.description}</p> : null}

                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1 font-bold text-slate-800">{formatDateLabel(mStart)} → {formatDateLabel(mEnd)}</span>
                                {m.workingHoursStart || m.workingHoursEnd ? (
                                  <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1 font-bold text-slate-800">Hours: {(m.workingHoursStart || '—')} - {(m.workingHoursEnd || '—')}</span>
                                ) : null}
                                {m.place ? (
                                  <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1 font-bold text-slate-800">Location: {m.place}</span>
                                ) : null}
                                {m.status ? (
                                  <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1 font-bold text-slate-800">Status: {m.status}</span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex-shrink-0 text-right">
                              <p className="text-xs font-bold text-slate-600">Progress</p>
                              <p className="text-2xl font-black text-indigo-700">{mProgress}%</p>
                            </div>
                          </div>
                        </div>

                        {/* Sections inside milestone (compact grid) */}
                        <div className="px-6 py-6 milestone-grid">
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <h3 className="text-lg font-black text-swar-text">Goals</h3>
                            {mGoals.length === 0 ? (
                              <p className="text-sm text-swar-text-secondary italic mt-2">No goals in this date range.</p>
                            ) : (
                              <ul className="mt-2 space-y-2">
                                {mGoals.map((g) => (
                                  <li key={g.id} className="rounded-xl bg-white border border-emerald-200 px-4 py-3">
                                    <p className="font-bold text-swar-text">{g.title}</p>
                                    <p className="text-xs text-swar-text-secondary">{formatDateLabel(normalizeISO(g.startDate || g.createdAt))} → {formatDateLabel(normalizeISO(g.targetDate || g.startDate || g.createdAt))}</p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                            <h3 className="text-lg font-black text-swar-text">Tasks</h3>
                            {mTasks.length === 0 ? (
                              <p className="text-sm text-swar-text-secondary italic mt-2">No tasks in this date range.</p>
                            ) : (
                              <ul className="mt-2 space-y-2">
                                {mTasks.map((t) => (
                                  <li key={t.id} className="rounded-xl bg-white border border-orange-200 px-4 py-3">
                                    <h4 className="text-base font-black text-swar-text">{t.title}</h4>
                                    <p className="text-xs text-swar-text-secondary">{formatDateLabel(normalizeISO(t.startDate || t.createdAt))} → {formatDateLabel(normalizeISO(t.dueDate || t.startDate || t.createdAt))}</p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="text-lg font-black text-swar-text">Todos</h3>
                            {mTodos.length === 0 ? (
                              <p className="text-sm text-swar-text-secondary italic mt-2">No todos in this date range.</p>
                            ) : (
                              <ul className="mt-2 space-y-2">
                                {mTodos.map((td) => (
                                  <li key={td.id} className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                                    <p className="font-bold text-swar-text">{td.title}</p>
                                    <p className="text-xs text-swar-text-secondary">{formatDateLabel(normalizeISO(td.startDate))} → {formatDateLabel(normalizeISO(td.dueDate || td.startDate))}</p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="rounded-2xl border border-pink-200 bg-pink-50 p-4">
                            <h3 className="text-lg font-black text-swar-text">Words</h3>
                            {mWords.length === 0 ? (
                              <p className="text-sm text-swar-text-secondary italic mt-2">No words in this date range.</p>
                            ) : (
                              <ul className="mt-2 space-y-2">
                                {mWords.map((w) => (
                                  <li key={w.id} className="rounded-xl bg-white border border-pink-200 px-4 py-3">
                                    <p className="font-bold text-swar-text">{w.title}</p>
                                    {w.description ? <p className="text-xs text-swar-text-secondary mt-1">{w.description}</p> : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Progress bar AFTER sections (as requested) */}
                        <div className="px-6 pb-6">
                          <div className="mt-2 h-3 w-full rounded-full bg-indigo-100 overflow-hidden border border-indigo-200">
                            <div className="h-full bg-indigo-600" style={{ width: `${mProgress}%` }} />
                          </div>
                          <p className="mt-2 text-[11px] text-slate-600">
                            Items in this milestone: Goals {mGoals.filter((g: any) => g?.status === 'completed' || Number(g?.progress) >= 100).length}/{mGoals.length} •
                            Tasks {mTasks.filter((t: any) => Boolean(t?.completed) || t?.status === 'completed').length}/{mTasks.length} •
                            Todos {mTodos.filter((t) => t.completed).length}/{mTodos.length} •
                            Words {mWords.filter((w: any) => w?.status === 'completed').length}/{mWords.length}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-slate-200">
              <p className="text-xs text-swar-text-secondary">Generated on {formatDateLabel(iso(new Date()))}. Print settings: A4, margins enabled.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* A4 layout */
        .a4-sheet {
          width: 210mm;
          min-height: 297mm;
        }

        /* Typography: A4 report uses Poppins */
        .a4-sheet, .a4-sheet * {
          font-family: Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji" !important;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .report-band {
          background: linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(99,102,241,0.10) 45%, rgba(236,72,153,0.10) 100%);
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .kpi-card {
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 14px;
          background: #ffffff;
        }

        .kpi-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 800;
          color: rgba(15, 23, 42, 0.7);
        }

        .kpi-value {
          margin-top: 6px;
          font-size: 18px;
          font-weight: 900;
          color: rgba(15, 23, 42, 0.95);
        }

        .kpi-emerald { border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.08); }
        .kpi-orange { border-color: rgba(249,115,22,0.35); background: rgba(249,115,22,0.08); }
        .kpi-slate { border-color: rgba(100,116,139,0.35); background: rgba(100,116,139,0.08); }
        .kpi-pink { border-color: rgba(236,72,153,0.35); background: rgba(236,72,153,0.08); }
        .kpi-indigo { border-color: rgba(99,102,241,0.35); background: rgba(99,102,241,0.08); }

        .milestone-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .a4-sheet {
            width: auto;
            min-height: auto;
            box-shadow: none !important;
            border: none !important;
          }

          .kpi-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }

          /* Keep milestone sections compact on paper */
          .milestone-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          /* Ensure each milestone starts cleanly when it overflows */
          .milestone-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
