'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Briefcase,
  Cake,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flag,
  Plus,
  Target,
  Trophy,
  CheckSquare,
  ListTodo,
  BookOpen,
  ArrowLeft,
  Clock,
  Sparkles,
  Layers,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { ActionPlan, Goal, Reminder, Task, Todo, Vision, Word } from '@/lib/types/lifePlanner';
import LifePlannerImageUpload from '@/components/LifePlannerImageUpload';

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type CalendarItemType =
  | 'vision'
  | 'actionPlan'
  | 'goal'
  | 'task'
  | 'todo'
  | 'reminder'
  | 'word'
  | 'event';

export interface CalendarItem {
  id: string;
  type: CalendarItemType;
  subtype?: 'meeting' | 'event' | 'birthday';
  title: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  colorClass: string;
  icon: 'target' | 'flag' | 'trophy' | 'check' | 'todo' | 'bell' | 'book' | 'calendar' | 'briefcase' | 'cake';
}

interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
}

export const CATEGORY_THEMES: Record<
  CalendarItemType,
  {
    label: string;
    description: string;
    icon: CalendarItem['icon'];
    gradient: string;
    shadowColor: string;
    chipBg: string;
    chipText: string;
    chipBorder: string;
    barColor: string;
  }
> = {
  vision: {
    label: 'Vision',
    description: 'Visions & Dreams',
    icon: 'target',
    gradient: 'from-violet-500 via-indigo-500 to-purple-600',
    shadowColor: 'rgba(139, 92, 246, 0.35)',
    chipBg: 'bg-violet-50',
    chipText: 'text-violet-900',
    chipBorder: 'border-violet-200/90',
    barColor: 'from-violet-500 to-purple-600',
  },
  actionPlan: {
    label: 'Action Plan',
    description: 'Milestones & Steps',
    icon: 'flag',
    gradient: 'from-sky-400 via-blue-500 to-cyan-600',
    shadowColor: 'rgba(14, 165, 233, 0.35)',
    chipBg: 'bg-sky-50',
    chipText: 'text-sky-900',
    chipBorder: 'border-sky-200/90',
    barColor: 'from-sky-400 to-blue-600',
  },
  goal: {
    label: 'Goal',
    description: 'Target Goals',
    icon: 'trophy',
    gradient: 'from-amber-400 via-orange-400 to-amber-500',
    shadowColor: 'rgba(245, 158, 11, 0.35)',
    chipBg: 'bg-amber-50',
    chipText: 'text-amber-900',
    chipBorder: 'border-amber-200/90',
    barColor: 'from-amber-400 to-orange-500',
  },
  task: {
    label: 'Task',
    description: 'Tasks & Sprints',
    icon: 'check',
    gradient: 'from-emerald-400 via-teal-500 to-emerald-600',
    shadowColor: 'rgba(16, 185, 129, 0.35)',
    chipBg: 'bg-emerald-50',
    chipText: 'text-emerald-900',
    chipBorder: 'border-emerald-200/90',
    barColor: 'from-emerald-400 to-teal-600',
  },
  todo: {
    label: 'Todo',
    description: 'Daily Checklist',
    icon: 'todo',
    gradient: 'from-slate-500 via-slate-600 to-slate-700',
    shadowColor: 'rgba(100, 116, 139, 0.35)',
    chipBg: 'bg-slate-100',
    chipText: 'text-slate-800',
    chipBorder: 'border-slate-300',
    barColor: 'from-slate-400 to-slate-600',
  },
  reminder: {
    label: 'Reminder',
    description: 'Alerts & Due Dates',
    icon: 'bell',
    gradient: 'from-rose-500 via-pink-500 to-red-600',
    shadowColor: 'rgba(244, 63, 94, 0.35)',
    chipBg: 'bg-rose-50',
    chipText: 'text-rose-900',
    chipBorder: 'border-rose-200/90',
    barColor: 'from-rose-500 to-red-600',
  },
  word: {
    label: 'Word',
    description: 'Affirmations & Mantras',
    icon: 'book',
    gradient: 'from-fuchsia-500 via-purple-500 to-fuchsia-600',
    shadowColor: 'rgba(217, 70, 239, 0.35)',
    chipBg: 'bg-fuchsia-50',
    chipText: 'text-fuchsia-900',
    chipBorder: 'border-fuchsia-200/90',
    barColor: 'from-fuchsia-500 to-purple-600',
  },
  event: {
    label: 'Event',
    description: 'Meetings & Events',
    icon: 'calendar',
    gradient: 'from-blue-500 via-indigo-600 to-blue-700',
    shadowColor: 'rgba(59, 130, 246, 0.35)',
    chipBg: 'bg-blue-50',
    chipText: 'text-blue-900',
    chipBorder: 'border-blue-200/90',
    barColor: 'from-blue-500 to-indigo-600',
  },
};

const ICONS: Record<CalendarItem['icon'], React.ComponentType<{ className?: string }>> = {
  target: Target,
  flag: Flag,
  trophy: Trophy,
  check: CheckSquare,
  todo: ListTodo,
  bell: Bell,
  book: BookOpen,
  calendar: CalendarIcon,
  briefcase: Briefcase,
  cake: Cake,
};

function GlossyIconBadge({
  icon: Icon,
  gradient,
  shadowColor,
  size = 'md',
}: {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  shadowColor: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 rounded-lg text-xs',
    md: 'w-9 h-9 rounded-xl text-sm',
    lg: 'w-11 h-11 rounded-2xl text-base',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses} bg-gradient-to-b ${gradient} text-white transition-transform duration-200 overflow-hidden`}
      style={{
        boxShadow: `0 4px 10px ${shadowColor}, inset 0 1px 1px rgba(255, 255, 255, 0.65), inset 0 -1px 2px rgba(0, 0, 0, 0.2)`,
      }}
    >
      {/* Specular 3D highlight reflection arc */}
      <div className="absolute inset-x-1 top-0.5 h-[42%] rounded-t-lg bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none" />
      <Icon className={`${iconSizes} relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]`} />
    </div>
  );
}

const normalizeISO = (value: string | undefined | null): string => {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
};

const parseISO = (iso: string): Date => new Date(`${iso}T00:00:00`);

const isValidISO = (iso: string): boolean => {
  if (!iso) return false;
  const d = parseISO(iso);
  return !Number.isNaN(d.getTime());
};

export default function EnhancedCalendar({
  storageBackend = lifePlannerStorage,
  backUrl = '/life-planner/dashboard',
  backLabel = 'Back to Launchpad',
}: {
  storageBackend?: typeof lifePlannerStorage;
  backUrl?: string;
  backLabel?: string;
}) {
  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()));

  const [showTypes, setShowTypes] = useState<Record<CalendarItemType, boolean>>({
    vision: true,
    actionPlan: true,
    goal: true,
    task: true,
    todo: true,
    reminder: true,
    word: true,
    event: true,
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [customEvents, setCustomEvents] = useState<CalendarItem[]>([]);
  const [addForm, setAddForm] = useState({
    subtype: 'meeting' as 'meeting' | 'event' | 'birthday',
    title: '',
    startDate: '',
    endDate: '',
    addTodo: false,
    addReminder: false,
    imageUrl: '',
  });

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    (async () => {
      try {
        const mongoEvents = await storageBackend.getEvents();
        const list: CalendarItem[] = Array.isArray(mongoEvents) ? mongoEvents : [];
        setCustomEvents(
          list
            .filter((x: any) => x && typeof x.id === 'string' && x.type === 'event')
            .map((x: any) => {
              const subtype = x.subtype as CalendarItem['subtype'];
              const fallbackMeta =
                subtype === 'birthday'
                  ? { icon: 'cake' as const }
                  : subtype === 'meeting'
                  ? { icon: 'briefcase' as const }
                  : { icon: 'calendar' as const };
              const icon = ((): CalendarItem['icon'] => {
                const rawIcon = x.icon;
                if (['target', 'flag', 'trophy', 'check', 'todo', 'bell', 'book', 'calendar', 'briefcase', 'cake'].includes(rawIcon))
                  return rawIcon;
                return fallbackMeta.icon;
              })();
              const title = typeof x.title === 'string' && x.title.trim().length > 0 ? x.title : 'Event';
              return {
                ...x,
                title,
                startDate: normalizeISO(x.startDate),
                endDate: normalizeISO(x.endDate),
                imageUrl: typeof x.imageUrl === 'string' ? x.imageUrl : undefined,
                colorClass: 'bg-blue-600',
                icon,
              };
            })
        );
      } catch {
        setCustomEvents([]);
      }
    })();
  }, [storageBackend]);

  useEffect(() => {
    (async () => {
      const allItems: CalendarItem[] = [];

      const [mongoVisions, mongoPlans, mongoGoals, mongoTasks, mongoTodos, mongoReminders, mongoWords] =
        await Promise.all([
          storageBackend.getVisions(),
          storageBackend.getActionPlans(),
          storageBackend.getGoals(),
          storageBackend.getTasks(),
          storageBackend.getTodos(),
          storageBackend.getReminders(),
          storageBackend.getWords(),
        ]);

      const safeArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

      let visions: Vision[] = safeArray<Vision>(mongoVisions);
      let plans: ActionPlan[] = safeArray<ActionPlan>(mongoPlans);
      let goals: Goal[] = safeArray<Goal>(mongoGoals);
      let tasks: Task[] = safeArray<Task>(mongoTasks);
      let todos: Todo[] = safeArray<Todo>(mongoTodos);
      let reminders: Reminder[] = safeArray<Reminder>(mongoReminders);
      let words: Word[] = safeArray<Word>(mongoWords);

      // LocalStorage fallbacks for legacy/offline data
      const fallbackParse = <T,>(key: string): T[] => {
        try {
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };

      if (visions.length === 0) visions = fallbackParse<Vision>('lifePlannerVision');
      if (goals.length === 0) goals = fallbackParse<Goal>('lifePlannerGoals');
      if (tasks.length === 0) tasks = fallbackParse<Task>('lifePlannerTasks');
      if (todos.length === 0) todos = fallbackParse<Todo>('lifePlannerTodos');
      if (reminders.length === 0) reminders = fallbackParse<Reminder>('lifePlannerReminders');
      if (words.length === 0) words = fallbackParse<Word>('lifePlannerWords');

      visions.forEach((v) => {
        const start = normalizeISO(v.startDate || v.endDate || v.createdAt);
        const end = normalizeISO(v.endDate || v.startDate || v.createdAt);
        if (!isValidISO(start)) return;
        allItems.push({
          id: v.id,
          type: 'vision',
          title: v.title,
          startDate: start,
          endDate: isValidISO(end) ? end : undefined,
          colorClass: 'bg-violet-600',
          icon: CATEGORY_THEMES.vision.icon,
        });
      });

      plans.forEach((p) => {
        const start = normalizeISO(p.startDate || p.createdAt);
        const end = normalizeISO(p.endDate || p.startDate || p.createdAt);
        if (!isValidISO(start)) return;
        allItems.push({
          id: p.id,
          type: 'actionPlan',
          title: p.title,
          startDate: start,
          endDate: isValidISO(end) ? end : undefined,
          colorClass: 'bg-sky-600',
          icon: CATEGORY_THEMES.actionPlan.icon,
        });
      });

      goals.forEach((g) => {
        const start = normalizeISO(g.startDate || g.createdAt);
        const end = normalizeISO(g.targetDate || g.startDate || g.createdAt);
        if (!isValidISO(start)) return;
        allItems.push({
          id: g.id,
          type: 'goal',
          title: g.title,
          startDate: start,
          endDate: isValidISO(end) ? end : undefined,
          colorClass: 'bg-amber-500',
          icon: CATEGORY_THEMES.goal.icon,
        });
      });

      tasks.forEach((t) => {
        const start = normalizeISO(t.startDate);
        const end = normalizeISO(t.dueDate || t.startDate);
        if (!isValidISO(start)) return;
        allItems.push({
          id: t.id,
          type: 'task',
          title: t.title,
          startDate: start,
          endDate: isValidISO(end) ? end : undefined,
          colorClass: 'bg-emerald-600',
          icon: CATEGORY_THEMES.task.icon,
        });
      });

      todos.forEach((t) => {
        const start = normalizeISO(t.startDate);
        const end = normalizeISO(t.dueDate || t.startDate);
        if (!isValidISO(start)) return;
        allItems.push({
          id: t.id,
          type: 'todo',
          title: t.title,
          startDate: start,
          endDate: isValidISO(end) ? end : undefined,
          colorClass: 'bg-slate-600',
          icon: CATEGORY_THEMES.todo.icon,
        });
      });

      reminders.forEach((r) => {
        const start = normalizeISO(r.dueDate || r.startDate);
        if (!isValidISO(start)) return;
        allItems.push({
          id: r.id,
          type: 'reminder',
          title: r.title || r.description || 'Reminder',
          startDate: start,
          endDate: start,
          colorClass: 'bg-rose-600',
          icon: CATEGORY_THEMES.reminder.icon,
        });
      });

      words.forEach((w) => {
        const start = normalizeISO(w.startDate || w.endDate || w.createdAt);
        const end = normalizeISO(w.endDate || w.startDate || w.createdAt);
        if (!isValidISO(start)) return;
        allItems.push({
          id: w.id,
          type: 'word',
          title: w.title,
          startDate: start,
          endDate: isValidISO(end) ? end : undefined,
          colorClass: 'bg-fuchsia-600',
          icon: CATEGORY_THEMES.word.icon,
        });
      });

      customEvents.forEach((e) => allItems.push(e));
      setItems(allItems);
    })();
  }, [customEvents, storageBackend]);

  const isLineType = (t: CalendarItemType) => t === 'goal' || t === 'task' || t === 'event';
  const isLineItem = (item: CalendarItem) => isLineType(item.type);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const computedWeeks = Math.ceil((firstDayOfMonth + daysInMonth) / 7);
  const weeksToRender = Math.min(6, Math.max(5, computedWeeks));
  const totalCells = weeksToRender * 7;

  const calendarDays: CalendarDay[] = [];

  // Tail of previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    d.setDate(d.getDate() - (i + 1));
    calendarDays.push({ date: toISODate(d), isCurrentMonth: false });
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    calendarDays.push({ date: toISODate(d), isCurrentMonth: true });
  }

  // Head of next month
  const remainingDays = totalCells - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
    calendarDays.push({ date: toISODate(d), isCurrentMonth: false });
  }

  const getItemsForDate = (date: string) => {
    const checkDate = parseISO(date);
    return items
      .filter((item) => showTypes[item.type])
      .filter((item) => {
        const start = parseISO(item.startDate);
        const end = item.endDate ? parseISO(item.endDate) : start;
        if (isLineItem(item)) {
          return checkDate >= start && checkDate <= end;
        }
        return date === item.startDate;
      })
      .sort((a, b) => a.type.localeCompare(b.type));
  };

  const selectedItems = getItemsForDate(selectedDate);

  const typeCounts = useMemo(() => {
    const counts: Record<CalendarItemType, number> = {
      vision: 0,
      actionPlan: 0,
      goal: 0,
      task: 0,
      todo: 0,
      reminder: 0,
      word: 0,
      event: 0,
    };
    items.forEach((it) => {
      if (counts[it.type] !== undefined) counts[it.type]++;
    });
    return counts;
  }, [items]);

  const toggleAllTypes = () => {
    const allActive = Object.values(showTypes).every(Boolean);
    const nextVal = !allActive;
    setShowTypes({
      vision: nextVal,
      actionPlan: nextVal,
      goal: nextVal,
      task: nextVal,
      todo: nextVal,
      reminder: nextVal,
      word: nextVal,
      event: nextVal,
    });
  };

  const openAddForSelected = () => {
    const base = selectedDate || todayIso;
    setAddForm({
      subtype: 'event',
      title: '',
      startDate: base,
      endDate: '',
      addTodo: false,
      addReminder: false,
      imageUrl: '',
    });
    setIsAddOpen(true);
  };

  const saveCustomEvent = () => {
    const start = normalizeISO(addForm.startDate);
    const end = normalizeISO(addForm.endDate);
    if (!isValidISO(start)) return;

    const subtypeMeta =
      addForm.subtype === 'birthday'
        ? { icon: 'cake' as const }
        : addForm.subtype === 'meeting'
        ? { icon: 'briefcase' as const }
        : { icon: 'calendar' as const };

    const newItem: CalendarItem = {
      id: `evt-${Date.now()}`,
      type: 'event',
      subtype: addForm.subtype,
      title: addForm.title.trim() || (addForm.subtype === 'birthday' ? 'Birthday' : addForm.subtype === 'meeting' ? 'Meeting' : 'Event'),
      imageUrl: addForm.imageUrl.trim() || undefined,
      startDate: start,
      endDate: isValidISO(end) ? end : undefined,
      colorClass: 'bg-blue-600',
      icon: subtypeMeta.icon,
    };

    const nowIso = new Date().toISOString();
    const derivedTitle = newItem.title;

    if (addForm.addTodo) {
      const todo = {
        id: `todo-${Date.now()}`,
        title: derivedTitle,
        description: '',
        startDate: start,
        dueDate: isValidISO(end) ? end : start,
        priority: 'medium' as const,
        completed: false,
        category: 'event',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      storageBackend
        .getTodos()
        .then((existing) => (Array.isArray(existing) ? existing : []))
        .then((existing) => storageBackend.saveTodos([...existing, todo as any]))
        .catch(() => {});
    }

    if (addForm.addReminder) {
      const reminder = {
        id: `rem-${Date.now()}`,
        title: derivedTitle,
        description: '',
        startDate: start,
        dueDate: start,
        completed: false,
        imageUrl: newItem.imageUrl,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      storageBackend
        .getReminders()
        .then((existing) => (Array.isArray(existing) ? existing : []))
        .then((existing) => storageBackend.saveReminders([...existing, reminder as any]))
        .catch(() => {});
    }

    const next = [...customEvents, newItem];
    setCustomEvents(next);
    storageBackend.saveEvents(next).catch(() => {});
    setIsAddOpen(false);
  };

  const getRangeBarsForDate = (date: string) => {
    return getItemsForDate(date).filter((it) => isLineItem(it)).slice(0, 3);
  };

  const getIconsForDate = (date: string) => {
    return getItemsForDate(date).filter((it) => !isLineItem(it)).slice(0, 4);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayIso);
  };

  // Symbols list component
  const SymbolsFilterContent = (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Active Layers</span>
        <button
          type="button"
          onClick={toggleAllTypes}
          className="text-xs font-bold text-sky-600 hover:text-sky-700 active:scale-95 transition"
        >
          {Object.values(showTypes).every(Boolean) ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
        {(Object.keys(CATEGORY_THEMES) as CalendarItemType[]).map((t) => {
          const theme = CATEGORY_THEMES[t];
          const Icon = ICONS[theme.icon];
          const isChecked = showTypes[t];
          const count = typeCounts[t];

          return (
            <label
              key={t}
              onClick={() => setShowTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
              className={`group flex items-center justify-between gap-2.5 rounded-2xl p-2.5 border transition-all duration-200 cursor-pointer select-none ${
                isChecked
                  ? 'bg-white border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.95)]'
                  : 'bg-slate-50/70 border-slate-200/50 opacity-60 hover:opacity-90'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <GlossyIconBadge
                  icon={Icon}
                  gradient={theme.gradient}
                  shadowColor={theme.shadowColor}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate">{theme.label}</span>
                    <span className="text-[10px] font-bold text-slate-400">({count})</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate hidden xl:block">{theme.description}</p>
                </div>
              </div>

              {/* Custom 3D Checkbox indicator */}
              <div
                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                  isChecked
                    ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isChecked && <CheckSquare className="w-3.5 h-3.5" />}
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-3 rounded-2xl bg-gradient-to-br from-sky-50/80 to-indigo-50/80 p-3 border border-sky-100/90 shadow-xs">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
            <strong className="text-slate-800">Visual Cue:</strong> Goals, Tasks & Events appear as glossy colored milestone lines across dates. Visions & Mantras appear on their target date.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 3D Glossy Hero App Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-sky-50/30 to-indigo-50/30 backdrop-blur-xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_10px_25px_-5px_rgba(14,165,233,0.06),0_4px_6px_-2px_rgba(0,0,0,0.02),inset_0_1px_1px_rgba(255,255,255,0.95)]">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-bl from-sky-200/30 to-indigo-200/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left Title & Back button */}
          <div className="flex items-center gap-3 min-w-0">
            {backUrl && (
              <Link
                href={backUrl}
                className="relative inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:bg-slate-50 hover:shadow-md active:scale-95 transition-all text-slate-700 shrink-0"
                title={backLabel}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}

            <div className="flex items-center gap-3 min-w-0">
              <GlossyIconBadge
                icon={CalendarIcon}
                gradient="from-sky-500 via-blue-600 to-indigo-600"
                shadowColor="rgba(14, 165, 233, 0.4)"
                size="lg"
              />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate flex items-center gap-2">
                  <span>Calendar Overview</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium truncate">
                  View all visions, goals, tasks, reminders & milestones
                </p>
              </div>
            </div>
          </div>

          {/* Right Navigation & Add Action */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 self-stretch md:self-auto justify-between md:justify-end">
            {/* Month Navigation Pill */}
            <div className="flex items-center gap-1 bg-white/95 rounded-2xl p-1 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 active:scale-95 text-slate-700 transition flex items-center justify-center font-bold"
                title="Previous Month"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700" />
              </button>

              <button
                onClick={goToToday}
                className="px-2.5 py-1 text-xs font-black text-slate-800 hover:text-sky-600 transition min-w-[120px] sm:min-w-[140px] text-center"
                title="Jump to Current Month"
              >
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </button>

              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 active:scale-95 text-slate-700 transition flex items-center justify-center font-bold"
                title="Next Month"
              >
                <ChevronRight className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            {/* Quick Today Jump */}
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-2 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 active:scale-95 text-xs font-bold text-slate-700 shadow-xs transition"
              title="Jump to Today"
            >
              Today
            </button>

            {/* 3D Glossy Add Event Button */}
            <button
              type="button"
              onClick={openAddForSelected}
              className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-b from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white text-xs font-extrabold transition-all duration-150 overflow-hidden"
              style={{
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
              }}
              title="Add Item / Event"
            >
              <div className="absolute inset-x-1 top-0.5 h-[40%] rounded-t-xl bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
              <Plus className="w-4 h-4 relative z-10" />
              <span className="relative z-10">+ Add Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-Friendly Quick Filter Chips (Horizontal swipe on phones) */}
      <div className="lg:hidden bg-white/95 backdrop-blur-md rounded-2xl p-2.5 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            <span>Category Filters</span>
          </div>
          <button
            type="button"
            onClick={toggleAllTypes}
            className="text-[11px] font-bold text-sky-600 active:scale-95"
          >
            {Object.values(showTypes).every(Boolean) ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(Object.keys(CATEGORY_THEMES) as CalendarItemType[]).map((t) => {
            const theme = CATEGORY_THEMES[t];
            const Icon = ICONS[theme.icon];
            const isChecked = showTypes[t];
            const count = typeCounts[t];

            return (
              <button
                key={t}
                type="button"
                onClick={() => setShowTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 active:scale-95 ${
                  isChecked
                    ? `${theme.chipBg} ${theme.chipText} ${theme.chipBorder} shadow-xs`
                    : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-md flex items-center justify-center bg-gradient-to-b ${theme.gradient} text-white shadow-xs`}
                >
                  <Icon className="w-2.5 h-2.5" />
                </div>
                <span>{theme.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 3-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (Desktop Symbols & Legend) */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-4 bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_8px_20px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.95)] space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">Symbols & Filters</h3>
            </div>
            {SymbolsFilterContent}
          </div>
        </aside>

        {/* Center Column: The 3D Tactile Month Calendar Grid */}
        <main className="lg:col-span-6 bg-white/95 backdrop-blur-md rounded-3xl p-3 sm:p-5 border border-slate-200/80 shadow-[0_10px_25px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.95)]">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <div
                key={day}
                className={`text-center py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl ${
                  idx === 0 || idx === 6
                    ? 'text-rose-500 bg-rose-50/60'
                    : 'text-slate-600 bg-slate-100/70'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days 7-Col Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day, idx) => {
              const dayItems = getItemsForDate(day.date);
              const isSelected = day.date === selectedDate;
              const isToday = day.date === todayIso;

              const rangeBars = getRangeBarsForDate(day.date);
              const icons = getIconsForDate(day.date);
              const hiddenCount = Math.max(0, dayItems.length - (rangeBars.length + icons.length));

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`group relative min-h-[66px] sm:min-h-[104px] p-1.5 sm:p-2.5 rounded-2xl transition-all duration-200 flex flex-col items-stretch justify-start overflow-hidden text-left ${
                    isSelected
                      ? 'bg-gradient-to-b from-sky-50 via-white to-sky-50/50 border-2 border-sky-500 shadow-[0_8px_20px_rgba(14,165,233,0.22),inset_0_1px_1px_rgba(255,255,255,0.95)] ring-2 ring-sky-300/40 z-10 scale-[1.02]'
                      : isToday
                      ? 'bg-gradient-to-b from-amber-50/70 via-white to-amber-50/40 border-2 border-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,0.9)]'
                      : day.isCurrentMonth
                      ? 'bg-white/95 border border-slate-200/90 hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.85)]'
                      : 'bg-slate-50/60 border border-slate-100/60 text-slate-300 opacity-60'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`inline-flex items-center justify-center text-xs sm:text-sm font-black transition-colors ${
                        isSelected
                          ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-xs'
                          : isToday
                          ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-xs'
                          : day.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {parseInt(day.date.split('-')[2])}
                    </span>

                    {isToday && !isSelected && (
                      <span className="hidden sm:inline-block text-[9px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100/90 px-1 py-0.5 rounded-md">
                        Today
                      </span>
                    )}

                    {hiddenCount > 0 && (
                      <span className="text-[9px] sm:text-[10px] font-extrabold px-1 sm:px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                        +{hiddenCount}
                      </span>
                    )}
                  </div>

                  {/* Range Bars */}
                  <div className="mt-1 space-y-1 w-full">
                    {rangeBars.map((it) => {
                      const theme = CATEGORY_THEMES[it.type] || CATEGORY_THEMES.event;
                      const isStart = day.date === it.startDate;
                      const isEnd = day.date === (it.endDate || it.startDate);
                      return (
                        <div
                          key={it.id}
                          title={it.title}
                          className={`h-1.5 sm:h-2 w-full bg-gradient-to-r ${theme.barColor} shadow-[0_1px_2px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.6)] ${
                            isStart ? 'rounded-l-full' : ''
                          } ${isEnd ? 'rounded-r-full' : ''} ${isStart && isEnd ? 'rounded-full' : ''}`}
                        />
                      );
                    })}
                  </div>

                  {/* Single-day Glossy 3D icon bubbles */}
                  <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                    {icons.map((it) => {
                      const theme = CATEGORY_THEMES[it.type] || CATEGORY_THEMES.event;
                      const Icon = ICONS[it.icon] || CalendarIcon;
                      return (
                        <div
                          key={it.id}
                          title={it.title}
                          className={`relative inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-md sm:rounded-lg bg-gradient-to-b ${theme.gradient} text-white shadow-xs overflow-hidden`}
                          style={{
                            boxShadow: `0 2px 5px ${theme.shadowColor}, inset 0 1px 1px rgba(255,255,255,0.6)`,
                          }}
                        >
                          <div className="absolute inset-x-0.5 top-0 h-[40%] rounded-t-md bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
                          <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 relative z-10" />
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        {/* Right Column: Selected Date Details (Sticky on desktop, fluid on mobile) */}
        <aside className="lg:col-span-3">
          <div className="sticky top-4 bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_8px_24px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.95)] flex flex-col gap-4">
            {/* Selected Date Header */}
            <div className="pb-3 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">Selected Date</p>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedDate
                    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Select a Date'}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-sky-50 text-sky-700 border border-sky-200/90 shadow-xs">
                {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* List of items */}
            <div className="space-y-2.5 max-h-[380px] sm:max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
              {selectedItems.length > 0 ? (
                selectedItems.map((item) => {
                  const theme = CATEGORY_THEMES[item.type] || CATEGORY_THEMES.event;
                  const Icon = ICONS[item.icon] || CalendarIcon;

                  return (
                    <div
                      key={item.id}
                      className="group relative rounded-2xl p-3 bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start gap-2.5">
                        <GlossyIconBadge
                          icon={Icon}
                          gradient={theme.gradient}
                          shadowColor={theme.shadowColor}
                          size="md"
                        />
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${theme.chipBg} ${theme.chipText} border ${theme.chipBorder}`}
                            >
                              {theme.label}
                            </span>
                            {item.subtype && (
                              <span className="text-[10px] font-bold text-slate-500 capitalize">
                                • {item.subtype}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate group-hover:text-sky-600 transition-colors">
                            {item.title}
                          </p>

                          {item.imageUrl && (
                            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="h-20 w-full object-cover hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {item.endDate && item.endDate !== item.startDate
                                ? `${item.startDate} → ${item.endDate}`
                                : item.startDate}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl bg-slate-50/60 border border-dashed border-slate-200">
                  <div className="w-10 h-10 mx-auto rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400 mb-2">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No items on this date</p>
                  <p className="text-[11px] text-slate-400 mt-1">Tap below to add an event, meeting, or birthday.</p>
                </div>
              )}
            </div>

            {/* 3D Glossy Add Button */}
            <button
              type="button"
              onClick={openAddForSelected}
              className="w-full relative inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-gradient-to-b from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all duration-150 overflow-hidden"
              style={{
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div className="absolute inset-x-1 top-0.5 h-[40%] rounded-t-xl bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
              <Plus className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Add item for this date</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 3D Glossy Add Modal */}
      {isAddOpen ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-sky-50/50 via-white to-indigo-50/30">
              <div className="flex items-center gap-2.5">
                <GlossyIconBadge
                  icon={CalendarIcon}
                  gradient="from-sky-500 via-blue-600 to-indigo-600"
                  shadowColor="rgba(14, 165, 233, 0.35)"
                  size="sm"
                />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Add Calendar Item</h3>
                  <p className="text-[11px] text-slate-500">Meeting / Event / Birthday</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 transition flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'meeting', label: 'Meeting', icon: Briefcase },
                    { id: 'event', label: 'Event', icon: CalendarIcon },
                    { id: 'birthday', label: 'Birthday', icon: Cake },
                  ].map((sub) => {
                    const SubIcon = sub.icon;
                    const isCurrent = addForm.subtype === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setAddForm((p) => ({ ...p, subtype: sub.id as any }))}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition active:scale-95 ${
                          isCurrent
                            ? 'bg-sky-50 border-sky-500 text-sky-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <SubIcon className="w-3.5 h-3.5" />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  value={addForm.title}
                  onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Team Alignment Meeting / Annual Celebration"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <LifePlannerImageUpload
                  label="Thumbnail Image (optional)"
                  currentImageUrl={addForm.imageUrl}
                  onImageUrlChange={(url) => setAddForm((p) => ({ ...p, imageUrl: url }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={addForm.startDate}
                    onChange={(e) => setAddForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date (optional)</label>
                  <input
                    type="date"
                    value={addForm.endDate}
                    onChange={(e) => setAddForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <p className="text-xs font-extrabold text-slate-800">Auto-Sync Capabilities</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.addTodo}
                      onChange={(e) => setAddForm((p) => ({ ...p, addTodo: e.target.checked }))}
                      className="h-4 w-4 rounded-md accent-sky-600"
                    />
                    <span>Also create as Todo</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.addReminder}
                      onChange={(e) => setAddForm((p) => ({ ...p, addReminder: e.target.checked }))}
                      className="h-4 w-4 rounded-md accent-sky-600"
                    />
                    <span>Also create as Reminder</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white active:scale-95 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCustomEvent}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-xs font-extrabold text-white shadow-xs hover:from-sky-400 hover:to-blue-500 active:scale-95 transition"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
