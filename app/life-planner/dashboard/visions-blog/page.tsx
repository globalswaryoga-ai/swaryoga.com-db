'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Vision } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import VisionBuilder from './VisionBuilder';

export default function VisionsBlogPage() {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [mounted, setMounted] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'not-started' | 'in-progress' | 'completed'>('all');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingVision, setEditingVision] = useState<Vision | null>(null);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const saved = await lifePlannerStorage.getVisions();
      setVisions(saved);
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
    setShowBuilder(true);
  };

  const handleEditVision = (vision: Vision) => {
    setEditingVision(vision);
    setShowBuilder(true);
  };

  const handleSaveVision = (vision: Vision) => {
    if (editingVision) {
      // Update existing vision
      setVisions(prev => prev.map(v => v.id === vision.id ? vision : v));
    } else {
      // Add new vision
      setVisions(prev => [...prev, vision]);
    }
    setShowBuilder(false);
    setEditingVision(null);
  };

  const handleDeleteVision = (id: string) => {
    if (window.confirm('Are you sure you want to delete this vision and all its details?')) {
      setVisions(prev => prev.filter(v => v.id !== id));
    }
  };

  const handleViewDetails = (vision: Vision) => {
    setEditingVision(vision);
    setShowBuilder(true);
  };

  const filteredVisions = filterStatus === 'all' 
    ? visions 
    : visions.filter(v => v.status === filterStatus);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-swar-primary-light text-swar-primary';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-swar-primary-light text-swar-text';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-orange-600 bg-orange-50';
      case 'low':
        return 'text-swar-primary bg-swar-primary-light';
      default:
        return 'text-swar-text-secondary bg-swar-bg';
    }
  };

  const calculateProgress = (vision: Vision) => {
    const totalItems = 
      (vision.milestones?.length || 0) +
      (vision.goals?.length || 0) +
      (vision.tasks?.length || 0) +
      (vision.todos?.length || 0);
    
    if (totalItems === 0) return 0;

    const completedItems = 
      (vision.milestones?.filter(m => m.status === 'completed').length || 0) +
      (vision.goals?.filter(g => g.status === 'completed').length || 0) +
      (vision.tasks?.filter(t => t.completed).length || 0) +
      (vision.todos?.filter(t => t.completed).length || 0);

    return Math.round((completedItems / totalItems) * 100);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-swar-primary via-pink-600 to-red-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl sm:text-6xl font-black mb-4 leading-tight">
                🎯 My Big Visions
              </h1>
              <p className="text-xl text-white/90 max-w-2xl">
                One Vision = One Complete Project with Milestones, Goals, Tasks, Todos, Words & Reminders
              </p>
            </div>
            <button
              onClick={handleAddVision}
              className="flex items-center gap-3 bg-white text-purple-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl hover:scale-105 transition-all"
            >
              <Plus className="h-6 w-6" />
              New Vision
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-3">
          {(['all', 'not-started', 'in-progress', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-6 py-3 rounded-full font-bold transition-all ${
                filterStatus === status
                  ? 'bg-gradient-to-r from-swar-primary to-pink-600 text-white shadow-lg scale-105'
                  : 'bg-white text-swar-text border-2 border-swar-border hover:border-swar-primary'
              }`}
            >
              {status === 'all' ? '📊 All Visions' : 
               status === 'not-started' ? '⏳ Not Started' :
               status === 'in-progress' ? '⚡ In Progress' :
               '✅ Completed'}
              {filteredVisions.length > 0 && (
                <span className="ml-2 font-black">({filteredVisions.filter(v => status === 'all' || v.status === status).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Visions Grid - Blog Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {filteredVisions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">🌟</div>
            <h2 className="text-4xl font-black text-swar-text mb-4">No Visions Yet</h2>
            <p className="text-xl text-swar-text-secondary mb-8">
              Start your journey by creating your first big vision project!
            </p>
            <button
              onClick={handleAddVision}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-swar-primary to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
            >
              <Plus className="h-6 w-6" />
              Create Vision
            </button>
          </div>
        ) : (
          <div className="grid gap-8">
            {filteredVisions.map((vision) => {
              const progress = calculateProgress(vision);
              return (
                <div
                  key={vision.id}
                  className="group bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-purple-300"
                >
                  {/* Image Section - BIG AND BOLD */}
                  <div className="relative h-80 sm:h-96 md:h-[450px] overflow-hidden bg-gradient-to-br from-purple-200 via-pink-200 to-red-200">
                    {vision.imageUrl ? (
                      <img
                        src={vision.imageUrl}
                        alt={vision.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-8xl font-black opacity-20">
                        🎯
                      </div>
                    )}
                    {/* Status Badge - TOP RIGHT */}
                    <div className="absolute top-6 right-6">
                      <span className={`px-6 py-2 rounded-full font-bold text-base ${getStatusColor(vision.status)}`}>
                        {vision.status === 'completed' ? '✅ Completed' :
                         vision.status === 'in-progress' ? '⚡ In Progress' :
                         vision.status === 'on-hold' ? '⏸️ On Hold' :
                         '⏳ Not Started'}
                      </span>
                    </div>
                    {/* Priority Badge - TOP LEFT */}
                    {vision.priority && (
                      <div className="absolute top-6 left-6">
                        <span className={`px-6 py-2 rounded-full font-bold text-base ${getPriorityColor(vision.priority)}`}>
                          {vision.priority === 'high' ? '🔥 High' :
                           vision.priority === 'medium' ? '⭐ Medium' :
                           '💚 Low'} Priority
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-8 sm:p-10 md:p-12">
                    {/* Title - BIG AND BOLD */}
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-swar-text mb-4 leading-tight">
                      {vision.title}
                    </h2>

                    {/* Description */}
                    <p className="text-lg sm:text-xl text-swar-text-secondary mb-8 line-clamp-3">
                      {vision.description}
                    </p>

                    {/* Meta Info - Bold */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <div className="text-sm font-bold text-blue-600 mb-1">📅 Start</div>
                        <div className="text-lg font-black text-blue-900">
                          {vision.startDate
                            ? new Date(vision.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </div>
                      </div>
                      <div className="bg-swar-primary-light rounded-xl p-4">
                        <div className="text-sm font-bold text-pink-600 mb-1">🎯 End</div>
                        <div className="text-lg font-black text-pink-900">
                          {vision.endDate
                            ? new Date(vision.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </div>
                      </div>
                      <div className="bg-swar-primary-light rounded-xl p-4">
                        <div className="text-sm font-bold text-swar-primary mb-1">📊 Progress</div>
                        <div className="text-lg font-black text-swar-text">{progress}%</div>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4">
                        <div className="text-sm font-bold text-purple-600 mb-1">🏆 Category</div>
                        <div className="text-lg font-black text-purple-900">{vision.category || '—'}</div>
                      </div>
                    </div>

                    {/* Progress Bar - BOLD */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-swar-text text-lg">Overall Progress</span>
                        <span className="font-black text-2xl text-purple-600">{progress}%</span>
                      </div>
                      <div className="h-4 bg-swar-primary-light rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-swar-primary via-pink-600 to-red-600 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Items Summary - BIG NUMBERS */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8 bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl">
                      <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-black text-purple-600">
                          {vision.milestones?.length || 0}
                        </div>
                        <div className="font-bold text-swar-text mt-1">Milestones</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-black text-pink-600">
                          {vision.goals?.length || 0}
                        </div>
                        <div className="font-bold text-swar-text mt-1">Goals</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-black text-blue-600">
                          {vision.tasks?.length || 0}
                        </div>
                        <div className="font-bold text-swar-text mt-1">Tasks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-black text-orange-600">
                          {vision.todos?.length || 0}
                        </div>
                        <div className="font-bold text-swar-text mt-1">Todos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-black text-yellow-600">
                          {(vision.words?.length || 0) + (vision.reminders?.length || 0)}
                        </div>
                        <div className="font-bold text-swar-text mt-1">Words/Reminders</div>
                      </div>
                    </div>

                    {/* Action Buttons - BIG AND BOLD */}
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => handleViewDetails(vision)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-swar-primary to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
                      >
                        <Eye className="h-5 w-5" />
                        View Full Details
                      </button>
                      <button
                        onClick={() => handleEditVision(vision)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-blue-100 text-blue-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-200 hover:shadow-lg hover:scale-105 transition-all"
                      >
                        <Edit className="h-5 w-5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVision(vision.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-swar-primary-light text-swar-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-200 hover:shadow-lg hover:scale-105 transition-all"
                      >
                        <Trash2 className="h-5 w-5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Vision Builder Modal */}
      {showBuilder && (
        <VisionBuilder
          initialVision={editingVision}
          onSave={handleSaveVision}
          onCancel={() => {
            setShowBuilder(false);
            setEditingVision(null);
          }}
        />
      )}
    </div>
  );
}
