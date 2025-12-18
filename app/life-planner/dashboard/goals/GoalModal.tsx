'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Goal } from '@/lib/types/lifePlanner';

interface GoalModalProps {
  goal: Goal | null;
  onSave: (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const GoalModal: React.FC<GoalModalProps> = ({ goal, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    visionId: '',
    title: '',
    description: '',
    startDate: '',
    targetDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'not-started' as 'not-started' | 'in-progress' | 'completed' | 'on-hold',
    progress: 0,
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        visionId: goal.visionId,
        title: goal.title,
        description: goal.description || '',
        startDate: goal.startDate || '',
        targetDate: goal.targetDate || '',
        priority: goal.priority,
        status: goal.status,
        progress: goal.progress ?? 0,
      });
    }
  }, [goal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === 'progress' ? parseInt(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-swar-border">
          <h2 className="text-2xl font-bold text-swar-text">{goal ? 'Edit Goal' : 'Add New Goal'}</h2>
          <button onClick={onClose} className="p-2 text-swar-text-secondary hover:bg-swar-primary-light rounded-lg">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., Lose 10 kg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="Describe your goal"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Priority *</label>
              <select name="priority" value={formData.priority} onChange={handleChange} className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Start Date *</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="w-full px-4 py-2 border border-swar-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Target Date *</label>
              <input type="date" name="targetDate" value={formData.targetDate} onChange={handleChange} required className="w-full px-4 py-2 border border-swar-border rounded-lg" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Status *</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500">
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Progress: {formData.progress}%</label>
              <input type="range" name="progress" min="0" max="100" value={formData.progress} onChange={handleChange} className="w-full" />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-swar-border">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-swar-border rounded-lg text-swar-text font-medium hover:bg-swar-bg">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">
              {goal ? 'Update Goal' : 'Add Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalModal;
