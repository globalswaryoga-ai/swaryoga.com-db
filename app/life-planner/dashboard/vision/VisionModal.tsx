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
    endDate: today,
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
        description: vision.description || '',
        imageUrl: vision.imageUrl || LANDSCAPE_IMAGE,
        category: vision.category,
        priority: vision.priority || 'medium',
        status: vision.status || 'not-started',
        startDate: vision.startDate || today,
        endDate: vision.endDate || today,
        time: vision.time || '11:00',
        place: vision.place || '',
        budget: vision.budget ? vision.budget.toString() : '',
        milestones: vision.milestones || [],
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

  const addGoal = () => {
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title: '',
      visionId: vision?.id || '',
      description: '',
      priority: 'medium',
      status: 'not-started',
      startDate: formData.startDate || today,
      targetDate: formData.endDate || '',
      progress: 0,
      milestones: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFormData(prev => ({ ...prev, goals: [...(prev.goals || []), newGoal] }));
  };

  const updateGoal = (id: string, patch: Partial<Goal>) => {
    setFormData(prev => ({
      ...prev,
      goals: (prev.goals || []).map(g => (g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g)),
    }));
  };

  const deleteGoal = (id: string) => {
    setFormData(prev => ({
      ...prev,
      goals: (prev.goals || []).filter(g => g.id !== id),
    }));
  };

  const addTodo = () => {
    const newTodo: Todo = {
      id: `todo-${Date.now()}`,
      title: '',
      description: '',
      startDate: formData.startDate || today,
      dueDate: formData.endDate || today,
      budget: undefined,
      priority: 'medium',
      completed: false,
      category: String(formData.category || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFormData(prev => ({ ...prev, todos: [...(prev.todos || []), newTodo] }));
  };

  const updateTodo = (id: string, patch: Partial<Todo>) => {
    setFormData(prev => ({
      ...prev,
      todos: (prev.todos || []).map(t => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)),
    }));
  };

  const deleteTodo = (id: string) => {
    setFormData(prev => ({
      ...prev,
      todos: (prev.todos || []).filter(t => t.id !== id),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-swar-border">
          <h2 className="text-2xl font-bold text-swar-text">
            {vision ? 'Edit Vision' : 'Add New Vision'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-swar-text-secondary hover:text-swar-text hover:bg-swar-primary-light rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">My Vision *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-swar-border rounded-2xl text-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Describe your dream outcome"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">My Vision Head (Category) *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-swar-border rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {VISION_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <p className="text-xs text-swar-text-secondary mt-1">Choose from 10 vision heads to focus your energy.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">Image URL</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-swar-border rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="https://images.unsplash.com/..."
              />
              <p className="text-xs text-swar-text-secondary mt-1">Landscape images work best; a default has already been chosen.</p>
              <div className="mt-4 rounded-2xl overflow-hidden h-44 border border-dashed border-swar-border">
                <img
                  src={previewUrl}
                  alt="Vision preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Beautiful+Vision';
                  }}
                />
              </div>
              <div className="mt-3 text-xs text-swar-text-secondary">
                <label className="font-medium">Upload a file</label>
                <input type="file" accept="image/*" onChange={handleFileChange} className="block mt-1 text-xs" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">My Vision - Due Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-swar-border rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Vision - Time (default 11:00 AM)</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-swar-border rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">My Vision Place</label>
                <input
                  type="text"
                  name="place"
                  value={formData.place}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-swar-border rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g., Rishikesh Ashram"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Vision Budget - Rs.</label>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-swar-text-secondary">Rs.</span>
                  <input
                    type="number"
                    name="budget"
                    min="0"
                    step="100"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="0"
                    className="flex-1 px-4 py-3 border border-swar-border rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-swar-border rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Describe how this vision will change your life"
              />
            </div>

            {/* Goals */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">🎯 Goals</h3>
                  <p className="text-xs text-emerald-800">Add goals under this vision.</p>
                </div>
                <button
                  type="button"
                  onClick={addGoal}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  + Add Goal
                </button>
              </div>

              {(formData.goals || []).length === 0 ? (
                <div className="mt-3 text-sm text-emerald-800 bg-white border border-emerald-200 rounded-lg px-4 py-3">
                  No goals yet.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {(formData.goals || []).map((g) => (
                    <div key={g.id} className="bg-white border border-emerald-200 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={g.title || ''}
                            onChange={(e) => updateGoal(g.id, { title: e.target.value })}
                            className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Goal title"
                          />
                          <textarea
                            value={g.description || ''}
                            onChange={(e) => updateGoal(g.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            rows={2}
                            placeholder="Goal description (optional)"
                          />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <select
                              value={g.priority || 'medium'}
                              onChange={(e) => updateGoal(g.id, { priority: e.target.value as any })}
                              className="px-3 py-2 border border-emerald-200 rounded-lg bg-white"
                            >
                              <option value="low">low</option>
                              <option value="medium">medium</option>
                              <option value="high">high</option>
                            </select>
                            <select
                              value={g.status || 'not-started'}
                              onChange={(e) => updateGoal(g.id, { status: e.target.value as any })}
                              className="px-3 py-2 border border-emerald-200 rounded-lg bg-white"
                            >
                              <option value="not-started">not-started</option>
                              <option value="in-progress">in-progress</option>
                              <option value="completed">completed</option>
                              <option value="on-hold">on-hold</option>
                            </select>
                            <input
                              type="date"
                              value={g.targetDate || ''}
                              onChange={(e) => updateGoal(g.id, { targetDate: e.target.value })}
                              className="px-3 py-2 border border-emerald-200 rounded-lg"
                              title="Target date"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteGoal(g.id)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Todos */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-blue-900">📌 Todos</h3>
                  <p className="text-xs text-blue-800">Break the vision into small checkbox items.</p>
                </div>
                <button
                  type="button"
                  onClick={addTodo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  + Add Todo
                </button>
              </div>

              {(formData.todos || []).length === 0 ? (
                <div className="mt-3 text-sm text-blue-800 bg-white border border-blue-200 rounded-lg px-4 py-3">
                  No todos yet.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {(formData.todos || []).map((t) => (
                    <div key={t.id} className="bg-white border border-blue-200 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={t.title || ''}
                            onChange={(e) => updateTodo(t.id, { title: e.target.value })}
                            className={`w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${t.completed ? 'line-through text-swar-text-secondary' : ''}`}
                            placeholder="Todo title"
                          />
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              type="date"
                              value={t.dueDate || ''}
                              onChange={(e) => updateTodo(t.id, { dueDate: e.target.value })}
                              className="px-3 py-2 border border-blue-200 rounded-lg"
                              title="Due date"
                            />
                            <select
                              value={t.priority || 'medium'}
                              onChange={(e) => updateTodo(t.id, { priority: e.target.value as any })}
                              className="px-3 py-2 border border-blue-200 rounded-lg bg-white"
                            >
                              <option value="low">low</option>
                              <option value="medium">medium</option>
                              <option value="high">high</option>
                            </select>
                            <label className="inline-flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-lg bg-white">
                              <input
                                type="checkbox"
                                checked={!!t.completed}
                                onChange={(e) => updateTodo(t.id, { completed: e.target.checked })}
                                className="rounded border-swar-border"
                              />
                              <span className="text-sm text-swar-text">Done</span>
                            </label>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteTodo(t.id)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-swar-border">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-swar-border rounded-full text-swar-text font-medium hover:bg-swar-bg transition"
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
