'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, DollarSign, Image, Flag } from 'lucide-react';
import LifePlannerImageUpload from '@/components/LifePlannerImageUpload';
import { VISION_CATEGORIES } from '@/lib/types/lifePlanner';
import type { Vision, ActionPlan, Milestone } from '@/lib/types/lifePlanner';

export interface Goal {
  id: string;
  title: string;
  description: string;
  visionId?: string; // Link to parent vision
  visionTitle?: string; // Display vision title
  actionPlanId?: string; // Link to action plan
  milestoneId?: string; // Link to milestone
  startDate: string;
  endDate: string;
  amount: string;
  category: 'life' | 'health' | 'wealth' | 'success' | 'respect' | 'pleasure' | 'prosperity' | 'luxuries' | 'good-habits' | 'self-sadhana';
  imageUrl: string;
  createdAt: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
}

interface GoalFormProps {
  onSubmit: (goalData: Goal) => void;
  onCancel: () => void;
  initialData?: Goal;
  visions: Vision[];
  actionPlans?: ActionPlan[];
  parentVisionId?: string; // Auto-populate from parent Vision
  parentActionPlanId?: string; // Auto-populate from parent Action Plan
  parentMilestoneId?: string; // Auto-populate from parent Milestone
}

const GoalForm: React.FC<GoalFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  visions,
  actionPlans = [],
  parentVisionId,
  parentActionPlanId,
  parentMilestoneId,
}) => {
  // Determine initial state based on parent context or existing data
  const getInitialVisionHead = () => {
    if (initialData?.visionId) {
      return visions.find(v => v.id === initialData.visionId)?.category || '';
    }
    if (parentVisionId) {
      return visions.find(v => v.id === parentVisionId)?.category || '';
    }
    return '';
  };

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    selectedVisionHead: getInitialVisionHead(),
    visionId: initialData?.visionId || parentVisionId || '',
    actionPlanId: initialData?.actionPlanId || parentActionPlanId || '',
    milestoneId: initialData?.milestoneId || parentMilestoneId || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    amount: initialData?.amount || '',
    imageUrl: initialData?.imageUrl || '',
    priority: initialData?.priority || 'medium' as const,
    status: initialData?.status || 'not-started' as const,
    completed: initialData?.completed || false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-select single vision when only one option exists
  React.useEffect(() => {
    if (formData.selectedVisionHead && visionsUnderHead.length === 1 && !formData.visionId) {
      setFormData(prev => ({
        ...prev,
        visionId: visionsUnderHead[0].id,
        actionPlanId: '',
        milestoneId: '',
      }));
    }
  }, [formData.selectedVisionHead, visionsUnderHead]);

  // Auto-select single action plan when only one option exists
  React.useEffect(() => {
    if (formData.visionId && actionPlansUnderVision.length === 1 && !formData.actionPlanId) {
      setFormData(prev => ({
        ...prev,
        actionPlanId: actionPlansUnderVision[0].id,
        milestoneId: '',
      }));
    }
  }, [formData.visionId, actionPlansUnderVision]);

  // Auto-select single milestone when only one option exists
  React.useEffect(() => {
    if (formData.actionPlanId && milestonesUnderPlan.length === 1 && !formData.milestoneId) {
      setFormData(prev => ({
        ...prev,
        milestoneId: milestonesUnderPlan[0].id,
      }));
    }
  }, [formData.actionPlanId, milestonesUnderPlan]);

  // Filtered lists
  const visionsUnderHead = formData.selectedVisionHead
    ? visions.filter(v => v.category === formData.selectedVisionHead)
    : [];

  const actionPlansUnderVision = formData.visionId
    ? actionPlans.filter(ap => ap.visionId === formData.visionId)
    : [];

  const milestonesUnderPlan = formData.actionPlanId
    ? actionPlans.find(ap => ap.id === formData.actionPlanId)?.milestones || []
    : [];

  const selectedVision = visions.find(v => v.id === formData.visionId);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const targetValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: targetValue }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const isFormValid = useMemo(() => {
    return formData.title.trim().length > 0 && 
           formData.description.trim().length > 0 &&
           formData.startDate &&
           formData.endDate;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Goal title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.startDate > formData.endDate) newErrors.dates = 'End date must be after start date';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const goalData: Goal = {
      id: initialData?.id || Date.now().toString(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      visionId: formData.visionId || undefined,
      visionTitle: selectedVision?.title || undefined,
      actionPlanId: formData.actionPlanId || undefined,
      milestoneId: formData.milestoneId || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      amount: formData.amount,
      category: (formData.selectedVisionHead?.toLowerCase().replace(/\s+/g, '-') || 'life') as any,
      imageUrl: formData.imageUrl,
      priority: formData.priority,
      status: formData.status,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      completed: formData.completed
    };

    onSubmit(goalData);
  }, [formData, initialData, onSubmit, selectedVision]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* If parent context provided, show auto-filled hierarchy */}
      {(parentVisionId || parentActionPlanId) && (
        <>
          {/* Category (Auto from Vision) */}
          <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-3">
            <label className="block text-sm font-semibold text-swar-text mb-2">📂 Category</label>
            <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-swar-text text-sm">
              {formData.selectedVisionHead} (Auto)
            </div>
          </div>

          {/* Vision (Auto from Context) */}
          {formData.visionId && (
            <div className="rounded-lg bg-purple-50 border-2 border-purple-200 p-3">
              <label className="block text-sm font-semibold text-swar-text mb-2">💡 Vision</label>
              <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-swar-text text-sm">
                {selectedVision?.title} (Auto)
              </div>
            </div>
          )}

          {/* Action Plan (Auto from Context or Dropdown if multiple) */}
          {formData.visionId && actionPlansUnderVision.length > 0 && (
            <div className="rounded-lg bg-indigo-50 border-2 border-indigo-200 p-3">
              <label className="block text-sm font-semibold text-swar-text mb-2">📋 Action Plan</label>
              {actionPlansUnderVision.length === 1 ? (
                <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-swar-text text-sm">
                  {actionPlansUnderVision[0].title} (Auto - only option)
                </div>
              ) : (
                <select
                  value={formData.actionPlanId}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      actionPlanId: e.target.value,
                      milestoneId: '',
                    }));
                  }}
                  className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="">Choose action plan...</option>
                  {actionPlansUnderVision.map(ap => (
                    <option key={ap.id} value={ap.id}>{ap.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Milestone (Dropdown if multiple, Auto if single) */}
          {formData.actionPlanId && milestonesUnderPlan.length > 0 && (
            <div className="rounded-lg bg-indigo-50 border-2 border-indigo-200 p-3">
              <label className="block text-sm font-semibold text-swar-text mb-2">🏁 Milestone</label>
              {milestonesUnderPlan.length === 1 ? (
                <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-swar-text text-sm">
                  Milestone 1: {milestonesUnderPlan[0].title} (Auto)
                </div>
              ) : (
                <select
                  value={formData.milestoneId}
                  onChange={(e) => setFormData(prev => ({ ...prev, milestoneId: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="">Choose milestone...</option>
                  {milestonesUnderPlan.map((milestone, index) => (
                    <option key={milestone.id} value={milestone.id}>
                      Milestone {index + 1}: {milestone.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </>
      )}

      {/* Manual selection (no parent context) */}
      {!parentVisionId && !parentActionPlanId && (
        <>
          {/* Vision Head Selector */}
          <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-4">
            <label className="block text-sm font-semibold text-swar-text mb-3">🎯 Select Vision Head</label>
            <select
              value={formData.selectedVisionHead}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  selectedVisionHead: e.target.value,
                  visionId: '',
                  actionPlanId: '',
                  milestoneId: '',
                }));
              }}
              className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">Choose vision head...</option>
              {VISION_CATEGORIES.map(head => (
                <option key={head} value={head}>{head}</option>
              ))}
            </select>
          </div>

          {/* Vision Selector - Dropdown if multiple, Auto if single */}
          {formData.selectedVisionHead && (
            <div className="rounded-lg bg-purple-50 border-2 border-purple-200 p-4">
              <label className="block text-sm font-semibold text-swar-text mb-3">💡 Link to Vision</label>
              {visionsUnderHead.length === 1 ? (
                <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-swar-text">
                  {visionsUnderHead[0].title} (Auto - only option)
                </div>
              ) : (
                <select
                  value={formData.visionId}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      visionId: e.target.value,
                      actionPlanId: '',
                      milestoneId: '',
                    }));
                  }}
                  className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                >
                  <option value="">Choose vision...</option>
                  {visionsUnderHead.map(vision => (
                    <option key={vision.id} value={vision.id}>{vision.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Action Plan Selector - Dropdown if multiple, Auto if single */}
          {formData.visionId && actionPlans.length > 0 && (
            <div className="rounded-lg bg-indigo-50 border-2 border-indigo-200 p-4">
              <label className="block text-sm font-semibold text-swar-text mb-3">📋 Link to Action Plan (Optional)</label>
              {actionPlansUnderVision.length === 1 ? (
                <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-swar-text">
                  {actionPlansUnderVision[0].title} (Auto - only option)
                </div>
              ) : (
                <select
                  value={formData.actionPlanId}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      actionPlanId: e.target.value,
                      milestoneId: '',
                    }));
                  }}
                  className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="">Choose action plan...</option>
                  {actionPlansUnderVision.map(ap => (
                    <option key={ap.id} value={ap.id}>{ap.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Milestone Selector - Dropdown if multiple, Auto if single */}
          {formData.actionPlanId && milestonesUnderPlan.length > 0 && (
            <div className="rounded-lg bg-indigo-50 border-2 border-indigo-200 p-4">
              <label className="block text-sm font-semibold text-swar-text mb-3">🏁 Link to Milestone (Optional)</label>
              {milestonesUnderPlan.length === 1 ? (
                <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-swar-text">
                  Milestone 1: {milestonesUnderPlan[0].title} (Auto)
                </div>
              ) : (
                <select
                  value={formData.milestoneId}
                  onChange={(e) => setFormData(prev => ({ ...prev, milestoneId: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="">Choose milestone...</option>
                  {milestonesUnderPlan.map((milestone, index) => (
                    <option key={milestone.id} value={milestone.id}>
                      Milestone {index + 1}: {milestone.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </>
      )}

      {/* Goal Title */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2">
          Goal Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            errors.title ? 'border-red-500' : 'border-swar-border'
          }`}
          placeholder="e.g., Run a Marathon, Master TypeScript"
          required
        />
        {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2">
          Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            errors.description ? 'border-red-500' : 'border-swar-border'
          }`}
          placeholder="Describe your goal, steps needed, and expected outcomes"
          rows={4}
          required
        />
        {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-semibold text-swar-text mb-2">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="not-started">📋 Not Started</option>
            <option value="in-progress">⏳ In Progress</option>
            <option value="completed">✅ Completed</option>
            <option value="on-hold">⏸️ On Hold</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>
        </div>
      </div>

      {/* Priority Grid */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-semibold text-swar-text mb-2">
            Priority
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
      </div>

      {/* Start & End Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Start Date *
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.startDate ? 'border-red-500' : 'border-swar-border'
            }`}
            required
          />
          {errors.startDate && <p className="text-red-600 text-xs mt-1">{errors.startDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            End Date *
          </label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.endDate ? 'border-red-500' : 'border-swar-border'
            }`}
            required
          />
          {errors.endDate && <p className="text-red-600 text-xs mt-1">{errors.endDate}</p>}
        </div>
      </div>
      {errors.dates && <p className="text-red-600 text-xs">{errors.dates}</p>}

      {/* Amount */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
          <DollarSign size={18} className="text-swar-primary" />
          Budget/Amount (₹)
        </label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="0.00"
          step="0.01"
        />
      </div>

      {/* Goal Image Upload */}
      <LifePlannerImageUpload
        label="Goal Image (Optional)"
        onImageUrlChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
        currentImageUrl={formData.imageUrl}
        maxSizeMB={5}
      />

      {/* Completed Checkbox */}
      <div className="flex items-center gap-3 px-4 py-3 bg-swar-bg rounded-lg">
        <input
          type="checkbox"
          id="completed"
          name="completed"
          checked={formData.completed}
          onChange={handleChange}
          className="w-5 h-5 rounded border-2 border-swar-border cursor-pointer"
        />
        <label htmlFor="completed" className="text-sm font-medium text-swar-text cursor-pointer">
          Mark as Completed
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-5 border-t border-swar-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border-2 border-swar-border rounded-lg text-swar-text font-medium hover:bg-swar-bg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isFormValid}
          className={`px-5 py-2.5 rounded-lg text-white font-medium transition-colors ${
            isFormValid
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {initialData ? 'Update' : 'Add'} Goal
        </button>
      </div>
    </form>
  );
};

export default GoalForm;
