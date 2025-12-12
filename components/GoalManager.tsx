'use client';

import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';
import { Goal, Vision } from '@/lib/types/lifePlanner';

interface GoalManagerProps {
  goals: Goal[];
  visions: Vision[];
  onGoalAdd?: (goal: Goal) => void;
  onGoalUpdate?: (goal: Goal) => void;
  onGoalDelete?: (id: string) => void;
  selectedVisionId?: string; // Pre-select vision if provided
}

export default function GoalManager({
  goals,
  visions,
  onGoalAdd,
  onGoalUpdate,
  onGoalDelete,
  selectedVisionId,
}: GoalManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    visionId: selectedVisionId || '',
    startDate: new Date().toISOString().split('T')[0],
    targetDate: new Date().toISOString().split('T')[0],
    budget: undefined,
    priority: 'medium',
    status: 'not-started',
    progress: 0,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      visionId: selectedVisionId || '',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date().toISOString().split('T')[0],
      budget: undefined,
      priority: 'medium',
      status: 'not-started',
      progress: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddGoal = () => {
    if (!formData.title.trim()) {
      alert('Goal title is required');
      return;
    }

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      if (onGoalUpdate) onGoalUpdate({ ...newGoal, id: editingId });
    } else {
      if (onGoalAdd) onGoalAdd(newGoal);
    }

    resetForm();
  };

  const handleEditGoal = (goal: Goal) => {
    setFormData({
      title: goal.title,
      description: goal.description,
      visionId: goal.visionId || '',
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      budget: goal.budget,
      priority: goal.priority,
      status: goal.status,
      progress: goal.progress,
    });
    setEditingId(goal.id);
    setShowForm(true);
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      if (onGoalDelete) onGoalDelete(id);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not-started':
        return 'bg-gray-100 text-gray-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'on-hold':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">Goals</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Goal
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? 'Edit Goal' : 'Add New Goal'}
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
                  Goal Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter goal title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  placeholder="Enter goal description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) =>
                      setFormData({ ...formData, targetDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-4">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as
                          | 'not-started'
                          | 'in-progress'
                          | 'completed'
                          | 'on-hold',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress: {formData.progress}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.progress}
                  onChange={(e) =>
                    setFormData({ ...formData, progress: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
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
                onClick={handleAddGoal}
                disabled={!formData.title.trim()}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingId ? 'Update Goal' : 'Add Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No goals yet. Create your first goal!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-lg transition-shadow"
            >
              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
                {goal.title}
              </h3>

              {/* Vision Link */}
              {goal.visionId && (
                <div className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-fit">
                  Vision: {getVisionTitle(goal.visionId)}
                </div>
              )}

              {/* Description */}
              {goal.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{goal.description}</p>
              )}

              {/* Dates */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>📅 {goal.startDate} → {goal.targetDate}</p>
              </div>

              {/* Budget */}
              {goal.budget && (
                <div className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded inline-block">
                  💰 ${goal.budget}
                </div>
              )}

              {/* Status & Priority Badges */}
              <div className="flex gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded text-xs font-medium border ${getStatusColor(goal.status)}`}>
                  {goal.status.replace('-', ' ').toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded text-xs font-medium border ${getPriorityColor(goal.priority)}`}>
                  {goal.priority.toUpperCase()}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Progress</span>
                  <span className="text-xs text-gray-600">{goal.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleEditGoal(goal)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <p className="text-sm text-emerald-800">
          <span className="font-semibold">You have {goals.length} goal(s)</span>
          {selectedVisionId && ` linked to the selected vision`}
        </p>
      </div>
    </div>
  );
}
