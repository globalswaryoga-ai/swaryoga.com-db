'use client';

import React, { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { Vision, Milestone, Goal, Task, Todo, Word, Reminder } from '@/lib/types/lifePlanner';

interface VisionBuilderProps {
  initialVision?: Vision | null;
  onSave: (vision: Vision) => void;
  onCancel: () => void;
}

const VisionBuilder: React.FC<VisionBuilderProps> = ({ initialVision, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'vision' | 'milestones' | 'goals' | 'tasks' | 'todos' | 'words' | 'reminders'>('vision');
  const [vision, setVision] = useState<Vision>(
    initialVision || {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      category: 'Life',
      priority: 'medium',
      status: 'not-started',
      milestones: [],
      goals: [],
      tasks: [],
      todos: [],
      words: [],
      reminders: [],
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const tabs = [
    { id: 'vision', label: '🎯 Vision', icon: 'Vision' },
    { id: 'milestones', label: '🏁 Milestones', icon: 'Milestones' },
    { id: 'goals', label: '🎖️ Goals', icon: 'Goals' },
    { id: 'tasks', label: '✓ Tasks', icon: 'Tasks' },
    { id: 'todos', label: '📋 Todos', icon: 'Todos' },
    { id: 'words', label: '💬 Words', icon: 'Words' },
    { id: 'reminders', label: '🔔 Reminders', icon: 'Reminders' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...vision, updatedAt: new Date().toISOString() });
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: '',
      description: '',
      dueDate: '',
      status: 'not-started',
      completed: false,
    };
    setVision(prev => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone],
    }));
  };

  const updateMilestone = (id: string, field: string, value: any) => {
    setVision(prev => ({
      ...prev,
      milestones: prev.milestones.map(m =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    }));
  };

  const deleteMilestone = (id: string) => {
    setVision(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== id),
    }));
  };

  const addGoal = () => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: '',
      targetDate: '',
      priority: 'medium',
      status: 'not-started',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVision(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal],
    }));
  };

  const updateGoal = (id: string, field: string, value: any) => {
    setVision(prev => ({
      ...prev,
      goals: prev.goals.map(g =>
        g.id === id ? { ...g, [field]: value } : g
      ),
    }));
  };

  const deleteGoal = (id: string) => {
    setVision(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id),
    }));
  };

  const addTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      priority: 'medium',
      status: 'not-started',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVision(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
  };

  const updateTask = (id: string, field: string, value: any) => {
    setVision(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === id ? { ...t, [field]: value } : t
      ),
    }));
  };

  const deleteTask = (id: string) => {
    setVision(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id),
    }));
  };

  const addTodo = () => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      priority: 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVision(prev => ({
      ...prev,
      todos: [...prev.todos, newTodo],
    }));
  };

  const updateTodo = (id: string, field: string, value: any) => {
    setVision(prev => ({
      ...prev,
      todos: prev.todos.map(t =>
        t.id === id ? { ...t, [field]: value } : t
      ),
    }));
  };

  const deleteTodo = (id: string) => {
    setVision(prev => ({
      ...prev,
      todos: prev.todos.filter(t => t.id !== id),
    }));
  };

  const addWord = () => {
    const newWord: Word = {
      id: Date.now().toString(),
      title: '',
      content: '',
      category: 'Mantra',
      color: '#8B5CF6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVision(prev => ({
      ...prev,
      words: [...prev.words, newWord],
    }));
  };

  const updateWord = (id: string, field: string, value: any) => {
    setVision(prev => ({
      ...prev,
      words: prev.words.map(w =>
        w.id === id ? { ...w, [field]: value } : w
      ),
    }));
  };

  const deleteWord = (id: string) => {
    setVision(prev => ({
      ...prev,
      words: prev.words.filter(w => w.id !== id),
    }));
  };

  const addReminder = () => {
    const newReminder: Reminder = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      frequency: 'once',
      priority: 'medium',
      active: true,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVision(prev => ({
      ...prev,
      reminders: [...prev.reminders, newReminder],
    }));
  };

  const updateReminder = (id: string, field: string, value: any) => {
    setVision(prev => ({
      ...prev,
      reminders: prev.reminders.map(r =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    }));
  };

  const deleteReminder = (id: string) => {
    setVision(prev => ({
      ...prev,
      reminders: prev.reminders.filter(r => r.id !== id),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 flex items-center justify-between">
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            {initialVision ? '✏️ Edit Vision' : '🌟 Create New Vision'}
          </h1>
          <button
            onClick={onCancel}
            className="p-3 hover:bg-white/20 rounded-full transition"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 px-4 sm:px-6 py-3 font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white border-b-4 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vision Tab */}
            {activeTab === 'vision' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Vision Title (BIG AND BOLD)
                  </label>
                  <input
                    type="text"
                    value={vision.title}
                    onChange={(e) => setVision({ ...vision, title: e.target.value })}
                    className="w-full px-6 py-4 border-3 border-gray-300 rounded-2xl text-2xl font-bold focus:outline-none focus:border-purple-600"
                    placeholder="e.g., Master Advanced Yoga & Transform Life"
                  />
                </div>

                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Vision Image URL
                  </label>
                  <input
                    type="url"
                    value={vision.imageUrl || ''}
                    onChange={(e) => setVision({ ...vision, imageUrl: e.target.value })}
                    className="w-full px-6 py-4 border-3 border-gray-300 rounded-2xl text-lg focus:outline-none focus:border-purple-600"
                    placeholder="https://..."
                  />
                  {vision.imageUrl && (
                    <img src={vision.imageUrl} alt="Preview" className="mt-4 w-full h-60 object-cover rounded-2xl" />
                  )}
                </div>

                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Description
                  </label>
                  <textarea
                    value={vision.description}
                    onChange={(e) => setVision({ ...vision, description: e.target.value })}
                    rows={5}
                    className="w-full px-6 py-4 border-3 border-gray-300 rounded-2xl text-lg focus:outline-none focus:border-purple-600"
                    placeholder="Describe your big vision in detail..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-3">Category</label>
                    <input
                      type="text"
                      value={vision.category || ''}
                      onChange={(e) => setVision({ ...vision, category: e.target.value as any })}
                      className="w-full px-6 py-4 border-3 border-gray-300 rounded-2xl text-lg focus:outline-none focus:border-purple-600"
                      placeholder="e.g., Health, Wealth, Personal"
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-3">Priority</label>
                    <select
                      value={vision.priority || 'medium'}
                      onChange={(e) => setVision({ ...vision, priority: e.target.value as any })}
                      className="w-full px-6 py-4 border-3 border-gray-300 rounded-2xl text-lg focus:outline-none focus:border-purple-600"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-3">Start Date</label>
                    <input
                      type="date"
                      value={vision.startDate}
                      onChange={(e) => setVision({ ...vision, startDate: e.target.value })}
                      className="w-full px-6 py-4 border-3 border-gray-300 rounded-2xl text-lg focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-3">End Date</label>
                    <input
                      type="date"
                      value={vision.endDate}
                      onChange={(e) => setVision({ ...vision, endDate: e.target.value })}
                      className="w-full px-6 py-4 border-3 border-gray-300 rounded-2xl text-lg focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">Status</label>
                  <select
                    value={vision.status || 'not-started'}
                    onChange={(e) => setVision({ ...vision, status: e.target.value as any })}
                    className="w-full px-6 py-4 border-3 border-gray-300 rounded-2xl text-lg focus:outline-none focus:border-purple-600"
                  >
                    <option value="not-started">⏳ Not Started</option>
                    <option value="in-progress">⚡ In Progress</option>
                    <option value="completed">✅ Completed</option>
                    <option value="on-hold">⏸️ On Hold</option>
                  </select>
                </div>
              </div>
            )}

            {/* Milestones Tab */}
            {activeTab === 'milestones' && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={addMilestone}
                  className="w-full flex items-center justify-center gap-3 bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-purple-700 transition"
                >
                  <Plus className="h-6 w-6" />
                  Add Milestone
                </button>
                {vision.milestones.map((m, idx) => (
                  <div key={m.id} className="bg-purple-50 border-3 border-purple-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-purple-900">Milestone {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteMilestone(m.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={m.title}
                      onChange={(e) => updateMilestone(m.id, 'title', e.target.value)}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-purple-600"
                      placeholder="Milestone title"
                    />
                    <textarea
                      value={m.description || ''}
                      onChange={(e) => updateMilestone(m.id, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-purple-600"
                      placeholder="Description"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="date"
                        value={m.dueDate}
                        onChange={(e) => updateMilestone(m.id, 'dueDate', e.target.value)}
                        className="px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-purple-600"
                      />
                      <select
                        value={m.status}
                        onChange={(e) => updateMilestone(m.id, 'status', e.target.value)}
                        className="px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-purple-600"
                      >
                        <option value="not-started">⏳ Not Started</option>
                        <option value="in-progress">⚡ In Progress</option>
                        <option value="completed">✅ Completed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Goals Tab */}
            {activeTab === 'goals' && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={addGoal}
                  className="w-full flex items-center justify-center gap-3 bg-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-pink-700 transition"
                >
                  <Plus className="h-6 w-6" />
                  Add Goal
                </button>
                {vision.goals.map((g, idx) => (
                  <div key={g.id} className="bg-pink-50 border-3 border-pink-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-pink-900">Goal {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteGoal(g.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={g.title}
                      onChange={(e) => updateGoal(g.id, 'title', e.target.value)}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-pink-600"
                      placeholder="Goal title"
                    />
                    <textarea
                      value={g.description}
                      onChange={(e) => updateGoal(g.id, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-pink-600"
                      placeholder="Goal description"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-1 block">Start Date</label>
                        <input
                          type="date"
                          value={g.startDate}
                          onChange={(e) => updateGoal(g.id, 'startDate', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-pink-600"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-1 block">Priority</label>
                        <select
                          value={g.priority}
                          onChange={(e) => updateGoal(g.id, 'priority', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-pink-600"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <input
                        type="date"
                        value={g.startDate}
                        onChange={(e) => updateGoal(g.id, 'startDate', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-pink-600"
                      />
                      <input
                        type="date"
                        value={g.targetDate}
                        onChange={(e) => updateGoal(g.id, 'targetDate', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-pink-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={g.progress}
                        onChange={(e) => updateGoal(g.id, 'progress', parseInt(e.target.value))}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-pink-600"
                        placeholder="Progress %"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={addTask}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition"
                >
                  <Plus className="h-6 w-6" />
                  Add Task
                </button>
                {vision.tasks.map((t, idx) => (
                  <div key={t.id} className="bg-blue-50 border-3 border-blue-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-blue-900">Task {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteTask(t.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={t.title}
                      onChange={(e) => updateTask(t.id, 'title', e.target.value)}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-blue-600"
                      placeholder="Task title"
                    />
                    <textarea
                      value={t.description || ''}
                      onChange={(e) => updateTask(t.id, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-blue-600"
                      placeholder="Task description"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <input
                        type="date"
                        value={t.dueDate}
                        onChange={(e) => updateTask(t.id, 'dueDate', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                      <select
                        value={t.priority}
                        onChange={(e) => updateTask(t.id, 'priority', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <select
                        value={t.status}
                        onChange={(e) => updateTask(t.id, 'status', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                      >
                        <option value="not-started">Not Started</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Todos Tab */}
            {activeTab === 'todos' && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={addTodo}
                  className="w-full flex items-center justify-center gap-3 bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition"
                >
                  <Plus className="h-6 w-6" />
                  Add Todo
                </button>
                {vision.todos.map((to, idx) => (
                  <div key={to.id} className="bg-orange-50 border-3 border-orange-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-orange-900">Todo {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteTodo(to.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={to.title}
                      onChange={(e) => updateTodo(to.id, 'title', e.target.value)}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-orange-600"
                      placeholder="Todo title"
                    />
                    <textarea
                      value={to.description || ''}
                      onChange={(e) => updateTodo(to.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-orange-600"
                      placeholder="Todo description"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="date"
                        value={to.dueDate}
                        onChange={(e) => updateTodo(to.id, 'dueDate', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-600"
                      />
                      <select
                        value={to.priority}
                        onChange={(e) => updateTodo(to.id, 'priority', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-600"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={to.completed}
                        onChange={(e) => updateTodo(to.id, 'completed', e.target.checked)}
                        className="w-5 h-5"
                      />
                      <span className="font-bold text-gray-900">Mark as completed</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* Words Tab */}
            {activeTab === 'words' && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={addWord}
                  className="w-full flex items-center justify-center gap-3 bg-yellow-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-yellow-700 transition"
                >
                  <Plus className="h-6 w-6" />
                  Add Word
                </button>
                {vision.words.map((w, idx) => (
                  <div key={w.id} className="bg-yellow-50 border-3 border-yellow-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-yellow-900">Word {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteWord(w.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={w.title}
                      onChange={(e) => updateWord(w.id, 'title', e.target.value)}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-yellow-600"
                      placeholder="Word/Mantra title"
                    />
                    <textarea
                      value={w.content}
                      onChange={(e) => updateWord(w.id, 'content', e.target.value)}
                      rows={4}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-yellow-600"
                      placeholder="Full content/mantra/affirmation"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={w.category}
                        onChange={(e) => updateWord(w.id, 'category', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-yellow-600"
                      >
                        <option value="Mantra">Mantra</option>
                        <option value="Affirmation">Affirmation</option>
                        <option value="Commitment">Commitment</option>
                        <option value="Rule">Rule</option>
                      </select>
                      <input
                        type="color"
                        value={w.color || '#FCD34D'}
                        onChange={(e) => updateWord(w.id, 'color', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reminders Tab */}
            {activeTab === 'reminders' && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={addReminder}
                  className="w-full flex items-center justify-center gap-3 bg-red-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-red-700 transition"
                >
                  <Plus className="h-6 w-6" />
                  Add Reminder
                </button>
                {vision.reminders.map((r, idx) => (
                  <div key={r.id} className="bg-red-50 border-3 border-red-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-red-900">Reminder {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteReminder(r.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={r.title}
                      onChange={(e) => updateReminder(r.id, 'title', e.target.value)}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-red-600"
                      placeholder="Reminder title"
                    />
                    <textarea
                      value={r.description || ''}
                      onChange={(e) => updateReminder(r.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-6 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-red-600"
                      placeholder="Reminder description"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <input
                        type="date"
                        value={r.dueDate}
                        onChange={(e) => updateReminder(r.id, 'dueDate', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                      />
                      <input
                        type="time"
                        value={r.dueTime || ''}
                        onChange={(e) => updateReminder(r.id, 'dueTime', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                      />
                      <select
                        value={r.frequency}
                        onChange={(e) => updateReminder(r.id, 'frequency', e.target.value)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                      >
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t-2 border-red-200">
                      <input
                        type="checkbox"
                        id={`reminder-completed-${r.id}`}
                        checked={r.completed || false}
                        onChange={(e) => updateReminder(r.id, 'completed', e.target.checked)}
                        className="w-6 h-6 rounded border-2 border-red-400 text-red-600 cursor-pointer focus:ring-2 focus:ring-red-500"
                      />
                      <label htmlFor={`reminder-completed-${r.id}`} className="text-lg font-semibold text-red-900 cursor-pointer">
                        Mark as Completed
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 bg-gray-50 p-8 flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-8 py-4 border-3 border-gray-300 rounded-xl font-bold text-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition"
          >
            {initialVision ? '✏️ Update Vision' : '🌟 Save Vision'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisionBuilder;
