'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Vision } from '@/lib/types/lifePlanner';

interface EnhancedVisionBuilderProps {
  vision?: Vision | null;
  onSave: (visionData: Vision) => void;
  onClose: () => void;
}

const EnhancedVisionBuilder: React.FC<EnhancedVisionBuilderProps> = ({ vision, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [expandedSections, setExpandedSections] = useState({
    milestones: true,
    goals: true,
    tasks: true,
    todos: true,
    words: true,
    reminders: true
  });

  const [formData, setFormData] = useState<Vision>({
    id: vision?.id || Date.now().toString(),
    title: vision?.title || '',
    description: vision?.description || '',
    imageUrl: vision?.imageUrl || '',
    startDate: vision?.startDate || '',
    endDate: vision?.endDate || '',
    category: vision?.category || 'Life',
    priority: vision?.priority || 'medium',
    status: vision?.status || 'not-started',
    progress: vision?.progress || 0,
    milestones: vision?.milestones || [],
    goals: vision?.goals || [],
    tasks: vision?.tasks || [],
    todos: vision?.todos || [],
    words: vision?.words || [],
    reminders: vision?.reminders || [],
    createdAt: vision?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    workingHoursStart: '',
    workingHoursEnd: '',
    place: ''
  });
  const [newGoal, setNewGoal] = useState({ title: '', description: '', category: '', targetDate: '', priority: 'medium' as const });
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'medium' as const, repeat: 'once' as const });
  const [newTodo, setNewTodo] = useState({ title: '', dueDate: '', priority: 'medium' as const });
  const [newWord, setNewWord] = useState({ title: '', content: '', category: 'Mantra' });
  const [newReminder, setNewReminder] = useState({ title: '', description: '', dueDate: '', dueTime: '', frequency: 'once' as const, priority: 'medium' as const });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Milestone handlers
  const addMilestone = () => {
    if (newMilestone.title.trim()) {
      setFormData(prev => ({
        ...prev,
        milestones: [...(prev.milestones ?? []), {
          id: Date.now().toString(),
          title: newMilestone.title,
          description: newMilestone.description,
          startDate: newMilestone.startDate || new Date().toISOString().split('T')[0],
          endDate: newMilestone.endDate || newMilestone.startDate || new Date().toISOString().split('T')[0],
          workingHoursStart: newMilestone.workingHoursStart || '09:00',
          workingHoursEnd: newMilestone.workingHoursEnd || '17:00',
          place: newMilestone.place || '',
          status: 'not-started',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      }));
      setNewMilestone({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        workingHoursStart: '',
        workingHoursEnd: '',
        place: ''
      });
    }
  };

  const removeMilestone = (id: string) => {
    setFormData(prev => ({ ...prev, milestones: (prev.milestones ?? []).filter(m => m.id !== id) }));
  };

  const updateMilestone = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: (prev.milestones ?? []).map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  // Goal handlers
  const addGoal = () => {
    if (newGoal.title.trim()) {
      setFormData(prev => ({
        ...prev,
        goals: [...(prev.goals ?? []), {
          id: Date.now().toString(),
          title: newGoal.title,
          visionId: prev.id,
          description: newGoal.description,
          startDate: formData.startDate || undefined,
          targetDate: newGoal.targetDate || undefined,
          priority: newGoal.priority,
          status: 'not-started',
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      }));
      setNewGoal({ title: '', description: '', category: '', targetDate: '', priority: 'medium' });
    }
  };

  const removeGoal = (id: string) => {
    setFormData(prev => ({ ...prev, goals: (prev.goals ?? []).filter(g => g.id !== id) }));
  };

  const updateGoal = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      goals: (prev.goals ?? []).map(g => g.id === id ? { ...g, [field]: value, updatedAt: new Date().toISOString() } : g)
    }));
  };

  // Task handlers
  const addTask = () => {
    if (newTask.title.trim()) {
      setFormData(prev => ({
        ...prev,
        tasks: [...(prev.tasks ?? []), {
          id: Date.now().toString(),
          title: newTask.title,
          description: newTask.description,
          startDate: new Date().toISOString().split('T')[0],
          dueDate: newTask.dueDate,
          priority: newTask.priority,
          status: 'not-started',
          repeat: newTask.repeat,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any]
      }));
      setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', repeat: 'once' });
    }
  };

  const removeTask = (id: string) => {
    setFormData(prev => ({ ...prev, tasks: (prev.tasks ?? []).filter(t => t.id !== id) }));
  };

  const updateTask = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      tasks: (prev.tasks ?? []).map(t => t.id === id ? { ...t, [field]: value, updatedAt: new Date().toISOString() } : t)
    }));
  };

  // Todo handlers
  const addTodo = () => {
    if (newTodo.title.trim()) {
      setFormData(prev => ({
        ...prev,
        todos: [...(prev.todos ?? []), {
          id: Date.now().toString(),
          title: newTodo.title,
          startDate: new Date().toISOString().split('T')[0],
          dueDate: newTodo.dueDate,
          priority: newTodo.priority,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any]
      }));
      setNewTodo({ title: '', dueDate: '', priority: 'medium' });
    }
  };

  const removeTodo = (id: string) => {
    setFormData(prev => ({ ...prev, todos: (prev.todos ?? []).filter(t => t.id !== id) }));
  };

  const updateTodo = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      todos: (prev.todos ?? []).map(t => t.id === id ? { ...t, [field]: value, updatedAt: new Date().toISOString() } : t)
    }));
  };

  // Word handlers
  const addWord = () => {
    if (newWord.title.trim() && newWord.content.trim()) {
      setFormData(prev => ({
        ...prev,
        words: [...(prev.words ?? []), {
          id: Date.now().toString(),
          title: newWord.title,
          content: newWord.content,
          category: newWord.category,
          color: '#8B5CF6',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      }));
      setNewWord({ title: '', content: '', category: 'Mantra' });
    }
  };

  const removeWord = (id: string) => {
    setFormData(prev => ({ ...prev, words: (prev.words ?? []).filter(w => w.id !== id) }));
  };

  // Reminder handlers
  const addReminder = () => {
    if (newReminder.title.trim() && newReminder.dueDate) {
      setFormData(prev => ({
        ...prev,
        reminders: [...(prev.reminders ?? []), {
          id: Date.now().toString(),
          title: newReminder.title,
          description: newReminder.description,
          startDate: new Date().toISOString().split('T')[0],
          dueDate: newReminder.dueDate,
          dueTime: newReminder.dueTime,
          frequency: newReminder.frequency,
          priority: newReminder.priority,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any]
      }));
      setNewReminder({ title: '', description: '', dueDate: '', dueTime: '', frequency: 'once', priority: 'medium' });
    }
  };

  const removeReminder = (id: string) => {
    setFormData(prev => ({ ...prev, reminders: (prev.reminders ?? []).filter(r => r.id !== id) }));
  };

  const calculateProgress = () => {
    const total = (formData.milestones ?? []).length + (formData.goals ?? []).length + (formData.tasks ?? []).length + (formData.todos ?? []).length;
    if (total === 0) return 0;
    const completed = 
      (formData.milestones ?? []).filter(m => m.status === 'completed').length +
      (formData.goals ?? []).filter(g => g.status === 'completed').length +
      (formData.tasks ?? []).filter(t => t.completed).length +
      (formData.todos ?? []).filter(t => t.completed).length;
    return Math.round((completed / total) * 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const visionToSave = {
      ...formData,
      progress: calculateProgress(),
      updatedAt: new Date().toISOString(),
    };
    onSave(visionToSave);
  };

  const tabs = [
    { id: 'basic', name: '📋 Basic Info' },
    { id: 'structure', name: '🏗️ Structure' },
    { id: 'wisdom', name: '✨ Words & Reminders' }
  ];

  const SectionHeader = ({ title, section, count }: { title: string; section: keyof typeof expandedSections; count: number }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{title}</span>
        <span className="text-sm bg-purple-600 text-white px-3 py-1 rounded-full">{count}</span>
      </div>
      {expandedSections[section] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-swar-border sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-2xl font-bold text-swar-text">
            {vision?.id ? '✏️ Edit Vision Project' : '🌟 Create Vision Project'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-swar-primary-light rounded-lg transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-swar-border sticky top-16 bg-white overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-swar-text-secondary hover:text-swar-text'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Title & Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">🎯 Vision Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Master Yoga & Wellness Program"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">🖼️ Image URL</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">📝 Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Describe your vision project in detail..."
                />
              </div>

              {/* Dates & Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">📅 Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">📅 End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">🏷️ Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Health, Wealth, Growth"
                  />
                </div>
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">🔴 Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">✅ Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">📊 Progress: {calculateProgress()}%</label>
                  <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all"
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Structure Tab - Milestones, Goals, Tasks, Todos */}
          {activeTab === 'structure' && (
            <div className="space-y-6">
              {/* Milestones */}
              <div className="space-y-4">
                <SectionHeader title="🏁 Milestones" section="milestones" count={(formData.milestones ?? []).length} />
                {expandedSections.milestones && (
                  <div className="space-y-4 pl-4 border-l-4 border-purple-300">
                    <div className="bg-purple-50 p-4 rounded-lg space-y-3">
                      <input
                        type="text"
                        placeholder="Milestone title (e.g., Complete Phase 1)"
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={newMilestone.description}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="date"
                        value={newMilestone.endDate}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={addMilestone}
                        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                      >
                        <Plus size={16} /> Add Milestone
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.milestones ?? []).map((milestone) => (
                        <div key={milestone.id} className="flex items-center justify-between p-3 bg-white border-2 border-purple-200 rounded-lg">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={milestone.title}
                              onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)}
                              className="font-medium text-swar-text w-full"
                            />
                            <div className="text-sm text-swar-text-secondary mt-1">End: {milestone.endDate}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMilestone(milestone.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Goals */}
              <div className="space-y-4">
                <SectionHeader title="🎯 Goals" section="goals" count={(formData.goals ?? []).length} />
                {expandedSections.goals && (
                  <div className="space-y-4 pl-4 border-l-4 border-blue-300">
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <input
                        type="text"
                        placeholder="Goal title"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newGoal.description}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Category"
                          value={newGoal.category}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, category: e.target.value }))}
                          className="px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <input
                          type="date"
                          value={newGoal.targetDate}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                          className="px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addGoal}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        <Plus size={16} /> Add Goal
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.goals ?? []).map((goal) => (
                        <div key={goal.id} className="flex items-center justify-between p-3 bg-white border-2 border-blue-200 rounded-lg">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={goal.title}
                              onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                              className="font-medium text-swar-text w-full text-sm"
                            />
                            <div className="text-xs text-swar-text-secondary mt-1">Due: {goal.targetDate}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGoal(goal.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-4">
                <SectionHeader title="✓ Tasks" section="tasks" count={(formData.tasks ?? []).length} />
                {expandedSections.tasks && (
                  <div className="space-y-4 pl-4 border-l-4 border-green-300">
                    <div className="bg-swar-primary-light p-4 rounded-lg space-y-3">
                      <input
                        type="text"
                        placeholder="Task title"
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent text-sm"
                        />
                        <select
                          value={newTask.repeat}
                          onChange={(e) => setNewTask(prev => ({ ...prev, repeat: e.target.value as any }))}
                          className="px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent text-sm"
                        >
                          <option value="once">Once</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={addTask}
                        className="w-full flex items-center justify-center gap-2 bg-swar-primary text-white py-2 rounded-lg hover:bg-swar-primary transition text-sm font-medium"
                      >
                        <Plus size={16} /> Add Task
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.tasks ?? []).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-white border-2 border-green-200 rounded-lg">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                              className="font-medium text-swar-text w-full text-sm"
                            />
                            <div className="text-xs text-swar-text-secondary mt-1">{task.repeat} • Due: {task.dueDate}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTask(task.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Todos */}
              <div className="space-y-4">
                <SectionHeader title="📌 Daily Todos" section="todos" count={(formData.todos ?? []).length} />
                {expandedSections.todos && (
                  <div className="space-y-4 pl-4 border-l-4 border-orange-300">
                    <div className="bg-orange-50 p-4 rounded-lg space-y-3">
                      <input
                        type="text"
                        placeholder="Todo item"
                        value={newTodo.title}
                        onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="date"
                        value={newTodo.dueDate}
                        onChange={(e) => setNewTodo(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={addTodo}
                        className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                      >
                        <Plus size={16} /> Add Todo
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.todos ?? []).map((todo) => (
                        <div key={todo.id} className="flex items-center justify-between p-3 bg-white border-2 border-orange-200 rounded-lg">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={todo.title}
                              onChange={(e) => updateTodo(todo.id, 'title', e.target.value)}
                              className="font-medium text-swar-text w-full text-sm"
                            />
                            <div className="text-xs text-swar-text-secondary mt-1">Due: {todo.dueDate}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTodo(todo.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wisdom Tab - Words & Reminders */}
          {activeTab === 'wisdom' && (
            <div className="space-y-6">
              {/* Words/Mantras */}
              <div className="space-y-4">
                <SectionHeader title="✨ Mantras & Affirmations" section="words" count={(formData.words ?? []).length} />
                {expandedSections.words && (
                  <div className="space-y-4 pl-4 border-l-4 border-yellow-300">
                    <div className="bg-yellow-50 p-4 rounded-lg space-y-3">
                      <input
                        type="text"
                        placeholder="Title (e.g., Daily Mantra)"
                        value={newWord.title}
                        onChange={(e) => setNewWord(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                      />
                      <textarea
                        placeholder="Your wisdom, mantra, or affirmation..."
                        value={newWord.content}
                        onChange={(e) => setNewWord(prev => ({ ...prev, content: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm resize-none"
                      />
                      <select
                        value={newWord.category}
                        onChange={(e) => setNewWord(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                      >
                        <option value="Mantra">Mantra</option>
                        <option value="Affirmation">Affirmation</option>
                        <option value="Commitment">Commitment</option>
                        <option value="Rule">Rule</option>
                      </select>
                      <button
                        type="button"
                        onClick={addWord}
                        className="w-full flex items-center justify-center gap-2 bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
                      >
                        <Plus size={16} /> Add Word
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.words ?? []).map((word) => (
                        <div key={word.id} className="flex items-start justify-between p-4 bg-white border-2 border-yellow-200 rounded-lg">
                          <div className="flex-1">
                            <div className="font-semibold text-swar-text text-sm">{word.title}</div>
                            <div className="text-swar-text italic mt-2">{word.content}</div>
                            <div className="text-xs text-swar-text-secondary mt-2">📌 {word.category}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeWord(word.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reminders */}
              <div className="space-y-4">
                <SectionHeader title="🔔 Reminders" section="reminders" count={(formData.reminders ?? []).length} />
                {expandedSections.reminders && (
                  <div className="space-y-4 pl-4 border-l-4 border-red-300">
                    <div className="bg-red-50 p-4 rounded-lg space-y-3">
                      <input
                        type="text"
                        placeholder="Reminder title"
                        value={newReminder.title}
                        onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={newReminder.description}
                        onChange={(e) => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="date"
                          value={newReminder.dueDate}
                          onChange={(e) => setNewReminder(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                        <input
                          type="time"
                          value={newReminder.dueTime}
                          onChange={(e) => setNewReminder(prev => ({ ...prev, dueTime: e.target.value }))}
                          className="px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <select
                        value={newReminder.frequency}
                        onChange={(e) => setNewReminder(prev => ({ ...prev, frequency: e.target.value as any }))}
                        className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      >
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <button
                        type="button"
                        onClick={addReminder}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium"
                      >
                        <Plus size={16} /> Add Reminder
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.reminders ?? []).map((reminder) => (
                        <div key={reminder.id} className="flex items-center justify-between p-3 bg-white border-2 border-red-200 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-swar-text text-sm">{reminder.title}</div>
                            <div className="text-xs text-swar-text-secondary mt-1">{reminder.dueDate} {reminder.dueTime ? `• ${reminder.dueTime}` : ''} • {reminder.frequency}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeReminder(reminder.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-swar-border sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-swar-border text-swar-text rounded-lg hover:bg-swar-bg transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg font-semibold"
            >
              {vision?.id ? '✏️ Update Vision' : '🌟 Create Vision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedVisionBuilder;
