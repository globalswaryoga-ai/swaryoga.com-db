'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit2, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Goal, Vision, ActionPlan } from '@/lib/types/lifePlanner';
import { crmPlannerStorage } from '@/lib/crmPlannerMongoStorage';
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');

  // Filters
  const [filterVision, setFilterVision] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setMounted(true);
    (async () => {
      const [savedGoals, savedVisions, savedActionPlans] = await Promise.all([
        crmPlannerStorage.getGoals(),
        crmPlannerStorage.getVisions(),
        crmPlannerStorage.getActionPlans(),
      ]);

      setGoals(Array.isArray(savedGoals) ? savedGoals : []);
      setVisions(Array.isArray(savedVisions) ? savedVisions : []);
      setActionPlans(Array.isArray(savedActionPlans) ? savedActionPlans : []);

      // Debug logging
      console.log('[GoalsPage] Data loaded:', {
        goalsCount: savedGoals?.length || 0,
        visionsCount: savedVisions?.length || 0,
        actionPlansCount: savedActionPlans?.length || 0,
        actionPlans: savedActionPlans,
      });

      setHasLoaded(true);
    })();
  }, []);

  const skipNextSave = useRef(true);
  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }

    setSaveStatus('saving');
    setSaveError('');
    const timer = setTimeout(() => {
      (async () => {
        try {
          await crmPlannerStorage.saveGoals(goals);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to save goals';
          console.error('Error saving goals:', error);
          setSaveStatus('error');
          setSaveError(errorMsg);
        }
      })();
    }, 500);

    return () => clearTimeout(timer);
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

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.completed || g.status === 'completed').length;
  const inProgressGoals = goals.filter(g => !g.completed && g.status === 'in-progress').length;
  const highPriorityGoals = goals.filter(g => !g.completed && g.priority === 'high').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Header Bar with Glossy Orange-to-Green Header */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#059669] text-white p-4 sm:p-6 shadow-[0_12px_28px_rgba(234,88,12,0.22)] border border-white/20">
        {/* Top Specular Gloss Highlight */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[26px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/admin/crm/planner-dashboard"
              className="p-2.5 sm:p-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition active:scale-95 shadow-sm border border-white/25 flex items-center justify-center shrink-0 cursor-pointer"
              title="Back to CRM Planner"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-100 bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/30 shadow-xs truncate">
                  CRM Planner • Targets
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 truncate drop-shadow-sm flex items-center gap-2">
                <span>🎯</span>
                <span>Goals &amp; Milestones</span>
              </h1>
            </div>
          </div>

          <button
            onClick={handleAddGoal}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white hover:bg-white/95 text-orange-700 font-black text-xs sm:text-sm px-4 sm:px-5 py-2.5 transition active:scale-95 shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>+ Add Goal</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row (4 Rounded Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/95 rounded-[20px] p-3.5 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-l-4 border-l-amber-500">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Goals</span>
          <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{totalGoals}</p>
        </div>
        <div className="bg-white/95 rounded-[20px] p-3.5 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-l-4 border-l-emerald-500">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600">Completed</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{completedGoals}</p>
        </div>
        <div className="bg-white/95 rounded-[20px] p-3.5 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-l-4 border-l-blue-500">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-600">In Progress</span>
          <p className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5">{inProgressGoals}</p>
        </div>
        <div className="bg-white/95 rounded-[20px] p-3.5 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-l-4 border-l-rose-500">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600">High Priority</span>
          <p className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">{highPriorityGoals}</p>
        </div>
      </div>

      {/* Filters (Clean 3D Card Container) */}
      <div className="bg-white/95 rounded-[22px] border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-3 sm:space-y-0 sm:flex sm:gap-4 sm:items-end flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-xs">
          <label className="block text-xs font-bold text-slate-600 mb-1">Search Goals</label>
          <input
            type="text"
            placeholder="Search goals by title or description..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          />
        </div>

        {/* Vision Filter */}
        <div className="w-full sm:w-44">
          <label className="block text-xs font-bold text-slate-600 mb-1">Vision</label>
          <select
            value={filterVision}
            onChange={(e) => setFilterVision(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          >
            <option value="all">All Visions</option>
            {visions.map(v => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
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
          <label className="block text-xs font-bold text-slate-600 mb-1">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
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

      {/* Goals Grid (Approved 3D Cards Pattern) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGoals.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white/95 rounded-[24px] border border-slate-200/90 p-8 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-2xl text-slate-400 mb-3">
              🎯
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">No goals found</p>
            <p className="text-xs text-slate-500 mb-4">Create your first goal or adjust the filters above.</p>
            <button
              onClick={handleAddGoal}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#ea580c] to-[#059669] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover:opacity-90 active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Create your first goal</span>
            </button>
          </div>
        ) : (
          filteredGoals.map(goal => {
            const isCompleted = goal.completed || goal.status === 'completed';
            const priorityBorder = isCompleted
              ? 'border-l-emerald-500 bg-emerald-50/20'
              : goal.priority === 'high'
              ? 'border-l-rose-500'
              : goal.priority === 'medium'
              ? 'border-l-amber-500'
              : 'border-l-blue-500';

            const titleColor = isCompleted
              ? 'text-slate-400 line-through'
              : goal.priority === 'high'
              ? 'text-rose-700'
              : goal.priority === 'medium'
              ? 'text-amber-800'
              : 'text-slate-900';

            return (
              <div
                key={goal.id}
                className={`group rounded-[22px] bg-white border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all overflow-hidden flex flex-col justify-between border-l-4 ${priorityBorder}`}
              >
                {/* Image if present */}
                {goal.imageUrl && (
                  <div className="h-32 bg-slate-100 overflow-hidden relative">
                    <img
                      src={goal.imageUrl}
                      alt={goal.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Goal+Image';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>
                )}

                <div className="p-4 sm:p-5 pb-3 space-y-3 flex-1">
                  {/* Top Row: 3D Squircle Icon + Tag Pill */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_6px_14px_rgba(217,119,6,0.22)] flex items-center justify-center text-white shrink-0 overflow-hidden">
                      <div className="absolute top-0.5 inset-x-1 h-3.5 bg-gradient-to-b from-white/40 to-transparent rounded-t-xl pointer-events-none" />
                      <span className="text-xl sm:text-2xl select-none leading-none">🏆</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] sm:text-[11px] tracking-wider uppercase border ${
                          goal.priority === 'high'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : goal.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {goal.priority || 'MEDIUM'}
                      </span>
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-lg font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ DONE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Vision */}
                  <div>
                    <h3 className={`font-bold text-base sm:text-[17px] tracking-tight leading-snug ${titleColor} flex items-center gap-1.5`}>
                      <span>{goal.title}</span>
                      <span className="text-xs transition-transform duration-200 group-hover:translate-x-1">→</span>
                    </h3>
                    {goal.visionId && (
                      <p className="text-[11px] text-slate-500 font-semibold mt-1 flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 uppercase">Vision:</span>
                        <span className="text-slate-700 truncate">{getVisionTitle(goal.visionId)}</span>
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  {/* Meta Pills (Dates & Budget) */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                    {(goal.startDate || goal.targetDate) && (
                      <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 font-semibold text-slate-700 text-[11px]">
                        <span>📅</span>
                        <span>{goal.targetDate ? `Target: ${goal.targetDate}` : goal.startDate}</span>
                      </span>
                    )}
                    {goal.budget && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold text-[11px]">
                        <span>₹</span>
                        <span>{goal.budget.toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Footer Actions */}
                <div className="border-t border-slate-100 px-4 py-3 sm:px-5 flex items-center justify-between bg-slate-50/60 group-hover:bg-slate-100/80 transition">
                  <button
                    onClick={() => handleEditGoal(goal)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Edit goal</span>
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
