'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { Vision } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import EnhancedVisionBuilder from '@/components/EnhancedVisionBuilder';

export default function EnhancedVisionDashboard() {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const saved = await lifePlannerStorage.getVisions();
      setVisions(saved.length > 0 ? saved : []);
    })();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      await lifePlannerStorage.saveVisions(visions);
    })();
  }, [visions, mounted]);

  const handleAddVision = () => {
    setEditingVision(null);
    setIsModalOpen(true);
  };

  const handleEditVision = (vision: Vision) => {
    setEditingVision(vision);
    setIsModalOpen(true);
  };

  const handleDeleteVision = (id: string) => {
    setVisions(prev => prev.filter(v => v.id !== id));
    if (selectedVision?.id === id) {
      setSelectedVision(null);
    }
  };

  const handleSaveVision = (visionData: Vision) => {
    if (editingVision) {
      setVisions(prev =>
        prev.map(v => v.id === editingVision.id ? visionData : v)
      );
    } else {
      setVisions(prev => [...prev, visionData]);
    }
    setIsModalOpen(false);
  };

  const calculateStats = (vision: Vision) => {
    const milestones = vision.milestones ?? [];
    const goals = vision.goals ?? [];
    const tasks = vision.tasks ?? [];
    const todos = vision.todos ?? [];
    const words = vision.words ?? [];
    const reminders = vision.reminders ?? [];

    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const totalItems = 
      milestones.length + 
      goals.length + 
      tasks.length + 
      todos.length;
    
    const completedItems = 
      completedMilestones +
      goals.filter(g => g.status === 'completed').length +
      tasks.filter(t => t.completed).length +
      todos.filter(td => td.completed).length;
    
    return {
      totalItems,
      completedItems,
      progress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      milestonesCount: milestones.length,
      goalsCount: goals.length,
      tasksCount: tasks.length,
      todosCount: todos.length,
      wordsCount: words.length,
      remindersCount: reminders.length,
    };
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-swar-primary-light text-swar-primary';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-swar-primary-light text-swar-text';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-swar-primary-light text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-swar-primary-light text-swar-primary';
      default: return 'bg-swar-primary-light text-swar-text';
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-swar-text mb-2">🌟 Vision Projects</h1>
          <p className="text-swar-text-secondary">Create and manage your big projects with milestones, goals, tasks, and reminders</p>
        </div>
        <button
          onClick={handleAddVision}
          className="flex items-center space-x-2 bg-gradient-to-r from-swar-primary to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span>New Vision</span>
        </button>
      </div>

      {/* Stats */}
      {visions.length > 0 && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-lg border border-purple-200">
            <div className="text-3xl font-bold text-purple-600 mb-1">{visions.length}</div>
            <div className="text-swar-text-secondary text-sm">Total Visions</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {visions.reduce((sum, v) => sum + (v.milestones?.length ?? 0), 0)}
            </div>
            <div className="text-swar-text-secondary text-sm">Total Milestones</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-lg border border-green-200">
            <div className="text-3xl font-bold text-swar-primary mb-1">
              {visions.reduce((sum, v) => sum + (v.goals?.length ?? 0), 0)}
            </div>
            <div className="text-swar-text-secondary text-sm">Total Goals</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-lg border border-orange-200">
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {Math.round(
                visions.reduce((sum, v) => sum + calculateStats(v).progress, 0) / (visions.length || 1)
              )}%
            </div>
            <div className="text-swar-text-secondary text-sm">Avg Progress</div>
          </div>
        </div>
      )}

      {/* Blog-style Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {visions.map(vision => {
          const stats = calculateStats(vision);
          return (
            <div
              key={vision.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer border border-gray-100"
              onClick={() => setSelectedVision(vision)}
            >
              {/* Image Section */}
              <div className="relative h-48 bg-gradient-to-br from-swar-accent to-swar-primary overflow-hidden">
                {vision.imageUrl ? (
                  <img
                    src={vision.imageUrl}
                    alt={vision.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-6xl">
                    🌟
                  </div>
                )}
                {/* Overlay Badge */}
                <div className="absolute top-0 right-0 m-3 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(vision.status)}`}>
                    {vision.status || 'not-started'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(vision.priority)}`}>
                    {vision.priority?.toUpperCase() || 'MEDIUM'}
                  </span>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6">
                {/* Title & Category */}
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-swar-text mb-2 group-hover:text-purple-600 transition-colors">
                    {vision.title}
                  </h3>
                  {vision.category && (
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                      {vision.category}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-swar-text-secondary text-sm line-clamp-2 mb-4">
                  {vision.description}
                </p>

                {/* Dates */}
                <div className="flex items-center text-swar-text-secondary text-xs mb-4 gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {vision.startDate} to {vision.endDate}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-swar-bg rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{vision.milestones?.length ?? 0}</div>
                    <div className="text-xs text-swar-text-secondary">Milestones</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{vision.goals?.length ?? 0}</div>
                    <div className="text-xs text-swar-text-secondary">Goals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-swar-primary">{vision.todos?.length ?? 0}</div>
                    <div className="text-xs text-swar-text-secondary">Todos</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-swar-text">Progress</span>
                    <span className="text-xs font-bold text-purple-600">{stats.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-swar-accent to-swar-primary h-full transition-all duration-300"
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-swar-border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditVision(vision);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this vision?')) {
                        handleDeleteVision(vision.id);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-swar-primary-light transition-colors text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {visions.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🌟</div>
          <h3 className="text-2xl font-bold text-swar-text mb-2">No Vision Projects Yet</h3>
          <p className="text-swar-text-secondary mb-6 max-w-md mx-auto">
            Create your first vision project to organize all your milestones, goals, tasks, todos, mantras and reminders in one place.
          </p>
          <button
            onClick={handleAddVision}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-swar-primary to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            <Plus className="h-5 w-5" />
            Create First Vision
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <EnhancedVisionBuilder
          vision={editingVision}
          onSave={handleSaveVision}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Vision Detail View */}
      {selectedVision && !isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Detail Header */}
            <div
              className="relative h-64 bg-gradient-to-br from-swar-accent to-swar-primary"
              onClick={() => setSelectedVision(null)}
            >
              {selectedVision.imageUrl && (
                <img
                  src={selectedVision.imageUrl}
                  alt={selectedVision.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <button
                onClick={() => setSelectedVision(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8">
              {/* Title & Badges */}
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-swar-text mb-4">{selectedVision.title}</h1>
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(selectedVision.status)}`}>
                    {selectedVision.status || 'not-started'}
                  </span>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getPriorityColor(selectedVision.priority)}`}>
                    Priority: {selectedVision.priority?.toUpperCase() || 'MEDIUM'}
                  </span>
                  {selectedVision.category && (
                    <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                      {selectedVision.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-8 pb-8 border-b border-swar-border">
                <h2 className="text-xl font-semibold text-swar-text mb-3">Overview</h2>
                <p className="text-swar-text leading-relaxed whitespace-pre-wrap">{selectedVision.description}</p>
              </div>

              {/* Dates */}
              <div className="grid md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-swar-border">
                <div>
                  <div className="text-sm font-semibold text-swar-text-secondary mb-1">📅 Start Date</div>
                  <div className="text-lg text-swar-text font-semibold">{selectedVision.startDate}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-swar-text-secondary mb-1">🎯 End Date</div>
                  <div className="text-lg text-swar-text font-semibold">{selectedVision.endDate}</div>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-8 pb-8 border-b border-swar-border">
                <h2 className="text-xl font-semibold text-swar-text mb-4">Progress</h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-swar-accent to-swar-primary h-full transition-all"
                        style={{ width: `${calculateStats(selectedVision).progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-purple-600">{calculateStats(selectedVision).progress}%</div>
                </div>
              </div>

              {/* Sections */}
              {(selectedVision.milestones?.length ?? 0) > 0 && (
                <div className="mb-8 pb-8 border-b border-swar-border">
                  <h2 className="text-xl font-semibold text-swar-text mb-4">🏁 Milestones ({selectedVision.milestones?.length ?? 0})</h2>
                  <div className="space-y-2">
                    {(selectedVision.milestones ?? []).map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        {m.status === 'completed' ? <CheckCircle2 size={20} className="text-swar-primary" /> : <div className="w-5 h-5 border-2 border-purple-400 rounded-full" />}
                        <span className={m.status === 'completed' ? 'line-through text-swar-text-secondary' : 'text-swar-text'}>{m.title}</span>
                        <span className="ml-auto text-xs text-swar-text-secondary">{m.endDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedVision.goals?.length ?? 0) > 0 && (
                <div className="mb-8 pb-8 border-b border-swar-border">
                  <h2 className="text-xl font-semibold text-swar-text mb-4">🎯 Goals ({selectedVision.goals?.length ?? 0})</h2>
                  <div className="space-y-2">
                    {(selectedVision.goals ?? []).map(g => (
                      <div key={g.id} className="p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium text-swar-text">{g.title}</div>
                        <div className="text-xs text-swar-text-secondary mt-1">{g.targetDate}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedVision.todos?.length ?? 0) > 0 && (
                <div className="mb-8 pb-8 border-b border-swar-border">
                  <h2 className="text-xl font-semibold text-swar-text mb-4">📌 Todos ({selectedVision.todos?.length ?? 0})</h2>
                  <div className="space-y-2">
                    {(selectedVision.todos ?? []).slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                        {t.completed ? <CheckCircle2 size={20} className="text-swar-primary" /> : <div className="w-5 h-5 border-2 border-orange-400 rounded-full" />}
                        <span className={t.completed ? 'line-through text-swar-text-secondary' : 'text-swar-text'}>{t.title}</span>
                      </div>
                    ))}
                    {(selectedVision.todos?.length ?? 0) > 5 && (
                      <div className="text-sm text-swar-text-secondary mt-2">+{(selectedVision.todos?.length ?? 0) - 5} more todos</div>
                    )}
                  </div>
                </div>
              )}

              {(selectedVision.words?.length ?? 0) > 0 && (
                <div className="mb-8 pb-8 border-b border-swar-border">
                  <h2 className="text-xl font-semibold text-swar-text mb-4">✨ Mantras & Affirmations ({selectedVision.words?.length ?? 0})</h2>
                  <div className="space-y-3">
                    {(selectedVision.words ?? []).map(w => (
                      <div key={w.id} className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                        <div className="font-medium text-swar-text">{w.title}</div>
                        <div className="text-swar-text italic mt-2">{w.description || ''}</div>
                        <div className="text-xs text-swar-text-secondary mt-2">📌 {w.category}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedVision.reminders?.length ?? 0) > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-swar-text mb-4">🔔 Reminders ({selectedVision.reminders?.length ?? 0})</h2>
                  <div className="space-y-2">
                    {(selectedVision.reminders ?? []).map(r => (
                      <div key={r.id} className="p-3 bg-red-50 rounded-lg">
                        <div className="font-medium text-swar-text">{r.title}</div>
                        <div className="text-xs text-swar-text-secondary mt-1">{r.dueDate} {r.dueTime ? `• ${r.dueTime}` : ''} • {r.frequency}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-swar-border">
                <button
                  onClick={() => {
                    setSelectedVision(null);
                    handleEditVision(selectedVision);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  <Edit size={20} />
                  Edit Vision
                </button>
                <button
                  onClick={() => {
                    setSelectedVision(null);
                    if (confirm('Are you sure you want to delete this vision?')) {
                      handleDeleteVision(selectedVision.id);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  <Trash2 size={20} />
                  Delete Vision
                </button>
                <button
                  onClick={() => setSelectedVision(null)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-swar-primary-light text-swar-text rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper import for X icon
import { X } from 'lucide-react';
