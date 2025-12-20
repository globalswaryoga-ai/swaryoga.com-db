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
} from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { ActionPlan, Goal, Reminder, Task, Todo, Vision, Word } from '@/lib/types/lifePlanner';

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type CalendarItemType =
  | 'vision'
  | 'actionPlan'
  | 'goal'
  | 'task'
  | 'todo'
  | 'reminder'
  | 'word'
  | 'event';

interface CalendarItem {
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

export default function EnhancedCalendar() {
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

  const TYPE_META: Record<CalendarItemType, { label: string; icon: CalendarItem['icon']; colorClass: string }> = {
    vision: { label: 'Vision', icon: 'target', colorClass: 'bg-[var(--dot-vision)]' },
    actionPlan: { label: 'Action Plan', icon: 'flag', colorClass: 'bg-[var(--dot-action)]' },
    goal: { label: 'Goal', icon: 'trophy', colorClass: 'bg-[var(--line-goal)]' },
    task: { label: 'Task', icon: 'check', colorClass: 'bg-[var(--line-task)]' },
    todo: { label: 'Todo', icon: 'todo', colorClass: 'bg-[var(--dot-todo)]' },
    reminder: { label: 'Reminder', icon: 'bell', colorClass: 'bg-[var(--dot-reminder)]' },
    word: { label: 'Word', icon: 'book', colorClass: 'bg-[var(--dot-word)]' },
    event: { label: 'Event', icon: 'calendar', colorClass: 'bg-[var(--line-event)]' },
  };

  const CUSTOM_EVENT_STORAGE_KEY = 'swar-life-planner-calendar-events';

  const normalizeISO = (value: string | undefined | null): string => {
    if (!value) return '';
    // Accept YYYY-MM-DD or ISO timestamps
    return value.length >= 10 ? value.slice(0, 10) : value;
  };

  const parseISO = (iso: string): Date => new Date(`${iso}T00:00:00`);

  const isValidISO = (iso: string): boolean => {
    if (!iso) return false;
    const d = parseISO(iso);
    return !Number.isNaN(d.getTime());
  };

  useEffect(() => {
    // Load custom events from localStorage (client-only)
    try {
      const raw = localStorage.getItem(CUSTOM_EVENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list: CalendarItem[] = Array.isArray(parsed) ? parsed : [];
      setCustomEvents(
        list
          .filter((x) => x && typeof x.id === 'string' && x.type === 'event')
          .map((x) => {
            const subtype = (x as any).subtype as CalendarItem['subtype'];
            const fallbackMeta =
              subtype === 'birthday'
                ? { icon: 'cake' as const, colorClass: 'bg-pink-600' }
                : subtype === 'meeting'
                ? { icon: 'briefcase' as const, colorClass: 'bg-swar-primary' }
                : { icon: 'calendar' as const, colorClass: 'bg-swar-accent' };

            // Events are rendered as range-lines (light blue) regardless of subtype.
            // Keep any saved icon/subtype, but standardize the color.
            const colorClass = TYPE_META.event.colorClass;
            const icon = ((): CalendarItem['icon'] => {
              const rawIcon = (x as any).icon;
              if (
                rawIcon === 'target' ||
                rawIcon === 'flag' ||
                rawIcon === 'trophy' ||
                rawIcon === 'check' ||
                rawIcon === 'todo' ||
                rawIcon === 'bell' ||
                rawIcon === 'book' ||
                rawIcon === 'calendar' ||
                rawIcon === 'briefcase' ||
                rawIcon === 'cake'
              ) {
                return rawIcon;
              }
              return fallbackMeta.icon;
            })();

            const title = typeof (x as any).title === 'string' && (x as any).title.trim().length > 0 ? (x as any).title : 'Event';

            return {
              ...x,
              title,
              startDate: normalizeISO((x as any).startDate),
              endDate: normalizeISO((x as any).endDate),
              imageUrl: typeof (x as any).imageUrl === 'string' ? (x as any).imageUrl : undefined,
              colorClass,
              icon,
            };
          })
      );
    } catch {
      setCustomEvents([]);
    }
  }, []);

  useEffect(() => {
    // Load planner data (Mongo storage) + merge legacy localStorage fallback.
    (async () => {
      const allItems: CalendarItem[] = [];

      const [mongoVisions, mongoPlans, mongoGoals, mongoTasks, mongoTodos, mongoReminders, mongoWords] =
        await Promise.all([
          lifePlannerStorage.getVisions(),
          lifePlannerStorage.getActionPlans(),
          lifePlannerStorage.getGoals(),
          lifePlannerStorage.getTasks(),
          lifePlannerStorage.getTodos(),
          lifePlannerStorage.getReminders(),
          lifePlannerStorage.getWords(),
        ]);

      const safeArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

      let visions: Vision[] = safeArray<Vision>(mongoVisions);
      let plans: ActionPlan[] = safeArray<ActionPlan>(mongoPlans);
      let goals: Goal[] = safeArray<Goal>(mongoGoals);
      let tasks: Task[] = safeArray<Task>(mongoTasks);
      let todos: Todo[] = safeArray<Todo>(mongoTodos);
      let reminders: Reminder[] = safeArray<Reminder>(mongoReminders);
      let words: Word[] = safeArray<Word>(mongoWords);

      // Fallback for older/offline keys (back-compat)
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
          colorClass: TYPE_META.vision.colorClass,
          icon: TYPE_META.vision.icon,
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
          colorClass: TYPE_META.actionPlan.colorClass,
          icon: TYPE_META.actionPlan.icon,
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
          colorClass: TYPE_META.goal.colorClass,
          icon: TYPE_META.goal.icon,
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
          colorClass: TYPE_META.task.colorClass,
          icon: TYPE_META.task.icon,
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
          colorClass: TYPE_META.todo.colorClass,
          icon: TYPE_META.todo.icon,
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
          colorClass: TYPE_META.reminder.colorClass,
          icon: TYPE_META.reminder.icon,
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
          colorClass: TYPE_META.word.colorClass,
          icon: TYPE_META.word.icon,
        });
      });

      // Merge in custom events
      customEvents.forEach((e) => allItems.push(e));

      setItems(allItems);
    })();
  }, [customEvents]);

  // Goals / Tasks / Events should display as (thin) lines on the calendar.
  // Vision / Action Plan (and other types) show as a symbol on their start date.
  const isLineType = (t: CalendarItemType) => t === 'goal' || t === 'task' || t === 'event';
  const isLineItem = (item: CalendarItem) => isLineType(item.type);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const computedWeeks = Math.ceil((firstDayOfMonth + daysInMonth) / 7);
  // User asked for 5 weeks; render 5 for most months but expand to 6 when needed.
  const weeksToRender = Math.min(6, Math.max(5, computedWeeks));
  const totalCells = weeksToRender * 7;

  const calendarDays: CalendarDay[] = [];

  // Fill previous month's tail
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

  // Next month's head
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

        // Lines for Goals / Tasks / Events across the range.
        // Single-day items still render as a 1-day line (start == end).
        if (isLineItem(item)) {
          return checkDate >= start && checkDate <= end;
        }

        // Otherwise, show the item only on its start date.
        return date === item.startDate;
      })
      .sort((a, b) => a.type.localeCompare(b.type));
  };

  const selectedItems = getItemsForDate(selectedDate);

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

  const openAddEvent = () => {
    openAddForSelected();
  };

  const LOCAL_TODOS_KEY = 'lifePlannerTodos';
  const LOCAL_REMINDERS_KEY = 'lifePlannerReminders';

  const appendLocalArray = <T,>(key: string, item: T) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      const list: T[] = Array.isArray(parsed) ? parsed : [];
      list.push(item);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // ignore
    }
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
      colorClass: TYPE_META.event.colorClass,
      icon: subtypeMeta.icon,
    };

    // Optional: also create a Todo and/or Reminder from the event.
    // We persist to Mongo (if signed in) and also update local fallback keys.
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

      appendLocalArray(LOCAL_TODOS_KEY, todo);
      lifePlannerStorage
        .getTodos()
        .then((existing) => (Array.isArray(existing) ? existing : []))
        .then((existing) => lifePlannerStorage.saveTodos([...existing, todo as any]))
        .catch(() => {
          // ignore
        });
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

      appendLocalArray(LOCAL_REMINDERS_KEY, reminder);
      lifePlannerStorage
        .getReminders()
        .then((existing) => (Array.isArray(existing) ? existing : []))
        .then((existing) => lifePlannerStorage.saveReminders([...existing, reminder as any]))
        .catch(() => {
          // ignore
        });
    }

    const next = [...customEvents, newItem];
    setCustomEvents(next);
    try {
      localStorage.setItem(CUSTOM_EVENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setIsAddOpen(false);
  };

  const getRangeBarsForDate = (date: string) => {
    const list = getItemsForDate(date).filter((it) => isLineItem(it));
    return list.slice(0, 3);
  };

  const getIconsForDate = (date: string) => {
    // icons can simply render for everything that is not a line item.
    const list = getItemsForDate(date).filter((it) => !isLineItem(it));
    return list.slice(0, 4);
  };

  const LegendBody = (
    <>
      <div className="space-y-2">
        {(Object.keys(TYPE_META) as CalendarItemType[]).map((t) => {
          const meta = TYPE_META[t];
          const Icon = ICONS[meta.icon];
          return (
            <label
              key={t}
              className="flex items-center justify-between gap-3 rounded-xl border border-swar-border px-3 py-2 hover:bg-swar-primary-light transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${meta.colorClass} text-white`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-swar-text truncate">{meta.label}</span>
              </div>
              <input
                type="checkbox"
                checked={showTypes[t]}
                onChange={(e) => setShowTypes((prev) => ({ ...prev, [t]: e.target.checked }))}
                className="h-4 w-4 accent-swar-primary"
              />
            </label>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-swar-primary-light p-3 border border-swar-border">
        <p className="text-xs text-swar-text-secondary">
          Tip: Range items (Goals / Tasks / Events) show as colored lines across dates.
        </p>
      </div>
    </>
  );

  const SelectedDateBody = (
    <>
      <div className="space-y-3 max-h-72 sm:max-h-96 overflow-y-auto">
        {selectedItems.length > 0 ? (
          selectedItems.map((item) => (
            <div key={item.id} className="rounded-lg p-3 border border-swar-border">
              <div className="flex items-start gap-2">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.colorClass} text-white flex-shrink-0`}>
                  {(() => {
                    const Icon = ICONS[item.icon];
                    return <Icon className="h-5 w-5" />;
                  })()}
                </span>
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-semibold text-swar-text-secondary uppercase">{item.type}</p>
                  <p className="text-sm font-semibold text-swar-text truncate">{item.title}</p>
                      {item.imageUrl ? (
                        <div className="mt-2">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-16 w-full object-cover rounded-lg border border-swar-border"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                  {item.endDate && item.endDate !== item.startDate ? (
                    <p className="text-[11px] text-swar-text-secondary mt-0.5">
                      {item.startDate} → {item.endDate}
                    </p>
                  ) : (
                    <p className="text-[11px] text-swar-text-secondary mt-0.5">{item.startDate}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-swar-text-secondary italic text-center py-4">No items scheduled for this date</p>
        )}
      </div>

      <button
        type="button"
        onClick={openAddForSelected}
        className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-3 bg-swar-primary text-white rounded-xl hover:bg-swar-primary-dark transition text-sm font-semibold"
      >
        <Plus size={16} />
        Add item
      </button>
    </>
  );

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-swar-primary-light to-blue-50 rounded-3xl p-4 sm:p-6 border border-swar-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-swar-primary">Calendar Overview</h1>
            <p className="text-xs sm:text-sm text-swar-text-secondary mt-1">View all visions, goals, tasks, reminders, and milestones</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openAddEvent}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-swar-accent px-3 py-2 text-white font-semibold hover:opacity-90 transition"
              title="Add event"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="p-2 rounded-lg hover:bg-white transition"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-swar-primary" />
            </button>
            <span className="text-sm sm:text-lg font-semibold text-swar-text min-w-[120px] sm:min-w-[150px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="p-2 rounded-lg hover:bg-white transition"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-swar-primary" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mobile: collapsible details + legend */}
        <details className="order-3 lg:hidden bg-white rounded-2xl border border-swar-border overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer select-none font-bold text-swar-text">Symbols & filters</summary>
          <div className="px-4 pb-4">{LegendBody}</div>
        </details>

        {/* Desktop: sticky legend */}
        <aside className="hidden lg:block order-3 lg:order-1 lg:col-span-3 bg-white rounded-2xl p-4 border border-swar-border h-fit lg:sticky lg:top-4">
          <h3 className="text-sm font-bold text-swar-text mb-3">Symbols</h3>
          {LegendBody}
        </aside>

        {/* Calendar Grid */}
        <div className="order-1 lg:order-2 lg:col-span-6 bg-white rounded-2xl p-4 border border-swar-border">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-swar-text-secondary py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
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
                  onClick={() => setSelectedDate(day.date)}
                  className={`h-[76px] sm:h-[104px] rounded-xl p-1.5 sm:p-2 border-2 transition flex flex-col items-stretch justify-start text-[11px] sm:text-xs overflow-hidden ${
                    isSelected
                      ? 'border-swar-primary bg-swar-primary-light'
                      : isToday
                      ? 'border-swar-accent bg-orange-50'
                      : day.isCurrentMonth
                      ? 'border-gray-200 bg-white hover:border-swar-primary hover:bg-swar-primary-light'
                      : 'border-gray-100 bg-gray-50 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${day.isCurrentMonth ? 'text-swar-text' : 'text-gray-400'}`}>
                    {parseInt(day.date.split('-')[2])}
                    </span>
                    {hiddenCount > 0 ? (
                      <span className="text-[10px] font-bold text-swar-primary">+{hiddenCount}</span>
                    ) : null}
                  </div>

                  {/* Range bars */}
                  <div className="mt-1 space-y-1">
                    {rangeBars.map((it) => {
                      const start = it.startDate;
                      const end = it.endDate || it.startDate;
                      const isStart = day.date === start;
                      const isEnd = day.date === end;
                      return (
                        <div
                          key={it.id}
                          title={it.title}
                          className={`h-[4px] w-full ${it.colorClass} ${isStart ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''} ${
                            isStart && isEnd ? 'rounded-full' : ''
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Icons for single-day items */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {icons.map((it) => {
                      const Icon = ICONS[it.icon];
                      return (
                        <span
                          key={it.id}
                          title={it.title}
                          className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg ${it.colorClass} text-white`}
                        >
                          <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile: collapsible selected date details */}
        <details className="order-2 lg:hidden bg-white rounded-2xl border border-swar-border overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer select-none font-bold text-swar-primary">
            {selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Selected date'}
          </summary>
          <div className="px-4 pb-4">{SelectedDateBody}</div>
        </details>

        {/* Desktop: sticky selected date details */}
        <div className="hidden lg:block order-2 lg:order-3 lg:col-span-3 bg-white rounded-2xl p-4 border border-swar-border h-fit lg:sticky lg:top-4">
          <h3 className="text-lg font-bold text-swar-primary mb-4">
            {selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Selected date'}
          </h3>
          {SelectedDateBody}
        </div>
      </div>

      {/* Add modal */}
      {isAddOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-swar-border shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-swar-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-swar-text">Add calendar item</h3>
                <p className="text-xs text-swar-text-secondary">Meeting / Event / Birthday</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-swar-text-secondary hover:bg-swar-primary-light"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-swar-text mb-1">Type</label>
                <select
                  value={addForm.subtype}
                  onChange={(e) => setAddForm((p) => ({ ...p, subtype: e.target.value as any }))}
                  className="w-full rounded-xl border border-swar-border bg-white px-3 py-2"
                >
                  <option value="meeting">Meeting</option>
                  <option value="event">Event</option>
                  <option value="birthday">Birthday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-swar-text mb-1">Title</label>
                <input
                  value={addForm.title}
                  onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Parents meeting / My birthday"
                  className="w-full rounded-xl border border-swar-border bg-white px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-swar-text mb-1">Image (optional)</label>
                <input
                  value={addForm.imageUrl}
                  onChange={(e) => setAddForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="Paste image URL"
                  className="w-full rounded-xl border border-swar-border bg-white px-3 py-2"
                />
                <p className="mt-1 text-[11px] text-swar-text-secondary">Tip: you can paste a link to an image.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-swar-text mb-1">Start date</label>
                  <input
                    type="date"
                    value={addForm.startDate}
                    onChange={(e) => setAddForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full rounded-xl border border-swar-border bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-swar-text mb-1">End date (optional)</label>
                  <input
                    type="date"
                    value={addForm.endDate}
                    onChange={(e) => setAddForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full rounded-xl border border-swar-border bg-white px-3 py-2"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-swar-border p-3">
                <p className="text-xs font-bold text-swar-text">Also add</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm text-swar-text">
                    <input
                      type="checkbox"
                      checked={addForm.addTodo}
                      onChange={(e) => setAddForm((p) => ({ ...p, addTodo: e.target.checked }))}
                      className="h-4 w-4 accent-swar-primary"
                    />
                    Add Todo
                  </label>
                  <label className="flex items-center gap-2 text-sm text-swar-text">
                    <input
                      type="checkbox"
                      checked={addForm.addReminder}
                      onChange={(e) => setAddForm((p) => ({ ...p, addReminder: e.target.checked }))}
                      className="h-4 w-4 accent-swar-primary"
                    />
                    Add Reminder
                  </label>
                </div>
                <p className="mt-2 text-[11px] text-swar-text-secondary">
                  If enabled, a Todo/Reminder will be created using the same title and dates.
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-swar-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl border border-swar-border px-4 py-2 font-semibold text-swar-text hover:bg-swar-primary-light"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCustomEvent}
                className="rounded-xl bg-swar-primary px-4 py-2 font-semibold text-white hover:bg-swar-primary-dark"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
