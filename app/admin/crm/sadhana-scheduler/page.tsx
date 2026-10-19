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
  Zap,
  RefreshCw,
} from 'lucide-react';
import SadhanaForm from './components/SadhanaForm';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';

interface SadhanaSchedule {
  _id: string;
  name: string;
  botName?: string;
  chatMessages?: Array<{ message: string; delayMinutes: number }>;
  enableAiChatReplies?: boolean;
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
  const [testingBotId, setTestingBotId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    id: string;
    success: boolean;
    message: string;
    logs: string[];
  } | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);
  const [restarting, setRestarting] = useState(false);

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

  // Handle test bot
  const handleTestBot = async (id: string, scheduleName: string) => {
    try {
      setTestingBotId(id);
      setTestResults(null);
      const cleanToken = effectiveToken?.trim().replace(/^Bearer\s+/i, '') || '';
      
      console.log('🤖 [Sadhana] Testing bot for schedule:', id);
      
      const res = await fetch('/api/admin/crm/sadhana-scheduler/test-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanToken}`,
        },
        body: JSON.stringify({ scheduleId: id }),
      });

      const data = await res.json();
      
      setTestResults({
        id,
        success: data.success,
        message: data.message,
        logs: data.logs || [],
      });
      setShowTestResults(true);
      
      console.log('✅ [Sadhana] Bot test response:', data);
      
      if (data.success) {
        setSuccessMessage(`Bot test triggered for "${scheduleName}"`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error testing bot';
      console.error('❌ [Sadhana] Bot test error:', errorMsg);
      setTestResults({
        id,
        success: false,
        message: errorMsg,
        logs: [`❌ ${errorMsg}`],
      });
      setShowTestResults(true);
    } finally {
      setTestingBotId(null);
    }
  };

  const handleRestartScheduler = async () => {
    try {
      setRestarting(true);
      const cleanToken = effectiveToken?.trim().replace(/^Bearer\s+/i, '') || '';
      const res = await fetch('/api/admin/sadhana-scheduler/restart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cleanToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Scheduler restarted cleanly! Active sessions refreshed in Bunny Database.');
        setTimeout(() => setSuccessMessage(null), 3500);
        fetchSchedules();
      } else {
        throw new Error(data.error || 'Failed to restart scheduler');
      }
    } catch (err: any) {
      setError(err?.message || 'Error restarting scheduler');
    } finally {
      setRestarting(false);
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

  const totalSchedules = schedules.length;
  const activeCount = schedules.filter(s => s.status === 'active').length;
  const botAutomatedCount = schedules.filter(s => s.enableBotAutomation !== false).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Gradient Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-cyan-600 to-indigo-600" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                🧘 Sadhana Scheduler
              </h1>
              <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
                {totalSchedules} Schedules
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Schedule Sadhana videos with Zoom rooms, automated morning bot joiners, and live community feeds.
            </p>
          </div>

          {!showForm && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleRestartScheduler}
                disabled={restarting}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold flex items-center gap-2 transition shadow-xs disabled:opacity-50 text-sm cursor-pointer"
              >
                <RefreshCw size={15} className={restarting ? 'animate-spin text-teal-600' : 'text-slate-500'} />
                <span>{restarting ? 'Restarting...' : 'Restart Scheduler'}</span>
              </button>
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                  setEditingData(null);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:opacity-95 text-white rounded-xl font-bold flex items-center gap-2 transition shadow-md shadow-teal-500/20 text-sm cursor-pointer"
              >
                <Plus size={18} /> Add New Schedule
              </button>
            </div>
          )}
        </div>

        {/* 4 Colorful Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-teal-200/80 shadow-xs">
            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider block">Total Schedules</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{totalSchedules}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Configured Routines</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Active Automated</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{activeCount}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Live Running</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Bot Join Automated</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{botAutomatedCount}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Zoom Bot Active</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-cyan-200/80 shadow-xs">
            <span className="text-xs font-semibold text-cyan-600 uppercase tracking-wider block">Schedule Engine</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">Recurring Cron</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Mon-Sun Flexible</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
            <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-rose-900 font-bold text-sm">Error</p>
              <p className="text-rose-700 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Form Container */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <SadhanaForm
              initialData={editingData}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
                setEditingData(null);
              }}
              loading={loading}
              token={effectiveToken ?? undefined}
            />
          </div>
        )}

        {/* Schedules List */}
        <div className="grid gap-5">
          {loading && !showForm ? (
            <div className="flex justify-center items-center h-40 bg-white rounded-2xl border border-slate-200">
              <Loader className="text-teal-600 animate-spin" size={32} />
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs">
              <p className="text-slate-800 font-bold mb-1 text-base">No schedules configured yet</p>
              <p className="text-slate-500 text-xs">
                Create your first Sadhana schedule to get started
              </p>
            </div>
          ) : (
            schedules.map((schedule) => (
              <div
                key={schedule._id}
                className="bg-white border border-slate-200/90 hover:border-teal-300 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <h3 className="text-lg font-black text-slate-900">
                        {schedule.name}
                      </h3>
                      <span
                        className={`px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border ${
                          schedule.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
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
                    <p className="text-slate-500 text-xs">
                      {frequencyLabel(schedule.schedule?.repeatFrequency)} repetition
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() =>
                        handleToggleStatus(schedule._id, schedule.status)
                      }
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      title={
                        schedule.status === 'active'
                          ? 'Pause schedule'
                          : 'Activate schedule'
                      }
                    >
                      {schedule.status === 'active' ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleTestBot(schedule._id, schedule.name)}
                      disabled={testingBotId === schedule._id}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Test bot join immediately (bypass timing)"
                    >
                      {testingBotId === schedule._id ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Zap size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(schedule._id);
                        setEditingData(schedule);
                        setShowForm(true);
                      }}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                      title="Edit schedule"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(schedule._id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                      title="Delete schedule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Schedule Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Times</p>
                    <p className="text-slate-900 font-mono font-bold">
                      {schedule.schedule?.times?.join(' & ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Days</p>
                    <p className="text-slate-800 font-semibold">
                      {schedule.schedule?.days
                        ?.map((d) => daysNames[d])
                        .join(', ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Timezone</p>
                    <p className="text-slate-800 font-semibold">{schedule.schedule?.timezone || '—'}</p>
                  </div>
                </div>

                {/* Bot / Playback Settings */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 border-t border-slate-100 pt-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Bot Name</p>
                    <p className="text-slate-800 font-semibold">{schedule.botName || 'Sadhana Bot'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Video Duration</p>
                    <p className="text-slate-800 font-semibold">{schedule.videoDuration ? `${schedule.videoDuration} min` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Bot Joins</p>
                    <p className="text-slate-800 font-semibold">{schedule.botJoinMinutes != null ? `${schedule.botJoinMinutes} min before` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Chat Messages</p>
                    <p className="text-slate-800 font-semibold">
                      {schedule.chatMessages?.length
                        ? `${schedule.chatMessages.length} scheduled (${schedule.chatMessages.map((m) => `${m.delayMinutes}m`).join(', ')})`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">AI Chat Replies</p>
                    <p className={schedule.enableAiChatReplies ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {schedule.enableAiChatReplies ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Auto Close</p>
                    <p className="text-slate-800 font-semibold">{schedule.autoCloseMinutes != null ? `${schedule.autoCloseMinutes} min after` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Bot Automation</p>
                    <p className={schedule.enableBotAutomation === false ? 'text-slate-400' : 'text-emerald-700 font-bold'}>
                      {schedule.enableBotAutomation === false ? 'Disabled' : 'Enabled'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Start Date</p>
                    <p className="text-slate-800 font-semibold">{schedule.schedule?.startDate ? new Date(schedule.schedule.startDate).toLocaleDateString() : '—'}</p>
                  </div>
                </div>

                {/* Links Preview */}
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                  {schedule.chatMessages?.filter((m) => m.message).map((m, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-400 min-w-fit font-bold">💬 +{m.delayMinutes}m:</span>
                      <span className="text-slate-700 whitespace-pre-wrap">{m.message}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 min-w-fit font-bold">📹 Video:</span>
                    <a
                      href={schedule.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline break-all"
                    >
                      {schedule.videoUrl?.substring(0, 60) || '—'}...
                    </a>
                  </div>
                  {schedule.zoomLink && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 min-w-fit font-bold">🎥 Zoom:</span>
                      <a
                        href={schedule.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {schedule.zoomLink?.substring(0, 60) || '—'}...
                      </a>
                    </div>
                  )}
                  {schedule.zoomId && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 font-bold">Zoom ID:</span>
                      <span className="text-slate-800 font-mono font-semibold">
                        {schedule.zoomId}
                      </span>
                    </div>
                  )}
                </div>

                {/* Live Watch Page URL - Share with Community */}
                <div className="mt-4 p-4 bg-teal-50/60 rounded-xl border border-teal-200/80">
                  <p className="text-teal-800 text-xs uppercase mb-2 font-bold tracking-wider">
                    🎯 Community Watch Link
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-slate-800 text-xs bg-white px-3 py-2 rounded-lg border border-teal-200 font-mono break-all select-all shadow-2xs">
                      {typeof window !== 'undefined' ? window.location.origin : 'https://swaryoga.com'}/sadhana/live/{(schedule as any).programSlug || (schedule as any).slug || schedule.name?.toLowerCase().replace(/\s+/g, '-')}
                    </code>
                    <button
                      onClick={() => {
                        const slug = (schedule as any).programSlug || (schedule as any).slug || schedule.name?.toLowerCase().replace(/\s+/g, '-');
                        const url = `${window.location.origin}/sadhana/live/${slug}`;
                        navigator.clipboard.writeText(url);
                        setSuccessMessage('✅ Live URL copied!');
                        setTimeout(() => setSuccessMessage(''), 2000);
                      }}
                      className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:opacity-95 whitespace-nowrap shadow-xs cursor-pointer"
                    >
                      📋 Copy
                    </button>
                    <a
                      href={`/sadhana/live/${(schedule as any).programSlug || (schedule as any).slug || schedule.name?.toLowerCase().replace(/\s+/g, '-')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 whitespace-nowrap shadow-xs"
                    >
                      👁 Preview
                    </a>
                  </div>
                </div>

                <p className="text-slate-400 text-[11px] mt-3">
                  Created: {new Date(schedule.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="fixed top-4 right-4 bg-emerald-600 text-white rounded-xl p-4 flex items-center gap-2.5 z-50 shadow-2xl font-semibold text-sm">
            <CheckCircle className="text-white" size={20} />
            <p>{successMessage}</p>
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

        {/* Test Bot Results Modal */}
        {showTestResults && testResults && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-200">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {testResults.success ? (
                    <>
                      <CheckCircle className="text-emerald-600" size={24} />
                      <h2 className="text-xl font-black text-slate-900">Bot Test Successful</h2>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="text-rose-600" size={24} />
                      <h2 className="text-xl font-black text-slate-900">Bot Test Failed</h2>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowTestResults(false)}
                  className="text-slate-400 hover:text-slate-700 transition"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-slate-700 text-sm">{testResults.message}</p>
                </div>

                {/* Logs */}
                <div className="mb-4">
                  <h3 className="text-slate-800 font-bold text-xs uppercase tracking-wider mb-2">Execution Logs:</h3>
                  <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 space-y-1 max-h-80 overflow-y-auto border border-slate-800">
                    {testResults.logs.map((log, idx) => (
                      <div key={idx}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setShowTestResults(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition"
                  >
                    Close
                  </button>
                  {testResults.success && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(testResults.logs.join('\n'));
                        setSuccessMessage('Logs copied to clipboard!');
                        setTimeout(() => setSuccessMessage(null), 2000);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:opacity-95 text-white rounded-xl font-bold text-sm transition shadow-xs"
                    >
                      Copy Logs
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
