'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerStorage';

export default function ProgressReportPage() {
  const [stats, setStats] = useState({
    weeklyCompletion: 0,
    monthlyCompletion: 0,
    yearlyCompletion: 0,
    tasksCompleted: 0,
    tasksTotal: 0,
    todosCompleted: 0,
    todosTotal: 0,
    goalsAvgProgress: 0,
    visionsCount: 0,
    diamondPeopleCount: 0,
    healthRoutineStreak: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    calculateStats();
  }, []);

  const calculateStats = () => {
    const tasks = lifePlannerStorage.getTasks();
    const todos = lifePlannerStorage.getTodos();
    const goals = lifePlannerStorage.getGoals();
    const visions = lifePlannerStorage.getVisions();
    const diamondPeople = lifePlannerStorage.getDiamondPeople();
    const healthRoutines = lifePlannerStorage.getHealthRoutines();

    const tasksCompleted = tasks.filter(t => t.completed).length;
    const todosCompleted = todos.filter(t => t.completed).length;
    const goalsAvgProgress = goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0;
    const healthRoutineStreak = Math.max(...healthRoutines.map(r => r.streak), 0);

    const weeklyCompletion = tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0;
    const monthlyCompletion = todos.length > 0 ? Math.round((todosCompleted / todos.length) * 100) : 0;
    const yearlyCompletion = goals.length > 0 ? Math.round(goalsAvgProgress) : 0;

    setStats({
      weeklyCompletion,
      monthlyCompletion,
      yearlyCompletion,
      tasksCompleted,
      tasksTotal: tasks.length,
      todosCompleted,
      todosTotal: todos.length,
      goalsAvgProgress,
      visionsCount: visions.length,
      diamondPeopleCount: diamondPeople.length,
      healthRoutineStreak,
    });
  };

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Progress Report</h1>
        <p className="text-gray-600">Your personal growth metrics and achievements</p>
      </div>

      {/* Period Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 shadow-lg">
          <p className="text-xs uppercase tracking-[0.15em] font-semibold text-emerald-700 mb-2">Weekly Progress</p>
          <p className="text-4xl font-bold text-emerald-600">{stats.weeklyCompletion}%</p>
          <p className="text-sm text-emerald-700 mt-3">Tasks completed</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-lg">
          <p className="text-xs uppercase tracking-[0.15em] font-semibold text-blue-700 mb-2">Monthly Progress</p>
          <p className="text-4xl font-bold text-blue-600">{stats.monthlyCompletion}%</p>
          <p className="text-sm text-blue-700 mt-3">Todos completed</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-lg">
          <p className="text-xs uppercase tracking-[0.15em] font-semibold text-purple-700 mb-2">Yearly Progress</p>
          <p className="text-4xl font-bold text-purple-600">{stats.yearlyCompletion}%</p>
          <p className="text-sm text-purple-700 mt-3">Goals average progress</p>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Tasks */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Tasks</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="text-sm font-bold text-gray-800">{stats.tasksTotal > 0 ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats.tasksTotal > 0 ? (stats.tasksCompleted / stats.tasksTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-600">{stats.tasksCompleted}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-600">{stats.tasksTotal}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Todos */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Todos</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="text-sm font-bold text-gray-800">{stats.todosTotal > 0 ? Math.round((stats.todosCompleted / stats.todosTotal) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats.todosTotal > 0 ? (stats.todosCompleted / stats.todosTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-600">{stats.todosCompleted}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-600">{stats.todosTotal}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg text-center">
          <p className="text-2xl mb-2">🎯</p>
          <p className="text-lg font-bold text-gray-800">{stats.visionsCount}</p>
          <p className="text-sm text-gray-600">Visions</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg text-center">
          <p className="text-2xl mb-2">💎</p>
          <p className="text-lg font-bold text-gray-800">{stats.diamondPeopleCount}</p>
          <p className="text-sm text-gray-600">Diamond People</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg text-center">
          <p className="text-2xl mb-2">🔥</p>
          <p className="text-lg font-bold text-gray-800">{stats.healthRoutineStreak}</p>
          <p className="text-sm text-gray-600">Day Streak</p>
        </div>
      </div>
    </div>
  );
}
