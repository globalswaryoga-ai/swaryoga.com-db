'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Goal, Vision } from '@/lib/types/lifePlanner';

const DEFAULT_IMAGE = 'https://i.postimg.cc/Y0zjsTd2/image.jpg';

interface GoalManagerProps {
  goals: Goal[];
  visions: Vision[];
  onGoalAdd?: (goal: Goal) => void;
  onGoalUpdate?: (goal: Goal) => void;
  onGoalDelete?: (id: string) => void;
  selectedVisionId?: string;
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
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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
    imageUrl: 'https://images.unsplash.com/photo-1552994996-904ed8624c15?w=400&h=300&fit=crop',
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
      imageUrl: 'https://images.unsplash.com/photo-1552994996-904ed8624c15?w=400&h=300&fit=crop',
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
      visionId: goal.visionId,
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      budget: goal.budget,
      priority: goal.priority,
      status: goal.status,
      progress: goal.progress || 0,
      imageUrl: goal.imageUrl,
    });
    setEditingId(goal.id);
    setShowForm(true);
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      if (onGoalDelete) onGoalDelete(id);
    }
  };

  const getVisionTitle = (id: string) => visions.find(v => v.id === id)?.title || 'Unknown Vision';

  const uniqueStatuses = Array.from(new Set(goals.map(g => g.status))).sort();

  const normalizedSearch = searchText.trim().toLowerCase();
  
  const filteredGoals = goals.filter(goal => {
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus;
    const haystack = `${goal.title || ''} ${goal.description || ''}`.toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-swar-text">Goals</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Goal
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
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
        <p className="text-sm text-swar-text-secondary">Showing {filteredGoals.length} of {goals.length} goals</p>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-swar-text">
                {editingId ? 'Edit Goal' : 'Add New Goal'}
              </h3>
              <button onClick={() => resetForm()} className="p-2 hover:bg-swar-primary-light rounded-lg transition-colors">
                <X className="w-6 h-6 text-swar-text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Goal Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter goal title"
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter goal description"
                  rows={3}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Linked Vision (Optional)</label>
                <select
                  value={formData.visionId || ''}
                  onChange={(e) => setFormData({ ...formData, visionId: e.target.value })}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">No Vision Selected</option>
                  {visions.map((v) => (
                    <option key={v.id} value={v.id}>{v.title}</option>
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
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Target Date</label>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">Progress: {formData.progress}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => resetForm()} className="px-4 py-2 border border-swar-border rounded-lg text-swar-text hover:bg-swar-bg">
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                disabled={!formData.title.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {editingId ? 'Update Goal' : 'Add Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals Grid (Vision Design Style) */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-swar-text-secondary text-lg">No goals yet. Create your first goal!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max justify-items-center">
          {filteredGoals.map((goal) => (
            <div key={goal.id} className="w-80 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
              {/* Image Header (h-40 - Prominent image) */}
              <div 
                className="relative h-40 overflow-hidden bg-emerald-600"
                style={{ backgroundImage: `url('${goal.imageUrl || DEFAULT_IMAGE}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                {!goal.imageUrl && <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold opacity-0">🎯</div>}
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col">
                {/* Title - bold, large with top spacing */}
                <h3 className="text-xl font-bold text-swar-text mb-3 line-clamp-2">{goal.title}</h3>
                
                {/* Description - gray with medium spacing */}
                <p className="text-sm text-swar-text-secondary mb-4 line-clamp-2">{goal.description}</p>

                {/* Metadata Icons (single column format) */}
                <div className="space-y-2 text-sm text-swar-text mb-auto font-medium">
                  {goal.visionId && <div className="flex items-center gap-2">👁️ {getVisionTitle(goal.visionId)}</div>}
                  {goal.targetDate && (
                    <div className="flex items-center gap-2">
                      📅 {new Date(goal.targetDate).toLocaleDateString()}
                    </div>
                  )}
                  {goal.budget && <div className="flex items-center gap-2">💰 ${goal.budget}</div>}
                </div>

                {/* Progress Bar */}
                <div className="mt-3 mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-swar-text">Progress</span>
                    <span className="text-xs font-semibold text-emerald-600">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-swar-primary-light rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>

                {/* Priority Badge */}
                <div>
                  <span className={`px-3 py-1 rounded text-xs font-medium ${
                    goal.priority === 'high' ? 'bg-red-100 text-red-700' : 
                    goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-swar-primary-light text-swar-primary'
                  }`}>
                    {goal.priority.toUpperCase()} PRIORITY
                  </span>
                </div>
              </div>

              {/* Action Buttons (Vision style) */}
              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition">
                  Done
                </button>
                <button 
                  onClick={() => handleEditGoal(goal)} 
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteGoal(goal.id)} 
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
