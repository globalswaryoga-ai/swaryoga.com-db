'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActionPlan, Vision } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import ActionPlanModal from '@/components/ActionPlanModal';

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  'not-started': { text: 'text-swar-text', bg: 'bg-swar-primary-light' },
  'in-progress': { text: 'text-blue-700', bg: 'bg-blue-100' },
  'completed': { text: 'text-swar-primary', bg: 'bg-swar-primary-light' },
  'on-hold': { text: 'text-yellow-700', bg: 'bg-yellow-100' },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Life': { bg: 'bg-purple-600', text: 'text-white' },
  'Health': { bg: 'bg-swar-primary', text: 'text-white' },
  'Wealth': { bg: 'bg-red-600', text: 'text-white' },
  'Success': { bg: 'bg-blue-600', text: 'text-white' },
  'Respect': { bg: 'bg-orange-600', text: 'text-white' },
  'Pleasure': { bg: 'bg-pink-600', text: 'text-white' },
  'Prosperity': { bg: 'bg-indigo-600', text: 'text-white' },
  'Luxurious': { bg: 'bg-yellow-600', text: 'text-white' },
  'Good Habits': { bg: 'bg-teal-600', text: 'text-white' },
  'Sadhana': { bg: 'bg-cyan-600', text: 'text-white' },
};

export default function ActionPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didAutoOpen = useRef(false);

  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(0);

  // Filters (UI-only; never persisted)
  const [filterHead, setFilterHead] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setMounted(true);
    (async () => {
      const savedPlans = await lifePlannerStorage.getActionPlans();
      const savedVisions = await lifePlannerStorage.getVisions();
      setActionPlans(savedPlans);
      setVisions(savedVisions);
      setHasLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    // Prevent overwriting Mongo data with an empty array due to transient initial state.
    if (actionPlans.length === 0) return;
    (async () => {
      await lifePlannerStorage.saveActionPlans(actionPlans);
    })();
  }, [actionPlans, mounted, hasLoaded]);

  const handleAddPlan = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!mounted) return;
    if (didAutoOpen.current) return;
    if (searchParams.get('create') !== '1') return;

    didAutoOpen.current = true;
    handleAddPlan();
    router.replace('/life-planner/dashboard/action-plan');
  }, [mounted, searchParams, router]);

  const handleEditPlan = (plan: ActionPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleDeletePlan = (id: string) => {
    setActionPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleCompletePlan = (id: string) => {
    setActionPlans(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, status: 'completed', progress: 100, updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  const getVisionTitle = (visionId: string): string => {
    return visions.find(v => v.id === visionId)?.title || 'Unknown Vision';
  };

  const getVisionCategory = (visionId: string): string | undefined => {
    return visions.find(v => v.id === visionId)?.category;
  };

  const uniqueHeads = Array.from(
    new Set(visions.map(v => v.category).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredPlans = actionPlans
    .filter((p) => {
      const head = getVisionCategory(p.visionId);
      const matchesHead = filterHead === 'all' || head === filterHead;
      const matchesStatus = filterStatus === 'all' || (p.status || 'not-started') === filterStatus;

      const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth as any);
      const dateStr = p.endDate || p.startDate;
      const date = dateStr ? new Date(dateStr) : null;
      const matchesMonth = monthIdx === null || (date && !Number.isNaN(date.getTime()) && date.getMonth() === monthIdx);

      const haystack = `${p.title || ''} ${p.description || ''} ${getVisionTitle(p.visionId)}`.toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

      return matchesHead && matchesStatus && matchesMonth && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by due date (endDate) in ascending order
      const dateA = a.endDate ? new Date(a.endDate).getTime() : Number.MAX_VALUE;
      const dateB = b.endDate ? new Date(b.endDate).getTime() : Number.MAX_VALUE;
      return dateA - dateB;
    });

  const handleSavePlan = (planData: ActionPlan) => {
    if (editingPlan) {
      setActionPlans(prev =>
        prev.map(p =>
          p.id === editingPlan.id ? planData : p
        )
      );
    } else {
      setActionPlans(prev => [...prev, planData]);
    }
    setIsModalOpen(false);
  };

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-swar-text mb-2">Action Plans</h1>
          <p className="text-swar-text-secondary">Break down your visions into actionable milestones and goals</p>
        </div>
        <button
          onClick={handleAddPlan}
          className="flex items-center space-x-2 bg-gradient-to-r from-swar-primary to-swar-accent text-white px-6 py-3 rounded-lg hover:from-swar-primary hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span>Create Action Plan</span>
        </button>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-swar-text">Action Plan Cards</h2>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold text-swar-text mb-1">Search</label>
              <input
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setSliderIndex(0);
                }}
                placeholder="Search plan / vision name"
                className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-swar-text mb-1">Vision Head</label>
              <select
                value={filterHead}
                onChange={(e) => {
                  setFilterHead(e.target.value);
                  setSliderIndex(0);
                }}
                className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                <option value="all">All</option>
                {uniqueHeads.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-swar-text mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setSliderIndex(0);
                }}
                className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                <option value="all">All</option>
                <option value="not-started">not-started</option>
                <option value="in-progress">in-progress</option>
                <option value="completed">completed</option>
                <option value="on-hold">on-hold</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-swar-text mb-1">Month</label>
              <select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setSliderIndex(0);
                }}
                className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                <option value="all">All</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setSearchText('');
                  setFilterHead('all');
                  setFilterStatus('all');
                  setFilterMonth('all');
                  setSliderIndex(0);
                }}
                className="w-full px-3 py-2 rounded-lg bg-swar-primary-light text-swar-text font-bold hover:bg-swar-primary-light transition"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <p className="mt-3 text-sm text-swar-text-secondary">Showing {filteredPlans.length} of {actionPlans.length} plans</p>
        </div>

        <div className="relative">
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {filteredPlans.length > 0 ? (
              filteredPlans.slice(sliderIndex, sliderIndex + 3).map((plan) => (
                <div key={plan.id} className="flex-shrink-0 w-80">
                  {/* Card - Increased Height */}
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 h-auto flex flex-col" style={{maxHeight: '600px'}}>
                    {/* Header with Image and Status */}
                    <div className="relative h-64 overflow-hidden">
                      {plan.imageUrl && (
                        <img
                          src={plan.imageUrl}
                          alt={plan.title}
                          className="w-full h-full object-cover transition-transform duration-300"
                        />
                      )}
                      {!plan.imageUrl && (
                        <div className="w-full h-full bg-gradient-to-br from-swar-primary to-cyan-500 flex items-center justify-center">
                          <span className="text-white text-3xl">📋</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        {plan.goals && plan.goals.length > 0 && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 bg-black/55 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-extrabold border border-white/20 hover:bg-black/65 transition"
                            title="Open Tasks"
                            onClick={() => {
                              const head = getVisionCategory(plan.visionId);
                              const firstGoalId = plan.goals?.[0]?.id || '';
                              const params = new URLSearchParams();
                              params.set('openTaskForm', '1');
                              if (head) params.set('head', head);
                              if (firstGoalId) params.set('goalId', firstGoalId);
                              router.push(`/life-planner/dashboard/tasks?${params.toString()}`);
                            }}
                          >
                            <span className="text-sm">🎯</span>
                            <span>Goals</span>
                            <span className="text-[11px] font-black bg-white/20 rounded-full px-2 py-0.5">
                              {plan.goals.length}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Head + Status moved into the row below the image */}
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-grow flex flex-col overflow-y-auto">
                      {/* Title and Vision */}
                      <h3 className="text-lg font-bold text-swar-text mb-1 line-clamp-2">{plan.title}</h3>
                      <p className="text-xs text-blue-600 font-semibold mb-2">Vision: {getVisionTitle(plan.visionId)}</p>

                      {/* Row: Goals / Head / Status */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-swar-primary-light text-swar-text text-xs font-bold">
                          <span>🎯 Goals</span>
                          <span className="text-[11px] font-black bg-white rounded-full px-2 py-0.5 border border-swar-border">
                            {plan.goals?.length || 0}
                          </span>
                        </div>

                        {getVisionCategory(plan.visionId) && (
                          <div
                            className={`${CATEGORY_COLORS[getVisionCategory(plan.visionId)!]?.bg || 'bg-gray-600'} ${CATEGORY_COLORS[getVisionCategory(plan.visionId)!]?.text || 'text-white'} px-3 py-1 rounded-full text-xs font-bold`}
                            title="Vision Head"
                          >
                            {getVisionCategory(plan.visionId)}
                          </div>
                        )}

                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[plan.status || 'not-started'].bg} ${STATUS_COLORS[plan.status || 'not-started'].text}`}>
                          {plan.status === 'not-started' ? '⏳ Not Started' :
                           plan.status === 'in-progress' ? '⚡ In Progress' :
                           plan.status === 'completed' ? '✅ Done' : '⏸️ On Hold'}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-swar-text-secondary mb-3 line-clamp-2">{plan.description}</p>

                      {/* Info */}
                      <div className="space-y-1 text-xs text-swar-text mb-3">
                        {plan.startDate && plan.endDate && (
                          <div className="flex items-center gap-2">
                            📅 {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                          </div>
                        )}
                        {plan.workingHoursStart && plan.workingHoursEnd && (
                          <div className="flex items-center gap-2">
                            ⏰ {plan.workingHoursStart} - {plan.workingHoursEnd}
                          </div>
                        )}
                        {plan.place && <div className="flex items-center gap-2">📍 {plan.place}</div>}
                        {plan.expectedAmount && <div className="flex items-center gap-2">💰 Rs. {plan.expectedAmount}</div>}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-swar-text">Progress</span>
                          <span className="text-xs font-bold text-blue-600">{plan.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-swar-primary-light rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-swar-primary to-swar-accent h-2 rounded-full transition-all duration-300"
                            style={{ width: `${plan.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Milestones Section */}
                      {plan.milestones && plan.milestones.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-sm font-extrabold border border-blue-100">
                              <span className="text-base">📌</span>
                              <span>Milestones</span>
                              <span className="text-xs font-black bg-blue-600 text-white rounded-full px-2 py-0.5">{plan.milestones.length}</span>
                            </div>
                          </div>
                          <div className="h-px bg-gradient-to-r from-blue-200 via-gray-200 to-transparent mb-2" />
                          <div className="space-y-2 max-h-24 overflow-y-auto">
                            {plan.milestones.map((milestone) => (
                              <div key={milestone.id} className="text-xs bg-swar-bg border border-gray-100 rounded-lg px-3 py-2">
                                <p className="font-bold text-swar-text">
                                  {milestone.title?.trim() ? milestone.title : 'Milestone'}
                                </p>
                                {(milestone.startDate || milestone.endDate) && (
                                  <p className="text-[11px] text-swar-text mt-0.5">
                                    📅 {milestone.startDate ? new Date(milestone.startDate).toLocaleDateString() : '—'}
                                    {'  '}–{'  '}
                                    {milestone.endDate ? new Date(milestone.endDate).toLocaleDateString() : '—'}
                                  </p>
                                )}
                                {(milestone.workingHoursStart || milestone.workingHoursEnd) && (
                                  <p className="text-[11px] text-swar-text">
                                    ⏰ {milestone.workingHoursStart || '—'} - {milestone.workingHoursEnd || '—'}
                                  </p>
                                )}
                                {milestone.place && (
                                  <p className="text-[11px] text-swar-text">📍 {milestone.place}</p>
                                )}
                                {milestone.description?.trim() && (
                                  <p className="text-swar-text-secondary mt-1 line-clamp-2">{milestone.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Goals Section */}
                      {plan.goals && plan.goals.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-sm font-extrabold border border-emerald-100">
                              <span className="text-base">🎯</span>
                              <span>Goals</span>
                              <span className="text-xs font-black bg-emerald-600 text-white rounded-full px-2 py-0.5">{plan.goals.length}</span>
                            </div>
                          </div>
                          <div className="h-px bg-gradient-to-r from-emerald-200 via-gray-200 to-transparent mb-2" />
                          <div className="space-y-2 max-h-24 overflow-y-auto">
                            {plan.goals.map((goal) => (
                              <div key={goal.id} className="text-xs bg-swar-bg border border-gray-100 rounded-lg px-3 py-2">
                                <p className="font-bold text-swar-text">{goal.title || 'Goal'}</p>
                                {(goal.startDate || goal.endDate) && (
                                  <p className="text-[11px] text-swar-text mt-0.5">
                                    📅 {goal.startDate ? new Date(goal.startDate).toLocaleDateString() : '—'}
                                    {'  '}–{'  '}
                                    {goal.endDate ? new Date(goal.endDate).toLocaleDateString() : '—'}
                                  </p>
                                )}
                                {(goal.workingTimeStart || goal.workingTimeEnd) && (
                                  <p className="text-[11px] text-swar-text">
                                    ⏰ {goal.workingTimeStart || '—'} - {goal.workingTimeEnd || '—'}
                                  </p>
                                )}
                                {goal.place && (
                                  <p className="text-[11px] text-swar-text">📍 {goal.place}</p>
                                )}
                                {goal.description?.trim() && (
                                  <p className="text-swar-text-secondary mt-1 line-clamp-2">{goal.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button
                        onClick={() => handleCompletePlan(plan.id)}
                        className="flex-1 px-2 py-2 bg-swar-primary text-white text-xs font-bold rounded-lg hover:bg-swar-primary transition"
                        title="Mark as Done"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => handleEditPlan(plan)}
                        className="flex-1 px-2 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="flex-1 px-2 py-2 bg-swar-primary-light text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-swar-text-secondary mb-4">
                    <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-swar-text-secondary">No action plans found</p>
                </div>
              </div>
            )}
          </div>

        </div>

          {/* Navigation Buttons */}
          {filteredPlans.length > 3 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              {/* Previous Button */}
              <button
                onClick={() => setSliderIndex(Math.max(0, sliderIndex - 3))}
                disabled={sliderIndex === 0}
                className="px-4 py-2 text-blue-600 font-semibold hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex gap-2">
                {Array.from({ length: Math.ceil(filteredPlans.length / 3) }).map((_, pageIndex) => (
                  <button
                    key={pageIndex}
                    onClick={() => setSliderIndex(pageIndex * 3)}
                    className={`w-10 h-10 rounded-lg font-semibold transition ${
                      Math.floor(sliderIndex / 3) === pageIndex
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-swar-primary-light text-swar-text hover:bg-gray-300'
                    }`}
                  >
                    {pageIndex + 1}
                  </button>
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setSliderIndex(Math.min(filteredPlans.length - 3, sliderIndex + 3))}
                disabled={sliderIndex + 3 >= filteredPlans.length}
                className="px-4 py-2 text-blue-600 font-semibold hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          )}
      </div>

      {/* No Visions Warning */}
      {visions.length === 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800 font-semibold mb-4">Create visions first to add action plans</p>
          <a
            href="/life-planner/dashboard/vision"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>Go to Vision Dashboard</span>
          </a>
        </div>
      )}

      <ActionPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlan}
        visions={visions}
        editingPlan={editingPlan || undefined}
      />
    </div>
  );
}
