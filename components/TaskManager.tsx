'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Task, Goal } from '@/lib/types/lifePlanner';

const DEFAULT_IMAGE = 'https://i.postimg.cc/Y0zjsTd2/image.jpg';

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
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop',
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
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop',
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
      imageUrl: task.imageUrl,
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      if (onTaskDelete) onTaskDelete(id);
    }
  };

  const getGoalTitle = (id: string) => goals.find(g => g.id === id)?.title || 'Unknown Goal';

  const uniqueStatuses = Array.from(new Set(tasks.map(t => t.status))).sort();

  const normalizedSearch = searchText.trim().toLowerCase();
  
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const haystack = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-swar-text">Tasks</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Task
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
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>{s.replace('-', ' ').toUpperCase()}</option>
              ))}
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
        <p className="text-sm text-swar-text-secondary">Showing {filteredTasks.length} of {tasks.length} tasks</p>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-swar-text">
                {editingId ? 'Edit Task' : 'Add New Task'}
              </h3>
              <button onClick={() => resetForm()} className="p-2 hover:bg-swar-primary-light rounded-lg transition-colors">
                <X className="w-6 h-6 text-swar-text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Task Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter task title"
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Linked Goal (Optional)</label>
                <select
                  value={formData.goalId || ''}
                  onChange={(e) => setFormData({ ...formData, goalId: e.target.value || undefined })}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Goal Selected</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.imageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Budget (Optional)</label>
                <input
                  type="number"
                  value={formData.budget || ''}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Enter budget amount"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => resetForm()} className="px-4 py-2 border border-swar-border rounded-lg text-swar-text hover:bg-swar-bg">
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={!formData.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingId ? 'Update Task' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Grid (Vision Design Style) */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-swar-text-secondary text-lg">No tasks yet. Create your first task!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max justify-items-center">
          {filteredTasks.map((task) => (
            <div key={task.id} className="w-80 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
              {/* Image Header (h-48 - Vision slider match) */}
              <div 
                className="relative h-48 overflow-hidden bg-blue-600"
                style={{ backgroundImage: `url('${task.imageUrl || DEFAULT_IMAGE}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                {!task.imageUrl && <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold opacity-0">✓</div>}
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col">
                {/* Title - bold, large with top spacing */}
                <h3 className="text-xl font-bold text-swar-text mb-3 line-clamp-2">{task.title}</h3>
                
                {/* Description - gray with medium spacing */}
                <p className="text-sm text-swar-text-secondary mb-4 line-clamp-2">{task.description}</p>

                {/* Metadata Icons (single column format) */}
                <div className="space-y-2 text-sm text-swar-text mb-auto font-medium">
                  {task.goalId && <div className="flex items-center gap-2">🎯 {getGoalTitle(task.goalId)}</div>}
                  {task.dueDate && (
                    <div className="flex items-center gap-2">
                      📅 {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  {task.budget && <div className="flex items-center gap-2">💰 ${task.budget}</div>}
                </div>
              </div>

              {/* Action Buttons (Vision style) */}
              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition">
                  Done
                </button>
                <button 
                  onClick={() => handleEditTask(task)} 
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteTask(task.id)} 
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
