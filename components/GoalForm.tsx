'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, DollarSign, Image, Flag } from 'lucide-react';

export interface Goal {
  id: string;
  title: string;
  description: string;
  visionId?: string; // Link to parent vision
  visionTitle?: string; // Display vision title
  startDate: string;
  endDate: string;
  amount: string;
  category: 'health' | 'wealth' | 'education' | 'career' | 'relationships' | 'spirituality';
  imageUrl: string;
  createdAt: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface GoalFormProps {
  onSubmit: (goalData: Goal) => void;
  onCancel: () => void;
  initialData?: Goal;
  visions: Array<{ id: string; title: string }>;
}

const GoalForm: React.FC<GoalFormProps> = ({ onSubmit, onCancel, initialData, visions }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    visionId: initialData?.visionId || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    amount: initialData?.amount || '',
    category: initialData?.category || 'health' as const,
    imageUrl: initialData?.imageUrl || '',
    priority: initialData?.priority || 'medium' as const
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

    const selectedVision = visions.find(v => v.id === formData.visionId);
    const goalData: Goal = {
      id: initialData?.id || Date.now().toString(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      visionId: formData.visionId || undefined,
      visionTitle: selectedVision?.title || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      amount: formData.amount,
      category: formData.category,
      imageUrl: formData.imageUrl,
      priority: formData.priority,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      completed: initialData?.completed || false
    };

    onSubmit(goalData);
  }, [formData, initialData, onSubmit, visions]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Parent Vision */}
      {visions.length > 0 && (
        <div className="rounded-lg bg-purple-50 border-2 border-purple-200 p-3">
          <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            🎯 Link to Vision (Optional)
          </label>
          <select
            name="visionId"
            value={formData.visionId}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          >
            <option value="">-- No parent vision --</option>
            {visions.map(vision => (
              <option key={vision.id} value={vision.id}>{vision.title}</option>
            ))}
          </select>
          {formData.visionId && (
            <p className="text-sm text-purple-700 mt-2 font-medium">
              ✓ Goal linked to: <span className="font-bold">{visions.find(v => v.id === formData.visionId)?.title}</span>
            </p>
          )}
        </div>
      )}

      {/* Goal Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Goal Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Run a Marathon, Master TypeScript"
          required
        />
        {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Describe your goal, steps needed, and expected outcomes"
          rows={4}
          required
        />
        {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Category & Priority Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Flag size={18} className="text-blue-600" />
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="health">💪 Health</option>
            <option value="wealth">💰 Wealth</option>
            <option value="education">📚 Education</option>
            <option value="career">💼 Career</option>
            <option value="relationships">❤️ Relationships</option>
            <option value="spirituality">🧘 Spirituality</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Priority
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
          <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Start Date *
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.startDate ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.startDate && <p className="text-red-600 text-xs mt-1">{errors.startDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            End Date *
          </label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.endDate ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.endDate && <p className="text-red-600 text-xs mt-1">{errors.endDate}</p>}
        </div>
      </div>
      {errors.dates && <p className="text-red-600 text-xs">{errors.dates}</p>}

      {/* Amount */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <DollarSign size={18} className="text-green-600" />
          Budget/Amount (₹)
        </label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="0.00"
          step="0.01"
        />
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Image size={18} className="text-orange-600" />
          Goal Image URL (Optional)
        </label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="https://example.com/image.jpg"
        />
        {formData.imageUrl && (
          <div className="mt-3 relative h-40 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
            <img 
              src={formData.imageUrl} 
              alt="Goal preview" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
              }}
            />
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
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
