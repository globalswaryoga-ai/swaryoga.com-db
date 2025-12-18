'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Reminder } from '@/lib/types/lifePlanner';

interface ReminderManagerProps {
  reminders: Reminder[];
  onReminderAdd?: (reminder: Reminder) => void;
  onReminderUpdate?: (reminder: Reminder) => void;
  onReminderDelete?: (id: string) => void;
}

export default function ReminderManager({
  reminders,
  onReminderAdd,
  onReminderUpdate,
  onReminderDelete,
}: ReminderManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState<Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    nextDueDate: new Date().toISOString().split('T')[0],
    time: '09:00',
    priority: 'medium',
    completed: false,
    frequency: 'once',
    category: 'personal',
    imageUrl: 'https://images.unsplash.com/photo-1515694712202-b2a9ad0a5fe0?w=400&h=300&fit=crop',
    active: true,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      nextDueDate: new Date().toISOString().split('T')[0],
      time: '09:00',
      priority: 'medium',
      completed: false,
      frequency: 'once',
      category: 'personal',
      imageUrl: 'https://images.unsplash.com/photo-1515694712202-b2a9ad0a5fe0?w=400&h=300&fit=crop',
      active: true,
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
      nextDueDate: reminder.nextDueDate || new Date().toISOString().split('T')[0],
      time: reminder.time || '09:00',
      priority: reminder.priority,
      completed: reminder.completed,
      frequency: reminder.frequency,
      category: reminder.category,
      imageUrl: reminder.imageUrl,
      active: reminder.active,
    });
    setEditingId(reminder.id);
    setShowForm(true);
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      if (onReminderDelete) onReminderDelete(id);
    }
  };

  const normalizedSearch = searchText.trim().toLowerCase();
  
  const filteredReminders = reminders.filter(reminder => {
    const matchesStatus = filterStatus === 'all' || (!reminder.completed && filterStatus === 'active') || (reminder.completed && filterStatus === 'completed');
    const haystack = `${reminder.title || ''} ${reminder.description || ''}`.toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-swar-text">Reminders</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Reminder
        </button>
      </div>

      {/* Filter Bar (Vision Design) */}
      <div className="bg-white rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Search</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search title / description"
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setSearchText('');
                setFilterStatus('all');
              }}
              className="w-full px-3 py-2 rounded-lg bg-swar-primary-light text-swar-text font-bold hover:bg-swar-primary-light transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <p className="text-sm text-swar-text-secondary">Showing {filteredReminders.length} of {reminders.length} reminders</p>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-swar-text">
                {editingId ? 'Edit Reminder' : 'Add New Reminder'}
              </h3>
              <button onClick={() => resetForm()} className="p-2 hover:bg-swar-primary-light rounded-lg transition-colors">
                <X className="w-6 h-6 text-swar-text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Reminder Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter reminder title"
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter reminder description"
                  rows={3}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.imageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.nextDueDate || ''}
                    onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Frequency</label>
                  <select
                    value={formData.frequency || 'once'}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Category</label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Category</option>
                    <option value="personal">Personal</option>
                    <option value="work">Work</option>
                    <option value="health">Health</option>
                    <option value="spiritual">Spiritual</option>
                    <option value="social">Social</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Priority</label>
                  <select
                    value={formData.priority || 'medium'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-swar-text mt-6">
                    <input
                      type="checkbox"
                      checked={formData.completed}
                      onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                      className="rounded"
                    />
                    <span>Mark as Completed</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => resetForm()} className="px-4 py-2 border border-swar-border rounded-lg text-swar-text hover:bg-swar-bg">
                Cancel
              </button>
              <button
                onClick={handleAddReminder}
                disabled={!formData.title.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {editingId ? 'Update Reminder' : 'Add Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminders Grid (Vision Design Style) */}
      {filteredReminders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-swar-text-secondary text-lg">No reminders yet. Create your first reminder!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max justify-items-center">
          {filteredReminders.map((reminder) => (
            <div key={reminder.id} className="w-80 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
              {/* Image Header (h-48 - Vision slider match) */}
              <div 
                className="relative h-48 overflow-hidden bg-orange-600"
                style={reminder.imageUrl ? { backgroundImage: `url('${reminder.imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!reminder.imageUrl && <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">⏰</div>}
                
                {/* Top-right Badge */}
                <div className="absolute top-3 right-3">
                  <div className={`${reminder.completed ? 'bg-swar-primary' : 'bg-orange-600'} text-white px-3 py-1 rounded-full text-xs font-bold`}>
                    {reminder.completed ? 'COMPLETED' : 'ACTIVE'}
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-swar-text mb-2 line-clamp-2">{reminder.title}</h3>
                <p className="text-sm text-swar-text-secondary mb-4 line-clamp-2">{reminder.description || 'No description'}</p>

                {/* Metadata (Vision style with icons) */}
                <div className="space-y-2 text-xs text-swar-text mb-auto">
                  {reminder.nextDueDate && (
                    <div className="flex items-center gap-2">
                      📅 {new Date(reminder.nextDueDate).toLocaleDateString()}
                    </div>
                  )}
                  {reminder.time && (
                    <div className="flex items-center gap-2">
                      🕐 {reminder.time}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    🔄 {(reminder.frequency || 'once').toUpperCase()}
                  </div>
                </div>

                {/* Category & Priority Badges */}
                <div className="flex gap-2 mt-3">
                  {reminder.category && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {reminder.category.toUpperCase()}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    reminder.priority === 'high' ? 'bg-swar-primary-light text-swar-primary' : 
                    reminder.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-swar-primary-light text-swar-primary'
                  }`}>
                    {(reminder.priority || 'medium').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Action Buttons (Vision style) */}
              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button 
                  onClick={() => {
                    const updated = { ...reminder, completed: !reminder.completed };
                    if (onReminderUpdate) onReminderUpdate(updated);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  {reminder.completed ? 'Undo' : 'Done'}
                </button>
                <button 
                  onClick={() => handleEditReminder(reminder)}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
