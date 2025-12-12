'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react';
import { Goal } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerStorage';
import GoalModal from './GoalModal';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [mounted, setMounted] = useState(false);

  const categories = ['Health', 'Wealth', 'Relationship', 'Personal Growth', 'Career', 'Education'];

  useEffect(() => {
    setMounted(true);
    const saved = lifePlannerStorage.getGoals();
    setGoals(saved.length > 0 ? saved : []);
  }, []);

  useEffect(() => {
    if (mounted) {
      lifePlannerStorage.saveGoals(goals);
    }
  }, [goals, mounted]);

  const handleAddGoal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleSaveGoal = (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingGoal) {
      setGoals(prev =>
        prev.map(g =>
          g.id === editingGoal.id
            ? { ...g, ...goalData, updatedAt: new Date().toISOString() }
            : g
        )
      );
    } else {
      const newGoal: Goal = {
        ...goalData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setGoals(prev => [...prev, newGoal]);
    }
    setIsModalOpen(false);
  };

  const filteredGoals = goals.filter(goal => {
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus;
    return matchesStatus;
  });

  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0;

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Goals</h1>
          <p className="text-gray-600">Track your objectives and measure progress</p>
        </div>
        <button
          onClick={handleAddGoal}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Add Goal</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{goals.length}</div>
          <div className="text-gray-600 text-sm">Total Goals</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-blue-600 mb-1">{goals.filter(g => g.status === 'in-progress').length}</div>
          <div className="text-gray-600 text-sm">In Progress</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-green-600 mb-1">{goals.filter(g => g.status === 'completed').length}</div>
          <div className="text-gray-600 text-sm">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-purple-600 mb-1">{avgProgress}%</div>
          <div className="text-gray-600 text-sm">Avg Progress</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-lg mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid gap-6">
        {filteredGoals.map(goal => (
          <div key={goal.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800 mb-1">{goal.title}</h3>
                  <p className="text-gray-600 mb-4">{goal.description}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditGoal(goal)}
                    className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <span className={`px-3 py-1 rounded-full ${
                  goal.priority === 'high' ? 'bg-red-100 text-red-800' :
                  goal.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {goal.priority} priority
                </span>
                <span className={`px-3 py-1 rounded-full ${
                  goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                  goal.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                  goal.status === 'on-hold' ? 'bg-gray-100 text-gray-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {goal.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-bold text-emerald-600">{goal.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span>📅 Start: {new Date(goal.startDate).toLocaleDateString()}</span>
                <span>🎯 Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredGoals.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
          <p className="text-gray-600 mb-4">Start creating goals to track your progress.</p>
          <button
            onClick={handleAddGoal}
            className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Goal</span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <GoalModal
          goal={editingGoal}
          onSave={handleSaveGoal}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
