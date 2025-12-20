'use client';

import { useEffect, useState } from 'react';
import { Plus, Check, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { HealthRoutine } from '@/lib/types/lifePlanner';

type WorkshopCategory = 'self' | 'family' | 'workStudy' | 'parents' | 'friendsRelatives' | 'social';

interface WorkshopTask {
  id: string;
  category: WorkshopCategory;
  text: string;
}

interface RoutineItem {
  id: string;
  name: string;
  target: string;
  completed: boolean;
}

interface SadhanaItem {
  id: string;
  name: string;
  frequency: string;
  duration: string;
  completed: boolean;
}

export default function DailyViewPage() {
  const [today] = useState(new Date().toISOString().split('T')[0]);

  const [workshopTasks, setWorkshopTasks] = useState<WorkshopTask[]>([]);
  const [newWorkshopTask, setNewWorkshopTask] = useState('');
  const [selectedWorkshopCategory, setSelectedWorkshopCategory] = useState<WorkshopCategory>('workStudy');
  const [workshopError, setWorkshopError] = useState<string>('');
  const [heroImgSrc, setHeroImgSrc] = useState('/images/swar-yoga-hero.jpg');

  const [routine, setRoutine] = useState<RoutineItem[]>([
    { id: '1', name: 'Pranayama', target: '2 times 5 mins', completed: false },
    { id: '2', name: 'Meditation', target: '1 time 15 mins', completed: false },
    { id: '3', name: 'Water', target: '3 liter', completed: false },
  ]);
  
  const [sadhana, setSadhana] = useState<SadhanaItem[]>([
    { id: '1', name: 'Pranayama', frequency: '2 times', duration: '5 minutes', completed: false },
    { id: '2', name: 'Meditation', frequency: '1 time', duration: '15 minutes', completed: false },
    { id: '3', name: 'Water', frequency: 'Daily', duration: '3 liter', completed: false },
  ]);

  const [vision, setVision] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const [healthRoutines, setHealthRoutines] = useState<HealthRoutine[]>([]);
  const [healthMounted, setHealthMounted] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthHasLoaded, setHealthHasLoaded] = useState(false);
  const [healthError, setHealthError] = useState<string>('');

  const workshopCategories: Array<{ id: WorkshopCategory; label: string; quota: number }> = [
    { id: 'self', label: 'Self', quota: 1 },
    { id: 'family', label: 'Family', quota: 1 },
    { id: 'workStudy', label: 'Work / Study', quota: 6 },
    { id: 'parents', label: 'Parents', quota: 1 },
    { id: 'friendsRelatives', label: 'Friends & Relatives', quota: 1 },
    { id: 'social', label: 'Social', quota: 1 },
  ];

  const workshopTotalLimit = 10;

  useEffect(() => {
    setHealthMounted(true);
    loadWorkshopTasks();
    loadRoutine();
    loadSadhana();
    loadVisionGoalsTasks();

    // Load Health routines (same source as Health dashboard)
    (async () => {
      setHealthLoading(true);
      setHealthError('');
      try {
        const saved = await lifePlannerStorage.getHealthRoutines();
        const normalized = (Array.isArray(saved) ? saved : []).map((r) => {
          const completedDates = Array.isArray((r as any).completedDates) ? (r as any).completedDates : [];
          const streak = typeof (r as any).streak === 'number' ? (r as any).streak : 0;
          const category = (r as any).category || (r as any).type || 'other';
          return { ...r, completedDates, streak, category } as HealthRoutine;
        });
        setHealthRoutines(normalized);
      } catch (e) {
        console.error('Error loading health routines:', e);
        setHealthError('Failed to load health routines');
      } finally {
        setHealthLoading(false);
        setHealthHasLoaded(true);
      }
    })();
  }, [today]);

  // Persist health routines when changed (debounced, like Health page)
  useEffect(() => {
    if (!healthMounted || !healthHasLoaded) return;
    const timer = window.setTimeout(() => {
      (async () => {
        try {
          await lifePlannerStorage.saveHealthRoutines(healthRoutines);
        } catch (e) {
          console.error('Error saving health routines:', e);
          // Avoid noisy UI; show only if user interacts and errors persist.
        }
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [healthRoutines, healthMounted, healthHasLoaded]);

  const toggleHealthRoutineComplete = (id: string) => {
    setHealthRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const completedDates = Array.isArray((r as any).completedDates) ? (r as any).completedDates : [];
        const completedToday = completedDates.includes(today);
        const nextCompletedDates = completedToday
          ? completedDates.filter((d: string) => d !== today)
          : [...completedDates, today];

        return {
          ...r,
          completedDates: nextCompletedDates,
          // Keep streak behavior consistent with existing Health Routines page
          streak: completedToday ? 0 : ((r as any).streak || 0) + 1,
          updatedAt: new Date().toISOString(),
        } as HealthRoutine;
      })
    );
  };

  const getWorkshopStorageKey = () => `dailyWorkshopPlannerTasks:${today}`;

  const loadWorkshopTasks = () => {
    const stored = localStorage.getItem(getWorkshopStorageKey());
    if (stored) {
      setWorkshopTasks(JSON.parse(stored));
    }
  };

  const persistWorkshopTasks = (updated: WorkshopTask[]) => {
    setWorkshopTasks(updated);
    localStorage.setItem(getWorkshopStorageKey(), JSON.stringify(updated));
  };

  const loadRoutine = () => {
    const stored = localStorage.getItem('dailyRoutine');
    if (stored) {
      setRoutine(JSON.parse(stored));
    }
  };

  const loadSadhana = () => {
    const stored = localStorage.getItem('dailySadhana');
    if (stored) {
      setSadhana(JSON.parse(stored));
    }
  };

  const loadVisionGoalsTasks = () => {
    const storedVision = localStorage.getItem('lifePlannerVision');
    const storedGoals = localStorage.getItem('lifePlannerGoals');
    const storedTasks = localStorage.getItem('lifePlannerTasks');
    
    if (storedVision) setVision(JSON.parse(storedVision));
    if (storedGoals) setGoals(JSON.parse(storedGoals));
    if (storedTasks) setTasks(JSON.parse(storedTasks));
  };

  const addWorkshopTask = () => {
    const text = newWorkshopTask.trim();
    if (!text) return;

    setWorkshopError('');

    if (workshopTasks.length >= workshopTotalLimit) {
      setWorkshopError(`Daily task limit reached (${workshopTotalLimit}).`);
      return;
    }

    const categoryQuota = workshopCategories.find(c => c.id === selectedWorkshopCategory)?.quota ?? 999;
    const categoryCount = workshopTasks.filter(t => t.category === selectedWorkshopCategory).length;
    if (categoryCount >= categoryQuota) {
      setWorkshopError(`Limit reached for ${workshopCategories.find(c => c.id === selectedWorkshopCategory)?.label ?? 'this category'}.`);
      return;
    }

    const task: WorkshopTask = {
      id: Date.now().toString(),
      category: selectedWorkshopCategory,
      text,
    };

    persistWorkshopTasks([...workshopTasks, task]);
    setNewWorkshopTask('');
  };

  const deleteWorkshopTask = (id: string) => {
    persistWorkshopTasks(workshopTasks.filter(t => t.id !== id));
  };

  const updateWorkshopTask = (id: string, nextText: string) => {
    const text = nextText.trim();
    if (!text) return;
    persistWorkshopTasks(workshopTasks.map(t => (t.id === id ? { ...t, text } : t)));
  };

  const toggleRoutine = (id: string) => {
    const updated = routine.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
    setRoutine(updated);
    localStorage.setItem('dailyRoutine', JSON.stringify(updated));
  };

  const toggleSadhana = (id: string) => {
    const updated = sadhana.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    setSadhana(updated);
    localStorage.setItem('dailySadhana', JSON.stringify(updated));
  };

  const getTodayItems = (items: any[], type: string) => {
    return items.filter(item => {
      const itemDate = item.date || item.dueDate || item.targetDate;
      return itemDate === today;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Main Header */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-swar-text">Daily Planner</h1>
          <p className="text-sm sm:text-base text-swar-text-secondary mt-1">
            {new Date(today).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Top 3 Cards with Professional Headers */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Card 1: Daily Workshop Planner */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          <div className="relative">
            <img
              src={heroImgSrc}
              alt="Swar Yoga"
              className="w-full h-40 sm:h-44 object-cover"
              onError={() => setHeroImgSrc('/images/default-diamond.jpg')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/80 font-bold">Daily Workshop Planner</p>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">Total Daily Works: {workshopTotalLimit}</h2>
              <p className="text-xs text-white/85 mt-1">You’ve added {workshopTasks.length}/{workshopTotalLimit}</p>
            </div>
          </div>

          <div className="p-4 sm:p-6 flex flex-col flex-grow">
            {/* Add Task */}
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={newWorkshopTask}
                  onChange={(e) => {
                    setWorkshopError('');
                    setNewWorkshopTask(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addWorkshopTask()}
                  placeholder="Add your daily work..."
                  className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addWorkshopTask}
                  className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm font-semibold flex items-center justify-center gap-2"
                  title="Add"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-center">
                <select
                  value={selectedWorkshopCategory}
                  onChange={(e) => {
                    setWorkshopError('');
                    setSelectedWorkshopCategory(e.target.value as WorkshopCategory);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {workshopCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
                <p className="text-xs text-swar-text-secondary text-right">
                  Max {workshopTotalLimit} / day
                </p>
              </div>

              {workshopError ? (
                <p className="text-xs text-red-600">{workshopError}</p>
              ) : null}
            </div>

            {/* Category sections */}
            <div className="mt-4 space-y-4 flex-grow max-h-64 overflow-y-auto">
              {workshopCategories.map(cat => {
                const catTasks = workshopTasks.filter(t => t.category === cat.id);
                return (
                  <div key={cat.id} className="border-l-4 border-blue-400 pl-3">
                    <h3 className="text-xs font-semibold text-swar-text mb-2">
                      {cat.label} ({catTasks.length}/{cat.quota})
                    </h3>
                    {catTasks.length === 0 ? (
                      <p className="text-xs text-swar-text-secondary italic">No tasks added</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {catTasks.map(task => (
                          <li key={task.id} className="flex items-center gap-2 group">
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                            <span
                              className="text-xs sm:text-sm flex-grow text-swar-text outline-none rounded px-1 -mx-1 focus:bg-blue-50"
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => updateWorkshopTask(task.id, e.currentTarget.textContent ?? '')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLElement).blur();
                                }
                              }}
                            >
                              {task.text}
                            </span>
                            <button
                              onClick={() => deleteWorkshopTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-50 rounded text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: My Routine */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          {/* Header with Color Box */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-green-100 font-bold">Wellness</p>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">My Routine</h2>
            </div>
            <a
              href="/life-planner/dashboard/health"
              className="rounded-full bg-white text-green-600 p-2.5 hover:bg-green-50 transition font-bold flex-shrink-0 shadow-md"
              title="Open Health"
            >
              <Plus size={20} />
            </a>
          </div>
          
          <div className="p-4 sm:p-6 flex flex-col flex-grow">
            {/* Health dashboard summary (from Health page) */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-swar-border">
                <div className="text-xl font-bold text-emerald-600 mb-0.5">{healthRoutines.length}</div>
                <div className="text-swar-text-secondary text-xs">Total Routines</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-swar-border">
                <div className="text-xl font-bold text-red-600 mb-0.5">{Math.max(...healthRoutines.map(r => (r as any).streak || 0), 0)}</div>
                <div className="text-swar-text-secondary text-xs">Best Streak</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-swar-border">
                <div className="text-xl font-bold text-purple-600 mb-0.5">{healthRoutines.reduce((sum, r) => sum + (Array.isArray((r as any).completedDates) ? (r as any).completedDates.length : 0), 0)}</div>
                <div className="text-swar-text-secondary text-xs">Total Completions</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-swar-border">
                <div className="text-xl font-bold text-green-600 mb-0.5">{healthRoutines.filter(r => (Array.isArray((r as any).completedDates) ? (r as any).completedDates : []).includes(today)).length}</div>
                <div className="text-swar-text-secondary text-xs">Done Today</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-swar-text-secondary">Today’s Health Routines</p>
              <a href="/life-planner/dashboard/health-routines" className="text-xs font-semibold text-green-700 hover:text-green-800">Open</a>
            </div>

            {healthError ? (
              <div className="mb-3 text-xs text-red-600">{healthError}</div>
            ) : null}

            {healthLoading ? (
              <p className="text-xs text-swar-text-secondary italic">Loading health routines...</p>
            ) : healthRoutines.length === 0 ? (
              <p className="text-xs text-swar-text-secondary italic">No health routines yet. Add some in the Health page.</p>
            ) : (
              <div className="space-y-2">
                {healthRoutines.map((r) => {
                  const completedToday = (Array.isArray((r as any).completedDates) ? (r as any).completedDates : []).includes(today);
                  const category = ((r as any).category || (r as any).type || 'other') as string;
                  const categoryEmoji: Record<string, string> = {
                    exercise: '💪',
                    meditation: '🧘',
                    nutrition: '🥗',
                    sleep: '😴',
                    other: '✨',
                  };
                  return (
                    <div key={r.id} className="bg-white rounded-xl p-3 border border-swar-border hover:shadow-sm transition">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleHealthRoutineComplete(r.id)}
                          className="text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                          title={completedToday ? 'Mark as not done' : 'Mark as done'}
                        >
                          {completedToday ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-swar-text truncate">
                            {(categoryEmoji[category] || '✨')} {r.title}
                          </p>
                          {r.description ? (
                            <p className="text-xs text-swar-text-secondary line-clamp-1 mt-0.5">{r.description}</p>
                          ) : null}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">🔥 {(r as any).streak || 0} streak</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{(r.frequency || 'daily') as any}</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">{(Array.isArray((r as any).completedDates) ? (r as any).completedDates.length : 0)} completions</span>
                          </div>
                        </div>
                        {completedToday ? (
                          <span className="text-xs font-semibold text-green-700">Done</span>
                        ) : (
                          <span className="text-xs font-semibold text-swar-text-secondary">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legacy quick checklist (kept for continuity) */}
            <div className="mt-4 border-t border-swar-border pt-4">
              <p className="text-xs font-semibold text-swar-text-secondary mb-2">Quick Checklist</p>
              <div className="space-y-2">
                {routine.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-green-50 transition">
                    <button
                      onClick={() => toggleRoutine(item.id)}
                      className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition ${
                        item.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {item.completed && <Check size={14} className="text-white" />}
                    </button>
                    <div className="flex-grow">
                      <p className={`text-sm font-semibold ${item.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-swar-text-secondary mt-0.5">{item.target}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: My Sadhana */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          {/* Header with Color Box */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-purple-100 font-bold">Spiritual</p>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">My Sadhana</h2>
            </div>
            <button className="rounded-full bg-white text-purple-600 p-2.5 hover:bg-purple-50 transition font-bold flex-shrink-0 shadow-md" title="Add sadhana">
              <Plus size={20} />
            </button>
          </div>
          
          <div className="p-4 sm:p-6 flex flex-col flex-grow">
            <div className="space-y-3">
              {sadhana.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-purple-50 transition">
                  <button
                    onClick={() => toggleSadhana(item.id)}
                    className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition ${
                      item.completed
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-gray-300 hover:border-purple-500'
                    }`}
                  >
                    {item.completed && <Check size={14} className="text-white" />}
                  </button>
                  <div className="flex-grow">
                    <p className={`text-sm font-semibold ${item.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>
                      {item.name}
                    </p>
                    <p className="text-xs text-swar-text-secondary mt-0.5">
                      {item.frequency} • {item.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Card 4: My Today's Vision */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          {/* Header with Color Box */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 sm:px-6 py-4 sm:py-5">
            <p className="text-xs uppercase tracking-[0.3em] text-red-100 font-bold">Vision</p>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">Today's Vision</h2>
          </div>
          
          <div className="p-4 sm:p-6 flex flex-col flex-grow">
            <div className="space-y-2">
              {getTodayItems(vision, 'vision').length > 0 ? (
                getTodayItems(vision, 'vision').map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-red-50 transition">
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />
                    <p className="text-sm text-swar-text">{item.title || item.name}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-swar-text-secondary italic">No visions scheduled</p>
              )}
            </div>
          </div>
        </div>

        {/* Card 5: My Today's Goals */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          {/* Header with Color Box */}
          <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 sm:px-6 py-4 sm:py-5">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100 font-bold">Goals</p>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">Today's Goals</h2>
          </div>
          
          <div className="p-4 sm:p-6 flex flex-col flex-grow">
            <div className="space-y-2">
              {getTodayItems(goals, 'goals').length > 0 ? (
                getTodayItems(goals, 'goals').map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-amber-50 transition">
                    <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-1.5" />
                    <p className="text-sm text-swar-text">{item.title || item.name}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-swar-text-secondary italic">No goals scheduled</p>
              )}
            </div>
          </div>
        </div>

        {/* Card 6: My Today's Tasks & Reminders */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          {/* Header with Color Box */}
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-4 sm:px-6 py-4 sm:py-5">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-100 font-bold">Tasks</p>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">Today's Tasks</h2>
          </div>
          
          <div className="p-4 sm:p-6 flex flex-col flex-grow">
            <div className="space-y-2">
              {getTodayItems(tasks, 'tasks').length > 0 ? (
                getTodayItems(tasks, 'tasks').map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-indigo-50 transition">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                      item.completed ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <p className={`text-sm ${
                      item.completed ? 'line-through text-gray-400' : 'text-swar-text'
                    }`}>
                      {item.title || item.name}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-swar-text-secondary italic">No tasks scheduled</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
