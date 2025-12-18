'use client';

import React, { useState, useCallback } from 'react';
import { Plus, X, Edit2, Trash2, Target, CheckSquare, Bell, Calendar, DollarSign } from 'lucide-react';
import VisionForm, { Vision } from '@/components/VisionForm';
import GoalForm, { Goal } from '@/components/GoalForm';

interface RelatedWork {
  goals: Goal[];
  tasks: Array<{ id: string; title: string; completed: boolean }>;
  todos: Array<{ id: string; title: string; completed: boolean }>;
  reminders: Array<{ id: string; title: string }>;
}

export default function VisionPage() {
  const [visions, setVisions] = useState<Vision[]>([
    {
      id: '1',
      title: 'Master Yoga & Meditation',
      description: 'Achieve deep spiritual practice through daily yoga, meditation, and pranayama. Build a sustainable daily routine that transforms physical and mental well-being.',
      targetDate: '2026-12-31',
      amount: '50000',
      category: 'health',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
      createdAt: new Date().toISOString(),
      completed: false
    },
    {
      id: '2',
      title: 'Build Sustainable Wealth',
      description: 'Create multiple income streams through investments, business ventures, and financial planning. Achieve financial freedom and security.',
      targetDate: '2028-12-31',
      amount: '1000000',
      category: 'wealth',
      imageUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=400&h=300&fit=crop',
      createdAt: new Date().toISOString(),
      completed: false
    }
  ]);

  const [goals, setGoals] = useState<Goal[]>([
    {
      id: 'g1',
      title: 'Complete 100-Hour Yoga Training',
      description: 'Advance certification course covering advanced asanas and teaching methodology',
      visionId: '1',
      visionTitle: 'Master Yoga & Meditation',
      startDate: '2025-12-15',
      endDate: '2026-06-30',
      amount: '30000',
      category: 'health',
      imageUrl: '',
      createdAt: new Date().toISOString(),
      completed: false,
      priority: 'high'
    }
  ]);

  const [showVisionForm, setShowVisionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Get all work related to a vision
  const getRelatedWork = useCallback((visionId: string): RelatedWork => {
    const relatedGoals = goals.filter(g => g.visionId === visionId);
    
    return {
      goals: relatedGoals,
      tasks: [
        { id: 't1', title: 'Learn Sun Salutation variations', completed: true },
        { id: 't2', title: 'Study Pranayama techniques', completed: false },
        { id: 't3', title: 'Complete meditation practice log', completed: false }
      ],
      todos: [
        { id: 'td1', title: 'Daily 1-hour yoga practice', completed: true },
        { id: 'td2', title: 'Review breath work exercises', completed: false },
        { id: 'td3', title: 'Complete online module 3', completed: true }
      ],
      reminders: [
        { id: 'r1', title: 'Morning meditation session' },
        { id: 'r2', title: 'Evening yoga practice' },
        { id: 'r3', title: 'Weekly reflection' }
      ]
    };
  }, [goals]);

  // Calculate vision statistics
  const getVisionStats = useCallback((visionId: string) => {
    const work = getRelatedWork(visionId);
    const totalWork = work.goals.length + work.tasks.length + work.todos.length;
    const completedWork = work.goals.filter(g => g.completed).length + 
                         work.tasks.filter(t => t.completed).length +
                         work.todos.filter(t => t.completed).length;
    
    return {
      totalGoals: work.goals.length,
      totalTasks: work.tasks.length,
      totalTodos: work.todos.length,
      totalReminders: work.reminders.length,
      completedWork,
      totalWork,
      percentage: totalWork > 0 ? Math.round((completedWork / totalWork) * 100) : 0
    };
  }, [getRelatedWork]);

  const handleVisionSubmit = useCallback((visionData: Vision) => {
    if (editingVision) {
      setVisions(prev => prev.map(v => v.id === visionData.id ? visionData : v));
      setEditingVision(null);
    } else {
      setVisions(prev => [...prev, visionData]);
    }
    setShowVisionForm(false);
  }, [editingVision]);

  const handleGoalSubmit = useCallback((goalData: Goal) => {
    if (editingGoal) {
      setGoals(prev => prev.map(g => g.id === goalData.id ? goalData : g));
      setEditingGoal(null);
    } else {
      setGoals(prev => [...prev, goalData]);
    }
    setShowGoalForm(false);
  }, [editingGoal]);

  const handleDeleteVision = useCallback((id: string) => {
    setVisions(prev => prev.filter(v => v.id !== id));
    if (selectedVision?.id === id) {
      setSelectedVision(null);
    }
  }, [selectedVision]);



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-swar-text">🎯 Visions</h1>
          <p className="text-swar-text-secondary mt-2">Define your long-term aspirations and track progress</p>
        </div>
        <button
          onClick={() => {
            setEditingVision(null);
            setShowVisionForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
        >
          <Plus size={20} />
          Add Vision
        </button>
      </div>

      {/* Vision Form Modal */}
      {showVisionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-swar-border sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-swar-text">
                {editingVision ? 'Edit Vision' : 'Create New Vision'}
              </h2>
              <button
                onClick={() => setShowVisionForm(false)}
                className="p-2 hover:bg-swar-primary-light rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <VisionForm
                onSubmit={handleVisionSubmit}
                onCancel={() => setShowVisionForm(false)}
                initialData={editingVision || undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Goal Form Modal */}
      {showGoalForm && selectedVision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-swar-border sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-swar-text">
                Add Goal to "{selectedVision.title}"
              </h2>
              <button
                onClick={() => setShowGoalForm(false)}
                className="p-2 hover:bg-swar-primary-light rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <GoalForm
                onSubmit={handleGoalSubmit}
                onCancel={() => setShowGoalForm(false)}
                initialData={editingGoal || undefined}
                visions={[selectedVision]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vision Cards Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visions.map(vision => {
              const stats = getVisionStats(vision.id);
              const categoryEmojis: Record<string, string> = {
                life: '🎯',
                health: '💪',
                wealth: '💰',
                success: '🏆',
                respect: '🙏',
                pleasure: '😊',
                prosperity: '✨',
                luxury: '👑'
              };

              return (
                <button
                  key={vision.id}
                  onClick={() => setSelectedVision(vision)}
                  className={`rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${
                    selectedVision?.id === vision.id
                      ? 'border-purple-500 ring-2 ring-purple-300 shadow-xl'
                      : 'border-swar-border hover:border-purple-300 hover:shadow-lg'
                  }`}
                >
                  {/* Image Section */}
                  <div className="relative h-40 bg-swar-primary-light overflow-hidden">
                    {vision.imageUrl ? (
                      <img
                        src={vision.imageUrl}
                        alt={vision.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x200?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">
                        {categoryEmojis[vision.category]}
                      </div>
                    )}
                    {/* Badge */}
                    <div className="absolute top-3 right-3 bg-white rounded-full px-3 py-1 text-sm font-semibold">
                      {stats.percentage}%
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-swar-text text-left line-clamp-2">
                        {vision.title}
                      </h3>
                      <p className="text-xs text-swar-text-secondary mt-1">{categoryEmojis[vision.category]} {vision.category}</p>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-xs bg-swar-bg rounded-lg p-2">
                      <span className="text-blue-600 font-semibold">{stats.totalGoals} Goals</span>
                      <span className="text-cyan-600 font-semibold">{stats.totalTasks} Tasks</span>
                      <span className="text-swar-primary font-semibold">{stats.totalTodos} Todos</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-swar-text-secondary text-center">
                        {stats.completedWork} of {stats.totalWork} items done
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVision(vision);
                          setShowVisionForm(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-xs font-medium"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVision(vision.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-xs font-medium"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vision Preview Panel */}
        <div className="lg:col-span-1">
          {selectedVision ? (
            <div className="sticky top-6 rounded-2xl border-2 border-purple-200 bg-purple-50 p-6 space-y-6">
              {/* Vision Header */}
              <div>
                <h2 className="text-2xl font-bold text-swar-text">{selectedVision.title}</h2>
                <p className="text-sm text-swar-text-secondary mt-2">{selectedVision.description}</p>
              </div>

              {/* Vision Details */}
              <div className="space-y-2 text-sm">
                {selectedVision.targetDate && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600" />
                    <span className="text-swar-text">Target: {new Date(selectedVision.targetDate).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedVision.amount && (
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-swar-primary" />
                    <span className="text-swar-text">₹ {parseInt(selectedVision.amount).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-purple-200" />

              {/* Related Work */}
              <div className="space-y-4">
                <h3 className="font-bold text-swar-text flex items-center gap-2">
                  📋 All Work on This Vision
                </h3>

                {/* Goals */}
                <div>
                  <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                    <Target size={14} /> Goals ({getRelatedWork(selectedVision.id).goals.length})
                  </h4>
                  <div className="space-y-2">
                    {getRelatedWork(selectedVision.id).goals.length === 0 ? (
                      <p className="text-xs text-swar-text-secondary">No goals yet</p>
                    ) : (
                      getRelatedWork(selectedVision.id).goals.map(goal => (
                        <div key={goal.id} className="bg-white rounded-lg p-2 text-xs">
                          <p className="font-medium text-swar-text">{goal.title}</p>
                          <p className="text-swar-text-secondary">{goal.startDate} → {goal.endDate}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                              goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-swar-primary-light text-swar-primary'
                            }`}>
                              {goal.priority}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {getRelatedWork(selectedVision.id).goals.length > 0 && (
                    <button
                      onClick={() => {
                        setShowGoalForm(true);
                      }}
                      className="w-full mt-2 py-2 bg-white hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                    >
                      <Plus size={14} /> Add Goal
                    </button>
                  )}
                </div>

                {/* Tasks */}
                <div>
                  <h4 className="text-xs font-semibold text-cyan-700 mb-2 flex items-center gap-1">
                    ✓ Tasks ({getRelatedWork(selectedVision.id).tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {getRelatedWork(selectedVision.id).tasks.map(task => (
                      <div
                        key={task.id}
                        className={`bg-white rounded-lg p-2 text-xs flex items-start gap-2 ${
                          task.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          readOnly
                          className="mt-0.5 w-4 h-4 rounded text-cyan-600 cursor-pointer"
                        />
                        <p className={`font-medium flex-1 ${task.completed ? 'line-through text-swar-text-secondary' : 'text-swar-text'}`}>
                          {task.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Todos */}
                <div>
                  <h4 className="text-xs font-semibold text-swar-primary mb-2 flex items-center gap-1">
                    <CheckSquare size={14} /> Todos ({getRelatedWork(selectedVision.id).todos.length})
                  </h4>
                  <div className="space-y-2">
                    {getRelatedWork(selectedVision.id).todos.map(todo => (
                      <div
                        key={todo.id}
                        className={`bg-white rounded-lg p-2 text-xs flex items-start gap-2 ${
                          todo.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          readOnly
                          className="mt-0.5 w-4 h-4 rounded text-swar-primary cursor-pointer"
                        />
                        <p className={`font-medium flex-1 ${todo.completed ? 'line-through text-swar-text-secondary' : 'text-swar-text'}`}>
                          {todo.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reminders */}
                <div>
                  <h4 className="text-xs font-semibold text-orange-700 mb-2 flex items-center gap-1">
                    <Bell size={14} /> Reminders ({getRelatedWork(selectedVision.id).reminders.length})
                  </h4>
                  <div className="space-y-2">
                    {getRelatedWork(selectedVision.id).reminders.map(reminder => (
                      <div key={reminder.id} className="bg-white rounded-lg p-2 text-xs">
                        <p className="font-medium text-swar-text">🔔 {reminder.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-swar-border p-8 text-center sticky top-6">
              <Target size={48} className="mx-auto text-swar-text-secondary mb-3" />
              <p className="text-swar-text-secondary font-medium">Select a vision to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
