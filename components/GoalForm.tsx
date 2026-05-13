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
}

const GoalForm: React.FC<GoalFormProps> = ({ onSubmit, onCancel, initialData, visions, actionPlans = [] }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    selectedVisionHead: initialData?.visionId ? visions.find(v => v.id === initialData.visionId)?.category || '' : '',
    visionId: initialData?.visionId || '',
    actionPlanId: initialData?.actionPlanId || '',
    milestoneId: initialData?.milestoneId || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    amount: initialData?.amount || '',
    category: initialData?.category || 'health' as const,
    imageUrl: initialData?.imageUrl || '',
    priority: initialData?.priority || 'medium' as const,
    status: initialData?.status || 'not-started' as const,
    completed: initialData?.completed || false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      category: formData.category,
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
      {/* Category Selector - First */}
      <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-4">
        <label className="block text-sm font-semibold text-swar-text mb-3 flex items-center gap-2">
          📂 Select Category *
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        >
          {VISION_CATEGORIES.map(cat => (
            <option key={cat} value={cat.toLowerCase().replace(/\s+/g, '-')}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Vision Head - Second */}
      <div className="rounded-lg bg-purple-50 border-2 border-purple-200 p-4">
        <label className="block text-sm font-semibold text-swar-text mb-3 flex items-center gap-2">
          🎯 Select Vision Head
        </label>
        <select
          value={formData.selectedVisionHead}
          onChange={(e) => {
            setFormData(prev => ({
              ...prev,
              selectedVisionHead: e.target.value,
              visionId: '', // Reset vision when head changes
              actionPlanId: '',
              milestoneId: '',
            }));
          }}
          className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        >
          <option value="">Choose a vision head...</option>
          {VISION_CATEGORIES.map(head => (
            <option key={head} value={head}>{head}</option>
          ))}
        </select>
      </div>

      {/* Vision Selector - Third (filtered by head) */}
      {formData.selectedVisionHead && (
        <div className="rounded-lg bg-purple-50 border-2 border-purple-200 p-4">
          <label className="block text-sm font-semibold text-swar-text mb-3 flex items-center gap-2">
            💡 Link to Vision
          </label>
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
            <option value="">Choose a vision...</option>
            {visionsUnderHead.map(vision => (
              <option key={vision.id} value={vision.id}>{vision.title}</option>
            ))}
          </select>
          {formData.visionId && (
            <p className="text-sm text-purple-700 mt-2 font-medium">
              ✓ Linked to: <span className="font-bold">{selectedVision?.title}</span>
            </p>
          )}
        </div>
      )}

      {/* Action Plan Selector - Fourth (filtered by vision) */}
      {formData.visionId && actionPlans.length > 0 && (
        <div className="rounded-lg bg-indigo-50 border-2 border-indigo-200 p-4">
          <label className="block text-sm font-semibold text-swar-text mb-3 flex items-center gap-2">
            📋 Link to Action Plan (Optional)
          </label>
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
            <option value="">Choose an action plan...</option>
            {actionPlansUnderVision.map(ap => (
              <option key={ap.id} value={ap.id}>{ap.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Milestone Selector - Fifth (filtered by action plan) */}
      {formData.actionPlanId && milestonesUnderPlan.length > 0 && (
        <div className="rounded-lg bg-indigo-50 border-2 border-indigo-200 p-4">
          <label className="block text-sm font-semibold text-swar-text mb-3 flex items-center gap-2">
            🏁 Link to Milestone (Optional)
          </label>
          <select
            value={formData.milestoneId}
            onChange={(e) => setFormData(prev => ({ ...prev, milestoneId: e.target.value }))}
            className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">Choose a milestone...</option>
            {milestonesUnderPlan.map((milestone, index) => (
              <option key={milestone.id} value={milestone.id}>
                Milestone {index + 1}: {milestone.title}
              </option>
            ))}
          </select>
        </div>
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
