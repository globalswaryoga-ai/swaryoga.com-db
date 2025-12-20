'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import EventModal, { type EventSubtype, type PlannerEvent } from './EventModal';
import type { Reminder, Todo } from '@/lib/types/lifePlanner';

const EVENTS_STORAGE_KEY = 'swar-life-planner-calendar-events';
const LOCAL_TODOS_KEY = 'lifePlannerTodos';
const LOCAL_REMINDERS_KEY = 'lifePlannerReminders';

const DEFAULT_IMAGE = 'https://i.postimg.cc/Y0zjsTd2/image.jpg';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function normalizeISO(value: string | undefined | null): string {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function isValidISO(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export default function LifePlannerEventsPage() {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubtype, setFilterSubtype] = useState<EventSubtype | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<(typeof MONTHS)[number] | 'all'>('all');
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);

    const list = readArray<PlannerEvent>(EVENTS_STORAGE_KEY)
      .filter((x) => x && x.type === 'event' && typeof x.id === 'string')
      .map((x) => ({
        ...x,
        startDate: normalizeISO(x.startDate),
        endDate: normalizeISO(x.endDate),
        imageUrl: typeof (x as any).imageUrl === 'string' ? (x as any).imageUrl : undefined,
      }));
    setEvents(list);
    setHasLoaded(true);

    (async () => {
      try {
        const [mongoTodos, mongoReminders] = await Promise.all([
          lifePlannerStorage.getTodos(),
          lifePlannerStorage.getReminders(),
        ]);

        const safeArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
        let t = safeArray<Todo>(mongoTodos);
        let r = safeArray<Reminder>(mongoReminders);

        // Back-compat fallback for offline/local mode
        if (t.length === 0) t = readArray<Todo>(LOCAL_TODOS_KEY);
        if (r.length === 0) r = readArray<Reminder>(LOCAL_REMINDERS_KEY);

        setTodos(t);
        setReminders(r);
      } catch {
        setTodos(readArray<Todo>(LOCAL_TODOS_KEY));
        setReminders(readArray<Reminder>(LOCAL_REMINDERS_KEY));
      }
    })();
  }, []);

  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    writeArray(EVENTS_STORAGE_KEY, events);
  }, [events, mounted, hasLoaded]);

  const sorted = useMemo(() => [...events].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')), [events]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredEvents = useMemo(() => {
    return sorted.filter((evt) => {
      const haystack = `${evt.title || ''}`.toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);
      const matchesSubtype = filterSubtype === 'all' || evt.subtype === filterSubtype;

      const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth as any);
      const date = evt.startDate ? new Date(`${evt.startDate}T00:00:00`) : null;
      const matchesMonth = monthIdx === null || (date && !Number.isNaN(date.getTime()) && date.getMonth() === monthIdx);

      return matchesSearch && matchesSubtype && matchesMonth;
    });
  }, [sorted, normalizedSearch, filterSubtype, filterMonth]);

  const handleAdd = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (evt: PlannerEvent) => {
    setEditingEvent(evt);
    setIsModalOpen(true);
  };

  const remove = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const appendLocal = (key: string, item: any) => {
    const list = readArray<any>(key);
    list.push(item);
    writeArray(key, list);
  };

  const handleSave = async (
    payload: PlannerEvent,
    options: {
      todos: Array<{ title: string; date: string; time: string }>;
      reminder?: { date: string; time: string; frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' };
    }
  ) => {
    const start = normalizeISO(payload.startDate);
    const end = normalizeISO(payload.endDate);
    if (!isValidISO(start)) return;

    const subtypeMeta =
      payload.subtype === 'birthday'
        ? { icon: 'cake', colorClass: 'bg-pink-600' }
        : payload.subtype === 'meeting'
        ? { icon: 'briefcase', colorClass: 'bg-swar-primary' }
        : { icon: 'calendar', colorClass: 'bg-swar-accent' };

    const normalized: PlannerEvent = {
      ...payload,
      startDate: start,
      endDate: isValidISO(end) ? end : undefined,
      imageUrl: payload.imageUrl?.trim() ? payload.imageUrl.trim() : undefined,
      icon: subtypeMeta.icon,
      colorClass: subtypeMeta.colorClass,
    };

    setEvents((prev) => {
      const exists = prev.some((e) => e.id === normalized.id);
      return exists ? prev.map((e) => (e.id === normalized.id ? normalized : e)) : [...prev, normalized];
    });

    const nowIso = new Date().toISOString();

    const todosToCreate = Array.isArray(options.todos) ? options.todos : [];
    if (todosToCreate.length > 0) {
      const createdTodos: Todo[] = todosToCreate
        .map((t, idx) => {
          const date = normalizeISO(t.date) || normalized.startDate;
          const time = (t.time || '11:00').trim() || '11:00';
          const title = (t.title || '').trim() || normalized.title;
          if (!title) return null;
          const id = `todo-${Date.now()}-${idx}`;
          return {
            id,
            title,
            description: '',
            eventId: normalized.id,
            startDate: date,
            dueDate: date,
            dueTime: time,
            priority: 'medium',
            completed: false,
            category: 'event',
            createdAt: nowIso,
            updatedAt: nowIso,
          } as Todo;
        })
        .filter(Boolean) as Todo[];

      if (createdTodos.length > 0) {
        createdTodos.forEach((t) => appendLocal(LOCAL_TODOS_KEY, t));
        setTodos((prev) => [...prev, ...createdTodos]);

        try {
          const existing = await lifePlannerStorage.getTodos();
          await lifePlannerStorage.saveTodos([...(Array.isArray(existing) ? existing : []), ...createdTodos]);
        } catch {
          // ignore
        }
      }
    }

    if (options.reminder) {
      const date = normalizeISO(options.reminder.date) || normalized.startDate;
      const time = (options.reminder.time || '11:00').trim() || '11:00';

      const reminder: Reminder = {
        id: `rem-${Date.now()}`,
        title: normalized.title,
        description: '',
        eventId: normalized.id,
        startDate: date,
        dueDate: date,
        dueTime: time,
        frequency: options.reminder.frequency,
        completed: false,
        imageUrl: normalized.imageUrl,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      appendLocal(LOCAL_REMINDERS_KEY, reminder);
      setReminders((prev) => [...prev, reminder]);
      try {
        const existing = await lifePlannerStorage.getReminders();
        await lifePlannerStorage.saveReminders([...(Array.isArray(existing) ? existing : []), reminder]);
      } catch {
        // ignore
      }
    }

    setIsModalOpen(false);
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Subtype', 'Start Date', 'End Date', 'Image URL'];
    const csvContent = [
      headers.join(','),
      ...filteredEvents.map((evt) =>
        [evt.title, evt.subtype, evt.startDate, evt.endDate || '', evt.imageUrl || ''].map((v) => String(v ?? '')).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const total = events.length;
    const meetings = events.filter((e) => e.subtype === 'meeting').length;
    const birthdays = events.filter((e) => e.subtype === 'birthday').length;
    const multiDay = events.filter((e) => !!e.endDate && e.endDate !== e.startDate).length;
    return { total, meetings, birthdays, multiDay };
  }, [events]);

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-swar-text mb-2">Events</h1>
          <p className="text-swar-text-secondary">Manage meetings, events, and birthdays for your calendar</p>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{stats.total}</div>
          <div className="text-swar-text-secondary text-sm">Total Events</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-blue-600 mb-1">{stats.meetings}</div>
          <div className="text-swar-text-secondary text-sm">Meetings</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-purple-600 mb-1">{stats.birthdays}</div>
          <div className="text-swar-text-secondary text-sm">Birthdays</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-orange-600 mb-1">{stats.multiDay}</div>
          <div className="text-swar-text-secondary text-sm">Multi-day</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Search</label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title"
              className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Type</label>
            <select
              value={filterSubtype}
              onChange={(e) => setFilterSubtype(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="all">All</option>
              <option value="meeting">Meeting</option>
              <option value="event">Event</option>
              <option value="birthday">Birthday</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="all">All</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterSubtype('all');
                setFilterMonth('all');
              }}
              className="w-full px-3 py-2 rounded-lg bg-swar-primary-light text-swar-text font-bold hover:bg-swar-primary-light transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-swar-text-secondary">
          Showing {filteredEvents.length} of {events.length} events
        </p>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max justify-items-center">
        {filteredEvents.map((evt) => {
          const badgeText = evt.subtype ? evt.subtype.toUpperCase() : 'EVENT';
          const badgeColor =
            evt.subtype === 'birthday'
              ? 'bg-pink-600'
              : evt.subtype === 'meeting'
              ? 'bg-emerald-600'
              : 'bg-blue-600';

          const todoCount = todos.filter((t) => (t as any).eventId === evt.id).length;
          const reminderCount = reminders.filter((r) => (r as any).eventId === evt.id).length;

          return (
            <div
              key={evt.id}
              className="w-80 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full"
            >
              <div
                className="relative h-40 overflow-hidden bg-emerald-600 flex items-center justify-center"
                style={{
                  backgroundImage: `url('${evt.imageUrl || DEFAULT_IMAGE}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute top-3 right-3">
                  <div className={`${badgeColor} text-white px-3 py-1 rounded-full text-xs font-bold`}>{badgeText}</div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-swar-text mb-1 line-clamp-2">{evt.title}</h3>
                <p className="text-sm text-swar-text-secondary mb-4 line-clamp-2">
                  {evt.startDate}
                  {evt.endDate ? ` → ${evt.endDate}` : ''}
                </p>

                <div className="space-y-2 text-xs text-swar-text mb-auto">
                  {evt.startDate ? <div className="flex items-center gap-2">📅 {new Date(`${evt.startDate}T00:00:00`).toLocaleDateString()}</div> : null}
                  {evt.endDate && evt.endDate !== evt.startDate ? (
                    <div className="flex items-center gap-2">🗓️ Multi-day</div>
                  ) : (
                    <div className="flex items-center gap-2">🗓️ Single-day</div>
                  )}
                </div>

                <div className="mt-3">
                  <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                    {evt.subtype === 'birthday' ? 'Birthday' : evt.subtype === 'meeting' ? 'Meeting' : 'Event'}
                  </span>
                </div>

                {(todoCount > 0 || reminderCount > 0) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {todoCount > 0 ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold border border-blue-100">
                        📌 Todos
                        <span className="text-[11px] font-black bg-blue-600 text-white rounded-full px-2 py-0.5">{todoCount}</span>
                      </span>
                    ) : null}
                    {reminderCount > 0 ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 text-rose-700 px-3 py-1 text-xs font-bold border border-rose-100">
                        ⏰ Reminders
                        <span className="text-[11px] font-black bg-rose-600 text-white rounded-full px-2 py-0.5">{reminderCount}</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => handleEdit(evt)}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(evt.id)}
                  className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-swar-text-secondary mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-swar-text mb-2">No events found</h3>
          <p className="text-swar-text-secondary mb-4">Start by adding your first event.</p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Event</span>
          </button>
        </div>
      ) : null}

      {isModalOpen ? (
        <EventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingEvent={editingEvent}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
