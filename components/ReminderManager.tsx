'use client';

import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Bell, CheckCircle2, Circle } from 'lucide-react';
import { Reminder, Vision } from '@/lib/types/lifePlanner';

interface ReminderManagerProps {
  reminders: Reminder[];
  visions: Vision[];
  onReminderAdd?: (reminder: Reminder) => void;
  onReminderUpdate?: (reminder: Reminder) => void;
  onReminderDelete?: (id: string) => void;
  selectedVisionId?: string;
}

export default function ReminderManager({
  reminders,
  visions,
  onReminderAdd,
  onReminderUpdate,
  onReminderDelete,
  selectedVisionId,
}: ReminderManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    visionId: selectedVisionId || '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:00',
    budget: undefined,
    frequency: 'once',
    priority: 'medium',
    active: true,
    completed: false,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      visionId: selectedVisionId || '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '11:00',
      budget: undefined,
      frequency: 'once',
      priority: 'medium',
      active: true,
      completed: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddReminder = () => {
    if (!formData.title.trim()) {
      alert('Reminder title is required');
      return;
    }

    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      if (onReminderUpdate) onReminderUpdate({ ...newReminder, id: editingId });
    } else {
      if (onReminderAdd) onReminderAdd(newReminder);
    }

    resetForm();
  };

  const handleEditReminder = (reminder: Reminder) => {
    setFormData({
      title: reminder.title,
      description: reminder.description,
      visionId: reminder.visionId || '',
      startDate: reminder.startDate,
      dueDate: reminder.dueDate,
      dueTime: reminder.dueTime,
      budget: reminder.budget,
      frequency: reminder.frequency,
      priority: reminder.priority,
      active: reminder.active,
      completed: reminder.completed,
    });
    setEditingId(reminder.id);
    setShowForm(true);
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      if (onReminderDelete) onReminderDelete(id);
    }
  };

  const getVisionTitle = (visionId?: string) => {
    if (!visionId) return 'Standalone';
    return visions.find((v) => v.id === visionId)?.title || 'Unknown Vision';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'once':
        return 'bg-gray-100 text-gray-700';
      case 'daily':
        return 'bg-blue-100 text-blue-700';
      case 'weekly':
        return 'bg-indigo-100 text-indigo-700';
      case 'monthly':
        return 'bg-cyan-100 text-cyan-700';
      case 'yearly':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredReminders = selectedVisionId
    ? reminders.filter((r) => r.visionId === selectedVisionId)
    : reminders;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">Reminders</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Reminder
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? 'Edit Reminder' : 'Add New Reminder'}
              </h3>
              <button
                onClick={() => resetForm()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter reminder title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter reminder description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Vision Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Linked Vision (Optional)
                </label>
                <select
                  value={formData.visionId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, visionId: e.target.value || undefined })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">No Vision Selected</option>
                  {visions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title} ({v.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Time
                </label>
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) =>
                    setFormData({ ...formData, dueTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (Amount - Optional)
                </label>
                <input
                  type="number"
                  value={formData.budget || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      budget: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="Enter budget amount"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Frequency, Priority, Active */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        frequency: e.target.value as
                          | 'once'
                          | 'daily'
                          | 'weekly'
                          | 'monthly'
                          | 'yearly',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as 'low' | 'medium' | 'high',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.active ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.value === 'active' })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Completed */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="completed"
                  checked={formData.completed}
                  onChange={(e) =>
                    setFormData({ ...formData, completed: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="completed" className="text-sm font-medium text-gray-700">
                  Mark as completed
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => resetForm()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddReminder}
                disabled={!formData.title.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingId ? 'Update Reminder' : 'Add Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No reminders yet. Create your first reminder!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`border rounded-lg p-4 transition-all ${
                reminder.completed
                  ? 'bg-green-50 border-green-200'
                  : reminder.active
                    ? 'bg-orange-50 border-orange-200 hover:shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-75'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Completion Checkbox */}
                <button
                  onClick={() => {
                    if (onReminderUpdate) {
                      onReminderUpdate({
                        ...reminder,
                        completed: !reminder.completed,
                      });
                    }
                  }}
                  className="flex-shrink-0 mt-1"
                >
                  {reminder.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-semibold text-lg ${
                      reminder.completed
                        ? 'text-gray-500 line-through'
                        : 'text-gray-800'
                    }`}
                  >
                    {reminder.title}
                  </h4>

                  {/* Vision Link */}
                  {reminder.visionId && (
                    <div className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded w-fit mt-1">
                      Vision: {getVisionTitle(reminder.visionId)}
                    </div>
                  )}

                  {reminder.description && (
                    <p
                      className={`text-sm mt-1 ${
                        reminder.completed ? 'text-gray-500' : 'text-gray-600'
                      }`}
                    >
                      {reminder.description}
                    </p>
                  )}

                  {/* Dates & Time */}
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <div>📅 {reminder.startDate} → {reminder.dueDate}</div>
                    {reminder.dueTime && <div>⏰ {reminder.dueTime}</div>}
                  </div>

                  {/* Budget */}
                  {reminder.budget && (
                    <div className="text-sm font-medium text-orange-700 bg-orange-100 px-3 py-1 rounded inline-block mt-2">
                      💰 ${reminder.budget}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap mt-3">
                    <span className={`px-3 py-1 rounded text-xs font-medium border ${getFrequencyColor(reminder.frequency)}`}>
                      {reminder.frequency.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded text-xs font-medium border ${getPriorityColor(reminder.priority)}`}>
                      {reminder.priority.toUpperCase()}
                    </span>
                    <span
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        reminder.active
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {reminder.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditReminder(reminder)}
                    className="p-2 bg-orange-100 text-orange-600 rounded hover:bg-orange-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteReminder(reminder.id)}
                    className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-800">
          <span className="font-semibold">You have {filteredReminders.length} reminder(s)</span>
          {selectedVisionId && ` for the selected vision`}
        </p>
      </div>
    </div>
  );
}
