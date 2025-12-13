'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Heart } from 'lucide-react';
import { HealthRoutine } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';

export default function HealthRoutinesPage() {
  const [routines, setRoutines] = useState<HealthRoutine[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const saved = await lifePlannerStorage.getHealthRoutines();
      const normalized = (Array.isArray(saved) ? saved : []).map(r => {
        const completedDates = Array.isArray((r as any).completedDates) ? (r as any).completedDates : [];
        const streak = typeof (r as any).streak === 'number' ? (r as any).streak : 0;
        const category = (r as any).category || (r as any).type || 'other';
        return { ...r, completedDates, streak, category };
      });
      setRoutines(normalized.length > 0 ? normalized : []);
    })();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      await lifePlannerStorage.saveHealthRoutines(routines);
    })();
  }, [routines, mounted]);

  const handleAddRoutine = () => {
    const newRoutine: HealthRoutine = {
      id: Date.now().toString(),
      title: 'New Routine',
      category: 'exercise',
      frequency: 'daily',
      completedDates: [],
      streak: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRoutines(prev => [...prev, newRoutine]);
  };

  const handleDeleteRoutine = (id: string) => {
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const handleMarkComplete = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    setRoutines(prev =>
      prev.map(r => {
        if (r.id === id) {
          const isCompletedToday = r.completedDates.includes(today);
          const newCompletedDates = isCompletedToday
            ? r.completedDates.filter(d => d !== today)
            : [...r.completedDates, today];
          
          return {
            ...r,
            completedDates: newCompletedDates,
            streak: isCompletedToday ? 0 : (r.streak + 1),
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );
  };

  if (!mounted) return null;

  const categoryEmoji = {
    exercise: '💪',
    meditation: '🧘',
    nutrition: '🥗',
    sleep: '😴',
    other: '✨',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Health Routines</h1>
          <p className="text-gray-600">Build and track daily health habits</p>
        </div>
        <button
          onClick={handleAddRoutine}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Add Routine</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{routines.length}</div>
          <div className="text-gray-600 text-sm">Total Routines</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-red-600 mb-1">{Math.max(...routines.map(r => r.streak), 0)}</div>
          <div className="text-gray-600 text-sm">Best Streak</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-purple-600 mb-1">{routines.reduce((sum, r) => sum + r.completedDates.length, 0)}</div>
          <div className="text-gray-600 text-sm">Total Completions</div>
        </div>
      </div>

      {/* Routines List */}
      <div className="space-y-3">
        {routines.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No routines yet</h3>
            <p className="text-gray-600 mb-4">Create your first health routine.</p>
            <button
              onClick={handleAddRoutine}
              className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Routine</span>
            </button>
          </div>
        ) : (
          routines.map(routine => {
            const completedToday = routine.completedDates.includes(new Date().toISOString().split('T')[0]);
            return (
              <div key={routine.id} className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleMarkComplete(routine.id)}
                    className="text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                  >
                    {completedToday ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800">
                      {categoryEmoji[routine.category as keyof typeof categoryEmoji] || '✨'} {routine.title}
                    </h3>
                    {routine.description && <p className="text-gray-600 text-sm mt-1">{routine.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                        🔥 {routine.streak} day streak
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{routine.frequency}</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                        {routine.completedDates.length} completions
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteRoutine(routine.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
