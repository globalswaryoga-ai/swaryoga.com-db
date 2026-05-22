'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Check, Trash2, CheckCircle2, Circle, Pencil } from 'lucide-react';
import { crmPlannerStorage } from '@/lib/crmPlannerMongoStorage';
import type { Goal, HealthRoutine, Task, Vision } from '@/lib/types/lifePlanner';

// Debug logging
if (typeof window !== 'undefined') {
  console.debug('[DailyPage] Storage object check:', {
    isDefined: crmPlannerStorage !== undefined,
    hasGetDailyTasks: typeof crmPlannerStorage?.getDailyTasks === 'function',
    hasSaveSadhana: typeof crmPlannerStorage?.saveSadhana === 'function',
  });
}

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
  // IMPORTANT: Use local date for "today". Using `toISOString()` is UTC and can shift the date,
  // causing items scheduled for "today" to disappear for users in non-UTC timezones.
  const getLocalDayKey = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [today] = useState(() => getLocalDayKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => getLocalDayKey(new Date()));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');
  const isToday = selectedDate === today;

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

  const [herbalInput, setHerbalInput] = useState('');

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

    // Load Vision/Goals/Tasks from MongoDB (no localStorage fallback)
    (async () => {
      try {
        const [savedVisions, savedGoals, savedTasks] = await Promise.all([
          crmPlannerStorage.getVisions(),
          crmPlannerStorage.getGoals(),
          crmPlannerStorage.getTasks(),
        ]);
        setVision(Array.isArray(savedVisions) ? savedVisions : []);
        setGoals(Array.isArray(savedGoals) ? savedGoals : []);
        setTasks(Array.isArray(savedTasks) ? savedTasks : []);
      } catch (e) {
        console.error('Error loading vision/goals/tasks:', e);
      }
    })();

    // Load Health routines (same source as Health dashboard)
    (async () => {
      setHealthLoading(true);
      setHealthError('');
      try {
        const saved = await crmPlannerStorage.getHealthRoutines();
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

  // Persist Sadhana when it changes (after initial load)
  useEffect(() => {
    if (!sadhanaHasLoaded) return;
    try {
      // Auto-save to MongoDB only — no localStorage writes for planner data
      setSaveStatus('saving');
      setSaveError('');
      const timer = setTimeout(() => {
        (async () => {
          try {
            await crmPlannerStorage.saveSadhana(selectedDate, sadhanaState);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to save sadhana';
            console.error('Error saving sadhana to MongoDB:', error);
            setSaveStatus('error');
            setSaveError(errorMsg);
          }
        })();
      }, 500);

      return () => clearTimeout(timer);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Local storage error';
      console.error('Sadhana storage error:', err);
      setSaveError(errorMsg);
    }
  }, [sadhanaState, sadhanaHasLoaded, sadhanaStorageKey, selectedDate]);

  // Persist health routines when changed (debounced, like Health page)
  useEffect(() => {
    if (!healthMounted || !healthHasLoaded) return;
    setSaveStatus('saving');
    setSaveError('');
    const timer = window.setTimeout(() => {
      (async () => {
        try {
          await crmPlannerStorage.saveHealthRoutines(healthRoutines);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Failed to save health routines';
          console.error('Error saving health routines:', e);
          setSaveStatus('error');
          setSaveError(errorMsg);
        }
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [healthRoutines, healthMounted, healthHasLoaded]);

  // Reload health routines when page becomes visible (user returns from Health page)
  useEffect(() => {
    const reloadRoutines = async () => {
      setHealthLoading(true);
      try {
        const saved = await crmPlannerStorage.getHealthRoutines();
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
          // Keep streak behavior consistent with existing Health Routines page
          streak: completedToday ? 0 : ((r as any).streak || 0) + 1,
          updatedAt: new Date().toISOString(),
        } as HealthRoutine;
      })
    );
  };

  const getWorkshopStorageKey = () => `dailyWorkshopPlannerTasks:${selectedDate}`;

  // Check if a task should appear on a given date based on its repeat frequency
  const shouldTaskAppear = (task: WorkshopTask, targetDate: string): boolean => {
    if (!task.repeat || task.repeat === 'none' || !task.createdDate) return false;

    const created = new Date(task.createdDate + 'T00:00:00');
    const target = new Date(targetDate + 'T00:00:00');

    if (target < created) return false; // Task hasn't been created yet

    const daysDiff = Math.floor((target.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    switch (task.repeat) {
      case 'daily':
        return true; // Appears every day
      case 'weekly':
        return daysDiff % 7 === 0; // Appears every 7 days
      case 'monthly':
        return target.getDate() === created.getDate(); // Appears on same day of month
      default:
        return false;
    }
  };

  const loadWorkshopTasksForDate = async (date: string) => {
    try {
      const dailyTasks = await crmPlannerStorage.getDailyTasks(date);
      setWorkshopTasks(dailyTasks?.workshopTasks || []);
    } catch (error) {
      console.error('Error loading workshop tasks from MongoDB:', error);
      setWorkshopTasks([]);
    }
  };

  // Reload workshop tasks and sadhana from MongoDB when selectedDate changes
  useEffect(() => {
    setSadhanaHasLoaded(false);
    (async () => {
      try {
        const dailyTasks = await crmPlannerStorage.getDailyTasks(selectedDate);
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
    // Auto-save to MongoDB only
    setSaveStatus('saving');
    setSaveError('');
    setTimeout(() => {
      (async () => {
        try {
          await crmPlannerStorage.saveWorkshopTasks(selectedDate, updated);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to save workshop tasks';
          console.error('Error saving workshop tasks to MongoDB:', error);
          setSaveStatus('error');
          setSaveError(errorMsg);
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

    // Ensure the user sees the category they added to (Social is at the bottom and can look “hidden”).
    requestAnimationFrame(() => {
      workshopCategoryRefs.current[selectedWorkshopCategory]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const deleteWorkshopTask = (id: string) => {
    persistWorkshopTasks(workshopTasks.filter(t => t.id !== id));
  };

  const updateWorkshopTask = (id: string, nextText: string) => {
    const text = nextText.trim();
    if (!text) return;
    persistWorkshopTasks(workshopTasks.map(t => (t.id === id ? { ...t, text } : t)));
  };

  const toggleTaskCompletion = (id: string) => {
    persistWorkshopTasks(
      workshopTasks.map(t =>
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

  const setWaterLiters = (next: number) => {
    const safe = Number.isFinite(next) ? Math.max(0, Math.round(next * 10) / 10) : 0;
    setSadhanaState((prev) => ({
      ...prev,
      diet: { ...prev.diet, waterLiters: safe },
    }));
  };

  const setDryFruits = (value: boolean) => {
    setSadhanaState((prev) => ({
      ...prev,
      diet: { ...prev.diet, dryFruitsBreakfast: value },
    }));
  };

  const addHerbalDrink = () => {
    const text = herbalInput.trim();
    if (!text) return;
    setSadhanaState((prev) => ({
      ...prev,
      diet: {
        ...prev.diet,
        herbalDrinks: [text, ...prev.diet.herbalDrinks],
      },
    }));
    setHerbalInput('');
  };

  const deleteHerbalDrink = (idx: number) => {
    setSadhanaState((prev) => ({
      ...prev,
      diet: {
        ...prev.diet,
        herbalDrinks: prev.diet.herbalDrinks.filter((_, i) => i !== idx),
      },
    }));
  };

  const toDayKey = (dateStr?: string) => {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') return null;

    // Supports 'YYYY-MM-DD' and ISO strings.
    // For ISO strings we prefer the leading YYYY-MM-DD (treat it as an intended calendar day)
    // instead of converting to UTC which can shift the date.
    const raw = dateStr.trim();
    if (!raw) return null;

    const direct = raw.match(/^\d{4}-\d{2}-\d{2}$/);
    if (direct) return raw;

    const leading = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (leading?.[1]) return leading[1];

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return getLocalDayKey(d);
  };

  const isOnDate = (dateStr?: string) => {
    const key = toDayKey(dateStr);
    return key === selectedDate;
  };

  const isWithinRange = (start?: string, end?: string) => {
    const s = toDayKey(start);
    const e = toDayKey(end);
    // If only one side exists, treat as exact match.
    if (s && !e) return s === selectedDate;
    if (!s && e) return e === selectedDate;
    if (!s && !e) return false;
    return s! <= selectedDate && selectedDate <= e!;
  };

  const todaysVisions = vision.filter((v) => {
    // Vision should show only when the date matches (start or end). Some UIs may store other date keys.
    return (
      isOnDate(v.startDate) ||
      isOnDate(v.endDate) ||
      isOnDate((v as any).date) ||
      isOnDate((v as any).dueDate) ||
      isOnDate((v as any).targetDate)
    );
  });

  const activeGoals = goals.filter((g) => {
    // Goal should show from startDate to targetDate (inclusive)
    return isWithinRange(g.startDate, g.targetDate);
  });

  const activeTasks = tasks.filter((t) => {
    
    // Task should show from startDate to dueDate (inclusive)
    return isWithinRange(t.startDate, t.dueDate);
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">

      {/* Main Header with Date Navigation */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-swar-text">Daily Planner</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevDay}
            className="p-2 border border-swar-border rounded-lg hover:bg-gray-50 text-swar-text transition"
            title="Previous day"
          >
            ‹
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition"
            >
              Today
            </button>
          )}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={goNextDay}
            className="p-2 border border-swar-border rounded-lg hover:bg-gray-50 text-swar-text transition"
            title="Next day"
          >
            ›
          </button>
        </div>
      </div>

      {/* Save Status Indicator */}
      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          saveStatus === 'saving' ? 'bg-blue-100 text-blue-800' :
          saveStatus === 'saved' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {saveStatus === 'saving' && (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-blue-800 border-t-transparent rounded-full"></div>
              <span className="text-sm font-medium">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <span>✓</span>
              <span className="text-sm font-medium">Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <span>⚠️</span>
              <span className="text-sm font-medium">{saveError || 'Save failed'}</span>
            </>
          )}
        </div>
      )}

      {/* Top 3 Cards with Professional Headers */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Card 1: Daily Workshop Planner */}
        <div className="rounded-lg border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-swar-border bg-blue-50">
            <span className="text-2xl">🏗️</span>
            <div>
              <h2 className="text-sm font-bold text-swar-text">Daily Workshop</h2>
              <p className="text-xs text-swar-text-secondary">{workshopTasks.length} tasks added</p>
            </div>
          </div>

          <div className="p-3 flex flex-col flex-grow">
            {/* Add Task */}
            <div className="space-y-2">
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

              {workshopError ? (
                <p className="text-xs text-red-600">{workshopError}</p>
              ) : null}

              {/* Repeat frequency buttons */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-swar-text-secondary">Repeat:</span>
                {['none', 'daily', 'weekly', 'monthly'].map(repeat => (
                  <button
                    key={repeat}
                    onClick={() => setNewTaskRepeat(repeat as TaskRepeat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                      newTaskRepeat === repeat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {repeat === 'none' ? 'Once' : repeat.charAt(0).toUpperCase() + repeat.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category summary chips */}
            <div className="mt-3 flex gap-2 flex-wrap">
              {workshopCategories
                .filter(cat => workshopTasks.filter(t => t.category === cat.id).length > 0)
                .map(cat => (
                  <span key={cat.id} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium whitespace-nowrap">
                    {cat.label.split(' ')[0]} ({workshopTasks.filter(t => t.category === cat.id).length})
                  </span>
                ))}
            </div>

            {/* Category sections */}
            <div className="mt-3 space-y-3 flex-grow overflow-y-auto">
              {workshopCategories.map(cat => {
                const catTasks = workshopTasks.filter(t => t.category === cat.id);
                if (catTasks.length === 0) return null;
                return (
                  <div
                    key={cat.id}
                    ref={(el) => {
                      workshopCategoryRefs.current[cat.id] = el;
                    }}
                    className="border-l-4 border-blue-400 pl-3"
                  >
                    <h3 className="text-xs font-semibold text-swar-text mb-2">
                      {cat.label} ({catTasks.length})
                    </h3>
                    {catTasks.length === 0 ? (
                      <p className="text-xs text-swar-text-secondary italic">No tasks added</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {catTasks.map(task => (
                          <li key={task.id} className="flex items-center gap-2 group">
                            <input
                              type="checkbox"
                              checked={task.completed || false}
                              onChange={() => toggleTaskCompletion(task.id)}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                              title="Mark as complete"
                            />
                            <div className="flex-grow flex items-center gap-1.5">
                              <span
                                className={`text-xs sm:text-sm flex-grow text-swar-text outline-none rounded px-1 -mx-1 focus:bg-blue-50 transition ${
                                  task.completed
                                    ? 'line-through text-swar-text-secondary bg-gray-50'
                                    : ''
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
                                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded whitespace-nowrap font-medium">
                                  🔄 {task.repeat}
                                </span>
                              )}
                              {task.completed && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded whitespace-nowrap font-medium">
                                  ✅ Done
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => deleteWorkshopTask(task.id)}
                              className="p-1 hover:bg-red-50 rounded text-red-600 transition"
                              title="Delete task"
                              aria-label="Delete task"
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
        <div className="rounded-lg border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-swar-border bg-emerald-50">
            <span className="text-2xl">🏃</span>
            <div>
              <h2 className="text-sm font-bold text-swar-text">My Routine</h2>
              <p className="text-xs text-swar-text-secondary">Health routines & checklist</p>
            </div>
          </div>

          <div className="p-3 flex flex-col flex-grow">
            {/* Compact stats bar */}
            <div className="flex gap-4 px-2 py-2 border-b border-swar-border text-xs text-swar-text-secondary mb-3 overflow-x-auto">
              <span className="whitespace-nowrap">📋 {healthRoutines.length} routines</span>
              <span className="whitespace-nowrap text-green-700 font-semibold">✅ {healthRoutines.filter(r => (Array.isArray((r as any).completedDates) ? (r as any).completedDates : []).includes(selectedDate)).length} done</span>
              <span className="whitespace-nowrap">🔥 {Math.max(...healthRoutines.map(r => (r as any).streak || 0), 0)} streak</span>
            </div>

            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-swar-text-secondary">Health Routines</p>
              <a href="/admin/crm/planner?section=health" className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-xs font-semibold">
                <Plus size={14} />
                Add
              </a>
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
                  const completedToday = (Array.isArray((r as any).completedDates) ? (r as any).completedDates : []).includes(selectedDate);
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
                      className={`rounded-lg p-2.5 border transition flex items-center gap-2.5 ${
                        completedToday
                          ? 'bg-green-50 border-green-200'
                          : 'border-swar-border hover:shadow-sm'
                      }`}
                    >
                      <button
                        onClick={() => toggleHealthRoutineComplete(r.id)}
                        className="text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                        title={completedToday ? 'Mark as not done' : 'Mark as done'}
                      >
                        {completedToday ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${
                          completedToday ? 'line-through text-swar-text-secondary' : 'text-swar-text'
                        }`}>
                          {(categoryEmoji[category] || '✨')} {r.title}
                        </p>
                        {(r as any).duration && (
                          <p className="text-xs text-swar-text-secondary">⏱️ {(r as any).duration}</p>
                        )}
                      </div>
                      {(r as any).repeat && (r as any).repeat !== 'once' && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded whitespace-nowrap font-medium">
                          🔄 {((r as any).repeat || 'daily')}
                        </span>
                      )}
                      {completedToday && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded whitespace-nowrap font-medium">
                          ✅ Done
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Card 3: My Sadhana */}
        <div className="rounded-lg border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-swar-border bg-purple-50">
            <span className="text-2xl">🧘</span>
            <div>
              <h2 className="text-sm font-bold text-swar-text">My Sadhana</h2>
              <p className="text-xs text-swar-text-secondary">Daily spiritual practices</p>
            </div>
          </div>

          <div className="p-3 flex flex-col flex-grow">
            <div className="space-y-3 overflow-y-auto">
              {/* Morning */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-swar-text">Morning Sadhana</h3>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 items-center mb-3">
                  <input
                    value={addMorningName}
                    onChange={(e) => setAddMorningName(e.target.value)}
                    placeholder="Practice title (e.g., Pranayama)"
                    className="w-full px-3 py-1.5 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 sm:col-span-2"
                  />
                  <input
                    value={addMorningFrequency}
                    onChange={(e) => setAddMorningFrequency(e.target.value)}
                    placeholder="2 times"
                    className="w-full px-3 py-1.5 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    value={addMorningDuration}
                    onChange={(e) => setAddMorningDuration(e.target.value)}
                    placeholder="5 minutes"
                    className="w-full px-3 py-1.5 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => addSadhanaPractice('morning')}
                    className="rounded-lg bg-purple-600 text-white px-4 py-2 hover:bg-purple-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2 sm:col-span-2"
                    title="Add"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                {sadhanaState.morning.length === 0 ? (
                  <p className="text-xs text-swar-text-secondary italic">No morning sadhana yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sadhanaState.morning.map((p) => {
                      const isEditing = editing?.section === 'morning' && editing?.id === p.id;
                      return (
                        <div key={p.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-purple-50 transition group">
                          <button
                            type="button"
                            onClick={() => toggleSadhanaPractice('morning', p.id)}
                            className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition ${
                              p.completed
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-gray-300 hover:border-purple-500'
                            }`}
                            title={p.completed ? 'Mark not done' : 'Mark done'}
                          >
                            {p.completed && <Check size={14} className="text-white" />}
                          </button>

                          <div className="flex-grow min-w-0">
                            {isEditing ? (
                              <div className="grid gap-2 sm:grid-cols-[1fr_130px_130px]">
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <input
                                  value={editFrequency}
                                  onChange={(e) => setEditFrequency(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <input
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            ) : (
                              <>
                                <p className={`text-sm font-semibold truncate ${p.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>{p.name}</p>
                                <p className="text-xs text-swar-text-secondary mt-0.5">
                                  {(p.frequency || '—')} • {(p.duration || '—')}
                                </p>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEditPractice}
                                  className="p-1.5 rounded hover:bg-green-50 text-green-700"
                                  title="Save"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditPractice}
                                  className="p-1.5 rounded hover:bg-gray-50 text-swar-text-secondary"
                                  title="Cancel"
                                >
                                  <span className="text-xs font-bold">×</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditPractice('morning', p)}
                                  className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded hover:bg-white text-swar-text-secondary"
                                  title="Edit"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSadhanaPractice('morning', p.id)}
                                  className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded hover:bg-red-50 text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
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

              {/* Evening */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-swar-text">Evening Sadhana</h3>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 items-center mb-3">
                  <input
                    value={addEveningName}
                    onChange={(e) => setAddEveningName(e.target.value)}
                    placeholder="Practice title (e.g., Meditation)"
                    className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 sm:col-span-2"
                  />
                  <input
                    value={addEveningFrequency}
                    onChange={(e) => setAddEveningFrequency(e.target.value)}
                    placeholder="1 time"
                    className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    value={addEveningDuration}
                    onChange={(e) => setAddEveningDuration(e.target.value)}
                    placeholder="10 minutes"
                    className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => addSadhanaPractice('evening')}
                    className="rounded-lg bg-purple-600 text-white px-4 py-2 hover:bg-purple-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2 sm:col-span-2"
                    title="Add"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                {sadhanaState.evening.length === 0 ? (
                  <p className="text-xs text-swar-text-secondary italic">No evening sadhana yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sadhanaState.evening.map((p) => {
                      const isEditing = editing?.section === 'evening' && editing?.id === p.id;
                      return (
                        <div key={p.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-purple-50 transition group">
                          <button
                            type="button"
                            onClick={() => toggleSadhanaPractice('evening', p.id)}
                            className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition ${
                              p.completed
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-gray-300 hover:border-purple-500'
                            }`}
                            title={p.completed ? 'Mark not done' : 'Mark done'}
                          >
                            {p.completed && <Check size={14} className="text-white" />}
                          </button>

                          <div className="flex-grow min-w-0">
                            {isEditing ? (
                              <div className="grid gap-2 sm:grid-cols-[1fr_130px_130px]">
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <input
                                  value={editFrequency}
                                  onChange={(e) => setEditFrequency(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <input
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            ) : (
                              <>
                                <p className={`text-sm font-semibold truncate ${p.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>{p.name}</p>
                                <p className="text-xs text-swar-text-secondary mt-0.5">
                                  {(p.frequency || '—')} • {(p.duration || '—')}
                                </p>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEditPractice}
                                  className="p-1.5 rounded hover:bg-green-50 text-green-700"
                                  title="Save"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditPractice}
                                  className="p-1.5 rounded hover:bg-gray-50 text-swar-text-secondary"
                                  title="Cancel"
                                >
                                  <span className="text-xs font-bold">×</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditPractice('evening', p)}
                                  className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded hover:bg-white text-swar-text-secondary"
                                  title="Edit"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSadhanaPractice('evening', p.id)}
                                  className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded hover:bg-red-50 text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
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
          </div>
        </div>
      </div>
    </div>
  );
}
