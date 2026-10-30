'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit2, Check, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Todo, Task, Vision, ActionPlan, Goal, VISION_CATEGORIES } from '@/lib/types/lifePlanner';
import { crmPlannerStorage } from '@/lib/crmPlannerMongoStorage';

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
  const [visions, setVisions] = useState<Vision[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Filters
  const [filterTask, setFilterTask] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    standalone: false,
    visionHead: '',
    visionId: '',
    actionPlanId: '',
    goalId: '',
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
      const [savedTodos, savedTasks, savedVisions, savedActionPlans, savedGoals] = await Promise.all([
        crmPlannerStorage.getTodos(),
        crmPlannerStorage.getTasks(),
        crmPlannerStorage.getVisions(),
        crmPlannerStorage.getActionPlans(),
        crmPlannerStorage.getGoals(),
      ]);

      setTodos(Array.isArray(savedTodos) ? savedTodos : []);
      setTasks(Array.isArray(savedTasks) ? savedTasks : []);
      setVisions(Array.isArray(savedVisions) ? savedVisions : []);
      setActionPlans(Array.isArray(savedActionPlans) ? savedActionPlans : []);
      setGoals(Array.isArray(savedGoals) ? savedGoals : []);
      setHasLoaded(true);
    })();
  }, []);

  const skipNextSave = useRef(true);
  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }

    setSaveStatus('saving');
    setSaveError('');
    const timer = setTimeout(() => {
      (async () => {
        try {
          await crmPlannerStorage.saveTodos(todos);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to save todos';
          console.error('Error saving todos:', error);
          setSaveStatus('error');
          setSaveError(errorMsg);
        }
      })();
    }, 500);

    return () => clearTimeout(timer);
  }, [todos, mounted, hasLoaded]);

  // Auto-select single vision when only one option exists
  useEffect(() => {
    if (formData.visionHead && !formData.visionId) {
      const visionsForHead = visions.filter(v => v.category === formData.visionHead);
      if (visionsForHead.length === 1) {
        setFormData(prev => ({
          ...prev,
          visionId: visionsForHead[0].id,
          actionPlanId: '',
          goalId: '',
          taskId: '',
        }));
      }
    }
  }, [formData.visionHead, formData.visionId, visions]);

  // Auto-select single action plan when only one option exists
  useEffect(() => {
    if (formData.visionId && !formData.actionPlanId) {
      const plansForVision = actionPlans.filter(ap => ap.visionId === formData.visionId);
      if (plansForVision.length === 1) {
        setFormData(prev => ({
          ...prev,
          actionPlanId: plansForVision[0].id,
          goalId: '',
          taskId: '',
        }));
      }
    }
  }, [formData.visionId, formData.actionPlanId, actionPlans]);

  // Auto-select single goal when only one option exists
  useEffect(() => {
    if (formData.actionPlanId && !formData.goalId) {
      const goalsForPlan = goals.filter(g => g.actionPlanId === formData.actionPlanId);
      if (goalsForPlan.length === 1) {
        setFormData(prev => ({
          ...prev,
          goalId: goalsForPlan[0].id,
          taskId: '',
        }));
      }
    }
  }, [formData.actionPlanId, formData.goalId, goals]);

  // Auto-select single task when only one option exists
  useEffect(() => {
    if (formData.goalId && !formData.taskId) {
      const tasksForGoal = tasks.filter(t => t.goalId === formData.goalId);
      if (tasksForGoal.length === 1) {
        setFormData(prev => ({
          ...prev,
          taskId: tasksForGoal[0].id,
        }));
      }
    }
  }, [formData.goalId, formData.taskId, tasks]);

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
      standalone: false,
      visionHead: '',
      visionId: '',
      actionPlanId: '',
      goalId: '',
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
      standalone: (todo as any).standalone || false,
      visionHead: (todo as any).visionHead || '',
      visionId: (todo as any).visionId || '',
      actionPlanId: (todo as any).actionPlanId || '',
      goalId: (todo as any).goalId || '',
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
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!formData.dueDate) {
      alert('Please set a due date');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const todoData: Todo = {
      id: editingTodo?.id || `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      standalone: formData.standalone,
      taskId: formData.standalone ? undefined : formData.taskId,
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
      updatedAt: new Date().toISOString(),
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
      const matchesStatus = filterStatus === 'all' || ((t as any).status || 'not-started') === filterStatus;
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
      {/* Save Status Indicator */}
      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          saveStatus === 'saving' ? 'bg-blue-100 text-blue-800' :
          saveStatus === 'saved' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {saveStatus === 'saving' && (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-blue-800 border-t-transparent rounded-full"></div>
              <span className="text-sm font-medium">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <span>✓</span>
              <span className="text-sm font-medium">Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <span>⚠️</span>
              <span className="text-sm font-medium">{saveError || 'Save failed'}</span>
            </>
          )}
        </div>
      )}

      {/* Top Header Bar with Glossy Orange-to-Green Header */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#059669] text-white p-4 sm:p-6 shadow-[0_12px_28px_rgba(234,88,12,0.22)] border border-white/20 mb-6">
        {/* Top Specular Gloss Highlight */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[26px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/admin/crm/planner-dashboard"
              className="p-2.5 sm:p-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition active:scale-95 shadow-sm border border-white/25 flex items-center justify-center shrink-0 cursor-pointer"
              title="Back to CRM Planner"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-100 bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/30 shadow-xs truncate">
                  CRM Planner • Checklist
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 truncate drop-shadow-sm flex items-center gap-2">
                <span>📝</span>
                <span>Todos &amp; Checklist</span>
              </h1>
            </div>
          </div>

          <button
            onClick={handleAddTodo}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white hover:bg-white/95 text-orange-700 font-black text-xs sm:text-sm px-4 sm:px-5 py-2.5 transition active:scale-95 shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>+ Add Todo</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row (4 Rounded Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white/95 rounded-[20px] p-3.5 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-l-4 border-l-blue-500">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Todos</span>
          <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{todos.length}</p>
        </div>
        <div className="bg-white/95 rounded-[20px] p-3.5 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-l-4 border-l-emerald-500">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600">Completed</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{todos.filter(t => t.completed).length}</p>
        </div>
        <div className="bg-white/95 rounded-[20px] p-3.5 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-l-4 border-l-amber-500">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-600">In Progress</span>
          <p className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">{todos.filter(t => !t.completed).length}</p>
        </div>
        <div className="bg-white/95 rounded-[20px] p-3.5 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-l-4 border-l-rose-500">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600">High Priority</span>
          <p className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">{todos.filter(t => !t.completed && t.priority === 'high').length}</p>
        </div>
      </div>

      {/* Filters (Clean 3D Card Container) */}
      <div className="bg-white/95 rounded-[22px] border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-3 sm:space-y-0 sm:flex sm:gap-4 sm:items-end flex-wrap mb-6">
        {/* Search */}
        <div className="flex-1 min-w-xs">
          <label className="block text-xs font-bold text-slate-600 mb-1">Search Todos</label>
          <input
            type="text"
            placeholder="Search by title, description or tag..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          />
        </div>

        {/* Task Filter */}
        <div className="w-full sm:w-48">
          <label className="block text-xs font-bold text-slate-600 mb-1">Parent Task</label>
          <select
            value={filterTask}
            onChange={(e) => setFilterTask(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          >
            <option value="all">All Tasks</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
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
          <label className="block text-xs font-bold text-slate-600 mb-1">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
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

              {/* Standalone / Linked toggle */}
              <div
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${formData.standalone ? 'bg-amber-50 border-amber-400' : 'bg-blue-50 border-blue-200 hover:border-blue-400'}`}
                onClick={() => setFormData(prev => ({ ...prev, standalone: !prev.standalone, visionHead: !prev.standalone ? '' : prev.visionHead, visionId: !prev.standalone ? '' : prev.visionId, actionPlanId: !prev.standalone ? '' : prev.actionPlanId, goalId: !prev.standalone ? '' : prev.goalId, taskId: !prev.standalone ? '' : prev.taskId }))}
              >
                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${formData.standalone ? 'bg-amber-500 border-amber-500' : 'border-gray-400 bg-white'}`}>
                  {formData.standalone && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <div>
                  <p className="font-semibold text-sm">{formData.standalone ? '📌 Standalone (Independent Todo)' : '🔗 Linked to Vision / Goal / Task'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formData.standalone ? 'Not linked to any Vision, Goal, or Task. Stands alone.' : 'Connected to Vision → Goal → Task hierarchy. Check to make it independent.'}
                  </p>
                </div>
              </div>

              {/* Linking fields — only show when NOT standalone */}
              {!formData.standalone && <>
              <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-3">
                <label className="block text-sm font-semibold text-swar-text mb-2">📂 Vision Head</label>
                <select
                  value={formData.visionHead}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    visionHead: e.target.value,
                    visionId: '',
                    actionPlanId: '',
                    goalId: '',
                    taskId: '',
                  }))}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a vision head...</option>
                  {VISION_CATEGORIES.map(head => (
                    <option key={head} value={head}>{head}</option>
                  ))}
                </select>
              </div>

              {/* Vision Selector (filtered by head) */}
              {formData.visionHead && (
                <div className="rounded-lg bg-purple-50 border-2 border-purple-200 p-3">
                  <label className="block text-sm font-semibold text-swar-text mb-2">💡 Vision</label>
                  {(() => {
                    const visionsForHead = visions.filter(v => v.category === formData.visionHead);
                    return visionsForHead.length === 1 ? (
                      <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-sm text-swar-text">
                        {visionsForHead[0].title} (Auto - only option)
                      </div>
                    ) : (
                      <select
                        value={formData.visionId}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          visionId: e.target.value,
                          actionPlanId: '',
                          goalId: '',
                          taskId: '',
                        }))}
                        className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Choose a vision...</option>
                        {visionsForHead.map(v => (
                          <option key={v.id} value={v.id}>{v.title}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              )}

              {/* Action Plan Selector (filtered by vision) */}
              {formData.visionId && (
                <div className="rounded-lg bg-indigo-50 border-2 border-indigo-200 p-3">
                  <label className="block text-sm font-semibold text-swar-text mb-2">📋 Action Plan</label>
                  {(() => {
                    const plansForVision = actionPlans.filter(ap => ap.visionId === formData.visionId);
                    return plansForVision.length === 1 ? (
                      <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-sm text-swar-text">
                        {plansForVision[0].title} (Auto - only option)
                      </div>
                    ) : (
                      <select
                        value={formData.actionPlanId}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          actionPlanId: e.target.value,
                          goalId: '',
                          taskId: '',
                        }))}
                        className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Choose an action plan...</option>
                        {plansForVision.map(ap => (
                          <option key={ap.id} value={ap.id}>{ap.title}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              )}

              {/* Goal Selector (filtered by action plan) */}
              {formData.actionPlanId && (
                <div className="rounded-lg bg-indigo-50 border-2 border-indigo-200 p-3">
                  <label className="block text-sm font-semibold text-swar-text mb-2">🎯 Goal</label>
                  {(() => {
                    const goalsForPlan = goals.filter(g => g.actionPlanId === formData.actionPlanId);
                    return goalsForPlan.length === 1 ? (
                      <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-sm text-swar-text">
                        {goalsForPlan[0].title} (Auto - only option)
                      </div>
                    ) : (
                      <select
                        value={formData.goalId}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          goalId: e.target.value,
                          taskId: '',
                        }))}
                        className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Choose a goal...</option>
                        {goalsForPlan.map(g => (
                          <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              )}

              {/* Task Selector */}
              <div className="rounded-lg border border-swar-border p-3">
                <label className="block text-sm font-semibold text-swar-text mb-2">🔗 Link to Task (Optional)</label>
                {(() => {
                  const tasksToShow = formData.goalId
                    ? tasks.filter(t => t.goalId === formData.goalId)
                    : tasks;

                  return tasksToShow.length === 1 ? (
                    <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-sm text-swar-text">
                      {tasksToShow[0].title} (Auto - only option)
                    </div>
                  ) : (
                    <select
                      name="taskId"
                      value={formData.taskId}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        taskId: e.target.value,
                      }))}
                      className="w-full px-4 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- No parent task --</option>
                      {tasksToShow.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>
              </>}  {/* end !formData.standalone */}

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

      {/* Todos List (Approved 3D Cards Pattern) */}
      <div className="space-y-3.5">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12 bg-white/95 rounded-[24px] border border-slate-200/90 p-8 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-2xl text-slate-400 mb-3">
              📝
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">No todos found</p>
            <p className="text-xs text-slate-500 mb-4">Create your first task or change filter criteria above.</p>
            <button
              onClick={handleAddTodo}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#ea580c] to-[#059669] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover:opacity-90 active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Create your first todo</span>
            </button>
          </div>
        ) : (
          filteredTodos.map(todo => {
            const isCompleted = todo.completed;
            const priorityBorder = isCompleted
              ? 'border-l-emerald-500 bg-emerald-50/20'
              : todo.priority === 'high'
              ? 'border-l-rose-500'
              : todo.priority === 'medium'
              ? 'border-l-amber-500'
              : 'border-l-blue-500';

            const titleColor = isCompleted
              ? 'text-slate-400 line-through'
              : todo.priority === 'high'
              ? 'text-rose-700'
              : todo.priority === 'medium'
              ? 'text-amber-800'
              : 'text-slate-900';

            return (
              <div
                key={todo.id}
                className={`group rounded-[22px] bg-white border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all p-4 sm:p-5 border-l-4 ${priorityBorder} flex flex-col justify-between gap-3`}
              >
                {/* Top Row: Squircle Checkbox + Tag Pills */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleCompleted(todo.id)}
                      className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition active:scale-90 shadow-sm overflow-hidden shrink-0 cursor-pointer ${
                        isCompleted
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/25'
                          : 'bg-gradient-to-b from-slate-50 to-slate-100 hover:from-white hover:to-slate-100 text-slate-400 border border-slate-300'
                      }`}
                      title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                    >
                      <div className="absolute top-0.5 inset-x-1 h-3 bg-gradient-to-b from-white/40 to-transparent rounded-t-xl pointer-events-none" />
                      {isCompleted ? (
                        <Check size={20} className="stroke-[3] drop-shadow-xs" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-slate-400" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <h3 className={`font-bold text-base sm:text-[17px] tracking-tight leading-snug ${titleColor}`}>
                        {todo.title}
                      </h3>
                      {todo.taskId && (
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Task:</span>
                          <span className="text-slate-700 font-semibold truncate">{getTaskTitle(todo.taskId)}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Priority & Category Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    {todo.category && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] sm:text-[11px] tracking-wider uppercase border border-slate-200/60">
                        {todo.category}
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] sm:text-[11px] tracking-wider uppercase border ${
                        todo.priority === 'high'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : todo.priority === 'medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {todo.priority ? `${todo.priority} Priority` : 'Normal'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {todo.description && (
                  <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed pl-13 line-clamp-2">
                    {todo.description}
                  </p>
                )}

                {/* Details & Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pl-0 sm:pl-13">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                    {todo.dueDate && (
                      <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 font-semibold text-slate-700 text-[11px]">
                        <span>📅</span>
                        <span>Due: {todo.dueDate}</span>
                        {todo.dueTime && <span className="text-slate-400">@ {todo.dueTime}</span>}
                      </span>
                    )}
                    {todo.budget && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold text-[11px]">
                        <span>₹</span>
                        <span>{todo.budget.toLocaleString()}</span>
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <span>✓ Done</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleEditTodo(todo)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition border border-slate-200/80 flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Edit Todo"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200 flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Delete Todo"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
