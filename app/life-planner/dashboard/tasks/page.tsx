'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Task, Goal, Vision } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import TaskModal from './TaskModal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

// Category Color Mapping
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Life': { bg: 'bg-purple-600', text: 'text-white' },
  'Health': { bg: 'bg-green-600', text: 'text-white' },
  'Wealth': { bg: 'bg-red-600', text: 'text-white' },
  'Success': { bg: 'bg-blue-600', text: 'text-white' },
  'Respect': { bg: 'bg-orange-600', text: 'text-white' },
  'Pleasure': { bg: 'bg-pink-600', text: 'text-white' },
  'Prosperity': { bg: 'bg-indigo-600', text: 'text-white' },
  'Luxurious': { bg: 'bg-yellow-600', text: 'text-white' },
  'Good Habits': { bg: 'bg-teal-600', text: 'text-white' },
  'Sadhana': { bg: 'bg-cyan-600', text: 'text-white' },
};

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didAutoOpen = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filters
  const [filterVisionHead, setFilterVisionHead] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Load data on mount
  useEffect(() => {
    setMounted(true);
    (async () => {
      const [savedTasks, savedGoals, savedVisions] = await Promise.all([
        lifePlannerStorage.getTasks(),
        lifePlannerStorage.getGoals(),
        lifePlannerStorage.getVisions(),
      ]);
      setTasks(Array.isArray(savedTasks) ? savedTasks : []);
      setGoals(Array.isArray(savedGoals) ? savedGoals : []);
      setVisions(Array.isArray(savedVisions) ? savedVisions : []);
      setHasLoaded(true);
    })();
  }, []);

  // Save tasks
  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    lifePlannerStorage.saveTasks(tasks).catch((err: any) =>
      console.error('Error saving tasks:', err)
    );
  }, [tasks, mounted, hasLoaded]);

  const handleAddTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!mounted) return;
    if (didAutoOpen.current) return;
    if (searchParams.get('create') !== '1') return;

    didAutoOpen.current = true;
    handleAddTask();
    router.replace('/life-planner/dashboard/tasks');
  }, [mounted, searchParams, router]);

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTask) {
      setTasks(prev =>
        prev.map(t =>
          t.id === editingTask.id
            ? { ...t, ...taskData, updatedAt: new Date().toISOString() }
            : t
        )
      );
    } else {
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks(prev => [...prev, newTask]);
    }
    setIsModalOpen(false);
  };

  // Get unique vision heads
  const uniqueVisionHeads = Array.from(
    new Set(tasks.map(t => t.visionHead).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  // Get unique statuses
  const uniqueStatuses = Array.from(
    new Set(tasks.map(t => t.status).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  // Filter tasks
  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredTasks = tasks
    .filter(t => {
      const matchesVisionHead = filterVisionHead === 'all' || t.visionHead === filterVisionHead;
      const matchesStatus = filterStatus === 'all' || (t.status || 'not-started') === filterStatus;

      const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth as any);
      const dateStr = t.dueDate || t.startDate;
      const date = dateStr ? new Date(dateStr) : null;
      const matchesMonth = monthIdx === null || (date && !Number.isNaN(date.getTime()) && date.getMonth() === monthIdx);

      const haystack = `${t.title || ''} ${t.description || ''} ${t.place || ''}`.toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

      return matchesVisionHead && matchesStatus && matchesMonth && matchesSearch;
    })
    .sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_VALUE;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_VALUE;
      return dateA - dateB;
    });

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Tasks</h1>
          <p className="text-gray-600">Manage your daily tasks and action items</p>
        </div>
        <button
          onClick={handleAddTask}
          className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Search</label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search title / description / place"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Vision Head</label>
            <select
              value={filterVisionHead}
              onChange={(e) => setFilterVisionHead(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">All</option>
              {uniqueVisionHeads.map((vh) => (
                <option key={vh} value={vh}>{vh}</option>
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
              onClick={() => {
                setSearchText('');
                setFilterVisionHead('all');
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

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters or create a new task.</p>
          <button
            onClick={handleAddTask}
            className="inline-flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max justify-items-center">
          {filteredTasks.map((task) => (
            <div key={task.id} className="w-80 min-w-[300px] max-w-[300px] bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
              {/* Card Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={task.imageUrl || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80'}
                  alt={task.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {task.visionHead && (
                    <div className={`${CATEGORY_COLORS[task.visionHead]?.bg || 'bg-gray-600'} ${CATEGORY_COLORS[task.visionHead]?.text || 'text-white'} px-3 py-1 rounded-full text-xs font-bold`}>
                      {task.visionHead}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{task.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{task.description}</p>

                <div className="space-y-2 text-xs text-gray-700 mb-auto">
                  {task.place && <div className="flex items-center gap-2">📍 {task.place}</div>}
                  {task.dueDate && (
                    <div className="flex items-center gap-2">
                      📅 {new Date(task.dueDate).toLocaleDateString()}
                      {task.timeStart && ` @ ${task.timeStart}`}
                    </div>
                  )}
                  {task.status && (
                    <div className="flex items-center gap-2">
                      ✓ {task.status}
                    </div>
                  )}
                </div>

                {/* Card Buttons */}
                <div className="mt-4 flex gap-2">
                  <button
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs font-bold rounded-lg hover:from-orange-600 hover:to-yellow-600 transition"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => handleEditTask(task)}
                    className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="flex-1 px-3 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <TaskModal
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => setIsModalOpen(false)}
          goals={goals}
          visions={visions}
        />
      )}
    </div>
  );
}
