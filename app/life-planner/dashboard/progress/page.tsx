'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);

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

    // Goals can live in multiple places (flat, nested on vision, inside action plans)
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
  };

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-swar-text mb-2">Progress Report</h1>
        <p className="text-swar-text-secondary">Your personal growth metrics and achievements</p>
      </div>

      {/* Overall progress (same style language as Vision PDF) */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white border border-emerald-200">
              <BarChart3 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-swar-text">Overall Progress</p>
              <p className="text-xs text-swar-text-secondary">Goals + Tasks + Todos + Words</p>
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.overallCompletion}%</p>
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-emerald-100 overflow-hidden border border-emerald-200">
          <div className="h-full bg-emerald-600" style={{ width: `${stats.overallCompletion}%` }} />
        </div>
      </div>

      {/* Core boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Goals */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-swar-text">Goals</h3>
            <p className="text-sm font-black text-emerald-700">Avg: {stats.goalsAvgProgress}%</p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-swar-text-secondary">Completed</span>
              <span className="font-extrabold text-swar-text">{stats.goalsCompleted}/{stats.goalsTotal}</span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-emerald-100 overflow-hidden border border-emerald-200">
              <div
                className="h-full bg-emerald-600"
                style={{ width: `${stats.goalsTotal > 0 ? (stats.goalsCompleted / stats.goalsTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
          <h3 className="text-lg font-black text-swar-text">Tasks</h3>
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-swar-text-secondary">Completed</span>
              <span className="font-extrabold text-swar-text">{stats.tasksCompleted}/{stats.tasksTotal}</span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-orange-100 overflow-hidden border border-orange-200">
              <div
                className="h-full bg-orange-500"
                style={{ width: `${stats.tasksTotal > 0 ? (stats.tasksCompleted / stats.tasksTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Todos */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-lg font-black text-swar-text">Todos</h3>
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-swar-text-secondary">Completed</span>
              <span className="font-extrabold text-swar-text">{stats.todosCompleted}/{stats.todosTotal}</span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-slate-700"
                style={{ width: `${stats.todosTotal > 0 ? (stats.todosCompleted / stats.todosTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Words */}
        <div className="rounded-2xl border border-pink-200 bg-pink-50 p-6">
          <h3 className="text-lg font-black text-swar-text">Words</h3>
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-swar-text-secondary">Completed</span>
              <span className="font-extrabold text-swar-text">{stats.wordsCompleted}/{stats.wordsTotal}</span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-pink-100 overflow-hidden border border-pink-200">
              <div
                className="h-full bg-pink-500"
                style={{ width: `${stats.wordsTotal > 0 ? (stats.wordsCompleted / stats.wordsTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Other metrics (kept, but styled closer to Vision PDF cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-xl mb-1">🎯</p>
          <p className="text-lg font-black text-swar-text">{stats.visionsCount}</p>
          <p className="text-xs text-swar-text-secondary">Visions</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-xl mb-1">🏁</p>
          <p className="text-lg font-black text-swar-text">{stats.milestonesCount}</p>
          <p className="text-xs text-swar-text-secondary">Milestones</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-xl mb-1">⏰</p>
          <p className="text-lg font-black text-swar-text">{stats.remindersCount}</p>
          <p className="text-xs text-swar-text-secondary">Reminders</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-xl mb-1">💎</p>
          <p className="text-lg font-black text-swar-text">{stats.diamondPeopleCount}</p>
          <p className="text-xs text-swar-text-secondary">Diamond People</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-xl mb-1">🔥</p>
          <p className="text-lg font-black text-swar-text">{stats.healthRoutineStreak}</p>
          <p className="text-xs text-swar-text-secondary">Best Streak</p>
        </div>
      </div>
    </div>
  );
}
