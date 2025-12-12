'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle2, Circle, Calendar } from 'lucide-react';
import { Task } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerStorage';
import TaskModal from './TaskModal';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = lifePlannerStorage.getTasks();
    setTasks(saved.length > 0 ? saved : []);
  }, []);

  useEffect(() => {
    if (mounted) {
      lifePlannerStorage.saveTasks(tasks);
    }
  }, [tasks, mounted]);

  const handleAddTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t
      )
    );
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

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesStatus && matchesPriority;
  });

  const completedCount = tasks.filter(t => t.completed).length;

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Tasks</h1>
          <p className="text-gray-600">Track actionable items with priority and deadlines</p>
        </div>
        <button
          onClick={handleAddTask}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{tasks.length}</div>
          <div className="text-gray-600 text-sm">Total Tasks</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-blue-600 mb-1">{completedCount}</div>
          <div className="text-gray-600 text-sm">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-orange-600 mb-1">{tasks.filter(t => t.status === 'overdue').length}</div>
          <div className="text-gray-600 text-sm">Overdue</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%
          </div>
          <div className="text-gray-600 text-sm">Completion</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-lg mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-4">Create your first task to get started.</p>
            <button
              onClick={handleAddTask}
              className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </button>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleTask(task.id)}
                  className="mt-1 text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                >
                  {task.completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                </button>

                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {task.title}
                  </h3>
                  {task.description && <p className="text-gray-600 text-sm mt-1">{task.description}</p>}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority} priority
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      task.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                    {task.repeat && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">{task.repeat}</span>}
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditTask(task)}
                    className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
