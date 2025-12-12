'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Clock } from 'lucide-react';

interface Routine {
  id: string;
  title: string;
  time: string; // HH:MM format
  repeat: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays?: number;
}

interface RoutineManagerProps {
  onRoutineAdd?: (routine: Routine) => void;
  onRoutineDelete?: (routineId: string) => void;
  onRoutineUpdate?: (routine: Routine) => void;
}

export default function RoutineManager({ onRoutineAdd, onRoutineDelete, onRoutineUpdate }: RoutineManagerProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    time: '11:00',
    repeat: 'daily' as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    customDays: 1,
  });

  const handleAddRoutine = () => {
    if (!formData.title.trim()) {
      alert('Please enter routine name');
      return;
    }

    const newRoutine: Routine = {
      id: editingId || Date.now().toString(),
      title: formData.title,
      time: formData.time,
      repeat: formData.repeat,
      customDays: formData.repeat === 'custom' ? formData.customDays : undefined,
    };

    if (editingId) {
      setRoutines(routines.map(r => r.id === editingId ? newRoutine : r));
      if (onRoutineUpdate) onRoutineUpdate(newRoutine);
    } else {
      setRoutines([...routines, newRoutine]);
      if (onRoutineAdd) onRoutineAdd(newRoutine);
    }

    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      time: '11:00',
      repeat: 'daily',
      customDays: 1,
    });
    setEditingId(null);
  };

  const handleEditRoutine = (routine: Routine) => {
    setFormData({
      title: routine.title,
      time: routine.time,
      repeat: routine.repeat,
      customDays: routine.customDays || 1,
    });
    setEditingId(routine.id);
    setShowForm(true);
  };

  const handleDeleteRoutine = (id: string) => {
    setRoutines(routines.filter(r => r.id !== id));
    if (onRoutineDelete) onRoutineDelete(id);
  };

  const getRepeatLabel = (repeat: string, customDays?: number) => {
    if (repeat === 'custom') return `Every ${customDays} days`;
    return repeat.charAt(0).toUpperCase() + repeat.slice(1);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Routines</h2>
          <p className="text-gray-600 text-sm mt-1">Manage your daily routine schedule</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-green-700 transition shadow-lg"
        >
          <Plus className="h-5 w-5" />
          Add Routine
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {editingId ? 'Edit Routine' : 'Create New Routine'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="p-2 hover:bg-emerald-200 rounded-lg transition"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Routine Name */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Routine Name *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Morning Yoga, Evening Walk, Meditation"
                className="w-full px-4 py-3 border-2 border-emerald-300 rounded-xl focus:outline-none focus:border-emerald-600 text-lg"
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Time (Default: 11:00 AM)
              </label>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-emerald-600" />
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="px-4 py-3 border-2 border-emerald-300 rounded-xl focus:outline-none focus:border-emerald-600 text-lg flex-1"
                />
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  {formData.time}
                </span>
              </div>
            </div>

            {/* Repeat Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Repeat *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as const).map((option) => (
                  <label
                    key={option}
                    className={`relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                      formData.repeat === option
                        ? 'border-emerald-600 bg-emerald-100'
                        : 'border-gray-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="repeat"
                      value={option}
                      checked={formData.repeat === option}
                      onChange={(e) => setFormData({ ...formData, repeat: e.target.value as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' })}
                      className="w-4 h-4 text-emerald-600 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Days Input */}
            {(formData.repeat === 'custom') && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Repeat Every (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.customDays}
                  onChange={(e) => setFormData({ ...formData, customDays: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border-2 border-emerald-300 rounded-xl focus:outline-none focus:border-emerald-600 text-lg"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddRoutine}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-green-700 transition"
              >
                {editingId ? 'Update Routine' : 'Add Routine'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routines List */}
      {routines.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No routines yet</p>
          <p className="text-gray-500 text-sm mt-1">Create your first routine to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="bg-white border-2 border-emerald-200 rounded-2xl p-6 hover:shadow-lg transition hover:border-emerald-400"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Routine Info */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {routine.title}
                  </h3>

                  {/* Time and Repeat Details */}
                  <div className="flex flex-wrap gap-4 items-center">
                    {/* Time */}
                    <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                      <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Time</p>
                        <p className="text-lg font-bold text-blue-900">
                          {routine.time}
                        </p>
                      </div>
                    </div>

                    {/* Repeat */}
                    <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium">Repeat</p>
                      <p className="text-lg font-bold text-purple-900">
                        {getRepeatLabel(routine.repeat, routine.customDays)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditRoutine(routine)}
                    className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition border-2 border-blue-200"
                    title="Edit routine"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this routine?')) {
                        handleDeleteRoutine(routine.id);
                      }
                    }}
                    className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition border-2 border-red-200"
                    title="Delete routine"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      {routines.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900 font-medium">
            💡 <strong>{routines.length} routine{routines.length !== 1 ? 's' : ''} created</strong> - You can edit or delete any routine anytime
          </p>
        </div>
      )}
    </div>
  );
}
