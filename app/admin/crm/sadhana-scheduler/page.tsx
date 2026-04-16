'use client';

// This page requires auth and cannot be statically generated
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Loader,
  Play,
  Pause,
  CheckCircle,
} from 'lucide-react';
import SadhanaForm from './components/SadhanaForm';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';

interface SadhanaSchedule {
  _id: string;
  name: string;
  botName?: string;
  videoUrl: string;
  videoDuration?: number;
  botJoinMinutes?: number;
  autoCloseMinutes?: number;
  enableBotAutomation?: boolean;
  zoomLink?: string;
  zoomId?: string;
  zoomPassword?: string;
  schedule: {
    times: string[]; // ["06:00", "18:00"]
    days: number[]; // [1, 2, 3, 4, 5]
    repeatFrequency: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    timezone: string;
  };
  status: 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export default function SadhanaSchedulerPage() {
  const token = useAuth();
  const [schedules, setSchedules] = useState<SadhanaSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<SadhanaSchedule | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [effectiveToken, setEffectiveToken] = useState<string | null>(null);

  // Sync token from localStorage as fallback
  useEffect(() => {
    if (token) {
      setEffectiveToken(token);
    } else {
      const localToken = 
        typeof window !== 'undefined' 
          ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token'))
          : null;
      if (localToken) {
        setEffectiveToken(localToken);
        console.log('[Sadhana] Using token from localStorage');
      }
    }
  }, [token]);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
try {
      if (!effectiveToken) {
        console.warn('[Sadhana] No token available for fetch');
        setError('Authentication token not available. Please log in.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      // Clean token: remove whitespace and "Bearer " prefix if present
      const cleanToken = effectiveToken.trim().replace(/^Bearer\s+/i, '');
      console.log('[Sadhana] Fetching schedules with clean token:', cleanToken.slice(0, 20) + '...');
      
      const res = await fetch('/api/admin/crm/sadhana-scheduler', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[Sadhana] Fetch response status:', res.status);
      
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch(e) {
          errorMsg = res.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }
      
      const data = await res.json();
      setSchedules(data.data || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading schedules';
      console.error('[Sadhana] Fetch error:', message);
      setError(`Failed to load schedules: ${message}`);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveToken]);

  useEffect(() => {
    if (effectiveToken) {
      fetchSchedules();
    }
  }, [effectiveToken, fetchSchedules]);

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      const cleanToken = effectiveToken?.trim().replace(/^Bearer\s+/i, '') || '';
      const res = await fetch(`/api/admin/crm/sadhana-scheduler/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${cleanToken}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setSchedules(schedules.filter((s) => s._id !== id));
      setDeleteConfirm(null);
      setSuccessMessage('Schedule deleted successfully');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting schedule');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const cleanToken = effectiveToken?.trim().replace(/^Bearer\s+/i, '') || '';
      const res = await fetch(`/api/admin/crm/sadhana-scheduler/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();
      setSchedules(
        schedules.map((s) => (s._id === id ? updated.data : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating status');
    }
  };

  // Handle form submit
  const handleFormSubmit = async (data: any) => {
    try {
      const url = editingId
        ? `/api/admin/crm/sadhana-scheduler/${editingId}`
        : '/api/admin/crm/sadhana-scheduler';
      const method = editingId ? 'PUT' : 'POST';
      const cleanToken = effectiveToken?.trim().replace(/^Bearer\s+/i, '') || '';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save schedule');
      }

      const result = await res.json();
      if (editingId) {
        setSchedules(schedules.map((s) => (s._id === editingId ? result.data : s)));
        setSuccessMessage('Schedule updated successfully');
      } else {
        setSchedules([...schedules, result.data]);
        setSuccessMessage('Schedule created successfully');
      }
      setShowForm(false);
      setEditingId(null);
      setEditingData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving schedule');
    }
  };

  const daysNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const frequencyLabel = (freq: string) => {
    return freq === 'daily' ? 'Daily' : freq === 'weekly' ? 'Weekly' : 'Monthly';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🧘 Sadhana Scheduler
          </h1>
          <p className="text-gray-400">
            Schedule Sadhana videos with Zoom links. Mon-Fri automatic delivery.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <div>
              <p className="text-red-200 font-medium">Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Add New Button */}
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setEditingData(null);
            }}
            className="mb-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition"
          >
            <Plus size={20} /> Add New Schedule
          </button>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="mb-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
            <SadhanaForm
              initialData={editingData}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
                setEditingData(null);
              }}
              loading={loading}
              token={effectiveToken}
            />
          </div>
        )}

        {/* Schedules List */}
        <div className="grid gap-6">
          {loading && !showForm ? (
            <div className="flex justify-center items-center h-40">
              <Loader className="text-purple-400 animate-spin" size={32} />
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-gray-800/50 border border-dashed border-gray-600 rounded-lg p-12 text-center">
              <p className="text-gray-400 mb-2">No schedules yet</p>
              <p className="text-gray-500 text-sm">
                Create your first Sadhana schedule to get started
              </p>
            </div>
          ) : (
            schedules.map((schedule) => (
              <div
                key={schedule._id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">
                        {schedule.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                          schedule.status === 'active'
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-gray-700/50 text-gray-400'
                        }`}
                      >
                        {schedule.status === 'active' ? (
                          <>
                            <CheckCircle size={12} /> Active
                          </>
                        ) : (
                          <>
                            <Pause size={12} /> Paused
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {frequencyLabel(schedule.schedule.repeatFrequency)} repetition
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleToggleStatus(schedule._id, schedule.status)
                      }
                      className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition"
                      title={
                        schedule.status === 'active'
                          ? 'Pause schedule'
                          : 'Activate schedule'
                      }
                    >
                      {schedule.status === 'active' ? (
                        <Pause size={18} />
                      ) : (
                        <Play size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(schedule._id);
                        setEditingData(schedule);
                        setShowForm(true);
                      }}
                      className="p-2 rounded-lg bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 transition"
                      title="Edit schedule"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(schedule._id)}
                      className="p-2 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-red-300 transition"
                      title="Delete schedule"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Schedule Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-gray-500 text-xs uppercase mb-1">Times</p>
                    <p className="text-white font-mono">
                      {schedule.schedule.times.join(' & ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase mb-1">Days</p>
                    <p className="text-white">
                      {schedule.schedule.days
                        .map((d) => daysNames[d])
                        .join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase mb-1">Timezone</p>
                    <p className="text-white">{schedule.schedule.timezone}</p>
                  </div>
                </div>

                {/* Links Preview */}
                <div className="border-t border-gray-700 pt-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 text-sm min-w-fit">📹 Video:</span>
                    <a
                      href={schedule.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm break-all"
                    >
                      {schedule.videoUrl.substring(0, 50)}...
                    </a>
                  </div>
                  {schedule.zoomLink && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 text-sm min-w-fit">🎥 Zoom:</span>
                      <a
                        href={schedule.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm break-all"
                      >
                        {schedule.zoomLink.substring(0, 50)}...
                      </a>
                    </div>
                  )}
                  {schedule.zoomId && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 text-sm">Zoom ID:</span>
                      <span className="text-gray-300 text-sm font-mono">
                        {schedule.zoomId}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-gray-500 text-xs mt-4">
                  Created: {new Date(schedule.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="fixed top-4 right-4 bg-green-900/50 border border-green-700 rounded-lg p-4 flex items-center gap-3 z-50">
            <CheckCircle className="text-green-400" size={20} />
            <p className="text-green-200">{successMessage}</p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <ConfirmDeleteModal
            onConfirm={() => handleDelete(deleteConfirm)}
            onCancel={() => setDeleteConfirm(null)}
            loading={isDeleting}
          />
        )}
      </div>
    </div>
  );
}
