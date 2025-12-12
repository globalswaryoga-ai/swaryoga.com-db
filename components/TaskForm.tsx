'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, CheckCircle, Image, Zap } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  description: string;
  goalId?: string; // Link to parent goal
  goalTitle?: string; // Display goal title
  startDate: string;
  endDate: string;
  priority: 'high' | 'medium' | 'low';
  imageUrl: string;
  createdAt: string;
  completed: boolean;
  progress: number; // 0-100
}

interface TaskFormProps {
  onSubmit: (taskData: Task) => void;
  onCancel: () => void;
  initialData?: Task;
  goals: Array<{ id: string; title: string }>;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onCancel, initialData, goals }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    goalId: initialData?.goalId || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    priority: initialData?.priority || 'medium' as const,
    imageUrl: initialData?.imageUrl || '',
    progress: initialData?.progress || 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'progress' ? parseInt(value) : value }));
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
    if (!formData.title.trim()) newErrors.title = 'Task title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.startDate > formData.endDate) newErrors.dates = 'End date must be after start date';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const selectedGoal = goals.find(g => g.id === formData.goalId);
    const taskData: Task = {
      id: initialData?.id || Date.now().toString(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      goalId: formData.goalId || undefined,
      goalTitle: selectedGoal?.title || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      priority: formData.priority,
      imageUrl: formData.imageUrl,
      progress: formData.progress,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      completed: initialData?.completed || false
    };

    onSubmit(taskData);
  }, [formData, initialData, onSubmit, goals]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Parent Goal */}
      {goals.length > 0 && (
        <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-3">
          <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            🎯 Link to Goal (Optional)
          </label>
          <select
            name="goalId"
            value={formData.goalId}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="">-- No parent goal --</option>
            {goals.map(goal => (
              <option key={goal.id} value={goal.id}>{goal.title}</option>
            ))}
          </select>
          {formData.goalId && (
            <p className="text-sm text-blue-700 mt-2 font-medium">
              ✓ Task linked to: <span className="font-bold">{goals.find(g => g.id === formData.goalId)?.title}</span>
            </p>
          )}
        </div>
      )}

      {/* Task Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Task Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Complete Week 1 Training, Setup Development Environment"
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
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Describe the task details, steps, and deliverables"
          rows={4}
          required
        />
        {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Zap size={18} className="text-yellow-600" />
          Priority
        </label>
        <select
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
        >
          <option value="high">🔴 High - Urgent</option>
          <option value="medium">🟡 Medium - Important</option>
          <option value="low">🟢 Low - Can Wait</option>
        </select>
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
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition ${
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
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition ${
              errors.endDate ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.endDate && <p className="text-red-600 text-xs mt-1">{errors.endDate}</p>}
        </div>
      </div>
      {errors.dates && <p className="text-red-600 text-xs">{errors.dates}</p>}

      {/* Progress */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            Progress
          </span>
          <span className="text-lg font-bold text-cyan-600">{formData.progress}%</span>
        </label>
        <input
          type="range"
          name="progress"
          value={formData.progress}
          onChange={handleChange}
          min="0"
          max="100"
          className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        />
        <div className="mt-2 h-2 bg-gray-300 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all"
            style={{ width: `${formData.progress}%` }}
          />
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Image size={18} className="text-orange-600" />
          Task Image URL (Optional)
        </label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
          placeholder="https://example.com/image.jpg"
        />
        {formData.imageUrl && (
          <div className="mt-3 relative h-40 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
            <img 
              src={formData.imageUrl} 
              alt="Task preview" 
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
              ? 'bg-cyan-600 hover:bg-cyan-700 cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {initialData ? 'Update' : 'Add'} Task
        </button>
      </div>
    </form>
  );
};

export default TaskForm;
