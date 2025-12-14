'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Clock, AlertCircle, Plus, X } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { Reminder as DbReminder } from '@/lib/types/lifePlanner';

const DEFAULT_IMAGE = 'https://i.postimg.cc/Y0zjsTd2/image.jpg';

type UiReminder = {
  id: string;
  text: string;
  date: string;
  time: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays?: number;
  completed?: boolean;
  imageUrl?: string;
};

function dbToUiReminder(r: DbReminder): UiReminder {
  return {
    id: r.id,
    text: r.title || r.description || '',
    date: r.dueDate || r.startDate || '',
    time: r.dueTime || '11:00',
    frequency: (r.frequency as UiReminder['frequency']) || 'once',
    completed: Boolean(r.completed),
    imageUrl: r.imageUrl,
  };
}

function uiToDbReminder(r: UiReminder): DbReminder {
  return {
    id: r.id,
    title: r.text,
    description: '',
    startDate: r.date,
    dueDate: r.date,
    // Keep both fields for back-compat across screens
    time: r.time,
    dueTime: r.time,
    frequency: (r.frequency as DbReminder['frequency']) || 'once',
    completed: Boolean(r.completed),
    imageUrl: r.imageUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function RemindersPage() {
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reminders, setReminders] = useState<UiReminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [formData, setFormData] = useState({
    text: '',
    date: '',
    time: '11:00',
    frequency: 'once' as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    customDays: 1,
  });
  const [error, setError] = useState<string | null>(null);

  // Filters (UI-only; never persisted)
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterFrequency, setFilterFrequency] = useState<'all' | UiReminder['frequency']>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

  useEffect(() => {
    const load = async () => {
      setMounted(true);
      try {
        const saved = await lifePlannerStorage.getReminders();
        setReminders((Array.isArray(saved) ? saved : []).map(dbToUiReminder));
      } finally {
        setHasLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const save = async () => {
      if (!mounted || !hasLoaded) return;
      await lifePlannerStorage.saveReminders(reminders.map(uiToDbReminder));
    };
    save();
  }, [reminders, mounted, hasLoaded]);

  const isFormValid = useMemo(
    () => formData.text.trim().length > 0 && formData.date && formData.time,
    [formData.text, formData.date, formData.time]
  );

  const handleAddReminder = useCallback(() => {
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    const newReminder: UiReminder = {
      id: Date.now().toString(),
      text: formData.text,
      date: formData.date,
      time: formData.time,
      frequency: formData.frequency,
      customDays: formData.frequency === 'custom' ? formData.customDays : undefined,
    };

    setReminders(prev => [...prev, newReminder]);
    setFormData({
      text: '',
      date: '',
      time: '',
      frequency: 'once',
      customDays: 1,
    });
    setError(null);
    setShowForm(false);
  }, [formData, isFormValid]);

  const handleDeleteReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter((r) => r.id !== id));
  }, []);

  const frequencyLabels: Record<string, string> = {
    once: 'Once',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    custom: 'Custom',
  };

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredReminders = reminders.filter((r) => {
    const haystack = `${r.text || ''} ${frequencyLabels[r.frequency] || r.frequency}`.toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'completed' ? Boolean(r.completed) : !Boolean(r.completed));

    const matchesFrequency = filterFrequency === 'all' || r.frequency === filterFrequency;

    const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth as any);
    const date = r.date ? new Date(r.date) : null;
    const matchesMonth = monthIdx === null || (date && !Number.isNaN(date.getTime()) && date.getMonth() === monthIdx);

    return matchesSearch && matchesStatus && matchesFrequency && matchesMonth;
  });

  // Inline default SVG fallback to avoid 404s for missing files
  const DEFAULT_REMINDER_SVG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">' +
        '<rect width="100%" height="100%" fill="#fff1f6"/>' +
        '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ff4d82" font-family="Arial, Helvetica, sans-serif" font-size="34">Reminder</text>' +
      '</svg>'
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-600 mt-1">Set up reminders for important tasks and events</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setError(null);
            setFormData((prev) => ({
              ...prev,
              date: prev.date || today,
              time: prev.time || '11:00',
            }));
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition"
        >
          <Plus className="h-5 w-5" />
          Add Reminder
        </button>
      </div>

      {/* Add Reminder Modal (Task-form style, keep pink theme) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-red-500 to-pink-500 p-6 text-white flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Create New Reminder</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="text-2xl font-bold hover:scale-110 transition-transform"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Text *</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="What should you be reminded about?"
                  className="w-full rounded-lg border border-pink-200 px-4 py-3 text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-lg border border-pink-200 px-4 py-3 text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full rounded-lg border border-pink-200 px-4 py-3 text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Frequency</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as const).map((freq) => (
                    <label key={freq} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="frequency"
                        value={freq}
                        checked={formData.frequency === freq}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            frequency: e.target.value as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
                          })
                        }
                        className="h-5 w-5 rounded-full border-2 border-pink-300 text-red-600 focus:ring-2 focus:ring-red-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 font-medium">{frequencyLabels[freq]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.frequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Repeat every (days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.customDays}
                    onChange={(e) => setFormData({ ...formData, customDays: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-pink-200 px-4 py-3 text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-5 pb-5 border-t-2 border-pink-200 bg-gradient-to-r from-pink-50 via-white to-red-50 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                    setFormData({
                      text: '',
                      date: today,
                      time: '11:00',
                      frequency: 'once',
                      customDays: 1,
                    });
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddReminder}
                  className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-600 transition-colors disabled:opacity-60"
                >
                  Create Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Search</label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search reminder text"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Frequency</label>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchText('');
                setFilterStatus('all');
                setFilterFrequency('all');
                setFilterMonth('all');
              }}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">Showing {filteredReminders.length} of {reminders.length} reminders</p>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-pink-200 p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No reminders yet</p>
          <p className="text-gray-500 text-sm mt-1">Create your first reminder to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReminders.map((reminder) => (
            <div key={reminder.id} className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-300 flex flex-col h-full ${
              reminder.completed ? 'border-green-300 opacity-70' : 'border-pink-200'
            }`}>
              {/* Image header (EXACT Vision style, with default image) */}
              <div className="relative h-40 bg-gray-100 overflow-hidden">
                <img
                  src={reminder.imageUrl || DEFAULT_IMAGE}
                  alt={reminder.text}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_IMAGE;
                  }}
                />
                {/* Top-right status chip */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow ${
                    reminder.completed ? 'bg-green-500 text-white' : 'bg-white text-pink-600'
                  }`}>
                    {reminder.completed ? 'Done' : 'Pending'}
                  </span>
                </div>
              </div>
              {/* Card content (EXACT Vision style) */}
              <div className="flex-1 flex flex-col p-6 space-y-2">
                <h3 className="font-bold text-2xl mb-1 text-gray-900">{reminder.text}</h3>
                <div className="grid grid-cols-2 gap-2 text-base text-gray-600 mb-2">
                  <div><span className="font-semibold">Date:</span> {new Date(reminder.date).toLocaleDateString()}</div>
                  <div><span className="font-semibold">Time:</span> {reminder.time}</div>
                  <div><span className="font-semibold">Repeat:</span> {reminder.frequency === 'custom' ? `Every ${reminder.customDays} days` : frequencyLabels[reminder.frequency]}</div>
                </div>
                <div className="flex gap-2 mt-auto pt-3 border-t">
                  <button
                    onClick={() => setReminders(prev => prev.map((r) => r.id === reminder.id ? { ...r, completed: !reminder.completed } : r))}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-base rounded transition font-bold ${
                      reminder.completed ? 'bg-green-100 text-green-700' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                    }`}
                  >
                    {reminder.completed ? '✔️' : '⬜'} Done
                  </button>
                  <button
                    onClick={() => handleDeleteReminder(reminder.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-base bg-red-50 text-red-600 hover:bg-red-100 rounded transition font-bold"
                  >
                    <X className="h-5 w-5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
