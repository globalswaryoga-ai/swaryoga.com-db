'use client';

// This page requires auth and cannot be statically generated
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
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
  Video,
  Clock,
  Calendar,
  Radio,
  Bot,
  Sparkles,
  ExternalLink,
  Copy,
  Search,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
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
    times: string[];
    days: number[];
    repeatFrequency: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    timezone: string;
  };
  status: 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
}

const DAYS_MAP = [
  { val: 0, label: 'Sun' },
  { val: 1, label: 'Mon' },
  { val: 2, label: 'Tue' },
  { val: 3, label: 'Wed' },
  { val: 4, label: 'Thu' },
  { val: 5, label: 'Fri' },
  { val: 6, label: 'Sat' },
];

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
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  // Token synchronization with cookie & localStorage fallbacks
  useEffect(() => {
    if (token) {
      setEffectiveToken(token);
    } else if (typeof window !== 'undefined') {
      const stored =
        localStorage.getItem('crm_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token') ||
        localStorage.getItem('token');
      if (stored && stored !== 'null' && stored !== 'undefined') {
        setEffectiveToken(stored);
      } else if (typeof document !== 'undefined' && document.cookie) {
        const parts = document.cookie.split(';');
        for (const part of parts) {
          const [k, ...v] = part.trim().split('=');
          const key = k.trim();
          if (['admin_token', 'crm_token', 'adminToken', 'token', 'auth_token'].includes(key)) {
            const val = decodeURIComponent(v.join('=')).trim();
            if (val && val !== 'null' && val !== 'undefined') {
              setEffectiveToken(val);
              break;
            }
          }
        }
      }
    }
  }, [token]);

  const activeToken = effectiveToken || token;
  const authHeaders: Record<string, string> = activeToken
    ? {
        Authorization: `Bearer ${activeToken.trim().replace(/^Bearer\s+/i, '')}`,
        'Content-Type': 'application/json',
      }
    : { 'Content-Type': 'application/json' };

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/sadhana-scheduler', {
        method: 'GET',
        headers: authHeaders,
        credentials: 'include',
      });

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch {
          errorMsg = res.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setSchedules(data.data || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading schedules';
      setError(`Failed to load schedules: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [activeToken]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/crm/sadhana-scheduler/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete schedule');
      setSchedules((prev) => prev.filter((s) => s._id !== id));
      setDeleteConfirm(null);
      setSuccessMessage('Schedule deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting schedule');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle active/paused
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const res = await fetch(`/api/admin/crm/sadhana-scheduler/${id}`, {
        method: 'PATCH',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update schedule status');
      const updated = await res.json();
      setSchedules((prev) =>
        prev.map((s) => (s._id === id ? { ...s, status: newStatus as any } : s))
      );
      setSuccessMessage(`Schedule ${newStatus === 'active' ? 'activated' : 'paused'} successfully!`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating status');
    }
  };

  // Test Bot immediate execution
  const handleTestBot = async (id: string, scheduleName: string) => {
    try {
      setTestingBotId(id);
      setTestResults(null);

      const res = await fetch('/api/admin/crm/sadhana-scheduler/test-bot', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({ scheduleId: id }),
      });

      const data = await res.json();
      setTestResults({
        id,
        success: data.success,
        message: data.message || (data.success ? 'Bot test executed' : 'Test failed'),
        logs: data.logs || [],
      });
      setShowTestResults(true);

      if (data.success) {
        setSuccessMessage(`🚀 Bot test triggered for "${scheduleName}"!`);
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error testing bot';
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

  // Restart scheduler sessions
  const handleRestartScheduler = async () => {
    if (!confirm('Are you sure you want to restart the Sadhana Scheduler engine? This will clean up inactive bot sessions and re-initialize scheduled tasks.')) return;
    try {
      setRestarting(true);
      const res = await fetch('/api/admin/sadhana-scheduler/restart', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('✅ Scheduler restarted cleanly! Active sessions refreshed.');
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

  // Form submit
  const handleFormSubmit = async (data: any) => {
    try {
      const url = editingId
        ? `/api/admin/crm/sadhana-scheduler/${editingId}`
        : '/api/admin/crm/sadhana-scheduler';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save schedule');
      }

      const result = await res.json();
      if (editingId) {
        setSchedules((prev) => prev.map((s) => (s._id === editingId ? result.data : s)));
        setSuccessMessage('✅ Schedule updated successfully!');
      } else {
        setSchedules((prev) => [result.data, ...prev]);
        setSuccessMessage('🎉 New Sadhana schedule created successfully!');
      }

      setShowForm(false);
      setEditingId(null);
      setEditingData(null);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving schedule');
    }
  };

  // Copy live url helper
  const handleCopyLiveUrl = (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://swaryoga.com';
    const url = `${origin}/sadhana/live/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setSuccessMessage('📋 Community Live Link copied to clipboard!');
    setTimeout(() => {
      setCopiedSlug(null);
      setSuccessMessage(null);
    }, 2500);
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.botName && s.botName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus =
        statusFilter === 'all' ? true : s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [schedules, searchQuery, statusFilter]);

  // Metrics
  const totalSchedules = schedules.length;
  const activeCount = schedules.filter((s) => s.status === 'active').length;
  const botAutomatedCount = schedules.filter((s) => s.enableBotAutomation !== false).length;
  const totalTimeSlots = schedules.reduce((acc, s) => acc + (s.schedule?.times?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/90 to-indigo-50/25">
      {/* Top Gradient Decorative Border Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-xs" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link href="/admin/crm" className="hover:text-indigo-600 transition">CRM Admin</Link>
          <ChevronRight size={13} />
          <Link href="/admin/crm/sadhana-programs" className="hover:text-indigo-600 transition">Sadhana Programs</Link>
          <ChevronRight size={13} />
          <span className="text-slate-700">Automated Scheduler</span>
        </div>

        {/* Hero Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Radio size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                  <span>Sadhana Scheduler & Zoom Bots</span>
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-medium">
                  Autonomous morning routines, scheduled CDN playback, Zoom bot joining & community live streaming.
                </p>
              </div>
            </div>
          </div>

          {!showForm && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleRestartScheduler}
                disabled={restarting}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-bold flex items-center gap-2 transition shadow-2xs text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                title="Restart active bot schedules"
              >
                <RefreshCw size={15} className={restarting ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
                <span>{restarting ? 'Restarting...' : 'Restart Engine'}</span>
              </button>

              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                  setEditingData(null);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-2xl font-bold flex items-center gap-2 transition shadow-md shadow-indigo-500/20 text-xs sm:text-sm cursor-pointer"
              >
                <Plus size={18} />
                <span>Add New Schedule</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Premium Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-3xl p-5 shadow-xs transition duration-200 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Routines</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition duration-150">
                <Calendar size={17} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{totalSchedules}</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {totalTimeSlots} Time Slots
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Configured daily broadcast routines</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200/80 hover:border-emerald-300 rounded-3xl p-5 shadow-xs transition duration-200 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live & Automated</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition duration-150">
                <CheckCircle size={17} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{activeCount}</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Scheduled for autonomous execution</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200/80 hover:border-purple-300 rounded-3xl p-5 shadow-xs transition duration-200 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zoom Bot Joiners</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition duration-150">
                <Bot size={17} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{botAutomatedCount}</span>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                Auto-Join
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Auto screen share & countdown chat</p>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-slate-200/80 hover:border-pink-300 rounded-3xl p-5 shadow-xs transition duration-200 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Community Engine</span>
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-110 transition duration-150">
                <Sparkles size={17} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">Zero Mongo</span>
              <span className="text-xs font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                Bunny SQL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Instant failover & fast live feeds</p>
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
            <AlertCircle className="text-rose-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-rose-900 font-bold text-sm">Notice</p>
              <p className="text-rose-700 text-xs mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-700 text-xs font-bold p-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create / Edit Form Card */}
        {showForm && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm animate-in fade-in duration-200">
            <SadhanaForm
              initialData={editingData}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
                setEditingData(null);
              }}
              loading={loading}
              token={activeToken ?? undefined}
            />
          </div>
        )}

        {/* Search, Filter & View Controls */}
        {!showForm && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schedule by name or bot..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs sm:text-sm font-medium transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({totalSchedules})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('paused')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'paused'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Paused ({totalSchedules - activeCount})
              </button>
            </div>
          </div>
        )}

        {/* Schedules Cards Feed */}
        <div className="space-y-5">
          {loading && !showForm ? (
            <div className="flex flex-col justify-center items-center h-48 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <Loader className="text-indigo-600 animate-spin" size={32} />
              <p className="text-slate-500 text-xs font-semibold">Loading Sadhana schedules from Bunny Database...</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Radio size={24} />
              </div>
              <h3 className="text-slate-800 font-bold text-base">
                {searchQuery || statusFilter !== 'all' ? 'No matching schedules found' : 'No schedules configured yet'}
              </h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto mt-1 mb-5">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search terms or filters.'
                  : 'Create your first Sadhana schedule to configure automated Zoom bot joining and daily meditation videos.'}
              </p>
              {!showForm && (
                <button
                  onClick={() => {
                    setShowForm(true);
                    setEditingId(null);
                    setEditingData(null);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={16} /> Add Schedule
                </button>
              )}
            </div>
          ) : (
            filteredSchedules.map((schedule) => {
              const programSlug =
                (schedule as any).programSlug ||
                (schedule as any).slug ||
                schedule.name?.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
              const isActive = schedule.status === 'active';
              const days = schedule.schedule?.days || [];
              const times = schedule.schedule?.times || [];

              return (
                <div
                  key={schedule._id}
                  className="bg-white border border-slate-200/90 hover:border-indigo-300/80 rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-lg transition-all duration-200 space-y-5"
                >
                  {/* Top Bar: Title, Status Badge, Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                          {schedule.name}
                        </h3>

                        {/* Status Pill */}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-2xs ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-amber-50 text-amber-700 border-amber-200/80'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                            }`}
                          />
                          <span>{isActive ? 'Active Routine' : 'Paused'}</span>
                        </span>

                        {/* Cadence badge */}
                        <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200/70">
                          {schedule.schedule?.repeatFrequency === 'daily'
                            ? 'Everyday'
                            : schedule.schedule?.repeatFrequency === 'weekly'
                            ? 'Weekly'
                            : 'Monthly'}
                        </span>
                      </div>

                      <p className="text-slate-400 text-xs font-medium">
                        Timezone: <span className="text-slate-700 font-semibold">{schedule.schedule?.timezone || 'Asia/Kolkata'}</span>
                        {schedule.schedule?.startDate && (
                          <span className="ml-2">
                            • Starts:{' '}
                            <span className="text-slate-700 font-semibold">
                              {new Date(schedule.schedule.startDate).toLocaleDateString()}
                            </span>
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 self-start">
                      <button
                        onClick={() => handleToggleStatus(schedule._id, schedule.status)}
                        className={`p-2.5 rounded-2xl border transition cursor-pointer ${
                          isActive
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200/80'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/80'
                        }`}
                        title={isActive ? 'Pause automated sessions' : 'Activate schedule'}
                      >
                        {isActive ? <Pause size={16} /> : <Play size={16} />}
                      </button>

                      <button
                        onClick={() => handleTestBot(schedule._id, schedule.name)}
                        disabled={testingBotId === schedule._id}
                        className="p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition cursor-pointer disabled:opacity-50"
                        title="Instant test: Force bot to join Zoom immediately"
                      >
                        {testingBotId === schedule._id ? (
                          <Loader size={16} className="animate-spin text-indigo-600" />
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
                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition cursor-pointer"
                        title="Edit schedule"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => setDeleteConfirm(schedule._id)}
                        className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 transition cursor-pointer"
                        title="Delete schedule"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Schedule Timings & Days Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    {/* Time slots */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Delivery Time Slots
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {times.length > 0 ? (
                          times.map((t, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 text-slate-800 rounded-xl text-xs font-mono font-bold shadow-2xs"
                            >
                              <Clock size={12} className="text-indigo-600" />
                              <span>{t}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">No time slots set</span>
                        )}
                      </div>
                    </div>

                    {/* Active Weekdays */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Weekly Repeat Schedule
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS_MAP.map((d) => {
                          const active = days.includes(d.val);
                          return (
                            <span
                              key={d.val}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                active
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-slate-200/60 text-slate-400'
                              }`}
                            >
                              {d.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Automation Specs Badges Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bot Join</span>
                      <span className="text-slate-800 font-bold mt-0.5 block flex items-center gap-1">
                        <Bot size={13} className="text-indigo-600" />
                        <span>{schedule.botJoinMinutes != null ? `${schedule.botJoinMinutes} min before` : '5 min before'}</span>
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Runtime & Close</span>
                      <span className="text-slate-800 font-bold mt-0.5 block flex items-center gap-1">
                        <Video size={13} className="text-purple-600" />
                        <span>{schedule.videoDuration || 40}m play / {schedule.autoCloseMinutes || 40}m close</span>
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scheduled Chat</span>
                      <span className="text-slate-800 font-bold mt-0.5 block flex items-center gap-1">
                        <MessageSquare size={13} className="text-emerald-600" />
                        <span>{schedule.chatMessages?.length || 0} welcome alerts</span>
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200/70 rounded-2xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Q&A Helper</span>
                      <span className="mt-0.5 block font-bold flex items-center gap-1">
                        <Sparkles size={13} className={schedule.enableAiChatReplies ? 'text-purple-600' : 'text-slate-400'} />
                        <span className={schedule.enableAiChatReplies ? 'text-purple-700' : 'text-slate-400'}>
                          {schedule.enableAiChatReplies ? 'Active in Chat' : 'Disabled'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Video & Zoom Direct Details */}
                  <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold min-w-[70px]">📹 Video:</span>
                      <a
                        href={schedule.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 font-mono font-medium hover:underline truncate flex-1"
                        title={schedule.videoUrl}
                      >
                        {schedule.videoUrl}
                      </a>
                    </div>

                    {schedule.zoomLink && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold min-w-[70px]">🎥 Zoom Link:</span>
                        <a
                          href={schedule.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:text-sky-800 font-mono font-medium hover:underline truncate flex-1"
                          title={schedule.zoomLink}
                        >
                          {schedule.zoomLink}
                        </a>
                      </div>
                    )}

                    {(schedule.zoomId || schedule.zoomPassword) && (
                      <div className="flex items-center gap-4 text-slate-700">
                        {schedule.zoomId && (
                          <div>
                            <span className="text-slate-400 font-bold">Zoom ID: </span>
                            <span className="font-mono font-semibold">{schedule.zoomId}</span>
                          </div>
                        )}
                        {schedule.zoomPassword && (
                          <div>
                            <span className="text-slate-400 font-bold">Passcode: </span>
                            <span className="font-mono font-semibold">{schedule.zoomPassword}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* VIP Community Live Watch Banner */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                          Community Live URL
                        </span>
                      </div>
                      <code className="text-xs font-mono text-slate-200 block truncate max-w-lg select-all">
                        {typeof window !== 'undefined' ? window.location.origin : 'https://swaryoga.com'}
                        /sadhana/live/{programSlug}
                      </code>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopyLiveUrl(programSlug)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Copy size={13} />
                        <span>{copiedSlug === programSlug ? 'Copied!' : 'Copy Link'}</span>
                      </button>

                      <a
                        href={`/sadhana/live/${programSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-500/30"
                      >
                        <span>👁 Watch Live</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Global Toast Success Message */}
        {successMessage && (
          <div className="fixed bottom-5 right-5 bg-slate-900 text-white border border-slate-700/80 rounded-2xl px-5 py-3.5 flex items-center gap-3 z-50 shadow-2xl animate-in slide-in-from-bottom-3 duration-200 font-semibold text-sm">
            <CheckCircle className="text-emerald-400" size={18} />
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

        {/* Test Bot Terminal Modal */}
        {showTestResults && testResults && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      testResults.success
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {testResults.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {testResults.success ? 'Zoom Bot Test Succeeded' : 'Zoom Bot Test Failed'}
                    </h3>
                    <p className="text-slate-500 text-xs">{testResults.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTestResults(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Terminal Logs */}
              <div className="p-6 overflow-y-auto flex-1 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Bot Execution Console Logs
                </h4>
                <div className="bg-slate-950 rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-1.5 max-h-72 overflow-y-auto border border-slate-800 shadow-inner">
                  {testResults.logs && testResults.logs.length > 0 ? (
                    testResults.logs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">
                        <span className="text-indigo-400 select-none mr-2">›</span>
                        <span>{log}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic">No console logs returned from bot test execution.</div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowTestResults(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  Close
                </button>
                {testResults.logs && testResults.logs.length > 0 && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(testResults.logs.join('\n'));
                      setSuccessMessage('📋 Console logs copied to clipboard!');
                      setTimeout(() => setSuccessMessage(null), 2500);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-xs cursor-pointer"
                  >
                    Copy Logs
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
