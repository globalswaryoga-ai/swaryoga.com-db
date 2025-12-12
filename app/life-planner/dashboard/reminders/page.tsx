'use client';

import { useState, useCallback, useMemo } from 'react';
import { Clock, AlertCircle, Plus, X } from 'lucide-react';

interface Reminder {
  id: string;
  text: string;
  date: string;
  time: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays?: number;
  completed?: boolean;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    date: '',
    time: '',
    frequency: 'once' as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    customDays: 1,
  });
  const [error, setError] = useState<string | null>(null);

  const isFormValid = useMemo(
    () => formData.text.trim().length > 0 && formData.date && formData.time,
    [formData.text, formData.date, formData.time]
  );

  const handleAddReminder = useCallback(() => {
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    const newReminder: Reminder = {
      id: Date.now().toString(),
      text: formData.text,
      date: formData.date,
      time: formData.time,
      frequency: formData.frequency,
      customDays: formData.frequency === 'custom' ? formData.customDays : undefined,
    };

    setReminders([...reminders, newReminder]);
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
    setReminders(reminders.filter((r) => r.id !== id));
  }, [reminders]);

  const frequencyLabels: Record<string, string> = {
    once: 'Once',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    custom: 'Custom',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-600 mt-1">Set up reminders for important tasks and events</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition"
        >
          <Plus className="h-5 w-5" />
          Add Reminder
        </button>
      </div>

      {/* Add Reminder Form */}
      {showForm && (
        <div className="rounded-3xl border border-pink-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Reminder</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Reminder Text */}
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

            {/* Date and Time */}
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

            {/* Frequency */}
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
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' })}
                      className="h-5 w-5 rounded-full border-2 border-pink-300 text-red-600 focus:ring-2 focus:ring-red-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 font-medium">{frequencyLabels[freq]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Days */}
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

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddReminder}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 px-4 py-3 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition"
              >
                Create Reminder
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                  setFormData({
                    text: '',
                    date: '',
                    time: '',
                    frequency: 'once',
                    customDays: 1,
                  });
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-pink-200 p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No reminders yet</p>
          <p className="text-gray-500 text-sm mt-1">Create your first reminder to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reminders.map((reminder) => (
            <div key={reminder.id} className={`rounded-2xl border transition ${
              reminder.completed
                ? 'border-green-300 bg-green-50 opacity-70'
                : 'border-pink-200 bg-white hover:shadow-lg'
            } p-6 shadow-md`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={reminder.completed || false}
                    onChange={(e) => {
                      setReminders(
                        reminders.map((r) =>
                          r.id === reminder.id ? { ...r, completed: e.target.checked } : r
                        )
                      );
                    }}
                    className="w-6 h-6 rounded border-2 border-pink-300 text-red-600 cursor-pointer mt-1 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className={`text-lg font-semibold ${reminder.completed ? 'line-through text-gray-600' : 'text-gray-900'}`}>
                      {reminder.text}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">📅 Date:</span>
                        {new Date(reminder.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">🕐 Time:</span>
                        {reminder.time}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">🔁 Repeat:</span>
                        {reminder.frequency === 'custom'
                          ? `Every ${reminder.customDays} days`
                          : frequencyLabels[reminder.frequency]}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="ml-4 flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                  title="Delete reminder"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
