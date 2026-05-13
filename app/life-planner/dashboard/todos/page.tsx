'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Todo, Task } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  'not-started': { text: 'text-swar-text', bg: 'bg-swar-primary-light' },
  'in-progress': { text: 'text-blue-700', bg: 'bg-blue-100' },
  'completed': { text: 'text-swar-primary', bg: 'bg-swar-primary-light' },
  'on-hold': { text: 'text-yellow-700', bg: 'bg-yellow-100' },
};

const PRIORITY_COLORS: Record<string, { text: string; bg: string }> = {
  'high': { text: 'text-red-700', bg: 'bg-red-100' },
  'medium': { text: 'text-yellow-700', bg: 'bg-yellow-100' },
  'low': { text: 'text-green-700', bg: 'bg-green-100' },
};

export default function TodosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didAutoOpen = useRef(false);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Filters
  const [filterTask, setFilterTask] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    taskId: '',
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    dueTime: '',
    budget: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    category: '',
    completed: false,
  });

  useEffect(() => {
    setMounted(true);
    (async () => {
      const [savedTodos, savedTasks] = await Promise.all([
        lifePlannerStorage.getTodos(),
        lifePlannerStorage.getTasks(),
      ]);

      setTodos(Array.isArray(savedTodos) ? savedTodos : []);
      setTasks(Array.isArray(savedTasks) ? savedTasks : []);
      setHasLoaded(true);
    })();
  }, []);

  const skipNextSave = useRef(true);
  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    (async () => {
      await lifePlannerStorage.saveTodos(todos);
    })();
  }, [todos, mounted, hasLoaded]);

  useEffect(() => {
    if (!mounted) return;
    if (didAutoOpen.current) return;
    if (searchParams?.get('create') !== '1') return;

    didAutoOpen.current = true;
    handleAddTodo();
    router.replace('/life-planner/dashboard/todos');
  }, [mounted, searchParams, router]);

  const handleAddTodo = () => {
    setEditingTodo(null);
    setFormData({
      taskId: '',
      title: '',
      description: '',
      startDate: '',
      dueDate: '',
      dueTime: '',
      budget: '',
      priority: 'medium',
      category: '',
      completed: false,
    });
    setIsModalOpen(true);
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      taskId: todo.taskId || '',
      title: todo.title || '',
      description: todo.description || '',
      startDate: todo.startDate || '',
      dueDate: todo.dueDate || '',
      dueTime: todo.dueTime || '',
      budget: todo.budget ? String(todo.budget) : '',
      priority: todo.priority || 'medium',
      category: todo.category || '',
      completed: todo.completed || false,
    });
    setIsModalOpen(true);
  };

  const handleDeleteTodo = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) return;
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleCompleted = (id: string) => {
    setTodos(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSaveTodo = () => {
    if (!formData.taskId || !formData.title.trim()) {
      alert('Please select a task and enter a title');
      return;
    }
    if (!formData.dueDate) {
      alert('Please set a due date');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const todoData: Todo = {
      id: editingTodo?.id || `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: formData.taskId,
      title: formData.title.trim(),
      description: formData.description.trim(),
      startDate: formData.startDate || today,
      dueDate: formData.dueDate,
      dueTime: formData.dueTime || undefined,
      budget: formData.budget ? parseInt(formData.budget) : undefined,
      priority: formData.priority,
      category: formData.category || undefined,
      completed: formData.completed,
      createdAt: editingTodo?.createdAt || new Date().toISOString(),
    };

    if (editingTodo) {
      setTodos(prev =>
        prev.map(t => t.id === editingTodo.id ? todoData : t)
      );
    } else {
      setTodos(prev => [...prev, todoData]);
    }
    setIsModalOpen(false);
  };

  const getTaskTitle = (taskId?: string): string => {
    if (!taskId) return 'No Task';
    return tasks.find(t => t.id === taskId)?.title || 'Unknown Task';
  };

  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredTodos = todos
    .filter((t) => {
      const matchesTask = filterTask === 'all' || t.taskId === filterTask;
      const matchesStatus = filterStatus === 'all' || (t.status || 'not-started') === filterStatus;
      const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;

      const haystack = `${t.title || ''} ${t.description || ''} ${getTaskTitle(t.taskId)}`.toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

      return matchesTask && matchesStatus && matchesPriority && matchesSearch;
    })
    .sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_VALUE;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_VALUE;
      return dateA - dateB;
    });

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-swar-text mb-2">Todos</h1>
          <p className="text-swar-text-secondary">Manage your daily tasks and todos</p>
        </div>
        <button
          onClick={handleAddTodo}
          className="w-full sm:w-auto justify-center flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Add Todo</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-3 sm:space-y-0 sm:flex sm:gap-4 sm:items-end flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-xs">
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Search</label>
          <input
            type="text"
            placeholder="Search todos..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Task Filter */}
        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Task</label>
          <select
            value={filterTask}
            onChange={(e) => setFilterTask(e.target.value)}
            className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tasks</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Todo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-swar-border sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-swar-text">
                {editingTodo ? 'Edit Todo' : 'Create New Todo'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-2xl font-bold hover:text-red-600 transition"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Task Selector */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Task *</label>
                <select
                  name="taskId"
                  value={formData.taskId}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a task...</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Enter todo title"
                  className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Enter todo description"
                  rows={3}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  placeholder="Enter category (e.g., Work, Personal, Health)"
                  className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Due Time */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Due Time</label>
                <input
                  type="time"
                  name="dueTime"
                  value={formData.dueTime}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Budget (₹)</label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleFormChange}
                  placeholder="Enter budget amount"
                  className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Completed Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="completed"
                  checked={formData.completed}
                  onChange={handleFormChange}
                  className="w-4 h-4 text-blue-600 border-swar-border rounded focus:ring-2 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-swar-text">Mark as completed</label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-swar-border">
                <button
                  onClick={handleSaveTodo}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {editingTodo ? 'Update Todo' : 'Create Todo'}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-200 text-swar-text py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Todos List */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-swar-text-secondary mb-4">No todos found</p>
            <button
              onClick={handleAddTodo}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              <span>Create your first todo</span>
            </button>
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div
              key={todo.id}
              className={`bg-white rounded-lg border border-swar-border p-4 flex gap-4 items-start hover:shadow-md transition ${
                todo.completed ? 'opacity-70' : ''
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggleCompleted(todo.id)}
                className={`flex-shrink-0 mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                  todo.completed
                    ? 'bg-swar-primary border-swar-primary'
                    : 'border-swar-border hover:border-blue-500'
                }`}
              >
                {todo.completed && <Check size={16} className="text-white" />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div>
                    <h3 className={`font-bold text-swar-text ${todo.completed ? 'line-through' : ''}`}>
                      {todo.title}
                    </h3>
                    <p className="text-xs text-swar-text-secondary">{getTaskTitle(todo.taskId)}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {todo.priority && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        PRIORITY_COLORS[todo.priority]?.bg || 'bg-gray-100'
                      } ${PRIORITY_COLORS[todo.priority]?.text || 'text-gray-700'}`}>
                        {todo.priority}
                      </span>
                    )}
                  </div>
                </div>

                {todo.description && (
                  <p className="text-sm text-swar-text-secondary mb-2 line-clamp-2">{todo.description}</p>
                )}

                {/* Details */}
                <div className="text-xs text-swar-text-secondary space-y-1">
                  {todo.dueDate && (
                    <div>
                      Due: {todo.dueDate}
                      {todo.dueTime && ` at ${todo.dueTime}`}
                    </div>
                  )}
                  {todo.budget && (
                    <div className="text-swar-primary font-semibold">₹ {todo.budget.toLocaleString()}</div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEditTodo(todo)}
                  className="p-2 text-blue-700 hover:bg-blue-50 rounded transition"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="p-2 text-red-700 hover:bg-red-50 rounded transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
