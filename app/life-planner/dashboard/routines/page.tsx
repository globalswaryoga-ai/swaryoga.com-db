'use client';

import { useState, useCallback, useMemo } from 'react';
import { Clock, AlertCircle, Plus, X } from 'lucide-react';

interface Routine {
  id: string;
  text: string;
  time: string;
  timePeriod: 'morning' | 'afternoon' | 'evening' | 'night';
}

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    time: '',
    timePeriod: 'morning' as 'morning' | 'afternoon' | 'evening' | 'night',
  });
  const [error, setError] = useState<string | null>(null);

  const isFormValid = useMemo(
    () => formData.text.trim().length > 0 && formData.time,
    [formData.text, formData.time]
  );

  const handleAddRoutine = useCallback(() => {
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    const newRoutine: Routine = {
      id: Date.now().toString(),
      text: formData.text,
      time: formData.time,
      timePeriod: formData.timePeriod,
    };

    setRoutines([...routines, newRoutine]);
    setFormData({
      text: '',
      time: '',
      timePeriod: 'morning',
    });
    setError(null);
    setShowForm(false);
  }, [formData, isFormValid, routines]);

  const handleDeleteRoutine = useCallback(
    (id: string) => {
      setRoutines(routines.filter((r) => r.id !== id));
    },
    [routines]
  );

  const timePeriodLabels: Record<string, string> = {
    morning: '🌅 Morning',
    afternoon: '☀️ Afternoon',
    evening: '🌆 Evening',
    night: '🌙 Night',
  };

  const timePeriodColors: Record<string, string> = {
    morning: 'from-yellow-400 to-orange-400',
    afternoon: 'from-orange-400 to-red-400',
    evening: 'from-indigo-400 to-purple-400',
    night: 'from-slate-600 to-slate-800',
  };

  const groupedRoutines = {
    morning: routines.filter((r) => r.timePeriod === 'morning'),
    afternoon: routines.filter((r) => r.timePeriod === 'afternoon'),
    evening: routines.filter((r) => r.timePeriod === 'evening'),
    night: routines.filter((r) => r.timePeriod === 'night'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Routines</h1>
          <p className="text-gray-600 mt-1">Build healthy habits with organized routines throughout the day</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition"
        >
          <Plus className="h-5 w-5" />
          Add Routine
        </button>
      </div>

      {/* Add Routine Form */}
      {showForm && (
        <div className="rounded-3xl border border-pink-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Routine</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Routine Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Routine Activity *
              </label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="What routine activity? (e.g., Morning yoga, Breakfast, Meditation)"
                className="w-full rounded-lg border border-pink-200 px-4 py-3 text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 resize-none"
                rows={3}
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full rounded-lg border border-pink-200 px-4 py-3 text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
              />
            </div>

            {/* Time Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Time Period</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['morning', 'afternoon', 'evening', 'night'] as const).map((period) => (
                  <label key={period} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="timePeriod"
                      value={period}
                      checked={formData.timePeriod === period}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timePeriod: e.target.value as 'morning' | 'afternoon' | 'evening' | 'night',
                        })
                      }
                      className="h-5 w-5 rounded-full border-2 border-pink-300 text-red-600 focus:ring-2 focus:ring-red-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 font-medium">{timePeriodLabels[period]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddRoutine}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 px-4 py-3 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition"
              >
                Create Routine
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                  setFormData({
                    text: '',
                    time: '',
                    timePeriod: 'morning',
                  });
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routines by Time Period */}
      {Object.entries(groupedRoutines).map(([period, items]) => (
        <div key={period}>
          <div className={`rounded-2xl bg-gradient-to-r ${timePeriodColors[period]} p-6 text-white mb-4`}>
            <h2 className="text-2xl font-bold">{timePeriodLabels[period]}</h2>
            <p className="text-white/80 text-sm mt-1">{items.length} routine(s)</p>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-pink-200 p-8 text-center mb-6">
              <p className="text-gray-600">No routines for {period}</p>
            </div>
          ) : (
            <div className="grid gap-4 mb-6">
              {items.map((routine) => (
                <div key={routine.id} className="rounded-2xl border border-pink-200 bg-white p-6 shadow-md hover:shadow-lg transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-gray-900">{routine.text}</p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">⏰ Time:</span>
                        {routine.time}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRoutine(routine.id)}
                      className="ml-4 flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Delete routine"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Empty State */}
      {routines.length === 0 && !showForm && (
        <div className="rounded-3xl border-2 border-dashed border-pink-200 p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No routines yet</p>
          <p className="text-gray-500 text-sm mt-1">Create your first routine to build healthy habits</p>
        </div>
      )}
    </div>
  );
}
