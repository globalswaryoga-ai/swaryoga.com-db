"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Clock, Plus, Edit2, Trash2 } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type {
  DayPart,
  DailyHealthPlan,
  DailyMeals,
  DailyRoutineItem,
  FoodPlanItem,
  HealthIntakeItem,
  HealthIntakeSection,
  HealthRoutine,
  MealSection,
} from '@/lib/types/lifePlanner';

const iso = (d: Date) => d.toISOString().split('T')[0];

const DAY_PARTS: Array<{ key: DayPart; label: string; tint: string; cardTint: string }> = [
  { key: 'early_morning', label: 'Early Morning', tint: 'bg-emerald-50 border-emerald-200', cardTint: 'bg-emerald-50 border-emerald-100' },
  { key: 'morning', label: 'Morning', tint: 'bg-sky-50 border-sky-200', cardTint: 'bg-sky-50 border-sky-100' },
  { key: 'afternoon', label: 'Afternoon', tint: 'bg-amber-50 border-amber-200', cardTint: 'bg-amber-50 border-amber-100' },
  { key: 'evening', label: 'Evening', tint: 'bg-purple-50 border-purple-200', cardTint: 'bg-purple-50 border-purple-100' },
  { key: 'night', label: 'Night', tint: 'bg-indigo-50 border-indigo-200', cardTint: 'bg-indigo-50 border-indigo-100' },
  { key: 'midnight', label: 'Midnight', tint: 'bg-slate-50 border-slate-200', cardTint: 'bg-slate-50 border-slate-100' },
];

const FOOD_SUBHEADINGS: string[] = [
  'Gond Pani',
  'Herbal soaked water',
  'Normal water',
  'Tea/Coffee/Green',
  'Breakfast',
  'Lunch',
  'Snacks',
  'Dinner',
  'Before Sleep',
];

function hourFromHHMM(value: string | undefined): number | null {
  if (!value) return null;
  const m = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  if (!Number.isFinite(hh)) return null;
  return Math.max(0, Math.min(23, hh));
}

function inferDayPartFromTime(time: string | undefined): DayPart {
  const hh = hourFromHHMM(time);
  if (hh == null) return 'morning';
  if (hh >= 0 && hh <= 3) return 'midnight';
  if (hh >= 4 && hh <= 7) return 'early_morning';
  if (hh >= 8 && hh <= 11) return 'morning';
  if (hh >= 12 && hh <= 15) return 'afternoon';
  if (hh >= 16 && hh <= 19) return 'evening';
  return 'night';
}

function createEmptyMealSection(): MealSection {
  return { time: '', items: [{ id: '1', name: '' }] };
}

function createEmptyMeals(): DailyMeals {
  return {
    breakfast: createEmptyMealSection(),
    lunch: createEmptyMealSection(),
    dinner: createEmptyMealSection(),
  };
}

function createNewDailyPlan(date: string): DailyHealthPlan {
  const now = new Date().toISOString();
  return {
    id: `dhp-${Date.now()}`,
    date,
    routines: [],
    foodPlanItems: [],
    meals: createEmptyMeals(),
    intakeSections: createDefaultIntakeSections(date),
    createdAt: now,
    updatedAt: now,
  };
}

function formatHour(n: number) {
  const hh = String(Math.max(0, Math.min(23, n))).padStart(2, '0');
  return `${hh}:00`;
}

function clampTime(t: string) {
  // Basic guard for empty/invalid times
  return typeof t === 'string' && /^\d{2}:\d{2}$/.test(t) ? t : '';
}

function createDefaultIntakeSections(date: string): HealthIntakeSection[] {
  const sections = [
    'Herbal drink',
    'Morning tea/coffee',
    'Breakfast',
    'Lunch',
    'Snacks',
    'Dinner',
    'Medicines',
    'Sleeping drink',
  ];

  return sections.map((title) => ({
    id: `his-${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    items: [
      {
        id: `hii-${Date.now()}-${title}`,
        name: '',
        startDate: date,
        endDate: date,
        startTime: '',
        endTime: '',
      },
    ],
  }));
}

function normalizePlanIntake(plan: DailyHealthPlan | null, date: string): HealthIntakeSection[] {
  if (plan?.intakeSections && Array.isArray(plan.intakeSections) && plan.intakeSections.length > 0) {
    return plan.intakeSections;
  }

  // Back-compat: map old meals into intake sections if intakeSections not present
  const base = createDefaultIntakeSections(date);
  const meals = plan?.meals;
  if (!meals) return base;

  const mapMeal = (title: string, sec: any) => {
    const items = (sec?.items || []).map((it: any) => ({
      id: String(it?.id || Date.now()),
      name: String(it?.name || ''),
      startDate: date,
      endDate: date,
      startTime: String(sec?.time || ''),
      endTime: '',
    }));
    return { title, items };
  };

  // Replace breakfast/lunch/dinner sections with old meal data where available
  const replace = (title: string, patch: { title: string; items: HealthIntakeItem[] }) => {
    const idx = base.findIndex((s) => s.title.toLowerCase() === title.toLowerCase());
    if (idx < 0) return;
    base[idx] = { ...base[idx], items: patch.items.length > 0 ? patch.items : base[idx].items };
  };

  replace('Breakfast', mapMeal('Breakfast', meals.breakfast));
  replace('Lunch', mapMeal('Lunch', meals.lunch));
  replace('Dinner', mapMeal('Dinner', meals.dinner));
  return base;
}

function addDaysISO(isoDate: string, delta: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return iso(d);
}

function computeStreakToday(completedDates: string[], todayISO: string) {
  const normalized = (completedDates || []).filter(Boolean).map((x) => String(x).slice(0, 10));
  const set = new Set(normalized);

  let streak = 0;
  let cursor = todayISO;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

function IntakeSectionEditor({
  section,
  onChange,
  onDeleteSection,
}: {
  section: HealthIntakeSection;
  onChange: (next: HealthIntakeSection) => void;
  onDeleteSection: () => void;
}) {
  const addItem = () => {
    onChange({
      ...section,
      items: [
        ...(section.items || []),
        {
          id: `hii-${Date.now()}`,
          name: '',
          startDate: iso(new Date()),
          endDate: iso(new Date()),
          startTime: '',
          endTime: '',
        },
      ],
    });
  };

  const updateItem = (id: string, patch: Partial<HealthIntakeItem>) => {
    onChange({
      ...section,
      items: (section.items || []).map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };

  const deleteItem = (id: string) => {
    const next = (section.items || []).filter((it) => it.id !== id);
    onChange({
      ...section,
      items: next.length > 0 ? next : section.items,
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-swar-text">{section.title}</h3>
          <p className="text-xs text-swar-text-secondary">Item name + start/end date + time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg bg-swar-primary px-3 py-2 text-xs font-semibold text-white hover:bg-swar-primary/90 transition"
          >
            + Add item
          </button>
          <button
            type="button"
            onClick={onDeleteSection}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {(section.items || []).map((it) => (
          <div key={it.id} className="rounded-lg border border-gray-200 bg-swar-bg p-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
              <div className="lg:col-span-4">
                <label className="block text-xs font-bold text-swar-text mb-1">Item name</label>
                <input
                  type="text"
                  value={it.name || ''}
                  onChange={(e) => updateItem(it.id, { name: e.target.value })}
                  placeholder="e.g. Ashwagandha / Honey lemon / Tablet"
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-swar-text focus:border-swar-primary focus:outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-swar-text mb-1">Start date</label>
                <input
                  type="date"
                  value={it.startDate || ''}
                  onChange={(e) => updateItem(it.id, { startDate: e.target.value })}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-swar-text focus:border-swar-primary focus:outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-swar-text mb-1">End date</label>
                <input
                  type="date"
                  value={it.endDate || ''}
                  onChange={(e) => updateItem(it.id, { endDate: e.target.value })}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-swar-text focus:border-swar-primary focus:outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-swar-text mb-1">Start time</label>
                <input
                  type="time"
                  value={it.startTime || ''}
                  onChange={(e) => updateItem(it.id, { startTime: e.target.value })}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-swar-text focus:border-swar-primary focus:outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-swar-text mb-1">End time</label>
                <input
                  type="time"
                  value={it.endTime || ''}
                  onChange={(e) => updateItem(it.id, { endTime: e.target.value })}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-swar-text focus:border-swar-primary focus:outline-none"
                />
              </div>

              <div className="lg:col-span-12 flex justify-end">
                <button
                  type="button"
                  onClick={() => deleteItem(it.id)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete item
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HealthPage() {
  const searchParams = useSearchParams();
  const [routines, setRoutines] = useState<HealthRoutine[]>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyHealthPlan[]>([]);
  const [activeDate, setActiveDate] = useState<string>(() => iso(new Date()));
  const [dailyLoading, setDailyLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'routines'>('daily');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const oftenDetailsRef = useRef<HTMLDetailsElement | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterFrequency, setFilterFrequency] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  // Daily routine form state
  const [routineFormDayPart, setRoutineFormDayPart] = useState<DayPart>('morning');
  const [routineFormTitle, setRoutineFormTitle] = useState('');
  const [routineFormTime, setRoutineFormTime] = useState('09:00');

  // Food plan form state
  const [foodFormDayPart, setFoodFormDayPart] = useState<DayPart>('morning');
  const [foodFormTitle, setFoodFormTitle] = useState('');
  const [foodFormTime, setFoodFormTime] = useState('09:00');
  const [foodFormSubheading, setFoodFormSubheading] = useState('Breakfast');
  const [foodFormRepeat, setFoodFormRepeat] = useState<'once' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);

  // Categories management
  const [categories, setCategories] = useState<string[]>(['exercise', 'meditation', 'nutrition', 'sleep', 'other']);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  // Minimize/Maximize state
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'exercise',
    frequency: 'daily',
    dailyFrequency: 'daily',
    time: '09:00',
    startTime: '09:00',
    endTime: '10:00',
    repeat: 'daily' as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly',
  });

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const loadDailyPlans = useCallback(async () => {
    setDailyLoading(true);
    try {
      const saved = await lifePlannerStorage.getDailyHealthPlans();
      const list = Array.isArray(saved) ? (saved as DailyHealthPlan[]) : [];

      const normalized = list.map((p) => {
        const routines = Array.isArray(p?.routines) ? p.routines : [];
        const nextRoutines = routines.map((it) => {
          const time = String(it?.time || it?.startTime || '');
          return {
            ...it,
            dayPart: (it as any).dayPart || inferDayPartFromTime(time),
            completed: typeof (it as any).completed === 'boolean' ? (it as any).completed : false,
          } as DailyRoutineItem;
        });

        const food = Array.isArray((p as any)?.foodPlanItems) ? ((p as any).foodPlanItems as FoodPlanItem[]) : [];
        const nextFood = food.map((it) => {
          const dayPart = (it as any)?.dayPart || inferDayPartFromTime((it as any)?.time);
          const subheading = String((it as any)?.subheading || FOOD_SUBHEADINGS[0] || '');
          const title = String((it as any)?.title || '');
          return {
            ...it,
            dayPart,
            subheading,
            title,
            completed: typeof (it as any).completed === 'boolean' ? (it as any).completed : false,
          } as FoodPlanItem;
        });

        // Intake section items: default completed=false so checkboxes can be added later safely.
        const intakeSections = Array.isArray(p?.intakeSections)
          ? p.intakeSections.map((sec) => ({
              ...sec,
              items: Array.isArray(sec?.items)
                ? sec.items.map((x) => ({
                    ...x,
                    completed: typeof (x as any).completed === 'boolean' ? (x as any).completed : false,
                  }))
                : sec.items,
            }))
          : p?.intakeSections;

        return {
          ...p,
          routines: nextRoutines,
          foodPlanItems: nextFood,
          intakeSections,
        } as DailyHealthPlan;
      });
      // Ensure current date has a plan even after refresh
      const exists = !!activeDate && normalized.some((p) => p?.date === activeDate);
      setDailyPlans(exists || !activeDate ? normalized : [...normalized, createNewDailyPlan(activeDate)]);
    } catch (e) {
      console.error('Error loading daily health plans:', e);
    } finally {
      setDailyLoading(false);
    }
  }, [activeDate]);

  const loadRoutines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userSession = localStorage.getItem('lifePlannerUser');
      const token = localStorage.getItem('lifePlannerToken');
      
      if (!userSession || !token) {
        setError('Please log in to access health routines');
        setLoading(false);
        return;
      }

      const saved = await lifePlannerStorage.getHealthRoutines();
      if (Array.isArray(saved)) {
        setRoutines(saved);
      } else {
        setRoutines([]);
      }
    } catch (err) {
      console.error('Error loading health routines:', err);
      setError('Failed to load routines. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load health routines + daily plans from MongoDB on mount
  useEffect(() => {
    setMounted(true);
    loadRoutines();
    loadDailyPlans();
  }, [loadRoutines, loadDailyPlans]);

  // Deep-link support: /health?date=YYYY-MM-DD
  useEffect(() => {
    const qp = searchParams?.get('date');
    if (!qp) return;
    if (/^\d{4}-\d{2}-\d{2}$/.test(qp)) {
      setActiveDate(qp);
    }
  }, [searchParams]);

  // Save to MongoDB whenever routines change
  useEffect(() => {
    if (!mounted || loading) return;
    
    const saveToMongo = async () => {
      try {
        const userSession = localStorage.getItem('lifePlannerUser');
        const token = localStorage.getItem('lifePlannerToken');
        
        if (!userSession || !token) {
          console.warn('Not authenticated - cannot save routines');
          return;
        }

        await lifePlannerStorage.saveHealthRoutines(routines);
        console.log('✅ Health routines saved successfully');
      } catch (err) {
        console.error('Error saving health routines:', err);
        setError('Failed to save changes to database');
      }
    };
    
    // Debounce saves to avoid too many requests
    const timer = setTimeout(saveToMongo, 500);
    return () => clearTimeout(timer);
  }, [routines, mounted, loading]);

  // Save to MongoDB whenever daily plans change
  useEffect(() => {
    if (!mounted || dailyLoading) return;
    const saveToMongo = async () => {
      try {
        const userSession = localStorage.getItem('lifePlannerUser');
        const token = localStorage.getItem('lifePlannerToken');

        if (!userSession || !token) {
          console.warn('Not authenticated - cannot save daily health plans');
          return;
        }

        await lifePlannerStorage.saveDailyHealthPlans(dailyPlans);
      } catch (err) {
        console.error('Error saving daily health plans:', err);
      }
    };

    const timer = setTimeout(saveToMongo, 600);
    return () => clearTimeout(timer);
  }, [dailyPlans, mounted, dailyLoading]);

  const activePlan = useMemo(() => {
    if (!activeDate) return null;
    return dailyPlans.find((p) => p?.date === activeDate) || null;
  }, [dailyPlans, activeDate]);

  const ensurePlanExists = (date: string) => {
    if (!date) return;
    setDailyPlans((prev) => {
      const exists = prev.some((p) => p?.date === date);
      if (exists) return prev;
      return [...prev, createNewDailyPlan(date)];
    });
  };

  useEffect(() => {
    if (!mounted) return;
    if (!activeDate) return;
    ensurePlanExists(activeDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate, mounted]);

  const updatePlanForDate = (date: string, updater: (plan: DailyHealthPlan) => DailyHealthPlan) => {
    if (!date) return;
    const now = new Date().toISOString();
    setDailyPlans((prev) => {
      const idx = prev.findIndex((p) => p?.date === date);
      const base = idx >= 0 ? prev[idx] : createNewDailyPlan(date);
      const updated = {
        ...updater(base),
        date,
        updatedAt: now,
      };

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  const addRoutineItem = (suggestedHour?: number) => {
    const baseHour = typeof suggestedHour === 'number' ? suggestedHour : new Date().getHours();
    const startTime = formatHour(baseHour);
    const endTime = formatHour((baseHour + 1) % 24);
    const newItem: DailyRoutineItem = {
      id: `dri-${Date.now()}`,
      title: '',
      notes: '',
      startDate: activeDate,
      endDate: activeDate,
      startTime,
      endTime,
      whatToEat: '',
    };
    updatePlanForDate(activeDate, (plan) => ({
      ...plan,
      routines: [...(plan.routines || []), newItem],
    }));
  };

  const updateRoutineItem = (id: string, patch: Partial<DailyRoutineItem>) => {
    updatePlanForDate(activeDate, (plan) => ({
      ...plan,
      routines: (plan.routines || []).map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const deleteRoutineItem = (id: string) => {
    updatePlanForDate(activeDate, (plan) => ({
      ...plan,
      routines: (plan.routines || []).filter((it) => it.id !== id),
    }));
  };

  const addRoutineItemToDayPart = (dayPart: DayPart) => {
    // Use form values instead of defaults
    const newItem: DailyRoutineItem = {
      id: `dri-${Date.now()}`,
      title: routineFormTitle.trim() || 'Untitled',
      notes: '',
      dayPart,
      startDate: activeDate,
      endDate: activeDate,
      frequency: 'once',
      time: routineFormTime || '09:00',
      whatToEat: '',
      completed: false,
    };

    updatePlanForDate(activeDate, (plan) => ({
      ...plan,
      routines: [...(plan.routines || []), newItem],
    }));

    // Reset form
    setRoutineFormTitle('');
    setRoutineFormTime('09:00');
  };

  const foodPlanItems = useMemo<FoodPlanItem[]>(
    () => (Array.isArray((activePlan as any)?.foodPlanItems) ? (((activePlan as any).foodPlanItems as FoodPlanItem[]) || []) : []),
    [activePlan]
  );

  const addFoodPlanItem = (dayPart: DayPart) => {
    if (!foodFormTitle.trim()) {
      alert('Please enter a food item title');
      return;
    }

    const item: FoodPlanItem = {
      id: editingFoodId || `fpi-${Date.now()}`,
      dayPart,
      subheading: foodFormSubheading || FOOD_SUBHEADINGS[0] || 'Gond Pani',
      title: foodFormTitle.trim(),
      time: foodFormTime || '09:00',
      repeat: foodFormRepeat,
      completed: false,
    };

    if (editingFoodId) {
      updateFoodPlanItem(editingFoodId, item);
      setEditingFoodId(null);
    } else {
      updatePlanForDate(activeDate, (plan) => ({
        ...plan,
        foodPlanItems: [...(Array.isArray((plan as any).foodPlanItems) ? ((plan as any).foodPlanItems as FoodPlanItem[]) : []), item],
      }));
    }

    // Reset form
    setFoodFormTitle('');
    setFoodFormTime('09:00');
    setFoodFormRepeat('daily');
  };

  const updateFoodPlanItem = (id: string, patch: Partial<FoodPlanItem>) => {
    updatePlanForDate(activeDate, (plan) => ({
      ...plan,
      foodPlanItems: (Array.isArray((plan as any).foodPlanItems) ? ((plan as any).foodPlanItems as FoodPlanItem[]) : []).map((it) =>
        it.id === id ? { ...it, ...patch } : it
      ),
    }));
  };

  const editFoodPlanItem = (item: FoodPlanItem) => {
    setEditingFoodId(item.id);
    setFoodFormDayPart(item.dayPart);
    setFoodFormTitle(item.title);
    setFoodFormTime(item.time || '09:00');
    setFoodFormSubheading(item.subheading);
    setFoodFormRepeat(item.repeat || 'daily');
  };

  const deleteFoodPlanItem = (id: string) => {
    if (!confirm('Delete this food item?')) return;
    updatePlanForDate(activeDate, (plan) => ({
      ...plan,
      foodPlanItems: (Array.isArray((plan as any).foodPlanItems) ? ((plan as any).foodPlanItems as FoodPlanItem[]) : []).filter(
        (it) => it.id !== id
      ),
    }));
    if (editingFoodId === id) {
      setEditingFoodId(null);
      setFoodFormTitle('');
      setFoodFormTime('09:00');
      setFoodFormRepeat('daily');
    }
  };

  const updateIntakeSections = (nextSections: HealthIntakeSection[]) => {
    updatePlanForDate(activeDate, (plan) => ({
      ...plan,
      intakeSections: nextSections,
    }));
  };

  const intakeSections = useMemo(() => normalizePlanIntake(activePlan, activeDate), [activePlan, activeDate]);

  const addCustomSection = () => {
    const title = prompt('Section name (e.g. Supplements / Pre-workout):');
    if (!title) return;
    const next: HealthIntakeSection = {
      id: `his-${Date.now()}`,
      title: title.trim(),
      items: [
        {
          id: `hii-${Date.now()}`,
          name: '',
          startDate: activeDate,
          endDate: activeDate,
          startTime: '',
          endTime: '',
        },
      ],
    };
    updateIntakeSections([...(intakeSections || []), next]);
  };

  const todayISO = useMemo(() => iso(new Date()), []);

  const toggleRoutineDoneToday = (routineId: string) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== routineId) return r;
        const current = Array.isArray(r.completedDates) ? r.completedDates.map((d) => String(d).slice(0, 10)) : [];
        const set = new Set(current);
        if (set.has(todayISO)) set.delete(todayISO);
        else set.add(todayISO);
        const nextDates = Array.from(set).sort();
        const nextStreak = computeStreakToday(nextDates, todayISO);
        return {
          ...r,
          completedDates: nextDates,
          streak: nextStreak,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      category: 'exercise',
      frequency: 'daily',
      dailyFrequency: 'daily',
      time: '09:00',
      startTime: '09:00',
      endTime: '10:00',
      repeat: 'daily' as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    });
    setIsFormOpen(true);
  };

  const openEdit = (r: HealthRoutine) => {
    setEditingId(r.id);
    setForm({
      title: r.title || '',
      description: r.description || '',
      category: r.category || 'exercise',
      frequency: r.frequency || 'daily',
      dailyFrequency: r.dailyFrequency || 'daily',
      time: r.time || '09:00',
      startTime: r.startTime || '09:00',
      endTime: r.endTime || '10:00',
      repeat: ((r as any).repeat || 'daily') as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    });
    setIsFormOpen(true);
  };

  const saveRoutine = () => {
    if (!form.title.trim()) return alert('Please enter a title');
    if (editingId) {
      setRoutines(prev => prev.map(r => r.id === editingId ? {
        ...r,
        title: form.title,
        description: form.description,
        category: form.category,
        frequency: form.frequency as any,
        dailyFrequency: form.dailyFrequency as any,
        time: form.time,
        startTime: form.startTime,
        endTime: form.endTime,
        repeat: form.repeat,
        updatedAt: new Date().toISOString()
      } : r));
    } else {
      const newR: HealthRoutine = {
        id: `hr-${Date.now()}`,
        title: form.title,
        description: form.description,
        category: form.category,
        frequency: form.frequency as any,
        dailyFrequency: form.dailyFrequency as any,
        time: form.time,
        startTime: form.startTime,
        endTime: form.endTime,
        repeat: form.repeat,
        completedDates: [],
        streak: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as HealthRoutine;
      setRoutines(prev => [...prev, newR]);
    }
    setIsFormOpen(false);
  };

  const deleteRoutine = (id: string) => {
    if (!confirm('Delete this routine?')) return;
    setRoutines(prev => prev.filter(r => r.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setIsFormOpen(false);
    }
  };

  const toggleExpanded = (routineId: string) => {
    setExpandedRoutines(prev => {
      const next = new Set(prev);
      if (next.has(routineId)) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });
  };

  const closeOftenDropdown = () => {
    const el = oftenDetailsRef.current;
    if (!el) return;
    el.removeAttribute('open');
  };

  const addOftenToDayFrom = (preset: HealthRoutine) => {
    const mode: DailyRoutineItem['frequency'] = preset.dailyFrequency || 'daily';

    const item: DailyRoutineItem = {
      id: `dri-${Date.now()}`,
      title: preset.title || '',
      notes: preset.description || '',
      startDate: activeDate,
      endDate: activeDate,
      frequency: mode,
      whatToEat: '',
    };

    if (mode === 'custom') {
      item.startTime = clampTime(preset.startTime || '') || formatHour(new Date().getHours());
      item.endTime = clampTime(preset.endTime || '') || formatHour((new Date().getHours() + 1) % 24);
    } else {
      item.time = clampTime(preset.time || '') || '';
    }

    updatePlanForDate(activeDate, (plan) => ({
      ...plan,
      routines: [...(plan.routines || []), item],
    }));

    closeOftenDropdown();
  };

  // Filter routines
  const filteredRoutines = routines.filter(r => {
    const matchesSearch = !searchQuery.trim() || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'All' || r.category === filterCategory;
    const matchesFrequency = filterFrequency === 'All' || r.frequency === filterFrequency;
    
    const matchesMonth = filterMonth === 'All' || 
      (r.createdAt && new Date(r.createdAt).toLocaleString('default', { month: 'long' }) === filterMonth);
    
    return matchesSearch && matchesCategory && matchesFrequency && matchesMonth;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('All');
    setFilterFrequency('All');
    setFilterMonth('All');
  };

  const addCategory = () => {
    const trimmed = newCategoryName.trim().toLowerCase();
    if (!trimmed) return alert('Category name cannot be empty');
    if (categories.includes(trimmed)) return alert('Category already exists');
    setCategories(prev => [...prev, trimmed]);
    setNewCategoryName('');
    setShowCategoryInput(false);
  };

  const removeCategory = (cat: string) => {
    if (!confirm(`Remove category "${cat}"?`)) return;
    setCategories(prev => prev.filter(c => c !== cat));
    if (filterCategory === cat) setFilterCategory('All');
    if (form.category === cat) setForm(prev => ({ ...prev, category: categories[0] || 'exercise' }));
  };

  if (!mounted) return null;

  return (
    <div
      className="bg-gradient-to-br from-swar-bg to-swar-primary/5 rounded-2xl border border-swar-border"
      style={{ fontFamily: 'Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}
    >
      <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start justify-between gap-3 flex-wrap">
            <div className="text-sm font-medium">{error}</div>
            <button
              onClick={loadRoutines}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Header (Diamond-style) */}
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap bg-gradient-to-r from-emerald-50 to-amber-50 rounded-xl p-4 sm:p-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-swar-text mb-2">💪 Health Planner</h1>
            <p className="text-swar-text-secondary text-sm sm:text-base">Daily routine + food plan checklist. Track progress month-wise using the calendar icon.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/life-planner/dashboard/health-month"
              className="h-11 w-11 rounded-full border border-gray-200 bg-white shadow-sm hover:shadow-md transition flex items-center justify-center"
              title="Monthly progress"
              aria-label="Monthly progress"
            >
              <Clock className="h-5 w-5 text-swar-text" />
            </Link>

            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg font-semibold transition-all border-2 ${
                activeTab === 'daily'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-lg hover:shadow-xl'
                  : 'bg-white text-swar-text border-gray-200 hover:border-sky-400 hover:bg-sky-50'
              }`}
            >
              📅 Daily Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('routines')}
              className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg font-semibold transition-all border-2 ${
                activeTab === 'routines'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg hover:shadow-xl'
                  : 'bg-white text-swar-text border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
              }`}
            >
              🔁 Routines
            </button>
          </div>
        </div>

        {/* Health Summary Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-5">
            <p className="text-sm font-bold text-swar-text-secondary mb-2">TODAY'S COMPLETION</p>
            <div className="text-3xl font-black text-emerald-700 mb-2">
              {routines.filter(r => {
                const completed = Array.isArray(r.completedDates) ? r.completedDates : [];
                return completed.includes(iso(new Date()));
              }).length}
            </div>
            <p className="text-xs text-swar-text-secondary">of {routines.length} routines done</p>
          </div>

          <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-5">
            <p className="text-sm font-bold text-swar-text-secondary mb-2">BEST STREAK</p>
            <div className="text-3xl font-black text-orange-700 mb-2">
              {Math.max(...routines.map((r: any) => Number(r?.streak) || 0), 0)}
            </div>
            <p className="text-xs text-swar-text-secondary">consecutive days</p>
          </div>

          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5">
            <p className="text-sm font-bold text-swar-text-secondary mb-2">TOTAL ROUTINES</p>
            <div className="text-3xl font-black text-blue-700 mb-2">{routines.length}</div>
            <p className="text-xs text-swar-text-secondary">active habits</p>
          </div>

          <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-5">
            <p className="text-sm font-bold text-swar-text-secondary mb-2">CATEGORIES</p>
            <div className="text-3xl font-black text-purple-700 mb-2">{categories.length}</div>
            <p className="text-xs text-swar-text-secondary">habit types</p>
          </div>
        </div>

      {/* Inline create/edit (replaces modal) */}
      {isFormOpen && (
        <div className=”bg-gradient-to-br from-white to-emerald-50 rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-emerald-200”>
          <div className=”flex items-start justify-between gap-3 flex-wrap”>
            <div>
              <h3 className=”text-lg sm:text-xl font-bold text-swar-text”>{editingId ? '✏️ Edit Health Routine' : '➕ Add Health Routine'}</h3>
              <p className=”text-xs sm:text-sm text-swar-text-secondary”>Create reusable health routines to add to your daily plan</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 text-sm font-semibold text-swar-text hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRoutine}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold hover:from-emerald-700 hover:to-emerald-600 transition shadow-md hover:shadow-lg"
              >
                {editingId ? '✏️ Update' : '✅ Create'}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-swar-text mb-2">Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition text-sm"
                placeholder="e.g. Yoga / Walk / Pranayama"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-swar-text mb-2">Category *</label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-swar-text mb-2">Tracking Frequency *</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm((prev) => ({ ...prev, frequency: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-swar-text mb-2">Daily Mode *</label>
              <select
                value={form.dailyFrequency}
                onChange={(e) => setForm((prev) => ({ ...prev, dailyFrequency: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition text-sm"
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="custom">Custom Slot</option>
              </select>
            </div>

            {form.dailyFrequency !== 'custom' ? (
              <div>
                <label className="block text-xs font-semibold text-swar-text mb-2">Time *</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition text-sm"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-swar-text mb-2">Start Time *</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-swar-text mb-2">End Time *</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-swar-text mb-2">Description (Optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition text-sm"
              rows={2}
              placeholder="Add notes or details about this routine..."
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-swar-text mb-2">Repeat Pattern *</label>
            <div className="flex gap-2 flex-wrap">
              {['once', 'daily', 'weekly', 'monthly', 'yearly'].map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, repeat: option as any }))}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                    form.repeat === option
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 text-swar-text hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {option === 'once' ? '⏱️' : option === 'daily' ? '📅' : option === 'weekly' ? '📆' : option === 'monthly' ? '📊' : '📈'} {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Daily routine + Food plan (two cards) */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Date selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-bold text-swar-text-secondary">Select date</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="date"
                    value={activeDate}
                    onChange={(e) => setActiveDate(e.target.value)}
                    className="rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold text-swar-text focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <span className="text-xs text-swar-text-secondary">Track your daily routine & food plan</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loadDailyPlans();
                    if (activeDate) ensurePlanExists(activeDate);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-swar-text hover:border-swar-primary transition"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ===== CARD 1: DAILY ROUTINE ===== */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Card Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-gray-200 bg-gradient-to-r from-sky-50 via-emerald-50 to-blue-50">
                <h2 className="text-xl sm:text-2xl font-bold text-swar-text">⏰ Daily Routine</h2>
                <p className="mt-1 text-xs sm:text-sm text-swar-text-secondary">Add and track routines for each time period</p>
              </div>

              {/* Add Form */}
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-swar-text mb-2">Select heading</label>
                    <select
                      value={routineFormDayPart}
                      onChange={(e) => setRoutineFormDayPart(e.target.value as DayPart)}
                      className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-swar-text focus:border-sky-400 focus:outline-none"
                    >
                      {DAY_PARTS.map((part) => (
                        <option key={part.key} value={part.key}>
                          {part.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-swar-text mb-2">Title</label>
                    <input
                      type="text"
                      value={routineFormTitle}
                      onChange={(e) => setRoutineFormTitle(e.target.value)}
                      placeholder="What you want to do..."
                      className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-swar-text placeholder-gray-400 focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-swar-text mb-2">Time</label>
                    <input
                      type="time"
                      value={routineFormTime}
                      onChange={(e) => setRoutineFormTime(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-swar-text focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => addRoutineItemToDayPart(routineFormDayPart)}
                    className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-bold text-white hover:bg-sky-700 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Add Routine
                  </button>
                </div>
              </div>

              {/* Items Display */}
              <div className="px-6 py-5 space-y-2">
                {DAY_PARTS.map((part) => {
                  const items = (activePlan?.routines || []).filter((it) => {
                    const inferred = (it as any).dayPart || inferDayPartFromTime(String(it?.time || it?.startTime || ''));
                    return inferred === part.key;
                  });

                  if (items.length === 0) return null;

                  return (
                    <div key={part.key}>
                      <h3 className="text-xs font-extrabold text-swar-text-secondary uppercase tracking-wider mb-2 mt-3">{part.label}</h3>
                      <div className="space-y-2">
                        {items.map((it) => (
                          <div key={it.id} className={`rounded-lg border-2 p-3 flex items-center gap-3 ${part.cardTint}`}>
                            <input
                              type="checkbox"
                              checked={Boolean((it as any).completed)}
                              onChange={() => updateRoutineItem(it.id, { completed: !Boolean((it as any).completed) })}
                              className="h-5 w-5 flex-shrink-0 accent-emerald-600 cursor-pointer"
                              aria-label="Mark complete"
                            />

                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${(it as any).completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>
                                {it.title}
                              </p>
                              <p className="text-xs text-swar-text-secondary">{it.time || it.startTime || '--:--'}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteRoutineItem(it.id)}
                              className="flex-shrink-0 p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {(activePlan?.routines || []).length === 0 && (
                  <div className="text-center py-8 text-swar-text-secondary">
                    <p className="text-sm italic">No routines added yet. Add one above!</p>
                  </div>
                )}
              </div>
            </div>

            {/* ===== CARD 2: FOOD PLAN ===== */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Card Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-gray-200 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50">
                <h2 className="text-xl sm:text-2xl font-bold text-swar-text">🍽️ Food Plan</h2>
                <p className="mt-1 text-xs sm:text-sm text-swar-text-secondary">Add and track food items for each time period</p>
              </div>

              {/* Add Form */}
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-swar-text mb-2">Select heading</label>
                    <select
                      value={foodFormDayPart}
                      onChange={(e) => setFoodFormDayPart(e.target.value as DayPart)}
                      className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-swar-text focus:border-amber-400 focus:outline-none"
                    >
                      {DAY_PARTS.map((part) => (
                        <option key={part.key} value={part.key}>
                          {part.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-swar-text mb-2">Sub heading</label>
                    <select
                      value={foodFormSubheading}
                      onChange={(e) => setFoodFormSubheading(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-swar-text focus:border-amber-400 focus:outline-none"
                    >
                      {FOOD_SUBHEADINGS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-swar-text mb-2">Title</label>
                    <input
                      type="text"
                      value={foodFormTitle}
                      onChange={(e) => setFoodFormTitle(e.target.value)}
                      placeholder="What you want to take/eat..."
                      className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-swar-text placeholder-gray-400 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-swar-text mb-2">Time</label>
                    <input
                      type="time"
                      value={foodFormTime}
                      onChange={(e) => setFoodFormTime(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-swar-text focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-swar-text mb-2">Repeat</label>
                    <div className="flex gap-2 flex-wrap">
                      {['once', 'daily', 'weekly', 'monthly', 'yearly'].map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFoodFormRepeat(option as any)}
                          className={`px-3 py-2 rounded-lg font-semibold text-xs transition ${
                            foodFormRepeat === option
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          }`}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => addFoodPlanItem(foodFormDayPart)}
                    className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-bold text-white hover:bg-amber-700 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    {editingFoodId ? 'Update Food' : 'Add Food'}
                  </button>
                  {editingFoodId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFoodId(null);
                        setFoodFormTitle('');
                        setFoodFormTime('09:00');
                        setFoodFormRepeat('daily');
                      }}
                      className="w-full rounded-lg bg-gray-400 px-4 py-2.5 font-bold text-white hover:bg-gray-500 transition"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Items Display */}
              <div className="px-6 py-5 space-y-2">
                {DAY_PARTS.map((part) => {
                  const items = (foodPlanItems || []).filter((it) => it?.dayPart === part.key);

                  if (items.length === 0) return null;

                  return (
                    <div key={part.key}>
                      <h3 className="text-xs font-extrabold text-swar-text-secondary uppercase tracking-wider mb-2 mt-3">{part.label}</h3>
                      <div className="space-y-2">
                        {items.map((it) => (
                          <div key={it.id} className={`rounded-lg border-2 p-3 flex items-center gap-2 ${it.completed ? 'bg-green-50 border-green-300' : part.cardTint}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(it.completed)}
                              onChange={() => updateFoodPlanItem(it.id, { completed: !Boolean(it.completed) })}
                              className="h-5 w-5 flex-shrink-0 accent-emerald-600 cursor-pointer"
                              aria-label="Mark complete"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <p className={`text-xs font-bold ${it.completed ? 'line-through text-gray-400' : 'text-swar-text-secondary'}`}>
                                  {it.subheading}
                                </p>
                                <p className={`text-sm font-semibold truncate ${it.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>
                                  {it.title}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs text-swar-text-secondary">{it.time || '--:--'}</p>
                                {it.repeat && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">📅 {it.repeat}</span>}
                              </div>
                            </div>

                            <div className="flex-shrink-0 flex gap-1">
                              <button
                                type="button"
                                onClick={() => editFoodPlanItem(it)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteFoodPlanItem(it.id)}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {(foodPlanItems || []).length === 0 && (
                  <div className="text-center py-8 text-swar-text-secondary">
                    <p className="text-sm italic">No food items added yet. Add one above!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Health routines manager */}
      {activeTab === 'routines' && (
      <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-swar-text">Health Routines</h2>
            <p className="text-sm text-swar-text-secondary">Reusable habits you track daily/weekly/monthly.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700 transition"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm">New Routine</span>
          </button>
        </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-swar-text mb-2">Search</label>
            <input 
              type="text" 
              placeholder="Search title / description..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-swar-text mb-2">Category</label>
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>All</option>
              {categories.map(cat => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-swar-text mb-2">Frequency</label>
            <select 
              value={filterFrequency} 
              onChange={e => setFilterFrequency(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>All</option>
              <option>daily</option>
              <option>weekly</option>
              <option>monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-swar-text mb-2">Month</label>
            <select 
              value={filterMonth} 
              onChange={e => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>All</option>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <button 
            onClick={clearFilters}
            className="px-4 py-2 bg-swar-primary-light text-swar-text rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Category Management */}
      <div className="mb-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-swar-text">Manage Categories</h3>
          <button 
            onClick={() => setShowCategoryInput(!showCategoryInput)}
            className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition"
          >
            + Add Category
          </button>
        </div>
        
        {showCategoryInput && (
          <div className="flex gap-2 mb-3">
            <input 
              type="text" 
              value={newCategoryName} 
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 rounded-lg border border-swar-border text-sm"
              onKeyDown={e => e.key === 'Enter' && addCategory()}
            />
            <button 
              onClick={addCategory}
              className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition"
            >
              Add
            </button>
            <button 
              onClick={() => { setShowCategoryInput(false); setNewCategoryName(''); }}
              className="px-4 py-2 bg-gray-300 text-swar-text text-sm font-bold rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <div 
              key={cat}
              className="flex items-center gap-1 bg-gradient-to-r from-emerald-100 to-teal-100 px-2 py-1 rounded-md border border-emerald-200"
            >
              <span className="text-xs font-medium text-swar-text">✓ {cat}</span>
              <button 
                onClick={() => removeCategory(cat)}
                className="text-red-500 hover:text-swar-primary font-bold text-base leading-none"
                title="Remove category"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Form is now rendered as a global modal (above) so it can be opened from Daily tab too. */}

      {/* Routines Grid */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-swar-text-secondary">Loading routines...</p>
        </div>
      ) : filteredRoutines.length === 0 ? (
        <div className="text-center py-8 bg-swar-bg rounded-lg">
          <p className="text-swar-text-secondary">{routines.length === 0 ? 'No routines yet. Create your first one!' : 'No routines match your filters.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[10px] auto-rows-max justify-items-center">
          {filteredRoutines.map(r => {
            const isCompletedToday = (r.completedDates || []).map((d) => String(d).slice(0, 10)).includes(todayISO);
            const isExpanded = expandedRoutines.has(r.id);
            return (
            <div key={r.id} className={`w-80 rounded-2xl shadow-lg overflow-hidden flex flex-col transition ${isCompletedToday ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-white'} ${isExpanded ? 'h-auto' : 'h-96'}`}>
              <div className={`relative ${isExpanded ? 'h-32' : 'h-48'} overflow-hidden transition-all ${isCompletedToday ? 'bg-emerald-500' : 'bg-emerald-600'}`} style={{ backgroundImage: `url('https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {isCompletedToday && <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center"><span className="text-white font-bold text-lg sm:text-2xl">✅ Done Today!</span></div>}
                <div className="absolute top-3 left-3 w-6 h-6 rounded-full border-2 border-white bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/40 transition">
                  <input
                    type="checkbox"
                    checked={isCompletedToday}
                    onChange={() => toggleRoutineDoneToday(r.id)}
                    className="w-4 h-4 rounded-full cursor-pointer"
                    aria-label="Mark done today"
                  />
                </div>
                <button
                  onClick={() => toggleExpanded(r.id)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full border-2 border-white bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/40 transition text-white text-lg leading-none"
                  title={isExpanded ? 'Minimize' : 'Maximize'}
                >
                  {isExpanded ? '−' : '+'}
                </button>
              </div>

              {!isExpanded ? (
                <>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className={`text-lg font-bold mb-2 line-clamp-2 ${isCompletedToday ? 'line-through text-emerald-600' : 'text-swar-text'}`}>{r.title}</h3>
                    <p className={`text-sm mb-4 line-clamp-2 ${isCompletedToday ? 'line-through text-emerald-500' : 'text-swar-text-secondary'}`}>{r.description}</p>
                    <div className="space-y-2 text-xs text-swar-text mb-auto">
                      {r.category && <div className="flex items-center gap-2">📂 {r.category}</div>}
                      <div className="flex items-center gap-2">🔁 {(r.frequency || 'daily').toUpperCase()}</div>
                      {r.repeat && <div className="flex items-center gap-2">📅 {r.repeat.charAt(0).toUpperCase() + r.repeat.slice(1)}</div>}
                      {r.streak > 0 && <div className="flex items-center gap-2">🔥 {r.streak} day streak</div>}
                    </div>
                  </div>

                  <div className="flex gap-2 p-4 border-t border-gray-100">
                    <button onClick={() => openEdit(r)} className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition">Edit</button>
                    <button onClick={() => deleteRoutine(r.id)} className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition">Delete</button>
                  </div>
                </>
              ) : (
                <div className="p-5 flex-1 flex flex-col overflow-y-auto">
                  <h3 className={`text-lg font-bold mb-2 ${isCompletedToday ? 'line-through text-emerald-600' : 'text-swar-text'}`}>{r.title}</h3>
                  <div className="space-y-3 text-sm mb-4">
                    {r.description && (
                      <div>
                        <p className="font-semibold text-swar-text">Description</p>
                        <p className={isCompletedToday ? 'line-through text-emerald-500' : 'text-swar-text-secondary'}>{r.description}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      {r.category && <div className="text-swar-text">📂 Category: <span className="font-semibold">{r.category}</span></div>}
                      <div className="text-swar-text">🔁 Frequency: <span className="font-semibold">{(r.frequency || 'daily').toUpperCase()}</span></div>
                      {r.repeat && <div className="text-swar-text">📅 Repeat: <span className="font-semibold">{r.repeat.charAt(0).toUpperCase() + r.repeat.slice(1)}</span></div>}
                      {r.time && <div className="text-swar-text">⏰ Time: <span className="font-semibold">{r.time}</span></div>}
                      {r.startTime && r.endTime && <div className="text-swar-text">⏱️ Duration: <span className="font-semibold">{r.startTime} - {r.endTime}</span></div>}
                      {r.streak > 0 && <div className="text-swar-text">🔥 Streak: <span className="font-semibold">{r.streak} days</span></div>}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => openEdit(r)} className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition">Edit</button>
                    <button onClick={() => deleteRoutine(r.id)} className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition">Delete</button>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
      </>
      )}
      </div>
    </div>
  );
}

