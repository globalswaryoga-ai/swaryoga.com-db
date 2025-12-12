'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Vision, VisionCategory, Milestone, Reminder, Goal, Task, Todo, Word, VISION_CATEGORIES } from '@/lib/types/lifePlanner';

const LANDSCAPE_IMAGE = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1280&q=80';

interface VisionModalProps {
  vision: Vision | null;
  onSave: (visionData: Omit<Vision, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

type VisionFormState = {
  title: string;
  description: string;
  imageUrl: string;
  category: VisionCategory;
  priority: 'low' | 'medium' | 'high';
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  time: string;
  place: string;
  budget: string;
  milestones: Milestone[];
  reminders: Reminder[];
  goals: Goal[];
  tasks: Task[];
  todos: Todo[];
  words: Word[];
};

const VisionModal: React.FC<VisionModalProps> = ({ vision, onSave, onClose }) => {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<VisionFormState>({
    title: '',
    description: '',
    imageUrl: LANDSCAPE_IMAGE,
    category: VISION_CATEGORIES[0],
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'not-started' as 'not-started' | 'in-progress' | 'completed' | 'on-hold',
    startDate: today,
    endDate: '',
    time: '11:00',
    place: '',
    budget: '',
    milestones: [] as Milestone[],
    reminders: [] as Reminder[],
    goals: [] as Goal[],
    tasks: [] as Task[],
    todos: [] as Todo[],
    words: [] as Word[],
  });

  const [previewUrl, setPreviewUrl] = useState<string>(LANDSCAPE_IMAGE);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setPreviewUrl(formData.imageUrl || LANDSCAPE_IMAGE);
  }, [formData.imageUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (vision) {
      setFormData({
        title: vision.title,
        description: vision.description,
        imageUrl: vision.imageUrl || LANDSCAPE_IMAGE,
        category: vision.category,
        priority: vision.priority || 'medium',
        status: vision.status || 'not-started',
        startDate: vision.startDate || today,
        endDate: vision.endDate,
        time: vision.time || '11:00',
        place: vision.place || '',
        budget: vision.budget ? vision.budget.toString() : '',
        milestones: vision.milestones,
        reminders: vision.reminders || [],
        goals: vision.goals || [],
        tasks: vision.tasks || [],
        todos: vision.todos || [],
        words: vision.words || [],
      });
    }
  }, [vision, today]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setFormData(prev => ({ ...prev, category: value as VisionCategory }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    setFormData(prev => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Vision, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title,
      description: formData.description,
      imageUrl: formData.imageUrl,
      category: formData.category,
      priority: formData.priority,
      status: formData.status,
      startDate: formData.startDate,
      endDate: formData.endDate,
      time: formData.time,
      place: formData.place,
      budget: formData.budget ? Number(formData.budget) : undefined,
      milestones: formData.milestones,
      reminders: formData.reminders,
      goals: formData.goals,
      tasks: formData.tasks,
      todos: formData.todos,
      words: formData.words,
    };
    onSave(payload);
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
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">My Vision *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Describe your dream outcome"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">My Vision Head (Category) *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {VISION_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Choose from 10 vision heads to focus your energy.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Image URL</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="https://images.unsplash.com/..."
              />
              <p className="text-xs text-gray-500 mt-1">Landscape images work best; a default has already been chosen.</p>
              <div className="mt-4 rounded-2xl overflow-hidden h-44 border border-dashed border-gray-200">
                <img
                  src={previewUrl}
                  alt="Vision preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Beautiful+Vision';
                  }}
                />
              </div>
              <div className="mt-3 text-xs text-gray-500">
                <label className="font-medium">Upload a file</label>
                <input type="file" accept="image/*" onChange={handleFileChange} className="block mt-1 text-xs" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">My Vision - Due Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Vision - Time (default 11:00 AM)</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">My Vision Place</label>
                <input
                  type="text"
                  name="place"
                  value={formData.place}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g., Rishikesh Ashram"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Vision Budget - Rs.</label>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Rs.</span>
                  <input
                    type="number"
                    name="budget"
                    min="0"
                    step="100"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="0"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Describe how this vision will change your life"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
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
