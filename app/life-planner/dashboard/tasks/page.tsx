'use client';

import { useState, useEffect, useMemo } from 'react';
import TaskModal from './TaskModal';
import { Vision, Goal, Task, VisionCategory, TaskFormState } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import { Plus, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { getDefaultCategoryImage } from '@/lib/visionCategoryImages';

type GoalOption = {
  id: string;
  title: string;
  visionId?: string;
};

export default function TasksPage() {
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [actionPlans, setActionPlans] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filters (UI-only; never persisted)
  const [filterHead, setFilterHead] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [formState, setFormState] = useState<TaskFormState>({
    title: '',
    description: '',
    visionHead: '',
    visionId: '',
    goalId: '',
    startDate: '',
    dueDate: '',
    timeStart: '',
    timeEnd: '',
    place: '',
    imageUrl: '',
    todos: [],
  });

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setMounted(true);
      try {
        const [savedTasks, savedGoals, savedVisions, savedPlans] = await Promise.all([
          lifePlannerStorage.getTasks(),
          lifePlannerStorage.getGoals(),
          lifePlannerStorage.getVisions(),
          lifePlannerStorage.getActionPlans(),
        ]);
        
        setTasks(Array.isArray(savedTasks) ? savedTasks : []);
        setGoals(Array.isArray(savedGoals) ? savedGoals : []);
        setVisions(Array.isArray(savedVisions) ? savedVisions : []);
        setActionPlans(Array.isArray(savedPlans) ? savedPlans : []);
      } catch (error) {
        console.error('Error loading data:', error);
        setTasks([]);
        setGoals([]);
        setVisions([]);
        setActionPlans([]);
      }
    };
    
    loadData();
  }, []);

  // Save tasks to storage
  useEffect(() => {
    if (mounted) {
      lifePlannerStorage.saveTasks(tasks).catch((err: any) => 
        console.error('Error saving tasks:', err)
      );
    }
  }, [tasks, mounted]);

  // Load fresh data when modal opens
  useEffect(() => {
    const loadFreshData = async () => {
      if (isModalOpen) {
        try {
          const [freshGoals, freshVisions, freshPlans] = await Promise.all([
            lifePlannerStorage.getGoals(),
            lifePlannerStorage.getVisions(),
            lifePlannerStorage.getActionPlans(),
          ]);
          
          setGoals(Array.isArray(freshGoals) ? freshGoals : []);
          setVisions(Array.isArray(freshVisions) ? freshVisions : []);
          setActionPlans(Array.isArray(freshPlans) ? freshPlans : []);
        } catch (error) {
          console.error('Error loading fresh data:', error);
        }
      }
    };
    
    loadFreshData();
  }, [isModalOpen]);

  // Build a unified list of goal options:
  // 1) standalone goals (goals collection)
  // 2) goals embedded inside action plans (most common in this app)
  const goalOptions: GoalOption[] = useMemo(() => {
    const out: GoalOption[] = [];

    // From goals collection
    for (const g of goals) {
      if (!g?.id) continue;
      out.push({ id: String(g.id), title: g.title || 'Goal', visionId: g.visionId ? String(g.visionId) : undefined });
    }

    // From action plans (flatten plan.goals)
    for (const plan of actionPlans || []) {
      const planVisionId = plan?.visionId ? String(plan.visionId) : '';
      const planGoals = Array.isArray(plan?.goals) ? plan.goals : [];
      for (const pg of planGoals) {
        const rawId = pg?.id ? String(pg.id) : '';
        const title = (pg?.title || '').trim() || 'Goal';
        if (!rawId || !plan?.id || !planVisionId) continue;
        // Namespaced id to avoid collisions with standalone goals
        out.push({
          id: `ap:${String(plan.id)}:${rawId}`,
          title,
          visionId: planVisionId,
        });
      }
    }

    // Dedupe by id
    const seen = new Set<string>();
    return out.filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });
  }, [goals, actionPlans]);

  // Helper: Get vision options filtered by category/head
  const visionOptionsForHead = (head: string): Vision[] => {
    if (!head) return [];
    return visions
      .filter(v => v.category === head)
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  // Helper: Get goal options filtered by vision
  const goalOptionsForVision = (visionId: string): GoalOption[] => {
    if (!visionId) return [];

    const normalizedVisionId = String(visionId).trim();
    return goalOptions
      .filter(g => (g.visionId ? String(g.visionId).trim() : '') === normalizedVisionId)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  };

  const getGoalTitle = (goalId?: string): string => {
    if (!goalId) return '';
    return goalOptions.find(g => g.id === goalId)?.title || '';
  };

  const uniqueHeads = Array.from(new Set(visions.map(v => v.category).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );

  const uniqueStatuses = Array.from(new Set(tasks.map(t => t.status).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

  // Handlers
  const handleAddTask = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingTask(null);
    setFormState({
      title: '',
      description: '',
      visionHead: '',
      visionId: '',
      goalId: '',
      startDate: today,
      dueDate: today,
      timeStart: '11:00',
      timeEnd: '11:00',
      place: '',
      imageUrl: '',
      todos: [],
    });
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormState({
      title: task.title || '',
      description: task.description || '',
      visionHead: (task.visionHead as string) || '',
      visionId: task.visionId || '',
      goalId: task.goalId || '',
      startDate: task.startDate || '',
      dueDate: task.dueDate || '',
      timeStart: task.timeStart || '',
      timeEnd: task.timeEnd || '',
      place: task.place || '',
      imageUrl: task.imageUrl || '',
      todos: task.todos || [],
    });
    setIsModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(t => t.id !== taskId));
    }
  };

  const handleSaveTask = (formData: TaskFormState) => {
    if (!formData.visionHead || !formData.visionId || !formData.goalId || !formData.title || !formData.startDate || !formData.dueDate) {
      alert('Please fill in all required fields: Head, Vision, Goal, Title, Start Date, and Due Date');
      return;
    }

    if (editingTask) {
      setTasks(tasks.map(t =>
        t.id === editingTask.id
          ? {
              ...t,
              title: formData.title,
              description: formData.description,
              visionHead: formData.visionHead as VisionCategory,
              visionId: formData.visionId,
              goalId: formData.goalId,
              startDate: formData.startDate,
              dueDate: formData.dueDate,
              timeStart: formData.timeStart,
              timeEnd: formData.timeEnd,
              place: formData.place,
              imageUrl: formData.imageUrl,
              todos: formData.todos,
              updatedAt: new Date().toISOString(),
            }
          : t
      ));
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        visionHead: formData.visionHead as VisionCategory,
        visionId: formData.visionId,
        goalId: formData.goalId,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        timeStart: formData.timeStart,
        timeEnd: formData.timeEnd,
        place: formData.place,
        imageUrl: formData.imageUrl,
        priority: 'medium',
        status: 'not-started',
        completed: false,
        todos: formData.todos,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks([...tasks, newTask]);
    }

    setIsModalOpen(false);
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            completed: !t.completed,
            status: !t.completed ? 'completed' : 'not-started',
            updatedAt: new Date().toISOString(),
          }
        : t
    ));
  };

  // Filtering
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTasks = tasks.filter(task => {
    const head = (task.visionHead ? String(task.visionHead) : '').trim();
    const status = (task.status || 'not-started').trim();
    const matchesHead = filterHead === 'all' || head === filterHead;
    const matchesStatus = filterStatus === 'all' || status === filterStatus;

    const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth as any);
    const dateStr = task.dueDate || task.startDate;
    const date = dateStr ? new Date(dateStr) : null;
    const matchesMonth = monthIdx === null || (date && !Number.isNaN(date.getTime()) && date.getMonth() === monthIdx);

    const visionTitle = (visions.find(v => v.id === task.visionId)?.title || '').trim();
    const goalTitle = (getGoalTitle(task.goalId) || '').trim();
    const haystack = `${task.title || ''} ${task.description || ''} ${task.place || ''} ${visionTitle} ${goalTitle}`.toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

    return matchesHead && matchesStatus && matchesMonth && matchesSearch;
  });

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Tasks</h1>
        <button
          onClick={handleAddTask}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={20} />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="mb-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Search</label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title / description / place / vision / goal"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Vision Head</label>
            <select
              value={filterHead}
              onChange={(e) => setFilterHead(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">All</option>
              {uniqueHeads.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">All</option>
              <option value="not-started">not-started</option>
              <option value="in-progress">in-progress</option>
              <option value="completed">completed</option>
              <option value="on-hold">on-hold</option>
              {uniqueStatuses
                .filter(s => !['not-started', 'in-progress', 'completed', 'on-hold'].includes(s))
                .map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
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
                setSearchTerm('');
                setFilterHead('all');
                setFilterStatus('all');
                setFilterMonth('all');
              }}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">Showing {filteredTasks.length} of {tasks.length} tasks</p>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No tasks found. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => {
            const vision = visions.find(v => v.id === task.visionId);
            const goalTitle = getGoalTitle(task.goalId);
            const cardImage =
              (task.imageUrl || '').trim() ||
              (vision?.imageUrl || '').trim() ||
              String((vision as any)?.categoryImageUrl || '').trim() ||
              (task.visionHead ? getDefaultCategoryImage(String(task.visionHead)) : getDefaultCategoryImage('Life'));

            return (
              <div
                key={task.id}
                className={`bg-white rounded-lg border-2 p-4 hover:shadow-lg transition ${
                  task.completed ? 'border-gray-300 opacity-60' : 'border-orange-200'
                }`}
              >
                <div className="rounded-lg overflow-hidden h-40 border border-gray-200 bg-gray-50 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cardImage}
                    alt={task.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://via.placeholder.com/800x400?text=Image+Not+Found';
                    }}
                  />
                </div>

                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="text-orange-500 hover:text-orange-600 flex-shrink-0 ml-2"
                  >
                    {task.completed ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <Circle size={24} />
                    )}
                  </button>
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  {task.visionHead && (
                    <p><span className="font-medium">Head:</span> {task.visionHead}</p>
                  )}
                  {vision && (
                    <p><span className="font-medium">Vision:</span> {vision.title}</p>
                  )}
                  {goalTitle && (
                    <p><span className="font-medium">Goal:</span> {goalTitle}</p>
                  )}
                  {task.startDate && (
                    <p><span className="font-medium">Start:</span> {new Date(task.startDate).toLocaleDateString()}</p>
                  )}
                  {task.dueDate && (
                    <p><span className="font-medium">Due:</span> {new Date(task.dueDate).toLocaleDateString()}</p>
                  )}
                  {task.place && (
                    <p><span className="font-medium">Place:</span> {task.place}</p>
                  )}
                </div>

                {task.todos && task.todos.length > 0 && (
                  <div className="mb-3 text-sm">
                    <p className="font-medium text-gray-700">
                      Todos: {task.todos.filter(t => Boolean(t.completed)).length}/{task.todos.length}
                    </p>
                    <p className="text-xs text-gray-500">(Todo names hidden in list view)</p>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-3 border-t">
                  <button
                    onClick={() => handleEditTask(task)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded transition"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        editingTask={editingTask}
        formState={formState}
        setFormState={setFormState}
        visions={visions}
        goals={goalOptions}
        visionOptionsForHead={visionOptionsForHead}
        goalOptionsForVision={goalOptionsForVision}
      />
    </div>
  );
}
