'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ActionPlan, Vision } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerStorage';
import ActionPlanModal from '@/components/ActionPlanModal';

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  'not-started': { text: 'text-gray-700', bg: 'bg-gray-100' },
  'in-progress': { text: 'text-blue-700', bg: 'bg-blue-100' },
  'completed': { text: 'text-green-700', bg: 'bg-green-100' },
  'on-hold': { text: 'text-yellow-700', bg: 'bg-yellow-100' },
};

export default function ActionPlanPage() {
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    const savedPlans = lifePlannerStorage.getActionPlans();
    const savedVisions = lifePlannerStorage.getVisions();
    setActionPlans(savedPlans);
    setVisions(savedVisions);
  }, []);

  useEffect(() => {
    if (mounted) {
      lifePlannerStorage.saveActionPlans(actionPlans);
    }
  }, [actionPlans, mounted]);

  const handleAddPlan = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

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

  // Filter logic - just sort, no filtering
  const filteredPlans = actionPlans
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

  const getVisionTitle = (visionId: string): string => {
    return visions.find(v => v.id === visionId)?.title || 'Unknown Vision';
  };

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Action Plans</h1>
          <p className="text-gray-600">Break down your visions into actionable milestones and goals</p>
        </div>
        <button
          onClick={handleAddPlan}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span>Create Action Plan</span>
        </button>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Action Plan Cards</h2>
          <p className="text-sm text-gray-600">Showing {Math.min(3, filteredPlans.length)} of {filteredPlans.length} plans</p>
        </div>

        <div className="relative">
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {filteredPlans.length > 0 ? (
              filteredPlans.slice(sliderIndex, sliderIndex + 3).map((plan) => (
                <div key={plan.id} className="flex-shrink-0 w-80">
                  {/* Card - Increased Height */}
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300 h-96 flex flex-col">
                    {/* Header with Image and Status */}
                    <div className="relative h-40 overflow-hidden">
                      {plan.imageUrl && (
                        <img
                          src={plan.imageUrl}
                          alt={plan.title}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      )}
                      {!plan.imageUrl && (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                          <span className="text-white text-3xl">📋</span>
                        </div>
                      )}
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[plan.status || 'not-started'].bg} ${STATUS_COLORS[plan.status || 'not-started'].text}`}>
                        {plan.status === 'not-started' ? '⏳ Not Started' : 
                         plan.status === 'in-progress' ? '⚡ In Progress' :
                         plan.status === 'completed' ? '✅ Done' : '⏸️ On Hold'}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-grow flex flex-col overflow-hidden">
                      {/* Title and Vision */}
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{plan.title}</h3>
                      <p className="text-xs text-blue-600 font-semibold mb-2">Vision: {getVisionTitle(plan.visionId)}</p>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.description}</p>

                      {/* Info */}
                      <div className="space-y-1 text-xs text-gray-700 mb-3">
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
                          <span className="text-xs font-semibold text-gray-700">Progress</span>
                          <span className="text-xs font-bold text-blue-600">{plan.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${plan.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Milestones and Goals Count */}
                      <div className="text-xs text-gray-600 mb-3">
                        <span className="mr-3">📌 {plan.milestones?.length || 0} milestones</span>
                        <span>🎯 {plan.goals?.length || 0} goals</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button
                        onClick={() => handleCompletePlan(plan.id)}
                        className="flex-1 px-2 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition"
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
                        className="flex-1 px-2 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
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
                  <div className="text-gray-400 mb-4">
                    <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-600">No action plans found</p>
                </div>
              </div>
            )}
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
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
