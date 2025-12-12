'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Todo } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerStorage';
import TodoModal from './TodoModal';

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = lifePlannerStorage.getTodos();
    setTodos(saved.length > 0 ? saved : []);
  }, []);

  useEffect(() => {
    if (mounted) {
      lifePlannerStorage.saveTodos(todos);
    }
  }, [todos, mounted]);

  const handleAddTodo = () => {
    setEditingTodo(null);
    setIsModalOpen(true);
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setIsModalOpen(true);
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t
      )
    );
  };

  const handleSaveTodo = (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTodo) {
      setTodos(prev =>
        prev.map(t =>
          t.id === editingTodo.id
            ? { ...t, ...todoData, updatedAt: new Date().toISOString() }
            : t
        )
      );
    } else {
      const newTodo: Todo = {
        ...todoData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTodos(prev => [...prev, newTodo]);
    }
    setIsModalOpen(false);
  };

  const completedCount = todos.filter(t => t.completed).length;

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Todos</h1>
          <p className="text-gray-600">Quick checklist items for daily commitments</p>
        </div>
        <button
          onClick={handleAddTodo}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Add Todo</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{todos.length}</div>
          <div className="text-gray-600 text-sm">Total Todos</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-blue-600 mb-1">{completedCount}</div>
          <div className="text-gray-600 text-sm">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0}%
          </div>
          <div className="text-gray-600 text-sm">Completion</div>
        </div>
      </div>

      {/* Todos List */}
      <div className="space-y-3">
        {todos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No todos yet</h3>
            <p className="text-gray-600 mb-4">Create your first todo item.</p>
            <button
              onClick={handleAddTodo}
              className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Todo</span>
            </button>
          </div>
        ) : (
          todos.map(todo => (
            <div key={todo.id} className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition-all flex items-center gap-4">
              <button
                onClick={() => handleToggleTodo(todo.id)}
                className="text-emerald-600 hover:text-emerald-700 flex-shrink-0"
              >
                {todo.completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {todo.title}
                </h3>
                {todo.description && <p className="text-gray-600 text-sm mt-1">{todo.description}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {todo.category && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{todo.category}</span>}
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Due: {new Date(todo.dueDate).toLocaleDateString()}</span>
                  {todo.priority && <span className={`px-2 py-1 rounded text-xs font-medium ${
                    todo.priority === 'high' ? 'bg-red-100 text-red-800' :
                    todo.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>{todo.priority} priority</span>}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEditTodo(todo)}
                  className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <TodoModal
          todo={editingTodo}
          onSave={handleSaveTodo}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
