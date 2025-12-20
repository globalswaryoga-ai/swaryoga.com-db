'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Check, Trash2, CheckCircle2, Circle, Camera, Pencil } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { Goal, HealthRoutine, Task, Vision } from '@/lib/types/lifePlanner';

type WorkshopCategory = 'self' | 'family' | 'workStudy' | 'parents' | 'friendsRelatives' | 'social';

interface WorkshopTask {
  id: string;
  category: WorkshopCategory;
  text: string;
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

type DailyHeroCard = 'workshop' | 'routine' | 'sadhana' | 'vision' | 'goals' | 'tasks';

const HERO_STORAGE_LEGACY_KEY = 'lifePlannerDailyHeroImage';
const HERO_STORAGE_PREFIX = 'lifePlannerDailyHeroImage:';
const DAILY_HERO_CARDS: DailyHeroCard[] = ['workshop', 'routine', 'sadhana', 'vision', 'goals', 'tasks'];

const HERO_DEFAULT_BY_CARD: Record<DailyHeroCard, string> = {
  workshop: '/images/life-planner/hero-workshop.svg',
  routine: '/images/life-planner/hero-routine.svg',
  sadhana: '/images/life-planner/hero-sadhana.svg',
  vision: '/images/life-planner/hero-vision.svg',
  goals: '/images/life-planner/hero-goals.svg',
  tasks: '/images/life-planner/hero-tasks.svg',
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

  const [workshopTasks, setWorkshopTasks] = useState<WorkshopTask[]>([]);
  const [newWorkshopTask, setNewWorkshopTask] = useState('');
  const [selectedWorkshopCategory, setSelectedWorkshopCategory] = useState<WorkshopCategory>('workStudy');
  const [workshopError, setWorkshopError] = useState<string>('');

  const heroFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeHeroCard, setActiveHeroCard] = useState<DailyHeroCard>('workshop');
  const [heroImgByCard, setHeroImgByCard] = useState<Record<DailyHeroCard, string>>(() => ({
    workshop: HERO_DEFAULT_BY_CARD.workshop,
    routine: HERO_DEFAULT_BY_CARD.routine,
    sadhana: HERO_DEFAULT_BY_CARD.sadhana,
    vision: HERO_DEFAULT_BY_CARD.vision,
    goals: HERO_DEFAULT_BY_CARD.goals,
    tasks: HERO_DEFAULT_BY_CARD.tasks,
  }));

  const workshopCategoryRefs = useRef<Record<WorkshopCategory, HTMLDivElement | null>>({
    self: null,
    family: null,
    workStudy: null,
    parents: null,
    friendsRelatives: null,
    social: null,
  });

  const sadhanaStorageKey = `dailySadhanaV2:${today}`;
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

    const sadhanaKey = `dailySadhanaV2:${today}`;

    // Load Workshop tasks (keep in effect to avoid hook dependency warnings)
    {
      const key = `dailyWorkshopPlannerTasks:${today}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        setWorkshopTasks(JSON.parse(stored));
      }
    }

    // Load Sadhana (per-day) and migrate legacy key if needed
    try {
      const storedV2 = localStorage.getItem(sadhanaKey);
      if (storedV2) {
        setSadhanaState(JSON.parse(storedV2));
        setSadhanaHasLoaded(true);
      } else {
        const legacy = localStorage.getItem('dailySadhana');
        if (legacy) {
          const legacyItems = JSON.parse(legacy) as Array<{
            id?: string;
            name?: string;
            frequency?: string;
            duration?: string;
            completed?: boolean;
          }>;

          const migrated: DailySadhanaState = {
            ...DEFAULT_SADHANA,
            morning: (Array.isArray(legacyItems) ? legacyItems : [])
              .filter((x) => typeof x?.name === 'string' && x.name.trim().length > 0)
              .map((x, idx) => ({
                id: `migr-${x.id || idx}-${Date.now()}`,
                name: String(x.name || '').trim(),
                frequency: String(x.frequency || '').trim(),
                duration: String(x.duration || '').trim(),
                completed: Boolean(x.completed),
              })),
          };

          // Try to parse water liters from a legacy "Water" item
          const waterItem = (Array.isArray(legacyItems) ? legacyItems : []).find(
            (x) => typeof x?.name === 'string' && x.name.toLowerCase().includes('water')
          );
          if (waterItem?.duration) {
            const match = String(waterItem.duration).match(/(\d+(?:\.\d+)?)/);
            if (match?.[1]) migrated.diet.waterLiters = Number(match[1]) || 0;
          }

          setSadhanaState(migrated);
          localStorage.setItem(sadhanaKey, JSON.stringify(migrated));
          setSadhanaHasLoaded(true);
        } else {
          setSadhanaState(DEFAULT_SADHANA);
          setSadhanaHasLoaded(true);
        }
      }
    } catch {
      setSadhanaHasLoaded(true);
    }

    // Load Vision/Goals/Tasks from Mongo-backed storage so Daily matches other dashboards.
    (async () => {
      try {
        const [savedVisions, savedGoals, savedTasks] = await Promise.all([
          lifePlannerStorage.getVisions(),
          lifePlannerStorage.getGoals(),
          lifePlannerStorage.getTasks(),
        ]);

        const nextVisions = Array.isArray(savedVisions) ? savedVisions : [];
        const nextGoals = Array.isArray(savedGoals) ? savedGoals : [];
        const nextTasks = Array.isArray(savedTasks) ? savedTasks : [];

        // Fallback: if storage returns empty, try older localStorage keys (offline/back-compat)
        if (nextVisions.length === 0) {
          try {
            const stored = localStorage.getItem('lifePlannerVision');
            if (stored) setVision(JSON.parse(stored));
          } catch {
            setVision([]);
          }
        } else {
          setVision(nextVisions);
        }

        if (nextGoals.length === 0) {
          try {
            const stored = localStorage.getItem('lifePlannerGoals');
            if (stored) setGoals(JSON.parse(stored));
          } catch {
            setGoals([]);
          }
        } else {
          setGoals(nextGoals);
        }

        if (nextTasks.length === 0) {
          try {
            const stored = localStorage.getItem('lifePlannerTasks');
            if (stored) setTasks(JSON.parse(stored));
          } catch {
            setTasks([]);
          }
        } else {
          setTasks(nextTasks);
        }
      } catch (e) {
        console.error('Error loading vision/goals/tasks:', e);
      }
    })();

    // Restore per-card hero images from localStorage (previously a single shared key).
    try {
      const legacy = localStorage.getItem(HERO_STORAGE_LEGACY_KEY);
      if (legacy) {
        // Migrate legacy shared hero image to card 1 only (workshop).
        localStorage.removeItem(HERO_STORAGE_LEGACY_KEY);
        try {
          localStorage.setItem(`${HERO_STORAGE_PREFIX}workshop`, legacy);
        } catch {
          // ignore
        }
      }

      setHeroImgByCard((prev) => {
        const next = { ...prev };
        for (const c of DAILY_HERO_CARDS) {
          const key = `${HERO_STORAGE_PREFIX}${c}`;
          const stored = localStorage.getItem(key);
          if (!stored) continue;
          // Migrate older default that doesn't exist anymore
          if (stored === '/images/swar-yoga-hero.jpg') {
            try {
              localStorage.removeItem(key);
            } catch {
              // ignore
            }
            next[c] = HERO_DEFAULT_BY_CARD[c];
          } else {
            next[c] = stored;
          }
        }
        return next;
      });
    } catch {
      // ignore
    }

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

  // Persist Sadhana when it changes (after initial load)
  useEffect(() => {
    if (!sadhanaHasLoaded) return;
    try {
      localStorage.setItem(sadhanaStorageKey, JSON.stringify(sadhanaState));
    } catch {
      // ignore
    }
  }, [sadhanaState, sadhanaHasLoaded, sadhanaStorageKey]);

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

  const onPickHeroImage = (cardId: DailyHeroCard) => {
    setActiveHeroCard(cardId);
    heroFileInputRef.current?.click();
  };

  const onHeroImageFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setWorkshopError('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setHeroImgByCard((prev) => ({ ...prev, [activeHeroCard]: result }));
      try {
        localStorage.setItem(`${HERO_STORAGE_PREFIX}${activeHeroCard}`, result);
      } catch {
        // If storage quota is exceeded, still show it for this session.
      }
    };
    reader.readAsDataURL(file);
  };

  const persistWorkshopTasks = (updated: WorkshopTask[]) => {
    setWorkshopTasks(updated);
    localStorage.setItem(getWorkshopStorageKey(), JSON.stringify(updated));
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
    return key === today;
  };

  const isWithinRange = (start?: string, end?: string) => {
    const s = toDayKey(start);
    const e = toDayKey(end);
    // If only one side exists, treat as exact match.
    if (s && !e) return s === today;
    if (!s && e) return e === today;
    if (!s && !e) return false;
    return s! <= today && today <= e!;
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

  const CardHeroHeader = ({
    cardId,
    badge,
    title,
    subtitle,
  }: {
    cardId: DailyHeroCard;
    badge: string;
    title: string;
    subtitle?: string;
  }) => {
    const src = heroImgByCard[cardId] || HERO_DEFAULT_BY_CARD[cardId];
    return (
      <div className="relative">
        <img
          src={src}
          alt="Life Planner"
          className="w-full h-40 sm:h-44 object-cover"
          onError={() => {
            if (src !== HERO_DEFAULT_BY_CARD[cardId]) {
              setHeroImgByCard((prev) => ({ ...prev, [cardId]: HERO_DEFAULT_BY_CARD[cardId] }));
              try {
                localStorage.removeItem(`${HERO_STORAGE_PREFIX}${cardId}`);
              } catch {
                // ignore
              }
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />

        {/* Badge like the screenshot (top-right) */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-full bg-emerald-600/95 px-4 py-1 text-xs font-bold tracking-wide text-white shadow">
            {badge}
          </span>
        </div>

        {/* Change image button (small icon) */}
        <button
          type="button"
          onClick={() => onPickHeroImage(cardId)}
          className="absolute top-3 left-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-swar-text shadow hover:bg-white transition"
          title="Change hero image"
          aria-label="Change hero image"
        >
          <Camera size={18} />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80 font-bold">{title}</p>
          {subtitle ? <p className="text-xs text-white/85 mt-1">{subtitle}</p> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Hidden file input for hero image picker */}
      <input
        ref={heroFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onHeroImageFileChange(file);
          // allow selecting the same file again
          e.currentTarget.value = '';
        }}
      />

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
          <CardHeroHeader
            cardId="workshop"
            badge="PROFESSIONAL"
            title="Daily Workshop Planner"
            subtitle={`Total Daily Works: ${workshopTotalLimit} • You’ve added ${workshopTasks.length}/${workshopTotalLimit}`}
          />

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
            <div className="mt-4 space-y-4 flex-grow max-h-80 sm:max-h-96 overflow-y-auto">
              {workshopCategories.map(cat => {
                const catTasks = workshopTasks.filter(t => t.category === cat.id);
                return (
                  <div
                    key={cat.id}
                    ref={(el) => {
                      workshopCategoryRefs.current[cat.id] = el;
                    }}
                    className="border-l-4 border-blue-400 pl-3"
                  >
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
          <CardHeroHeader
            cardId="routine"
            badge="WELLNESS"
            title="My Routine"
            subtitle="Your health routines summary & today’s checklist"
          />
          
          <div className="p-4 sm:p-6 flex flex-col flex-grow">
            <div className="mb-4 flex items-center justify-end">
              <a
                href="/life-planner/dashboard/health"
                className="rounded-full bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition text-xs font-semibold inline-flex items-center gap-2 shadow"
                title="Open Health"
              >
                <Plus size={16} />
                Open
              </a>
            </div>
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
                          <div className="flex flex-nowrap gap-2 mt-2 overflow-x-auto">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium whitespace-nowrap">🔥 {(r as any).streak || 0} streak</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs whitespace-nowrap">{(r.frequency || 'daily') as any}</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs whitespace-nowrap">{(Array.isArray((r as any).completedDates) ? (r as any).completedDates.length : 0)} completions</span>
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

          </div>
        </div>

        {/* Card 3: My Sadhana */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white overflow-hidden hover:shadow-md transition flex flex-col">
          <CardHeroHeader cardId="sadhana" badge="SPIRITUAL" title="My Sadhana" subtitle="Daily spiritual practices" />
          
          <div className="p-4 sm:p-6 flex flex-col flex-grow">
            <div className="space-y-5">
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
                    className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 sm:col-span-2"
                  />
                  <input
                    value={addMorningFrequency}
                    onChange={(e) => setAddMorningFrequency(e.target.value)}
                    placeholder="2 times"
                    className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    value={addMorningDuration}
                    onChange={(e) => setAddMorningDuration(e.target.value)}
                    placeholder="5 minutes"
                    className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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

              {/* Diet */}
              <div className="pt-1">
                <h3 className="text-sm font-bold text-swar-text mb-2">My Diet</h3>

                <div className="rounded-xl border border-swar-border p-3 space-y-3">
                  {/* Water */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-swar-text">Water</p>
                      <p className="text-xs text-swar-text-secondary">Add in liters</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setWaterLiters(Math.max(0, (sadhanaState.diet.waterLiters || 0) - 0.5))}
                        className="h-9 w-9 rounded-lg border border-swar-border hover:bg-gray-50 text-swar-text-secondary"
                        title="Minus 0.5L"
                      >
                        −
                      </button>
                      <div className="min-w-[84px] text-center">
                        <div className="text-sm font-bold text-swar-text">{(sadhanaState.diet.waterLiters || 0).toFixed(1)} L</div>
                        <div className="text-[11px] text-swar-text-secondary">today</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWaterLiters((sadhanaState.diet.waterLiters || 0) + 0.5)}
                        className="h-9 w-9 rounded-lg border border-swar-border hover:bg-gray-50 text-swar-text-secondary"
                        title="Add 0.5L"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Dryfruits */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-swar-text">Dryfruits Breakfast</p>
                      <p className="text-xs text-swar-text-secondary">Yes / No</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDryFruits(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                          sadhanaState.diet.dryFruitsBreakfast === true
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-swar-text border-swar-border hover:bg-gray-50'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDryFruits(false)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                          sadhanaState.diet.dryFruitsBreakfast === false
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-swar-text border-swar-border hover:bg-gray-50'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Herbal Drink */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-swar-text">Today’s Herbal Drink</p>
                        <p className="text-xs text-swar-text-secondary">Add and track</p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={herbalInput}
                        onChange={(e) => setHerbalInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addHerbalDrink();
                          }
                        }}
                        placeholder="Example: Tulsi tea"
                        className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={addHerbalDrink}
                        className="rounded-lg bg-purple-600 text-white px-4 py-2 hover:bg-purple-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>

                    {sadhanaState.diet.herbalDrinks.length === 0 ? (
                      <p className="text-xs text-swar-text-secondary italic mt-2">No herbal drink added today.</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {sadhanaState.diet.herbalDrinks.map((drink, idx) => (
                          <li key={`${drink}-${idx}`} className="flex items-center justify-between gap-2 rounded-lg border border-swar-border px-3 py-2">
                            <span className="text-sm text-swar-text truncate">{drink}</span>
                            <button
                              type="button"
                              onClick={() => deleteHerbalDrink(idx)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
