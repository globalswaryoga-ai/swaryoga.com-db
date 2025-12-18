'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Todo } from '@/lib/types/lifePlanner';

interface TodoModalProps {
  todo: Todo | null;
  onSave: (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const TodoModal: React.FC<TodoModalProps> = ({ todo, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    completed: false,
  });

  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title,
        description: todo.description || '',
        startDate: todo.startDate || '',
        dueDate: todo.dueDate,
        priority: todo.priority,
        completed: todo.completed,
      });
    } else {
      setFormData(prev => ({
        ...prev,
        startDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
      }));
    }
  }, [todo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-swar-border">
          <h2 className="text-2xl font-bold text-swar-text">{todo ? 'Edit Todo' : 'Add New Todo'}</h2>
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
              placeholder="Todo item"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="Optional notes"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Start Date *</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="w-full px-4 py-2 border border-swar-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Due Date *</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required className="w-full px-4 py-2 border border-swar-border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Priority</label>
            <select name="priority" value={formData.priority} onChange={handleChange} className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="completed"
              name="completed"
              checked={formData.completed}
              onChange={handleChange}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="completed" className="ml-3 text-sm font-medium text-swar-text">Mark as completed</label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-swar-border">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-swar-border rounded-lg text-swar-text font-medium hover:bg-swar-bg">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">
              {todo ? 'Update Todo' : 'Add Todo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TodoModal;
