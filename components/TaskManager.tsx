'use client';

import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Task, Goal } from '@/lib/types/lifePlanner';

interface TaskManagerProps {
  tasks: Task[];
  goals: Goal[];
  onTaskAdd?: (task: Task) => void;
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (id: string) => void;
  selectedGoalId?: string;
}

export default function TaskManager({
  tasks,
  goals,
  onTaskAdd,
  onTaskUpdate,
  onTaskDelete,
  selectedGoalId,
}: TaskManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    goalId: selectedGoalId || '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    budget: undefined,
    priority: 'medium',
    status: 'not-started',
    repeat: 'once',
    completed: false,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      goalId: selectedGoalId || '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      budget: undefined,
      priority: 'medium',
      status: 'not-started',
      repeat: 'once',
      completed: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddTask = () => {
    if (!formData.title.trim()) {
      alert('Task title is required');
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      if (onTaskUpdate) onTaskUpdate({ ...newTask, id: editingId });
    } else {
      if (onTaskAdd) onTaskAdd(newTask);
    }

    resetForm();
  };

  const handleEditTask = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description,
      goalId: task.goalId || '',
      startDate: task.startDate,
      dueDate: task.dueDate,
      budget: task.budget,
      priority: task.priority,
      status: task.status,
      repeat: task.repeat,
      completed: task.completed,
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      if (onTaskDelete) onTaskDelete(id);
    }
  };

  const getGoalTitle = (goalId?: string) => {
    if (!goalId) return 'Standalone';
    return goals.find((g) => g.id === goalId)?.title || 'Unknown Goal';
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
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredTasks = selectedGoalId
    ? tasks.filter((t) => t.goalId === selectedGoalId)
    : tasks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">Tasks</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? 'Edit Task' : 'Add New Task'}
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
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter task title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  placeholder="Enter task description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Goal Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Linked Goal (Optional)
                </label>
                <select
                  value={formData.goalId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, goalId: e.target.value || undefined })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Goal Selected</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Priority, Status, Repeat */}
              <div className="grid grid-cols-3 gap-3">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          | 'pending'
                          | 'completed'
                          | 'overdue',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat
                  </label>
                  <select
                    value={formData.repeat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        repeat: e.target.value as
                          | 'once'
                          | 'daily'
                          | 'weekly'
                          | 'monthly'
                          | 'yearly',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
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
                onClick={handleAddTask}
                disabled={!formData.title.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingId ? 'Update Task' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No tasks yet. Create your first task!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded-lg p-4 transition-all ${
                task.completed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Completion Checkbox */}
                <button
                  onClick={() => {
                    if (onTaskUpdate) {
                      onTaskUpdate({
                        ...task,
                        completed: !task.completed,
                        status: !task.completed ? 'completed' : 'not-started',
                      });
                    }
                  }}
                  className="flex-shrink-0 mt-1"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-lg font-semibold ${
                      task.completed
                        ? 'text-gray-500 line-through'
                        : 'text-gray-800'
                    }`}
                  >
                    {task.title}
                  </h3>

                  {/* Goal Link */}
                  {task.goalId && (
                    <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit mt-1">
                      Goal: {getGoalTitle(task.goalId)}
                    </div>
                  )}

                  {task.description && (
                    <p
                      className={`text-sm mt-1 ${
                        task.completed ? 'text-gray-500' : 'text-gray-600'
                      }`}
                    >
                      {task.description}
                    </p>
                  )}

                  {/* Dates */}
                  <div className="text-xs text-gray-500 mt-2">
                    📅 {task.startDate} → {task.dueDate}
                  </div>

                  {/* Budget */}
                  {task.budget && (
                    <div className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded inline-block mt-2">
                      💰 ${task.budget}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap mt-3">
                    <span className={`px-3 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                      {task.status.replace('-', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                      {task.repeat?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditTask(task)}
                    className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">You have {filteredTasks.length} task(s)</span>
          {selectedGoalId && ` for the selected goal`}
        </p>
      </div>
    </div>
  );
}
