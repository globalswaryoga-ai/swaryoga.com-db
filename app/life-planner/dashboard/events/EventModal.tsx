'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';

export type EventSubtype = 'meeting' | 'event' | 'birthday';

export type PlannerEvent = {
  id: string;
  type: 'event';
  subtype: EventSubtype;
  title: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  // Optional: calendar rendering metadata (back-compat with items stored by Calendar page)
  colorClass?: string;
  icon?: string;
};

type EventFormState = {
  subtype: EventSubtype;
  title: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  // Screenshot-style helpers
  showTodos: boolean;
  todoTitle: string;
  todoDate: string;
  todoTime: string;
  todos: Array<{ id: string; title: string; date: string; time: string }>;

  showReminder: boolean;
  reminderDate: string;
  reminderTime: string;
  reminderFrequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  reminderCreated: boolean;
};

const DEFAULT_IMAGE = 'https://i.postimg.cc/Y0zjsTd2/image.jpg';

const isoToday = () => new Date().toISOString().split('T')[0];

function normalizeISO(value: string | undefined | null): string {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function isValidISO(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  editingEvent,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    payload: PlannerEvent,
    options: {
      todos: Array<{ title: string; date: string; time: string }>;
      reminder?: { date: string; time: string; frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' };
    }
  ) => void;
  editingEvent?: PlannerEvent | null;
}) {
  const [showImageEditor, setShowImageEditor] = useState(false);

  const [form, setForm] = useState<EventFormState>({
    subtype: 'event',
    title: '',
    startDate: isoToday(),
    endDate: '',
    imageUrl: '',

    showTodos: false,
    todoTitle: '',
    todoDate: isoToday(),
    todoTime: '11:00',
    todos: [],

    showReminder: false,
    reminderDate: isoToday(),
    reminderTime: '11:00',
    reminderFrequency: 'once',
    reminderCreated: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    setShowImageEditor(false);

    if (editingEvent) {
      setForm({
        subtype: editingEvent.subtype,
        title: editingEvent.title || '',
        startDate: normalizeISO(editingEvent.startDate) || isoToday(),
        endDate: normalizeISO(editingEvent.endDate) || '',
        imageUrl: editingEvent.imageUrl || '',

        showTodos: false,
        todoTitle: editingEvent.title || '',
        todoDate: normalizeISO(editingEvent.startDate) || isoToday(),
        todoTime: '11:00',
        todos: [],

        showReminder: false,
        reminderDate: normalizeISO(editingEvent.startDate) || isoToday(),
        reminderTime: '11:00',
        reminderFrequency: 'once',
        reminderCreated: false,
      });
      return;
    }

    setForm({
      subtype: 'event',
      title: '',
      startDate: isoToday(),
      endDate: '',
      imageUrl: '',

      showTodos: false,
      todoTitle: '',
      todoDate: isoToday(),
      todoTime: '11:00',
      todos: [],

      showReminder: false,
      reminderDate: isoToday(),
      reminderTime: '11:00',
      reminderFrequency: 'once',
      reminderCreated: false,
    });
  }, [isOpen, editingEvent]);

  useEffect(() => {
    // Keep helper dates aligned with the event start date by default (unless user already added items).
    setForm((p) => {
      const start = normalizeISO(p.startDate) || isoToday();
      return {
        ...p,
        todoDate: p.todos.length === 0 ? start : p.todoDate,
        reminderDate: p.reminderCreated ? p.reminderDate : start,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startDate]);

  const computedImageUrl = useMemo(() => {
    if (form.imageUrl?.trim()) return form.imageUrl.trim();
    return DEFAULT_IMAGE;
  }, [form.imageUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-swar-primary to-blue-700 p-6 text-white flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{editingEvent ? 'Edit Event' : 'Create New Event'}</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:scale-110 transition-transform"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();

            const start = normalizeISO(form.startDate);
            const end = normalizeISO(form.endDate);
            if (!isValidISO(start)) return;

            const payload: PlannerEvent = {
              id: editingEvent?.id || `evt-${Date.now()}`,
              type: 'event',
              subtype: form.subtype,
              title:
                form.title.trim() ||
                (form.subtype === 'birthday' ? 'Birthday' : form.subtype === 'meeting' ? 'Meeting' : 'Event'),
              startDate: start,
              endDate: isValidISO(end) ? end : undefined,
              imageUrl: form.imageUrl.trim() || undefined,
            };

            onSave(payload, {
              todos: form.todos.map((t) => ({ title: t.title, date: normalizeISO(t.date), time: (t.time || '11:00').trim() || '11:00' })),
              reminder: form.reminderCreated
                ? {
                    date: normalizeISO(form.reminderDate),
                    time: (form.reminderTime || '11:00').trim() || '11:00',
                    frequency: form.reminderFrequency,
                  }
                : undefined,
            });
          }}
          className="p-6 space-y-5"
        >
          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.subtype}
              onChange={(e) => setForm((p) => ({ ...p, subtype: e.target.value as EventSubtype }))}
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="meeting">Meeting</option>
              <option value="event">Event</option>
              <option value="birthday">Birthday</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Client meeting / Birthday"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-sm font-bold text-swar-text">Default Image (Editable)</label>
              <button
                type="button"
                onClick={() => setShowImageEditor((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                <Eye className="h-4 w-4" />
                <span>{showImageEditor ? 'Hide' : 'Edit'}</span>
              </button>
            </div>

            <div className="rounded-lg overflow-hidden h-48 border-2 border-swar-border bg-swar-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={computedImageUrl}
                alt="Event visual"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_IMAGE;
                }}
              />
            </div>

            {showImageEditor && (
              <div className="mt-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
                <label className="block text-sm font-semibold text-emerald-900 mb-2">Custom Image URL (optional)</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  placeholder="https://..."
                />
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}
                    className="px-4 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    Use default
                  </button>
                  <p className="text-xs text-emerald-800">Default image is used when no URL is provided.</p>
                </div>
              </div>
            )}
          </div>

          {/* Add-ons: collapsed by default (buttons only) */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, showTodos: !p.showTodos }))}
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-3 text-white font-extrabold hover:bg-blue-700 transition shadow"
            >
              <Plus className="h-5 w-5" />
              <span>{form.showTodos ? 'Hide Todos' : 'Add Todos'}</span>
            </button>

            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, showReminder: !p.showReminder }))}
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-3 text-white font-extrabold hover:bg-emerald-700 transition shadow"
            >
              <Plus className="h-5 w-5" />
              <span>{form.showReminder ? 'Hide Reminder' : 'Add Reminder'}</span>
            </button>
          </div>

          {/* Todos (screenshot-style panel) */}
          {form.showTodos ? (
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
              <div className="mb-4">
                <h3 className="text-xl font-extrabold text-blue-900">📌 Todos</h3>
                <p className="text-sm text-blue-800">Break the task into small checkbox items.</p>
              </div>

              <div className="rounded-2xl border-2 border-blue-200 bg-white p-5">
                <div className="space-y-4">
                  <input
                    type="text"
                    value={form.todoTitle}
                    onChange={(e) => setForm((p) => ({ ...p, todoTitle: e.target.value }))}
                    placeholder="Todo title (e.g., Sadhana)"
                    className="w-full px-5 py-4 rounded-xl border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <input
                      type="date"
                      value={form.todoDate}
                      onChange={(e) => setForm((p) => ({ ...p, todoDate: e.target.value }))}
                      className="w-full px-5 py-4 rounded-xl border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <input
                      type="time"
                      value={form.todoTime}
                      onChange={(e) => setForm((p) => ({ ...p, todoTime: e.target.value }))}
                      className="w-full px-5 py-4 rounded-xl border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const title = form.todoTitle.trim() || form.title.trim();
                        const date = normalizeISO(form.todoDate || form.startDate) || isoToday();
                        const time = (form.todoTime || '11:00').trim() || '11:00';
                        if (!title) return;
                        setForm((p) => ({
                          ...p,
                          todos: [...p.todos, { id: `tmp-${Date.now()}`, title, date, time }],
                          todoTitle: '',
                        }));
                      }}
                      className="w-full rounded-xl bg-blue-600 px-6 py-4 text-white font-extrabold hover:bg-blue-700 transition shadow"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border-2 border-blue-200 bg-white p-5">
                {form.todos.length === 0 ? (
                  <p className="text-blue-700 font-semibold">No todos yet.</p>
                ) : (
                  <div className="space-y-2">
                    {form.todos.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <div>
                          <p className="font-bold text-blue-900">{t.title}</p>
                          <p className="text-xs text-blue-700">{t.date} • {t.time}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, todos: p.todos.filter((x) => x.id !== t.id) }))}
                          className="text-xs font-extrabold text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Reminder (screenshot-style panel) */}
          {form.showReminder ? (
            <div className="rounded-2xl border-2 border-emerald-200 bg-white p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-lg font-bold text-swar-text mb-2">Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.reminderDate}
                    onChange={(e) => setForm((p) => ({ ...p, reminderDate: e.target.value }))}
                    className="w-full px-5 py-4 rounded-xl border-2 border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="block text-lg font-bold text-swar-text mb-2">Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={form.reminderTime}
                    onChange={(e) => setForm((p) => ({ ...p, reminderTime: e.target.value }))}
                    className="w-full px-5 py-4 rounded-xl border-2 border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-lg font-bold text-swar-text mb-3">Frequency</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {([
                    ['once', 'Once'],
                    ['daily', 'Daily'],
                    ['weekly', 'Weekly'],
                    ['monthly', 'Monthly'],
                    ['yearly', 'Yearly'],
                    ['custom', 'Custom'],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-3 text-base font-semibold text-swar-text">
                      <input
                        type="radio"
                        name="reminderFrequency"
                        value={value}
                        checked={form.reminderFrequency === value}
                        onChange={() => setForm((p) => ({ ...p, reminderFrequency: value }))}
                        className="h-5 w-5 accent-emerald-600"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t-2 border-emerald-200 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, reminderCreated: false, showReminder: false }))}
                  className="px-6 py-3 rounded-xl text-swar-text font-bold hover:bg-swar-primary-light transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, reminderCreated: true }))}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-extrabold shadow hover:from-orange-600 hover:to-orange-500 transition"
                >
                  {form.reminderCreated ? 'Reminder Added' : 'Create Reminder'}
                </button>
              </div>
            </div>
          ) : null}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 px-0 pt-5 pb-5 border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-swar-border rounded-lg text-swar-text font-medium hover:bg-swar-bg transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              {editingEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
