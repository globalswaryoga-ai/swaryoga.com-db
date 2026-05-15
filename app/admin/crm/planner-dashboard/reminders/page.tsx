'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { crmPlannerStorage } from '@/lib/crmPlannerMongoStorage';
import { VISION_CATEGORIES, type Reminder as DbReminder, type VisionCategory, type Vision, type ActionPlan, type Task as DbTask } from '@/lib/types/lifePlanner';
import LifePlannerImageUpload from '@/components/LifePlannerImageUpload';

const DEFAULT_IMAGE = 'https://i.postimg.cc/Y0zjsTd2/image.jpg';

type UiReminder = {
  id: string;
  text: string;
  date: string;
  time: string;
  visionHead?: VisionCategory;
  visionId?: string;
  actionPlanId?: string;
  goalId?: string;
  taskId?: string;
  todoId?: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays?: number;
  completed?: boolean;
  imageUrl?: string;
};

function dbToUiReminder(r: DbReminder): UiReminder {
  return {
    id: r.id,
    text: r.title || r.description || '',
    date: r.dueDate || r.startDate || '',
    time: r.dueTime || '11:00',
    visionHead: (r.visionHead || (r.category as any)) as VisionCategory | undefined,
    visionId: r.visionId,
    actionPlanId: r.actionPlanId,
    goalId: r.goalId,
    taskId: r.taskId,
    todoId: r.todoId,
    frequency: (r.frequency as UiReminder['frequency']) || 'once',
    completed: Boolean(r.completed),
    imageUrl: r.imageUrl,
  };
}

function uiToDbReminder(r: UiReminder): DbReminder {
  return {
    id: r.id,
    title: r.text,
    description: '',
    visionHead: r.visionHead,
    category: r.visionHead,
    visionId: r.visionId,
    actionPlanId: r.actionPlanId,
    goalId: r.goalId,
    taskId: r.taskId,
    todoId: r.todoId,
    startDate: r.date,
    dueDate: r.date,
    time: r.time,
    dueTime: r.time,
    frequency: (r.frequency as DbReminder['frequency']) || 'once',
    completed: Boolean(r.completed),
    imageUrl: r.imageUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function RemindersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didAutoOpen = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reminders, setReminders] = useState<UiReminder[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [formData, setFormData] = useState({
    text: '',
    date: '',
    time: '11:00',
    visionHead: '' as '' | VisionCategory,
    visionId: '',
    actionPlanId: '',
    goalId: '',
    taskId: '',
    todoId: '',
    frequency: 'once' as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    customDays: 1,
    imageUrl: DEFAULT_IMAGE,
  });
  const [error, setError] = useState<string | null>(null);

  // Filters (UI-only; never persisted)
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterFrequency, setFilterFrequency] = useState<'all' | UiReminder['frequency']>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

  useEffect(() => {
    const load = async () => {
      setMounted(true);
      try {
        const [saved, savedVisions, savedPlans, savedTasks] = await Promise.all([
          crmPlannerStorage.getReminders(),
          crmPlannerStorage.getVisions(),
          crmPlannerStorage.getActionPlans(),
          crmPlannerStorage.getTasks(),
        ]);
        setReminders((Array.isArray(saved) ? saved : []).map(dbToUiReminder));
        setVisions(Array.isArray(savedVisions) ? savedVisions : []);
        setActionPlans(Array.isArray(savedPlans) ? savedPlans : []);
        setTasks(Array.isArray(savedTasks) ? savedTasks : []);
      } finally {
        setHasLoaded(true);
      }
    };
    load();
  }, []);

  const skipNextSave = useRef(true);
  useEffect(() => {
    const save = async () => {
      if (!mounted || !hasLoaded) return;
      if (skipNextSave.current) { skipNextSave.current = false; return; }

      setSaveStatus('saving');
      setSaveError('');
      const timer = setTimeout(async () => {
        try {
          await crmPlannerStorage.saveReminders(reminders.map(uiToDbReminder));
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to save reminders';
          console.error('Error saving reminders:', error);
          setSaveStatus('error');
          setSaveError(errorMsg);
        }
      }, 500);

      return () => clearTimeout(timer);
    };
    save();
  }, [reminders, mounted, hasLoaded]);

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
          todoId: '',
        }));
      }
    }
  }, [formData.visionHead, formData.visionId, visions]);

  // Auto-select single action plan when only one option exists
  useEffect(() => {
    if (formData.visionId && !formData.actionPlanId) {
      const plansForVision = actionPlans.filter(p => p.visionId === formData.visionId);
      if (plansForVision.length === 1) {
        setFormData(prev => ({
          ...prev,
          actionPlanId: plansForVision[0].id,
          goalId: '',
          taskId: '',
          todoId: '',
        }));
      }
    }
  }, [formData.visionId, formData.actionPlanId, actionPlans]);

  const openCreate = useCallback(() => {
    setShowForm(true);
    setError(null);
    setFormData((prev) => ({
      ...prev,
      date: prev.date || today,
      time: prev.time || '11:00',
    }));
  }, [today]);

  useEffect(() => {
    if (!mounted) return;
    if (didAutoOpen.current) return;
    if (searchParams?.get('create') !== '1') return;

    didAutoOpen.current = true;
    openCreate();
    router.replace('/life-planner/dashboard/reminders');
  }, [mounted, searchParams, openCreate, router]);

  const isFormValid = useMemo(
    () => formData.text.trim().length > 0 && Boolean(formData.date) && Boolean(formData.time),
    [formData.text, formData.date, formData.time]
  );

  const handleAddReminder = useCallback(() => {
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    const newReminder: UiReminder = {
      id: Date.now().toString(),
      text: formData.text,
      date: formData.date,
      time: formData.time,
      visionHead: formData.visionHead || undefined,
      visionId: formData.visionId || undefined,
      goalId: formData.goalId || undefined,
      taskId: formData.taskId || undefined,
      todoId: formData.todoId || undefined,
      frequency: formData.frequency,
      customDays: formData.frequency === 'custom' ? formData.customDays : undefined,
      imageUrl: formData.imageUrl || DEFAULT_IMAGE,
    };

    setReminders(prev => [...prev, newReminder]);
    setFormData({
      text: '',
      date: '',
      time: '11:00',
      visionHead: '',
      visionId: '',
      actionPlanId: '',
      goalId: '',
      taskId: '',
      todoId: '',
      frequency: 'once',
      customDays: 1,
      imageUrl: DEFAULT_IMAGE,
    });
    setError(null);
    setShowForm(false);
  }, [formData, isFormValid]);

  const frequencyLabels: Record<string, string> = {
    once: 'Once',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    custom: 'Custom',
  };

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredReminders = reminders.filter((r) => {
    const haystack = `${r.text || ''} ${frequencyLabels[r.frequency] || r.frequency}`.toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'completed' ? Boolean(r.completed) : !Boolean(r.completed));

    const matchesFrequency = filterFrequency === 'all' || r.frequency === filterFrequency;

    const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth as any);
    const date = r.date ? new Date(r.date) : null;
    const matchesMonth = monthIdx === null || (date && !Number.isNaN(date.getTime()) && date.getMonth() === monthIdx);

    return matchesSearch && matchesStatus && matchesFrequency && matchesMonth;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-swar-text">Reminders</h1>
          <p className="text-swar-text-secondary mt-1">Set up reminders for important tasks and events</p>
        </div>
        <button
          onClick={openCreate}
          className="w-full sm:w-auto justify-center flex items-center gap-2 rounded-xl bg-gradient-to-r from-swar-accent to-swar-accent px-4 py-2 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition"
        >
          <Plus className="h-5 w-5" />
          Add Reminder
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Search</label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search reminder text"
              className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Frequency</label>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchText('');
                setFilterStatus('all');
                setFilterFrequency('all');
                setFilterMonth('all');
              }}
              className="w-full px-3 py-2 rounded-lg bg-swar-primary-light text-swar-text font-bold hover:bg-swar-primary-light transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-swar-text-secondary">Showing {filteredReminders.length} of {reminders.length} reminders</p>
      </div>

      {/* Add Reminder Modal (Task-form style, keep pink theme) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-swar-accent to-swar-accent p-6 text-white flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Create New Reminder</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="text-2xl font-bold hover:scale-110 transition-transform"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-swar-primary flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-swar-text mb-2">Reminder Text *</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="What should you be reminded about?"
                  className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-2">Vision Head (Optional)</label>
                <select
                  value={formData.visionHead}
                  onChange={(e) => setFormData({ ...formData, visionHead: e.target.value as any, visionId: '', actionPlanId: '', goalId: '', taskId: '', todoId: '' })}
                  className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 bg-white"
                >
                  <option value="">Select Vision Head</option>
                  {VISION_CATEGORIES.map((head) => (
                    <option key={head} value={head}>{head}</option>
                  ))}
                </select>
              </div>

              {/* Vision selector */}
              {formData.visionHead && (() => {
                const visionsForHead = visions.filter(v => v.category === formData.visionHead);
                return visionsForHead.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Vision</label>
                    {visionsForHead.length === 1 ? (
                      <div className="px-4 py-3 bg-blue-50 border border-swar-border rounded-lg text-swar-text">
                        {visionsForHead[0].title} (Auto - only option)
                      </div>
                    ) : (
                      <select
                        value={formData.visionId}
                        onChange={(e) => setFormData({ ...formData, visionId: e.target.value, goalId: '', taskId: '', todoId: '' })}
                        className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 bg-white"
                      >
                        <option value="">Select Vision (optional)</option>
                        {visionsForHead.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                      </select>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Action Plan selector */}
              {formData.visionId && (() => {
                const plansForVision = actionPlans.filter(p => p.visionId === formData.visionId);
                return plansForVision.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Action Plan</label>
                    {plansForVision.length === 1 ? (
                      <div className="px-4 py-3 bg-blue-50 border border-swar-border rounded-lg text-swar-text">
                        {plansForVision[0].title} (Auto - only option)
                      </div>
                    ) : (
                      <select
                        value={formData.actionPlanId || ''}
                        onChange={(e) => setFormData({ ...formData, actionPlanId: e.target.value || undefined, goalId: '', taskId: '', todoId: '' })}
                        className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 bg-white"
                      >
                        <option value="">Select Action Plan (optional)</option>
                        {plansForVision.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Goal selector */}
              {formData.visionId && (() => {
                const goalsForVision = actionPlans
                  .filter(p => p.visionId === formData.visionId)
                  .flatMap(p => (p.goals || []).map(g => ({ ...g, planTitle: p.title })));
                return goalsForVision.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Goal</label>
                    <select
                      value={formData.goalId}
                      onChange={(e) => setFormData({ ...formData, goalId: e.target.value, taskId: '', todoId: '' })}
                      className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 bg-white"
                    >
                      <option value="">Select Goal (optional)</option>
                      {goalsForVision.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </div>
                ) : null;
              })()}

              {/* Task selector */}
              {formData.goalId && (() => {
                // Tasks both from action plan goals (embedded) and standalone tasks
                const embeddedTasks = actionPlans
                  .filter(p => p.visionId === formData.visionId)
                  .flatMap(p => (p.goals || []))
                  .filter(g => g.id === formData.goalId)
                  .flatMap(g => (g.tasks || []));
                const standaloneTasks = tasks.filter(t => t.goalId === formData.goalId);
                const allTasks = [...embeddedTasks, ...standaloneTasks];
                const seen = new Set<string>();
                const uniqueTasks = allTasks.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
                return uniqueTasks.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Task</label>
                    <select
                      value={formData.taskId}
                      onChange={(e) => setFormData({ ...formData, taskId: e.target.value, todoId: '' })}
                      className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 bg-white"
                    >
                      <option value="">Select Task (optional)</option>
                      {uniqueTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
                ) : null;
              })()}

              {/* Todo selector */}
              {formData.taskId && (() => {
                // Todos from embedded tasks in goals or standalone tasks
                const embeddedTodos = actionPlans
                  .filter(p => p.visionId === formData.visionId)
                  .flatMap(p => (p.goals || []))
                  .filter(g => g.id === formData.goalId)
                  .flatMap(g => (g.tasks || []))
                  .filter(t => t.id === formData.taskId)
                  .flatMap(t => (t.todos || []));
                const standaloneTodos = tasks
                  .filter(t => t.id === formData.taskId)
                  .flatMap(t => (t.todos || []));
                const allTodos = [...embeddedTodos, ...standaloneTodos];
                const seen = new Set<string>();
                const uniqueTodos = allTodos.filter(td => { if (seen.has(td.id)) return false; seen.add(td.id); return true; });
                return uniqueTodos.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Todo</label>
                    <select
                      value={formData.todoId}
                      onChange={(e) => setFormData({ ...formData, todoId: e.target.value })}
                      className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 bg-white"
                    >
                      <option value="">Select Todo (optional)</option>
                      {uniqueTodos.map(td => <option key={td.id} value={td.id}>{td.title}</option>)}
                    </select>
                  </div>
                ) : null;
              })()}

              <LifePlannerImageUpload
                label="Reminder Image (Optional)"
                onImageUrlChange={(url) => setFormData({ ...formData, imageUrl: url })}
                currentImageUrl={formData.imageUrl}
                maxSizeMB={5}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-2">Time *</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-swar-text mb-3">Frequency</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as const).map((freq) => (
                    <label key={freq} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="frequency"
                        value={freq}
                        checked={formData.frequency === freq}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            frequency: e.target.value as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
                          })
                        }
                        className="h-5 w-5 rounded-full border-2 border-pink-300 text-red-600 focus:ring-2 focus:ring-red-500 cursor-pointer"
                      />
                      <span className="text-sm text-swar-text font-medium">{frequencyLabels[freq]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.frequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-2">Repeat every (days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.customDays}
                    onChange={(e) => setFormData({ ...formData, customDays: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-5 pb-5 border-t-2 border-swar-border bg-gradient-to-r from-pink-50 via-white to-red-50 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                    setFormData({
                      text: '',
                      date: today,
                      time: '11:00',
                      visionHead: '',
                      visionId: '',
                      goalId: '',
                      taskId: '',
                      todoId: '',
                      frequency: 'once',
                      customDays: 1,
                      imageUrl: DEFAULT_IMAGE,
                    });
                  }}
                  className="w-full sm:w-auto px-6 py-2 border border-swar-border rounded-lg text-swar-text font-medium hover:bg-swar-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddReminder}
                  className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-swar-accent to-swar-accent text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-600 transition-colors disabled:opacity-60"
                >
                  Create Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
