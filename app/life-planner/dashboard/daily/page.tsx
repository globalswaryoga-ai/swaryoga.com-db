'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Check,
  Trash2,
  CheckCircle2,
  Circle,
  Pencil,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Flame,
  Clock,
  Sparkles,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { Goal, HealthRoutine, Task, Vision } from '@/lib/types/lifePlanner';

type WorkshopCategory = 'self' | 'family' | 'workStudy' | 'parents' | 'friendsRelatives' | 'social';
type TaskRepeat = 'none' | 'daily' | 'weekly' | 'monthly';

interface WorkshopTask {
  id: string;
  category: WorkshopCategory;
  text: string;
  repeat?: TaskRepeat;
  createdDate?: string;
  completed?: boolean;
  completedDate?: string;
}

type SadhanaSection = 'morning' | 'evening';

interface SadhanaPractice {
  id: string;
  name: string;
  frequency: string;
  duration: string;
  completed: boolean;
}

interface DailyDietState {
  waterLiters: number;
  dryFruitsBreakfast: boolean | null;
  herbalDrinks: string[];
}

interface DailySadhanaState {
  morning: SadhanaPractice[];
  evening: SadhanaPractice[];
  diet: DailyDietState;
}

const DEFAULT_SADHANA: DailySadhanaState = {
  morning: [
    { id: 'm-1', name: 'Pranayama', frequency: '2 times', duration: '5 minutes', completed: false },
    { id: 'm-2', name: 'Meditation', frequency: '1 time', duration: '15 minutes', completed: false },
  ],
  evening: [],
  diet: {
    waterLiters: 0,
    dryFruitsBreakfast: null,
    herbalDrinks: [],
  },
};

export default function DailyViewPage() {
  const getLocalDayKey = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [today] = useState(() => getLocalDayKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => getLocalDayKey(new Date()));
  const isToday = selectedDate === today;

  const formatDateDisplay = (dateKey: string) => {
    try {
      const d = new Date(dateKey + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateKey;
    }
  };

  const goPrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDayKey(d));
  };

  const goNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(getLocalDayKey(d));
  };

  // Card Expansion State
  const [expandedCards, setExpandedCards] = useState<Record<'workshop' | 'routine' | 'sadhana', boolean>>({
    workshop: true,
    routine: true,
    sadhana: true,
  });

  const toggleCard = (card: 'workshop' | 'routine' | 'sadhana') => {
    setExpandedCards((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  const allExpanded = expandedCards.workshop && expandedCards.routine && expandedCards.sadhana;

  const toggleAllCards = () => {
    if (allExpanded) {
      setExpandedCards({ workshop: false, routine: false, sadhana: false });
    } else {
      setExpandedCards({ workshop: true, routine: true, sadhana: true });
    }
  };

  const ensureExpanded = (card: 'workshop' | 'routine' | 'sadhana') => {
    if (!expandedCards[card]) {
      setExpandedCards((prev) => ({ ...prev, [card]: true }));
    }
  };

  const [workshopTasks, setWorkshopTasks] = useState<WorkshopTask[]>([]);
  const [newWorkshopTask, setNewWorkshopTask] = useState('');
  const [selectedWorkshopCategory, setSelectedWorkshopCategory] = useState<WorkshopCategory>('workStudy');
  const [newTaskRepeat, setNewTaskRepeat] = useState<TaskRepeat>('none');
  const [workshopError, setWorkshopError] = useState<string>('');

  const workshopCategoryRefs = useRef<Record<WorkshopCategory, HTMLDivElement | null>>({
    self: null,
    family: null,
    workStudy: null,
    parents: null,
    friendsRelatives: null,
    social: null,
  });

  const sadhanaStorageKey = `dailySadhanaV2:${selectedDate}`;
  const [sadhanaState, setSadhanaState] = useState<DailySadhanaState>(DEFAULT_SADHANA);
  const [sadhanaHasLoaded, setSadhanaHasLoaded] = useState(false);

  const [addMorningName, setAddMorningName] = useState('');
  const [addMorningFrequency, setAddMorningFrequency] = useState('');
  const [addMorningDuration, setAddMorningDuration] = useState('');

  const [addEveningName, setAddEveningName] = useState('');
  const [addEveningFrequency, setAddEveningFrequency] = useState('');
  const [addEveningDuration, setAddEveningDuration] = useState('');

  const [editing, setEditing] = useState<{ section: SadhanaSection; id: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editFrequency, setEditFrequency] = useState('');
  const [editDuration, setEditDuration] = useState('');

  const [vision, setVision] = useState<Vision[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [healthRoutines, setHealthRoutines] = useState<HealthRoutine[]>([]);
  const [healthMounted, setHealthMounted] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthHasLoaded, setHealthHasLoaded] = useState(false);
  const [healthError, setHealthError] = useState<string>('');

  const workshopCategories: Array<{ id: WorkshopCategory; label: string }> = [
    { id: 'self', label: 'Self' },
    { id: 'family', label: 'Family' },
    { id: 'workStudy', label: 'Work / Study' },
    { id: 'parents', label: 'Parents' },
    { id: 'friendsRelatives', label: 'Friends & Relatives' },
    { id: 'social', label: 'Social' },
  ];

  useEffect(() => {
    setHealthMounted(true);

    // Load Vision/Goals/Tasks
    (async () => {
      try {
        const [savedVisions, savedGoals, savedTasks] = await Promise.all([
          lifePlannerStorage.getVisions(),
          lifePlannerStorage.getGoals(),
          lifePlannerStorage.getTasks(),
        ]);
        setVision(Array.isArray(savedVisions) ? savedVisions : []);
        setGoals(Array.isArray(savedGoals) ? savedGoals : []);
        setTasks(Array.isArray(savedTasks) ? savedTasks : []);
      } catch (e) {
        console.error('Error loading vision/goals/tasks:', e);
      }
    })();

    // Load Health routines
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

  // Persist Sadhana when it changes
  useEffect(() => {
    if (!sadhanaHasLoaded) return;
    try {
      const timer = setTimeout(() => {
        (async () => {
          try {
            await lifePlannerStorage.saveSadhana(selectedDate, sadhanaState);
          } catch (error) {
            console.error('Error saving sadhana to MongoDB:', error);
          }
        })();
      }, 500);

      return () => clearTimeout(timer);
    } catch {
      // ignore
    }
  }, [sadhanaState, sadhanaHasLoaded, sadhanaStorageKey, selectedDate]);

  // Persist health routines
  useEffect(() => {
    if (!healthMounted || !healthHasLoaded) return;
    const timer = window.setTimeout(() => {
      (async () => {
        try {
          await lifePlannerStorage.saveHealthRoutines(healthRoutines);
        } catch (e) {
          console.error('Error saving health routines:', e);
        }
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [healthRoutines, healthMounted, healthHasLoaded]);

  // Reload health routines when page becomes visible
  useEffect(() => {
    const reloadRoutines = async () => {
      setHealthLoading(true);
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
        console.error('Error reloading health routines:', e);
      } finally {
        setHealthLoading(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadRoutines();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const toggleHealthRoutineComplete = (id: string) => {
    setHealthRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const completedDates = Array.isArray((r as any).completedDates) ? (r as any).completedDates : [];
        const completedToday = completedDates.includes(selectedDate);
        const nextCompletedDates = completedToday
          ? completedDates.filter((d: string) => d !== selectedDate)
          : [...completedDates, selectedDate];

        return {
          ...r,
          completedDates: nextCompletedDates,
          streak: completedToday ? 0 : ((r as any).streak || 0) + 1,
          updatedAt: new Date().toISOString(),
        } as HealthRoutine;
      })
    );
  };

  // Reload workshop tasks and sadhana when selectedDate changes
  useEffect(() => {
    setSadhanaHasLoaded(false);
    (async () => {
      try {
        const dailyTasks = await lifePlannerStorage.getDailyTasks(selectedDate);
        setWorkshopTasks(dailyTasks?.workshopTasks || []);
        setSadhanaState(dailyTasks?.sadhana || DEFAULT_SADHANA);
      } catch (error) {
        console.error('Error loading daily tasks for date:', selectedDate, error);
        setWorkshopTasks([]);
        setSadhanaState(DEFAULT_SADHANA);
      } finally {
        setSadhanaHasLoaded(true);
      }
    })();
  }, [selectedDate]);

  const persistWorkshopTasks = (updated: WorkshopTask[]) => {
    setWorkshopTasks(updated);
    setTimeout(() => {
      (async () => {
        try {
          await lifePlannerStorage.saveWorkshopTasks(selectedDate, updated);
        } catch (error) {
          console.error('Error saving workshop tasks to MongoDB:', error);
        }
      })();
    }, 500);
  };

  const addWorkshopTask = () => {
    const text = newWorkshopTask.trim();
    if (!text) return;

    setWorkshopError('');

    const task: WorkshopTask = {
      id: Date.now().toString(),
      category: selectedWorkshopCategory,
      text,
      repeat: newTaskRepeat,
      createdDate: selectedDate,
    };

    persistWorkshopTasks([...workshopTasks, task]);
    setNewWorkshopTask('');
    setNewTaskRepeat('none');

    requestAnimationFrame(() => {
      workshopCategoryRefs.current[selectedWorkshopCategory]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const deleteWorkshopTask = (id: string) => {
    persistWorkshopTasks(workshopTasks.filter((t) => t.id !== id));
  };

  const updateWorkshopTask = (id: string, nextText: string) => {
    const text = nextText.trim();
    if (!text) return;
    persistWorkshopTasks(workshopTasks.map((t) => (t.id === id ? { ...t, text } : t)));
  };

  const toggleTaskCompletion = (id: string) => {
    persistWorkshopTasks(
      workshopTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedDate: !t.completed ? selectedDate : undefined,
            }
          : t
      )
    );
  };

  const toggleSadhanaPractice = (section: SadhanaSection, id: string) => {
    setSadhanaState((prev) => ({
      ...prev,
      [section]: prev[section].map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)),
    }));
  };

  const startEditPractice = (section: SadhanaSection, practice: SadhanaPractice) => {
    setEditing({ section, id: practice.id });
    setEditName(practice.name);
    setEditFrequency(practice.frequency);
    setEditDuration(practice.duration);
  };

  const cancelEditPractice = () => {
    setEditing(null);
    setEditName('');
    setEditFrequency('');
    setEditDuration('');
  };

  const saveEditPractice = () => {
    if (!editing) return;
    const name = editName.trim();
    if (!name) return;

    setSadhanaState((prev) => ({
      ...prev,
      [editing.section]: prev[editing.section].map((p) =>
        p.id === editing.id
          ? {
              ...p,
              name,
              frequency: editFrequency.trim(),
              duration: editDuration.trim(),
            }
          : p
      ),
    }));

    cancelEditPractice();
  };

  const deleteSadhanaPractice = (section: SadhanaSection, id: string) => {
    setSadhanaState((prev) => ({
      ...prev,
      [section]: prev[section].filter((p) => p.id !== id),
    }));
  };

  const addSadhanaPractice = (section: SadhanaSection) => {
    const isMorning = section === 'morning';
    const name = (isMorning ? addMorningName : addEveningName).trim();
    const frequency = (isMorning ? addMorningFrequency : addEveningFrequency).trim();
    const duration = (isMorning ? addMorningDuration : addEveningDuration).trim();
    if (!name) return;

    const next: SadhanaPractice = {
      id: `${section}-${Date.now()}`,
      name,
      frequency,
      duration,
      completed: false,
    };

    setSadhanaState((prev) => ({
      ...prev,
      [section]: [next, ...prev[section]],
    }));

    if (isMorning) {
      setAddMorningName('');
      setAddMorningFrequency('');
      setAddMorningDuration('');
    } else {
      setAddEveningName('');
      setAddEveningFrequency('');
      setAddEveningDuration('');
    }
  };

  // Stats for cards
  const completedWorkshopCount = workshopTasks.filter((t) => t.completed).length;
  const completedRoutineCount = healthRoutines.filter((r) =>
    (Array.isArray((r as any).completedDates) ? (r as any).completedDates : []).includes(selectedDate)
  ).length;
  const maxRoutineStreak = Math.max(...healthRoutines.map((r) => (r as any).streak || 0), 0);
  const morningCompletedCount = sadhanaState.morning.filter((p) => p.completed).length;
  const eveningCompletedCount = sadhanaState.evening.filter((p) => p.completed).length;
  const totalSadhanaCount = sadhanaState.morning.length + sadhanaState.evening.length;
  const totalSadhanaCompleted = morningCompletedCount + eveningCompletedCount;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Android Top App Bar with Date Navigator & Card Controls */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-5 shadow-[0_4px_20px_rgba(217,119,6,0.06),0_1px_3px_rgba(0,0,0,0.02)] border border-amber-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/life-planner/dashboard"
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 active:scale-95 transition-all flex items-center justify-center text-amber-900 border border-amber-200/80 shadow-2xs shrink-0"
            title="Back to Launchpad"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight truncate flex items-center gap-2">
              <span className="text-2xl drop-shadow-xs">🌅</span>
              <span>Daily Planner</span>
            </h1>
            <p className="text-xs text-amber-800/80 font-semibold truncate flex items-center gap-1.5 mt-0.5">
              <span>{formatDateDisplay(selectedDate)}</span>
              {isToday && (
                <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                  Today
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Date Navigator & Expand/Collapse Toggle */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          {/* Expand / Collapse All Pill */}
          <button
            type="button"
            onClick={toggleAllCards}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-900 transition flex items-center gap-1.5 active:scale-95 shadow-2xs"
            title={allExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
          >
            <ChevronsUpDown size={14} className="text-amber-700" />
            <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>

          {/* Date Controls */}
          <div className="flex items-center gap-1 bg-amber-50/60 p-1 rounded-2xl border border-amber-200/80">
            <button
              onClick={goPrevDay}
              className="w-8 h-8 rounded-xl bg-white hover:bg-amber-100 active:scale-90 transition flex items-center justify-center text-amber-900 text-base font-black border border-amber-200/60 shadow-2xs"
              title="Previous Day"
            >
              ‹
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(today)}
                className="px-2.5 py-1.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition active:scale-95 shadow-2xs"
              >
                Today
              </button>
            )}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs sm:text-sm font-bold border border-amber-200/80 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <button
              onClick={goNextDay}
              className="w-8 h-8 rounded-xl bg-white hover:bg-amber-100 active:scale-90 transition flex items-center justify-center text-amber-900 text-base font-black border border-amber-200/60 shadow-2xs"
              title="Next Day"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* 3 Expandable Cards in One Unified Cohesive Glossy Amber Theme */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
        
        {/* ======================================================== */}
        {/* CARD 1: DAILY WORKSHOP (EXPANDABLE)                      */}
        {/* ======================================================== */}
        <div
          className={`rounded-2xl border transition-all duration-300 bg-white shadow-[0_4px_20px_rgba(217,119,6,0.06),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden ${
            expandedCards.workshop
              ? 'border-amber-300/90 ring-1 ring-amber-300/40'
              : 'border-amber-200/70 hover:border-amber-300 hover:shadow-md'
          }`}
        >
          {/* Card Header (Click to Expand / Collapse) */}
          <button
            type="button"
            onClick={() => toggleCard('workshop')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left border-b border-amber-200/60 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent hover:from-amber-500/15 transition-all select-none group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Glossy 3D Orb */}
              <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(217,119,6,0.22),inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.08)] bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border border-amber-300/60 shrink-0">
                <div className="absolute top-1 left-1.5 right-1.5 h-3.5 bg-gradient-to-b from-white/70 to-transparent rounded-t-xl pointer-events-none" />
                <span className="text-xl relative z-10 drop-shadow-xs">🏗️</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-amber-900 transition flex items-center gap-1.5">
                  <span>Daily Workshop</span>
                </h2>
                <p className="text-xs text-amber-800/80 font-bold truncate">
                  {workshopTasks.length} tasks • {completedWorkshopCount} completed
                </p>
              </div>
            </div>

            {/* Expand / Collapse Pill */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200/80">
                {expandedCards.workshop ? 'Collapse' : 'Expand'}
              </span>
              <div className="w-7 h-7 rounded-full bg-amber-100/70 group-hover:bg-amber-200 flex items-center justify-center text-amber-900 transition-all">
                {expandedCards.workshop ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </button>

          {/* Collapsed Preview */}
          {!expandedCards.workshop && (
            <div
              onClick={() => toggleCard('workshop')}
              className="p-3.5 bg-gradient-to-b from-amber-50/30 to-white cursor-pointer hover:bg-amber-50/50 transition-colors"
            >
              {workshopTasks.length === 0 ? (
                <p className="text-xs text-amber-800/70 font-medium italic">
                  No tasks added yet. Tap here to expand and add work, study, or family tasks.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {workshopCategories
                      .filter((cat) => workshopTasks.some((t) => t.category === cat.id))
                      .map((cat) => (
                        <span
                          key={cat.id}
                          className="px-2 py-0.5 bg-amber-100/80 text-amber-900 border border-amber-200 rounded-md text-[11px] font-bold"
                        >
                          {cat.label.split(' ')[0]} ({workshopTasks.filter((t) => t.category === cat.id).length})
                        </span>
                      ))}
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 text-amber-800">
                    <Sparkles size={12} className="text-amber-600" />
                    Tap to expand full task manager & repeat settings ↓
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Expanded Content */}
          {expandedCards.workshop && (
            <div className="p-3.5 sm:p-4 space-y-3.5">
              {/* Add Task Form */}
              <div className="space-y-2 bg-gradient-to-br from-amber-50/40 via-orange-50/20 to-white p-3 rounded-2xl border border-amber-200/70">
                {/* Category Dropdown */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-amber-900 mb-1">
                    Select Life Category
                  </label>
                  <select
                    value={selectedWorkshopCategory}
                    onChange={(e) => {
                      setWorkshopError('');
                      setSelectedWorkshopCategory(e.target.value as WorkshopCategory);
                    }}
                    onFocus={() => ensureExpanded('workshop')}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200/80 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 shadow-2xs"
                  >
                    {workshopCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Input & Add Button */}
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={newWorkshopTask}
                    onChange={(e) => {
                      setWorkshopError('');
                      setNewWorkshopTask(e.target.value);
                    }}
                    onFocus={() => ensureExpanded('workshop')}
                    onKeyDown={(e) => e.key === 'Enter' && addWorkshopTask()}
                    placeholder="Add your daily work or task..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-white text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 shadow-2xs"
                  />
                  <button
                    onClick={addWorkshopTask}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl transition-all active:scale-95 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(217,119,6,0.28)] shrink-0"
                    title="Add Task"
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </div>

                {workshopError && <p className="text-xs text-red-600 font-semibold">{workshopError}</p>}

                {/* Repeat Frequency Pills (Unified Amber Theme) */}
                <div className="pt-1 flex items-center flex-wrap gap-1.5">
                  <span className="text-[11px] font-bold text-amber-900 mr-1">Repeat:</span>
                  {(['none', 'daily', 'weekly', 'monthly'] as TaskRepeat[]).map((repeat) => {
                    const active = newTaskRepeat === repeat;
                    return (
                      <button
                        key={repeat}
                        type="button"
                        onClick={() => setNewTaskRepeat(repeat)}
                        className={`px-2.5 py-1 text-xs font-black rounded-xl transition-all active:scale-95 ${
                          active
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                            : 'bg-amber-100/60 hover:bg-amber-100 text-amber-900 border border-amber-200/60'
                        }`}
                      >
                        {repeat === 'none' ? 'Once' : repeat.charAt(0).toUpperCase() + repeat.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Summary Chips */}
              {workshopTasks.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {workshopCategories
                    .filter((cat) => workshopTasks.some((t) => t.category === cat.id))
                    .map((cat) => (
                      <span
                        key={cat.id}
                        className="px-2.5 py-0.5 bg-amber-100/90 text-amber-950 border border-amber-300/80 rounded-full text-xs font-black whitespace-nowrap shadow-2xs"
                      >
                        {cat.label.split(' ')[0]} ({workshopTasks.filter((t) => t.category === cat.id).length})
                      </span>
                    ))}
                </div>
              )}

              {/* Category Sections & Task List */}
              <div className="space-y-3 pt-1 max-h-[380px] overflow-y-auto pr-1">
                {workshopTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No tasks added yet for this date.</p>
                ) : (
                  workshopCategories.map((cat) => {
                    const catTasks = workshopTasks.filter((t) => t.category === cat.id);
                    if (catTasks.length === 0) return null;
                    return (
                      <div
                        key={cat.id}
                        ref={(el) => {
                          workshopCategoryRefs.current[cat.id] = el;
                        }}
                        className="border-l-3 border-amber-500 pl-3 py-0.5"
                      >
                        <h3 className="text-xs font-black text-amber-950 mb-1.5 flex items-center justify-between">
                          <span>{cat.label}</span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-md font-bold">
                            {catTasks.length}
                          </span>
                        </h3>
                        <ul className="space-y-1.5">
                          {catTasks.map((task) => (
                            <li
                              key={task.id}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                task.completed
                                  ? 'bg-amber-50/40 border-amber-200/60 opacity-80'
                                  : 'bg-white border-amber-200/80 hover:border-amber-300 shadow-2xs'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={task.completed || false}
                                onChange={() => toggleTaskCompletion(task.id)}
                                className="w-4 h-4 text-amber-600 rounded cursor-pointer accent-amber-600 shrink-0"
                                title="Mark as complete"
                              />
                              <div className="flex-grow flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`text-xs sm:text-sm flex-grow text-slate-800 outline-none rounded px-1 -mx-1 focus:bg-amber-50 transition truncate ${
                                    task.completed ? 'line-through text-slate-400' : 'font-semibold'
                                  }`}
                                  contentEditable={!task.completed}
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
                                {task.repeat && task.repeat !== 'none' && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded-md whitespace-nowrap font-bold shrink-0">
                                    🔄 {task.repeat}
                                  </span>
                                )}
                                {task.completed && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-200/90 text-amber-950 rounded-md whitespace-nowrap font-black shrink-0">
                                    ✓ Done
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => deleteWorkshopTask(task.id)}
                                className="p-1 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700 transition shrink-0"
                                title="Delete task"
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CARD 2: MY ROUTINE (EXPANDABLE)                          */}
        {/* ======================================================== */}
        <div
          className={`rounded-2xl border transition-all duration-300 bg-white shadow-[0_4px_20px_rgba(217,119,6,0.06),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden ${
            expandedCards.routine
              ? 'border-amber-300/90 ring-1 ring-amber-300/40'
              : 'border-amber-200/70 hover:border-amber-300 hover:shadow-md'
          }`}
        >
          {/* Card Header (Click to Expand / Collapse) */}
          <button
            type="button"
            onClick={() => toggleCard('routine')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left border-b border-amber-200/60 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent hover:from-amber-500/15 transition-all select-none group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Glossy 3D Orb */}
              <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(217,119,6,0.22),inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.08)] bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border border-amber-300/60 shrink-0">
                <div className="absolute top-1 left-1.5 right-1.5 h-3.5 bg-gradient-to-b from-white/70 to-transparent rounded-t-xl pointer-events-none" />
                <span className="text-xl relative z-10 drop-shadow-xs">🏃</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-amber-900 transition flex items-center gap-1.5">
                  <span>My Routine</span>
                </h2>
                <p className="text-xs text-amber-800/80 font-bold truncate">
                  {healthRoutines.length} routines • {completedRoutineCount} done • 🔥 {maxRoutineStreak} streak
                </p>
              </div>
            </div>

            {/* Expand / Collapse Pill */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200/80">
                {expandedCards.routine ? 'Collapse' : 'Expand'}
              </span>
              <div className="w-7 h-7 rounded-full bg-amber-100/70 group-hover:bg-amber-200 flex items-center justify-center text-amber-900 transition-all">
                {expandedCards.routine ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </button>

          {/* Collapsed Preview */}
          {!expandedCards.routine && (
            <div
              onClick={() => toggleCard('routine')}
              className="p-3.5 bg-gradient-to-b from-amber-50/30 to-white cursor-pointer hover:bg-amber-50/50 transition-colors space-y-2"
            >
              {healthRoutines.length === 0 ? (
                <p className="text-xs text-amber-800/70 font-medium italic">
                  No routines yet. Tap here to expand and add health routines.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>
                      Progress: {completedRoutineCount} of {healthRoutines.length} done
                    </span>
                    <span className="text-amber-700">
                      {Math.round((completedRoutineCount / healthRoutines.length) * 100)}%
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden border border-amber-200/60">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((completedRoutineCount / healthRoutines.length) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-600" />
                    Tap to expand checklist & streak status ↓
                  </p>
                </>
              )}
            </div>
          )}

          {/* Expanded Content */}
          {expandedCards.routine && (
            <div className="p-3.5 sm:p-4 space-y-3.5">
              {/* Compact Unified Stats Bar */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-white border border-amber-200/80 text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1 text-slate-700">
                  📋 {healthRoutines.length} routines
                </span>
                <span className="flex items-center gap-1 text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-lg border border-amber-300/60">
                  ✅ {completedRoutineCount} done
                </span>
                <span className="flex items-center gap-1 text-orange-700">
                  🔥 {maxRoutineStreak} streak
                </span>
              </div>

              {/* Add Routine Header Link */}
              <div className="flex items-center justify-between pt-0.5">
                <p className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Daily Habit Checklist
                </p>
                <Link
                  href="/life-planner/dashboard/health"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition text-xs font-black shadow-xs active:scale-95"
                  title="Manage Health Habits"
                >
                  <Plus size={14} />
                  <span>Add Habit</span>
                </Link>
              </div>

              {healthError && <div className="text-xs text-red-600 font-bold">{healthError}</div>}

              {/* Health Routines Checklist */}
              {healthLoading ? (
                <p className="text-xs text-amber-800/70 italic py-3 text-center">Loading health routines...</p>
              ) : healthRoutines.length === 0 ? (
                <div className="text-center py-5 px-3 bg-amber-50/40 rounded-2xl border border-dashed border-amber-200">
                  <p className="text-xs text-amber-900 font-medium">No health routines configured yet.</p>
                  <Link
                    href="/life-planner/dashboard/health"
                    className="inline-block mt-2 text-xs font-bold text-amber-600 hover:text-amber-700 underline"
                  >
                    Add routines in Health page →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {healthRoutines.map((r) => {
                    const completedToday = (
                      Array.isArray((r as any).completedDates) ? (r as any).completedDates : []
                    ).includes(selectedDate);
                    const category = ((r as any).category || (r as any).type || 'other') as string;
                    const categoryEmoji: Record<string, string> = {
                      exercise: '💪',
                      meditation: '🧘',
                      nutrition: '🥗',
                      sleep: '😴',
                      other: '✨',
                    };

                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleHealthRoutineComplete(r.id)}
                        className={`rounded-xl p-2.5 border transition-all cursor-pointer flex items-center gap-2.5 ${
                          completedToday
                            ? 'bg-amber-50/60 border-amber-200/90'
                            : 'bg-white border-amber-200/80 hover:border-amber-300 shadow-2xs'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHealthRoutineComplete(r.id);
                          }}
                          className={`flex-shrink-0 transition-transform active:scale-90 ${
                            completedToday ? 'text-amber-600' : 'text-amber-300 hover:text-amber-500'
                          }`}
                          title={completedToday ? 'Mark as not done' : 'Mark as done'}
                        >
                          {completedToday ? (
                            <CheckCircle2 className="h-5 w-5 fill-amber-500 text-white" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs sm:text-sm font-bold truncate ${
                              completedToday ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {categoryEmoji[category] || '✨'} {r.title}
                          </p>
                          {(r as any).duration && (
                            <p className="text-[11px] text-amber-800/80 font-medium flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> {(r as any).duration}
                            </p>
                          )}
                        </div>
                        {(r as any).repeat && (r as any).repeat !== 'once' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded-md whitespace-nowrap font-bold shrink-0">
                            🔄 {((r as any).repeat || 'daily')}
                          </span>
                        )}
                        {completedToday && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-950 rounded-md whitespace-nowrap font-black shrink-0">
                            ✓ Done
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CARD 3: MY SADHANA (EXPANDABLE)                          */}
        {/* ======================================================== */}
        <div
          className={`rounded-2xl border transition-all duration-300 bg-white shadow-[0_4px_20px_rgba(217,119,6,0.06),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden ${
            expandedCards.sadhana
              ? 'border-amber-300/90 ring-1 ring-amber-300/40'
              : 'border-amber-200/70 hover:border-amber-300 hover:shadow-md'
          }`}
        >
          {/* Card Header (Click to Expand / Collapse) */}
          <button
            type="button"
            onClick={() => toggleCard('sadhana')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left border-b border-amber-200/60 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent hover:from-amber-500/15 transition-all select-none group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Glossy 3D Orb */}
              <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(217,119,6,0.22),inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.08)] bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border border-amber-300/60 shrink-0">
                <div className="absolute top-1 left-1.5 right-1.5 h-3.5 bg-gradient-to-b from-white/70 to-transparent rounded-t-xl pointer-events-none" />
                <span className="text-xl relative z-10 drop-shadow-xs">🧘</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-amber-900 transition flex items-center gap-1.5">
                  <span>My Sadhana</span>
                </h2>
                <p className="text-xs text-amber-800/80 font-bold truncate">
                  {sadhanaState.morning.length} morning • {sadhanaState.evening.length} evening • {totalSadhanaCompleted} done
                </p>
              </div>
            </div>

            {/* Expand / Collapse Pill */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200/80">
                {expandedCards.sadhana ? 'Collapse' : 'Expand'}
              </span>
              <div className="w-7 h-7 rounded-full bg-amber-100/70 group-hover:bg-amber-200 flex items-center justify-center text-amber-900 transition-all">
                {expandedCards.sadhana ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </button>

          {/* Collapsed Preview */}
          {!expandedCards.sadhana && (
            <div
              onClick={() => toggleCard('sadhana')}
              className="p-3.5 bg-gradient-to-b from-amber-50/30 to-white cursor-pointer hover:bg-amber-50/50 transition-colors space-y-2"
            >
              {totalSadhanaCount === 0 ? (
                <p className="text-xs text-amber-800/70 font-medium italic">
                  No sadhana practices added. Tap here to expand and add morning/evening practices.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>
                      Sadhana: {totalSadhanaCompleted} of {totalSadhanaCount} completed
                    </span>
                    <span className="text-amber-700">
                      {Math.round((totalSadhanaCompleted / totalSadhanaCount) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden border border-amber-200/60">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((totalSadhanaCompleted / totalSadhanaCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-600" />
                    Tap to expand morning & evening sadhana ↓
                  </p>
                </>
              )}
            </div>
          )}

          {/* Expanded Content */}
          {expandedCards.sadhana && (
            <div className="p-3.5 sm:p-4 space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {/* ================= MORNING SADHANA ================= */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <span>☀️</span>
                    <span>Morning Sadhana</span>
                  </h3>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    {morningCompletedCount}/{sadhanaState.morning.length} done
                  </span>
                </div>

                {/* Add Morning Practice Form (Unified Amber Theme - Replaced Purple!) */}
                <div className="grid gap-2 sm:grid-cols-2 p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/70">
                  <input
                    value={addMorningName}
                    onChange={(e) => setAddMorningName(e.target.value)}
                    onFocus={() => ensureExpanded('sadhana')}
                    placeholder="Practice title (e.g., Pranayama)"
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 sm:col-span-2 shadow-2xs"
                  />
                  <input
                    value={addMorningFrequency}
                    onChange={(e) => setAddMorningFrequency(e.target.value)}
                    onFocus={() => ensureExpanded('sadhana')}
                    placeholder="e.g. 2 times"
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-2xs"
                  />
                  <input
                    value={addMorningDuration}
                    onChange={(e) => setAddMorningDuration(e.target.value)}
                    onFocus={() => ensureExpanded('sadhana')}
                    placeholder="e.g. 5 minutes"
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => addSadhanaPractice('morning')}
                    className="w-full sm:col-span-2 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-xl transition-all active:scale-95 text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(217,119,6,0.25)]"
                    title="Add Morning Practice"
                  >
                    <Plus size={15} />
                    <span>Add Morning Practice</span>
                  </button>
                </div>

                {/* Morning Practices List */}
                {sadhanaState.morning.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">No morning sadhana added yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sadhanaState.morning.map((p) => {
                      const isEditing = editing?.section === 'morning' && editing?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all ${
                            p.completed
                              ? 'bg-amber-50/50 border-amber-200/70'
                              : 'bg-white border-amber-200/70 hover:border-amber-300 shadow-2xs'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSadhanaPractice('morning', p.id)}
                            className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                              p.completed
                                ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-600 text-white shadow-2xs'
                                : 'border-amber-300 hover:border-amber-500 bg-white'
                            }`}
                            title={p.completed ? 'Mark not done' : 'Mark done'}
                          >
                            {p.completed && <Check size={12} className="text-white stroke-[3]" />}
                          </button>

                          <div className="flex-grow min-w-0">
                            {isEditing ? (
                              <div className="grid gap-1.5 sm:grid-cols-[1fr_100px_100px]">
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-medium"
                                />
                                <input
                                  value={editFrequency}
                                  onChange={(e) => setEditFrequency(e.target.value)}
                                  className="w-full px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-medium"
                                />
                                <input
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(e.target.value)}
                                  className="w-full px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-medium"
                                />
                              </div>
                            ) : (
                              <>
                                <p
                                  className={`text-xs sm:text-sm font-bold truncate ${
                                    p.completed ? 'line-through text-slate-400' : 'text-slate-800'
                                  }`}
                                >
                                  {p.name}
                                </p>
                                <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">
                                  {(p.frequency || '—')} • {(p.duration || '—')}
                                </p>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEditPractice}
                                  className="p-1 rounded-lg hover:bg-amber-100 text-amber-800"
                                  title="Save"
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditPractice}
                                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                                  title="Cancel"
                                >
                                  <span className="text-xs font-bold">✕</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditPractice('morning', p)}
                                  className="p-1 rounded-lg hover:bg-amber-100 text-amber-800 transition"
                                  title="Edit"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSadhanaPractice('morning', p.id)}
                                  className="p-1 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ================= EVENING SADHANA ================= */}
              <div className="space-y-2.5 pt-2 border-t border-amber-200/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <span>🌙</span>
                    <span>Evening Sadhana</span>
                  </h3>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    {eveningCompletedCount}/{sadhanaState.evening.length} done
                  </span>
                </div>

                {/* Add Evening Practice Form (Unified Amber Theme - Replaced Purple!) */}
                <div className="grid gap-2 sm:grid-cols-2 p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/70">
                  <input
                    value={addEveningName}
                    onChange={(e) => setAddEveningName(e.target.value)}
                    onFocus={() => ensureExpanded('sadhana')}
                    placeholder="Practice title (e.g., Meditation)"
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 sm:col-span-2 shadow-2xs"
                  />
                  <input
                    value={addEveningFrequency}
                    onChange={(e) => setAddEveningFrequency(e.target.value)}
                    onFocus={() => ensureExpanded('sadhana')}
                    placeholder="e.g. 1 time"
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-2xs"
                  />
                  <input
                    value={addEveningDuration}
                    onChange={(e) => setAddEveningDuration(e.target.value)}
                    onFocus={() => ensureExpanded('sadhana')}
                    placeholder="e.g. 10 minutes"
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => addSadhanaPractice('evening')}
                    className="w-full sm:col-span-2 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-xl transition-all active:scale-95 text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(217,119,6,0.25)]"
                    title="Add Evening Practice"
                  >
                    <Plus size={15} />
                    <span>Add Evening Practice</span>
                  </button>
                </div>

                {/* Evening Practices List */}
                {sadhanaState.evening.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">No evening sadhana added yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sadhanaState.evening.map((p) => {
                      const isEditing = editing?.section === 'evening' && editing?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all ${
                            p.completed
                              ? 'bg-amber-50/50 border-amber-200/70'
                              : 'bg-white border-amber-200/70 hover:border-amber-300 shadow-2xs'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSadhanaPractice('evening', p.id)}
                            className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                              p.completed
                                ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-600 text-white shadow-2xs'
                                : 'border-amber-300 hover:border-amber-500 bg-white'
                            }`}
                            title={p.completed ? 'Mark not done' : 'Mark done'}
                          >
                            {p.completed && <Check size={12} className="text-white stroke-[3]" />}
                          </button>

                          <div className="flex-grow min-w-0">
                            {isEditing ? (
                              <div className="grid gap-1.5 sm:grid-cols-[1fr_100px_100px]">
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-medium"
                                />
                                <input
                                  value={editFrequency}
                                  onChange={(e) => setEditFrequency(e.target.value)}
                                  className="w-full px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-medium"
                                />
                                <input
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(e.target.value)}
                                  className="w-full px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-medium"
                                />
                              </div>
                            ) : (
                              <>
                                <p
                                  className={`text-xs sm:text-sm font-bold truncate ${
                                    p.completed ? 'line-through text-slate-400' : 'text-slate-800'
                                  }`}
                                >
                                  {p.name}
                                </p>
                                <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">
                                  {(p.frequency || '—')} • {(p.duration || '—')}
                                </p>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEditPractice}
                                  className="p-1 rounded-lg hover:bg-amber-100 text-amber-800"
                                  title="Save"
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditPractice}
                                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                                  title="Cancel"
                                >
                                  <span className="text-xs font-bold">✕</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditPractice('evening', p)}
                                  className="p-1 rounded-lg hover:bg-amber-100 text-amber-800 transition"
                                  title="Edit"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSadhanaPractice('evening', p.id)}
                                  className="p-1 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
