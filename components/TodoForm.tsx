'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, Clock, Image, ListTodo } from 'lucide-react';

export interface Todo {
  id: string;
  title: string;
  description: string;
  taskId?: string; // Link to parent task
  taskTitle?: string; // Display task title
  date: string;
  time: string;
  estimatedMinutes: number;
  imageUrl: string;
  createdAt: string;
  completed: boolean;
  category: 'life' | 'health' | 'wealth' | 'success' | 'respect' | 'pleasure' | 'prosperity' | 'luxuries' | 'good-habits' | 'self-sadhana';
}

interface TodoFormProps {
  onSubmit: (todoData: Todo) => void;
  onCancel: () => void;
  initialData?: Todo;
  tasks: Array<{ id: string; title: string }>;
}

const TodoForm: React.FC<TodoFormProps> = ({ onSubmit, onCancel, initialData, tasks }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    taskId: initialData?.taskId || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    estimatedMinutes: initialData?.estimatedMinutes || 30,
    imageUrl: initialData?.imageUrl || '',
    category: initialData?.category || 'life' as const
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'estimatedMinutes' ? parseInt(value) : value 
    }));
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
           formData.date &&
           formData.time;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Todo title is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const selectedTask = tasks.find(t => t.id === formData.taskId);
    const todoData: Todo = {
      id: initialData?.id || Date.now().toString(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      taskId: formData.taskId || undefined,
      taskTitle: selectedTask?.title || undefined,
      date: formData.date,
      time: formData.time,
      estimatedMinutes: formData.estimatedMinutes,
      imageUrl: formData.imageUrl,
      category: formData.category,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      completed: initialData?.completed || false
    };

    onSubmit(todoData);
  }, [formData, initialData, onSubmit, tasks]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Parent Task */}
      {tasks.length > 0 && (
        <div className="rounded-lg bg-swar-primary-light border-2 border-green-200 p-3">
          <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
            ✓ Link to Task (Optional)
          </label>
          <select
            name="taskId"
            value={formData.taskId}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary transition"
          >
            <option value="">-- No parent task --</option>
            {tasks.map(task => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
          {formData.taskId && (
            <p className="text-sm text-swar-primary mt-2 font-medium">
              ✓ Todo linked to: <span className="font-bold">{tasks.find(t => t.id === formData.taskId)?.title}</span>
            </p>
          )}
        </div>
      )}

      {/* Todo Title */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2">
          Todo Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary transition ${
            errors.title ? 'border-red-500' : 'border-swar-border'
          }`}
          placeholder="e.g., Complete chapter 3, Fix bug in login"
          required
        />
        {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2">
          Description (Optional)
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary transition"
          placeholder="Add notes or details about this todo"
          rows={3}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
          <ListTodo size={18} className="text-swar-primary" />
          Category
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary transition"
        >
          <option value="life">🌍 Life</option>
          <option value="health">� Health</option>
          <option value="wealth">� Wealth</option>
          <option value="success">🏆 Success</option>
          <option value="respect">👑 Respect</option>
          <option value="pleasure">� Pleasure</option>
          <option value="prosperity">✨ Prosperity</option>
          <option value="luxuries">💎 Luxuries</option>
          <option value="good-habits">🌟 Good Habits</option>
          <option value="self-sadhana">🧘 Self Sadhana</option>
        </select>
      </div>

      {/* Date & Time Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Date *
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary transition ${
              errors.date ? 'border-red-500' : 'border-swar-border'
            }`}
            required
          />
          {errors.date && <p className="text-red-600 text-xs mt-1">{errors.date}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
            <Clock size={18} className="text-purple-600" />
            Time *
          </label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary transition ${
              errors.time ? 'border-red-500' : 'border-swar-border'
            }`}
            required
          />
          {errors.time && <p className="text-red-600 text-xs mt-1">{errors.time}</p>}
        </div>
      </div>

      {/* Estimated Time */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock size={18} className="text-orange-600" />
            Estimated Duration
          </span>
          <span className="text-lg font-bold text-swar-primary">{formData.estimatedMinutes} min</span>
        </label>
        <input
          type="range"
          name="estimatedMinutes"
          value={formData.estimatedMinutes}
          onChange={handleChange}
          min="5"
          max="480"
          step="5"
          className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        />
        <div className="mt-2 flex justify-between text-xs text-swar-text-secondary">
          <span>5 min</span>
          <span>8 hours</span>
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
          <Image size={18} className="text-orange-600" />
          Todo Image URL (Optional)
        </label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary transition"
          placeholder="https://example.com/image.jpg"
        />
        {formData.imageUrl && (
          <div className="mt-3 relative h-40 rounded-xl overflow-hidden border-2 border-swar-border shadow-sm">
            <img 
              src={formData.imageUrl} 
              alt="Todo preview" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
              }}
            />
          </div>
        )}
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
              ? 'bg-swar-primary hover:bg-swar-primary cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {initialData ? 'Update' : 'Add'} Todo
        </button>
      </div>
    </form>
  );
};

export default TodoForm;
