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

  // Filters (UI-only; never persisted)
  const [searchText, setSearchText] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'all' | Routine['timePeriod']>('all');

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

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredRoutines = useMemo(() => {
    return routines.filter((r) => {
      const haystack = `${r.text || ''} ${r.time || ''} ${r.timePeriod || ''}`.toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);
      const matchesPeriod = filterPeriod === 'all' || r.timePeriod === filterPeriod;
      return matchesSearch && matchesPeriod;
    });
  }, [routines, normalizedSearch, filterPeriod]);

  const groupedRoutines = {
    morning: filteredRoutines.filter((r) => r.timePeriod === 'morning'),
    afternoon: filteredRoutines.filter((r) => r.timePeriod === 'afternoon'),
    evening: filteredRoutines.filter((r) => r.timePeriod === 'evening'),
    night: filteredRoutines.filter((r) => r.timePeriod === 'night'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-swar-text">Daily Routines</h1>
          <p className="text-swar-text-secondary mt-1">Build healthy habits with organized routines throughout the day</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-swar-accent to-swar-accent px-4 py-2 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition"
        >
          <Plus className="h-5 w-5" />
          Add Routine
        </button>
      </div>

      {/* Filters (match Vision dashboard style) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-swar-text mb-1">Search</label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search routine text / time"
              className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Time Period</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchText('');
                setFilterPeriod('all');
              }}
              className="w-full px-3 py-2 rounded-lg bg-swar-primary-light text-swar-text font-bold hover:bg-swar-primary-light transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-swar-text-secondary">Showing {filteredRoutines.length} of {routines.length} routines</p>
      </div>

      {/* Add Routine Form */}
      {showForm && (
        <div className="rounded-3xl border border-swar-border bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-swar-text mb-4">Create New Routine</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-swar-primary flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Routine Text */}
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">
                Routine Activity *
              </label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="What routine activity? (e.g., Morning yoga, Breakfast, Meditation)"
                className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 resize-none"
                rows={3}
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Time *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
              />
            </div>

            {/* Time Period */}
            <div>
              <label className="block text-sm font-medium text-swar-text mb-3">Time Period</label>
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
                    <span className="text-sm text-swar-text font-medium">{timePeriodLabels[period]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddRoutine}
                className="flex-1 rounded-lg bg-gradient-to-r from-swar-accent to-swar-accent px-4 py-3 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition"
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
                className="flex-1 rounded-lg border border-swar-border px-4 py-3 text-swar-text font-semibold hover:bg-swar-bg transition"
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
            <div className="rounded-2xl border-2 border-dashed border-swar-border p-8 text-center mb-6">
              <p className="text-swar-text-secondary">No routines for {period}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {items.map((routine) => (
                <div key={routine.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-300 flex flex-col h-full border-swar-border">
                  {/* Image header (match Vision: h-40) */}
                  <div className={`relative h-40 bg-gradient-to-r ${timePeriodColors[period]} overflow-hidden`}> 
                    {/* Top-right chip */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <span className="bg-white text-swar-text px-3 py-1 rounded-full text-xs font-bold shadow">
                        {timePeriodLabels[period]}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-4">
                      <span className="text-white text-lg font-bold drop-shadow-lg">{routine.text}</span>
                    </div>
                  </div>
                  {/* Card content (match Vision: p-4, space-y-3) */}
                  <div className="flex-1 flex flex-col p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs text-swar-text-secondary mb-2">
                      <div><span className="font-semibold">Time:</span> {routine.time}</div>
                      <div><span className="font-semibold">Period:</span> {timePeriodLabels[period]}</div>
                    </div>
                    <div className="flex gap-2 mt-auto pt-3 border-t">
                      <button
                        onClick={() => handleDeleteRoutine(routine.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-600 hover:bg-swar-primary-light rounded transition font-bold"
                      >
                        <X className="h-5 w-5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Empty State */}
      {routines.length === 0 && !showForm && (
        <div className="rounded-3xl border-2 border-dashed border-swar-border p-12 text-center">
          <Clock className="h-12 w-12 text-swar-text-secondary mx-auto mb-4" />
          <p className="text-swar-text-secondary text-lg">No routines yet</p>
          <p className="text-swar-text-secondary text-sm mt-1">Create your first routine to build healthy habits</p>
        </div>
      )}

      {routines.length > 0 && filteredRoutines.length === 0 && !showForm && (
        <div className="rounded-3xl border-2 border-dashed border-swar-border p-12 text-center">
          <Clock className="h-12 w-12 text-swar-text-secondary mx-auto mb-4" />
          <p className="text-swar-text-secondary text-lg">No routines match your filters</p>
          <p className="text-swar-text-secondary text-sm mt-1">Try clearing filters or searching a different keyword</p>
        </div>
      )}
    </div>
  );
}
