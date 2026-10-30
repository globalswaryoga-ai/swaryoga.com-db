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
    emoji: string;
    gradient: string;
    shadowColor: string;
    cardBg: string;
    cardBorder: string;
    chipBg: string;
    chipText: string;
    chipBorder: string;
    barColor: string;
    badgeBg: string;
  }
> = {
  vision: {
    label: 'Vision',
    description: 'Visions & Dreams',
    icon: 'target',
    emoji: '🎯',
    gradient: 'from-purple-500 via-violet-600 to-indigo-700',
    shadowColor: 'rgba(139, 92, 246, 0.35)',
    cardBg: 'bg-gradient-to-r from-purple-100/90 via-violet-50 to-indigo-50/60',
    cardBorder: 'border-purple-300/90',
    chipBg: 'bg-purple-200/90',
    chipText: 'text-purple-950 font-black',
    chipBorder: 'border-purple-300',
    barColor: 'from-purple-500 via-violet-600 to-indigo-700',
    badgeBg: 'bg-purple-600 text-white',
  },
  actionPlan: {
    label: 'Action Plan',
    description: 'Milestones & Steps',
    icon: 'flag',
    emoji: '🚩',
    gradient: 'from-sky-500 via-blue-600 to-cyan-600',
    shadowColor: 'rgba(14, 165, 233, 0.35)',
    cardBg: 'bg-gradient-to-r from-sky-100/90 via-blue-50 to-cyan-50/60',
    cardBorder: 'border-sky-300/90',
    chipBg: 'bg-sky-200/90',
    chipText: 'text-sky-950 font-black',
    chipBorder: 'border-sky-300',
    barColor: 'from-sky-500 via-blue-600 to-cyan-600',
    badgeBg: 'bg-sky-600 text-white',
  },
  goal: {
    label: 'Goal',
    description: 'Target Goals',
    icon: 'trophy',
    emoji: '🏆',
    gradient: 'from-amber-400 via-orange-500 to-amber-600',
    shadowColor: 'rgba(245, 158, 11, 0.35)',
    cardBg: 'bg-gradient-to-r from-amber-100/90 via-orange-50 to-yellow-50/60',
    cardBorder: 'border-amber-300/90',
    chipBg: 'bg-amber-200/90',
    chipText: 'text-amber-950 font-black',
    chipBorder: 'border-amber-300',
    barColor: 'from-amber-400 via-orange-500 to-amber-600',
    badgeBg: 'bg-amber-600 text-white',
  },
  task: {
    label: 'Task',
    description: 'Tasks & Sprints',
    icon: 'check',
    emoji: '🏁',
    gradient: 'from-emerald-400 via-teal-500 to-emerald-600',
    shadowColor: 'rgba(16, 185, 129, 0.35)',
    cardBg: 'bg-gradient-to-r from-emerald-100/90 via-teal-50 to-green-50/60',
    cardBorder: 'border-emerald-300/90',
    chipBg: 'bg-emerald-200/90',
    chipText: 'text-emerald-950 font-black',
    chipBorder: 'border-emerald-300',
    barColor: 'from-emerald-400 via-teal-500 to-emerald-600',
    badgeBg: 'bg-emerald-600 text-white',
  },
  todo: {
    label: 'Todo',
    description: 'Daily Checklist',
    icon: 'todo',
    emoji: '📝',
    gradient: 'from-slate-600 via-slate-700 to-slate-800',
    shadowColor: 'rgba(100, 116, 139, 0.35)',
    cardBg: 'bg-gradient-to-r from-slate-100 via-slate-50 to-gray-100/60',
    cardBorder: 'border-slate-300',
    chipBg: 'bg-slate-200',
    chipText: 'text-slate-900 font-black',
    chipBorder: 'border-slate-300',
    barColor: 'from-slate-500 to-slate-700',
    badgeBg: 'bg-slate-700 text-white',
  },
  reminder: {
    label: 'Reminder',
    description: 'Alerts & Due Dates',
    icon: 'bell',
    emoji: '🔔',
    gradient: 'from-rose-500 via-red-500 to-rose-600',
    shadowColor: 'rgba(244, 63, 94, 0.35)',
    cardBg: 'bg-gradient-to-r from-rose-100/90 via-red-50 to-pink-50/60',
    cardBorder: 'border-rose-300/90',
    chipBg: 'bg-rose-200/90',
    chipText: 'text-rose-950 font-black',
    chipBorder: 'border-rose-300',
    barColor: 'from-rose-500 via-red-500 to-rose-600',
    badgeBg: 'bg-rose-600 text-white',
  },
  word: {
    label: 'Word',
    description: 'Affirmations & Mantras',
    icon: 'book',
    emoji: '📖',
    gradient: 'from-fuchsia-500 via-pink-600 to-purple-600',
    shadowColor: 'rgba(217, 70, 239, 0.35)',
    cardBg: 'bg-gradient-to-r from-fuchsia-100/90 via-pink-50 to-purple-50/60',
    cardBorder: 'border-fuchsia-300/90',
    chipBg: 'bg-fuchsia-200/90',
    chipText: 'text-fuchsia-950 font-black',
    chipBorder: 'border-fuchsia-300',
    barColor: 'from-fuchsia-500 via-pink-600 to-purple-600',
    badgeBg: 'bg-fuchsia-600 text-white',
  },
  event: {
    label: 'Event',
    description: 'Meetings & Events',
    icon: 'calendar',
    emoji: '📅',
    gradient: 'from-blue-600 via-indigo-600 to-cyan-700',
    shadowColor: 'rgba(37, 99, 235, 0.35)',
    cardBg: 'bg-gradient-to-r from-blue-100/90 via-indigo-50 to-sky-50/60',
    cardBorder: 'border-blue-300/90',
    chipBg: 'bg-blue-200/90',
    chipText: 'text-blue-950 font-black',
    chipBorder: 'border-blue-300',
    barColor: 'from-blue-600 via-indigo-600 to-cyan-700',
    badgeBg: 'bg-blue-600 text-white',
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

// 3D Pedestal Ring + Glassy Orb with Specular Crescent Reflection (Exact match to AppCircleCard)
function GlossyOrb({
  icon: IconComponent,
  emoji,
  gradient,
  size = 'md',
  shadowColor = 'rgba(0,0,0,0.15)',
}: {
  icon?: React.ComponentType<{ className?: string }>;
  emoji?: string;
  gradient: string;
  size?: 'sm' | 'md' | 'lg';
  shadowColor?: string;
}) {
  const outerSizes = {
    sm: 'p-[2px]',
    md: 'p-[2.5px]',
    lg: 'p-[3px]',
  }[size];

  const orbSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-13 h-13 text-xl',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  return (
    <div
      className={`rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-200 shrink-0 ${outerSizes} transition-all duration-200`}
      style={{
        boxShadow: `0 6px 14px ${shadowColor}, 0 2px 4px rgba(15,23,42,0.06), inset 0 1px 1px rgba(255,255,255,1)`,
      }}
    >
      <div
        className={`${orbSizes} rounded-full bg-gradient-to-tr ${gradient} text-white relative overflow-hidden flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-3px_5px_rgba(0,0,0,0.3)]`}
      >
        {/* Top Specular 3D Crescent Reflection */}
        <div className="absolute top-0 inset-x-1.5 h-[46%] bg-gradient-to-b from-white/70 to-transparent rounded-t-full pointer-events-none" />
        {emoji ? (
          <span className="select-none drop-shadow-sm leading-none">{emoji}</span>
        ) : IconComponent ? (
          <IconComponent className={`${iconSizes} stroke-[2.2] drop-shadow-sm relative z-10`} />
        ) : null}
      </div>
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

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    d.setDate(d.getDate() - (i + 1));
    calendarDays.push({ date: toISODate(d), isCurrentMonth: false });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    calendarDays.push({ date: toISODate(d), isCurrentMonth: true });
  }

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
        ? { icon: 'cake' as const, emoji: '🎂' }
        : addForm.subtype === 'meeting'
        ? { icon: 'briefcase' as const, emoji: '💼' }
        : { icon: 'calendar' as const, emoji: '📅' };

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

  const WEEKDAYS = [
    { label: 'SUN', bg: 'bg-rose-500 text-white shadow-xs' },
    { label: 'MON', bg: 'bg-sky-500 text-white shadow-xs' },
    { label: 'TUE', bg: 'bg-amber-500 text-white shadow-xs' },
    { label: 'WED', bg: 'bg-emerald-500 text-white shadow-xs' },
    { label: 'THU', bg: 'bg-indigo-500 text-white shadow-xs' },
    { label: 'FRI', bg: 'bg-purple-500 text-white shadow-xs' },
    { label: 'SAT', bg: 'bg-rose-500 text-white shadow-xs' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 max-w-7xl mx-auto">
      {/* ======================================================== */}
      {/* 🌅 Top Hero Header (Orange to Green Glossy 3D)           */}
      {/* ======================================================== */}
      <div className="p-4 sm:p-5 rounded-[26px] bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#059669] text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-[0_12px_32px_rgba(5,150,105,0.25),0_4px_16px_rgba(234,88,12,0.2)] border border-white/20 relative overflow-hidden">
        {/* Glossy top specular reflection */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent pointer-events-none rounded-t-[26px]" />
        {/* Subtle decorative background shine */}
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-white/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3.5 min-w-0">
          <GlossyOrb
            emoji="📅"
            gradient="from-orange-400 via-amber-500 to-emerald-500"
            size="lg"
            shadowColor="rgba(5,150,105,0.3)"
          />

          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight truncate drop-shadow-xs">
              <span>Calendar Overview</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/95 font-medium leading-relaxed truncate">
              Daily routine, visions, goals, tasks, reminders & milestones
            </p>
          </div>
        </div>

        {/* Right side controls: Back Button + Month Nav + Add Item */}
        <div className="relative z-10 flex items-center flex-wrap gap-2 sm:gap-2.5 self-stretch md:self-auto justify-between md:justify-end">
          {backUrl && (
            <Link
              href={backUrl}
              className="px-3.5 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 text-white flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider active:scale-95 transition shadow-sm"
              title={backLabel}
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Back</span>
            </Link>
          )}

          {/* Month Selector Pill */}
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-2xl p-1 border border-white/25 shadow-sm text-white">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-xl hover:bg-white/20 active:scale-95 text-white transition flex items-center justify-center font-bold"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-black text-white hover:text-emerald-200 transition min-w-[110px] sm:min-w-[130px] text-center"
              title="Jump to Current Month"
            >
              {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </button>

            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="w-8 h-8 rounded-xl hover:bg-white/20 active:scale-95 text-white transition flex items-center justify-center font-bold"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Jump to Today Button */}
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 text-white active:scale-95 text-xs font-bold shadow-sm transition"
            title="Jump to Today"
          >
            Today
          </button>

          {/* + Add Item Button */}
          <button
            type="button"
            onClick={openAddForSelected}
            className="px-4 py-2 rounded-2xl bg-white hover:bg-emerald-50 active:scale-95 text-[#059669] text-xs font-black transition-all shadow-[0_4px_14px_rgba(0,0,0,0.18)] flex items-center gap-1.5 shrink-0 border border-emerald-100"
            title="Add Item / Event"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Item</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Mobile-Friendly Quick Filter Chips (Horizontal swipe)   */}
      {/* ======================================================== */}
      <div className="lg:hidden rounded-[24px] p-3.5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] bg-white border border-slate-100">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Category Layers (Tap to Filter)</span>
          </p>
          <button
            type="button"
            onClick={toggleAllTypes}
            className="text-[11px] font-bold text-amber-700 active:scale-95"
          >
            {Object.values(showTypes).every(Boolean) ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(Object.keys(CATEGORY_THEMES) as CalendarItemType[]).map((t) => {
            const theme = CATEGORY_THEMES[t];
            const isChecked = showTypes[t];
            const count = typeCounts[t];

            return (
              <button
                key={t}
                type="button"
                onClick={() => setShowTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition-all shrink-0 active:scale-95 ${
                  isChecked
                    ? `${theme.cardBg} ${theme.cardBorder} shadow-sm`
                    : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                }`}
              >
                <GlossyOrb
                  emoji={theme.emoji}
                  gradient={theme.gradient}
                  size="sm"
                  shadowColor={theme.shadowColor}
                />
                <span className="font-black text-slate-800">{theme.label}</span>
                <span className="text-[10px] font-extrabold opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* Main 3-Column Layout                                     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ====================================================== */}
        {/* Left Column: Colorful Symbols & Layers Panel           */}
        {/* ====================================================== */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-4 rounded-[26px] p-4 sm:p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] bg-white border border-slate-100/90 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Symbols & Layers</h3>
              </div>
              <button
                type="button"
                onClick={toggleAllTypes}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 active:scale-95 transition"
              >
                {Object.values(showTypes).every(Boolean) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2">
              {(Object.keys(CATEGORY_THEMES) as CalendarItemType[]).map((t) => {
                const theme = CATEGORY_THEMES[t];
                const isChecked = showTypes[t];
                const count = typeCounts[t];

                return (
                  <div
                    key={t}
                    onClick={() => setShowTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
                    className={`group flex items-center justify-between gap-2.5 rounded-2xl p-2.5 border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
                      isChecked
                        ? `${theme.cardBg} ${theme.cardBorder} shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-md`
                        : 'bg-slate-50/70 border-slate-200/50 opacity-55 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GlossyOrb
                        emoji={theme.emoji}
                        gradient={theme.gradient}
                        size="md"
                        shadowColor={theme.shadowColor}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 truncate">{theme.label}</span>
                          <span className="text-[10px] font-bold text-slate-500">({count})</span>
                        </div>
                        <p className="text-[10px] text-slate-600 truncate">{theme.description}</p>
                      </div>
                    </div>

                    {/* Glowing Checkbox Pill */}
                    <div
                      className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                        isChecked
                          ? `${theme.badgeBg} border-transparent shadow-xs`
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <CheckSquare className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 border border-amber-200/80 shadow-xs">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
                  <strong className="text-amber-900">Visual Cue:</strong> Goals, Tasks & Events render as colorful milestone bars across their schedule. Visions & Mantras appear on their target date.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ====================================================== */}
        {/* Center Column: Colorful 3D Calendar Grid               */}
        {/* ====================================================== */}
        <main className="lg:col-span-6 rounded-[26px] p-3 sm:p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] bg-white border border-slate-100/90 space-y-3">
          {/* Weekday Headers in Vibrant Pill Capsules */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd.label}
                className={`text-center py-2 text-[11px] sm:text-xs font-black tracking-wider rounded-xl ${wd.bg}`}
              >
                {wd.label}
              </div>
            ))}
          </div>

          {/* 7-Column Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day, idx) => {
              const dayItems = getItemsForDate(day.date);
              const isSelected = day.date === selectedDate;
              const isToday = day.date === todayIso;
              const dayOfWeek = new Date(day.date + 'T00:00:00').getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              const rangeBars = getRangeBarsForDate(day.date);
              const icons = getIconsForDate(day.date);
              const hiddenCount = Math.max(0, dayItems.length - (rangeBars.length + icons.length));

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`group relative min-h-[68px] sm:min-h-[104px] p-1.5 sm:p-2.5 rounded-2xl transition-all duration-200 flex flex-col items-stretch justify-start overflow-hidden text-left cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white border-2 border-amber-300 shadow-[0_10px_25px_rgba(217,119,6,0.38)] ring-4 ring-amber-300/40 z-10 scale-[1.03]'
                      : isToday
                      ? 'bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 border-2 border-amber-500 shadow-[0_4px_16px_rgba(245,158,11,0.25)]'
                      : isWeekend && day.isCurrentMonth
                      ? 'bg-gradient-to-b from-rose-50/40 to-white border border-rose-200/70 hover:border-rose-400 hover:shadow-md'
                      : day.isCurrentMonth
                      ? 'bg-gradient-to-b from-white to-slate-50/40 border border-slate-200/90 hover:border-amber-400 hover:shadow-md shadow-[0_2px_5px_rgba(0,0,0,0.03)]'
                      : 'bg-slate-100/50 border border-slate-100 text-slate-300 opacity-50'
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`inline-flex items-center justify-center text-xs sm:text-sm font-black transition-colors ${
                        isSelected
                          ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white text-amber-900 shadow-md font-black'
                          : isToday
                          ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 text-white shadow-xs font-black'
                          : isWeekend && day.isCurrentMonth
                          ? 'text-rose-700'
                          : day.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {parseInt(day.date.split('-')[2])}
                    </span>

                    {isToday && !isSelected && (
                      <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-wider text-white bg-amber-600 px-1.5 py-0.5 rounded-full shadow-xs">
                        Today
                      </span>
                    )}

                    {hiddenCount > 0 && (
                      <span
                        className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/30 text-white border border-white/40'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
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
                          className={`h-1.5 sm:h-2 w-full bg-gradient-to-r ${theme.barColor} shadow-[0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.7)] ${
                            isSelected ? 'ring-1 ring-white/50' : ''
                          } ${isStart ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''} ${
                            isStart && isEnd ? 'rounded-full' : ''
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Single-Day Glossy 3D Orbs */}
                  <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                    {icons.map((it) => {
                      const theme = CATEGORY_THEMES[it.type] || CATEGORY_THEMES.event;
                      return (
                        <div key={it.id} title={it.title}>
                          <GlossyOrb
                            emoji={theme.emoji}
                            gradient={theme.gradient}
                            size="sm"
                            shadowColor={theme.shadowColor}
                          />
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        {/* ====================================================== */}
        {/* Right Column: Colorful Selected Date Details           */}
        {/* ====================================================== */}
        <aside className="lg:col-span-3">
          <div className="sticky top-4 rounded-[26px] p-4 sm:p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] bg-white border border-slate-100/90 space-y-4">
            {/* Selected Date Header (Orange to Green Glossy 3D) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#059669] text-white shadow-[0_6px_20px_rgba(5,150,105,0.25)] border border-white/20 relative overflow-hidden flex items-center justify-between">
              {/* Glossy top specular reflection */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-2xl" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Selected Date</p>
                <h3 className="text-base sm:text-lg font-black text-white drop-shadow-xs">
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
              <span className="relative z-10 px-2.5 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-xs">
                {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* List of Scheduled Items */}
            <div className="space-y-2.5 max-h-[380px] sm:max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
              {selectedItems.length > 0 ? (
                selectedItems.map((item) => {
                  const theme = CATEGORY_THEMES[item.type] || CATEGORY_THEMES.event;

                  return (
                    <div
                      key={item.id}
                      className={`group relative rounded-2xl p-3 border transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md ${theme.cardBg} ${theme.cardBorder}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <GlossyOrb
                          emoji={theme.emoji}
                          gradient={theme.gradient}
                          size="md"
                          shadowColor={theme.shadowColor}
                        />
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${theme.chipBg} ${theme.chipText} border ${theme.chipBorder}`}
                            >
                              {theme.label}
                            </span>
                            {item.subtype && (
                              <span className="text-[10px] font-bold text-slate-600 capitalize">
                                • {item.subtype}
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm font-black text-slate-900 mt-1 truncate">
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

                          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-600 font-bold">
                            <Clock className="w-3 h-3 text-slate-500" />
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
                <div className="text-center py-8 px-4 rounded-2xl bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-amber-50/50 border border-dashed border-amber-200">
                  <div className="w-12 h-12 mx-auto rounded-full bg-white shadow-sm border border-amber-200 flex items-center justify-center text-2xl mb-2">
                    ☀️
                  </div>
                  <p className="text-xs font-black text-slate-800">No items on this date</p>
                  <p className="text-[11px] text-slate-500 mt-1">Tap below to add an event, meeting, or birthday.</p>
                </div>
              )}
            </div>

            {/* + Add Item For This Date Button (Emerald Green - matching screenshot Save button) */}
            <button
              type="button"
              onClick={openAddForSelected}
              className="w-full relative inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs shadow-[0_6px_18px_rgba(16,185,129,0.35)] transition-all duration-150 overflow-hidden"
            >
              <div className="absolute inset-x-2 top-0.5 h-[40%] rounded-t-xl bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
              <Plus className="w-4 h-4 stroke-[3] relative z-10" />
              <span className="relative z-10 uppercase tracking-wider">Add Item for this date</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ======================================================== */}
      {/* 3D Add Item Modal                                        */}
      {/* ======================================================== */}
      {isAddOpen ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4.5 border-b border-white/20 flex items-center justify-between bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#059669] text-white relative overflow-hidden">
              {/* Glossy top specular reflection */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3">
                <GlossyOrb
                  emoji="📅"
                  gradient="from-orange-400 via-amber-500 to-emerald-500"
                  size="sm"
                />
                <div>
                  <h3 className="text-base font-black text-white">Add Calendar Item</h3>
                  <p className="text-[11px] text-white/90">Meeting / Event / Birthday</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="relative z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md active:scale-90 transition flex items-center justify-center text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'meeting', label: 'Meeting', emoji: '💼', icon: Briefcase },
                    { id: 'event', label: 'Event', emoji: '📅', icon: CalendarIcon },
                    { id: 'birthday', label: 'Birthday', emoji: '🎂', icon: Cake },
                  ].map((sub) => {
                    const isCurrent = addForm.subtype === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setAddForm((p) => ({ ...p, subtype: sub.id as any }))}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl border text-xs font-bold transition active:scale-95 ${
                          isCurrent
                            ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm font-black'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-base">{sub.emoji}</span>
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">Title</label>
                <input
                  value={addForm.title}
                  onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Team Alignment Meeting / Annual Celebration"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
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
                  <label className="block text-xs font-black text-slate-800 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={addForm.startDate}
                    onChange={(e) => setAddForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">End Date (optional)</label>
                  <input
                    type="date"
                    value={addForm.endDate}
                    onChange={(e) => setAddForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
                <p className="text-xs font-black text-amber-950">Auto-Sync Capabilities</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.addTodo}
                      onChange={(e) => setAddForm((p) => ({ ...p, addTodo: e.target.checked }))}
                      className="h-4 w-4 rounded-md accent-amber-600"
                    />
                    <span>Also create as Todo</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.addReminder}
                      onChange={(e) => setAddForm((p) => ({ ...p, addReminder: e.target.checked }))}
                      className="h-4 w-4 rounded-md accent-amber-600"
                    />
                    <span>Also create as Reminder</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3">
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
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-2 text-xs font-black text-white shadow-xs hover:from-emerald-500 hover:to-green-500 active:scale-95 transition"
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
