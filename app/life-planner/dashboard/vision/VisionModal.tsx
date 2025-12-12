'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Vision, Milestone, Reminder, Goal, Task, Todo, Word, VISION_CATEGORIES } from '@/lib/types/lifePlanner';

interface VisionModalProps {
  vision: Vision | null;
  onSave: (visionData: Omit<Vision, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const VisionModal: React.FC<VisionModalProps> = ({ vision, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    categoryImageUrl: '',
    category: 'Life' as typeof VISION_CATEGORIES[number],
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'not-started' as 'not-started' | 'in-progress' | 'completed' | 'on-hold',
    startDate: '',
    endDate: '',
    milestones: [] as Milestone[],
    reminders: [] as Reminder[],
    goals: [] as Goal[],
    tasks: [] as Task[],
    todos: [] as Todo[],
    words: [] as Word[],
  });

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'not-started' as 'not-started' | 'in-progress' | 'completed',
  });

  useEffect(() => {
    if (vision) {
      setFormData({
        title: vision.title,
        description: vision.description,
        imageUrl: vision.imageUrl || '',
        categoryImageUrl: vision.categoryImageUrl || '',
        category: vision.category,
        priority: vision.priority || 'medium',
        status: vision.status || 'not-started',
        startDate: vision.startDate,
        endDate: vision.endDate,
        milestones: vision.milestones,
        reminders: vision.reminders || [],
        goals: vision.goals || [],
        tasks: vision.tasks || [],
        todos: vision.todos || [],
        words: vision.words || [],
      });
    }
  }, [vision]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setFormData(prev => ({ ...prev, category: value as typeof VISION_CATEGORIES[number] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddMilestone = () => {
    if (newMilestone.title.trim()) {
      const milestone: Milestone = {
        id: Date.now().toString(),
        title: newMilestone.title,
        description: newMilestone.description || undefined,
        dueDate: newMilestone.dueDate,
        status: newMilestone.status,
        completed: false,
      };
      setFormData(prev => ({
        ...prev,
        milestones: [...prev.milestones, milestone],
      }));
      setNewMilestone({ title: '', description: '', dueDate: '', status: 'not-started' });
    }
  };

  const handleRemoveMilestone = (id: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== id),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {vision ? 'Edit Vision' : 'Add New Vision'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title and Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vision Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., Build a Meditation Practice"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="What is this vision about?"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vision Head (Category) *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {VISION_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            {formData.imageUrl && (
              <div className="mt-4 rounded-lg overflow-hidden h-40">
                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={() => {}} />
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Milestones */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Milestones</h3>

            {/* Add Milestone Form */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Milestone Title</label>
                <input
                  type="text"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g., Complete 30-day meditation challenge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Additional details (optional)"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newMilestone.dueDate}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={newMilestone.status}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, status: e.target.value as 'not-started' | 'in-progress' | 'completed' }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddMilestone}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Milestone</span>
              </button>
            </div>

            {/* Milestones List */}
            <div className="space-y-2">
              {formData.milestones.length === 0 ? (
                <p className="text-gray-500 text-sm">No milestones added yet.</p>
              ) : (
                formData.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{milestone.title}</p>
                      {milestone.description && <p className="text-sm text-gray-600">{milestone.description}</p>}
                      <p className="text-xs text-gray-500">Due: {new Date(milestone.dueDate).toLocaleDateString()} • {milestone.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(milestone.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              {vision ? 'Update Vision' : 'Add Vision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisionModal;
