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

type CardKey = 'workshop' | 'routine' | 'morning' | 'evening';

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

  // 4 Distinct Cards: workshop, routine, morning sadhana, evening sadhana
  // Initially false so all 4 fit on one mobile screen, expanding when clicked
  const [expandedCards, setExpandedCards] = useState<Record<CardKey, boolean>>({
    workshop: false,
    routine: false,
    morning: false,
    evening: false,
  });

  const toggleCard = (card: CardKey) => {
    setExpandedCards((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  const allExpanded =
    expandedCards.workshop && expandedCards.routine && expandedCards.morning && expandedCards.evening;

  const toggleAllCards = () => {
    if (allExpanded) {
      setExpandedCards({ workshop: false, routine: false, morning: false, evening: false });
    } else {
      setExpandedCards({ workshop: true, routine: true, morning: true, evening: true });
    }
  };

  const ensureExpanded = (card: CardKey) => {
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

  // Stats for the 4 cards
  const completedWorkshopCount = workshopTasks.filter((t) => t.completed).length;
  const completedRoutineCount = healthRoutines.filter((r) =>
    (Array.isArray((r as any).completedDates) ? (r as any).completedDates : []).includes(selectedDate)
  ).length;
  const maxRoutineStreak = Math.max(...healthRoutines.map((r) => (r as any).streak || 0), 0);
  const morningCompletedCount = sadhanaState.morning.filter((p) => p.completed).length;
  const eveningCompletedCount = sadhanaState.evening.filter((p) => p.completed).length;

  return (
    <div className="space-y-3 sm:space-y-5 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top App Bar with Date Navigator & Global Toggle */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/life-planner/dashboard"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center text-slate-700 border border-slate-200 shadow-2xs shrink-0"
            title="Back to Launchpad"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight truncate flex items-center gap-2">
              <span className="text-xl">🌅</span>
              <span>Daily Planner</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold truncate flex items-center gap-1.5">
              <span>{formatDateDisplay(selectedDate)}</span>
              {isToday && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
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
            className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1 active:scale-95 shadow-2xs"
            title={allExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
          >
            <ChevronsUpDown size={13} className="text-slate-500" />
            <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>

          {/* Date Controls */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={goPrevDay}
              className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 active:scale-90 transition flex items-center justify-center text-slate-700 text-sm font-black border border-slate-200/80 shadow-2xs"
              title="Previous Day"
            >
              ‹
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(today)}
                className="px-2 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition active:scale-95 shadow-2xs"
              >
                Today
              </button>
            )}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-0.5 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <button
              onClick={goNextDay}
              className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 active:scale-90 transition flex items-center justify-center text-slate-700 text-sm font-black border border-slate-200/80 shadow-2xs"
              title="Next Day"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* 4 DISTINCT COLORFUL CARDS (Compact preview so all 4 fit on 1 mobile screen) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-start">
        
        {/* ======================================================== */}
        {/* CARD 1: DAILY WORKSHOP (VIBRANT SKY / BLUE THEME)        */}
        {/* ======================================================== */}
        <div
          className={`rounded-2xl border transition-all duration-300 bg-white shadow-[0_4px_16px_rgba(2,132,199,0.06),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden ${
            expandedCards.workshop
              ? 'border-sky-400 ring-2 ring-sky-400/20 shadow-md'
              : 'border-sky-200 hover:border-sky-300 hover:shadow-sm'
          }`}
        >
          {/* Card Header (Compact Preview) */}
          <button
            type="button"
            onClick={() => toggleCard('workshop')}
            className="w-full px-3.5 py-3 flex items-center justify-between text-left border-b border-sky-100 bg-gradient-to-r from-sky-500/15 via-blue-500/8 to-transparent hover:from-sky-500/20 transition-all select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* 3D Glossy Sky Blue Orb */}
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_3px_10px_rgba(2,132,199,0.3),inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(0,0,0,0.1)] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 border border-sky-300/70 shrink-0">
                <div className="absolute top-0.5 left-1 right-1 h-3 bg-gradient-to-b from-white/70 to-transparent rounded-t-lg pointer-events-none" />
                <span className="text-base relative z-10 drop-shadow-xs">🏗️</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight group-hover:text-sky-700 transition flex items-center gap-1">
                  <span>Daily Workshop</span>
                </h2>
                <p className="text-[11px] text-sky-800 font-bold truncate">
                  {workshopTasks.length} tasks • {completedWorkshopCount} done
                </p>
              </div>
            </div>

            {/* Expand / Collapse Pill */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-black text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                {expandedCards.workshop ? 'Close' : 'Open'}
              </span>
              <div className="w-6 h-6 rounded-full bg-sky-100 group-hover:bg-sky-200 flex items-center justify-center text-sky-800 transition-all">
                {expandedCards.workshop ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>
          </button>

          {/* Expanded Content */}
          {expandedCards.workshop && (
            <div className="p-3 sm:p-3.5 space-y-3 bg-gradient-to-b from-sky-50/20 to-white">
              {/* Add Task Form (Sky Blue Theme) */}
              <div className="space-y-2 bg-sky-50/50 p-2.5 rounded-xl border border-sky-200">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-sky-900 mb-1">
                    Life Category
                  </label>
                  <select
                    value={selectedWorkshopCategory}
                    onChange={(e) => {
                      setWorkshopError('');
                      setSelectedWorkshopCategory(e.target.value as WorkshopCategory);
                    }}
                    onFocus={() => ensureExpanded('workshop')}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-sky-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400"
                  >
                    {workshopCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={newWorkshopTask}
                    onChange={(e) => {
                      setWorkshopError('');
                      setNewWorkshopTask(e.target.value);
                    }}
                    onFocus={() => ensureExpanded('workshop')}
                    onKeyDown={(e) => e.key === 'Enter' && addWorkshopTask()}
                    placeholder="Add daily task..."
                    className="w-full px-3 py-2 rounded-lg border border-sky-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400"
                  />
                  <button
                    onClick={addWorkshopTask}
                    className="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white px-3 py-2 rounded-lg transition-all active:scale-95 text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_3px_10px_rgba(2,132,199,0.3)]"
                    title="Add Task"
                  >
                    <Plus size={15} />
                    <span>Add Task</span>
                  </button>
                </div>

                {workshopError && <p className="text-xs text-red-600 font-semibold">{workshopError}</p>}

                {/* Repeat Pills (Sky Blue) */}
                <div className="pt-0.5 flex items-center flex-wrap gap-1">
                  <span className="text-[10px] font-bold text-sky-900 mr-1">Repeat:</span>
                  {(['none', 'daily', 'weekly', 'monthly'] as TaskRepeat[]).map((repeat) => {
                    const active = newTaskRepeat === repeat;
                    return (
                      <button
                        key={repeat}
                        type="button"
                        onClick={() => setNewTaskRepeat(repeat)}
                        className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all active:scale-95 ${
                          active
                            ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs'
                            : 'bg-sky-100/70 hover:bg-sky-100 text-sky-900 border border-sky-200'
                        }`}
                      >
                        {repeat === 'none' ? 'Once' : repeat.charAt(0).toUpperCase() + repeat.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Task List */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {workshopTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">No tasks added yet.</p>
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
                        className="border-l-2 border-sky-500 pl-2.5 py-0.5"
                      >
                        <h3 className="text-[11px] font-black text-sky-950 mb-1 flex items-center justify-between">
                          <span>{cat.label}</span>
                          <span className="text-[9px] bg-sky-100 text-sky-900 px-1 py-0.1 rounded font-bold">
                            {catTasks.length}
                          </span>
                        </h3>
                        <ul className="space-y-1">
                          {catTasks.map((task) => (
                            <li
                              key={task.id}
                              className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all ${
                                task.completed
                                  ? 'bg-sky-50/40 border-sky-200/60 opacity-80'
                                  : 'bg-white border-sky-200/80 hover:border-sky-300 shadow-2xs'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={task.completed || false}
                                onChange={() => toggleTaskCompletion(task.id)}
                                className="w-4 h-4 text-sky-600 rounded cursor-pointer accent-sky-600 shrink-0"
                                title="Mark as complete"
                              />
                              <div className="flex-grow flex items-center gap-1 min-w-0">
                                <span
                                  className={`text-xs flex-grow text-slate-800 outline-none rounded px-1 -mx-1 truncate ${
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
                                  <span className="text-[9px] px-1 py-0.2 bg-sky-100 text-sky-900 rounded font-bold shrink-0">
                                    🔄 {task.repeat}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => deleteWorkshopTask(task.id)}
                                className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition shrink-0"
                                title="Delete task"
                              >
                                <Trash2 size={13} />
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
        {/* CARD 2: MY ROUTINE (LUSH EMERALD / GREEN THEME)          */}
        {/* ======================================================== */}
        <div
          className={`rounded-2xl border transition-all duration-300 bg-white shadow-[0_4px_16px_rgba(5,150,105,0.06),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden ${
            expandedCards.routine
              ? 'border-emerald-400 ring-2 ring-emerald-400/20 shadow-md'
              : 'border-emerald-200 hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          {/* Card Header (Compact Preview) */}
          <button
            type="button"
            onClick={() => toggleCard('routine')}
            className="w-full px-3.5 py-3 flex items-center justify-between text-left border-b border-emerald-100 bg-gradient-to-r from-emerald-500/15 via-teal-500/8 to-transparent hover:from-emerald-500/20 transition-all select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* 3D Glossy Emerald Orb */}
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_3px_10px_rgba(5,150,105,0.3),inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(0,0,0,0.1)] bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 border border-emerald-300/70 shrink-0">
                <div className="absolute top-0.5 left-1 right-1 h-3 bg-gradient-to-b from-white/70 to-transparent rounded-t-lg pointer-events-none" />
                <span className="text-base relative z-10 drop-shadow-xs">🏃</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition flex items-center gap-1">
                  <span>My Routine</span>
                </h2>
                <p className="text-[11px] text-emerald-800 font-bold truncate">
                  {healthRoutines.length} habits • {completedRoutineCount} done • 🔥{maxRoutineStreak}
                </p>
              </div>
            </div>

            {/* Expand / Collapse Pill */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                {expandedCards.routine ? 'Close' : 'Open'}
              </span>
              <div className="w-6 h-6 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center text-emerald-800 transition-all">
                {expandedCards.routine ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>
          </button>

          {/* Expanded Content */}
          {expandedCards.routine && (
            <div className="p-3 sm:p-3.5 space-y-3 bg-gradient-to-b from-emerald-50/20 to-white">
              {/* Compact Stats Bar (Emerald Theme) */}
              <div className="flex items-center justify-between gap-1 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-slate-800">
                <span className="text-slate-700 text-[11px]">📋 {healthRoutines.length}</span>
                <span className="text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 text-[11px]">
                  ✅ {completedRoutineCount} done
                </span>
                <span className="text-teal-700 text-[11px]">🔥 {maxRoutineStreak} streak</span>
              </div>

              {/* Add Routine Link */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-950">
                  Daily Habit Checklist
                </p>
                <Link
                  href="/life-planner/dashboard/health"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg transition text-[11px] font-black shadow-xs active:scale-95"
                  title="Manage Health Habits"
                >
                  <Plus size={13} />
                  <span>Add Habit</span>
                </Link>
              </div>

              {healthError && <div className="text-xs text-red-600 font-bold">{healthError}</div>}

              {/* Checklist */}
              {healthLoading ? (
                <p className="text-xs text-emerald-800/70 italic py-2 text-center">Loading routines...</p>
              ) : healthRoutines.length === 0 ? (
                <div className="text-center py-4 px-2 bg-emerald-50/40 rounded-xl border border-dashed border-emerald-200">
                  <p className="text-xs text-emerald-900 font-medium">No habits yet.</p>
                  <Link
                    href="/life-planner/dashboard/health"
                    className="inline-block mt-1 text-[11px] font-bold text-emerald-600 hover:underline"
                  >
                    Add habits in Health page →
                  </Link>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
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
                        className={`rounded-xl p-2 border transition-all cursor-pointer flex items-center gap-2 ${
                          completedToday
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-white border-emerald-200/80 hover:border-emerald-300 shadow-2xs'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHealthRoutineComplete(r.id);
                          }}
                          className={`flex-shrink-0 transition-transform active:scale-90 ${
                            completedToday ? 'text-emerald-600' : 'text-emerald-300 hover:text-emerald-500'
                          }`}
                          title={completedToday ? 'Mark as not done' : 'Mark as done'}
                        >
                          {completedToday ? (
                            <CheckCircle2 className="h-4 w-4 fill-emerald-500 text-white" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              completedToday ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {categoryEmoji[category] || '✨'} {r.title}
                          </p>
                          {(r as any).duration && (
                            <p className="text-[10px] text-emerald-800/80 font-medium flex items-center gap-1 mt-0.5">
                              <Clock size={10} /> {(r as any).duration}
                            </p>
                          )}
                        </div>
                        {(r as any).repeat && (r as any).repeat !== 'once' && (
                          <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-900 rounded font-bold shrink-0">
                            🔄 {((r as any).repeat || 'daily')}
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
        {/* CARD 3: MORNING SADHANA (SUNRISE GOLD / ORANGE THEME)    */}
        {/* ======================================================== */}
        <div
          className={`rounded-2xl border transition-all duration-300 bg-white shadow-[0_4px_16px_rgba(217,119,6,0.06),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden ${
            expandedCards.morning
              ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md'
              : 'border-amber-200 hover:border-amber-300 hover:shadow-sm'
          }`}
        >
          {/* Card Header (Compact Preview) */}
          <button
            type="button"
            onClick={() => toggleCard('morning')}
            className="w-full px-3.5 py-3 flex items-center justify-between text-left border-b border-amber-100 bg-gradient-to-r from-amber-500/15 via-orange-500/8 to-transparent hover:from-amber-500/20 transition-all select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* 3D Glossy Sunrise Orb */}
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_3px_10px_rgba(217,119,6,0.3),inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(0,0,0,0.1)] bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border border-amber-300/70 shrink-0">
                <div className="absolute top-0.5 left-1 right-1 h-3 bg-gradient-to-b from-white/70 to-transparent rounded-t-lg pointer-events-none" />
                <span className="text-base relative z-10 drop-shadow-xs">☀️</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight group-hover:text-amber-700 transition flex items-center gap-1">
                  <span>Morning Sadhana</span>
                </h2>
                <p className="text-[11px] text-amber-800 font-bold truncate">
                  {sadhanaState.morning.length} practices • {morningCompletedCount} done
                </p>
              </div>
            </div>

            {/* Expand / Collapse Pill */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                {expandedCards.morning ? 'Close' : 'Open'}
              </span>
              <div className="w-6 h-6 rounded-full bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center text-amber-800 transition-all">
                {expandedCards.morning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>
          </button>

          {/* Expanded Content */}
          {expandedCards.morning && (
            <div className="p-3 sm:p-3.5 space-y-3 bg-gradient-to-b from-amber-50/20 to-white">
              {/* Add Morning Practice Form (Sunrise Amber Theme) */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-amber-50/50 border border-amber-200">
                <input
                  value={addMorningName}
                  onChange={(e) => setAddMorningName(e.target.value)}
                  onFocus={() => ensureExpanded('morning')}
                  placeholder="Practice (e.g., Pranayama)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={addMorningFrequency}
                    onChange={(e) => setAddMorningFrequency(e.target.value)}
                    onFocus={() => ensureExpanded('morning')}
                    placeholder="e.g. 2 times"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <input
                    value={addMorningDuration}
                    onChange={(e) => setAddMorningDuration(e.target.value)}
                    onFocus={() => ensureExpanded('morning')}
                    placeholder="e.g. 5 min"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addSadhanaPractice('morning')}
                  className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3 py-2 rounded-lg transition-all active:scale-95 text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_3px_10px_rgba(217,119,6,0.3)]"
                  title="Add Morning Practice"
                >
                  <Plus size={15} />
                  <span>Add Morning Practice</span>
                </button>
              </div>

              {/* Practices List */}
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {sadhanaState.morning.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">No morning practices added yet.</p>
                ) : (
                  sadhanaState.morning.map((p) => {
                    const isEditing = editing?.section === 'morning' && editing?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-start gap-2 p-2 rounded-xl border transition-all ${
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
                            <div className="space-y-1">
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 rounded border border-amber-200 text-xs font-medium"
                              />
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  value={editFrequency}
                                  onChange={(e) => setEditFrequency(e.target.value)}
                                  className="w-full px-2 py-0.5 rounded border border-amber-200 text-xs"
                                />
                                <input
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(e.target.value)}
                                  className="w-full px-2 py-0.5 rounded border border-amber-200 text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <p
                                className={`text-xs font-bold truncate ${
                                  p.completed ? 'line-through text-slate-400' : 'text-slate-800'
                                }`}
                              >
                                {p.name}
                              </p>
                              <p className="text-[10px] text-amber-800 font-medium mt-0.2">
                                {(p.frequency || '—')} • {(p.duration || '—')}
                              </p>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={saveEditPractice}
                                className="p-1 rounded hover:bg-amber-100 text-amber-800"
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditPractice}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500"
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
                                className="p-1 rounded hover:bg-amber-100 text-amber-800 transition"
                                title="Edit"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSadhanaPractice('morning', p.id)}
                                className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CARD 4: EVENING SADHANA (ROYAL PURPLE / INDIGO THEME)    */}
        {/* ======================================================== */}
        <div
          className={`rounded-2xl border transition-all duration-300 bg-white shadow-[0_4px_16px_rgba(147,51,234,0.06),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden ${
            expandedCards.evening
              ? 'border-purple-400 ring-2 ring-purple-400/20 shadow-md'
              : 'border-purple-200 hover:border-purple-300 hover:shadow-sm'
          }`}
        >
          {/* Card Header (Compact Preview) */}
          <button
            type="button"
            onClick={() => toggleCard('evening')}
            className="w-full px-3.5 py-3 flex items-center justify-between text-left border-b border-purple-100 bg-gradient-to-r from-purple-500/15 via-indigo-500/8 to-transparent hover:from-purple-500/20 transition-all select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* 3D Glossy Twilight Purple Orb */}
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_3px_10px_rgba(147,51,234,0.3),inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(0,0,0,0.1)] bg-gradient-to-br from-purple-400 via-purple-600 to-indigo-700 border border-purple-300/70 shrink-0">
                <div className="absolute top-0.5 left-1 right-1 h-3 bg-gradient-to-b from-white/70 to-transparent rounded-t-lg pointer-events-none" />
                <span className="text-base relative z-10 drop-shadow-xs">🌙</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight group-hover:text-purple-700 transition flex items-center gap-1">
                  <span>Evening Sadhana</span>
                </h2>
                <p className="text-[11px] text-purple-800 font-bold truncate">
                  {sadhanaState.evening.length} practices • {eveningCompletedCount} done
                </p>
              </div>
            </div>

            {/* Expand / Collapse Pill */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-black text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                {expandedCards.evening ? 'Close' : 'Open'}
              </span>
              <div className="w-6 h-6 rounded-full bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center text-purple-800 transition-all">
                {expandedCards.evening ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>
          </button>

          {/* Expanded Content */}
          {expandedCards.evening && (
            <div className="p-3 sm:p-3.5 space-y-3 bg-gradient-to-b from-purple-50/20 to-white">
              {/* Add Evening Practice Form (Twilight Purple Theme) */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-purple-50/50 border border-purple-200">
                <input
                  value={addEveningName}
                  onChange={(e) => setAddEveningName(e.target.value)}
                  onFocus={() => ensureExpanded('evening')}
                  placeholder="Practice (e.g., Evening Meditation)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={addEveningFrequency}
                    onChange={(e) => setAddEveningFrequency(e.target.value)}
                    onFocus={() => ensureExpanded('evening')}
                    placeholder="e.g. 1 time"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                  <input
                    value={addEveningDuration}
                    onChange={(e) => setAddEveningDuration(e.target.value)}
                    onFocus={() => ensureExpanded('evening')}
                    placeholder="e.g. 10 min"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addSadhanaPractice('evening')}
                  className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-3 py-2 rounded-lg transition-all active:scale-95 text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_3px_10px_rgba(147,51,234,0.3)]"
                  title="Add Evening Practice"
                >
                  <Plus size={15} />
                  <span>Add Evening Practice</span>
                </button>
              </div>

              {/* Practices List */}
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {sadhanaState.evening.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">No evening practices added yet.</p>
                ) : (
                  sadhanaState.evening.map((p) => {
                    const isEditing = editing?.section === 'evening' && editing?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-start gap-2 p-2 rounded-xl border transition-all ${
                          p.completed
                            ? 'bg-purple-50/50 border-purple-200/70'
                            : 'bg-white border-purple-200/70 hover:border-purple-300 shadow-2xs'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSadhanaPractice('evening', p.id)}
                          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                            p.completed
                              ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-600 text-white shadow-2xs'
                              : 'border-purple-300 hover:border-purple-500 bg-white'
                          }`}
                          title={p.completed ? 'Mark not done' : 'Mark done'}
                        >
                          {p.completed && <Check size={12} className="text-white stroke-[3]" />}
                        </button>

                        <div className="flex-grow min-w-0">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 rounded border border-purple-200 text-xs font-medium"
                              />
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  value={editFrequency}
                                  onChange={(e) => setEditFrequency(e.target.value)}
                                  className="w-full px-2 py-0.5 rounded border border-purple-200 text-xs"
                                />
                                <input
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(e.target.value)}
                                  className="w-full px-2 py-0.5 rounded border border-purple-200 text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <p
                                className={`text-xs font-bold truncate ${
                                  p.completed ? 'line-through text-slate-400' : 'text-slate-800'
                                }`}
                              >
                                {p.name}
                              </p>
                              <p className="text-[10px] text-purple-800 font-medium mt-0.2">
                                {(p.frequency || '—')} • {(p.duration || '—')}
                              </p>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={saveEditPractice}
                                className="p-1 rounded hover:bg-purple-100 text-purple-800"
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditPractice}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500"
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
                                className="p-1 rounded hover:bg-purple-100 text-purple-800 transition"
                                title="Edit"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSadhanaPractice('evening', p.id)}
                                className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
