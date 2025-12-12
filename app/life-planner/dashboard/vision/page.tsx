'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Vision } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerStorage';
import VisionModal from './VisionModal';

export default function VisionPage() {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = lifePlannerStorage.getVisions();
    setVisions(saved.length > 0 ? saved : []);
  }, []);

  useEffect(() => {
    if (mounted) {
      lifePlannerStorage.saveVisions(visions);
    }
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
  };

  const handleSaveVision = (visionData: Omit<Vision, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingVision) {
      setVisions(prev =>
        prev.map(v =>
          v.id === editingVision.id
            ? { ...v, ...visionData, updatedAt: new Date().toISOString() }
            : v
        )
      );
    } else {
      const newVision: Vision = {
        ...visionData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVisions(prev => [...prev, newVision]);
    }
    setIsModalOpen(false);
  };

  const completedMilestones = visions.reduce((sum, v) => sum + v.milestones.filter(m => m.completed).length, 0);
  const totalMilestones = visions.reduce((sum, v) => sum + v.milestones.length, 0);

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Visions</h1>
          <p className="text-gray-600">Your long-term projects with milestones and timelines</p>
        </div>
        <button
          onClick={handleAddVision}
          className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span>Add Vision</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-pink-50 rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-red-600 mb-1">{visions.length}</div>
          <div className="text-gray-600 text-sm">Total Visions</div>
        </div>
        <div className="bg-pink-50 rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-red-600 mb-1">{totalMilestones}</div>
          <div className="text-gray-600 text-sm">Total Milestones</div>
        </div>
        <div className="bg-pink-50 rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-red-600 mb-1">
            {totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0}%
          </div>
          <div className="text-gray-600 text-sm">Completion</div>
        </div>
      </div>

      {/* Visions Grid */}
      <div className="grid gap-6">
        {visions.map(vision => (
          <div key={vision.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{vision.title}</h3>
                  <p className="text-gray-600 mb-4">{vision.description}</p>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div>📅 Start: {new Date(vision.startDate).toLocaleDateString()}</div>
                    <div>🎯 End: {new Date(vision.endDate).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditVision(vision)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteVision(vision.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Vision Image */}
              {vision.imageUrl && (
                <div className="mb-6 rounded-lg overflow-hidden h-48">
                  <img src={vision.imageUrl} alt={vision.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Milestones */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Milestones ({vision.milestones.filter(m => m.completed).length}/{vision.milestones.length})
                </h4>
                <div className="space-y-3">
                  {vision.milestones.length === 0 ? (
                    <p className="text-gray-500 text-sm">No milestones added yet.</p>
                  ) : (
                    vision.milestones.map((milestone, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-pink-50 rounded-lg">
                        <button className="mt-1 text-red-600">
                          {milestone.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </button>
                        <div className="flex-1">
                          <p className={`font-medium ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {milestone.title}
                          </p>
                          {milestone.description && <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>}
                          <p className="text-xs text-gray-500 mt-1">Due: {new Date(milestone.dueDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                          milestone.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {milestone.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No visions yet</h3>
          <p className="text-gray-600 mb-4">Start by creating your first vision with milestones.</p>
          <button
            onClick={handleAddVision}
            className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vision</span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <VisionModal
          vision={editingVision}
          onSave={handleSaveVision}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
