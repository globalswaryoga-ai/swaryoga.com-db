'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, DollarSign, Target, Image } from 'lucide-react';

export interface Vision {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  amount: string;
  category: 'life' | 'health' | 'wealth' | 'success' | 'respect' | 'pleasure' | 'prosperity' | 'luxury';
  imageUrl: string;
  createdAt: string;
  completed: boolean;
}

interface VisionFormProps {
  onSubmit: (visionData: Vision) => void;
  onCancel: () => void;
  initialData?: Vision;
}

const VisionForm: React.FC<VisionFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    targetDate: initialData?.targetDate || '',
    amount: initialData?.amount || '',
    category: initialData?.category || 'life' as const,
    imageUrl: initialData?.imageUrl || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const isFormValid = useMemo(() => {
    return formData.title.trim().length > 0 && formData.description.trim().length > 0;
  }, [formData.title, formData.description]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Vision title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const visionData: Vision = {
      id: initialData?.id || Date.now().toString(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      targetDate: formData.targetDate,
      amount: formData.amount,
      category: formData.category,
      imageUrl: formData.imageUrl,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      completed: initialData?.completed || false
    };

    onSubmit(visionData);
  }, [formData, initialData, onSubmit]);

  const categoryColors: Record<string, { bg: string; text: string }> = {
    life: { bg: 'bg-purple-50', text: 'text-purple-700' },
    health: { bg: 'bg-green-50', text: 'text-green-700' },
    wealth: { bg: 'bg-blue-50', text: 'text-blue-700' },
    success: { bg: 'bg-orange-50', text: 'text-orange-700' },
    respect: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    pleasure: { bg: 'bg-pink-50', text: 'text-pink-700' },
    prosperity: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    luxury: { bg: 'bg-amber-50', text: 'text-amber-700' }
  };

  const categoryIcons: Record<string, string> = {
    life: '🎯',
    health: '💪',
    wealth: '💰',
    success: '🏆',
    respect: '🙏',
    pleasure: '😊',
    prosperity: '✨',
    luxury: '👑'
  };

  const colors = categoryColors[formData.category];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Vision Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Vision Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Build a Meditation Practice, Learn Sanskrit"
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
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Describe your vision, why it's important, and how it aligns with your life goals"
          rows={4}
          required
        />
        {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Target size={18} className="text-purple-600" />
          Vision Category
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        >
          <option value="life">🎯 Life Vision</option>
          <option value="health">💪 Health Vision</option>
          <option value="wealth">💰 Wealth Vision</option>
          <option value="success">🏆 Success Vision</option>
          <option value="respect">🙏 Respect & Seva Vision</option>
          <option value="pleasure">😊 Pleasure Vision</option>
          <option value="prosperity">✨ Prosperity Vision</option>
          <option value="luxury">👑 Luxury Vision</option>
        </select>
        <div className={`mt-2 px-3 py-2 rounded-lg text-sm font-medium ${colors.bg} ${colors.text}`}>
          {categoryIcons[formData.category]} {formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} Vision
        </div>
      </div>

      {/* Target Date & Amount Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Target Date
          </label>
          <input
            type="date"
            name="targetDate"
            value={formData.targetDate}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <DollarSign size={18} className="text-green-600" />
            Amount (₹)
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      {/* Vision Image */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Image size={18} className="text-orange-600" />
          Vision Image URL (Optional)
        </label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          placeholder="https://example.com/image.jpg"
        />
        {formData.imageUrl && (
          <div className="mt-3 relative h-40 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
            <img 
              src={formData.imageUrl} 
              alt="Vision preview" 
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
              ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {initialData ? 'Update' : 'Add'} Vision
        </button>
      </div>
    </form>
  );
};

export default VisionForm;
