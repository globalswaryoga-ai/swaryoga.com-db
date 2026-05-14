'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Goal, Vision, ActionPlan } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import GoalForm from '@/components/GoalForm';
import { CATEGORY_COLORS, MONTHS } from '@/lib/lifePlannerConstants';

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  'not-started': { text: 'text-swar-text', bg: 'bg-swar-primary-light' },
  'in-progress': { text: 'text-blue-700', bg: 'bg-blue-100' },
  'completed': { text: 'text-swar-primary', bg: 'bg-swar-primary-light' },
  'on-hold': { text: 'text-yellow-700', bg: 'bg-yellow-100' },
};

export default function GoalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didAutoOpen = useRef(false);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Filters
  const [filterVision, setFilterVision] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setMounted(true);
    (async () => {
      const [savedGoals, savedVisions, savedActionPlans] = await Promise.all([
        lifePlannerStorage.getGoals(),
        lifePlannerStorage.getVisions(),
        lifePlannerStorage.getActionPlans(),
      ]);

      setGoals(Array.isArray(savedGoals) ? savedGoals : []);
      setVisions(Array.isArray(savedVisions) ? savedVisions : []);
      setActionPlans(Array.isArray(savedActionPlans) ? savedActionPlans : []);
      setHasLoaded(true);
    })();
  }, []);

  const skipNextSave = useRef(true);
  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    (async () => {
      await lifePlannerStorage.saveGoals(goals);
    })();
  }, [goals, mounted, hasLoaded]);

  useEffect(() => {
    if (!mounted) return;
    if (didAutoOpen.current) return;
    if (searchParams?.get('create') !== '1') return;

    didAutoOpen.current = true;
    handleAddGoal();
    router.replace('/life-planner/dashboard/goals');
  }, [mounted, searchParams, router]);

  const handleAddGoal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDeleteGoal = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleSaveGoal = (goalData: Goal) => {
    if (editingGoal) {
      setGoals(prev =>
        prev.map(g => g.id === editingGoal.id ? goalData : g)
      );
    } else {
      setGoals(prev => [...prev, goalData]);
    }
    setIsModalOpen(false);
  };

  const getVisionTitle = (visionId?: string): string => {
    if (!visionId) return 'No Vision';
    return visions.find(v => v.id === visionId)?.title || 'Unknown Vision';
  };

  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredGoals = goals
    .filter((g) => {
      const matchesVision = filterVision === 'all' || g.visionId === filterVision;
      const matchesStatus = filterStatus === 'all' || (g.status || 'not-started') === filterStatus;
      const matchesPriority = filterPriority === 'all' || g.priority === filterPriority;

      const haystack = `${g.title || ''} ${g.description || ''} ${getVisionTitle(g.visionId)}`.toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

      return matchesVision && matchesStatus && matchesPriority && matchesSearch;
    })
    .sort((a, b) => {
      const dateA = a.targetDate ? new Date(a.targetDate).getTime() : Number.MAX_VALUE;
      const dateB = b.targetDate ? new Date(b.targetDate).getTime() : Number.MAX_VALUE;
      return dateA - dateB;
    });

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-swar-text mb-2">Goals</h1>
          <p className="text-swar-text-secondary">Create and track your goals linked to visions</p>
        </div>
        <button
          onClick={handleAddGoal}
          className="w-full sm:w-auto justify-center flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Add Goal</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-3 sm:space-y-0 sm:flex sm:gap-4 sm:items-end flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-xs">
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Search</label>
          <input
            type="text"
            placeholder="Search goals..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Vision Filter */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Vision</label>
          <select
            value={filterVision}
            onChange={(e) => setFilterVision(e.target.value)}
            className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Visions</option>
            {visions.map(v => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-swar-border sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-swar-text">
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-2xl font-bold hover:text-red-600 transition"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <GoalForm
                onSubmit={handleSaveGoal}
                onCancel={() => setIsModalOpen(false)}
                initialData={editingGoal || undefined}
                visions={visions}
                actionPlans={actionPlans}
              />
            </div>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGoals.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-swar-text-secondary mb-4">No goals found</p>
            <button
              onClick={handleAddGoal}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              <span>Create your first goal</span>
            </button>
          </div>
        ) : (
          filteredGoals.map(goal => (
            <div
              key={goal.id}
              className="bg-white rounded-lg border-2 border-swar-border shadow-sm hover:shadow-md transition overflow-hidden"
            >
              {/* Image */}
              {goal.imageUrl && (
                <div className="h-32 bg-gray-100 overflow-hidden">
                  <img
                    src={goal.imageUrl}
                    alt={goal.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=No+Image';
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-swar-text line-clamp-2">{goal.title}</h3>
                  <p className="text-xs text-swar-text-secondary mt-1">{getVisionTitle(goal.visionId)}</p>
                </div>

                <p className="text-xs text-swar-text-secondary line-clamp-2">{goal.description}</p>

                {/* Status & Priority Badges */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_COLORS[goal.status || 'not-started'].bg} ${STATUS_COLORS[goal.status || 'not-started'].text}`}>
                    {goal.status || 'not-started'}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                    goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {goal.priority}
                  </span>
                  {goal.completed && (
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-swar-primary-light text-swar-primary">
                      ✓ Done
                    </span>
                  )}
                </div>

                {/* Dates */}
                {(goal.startDate || goal.targetDate) && (
                  <div className="text-xs text-swar-text-secondary">
                    {goal.startDate && <div>{goal.startDate} → {goal.targetDate || '...'}</div>}
                  </div>
                )}

                {/* Budget */}
                {goal.budget && (
                  <div className="text-xs text-swar-primary font-semibold">
                    ₹ {goal.budget.toLocaleString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-swar-border">
                  <button
                    onClick={() => handleEditGoal(goal)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition text-xs font-medium"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition text-xs font-medium"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
