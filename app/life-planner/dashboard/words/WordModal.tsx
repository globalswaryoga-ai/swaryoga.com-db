'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Word } from '@/lib/types/lifePlanner';

interface WordModalProps {
  word: Word | null;
  onSave: (wordData: Omit<Word, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const WordModal: React.FC<WordModalProps> = ({ word, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Commitment' as string,
    color: '#10b981',
  });

  useEffect(() => {
    if (word) {
      setFormData({
        title: word.title || '',
        content: word.content || '',
        category: word.category || '',
        color: word.color || '#10b981',
      });
    }
  }, [word]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-swar-border">
          <h2 className="text-2xl font-bold text-swar-text">{word ? 'Edit Word' : 'Add New Word'}</h2>
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
              placeholder="e.g., My Morning Commitment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Content *</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="Write your commitment, rule, or affirmation..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option>Commitment</option>
                <option>Rule</option>
                <option>Mantra</option>
                <option>Affirmation</option>
                <option>Promise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-12 h-10 border border-swar-border rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  readOnly
                  className="flex-1 px-4 py-2 border border-swar-border rounded-lg bg-swar-bg"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-swar-border">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-swar-border rounded-lg text-swar-text font-medium hover:bg-swar-bg">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">
              {word ? 'Update Word' : 'Add Word'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WordModal;
