'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { Vision, Milestone, Goal, Task, Todo, Word, Reminder } from '@/lib/types/lifePlanner';

type BuilderVision = Vision & {
  description: string;
  milestones: Milestone[];
  goals: Goal[];
  tasks: Task[];
  todos: Todo[];
  words: Word[];
  reminders: Reminder[];
};

interface VisionBuilderProps {
  initialVision?: Vision | null;
  onSave: (vision: Vision) => void;
  onCancel: () => void;
}

const VisionBuilder: React.FC<VisionBuilderProps> = ({ initialVision, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'vision' | 'milestones' | 'goals' | 'tasks' | 'todos' | 'words' | 'reminders'>('vision');
  const [uniqueCounter, setUniqueCounter] = useState(0);
  
  const generateUniqueId = () => {
    const newCounter = uniqueCounter + 1;
    setUniqueCounter(newCounter);
    return `${Date.now()}-${newCounter}`;
  };

  const normalizeVision = (v: Vision): BuilderVision => ({
    ...v,
    description: v.description ?? '',
    category: (v.category as any) || 'Life',
    milestones: v.milestones ?? [],
    goals: v.goals ?? [],
    tasks: v.tasks ?? [],
    todos: v.todos ?? [],
    words: v.words ?? [],
    reminders: v.reminders ?? [],
    createdAt: v.createdAt || new Date().toISOString(),
    updatedAt: v.updatedAt || new Date().toISOString(),
  });

  const [vision, setVision] = useState<BuilderVision>(() =>
    initialVision
      ? normalizeVision(initialVision)
      : {
          id: generateUniqueId(),
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

  const [previewUrl, setPreviewUrl] = useState<string>(vision.imageUrl || '');
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setPreviewUrl(vision.imageUrl || '');
  }, [vision.imageUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    setVision(prev => ({ ...prev, imageUrl: url }));
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: generateUniqueId(),
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      place: '',
      status: 'not-started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // debug: show new id in console for verification
    console.debug('[VisionBuilder] addMilestone -> id:', newMilestone.id);
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
      id: generateUniqueId(),
      title: '',
      visionId: vision.id,
      description: '',
      startDate: '',
      targetDate: '',
      priority: 'medium',
      status: 'not-started',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // debug: show new id in console for verification
    console.debug('[VisionBuilder] addGoal -> id:', newGoal.id);
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
      id: generateUniqueId(),
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
    // debug: show new id in console for verification
    console.debug('[VisionBuilder] addTask -> id:', newTask.id);
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
      id: generateUniqueId(),
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      priority: 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // debug: show new id in console for verification
    console.debug('[VisionBuilder] addTodo -> id:', newTodo.id);
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
      id: generateUniqueId(),
      title: '',
      description: '',
      content: '',
      type: 'mantra',
      category: 'Mantra',
      color: '#8B5CF6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // debug: show new id in console for verification
    console.debug('[VisionBuilder] addWord -> id:', newWord.id);
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
      id: generateUniqueId(),
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      frequency: 'once',
      time: '11:00',
      dueTime: '11:00',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // debug: show new id in console for verification
    console.debug('[VisionBuilder] addReminder -> id:', newReminder.id);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6 md:p-8 flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white truncate">
            {initialVision ? '✏️ Edit Vision' : '🌟 Create New Vision'}
          </h1>
          <button
            onClick={onCancel}
            className="p-2 sm:p-3 hover:bg-white/20 rounded-full transition flex-shrink-0"
          >
            <X className="h-5 sm:h-6 w-5 sm:w-6 text-white" />
          </button>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="flex overflow-x-auto border-b border-swar-border bg-swar-bg scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white border-b-4 border-purple-600 text-purple-600'
                  : 'text-swar-text-secondary hover:text-swar-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vision Tab */}
            {activeTab === 'vision' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-base sm:text-lg font-bold text-swar-text mb-2 sm:mb-3">
                    Vision Title (BIG AND BOLD)
                  </label>
                  <input
                    type="text"
                    value={vision.title}
                    onChange={(e) => setVision({ ...vision, title: e.target.value })}
                    className="w-full px-3 sm:px-6 py-2 sm:py-4 border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-2xl text-lg sm:text-2xl font-bold focus:outline-none focus:border-purple-600"
                    placeholder="e.g., Master Advanced Yoga & Transform Life"
                  />
                </div>

                <div>
                  <label className="block text-base sm:text-lg font-bold text-swar-text mb-2 sm:mb-3">
                    Vision Image URL
                  </label>
                  <div className="space-y-3 sm:space-y-4">
                    <input
                      type="url"
                      value={vision.imageUrl || ''}
                      onChange={(e) => setVision({ ...vision, imageUrl: e.target.value })}
                      className="w-full px-3 sm:px-6 py-2 sm:py-4 border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-2xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                      placeholder="https://example.com/image.jpg"
                    />
                    <div className="text-xs sm:text-sm text-swar-text-secondary bg-blue-50 p-2 sm:p-3 rounded-lg border-l-4 border-blue-400">
                      💡 Paste a URL and the preview will appear below. Or upload an image file.
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-swar-text-secondary mb-2 font-semibold">Upload Image File</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="text-xs sm:text-sm px-3 sm:px-4 py-2 border-2 border-dashed border-swar-border rounded-lg w-full cursor-pointer hover:border-purple-600 transition" 
                      />
                    </div>
                  </div>
                  
                  {/* Image Preview */}
                  {(previewUrl || vision.imageUrl) && (
                    <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                      <div className="text-xs sm:text-sm font-bold text-swar-text">📸 Preview</div>
                      <div className="relative bg-swar-primary-light rounded-lg sm:rounded-2xl overflow-hidden border-2 sm:border-3 border-swar-border shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl || vision.imageUrl || ''}
                          alt="Vision Preview"
                          className="w-full h-40 sm:h-64 object-cover"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            img.style.display = 'none';
                            const container = img.parentElement;
                            if (container) {
                              const errorMsg = container.querySelector('[data-error-msg]') as HTMLDivElement;
                              if (errorMsg) {
                                errorMsg.style.display = 'flex';
                              }
                            }
                          }}
                          onLoad={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            const container = img.parentElement;
                            if (container) {
                              const errorMsg = container.querySelector('[data-error-msg]') as HTMLDivElement;
                              if (errorMsg) {
                                errorMsg.style.display = 'none';
                              }
                            }
                          }}
                        />
                        
                        {/* Error Message */}
                        <div
                          data-error-msg
                          className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600 p-4"
                          style={{ display: 'flex' }}
                        >
                          <div className="text-2xl sm:text-4xl mb-2">❌</div>
                          <div className="text-center text-xs sm:text-sm font-bold">
                            Image could not be loaded
                          </div>
                          <div className="text-xs text-red-500 mt-1">
                            Check if the URL is correct and accessible
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-swar-text-secondary">
                        ℹ️ Image URL: {vision.imageUrl ? vision.imageUrl.substring(0, 40) + '...' : 'File upload'}
                      </div>
                    </div>
                  )}
                  
                  {/* Empty State */}
                  {!previewUrl && !vision.imageUrl && (
                    <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg sm:rounded-2xl border-2 border-dashed border-purple-200 text-center">
                      <div className="text-3xl sm:text-5xl mb-2">🖼️</div>
                      <div className="text-xs sm:text-sm font-bold text-swar-text">No Image Yet</div>
                      <div className="text-xs text-swar-text-secondary mt-1">Paste a URL or upload a file to see preview</div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-base sm:text-lg font-bold text-swar-text mb-2 sm:mb-3">
                    Description
                  </label>
                  <textarea
                    value={vision.description}
                    onChange={(e) => setVision({ ...vision, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 sm:px-6 py-2 sm:py-4 border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-2xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                    placeholder="Describe your big vision in detail..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <div>
                    <label className="block text-base sm:text-lg font-bold text-swar-text mb-2 sm:mb-3">Category</label>
                    <input
                      type="text"
                      value={vision.category || ''}
                      onChange={(e) => setVision({ ...vision, category: e.target.value as any })}
                      className="w-full px-3 sm:px-6 py-2 sm:py-4 border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-2xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                      placeholder="e.g., Health, Wealth, Personal"
                    />
                  </div>
                  <div>
                    <label className="block text-base sm:text-lg font-bold text-swar-text mb-2 sm:mb-3">Priority</label>
                    <select
                      value={vision.priority || 'medium'}
                      onChange={(e) => setVision({ ...vision, priority: e.target.value as any })}
                      className="w-full px-3 sm:px-6 py-2 sm:py-4 border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-2xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <div>
                    <label className="block text-base sm:text-lg font-bold text-swar-text mb-2 sm:mb-3">Start Date</label>
                    <input
                      type="date"
                      value={vision.startDate}
                      onChange={(e) => setVision({ ...vision, startDate: e.target.value })}
                      className="w-full px-3 sm:px-6 py-2 sm:py-4 border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-2xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-base sm:text-lg font-bold text-swar-text mb-2 sm:mb-3">End Date</label>
                    <input
                      type="date"
                      value={vision.endDate}
                      onChange={(e) => setVision({ ...vision, endDate: e.target.value })}
                      className="w-full px-3 sm:px-6 py-2 sm:py-4 border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-2xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-base sm:text-lg font-bold text-swar-text mb-2 sm:mb-3">Status</label>
                  <select
                    value={vision.status || 'not-started'}
                    onChange={(e) => setVision({ ...vision, status: e.target.value as any })}
                    className="w-full px-3 sm:px-6 py-2 sm:py-4 border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-2xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
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
              <div className="space-y-3 sm:space-y-6">
                <button
                  type="button"
                  onClick={addMilestone}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-purple-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-purple-700 transition"
                >
                  <Plus className="h-5 sm:h-6 w-5 sm:w-6" />
                  Add Milestone
                </button>
                {vision.milestones.map((m, idx) => (
                  <div key={m.id} className="bg-purple-50 border-2 sm:border-3 border-purple-200 rounded-lg sm:rounded-2xl p-3 sm:p-6 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg sm:text-2xl font-bold text-purple-900">Milestone {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteMilestone(m.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                      >
                        <Trash2 className="h-4 sm:h-6 w-4 sm:w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={m.title}
                      onChange={(e) => updateMilestone(m.id, 'title', e.target.value)}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                      placeholder="Milestone title"
                    />
                    <textarea
                      value={m.description || ''}
                      onChange={(e) => updateMilestone(m.id, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                      placeholder="Description"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <input
                        type="date"
                        value={m.startDate}
                        onChange={(e) => updateMilestone(m.id, 'startDate', e.target.value)}
                        className="px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                      />
                      <input
                        type="date"
                        value={m.endDate}
                        onChange={(e) => updateMilestone(m.id, 'endDate', e.target.value)}
                        className="px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
                      />
                      <select
                        value={m.status}
                        onChange={(e) => updateMilestone(m.id, 'status', e.target.value)}
                        className="px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-purple-600"
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
              <div className="space-y-3 sm:space-y-6">
                <button
                  type="button"
                  onClick={addGoal}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-pink-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-pink-700 transition"
                >
                  <Plus className="h-5 sm:h-6 w-5 sm:w-6" />
                  Add Goal
                </button>
                {vision.goals.map((g, idx) => (
                  <div key={g.id} className="bg-swar-primary-light border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-2xl p-3 sm:p-6 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <h3 className="text-lg sm:text-2xl font-bold text-pink-900">Goal {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteGoal(g.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                      >
                        <Trash2 className="h-4 sm:h-6 w-4 sm:w-6" />
                      </button>
                    </div>

                    {/* Goal Title */}
                    <input
                      type="text"
                      value={g.title}
                      onChange={(e) => updateGoal(g.id, 'title', e.target.value)}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg font-bold focus:outline-none focus:border-pink-600"
                      placeholder="Goal title (e.g., Complete Advanced Certification)"
                    />

                    {/* Goal Description */}
                    <textarea
                      value={g.description}
                      onChange={(e) => updateGoal(g.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-pink-600"
                      placeholder="Describe your goal in detail..."
                    />

                    {/* Dates & Budget */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={g.startDate}
                          onChange={(e) => updateGoal(g.id, 'startDate', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-pink-600 text-xs sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Target Date</label>
                        <input
                          type="date"
                          value={g.targetDate}
                          onChange={(e) => updateGoal(g.id, 'targetDate', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-pink-600 text-xs sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">💰 Budget</label>
                        <input
                          type="number"
                          value={g.budget || ''}
                          onChange={(e) => updateGoal(g.id, 'budget', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-pink-600 text-xs sm:text-base"
                          placeholder="Amount"
                        />
                      </div>
                    </div>

                    {/* Priority, Status, Progress */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Priority</label>
                        <select
                          value={g.priority}
                          onChange={(e) => updateGoal(g.id, 'priority', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-pink-600 text-xs sm:text-base"
                        >
                          <option value="low">🟢 Low</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="high">🔴 High</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Status</label>
                        <select
                          value={g.status}
                          onChange={(e) => updateGoal(g.id, 'status', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-pink-600 text-xs sm:text-base"
                        >
                          <option value="not-started">⏳ Not Started</option>
                          <option value="in-progress">⚡ In Progress</option>
                          <option value="completed">✅ Completed</option>
                          <option value="on-hold">⏸️ On Hold</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Progress %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={g.progress}
                          onChange={(e) => updateGoal(g.id, 'progress', parseInt(e.target.value) || 0)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-pink-600 text-xs sm:text-base"
                          placeholder="0-100"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-3 sm:space-y-6">
                <button
                  type="button"
                  onClick={addTask}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-blue-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-blue-700 transition"
                >
                  <Plus className="h-5 sm:h-6 w-5 sm:w-6" />
                  Add Task
                </button>
                {vision.tasks.map((t, idx) => (
                  <div key={t.id} className="bg-blue-50 border-2 sm:border-3 border-blue-200 rounded-lg sm:rounded-2xl p-3 sm:p-6 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg sm:text-2xl font-bold text-blue-900">Task {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteTask(t.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                      >
                        <Trash2 className="h-4 sm:h-6 w-4 sm:w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={t.title}
                      onChange={(e) => updateTask(t.id, 'title', e.target.value)}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg font-bold focus:outline-none focus:border-blue-600"
                      placeholder="Task title (e.g., Research providers)"
                    />
                    <textarea
                      value={t.description || ''}
                      onChange={(e) => updateTask(t.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-blue-600"
                      placeholder="Task description..."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={t.startDate}
                          onChange={(e) => updateTask(t.id, 'startDate', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-600 text-xs sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={t.dueDate}
                          onChange={(e) => updateTask(t.id, 'dueDate', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-600 text-xs sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">💰 Budget</label>
                        <input
                          type="number"
                          value={t.budget || ''}
                          onChange={(e) => updateTask(t.id, 'budget', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-600 text-xs sm:text-base"
                          placeholder="Amount"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Priority</label>
                        <select
                          value={t.priority}
                          onChange={(e) => updateTask(t.id, 'priority', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-600 text-xs sm:text-base"
                        >
                          <option value="low">🟢 Low</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="high">🔴 High</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Status</label>
                        <select
                          value={t.status}
                          onChange={(e) => updateTask(t.id, 'status', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-600 text-xs sm:text-base"
                        >
                          <option value="not-started">⏳ Not Started</option>
                          <option value="in-progress">⚡ In Progress</option>
                          <option value="completed">✅ Completed</option>
                          <option value="pending">⏳ Pending</option>
                          <option value="overdue">⚠️ Overdue</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Todos Tab */}
            {activeTab === 'todos' && (
              <div className="space-y-3 sm:space-y-6">
                <button
                  type="button"
                  onClick={addTodo}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-orange-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-orange-700 transition"
                >
                  <Plus className="h-5 sm:h-6 w-5 sm:w-6" />
                  Add Todo
                </button>
                {vision.todos.map((to, idx) => (
                  <div key={to.id} className="bg-orange-50 border-2 sm:border-3 border-orange-200 rounded-lg sm:rounded-2xl p-3 sm:p-6 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg sm:text-2xl font-bold text-orange-900">Todo {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteTodo(to.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                      >
                        <Trash2 className="h-4 sm:h-6 w-4 sm:w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={to.title}
                      onChange={(e) => updateTodo(to.id, 'title', e.target.value)}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg font-bold focus:outline-none focus:border-orange-600"
                      placeholder="Todo title (e.g., Call provider)"
                    />
                    <textarea
                      value={to.description || ''}
                      onChange={(e) => updateTodo(to.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-orange-600"
                      placeholder="Todo description..."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={to.startDate}
                          onChange={(e) => updateTodo(to.id, 'startDate', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-orange-600 text-xs sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={to.dueDate}
                          onChange={(e) => updateTodo(to.id, 'dueDate', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-orange-600 text-xs sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Priority</label>
                        <select
                          value={to.priority}
                          onChange={(e) => updateTodo(to.id, 'priority', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-orange-600 text-xs sm:text-base"
                        >
                          <option value="low">🟢 Low</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="high">🔴 High</option>
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={to.completed}
                        onChange={(e) => updateTodo(to.id, 'completed', e.target.checked)}
                        className="w-4 sm:w-5 h-4 sm:h-5"
                      />
                      <span className="font-bold text-swar-text text-sm sm:text-base">Mark as completed</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* Words Tab */}
            {activeTab === 'words' && (
              <div className="space-y-3 sm:space-y-6">
                <button
                  type="button"
                  onClick={addWord}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-yellow-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-yellow-700 transition"
                >
                  <Plus className="h-5 sm:h-6 w-5 sm:w-6" />
                  Add Word/Mantra
                </button>
                {vision.words.map((w, idx) => (
                  <div key={w.id} className="bg-yellow-50 border-2 sm:border-3 border-yellow-200 rounded-lg sm:rounded-2xl p-3 sm:p-6 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <h3 className="text-lg sm:text-2xl font-bold text-yellow-900">Word {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteWord(w.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                      >
                        <Trash2 className="h-4 sm:h-6 w-4 sm:w-6" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={w.title}
                      onChange={(e) => updateWord(w.id, 'title', e.target.value)}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg font-bold focus:outline-none focus:border-yellow-600"
                      placeholder="Title/Mantra name"
                    />
                    <textarea
                      value={w.content}
                      onChange={(e) => updateWord(w.id, 'content', e.target.value)}
                      rows={4}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-yellow-600"
                      placeholder="Full content, mantra, affirmation or commitment..."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Type</label>
                        <select
                          value={w.category}
                          onChange={(e) => updateWord(w.id, 'category', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-yellow-600 text-xs sm:text-base"
                        >
                          <option value="Mantra">🕉️ Mantra</option>
                          <option value="Affirmation">✨ Affirmation</option>
                          <option value="Commitment">🤝 Commitment</option>
                          <option value="Rule">📜 Rule</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Color</label>
                        <input
                          type="color"
                          value={w.color || '#FCD34D'}
                          onChange={(e) => updateWord(w.id, 'color', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg cursor-pointer"
                        />
                      </div>
                      <div className="flex items-end">
                        <div
                          className="w-full h-10 rounded-lg border-2 border-swar-border"
                          style={{ backgroundColor: w.color || '#FCD34D' }}
                          title="Color preview"
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reminders Tab */}
            {activeTab === 'reminders' && (
              <div className="space-y-3 sm:space-y-6">
                <button
                  type="button"
                  onClick={addReminder}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-red-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-red-700 transition"
                >
                  <Plus className="h-5 sm:h-6 w-5 sm:w-6" />
                  Add Reminder
                </button>
                {vision.reminders.map((r, idx) => (
                  <div key={r.id} className="bg-red-50 border-2 sm:border-3 border-red-200 rounded-lg sm:rounded-2xl p-3 sm:p-6 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <h3 className="text-lg sm:text-2xl font-bold text-red-900">Reminder {idx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => deleteReminder(r.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                      >
                        <Trash2 className="h-4 sm:h-6 w-4 sm:w-6" />
                      </button>
                    </div>

                    {/* Title & Description */}
                    <input
                      type="text"
                      value={r.title}
                      onChange={(e) => updateReminder(r.id, 'title', e.target.value)}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg font-bold focus:outline-none focus:border-red-600"
                      placeholder="Reminder title (e.g., Morning meditation)"
                    />
                    <textarea
                      value={r.description || ''}
                      onChange={(e) => updateReminder(r.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 sm:px-6 py-2 sm:py-3 border-2 border-swar-border rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:border-red-600"
                      placeholder="Reminder description..."
                    />

                    {/* Dates & Times */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={r.startDate}
                          onChange={(e) => updateReminder(r.id, 'startDate', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-red-600 text-xs sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={r.dueDate}
                          onChange={(e) => updateReminder(r.id, 'dueDate', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-red-600 text-xs sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Time</label>
                        <input
                          type="time"
                          value={r.dueTime || ''}
                          onChange={(e) => updateReminder(r.id, 'dueTime', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-red-600 text-xs sm:text-base"
                        />
                      </div>
                    </div>

                    {/* Category, Frequency, Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Category</label>
                        <select
                          value={r.category}
                          onChange={(e) => updateReminder(r.id, 'category', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-red-600 text-xs sm:text-base"
                        >
                          <option value="life">🌍 Life</option>
                          <option value="health">💪 Health</option>
                          <option value="wealth">💰 Wealth</option>
                          <option value="success">🏆 Success</option>
                          <option value="respect">👑 Respect</option>
                          <option value="pleasure">😊 Pleasure</option>
                          <option value="prosperity">✨ Prosperity</option>
                          <option value="luxuries">💎 Luxuries</option>
                          <option value="good-habits">🌟 Good Habits</option>
                          <option value="self-sadhana">🧘 Self Sadhana</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Frequency</label>
                        <select
                          value={r.frequency}
                          onChange={(e) => updateReminder(r.id, 'frequency', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-red-600 text-xs sm:text-base"
                        >
                          <option value="once">Once</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">Priority</label>
                        <select
                          value={r.priority}
                          onChange={(e) => updateReminder(r.id, 'priority', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-red-600 text-xs sm:text-base"
                        >
                          <option value="low">🟢 Low</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="high">🔴 High</option>
                        </select>
                      </div>
                    </div>

                    {/* Budget & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                      <div>
                        <label className="text-xs font-bold text-swar-text block mb-1">💰 Budget (Optional)</label>
                        <input
                          type="number"
                          value={r.budget || ''}
                          onChange={(e) => updateReminder(r.id, 'budget', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 sm:px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-red-600 text-xs sm:text-base"
                          placeholder="Amount"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 sm:gap-3 w-full cursor-pointer p-2 bg-white rounded-lg border-2 border-red-300 hover:bg-red-100 transition">
                          <input
                            type="checkbox"
                            checked={r.completed || false}
                            onChange={(e) => updateReminder(r.id, 'completed', e.target.checked)}
                            className="w-4 sm:w-5 h-4 sm:h-5"
                          />
                          <span className="font-bold text-red-900 text-sm sm:text-base">Completed</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-swar-border bg-swar-bg p-3 sm:p-4 md:p-6 lg:p-8 flex gap-2 sm:gap-4 justify-end flex-wrap sm:flex-nowrap">
          <button
            onClick={onCancel}
            className="px-4 sm:px-8 py-2 sm:py-4 border-2 sm:border-3 border-swar-border rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg hover:bg-swar-primary-light transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 sm:px-8 py-2 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg hover:shadow-lg transition"
          >
            {initialVision ? '✏️ Update' : '🌟 Save Vision'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisionBuilder;
