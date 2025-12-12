'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Eye } from 'lucide-react';
import { Vision, Milestone, Reminder, Goal, Task, Todo, Word, VISION_CATEGORIES } from '@/lib/types/lifePlanner';
import { getDefaultCategoryImage } from '@/lib/visionCategoryImages';

interface VisionFormProps {
  vision: Vision | null;
  onSave: (visionData: Omit<Vision, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const VisionForm: React.FC<VisionFormProps> = ({ vision, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Life' as typeof VISION_CATEGORIES[number],
    imageUrl: '',
    categoryImageUrl: '', // Will be auto-populated from category
    startDate: '',
    endDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'not-started' as 'not-started' | 'in-progress' | 'completed' | 'on-hold',
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

  const [showCategoryImageEditor, setShowCategoryImageEditor] = useState(false);

  useEffect(() => {
    if (vision) {
      setFormData({
        title: vision.title,
        description: vision.description,
        category: vision.category,
        imageUrl: vision.imageUrl || '',
        categoryImageUrl: vision.categoryImageUrl || getDefaultCategoryImage(vision.category),
        startDate: vision.startDate,
        endDate: vision.endDate,
        priority: vision.priority || 'medium',
        status: vision.status || 'not-started',
        milestones: vision.milestones,
        reminders: vision.reminders || [],
        goals: vision.goals || [],
        tasks: vision.tasks || [],
        todos: vision.todos || [],
        words: vision.words || [],
      });
    }
  }, [vision]);

  // Auto-update categoryImageUrl when category changes
  useEffect(() => {
    if (!vision || vision.category !== formData.category) {
      setFormData(prev => ({
        ...prev,
        categoryImageUrl: getDefaultCategoryImage(formData.category)
      }));
    }
  }, [formData.category, vision]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, categoryImageUrl: value }));
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
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
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
          {/* Title */}
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

          {/* Description */}
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

          {/* Category Selection - KEY FEATURE */}
          <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl p-6">
            <label className="block text-sm font-bold text-emerald-900 mb-4">
              📍 Select Vision Head (Category) *
            </label>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {VISION_CATEGORIES.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category }))}
                  className={`py-3 px-3 rounded-lg font-medium text-sm transition-all border-2 ${
                    formData.category === category
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Category Image Display & Editor */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-gray-800">
                  Category Image (Auto-populated, Editable)
                </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryImageEditor(!showCategoryImageEditor)}
                  className="flex items-center space-x-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Eye className="h-4 w-4" />
                  <span>{showCategoryImageEditor ? 'Hide' : 'Edit'}</span>
                </button>
              </div>

              {/* Image Preview */}
              {formData.categoryImageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden h-48 border border-gray-300">
                  <img
                    src={formData.categoryImageUrl}
                    alt={`${formData.category} category`}
                    className="w-full h-full object-cover"
                    onError={() => {
                      console.log('Failed to load category image');
                    }}
                  />
                </div>
              )}

              {/* Category Image URL Editor */}
              {showCategoryImageEditor && (
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Edit Image URL (Saves to Database)
                  </label>
                  <input
                    type="url"
                    value={formData.categoryImageUrl}
                    onChange={handleCategoryImageChange}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3 text-sm"
                    placeholder="https://pin.it/xxxxx or any image URL"
                  />
                  <p className="text-xs text-blue-700">
                    💡 Tip: This image will be used as the default for this category head across the system.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Custom Image URL (Different from Category) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Vision Image (Optional - Different from Category)
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            {formData.imageUrl && (
              <div className="mt-3 rounded-lg overflow-hidden h-40 border border-gray-300">
                <img src={formData.imageUrl} alt="Custom Vision" className="w-full h-full object-cover" onError={() => {}} />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">💡 If you add a custom image, both images will be used in different contexts</p>
          </div>

          {/* Priority & Status */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
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

          {/* Milestones Section */}
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
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
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

export default VisionForm;
