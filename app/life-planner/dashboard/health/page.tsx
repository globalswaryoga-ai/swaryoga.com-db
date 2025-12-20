"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type {
  DailyHealthPlan,
  DailyMeals,
  DailyRoutineItem,
  HealthIntakeItem,
  HealthIntakeSection,
  HealthRoutine,
  MealSection,
} from '@/lib/types/lifePlanner';

const iso = (d: Date) => d.toISOString().split('T')[0];

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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{section.title}</h3>
          <p className="text-xs text-slate-600">Item name + start/end date + time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
          >
            + Add item
          </button>
          <button
            type="button"
            onClick={onDeleteSection}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {(section.items || []).map((it) => (
          <div key={it.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
              <div className="lg:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">Item name</label>
                <input
                  type="text"
                  value={it.name || ''}
                  onChange={(e) => updateItem(it.id, { name: e.target.value })}
                  placeholder="e.g. Ashwagandha / Honey lemon / Tablet"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Start date</label>
                <input
                  type="date"
                  value={it.startDate || ''}
                  onChange={(e) => updateItem(it.id, { startDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">End date</label>
                <input
                  type="date"
                  value={it.endDate || ''}
                  onChange={(e) => updateItem(it.id, { endDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Start time</label>
                <input
                  type="time"
                  value={it.startTime || ''}
                  onChange={(e) => updateItem(it.id, { startTime: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">End time</label>
                <input
                  type="time"
                  value={it.endTime || ''}
                  onChange={(e) => updateItem(it.id, { endTime: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="lg:col-span-12 flex justify-end">
                <button
                  type="button"
                  onClick={() => deleteItem(it.id)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
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

  // Categories management
  const [categories, setCategories] = useState<string[]>(['exercise', 'meditation', 'nutrition', 'sleep', 'other']);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'exercise',
    frequency: 'daily',
    dailyFrequency: 'daily',
    time: '09:00',
    startTime: '09:00',
    endTime: '10:00',
  });

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const loadDailyPlans = useCallback(async () => {
    setDailyLoading(true);
    try {
      const saved = await lifePlannerStorage.getDailyHealthPlans();
      const list = Array.isArray(saved) ? (saved as DailyHealthPlan[]) : [];
      // Ensure current date has a plan even after refresh
      const exists = !!activeDate && list.some((p) => p?.date === activeDate);
      setDailyPlans(exists || !activeDate ? list : [...list, createNewDailyPlan(activeDate)]);
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
      className="max-w-7xl mx-auto space-y-6"
      style={{ fontFamily: 'Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}
    >
      {error && (
        <div className="mb-4 p-4 bg-swar-primary-light border border-red-400 text-swar-primary rounded-lg">
          {error}
          <button 
            onClick={loadRoutines}
            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Page header + tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div
          className="px-6 py-5 border-b border-slate-200"
          style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(45,212,191,0.10) 45%, rgba(99,102,241,0.10) 100%)' }}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-600">Life Planner • Health</p>
          <div className="mt-1 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Health Planner</h1>
              <p className="mt-1 text-sm text-slate-600">Daily schedule + meals, plus your reusable health routines.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('daily')}
                className={
                  `rounded-lg px-4 py-2 text-sm font-semibold border transition ` +
                  (activeTab === 'daily'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50')
                }
              >
                Daily Plan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('routines')}
                className={
                  `rounded-lg px-4 py-2 text-sm font-semibold border transition ` +
                  (activeTab === 'routines'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50')
                }
              >
                Routines
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline create/edit (replaces modal) */}
      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 border border-slate-200">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{editingId ? 'Edit Often item' : 'Add Often item'}</h3>
              <p className="text-sm text-slate-600">Used inside the “Often” dropdown buttons.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRoutine}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="e.g. Yoga / Walk / Pranayama"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tracking frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm((prev) => ({ ...prev, frequency: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Often mode</label>
              <select
                value={form.dailyFrequency}
                onChange={(e) => setForm((prev) => ({ ...prev, dailyFrequency: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="custom">Custom time slot</option>
              </select>
            </div>

            {form.dailyFrequency !== 'custom' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              rows={2}
            />
          </div>
        </div>
      )}
      
      {/* Daily routine + meals */}
      {activeTab === 'daily' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: My 24 hours daily routines */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div
              className="px-6 py-5 border-b border-slate-200"
              style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(45,212,191,0.10) 45%, rgba(99,102,241,0.10) 100%)' }}
            >
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-slate-600">Health • Daily</p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">My 24 hours daily routines</h2>
                  <p className="mt-1 text-sm text-slate-600">Title + time + once/daily/custom time slot.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={activeDate}
                      onChange={(e) => setActiveDate(e.target.value)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  {/* Often dropdown buttons */}
                  <div className="mt-5">
                    <details ref={oftenDetailsRef} className="relative">
                      <summary className="cursor-pointer select-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                        Often ▾
                      </summary>

                      <div className="absolute right-0 mt-2 w-[320px] max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-xl p-2 z-30">
                        <div className="flex items-center justify-between gap-2 px-2 pb-2">
                          <div className="text-xs font-semibold text-slate-600">Select and add quickly</div>
                          <button
                            type="button"
                            onClick={() => {
                              closeOftenDropdown();
                              openCreate();
                            }}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            + New
                          </button>
                        </div>

                        <div className="max-h-72 overflow-auto">
                          {routines.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-slate-600">No Often items yet. Click “New”.</div>
                          ) : (
                            routines
                              .slice()
                              .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
                              .map((r) => (
                                <div
                                  key={r.id}
                                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
                                >
                                  <button
                                    type="button"
                                    onClick={() => addOftenToDayFrom(r)}
                                    className="min-w-0 text-left text-sm font-medium text-slate-900 hover:underline"
                                    title="Add to today"
                                  >
                                    {r.title || 'Untitled'}
                                    <div className="text-xs text-slate-500">
                                      {(r.dailyFrequency || 'daily')}{r.time ? ` • ${r.time}` : r.startTime ? ` • ${r.startTime}-${r.endTime || ''}` : ''}
                                    </div>
                                  </button>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        closeOftenDropdown();
                                        openEdit(r);
                                      }}
                                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        closeOftenDropdown();
                                        deleteRoutine(r.id);
                                      }}
                                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </details>
                  </div>

                  <button
                    type="button"
                    onClick={() => addRoutineItem(new Date().getHours())}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    <Plus className="h-5 w-5" /> Add
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    updatePlanForDate(activeDate, (plan) => {
                      if ((plan.routines || []).length > 0) {
                        alert('You already have routines for this date.');
                        return plan;
                      }
                      const template: DailyRoutineItem[] = Array.from({ length: 24 }).map((_, h) => ({
                        id: `dri-${Date.now()}-${h}`,
                        title: '',
                        notes: '',
                        startDate: activeDate,
                        endDate: activeDate,
                        frequency: 'daily',
                        startTime: formatHour(h),
                        endTime: formatHour((h + 1) % 24),
                      }));
                      return { ...plan, routines: template };
                    });
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Create 24 hours
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loadDailyPlans();
                    if (activeDate) ensurePlanExists(activeDate);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              {(activePlan?.routines || []).length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-600 italic">No routines yet. Click “Create 24 hours” or “Add”.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(activePlan?.routines || [])
                    .slice()
                    .sort((a, b) =>
                      (clampTime(a.startTime || a.time || '') || '99:99').localeCompare(
                        clampTime(b.startTime || b.time || '') || '99:99'
                      )
                    )
                    .map((it) => {
                      const freq = it.frequency || 'daily';
                      const isCustom = freq === 'custom';
                      return (
                        <div key={it.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                            <div className="lg:col-span-6">
                              <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                              <input
                                type="text"
                                value={it.title || ''}
                                onChange={(e) => updateRoutineItem(it.id, { title: e.target.value })}
                                placeholder="e.g. Yoga / Walk / Office / Meditation"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                              />
                            </div>

                            <div className="lg:col-span-3">
                              <label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
                              <select
                                value={freq}
                                onChange={(e) => {
                                  const next = e.target.value as any;
                                  if (next === 'custom') {
                                    updateRoutineItem(it.id, { frequency: next, time: '', startTime: it.startTime || formatHour(new Date().getHours()), endTime: it.endTime || formatHour((new Date().getHours() + 1) % 24) });
                                  } else {
                                    updateRoutineItem(it.id, { frequency: next, time: it.time || it.startTime || '', startTime: undefined, endTime: undefined });
                                  }
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                              >
                                <option value="once">Once</option>
                                <option value="daily">Daily</option>
                                <option value="custom">Custom time slot</option>
                              </select>
                            </div>

                            {!isCustom ? (
                              <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                                <input
                                  type="time"
                                  value={it.time || ''}
                                  onChange={(e) => updateRoutineItem(it.id, { time: e.target.value })}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="lg:col-span-2">
                                  <label className="block text-xs font-bold text-slate-700 mb-1">Start</label>
                                  <input
                                    type="time"
                                    value={it.startTime || ''}
                                    onChange={(e) => updateRoutineItem(it.id, { startTime: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                  />
                                </div>
                                <div className="lg:col-span-1">
                                  <label className="block text-xs font-bold text-slate-700 mb-1">End</label>
                                  <input
                                    type="time"
                                    value={it.endTime || ''}
                                    onChange={(e) => updateRoutineItem(it.id, { endTime: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                  />
                                </div>
                              </>
                            )}

                            <div className="lg:col-span-12 flex justify-end">
                              <button
                                type="button"
                                onClick={() => deleteRoutineItem(it.id)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Intake planner */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div
              className="px-6 py-5 border-b border-slate-200"
              style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.10) 0%, rgba(236,72,153,0.10) 50%, rgba(16,185,129,0.10) 100%)' }}
            >
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-slate-600">Health • Intake</p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Drinks, food & medicines</h2>
                  <p className="mt-1 text-sm text-slate-600">Herbal drink, tea/coffee, meals, medicines, sleeping drink… fully editable.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addCustomSection}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    + Add Section
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-4">
              {(intakeSections || []).map((sec) => (
                <IntakeSectionEditor
                  key={sec.id}
                  section={sec}
                  onChange={(next) => {
                    const list = (intakeSections || []).map((s) => (s.id === sec.id ? next : s));
                    updateIntakeSections(list);
                  }}
                  onDeleteSection={() => {
                    const ok = confirm(`Delete section "${sec.title}"?`);
                    if (!ok) return;
                    const list = (intakeSections || []).filter((s) => s.id !== sec.id);
                    updateIntakeSections(list);
                  }}
                />
              ))}
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
          {filteredRoutines.map(r => (
            <div key={r.id} className="w-80 bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
              <div className="relative h-48 overflow-hidden bg-emerald-600" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute top-3 left-3 w-6 h-6 rounded-full border-2 border-white bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/40 transition">
                  <input
                    type="checkbox"
                    checked={(r.completedDates || []).map((d) => String(d).slice(0, 10)).includes(todayISO)}
                    onChange={() => toggleRoutineDoneToday(r.id)}
                    className="w-4 h-4 rounded-full cursor-pointer"
                    aria-label="Mark done today"
                  />
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-swar-text mb-2 line-clamp-2">{r.title}</h3>
                <p className="text-sm text-swar-text-secondary mb-4 line-clamp-2">{r.description}</p>
                <div className="space-y-2 text-xs text-swar-text mb-auto">
                  {r.category && <div className="flex items-center gap-2">📂 {r.category}</div>}
                  <div className="flex items-center gap-2">🔁 {(r.frequency || 'daily').toUpperCase()}</div>
                  {r.streak > 0 && <div className="flex items-center gap-2">🔥 {r.streak} day streak</div>}
                </div>
              </div>

              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button onClick={() => openEdit(r)} className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">Edit</button>
                <button onClick={() => deleteRoutine(r.id)} className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
