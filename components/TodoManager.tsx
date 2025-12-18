'use client';

import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Todo, Task } from '@/lib/types/lifePlanner';

interface TodoManagerProps {
  todos: Todo[];
  tasks: Task[];
  onTodoAdd?: (todo: Todo) => void;
  onTodoUpdate?: (todo: Todo) => void;
  onTodoDelete?: (id: string) => void;
  selectedTaskId?: string;
}

export default function TodoManager({
  todos,
  tasks,
  onTodoAdd,
  onTodoUpdate,
  onTodoDelete,
  selectedTaskId,
}: TodoManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    taskId: selectedTaskId || '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    budget: undefined,
    priority: 'medium',
    completed: false,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      taskId: selectedTaskId || '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      budget: undefined,
      priority: 'medium',
      completed: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddTodo = () => {
    if (!formData.title.trim()) {
      alert('Todo title is required');
      return;
    }

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      if (onTodoUpdate) onTodoUpdate({ ...newTodo, id: editingId });
    } else {
      if (onTodoAdd) onTodoAdd(newTodo);
    }

    resetForm();
  };

  const handleEditTodo = (todo: Todo) => {
    setFormData({
      title: todo.title,
      description: todo.description,
      taskId: todo.taskId || '',
      startDate: todo.startDate,
      dueDate: todo.dueDate,
      budget: todo.budget,
      priority: todo.priority,
      completed: todo.completed,
    });
    setEditingId(todo.id);
    setShowForm(true);
  };

  const handleDeleteTodo = (id: string) => {
    if (confirm('Are you sure you want to delete this todo?')) {
      if (onTodoDelete) onTodoDelete(id);
    }
  };

  const getTaskTitle = (taskId?: string) => {
    if (!taskId) return 'Standalone';
    return tasks.find((t) => t.id === taskId)?.title || 'Unknown Task';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-swar-primary-light text-swar-primary border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-swar-primary-light text-swar-primary border-green-200';
      default:
        return 'bg-swar-primary-light text-swar-text border-swar-border';
    }
  };

  const filteredTodos = selectedTaskId
    ? todos.filter((t) => t.taskId === selectedTaskId)
    : todos;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-swar-text">Todos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-swar-primary text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Todo
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-swar-text">
                {editingId ? 'Edit Todo' : 'Add New Todo'}
              </h3>
              <button
                onClick={() => resetForm()}
                className="p-2 hover:bg-swar-primary-light rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-swar-text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">
                  Todo Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter todo title"
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter todo description"
                  rows={3}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Task Selection */}
              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">
                  Linked Task (Optional)
                </label>
                <select
                  value={formData.taskId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, taskId: e.target.value || undefined })
                  }
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">No Task Selected</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">
                  Budget (Amount - Optional)
                </label>
                <input
                  type="number"
                  value={formData.budget || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      budget: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="Enter budget amount"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-swar-text mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as 'low' | 'medium' | 'high',
                    })
                  }
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Completed */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="completed"
                  checked={formData.completed}
                  onChange={(e) =>
                    setFormData({ ...formData, completed: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-swar-border"
                />
                <label htmlFor="completed" className="text-sm font-medium text-swar-text">
                  Mark as completed
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => resetForm()}
                className="px-4 py-2 border border-swar-border rounded-lg text-swar-text hover:bg-swar-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTodo}
                disabled={!formData.title.trim()}
                className="px-4 py-2 bg-swar-primary text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingId ? 'Update Todo' : 'Add Todo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Todos List */}
      {filteredTodos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-swar-text-secondary text-lg">No todos yet. Create your first todo!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className={`border rounded-lg p-4 transition-all ${
                todo.completed
                  ? 'bg-swar-primary-light border-green-200'
                  : 'bg-white border-swar-border hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Completion Checkbox */}
                <button
                  onClick={() => {
                    if (onTodoUpdate) {
                      onTodoUpdate({
                        ...todo,
                        completed: !todo.completed,
                      });
                    }
                  }}
                  className="flex-shrink-0"
                >
                  {todo.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-swar-primary" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300 hover:text-swar-text-secondary" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-semibold ${
                      todo.completed
                        ? 'text-swar-text-secondary line-through'
                        : 'text-swar-text'
                    }`}
                  >
                    {todo.title}
                  </h4>

                  {/* Task Link */}
                  {todo.taskId && (
                    <div className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded w-fit mt-1">
                      Task: {getTaskTitle(todo.taskId)}
                    </div>
                  )}

                  {todo.description && (
                    <p
                      className={`text-sm mt-1 ${
                        todo.completed ? 'text-swar-text-secondary' : 'text-swar-text-secondary'
                      }`}
                    >
                      {todo.description}
                    </p>
                  )}

                  {/* Dates */}
                  <div className="text-xs text-swar-text-secondary mt-1">
                    📅 {todo.startDate} → {todo.dueDate}
                  </div>

                  {/* Budget */}
                  {todo.budget && (
                    <div className="text-sm font-medium text-purple-700 bg-purple-50 px-3 py-1 rounded inline-block mt-2">
                      💰 ${todo.budget}
                    </div>
                  )}

                  {/* Priority Badge */}
                  <div className="mt-2">
                    <span className={`px-3 py-1 rounded text-xs font-medium border ${getPriorityColor(todo.priority)}`}>
                      {todo.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditTodo(todo)}
                    className="p-2 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-2 bg-red-50 text-red-600 rounded hover:bg-swar-primary-light transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-800">
          <span className="font-semibold">You have {filteredTodos.length} todo(s)</span>
          {selectedTaskId && ` for the selected task`}
        </p>
      </div>
    </div>
  );
}
