'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { Todo } from '@/lib/types/lifePlanner';

type TodoCategory = 'self' | 'family' | 'workStudy' | 'parents' | 'friendsRelatives' | 'social';

interface TodoInput {
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
}

const categories: Array<{ id: TodoCategory; label: string; color: string }> = [
  { id: 'self', label: 'Self', color: 'bg-blue-500' },
  { id: 'family', label: 'Family', color: 'bg-pink-500' },
  { id: 'workStudy', label: 'Work / Study', color: 'bg-green-500' },
  { id: 'parents', label: 'Parents', color: 'bg-yellow-500' },
  { id: 'friendsRelatives', label: 'Friends & Relatives', color: 'bg-purple-500' },
  { id: 'social', label: 'Social', color: 'bg-orange-500' },
];

export default function AddScreenPage() {
  const getLocalDayKey = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [today] = useState(() => getLocalDayKey(new Date()));
  const [todos, setTodos] = useState<(Todo & { category: TodoCategory })[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TodoCategory>('self');
  const [newTodo, setNewTodo] = useState<TodoInput>({
    title: '',
    description: '',
    dueDate: today,
    dueTime: '',
    priority: 'medium',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<TodoInput | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const saved = await lifePlannerStorage.getTodos();
        const normalized = (Array.isArray(saved) ? saved : [])
          .map(t => ({
            ...t,
            category: (t.category as TodoCategory) || 'self',
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTodos(normalized);
      } catch (error) {
        console.error('Error loading todos:', error);
      }
    })();
  }, []);

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) return;

    const todo: Todo = {
      id: `todo-${Date.now()}`,
      title: newTodo.title,
      description: newTodo.description,
      category: selectedCategory,
      startDate: today,
      dueDate: newTodo.dueDate,
      dueTime: newTodo.dueTime,
      priority: newTodo.priority,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...todos, { ...todo, category: selectedCategory }];
    setTodos(updated);
    await lifePlannerStorage.saveTodos(updated.map(t => ({ ...t, category: t.category })));

    setNewTodo({
      title: '',
      description: '',
      dueDate: today,
      dueTime: '',
      priority: 'medium',
    });
  };

  const handleDeleteTodo = async (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    await lifePlannerStorage.saveTodos(updated.map(t => ({ ...t, category: t.category })));
  };

  const handleToggleTodo = async (id: string) => {
    const updated = todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t
    );
    setTodos(updated);
    await lifePlannerStorage.saveTodos(updated.map(t => ({ ...t, category: t.category })));
  };

  const handleStartEdit = (todo: Todo & { category: TodoCategory }) => {
    setEditingId(todo.id);
    setEditingTodo({
      title: todo.title,
      description: todo.description,
      dueDate: todo.dueDate,
      dueTime: todo.dueTime,
      priority: todo.priority,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingTodo || !editingTodo.title.trim()) return;

    const updated = todos.map(t =>
      t.id === id
        ? {
            ...t,
            title: editingTodo.title,
            description: editingTodo.description,
            dueDate: editingTodo.dueDate,
            dueTime: editingTodo.dueTime,
            priority: editingTodo.priority,
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    setTodos(updated);
    await lifePlannerStorage.saveTodos(updated.map(t => ({ ...t, category: t.category })));
    setEditingId(null);
    setEditingTodo(null);
  };

  const getCategoryColor = (cat: TodoCategory) => {
    const category = categories.find(c => c.id === cat);
    return category?.color || 'bg-gray-500';
  };

  const getCategoryLabel = (cat: TodoCategory) => {
    const category = categories.find(c => c.id === cat);
    return category?.label || cat;
  };

  if (!mounted) return null;

  const categorizedTodos = categories.reduce((acc, cat) => {
    acc[cat.id] = todos.filter(t => t.category === cat.id);
    return acc;
  }, {} as Record<TodoCategory, (Todo & { category: TodoCategory })[]>);

  const todaysTodos = todos.filter(t => t.dueDate === today);
  const completedTodayCount = todaysTodos.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-swar-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-swar-text">Manage Todos</h1>
            <a
              href="/life-planner/dashboard/daily"
              className="px-4 py-2 rounded-lg bg-gray-200 text-swar-text hover:bg-gray-300 transition font-semibold text-sm"
            >
              Back
            </a>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-swar-text-secondary">
              Today: <span className="font-semibold">{completedTodayCount}/{todaysTodos.length}</span>
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${todaysTodos.length > 0 ? (completedTodayCount / todaysTodos.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Todo Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-swar-border p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-swar-text mb-4">Add New Todo</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
                      selectedCategory === cat.id ? `${cat.color} shadow-md` : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">Todo Title</label>
              <input
                type="text"
                value={newTodo.title}
                onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                placeholder="Enter todo title..."
                className="w-full px-4 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">Description (optional)</label>
              <textarea
                value={newTodo.description || ''}
                onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                placeholder="Add details..."
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Due Date</label>
                <input
                  type="date"
                  value={newTodo.dueDate}
                  onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Due Time (optional)</label>
                <input
                  type="time"
                  value={newTodo.dueTime || ''}
                  onChange={(e) => setNewTodo({ ...newTodo, dueTime: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Priority</label>
                <select
                  value={newTodo.priority}
                  onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-4 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAddTodo}
              className="w-full px-6 py-3 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Todo
            </button>
          </div>
        </div>

        {/* Todos by Category */}
        <div className="space-y-6">
          {categories.map(cat => {
            const catTodos = categorizedTodos[cat.id];
            const completedCount = catTodos.filter(t => t.completed).length;

            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-swar-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-4 h-4 rounded-full ${cat.color}`} />
                  <h2 className="text-lg font-bold text-swar-text flex-1">{cat.label}</h2>
                  <span className="text-sm font-semibold text-swar-text-secondary">
                    {completedCount}/{catTodos.length}
                  </span>
                </div>

                {catTodos.length === 0 ? (
                  <p className="text-sm text-swar-text-secondary italic">No todos in this category yet</p>
                ) : (
                  <div className="space-y-3">
                    {catTodos.map(todo => (
                      <div key={todo.id} className="border border-swar-border rounded-lg p-4 hover:shadow-md transition">
                        {editingId === todo.id && editingTodo ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editingTodo.title}
                              onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            />
                            <textarea
                              value={editingTodo.description || ''}
                              onChange={(e) => setEditingTodo({ ...editingTodo, description: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="date"
                                value={editingTodo.dueDate}
                                onChange={(e) => setEditingTodo({ ...editingTodo, dueDate: e.target.value })}
                                className="px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                              />
                              <input
                                type="time"
                                value={editingTodo.dueTime || ''}
                                onChange={(e) => setEditingTodo({ ...editingTodo, dueTime: e.target.value })}
                                className="px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                              />
                              <select
                                value={editingTodo.priority}
                                onChange={(e) => setEditingTodo({ ...editingTodo, priority: e.target.value as 'low' | 'medium' | 'high' })}
                                className="px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(todo.id)}
                                className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition text-sm flex items-center justify-center gap-2"
                              >
                                <Check size={16} />
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingTodo(null);
                                }}
                                className="flex-1 px-3 py-2 rounded-lg bg-gray-300 text-swar-text font-semibold hover:bg-gray-400 transition text-sm flex items-center justify-center gap-2"
                              >
                                <X size={16} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleTodo(todo.id)}
                              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                                todo.completed
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 hover:border-green-500'
                              }`}
                            >
                              {todo.completed && <Check size={16} className="text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-semibold text-sm ${
                                  todo.completed
                                    ? 'line-through text-swar-text-secondary'
                                    : 'text-swar-text'
                                }`}
                              >
                                {todo.title}
                              </p>
                              {todo.description && (
                                <p className="text-xs text-swar-text-secondary mt-1">{todo.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-xs bg-gray-100 text-swar-text-secondary rounded px-2 py-1">
                                  📅 {new Date(todo.dueDate).toLocaleDateString()}
                                </span>
                                {todo.dueTime && (
                                  <span className="text-xs bg-gray-100 text-swar-text-secondary rounded px-2 py-1">
                                    🕐 {todo.dueTime}
                                  </span>
                                )}
                                <span
                                  className={`text-xs rounded px-2 py-1 font-semibold ${
                                    todo.priority === 'high'
                                      ? 'bg-red-100 text-red-800'
                                      : todo.priority === 'medium'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleStartEdit(todo)}
                                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteTodo(todo.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
