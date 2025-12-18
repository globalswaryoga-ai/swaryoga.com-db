'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Clock, Image, Quote } from 'lucide-react';

export interface Word {
  id: string;
  title: string;
  content: string;
  reminderIds?: string[]; // Link to reminders
  reminderTitles?: string[]; // Display reminder titles
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays?: number;
  imageUrl: string;
  createdAt: string;
  category: 'life' | 'health' | 'wealth' | 'success' | 'respect' | 'pleasure' | 'prosperity' | 'luxuries' | 'good-habits' | 'self-sadhana';
  favorited: boolean;
}

interface WordFormProps {
  onSubmit: (wordData: Word) => void;
  onCancel: () => void;
  initialData?: Word;
  reminders: Array<{ id: string; title: string }>;
}

const WordForm: React.FC<WordFormProps> = ({ onSubmit, onCancel, initialData, reminders }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    reminderIds: initialData?.reminderIds || ([] as string[]),
    frequency: initialData?.frequency || 'daily' as const,
    customDays: initialData?.customDays || 1,
    imageUrl: initialData?.imageUrl || '',
    category: initialData?.category || 'life' as const
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'reminderIds') {
      // Handle multi-select checkboxes
      const checked = (e.target as HTMLInputElement).checked;
      const reminderId = value;
      setFormData(prev => ({
        ...prev,
        reminderIds: checked 
          ? [...prev.reminderIds, reminderId]
          : prev.reminderIds.filter(id => id !== reminderId)
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: name === 'customDays' ? parseInt(value) : value 
      }));
    }
    
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
           formData.content.trim().length > 0;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Word title is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const selectedReminders = reminders.filter(r => formData.reminderIds.includes(r.id));
    const wordData: Word = {
      id: initialData?.id || Date.now().toString(),
      title: formData.title.trim(),
      content: formData.content.trim(),
      reminderIds: formData.reminderIds.length > 0 ? formData.reminderIds : undefined,
      reminderTitles: selectedReminders.map(r => r.title),
      frequency: formData.frequency,
      customDays: formData.frequency === 'custom' ? formData.customDays : undefined,
      imageUrl: formData.imageUrl,
      category: formData.category,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      favorited: initialData?.favorited || false
    };

    onSubmit(wordData);
  }, [formData, initialData, onSubmit, reminders]);

  const categoryEmojis = {
    life: '🌍',
    health: '💪',
    wealth: '💰',
    success: '🏆',
    respect: '👑',
    pleasure: '�',
    prosperity: '✨',
    luxuries: '�',
    'good-habits': '🌟',
    'self-sadhana': '🧘'
  };

  const categoryDescriptions = {
    life: 'Words about overall life and purpose',
    health: 'Words about health and wellness',
    wealth: 'Words about financial abundance',
    success: 'Words about achievement and goals',
    respect: 'Words about respect and dignity',
    pleasure: 'Words about joy and happiness',
    prosperity: 'Words about thriving and growth',
    luxuries: 'Words about luxury and comfort',
    'good-habits': 'Words about positive habits',
    'self-sadhana': 'Words about spiritual practice'
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Category Selection */}
      <div className="rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 p-4">
        <label className="block text-sm font-semibold text-swar-text mb-3 flex items-center gap-2">
          <Quote size={18} className="text-purple-600" />
          Word Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(categoryEmojis) as Array<keyof typeof categoryEmojis>).map(cat => (
            <label key={cat} className="cursor-pointer">
              <input
                type="radio"
                name="category"
                value={cat}
                checked={formData.category === cat}
                onChange={handleChange}
                className="sr-only"
              />
              <div className={`p-3 rounded-lg text-center font-medium text-sm transition ${
                formData.category === cat 
                  ? 'bg-white ring-2 ring-purple-500 shadow-md' 
                  : 'bg-white hover:bg-swar-bg border border-swar-border'
              }`}>
                <span className="text-lg">{categoryEmojis[cat]}</span>
                <p className="capitalize mt-1">{cat}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-swar-text-secondary mt-3">
          {categoryDescriptions[formData.category]}
        </p>
      </div>

      {/* Word Title */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2">
          {formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
            errors.title ? 'border-red-500' : 'border-swar-border'
          }`}
          placeholder={`e.g., "${formData.category === 'life' ? 'Purpose' : formData.category === 'health' ? 'Wellness' : 'Growth'}"`}
          required
        />
        {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2">
          Content *
        </label>
        <textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
            errors.content ? 'border-red-500' : 'border-swar-border'
          }`}
          placeholder="Enter the full text of your affirmation, mantra, quote, or prayer"
          rows={5}
          required
        />
        {errors.content && <p className="text-red-600 text-xs mt-1">{errors.content}</p>}
        <div className="mt-2 text-xs text-swar-text-secondary text-right">
          {formData.content.length} characters
        </div>
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
          <Clock size={18} className="text-blue-600" />
          Frequency
        </label>
        <select
          name="frequency"
          value={formData.frequency}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        >
          <option value="daily">📅 Daily</option>
          <option value="weekly">📆 Weekly</option>
          <option value="monthly">📊 Monthly</option>
          <option value="custom">🔧 Custom</option>
        </select>
      </div>

      {/* Custom Days */}
      {formData.frequency === 'custom' && (
        <div>
          <label className="block text-sm font-semibold text-swar-text mb-2">
            Repeat Every (days)
          </label>
          <input
            type="number"
            name="customDays"
            value={formData.customDays}
            onChange={handleChange}
            min="1"
            max="365"
            className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>
      )}

      {/* Link to Reminders */}
      {reminders.length > 0 && (
        <div className="rounded-lg bg-orange-50 border-2 border-orange-200 p-3">
          <label className="block text-sm font-semibold text-swar-text mb-3 flex items-center gap-2">
            🔔 Link to Reminders (Optional)
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {reminders.map(reminder => (
              <label key={reminder.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="reminderIds"
                  value={reminder.id}
                  checked={formData.reminderIds.includes(reminder.id)}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-purple-600"
                />
                <span className="text-sm text-swar-text">{reminder.title}</span>
              </label>
            ))}
          </div>
          {formData.reminderIds.length > 0 && (
            <p className="text-xs text-orange-700 mt-2 font-medium">
              ✓ Linked to {formData.reminderIds.length} reminder(s)
            </p>
          )}
        </div>
      )}

      {/* Image URL */}
      <div>
        <label className="block text-sm font-semibold text-swar-text mb-2 flex items-center gap-2">
          <Image size={18} className="text-orange-600" />
          Image URL (Optional)
        </label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          placeholder="https://example.com/image.jpg"
        />
        {formData.imageUrl && (
          <div className="mt-3 relative h-40 rounded-xl overflow-hidden border-2 border-swar-border shadow-sm">
            <img 
              src={formData.imageUrl} 
              alt="Word preview" 
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
              ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {initialData ? 'Update' : 'Add'} Word
        </button>
      </div>
    </form>
  );
};

export default WordForm;
