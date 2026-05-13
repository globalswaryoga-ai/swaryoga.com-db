'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Trophy, Zap } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';

export default function ProgressReportPage() {
  const [stats, setStats] = useState({
    overallCompletion: 0,
    goalsCompleted: 0,
    goalsTotal: 0,
    tasksCompleted: 0,
    tasksTotal: 0,
    todosCompleted: 0,
    todosTotal: 0,
    wordsCompleted: 0,
    wordsTotal: 0,
    goalsAvgProgress: 0,
    visionsCount: 0,
    diamondPeopleCount: 0,
    healthRoutineStreak: 0,
    remindersCount: 0,
    milestonesCount: 0,
  });
  const [visionBreakdown, setVisionBreakdown] = useState<Array<{ category: string; completed: number; total: number }>>([]);
  const [mounted, setMounted] = useState(false);
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('month');

  useEffect(() => {
    setMounted(true);
    calculateStats();
  }, []);

  const calculateStats = async () => {
    const [tasksRaw, todosRaw, goalsRaw, visionsRaw, wordsRaw, diamondPeopleRaw, healthRoutinesRaw, remindersRaw, actionPlansRaw] =
      await Promise.all([
        lifePlannerStorage.getTasks(),
        lifePlannerStorage.getTodos(),
        lifePlannerStorage.getGoals(),
        lifePlannerStorage.getVisions(),
        lifePlannerStorage.getWords(),
        lifePlannerStorage.getDiamondPeople(),
        lifePlannerStorage.getHealthRoutines(),
        lifePlannerStorage.getReminders(),
        lifePlannerStorage.getActionPlans(),
      ]);

    const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];
    const todos = Array.isArray(todosRaw) ? todosRaw : [];
    const goals = Array.isArray(goalsRaw) ? goalsRaw : [];
    const visions = Array.isArray(visionsRaw) ? visionsRaw : [];
    const words = Array.isArray(wordsRaw) ? wordsRaw : [];
    const diamondPeople = Array.isArray(diamondPeopleRaw) ? diamondPeopleRaw : [];
    const healthRoutines = Array.isArray(healthRoutinesRaw) ? healthRoutinesRaw : [];
    const reminders = Array.isArray(remindersRaw) ? remindersRaw : [];
    const actionPlans = Array.isArray(actionPlansRaw) ? actionPlansRaw : [];

    const derivedFromVisions = (visions as any[]).flatMap((v: any) => {
      const list = Array.isArray(v?.goals) ? (v.goals as any[]) : [];
      return list
        .filter(Boolean)
        .map((g: any) => ({ ...g, visionId: String(g?.visionId || v?.id || '').trim() }));
    });
    const derivedFromPlans = (actionPlans as any[])
      .filter((p: any) => p?.visionId)
      .flatMap((p: any) => {
        const list = Array.isArray(p?.goals) ? (p.goals as any[]) : [];
        return list
          .filter(Boolean)
          .map((g: any) => ({
            ...g,
            visionId: String(p.visionId),
            startDate: g?.startDate,
            targetDate: g?.endDate,
          }));
      });

    const goalsById = new Map<string, any>();
    for (const g of [...(goals as any[]), ...derivedFromVisions, ...derivedFromPlans]) {
      if (!g?.id) continue;
      goalsById.set(String(g.id), g);
    }
    const allGoals = Array.from(goalsById.values());

    const tasksCompleted = tasks.filter((t: any) => Boolean(t?.completed) || t?.status === 'completed' || Number(t?.progress) >= 100).length;
    const todosCompleted = todos.filter((t: any) => Boolean(t?.completed)).length;
    const goalsCompleted = allGoals.filter((g: any) => g?.status === 'completed' || Number(g?.progress) >= 100).length;
    const wordsCompleted = (words as any[]).filter((w: any) => w?.status === 'completed').length;

    const goalsAvgProgress =
      allGoals.length > 0
        ? Math.round(
            allGoals.reduce((sum: number, g: any) => sum + (Number(g?.progress) || (g?.status === 'completed' ? 100 : 0)), 0) /
              allGoals.length
          )
        : 0;

    const healthRoutineStreak = Math.max(...healthRoutines.map((r: any) => Number(r?.streak) || 0), 0);

    const milestonesFromVisions = visions.reduce((sum: number, v: any) => sum + (Array.isArray(v?.milestones) ? v.milestones.length : 0), 0);
    const milestonesFromActionPlans = actionPlans.reduce(
      (sum: number, p: any) => sum + (Array.isArray(p?.milestones) ? p.milestones.length : 0),
      0
    );
    const milestonesCount = milestonesFromVisions + milestonesFromActionPlans;
    const remindersCount = reminders.length;

    const goalsTotal = allGoals.length;
    const tasksTotal = tasks.length;
    const todosTotal = todos.length;
    const wordsTotal = words.length;

    const totalItems = goalsTotal + tasksTotal + todosTotal + wordsTotal;
    const doneItems = goalsCompleted + tasksCompleted + todosCompleted + wordsCompleted;
    const overallCompletion = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

    // Calculate vision category breakdown
    const categoryMap = new Map<string, { completed: number; total: number }>();
    visions.forEach((v: any) => {
      const category = v?.category || 'Uncategorized';
      const current = categoryMap.get(category) || { completed: 0, total: 0 };
      current.total += 1;
      if (v?.completed) current.completed += 1;
      categoryMap.set(category, current);
    });
    const breakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      completed: data.completed,
      total: data.total,
    }));

    setStats({
      overallCompletion,
      goalsCompleted,
      goalsTotal,
      tasksCompleted,
      tasksTotal,
      todosCompleted,
      todosTotal,
      wordsCompleted,
      wordsTotal,
      goalsAvgProgress,
      visionsCount: visions.length,
      diamondPeopleCount: diamondPeople.length,
      healthRoutineStreak,
      remindersCount,
      milestonesCount,
    });
    setVisionBreakdown(breakdown);
  };

  if (!mounted) return null;

  const completionRate = (completed: number, total: number) => (total > 0 ? Math.round((completed / total) * 100) : 0);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-swar-text mb-2">📊 Progress Report</h1>
        <p className="text-swar-text-secondary">Your personal growth metrics and achievements</p>
      </div>

      {/* Main Progress Card */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-8 mb-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white border-2 border-emerald-200">
              <BarChart3 className="h-8 w-8 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-swar-text-secondary mb-1">OVERALL PROGRESS</p>
              <p className="text-2xl font-black text-swar-text">Goals • Tasks • Todos • Words</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-5xl font-black text-emerald-700">{stats.overallCompletion}%</p>
            <p className="text-xs text-swar-text-secondary mt-1">Complete</p>
          </div>
        </div>
        <div className="mt-6 h-4 w-full rounded-full bg-emerald-200 overflow-hidden border-2 border-emerald-300">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700" style={{ width: `${stats.overallCompletion}%` }} />
        </div>
      </div>

      {/* Category Breakdown */}
      {visionBreakdown.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-swar-text mb-4">🎯 Vision Category Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visionBreakdown.map((item) => (
              <div key={item.category} className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-swar-text">{item.category}</h3>
                  <span className="text-sm font-black bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                    {completionRate(item.completed, item.total)}%
                  </span>
                </div>
                <p className="text-sm text-swar-text-secondary mb-3">
                  {item.completed} of {item.total} completed
                </p>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                    style={{ width: `${completionRate(item.completed, item.total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core Progress Boxes */}
      <h2 className="text-xl font-bold text-swar-text mb-4">📈 Detailed Progress by Type</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Goals */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-swar-text">🎯 Goals</h3>
            <span className="text-2xl font-black text-emerald-700">{completionRate(stats.goalsCompleted, stats.goalsTotal)}%</span>
          </div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-swar-text-secondary mb-2">
                <span className="font-bold text-swar-text">{stats.goalsCompleted}</span> of{' '}
                <span className="font-bold text-swar-text">{stats.goalsTotal}</span> completed
              </p>
              <div className="h-3 rounded-full bg-emerald-100 overflow-hidden border border-emerald-200">
                <div
                  className="h-full bg-emerald-600"
                  style={{ width: `${stats.goalsTotal > 0 ? (stats.goalsCompleted / stats.goalsTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-swar-text-secondary">Avg Progress: <span className="font-bold text-emerald-700">{stats.goalsAvgProgress}%</span></p>
        </div>

        {/* Tasks */}
        <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-swar-text">✓ Tasks</h3>
            <span className="text-2xl font-black text-orange-700">{completionRate(stats.tasksCompleted, stats.tasksTotal)}%</span>
          </div>
          <div className="mb-3">
            <p className="text-sm text-swar-text-secondary mb-2">
              <span className="font-bold text-swar-text">{stats.tasksCompleted}</span> of{' '}
              <span className="font-bold text-swar-text">{stats.tasksTotal}</span> completed
            </p>
            <div className="h-3 rounded-full bg-orange-100 overflow-hidden border border-orange-200">
              <div
                className="h-full bg-orange-500"
                style={{ width: `${stats.tasksTotal > 0 ? (stats.tasksCompleted / stats.tasksTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Todos */}
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-swar-text">☐ Todos</h3>
            <span className="text-2xl font-black text-slate-700">{completionRate(stats.todosCompleted, stats.todosTotal)}%</span>
          </div>
          <div className="mb-3">
            <p className="text-sm text-swar-text-secondary mb-2">
              <span className="font-bold text-swar-text">{stats.todosCompleted}</span> of{' '}
              <span className="font-bold text-swar-text">{stats.todosTotal}</span> completed
            </p>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-slate-700"
                style={{ width: `${stats.todosTotal > 0 ? (stats.todosCompleted / stats.todosTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Words */}
        <div className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-swar-text">✨ Words</h3>
            <span className="text-2xl font-black text-pink-700">{completionRate(stats.wordsCompleted, stats.wordsTotal)}%</span>
          </div>
          <div className="mb-3">
            <p className="text-sm text-swar-text-secondary mb-2">
              <span className="font-bold text-swar-text">{stats.wordsCompleted}</span> of{' '}
              <span className="font-bold text-swar-text">{stats.wordsTotal}</span> completed
            </p>
            <div className="h-3 rounded-full bg-pink-100 overflow-hidden border border-pink-200">
              <div
                className="h-full bg-pink-500"
                style={{ width: `${stats.wordsTotal > 0 ? (stats.wordsCompleted / stats.wordsTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Achievements & Streaks */}
      <h2 className="text-xl font-bold text-swar-text mb-4">🏆 Achievements & Metrics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5 text-center hover:shadow-md transition">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-2xl font-black text-blue-700">{stats.visionsCount}</p>
          <p className="text-xs font-bold text-swar-text-secondary mt-2">Visions</p>
        </div>
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-5 text-center hover:shadow-md transition">
          <p className="text-3xl mb-2">🏁</p>
          <p className="text-2xl font-black text-amber-700">{stats.milestonesCount}</p>
          <p className="text-xs font-bold text-swar-text-secondary mt-2">Milestones</p>
        </div>
        <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-5 text-center hover:shadow-md transition">
          <p className="text-3xl mb-2">⏰</p>
          <p className="text-2xl font-black text-purple-700">{stats.remindersCount}</p>
          <p className="text-xs font-bold text-swar-text-secondary mt-2">Reminders</p>
        </div>
        <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100 p-5 text-center hover:shadow-md transition">
          <p className="text-3xl mb-2">💎</p>
          <p className="text-2xl font-black text-rose-700">{stats.diamondPeopleCount}</p>
          <p className="text-xs font-bold text-swar-text-secondary mt-2">People</p>
        </div>
        <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-5 text-center hover:shadow-md transition">
          <p className="text-3xl mb-2">🔥</p>
          <p className="text-2xl font-black text-red-700">{stats.healthRoutineStreak}</p>
          <p className="text-xs font-bold text-swar-text-secondary mt-2">Streak</p>
        </div>
      </div>
    </div>
  );
}
