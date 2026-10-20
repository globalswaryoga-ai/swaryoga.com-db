'use client';

import { useAuth } from '@/hooks/useAuth';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Copy, ExternalLink, Trash2, Pencil, Clock, Video, CalendarCheck, RefreshCw } from 'lucide-react';

interface Program {
  id: string;
  slug: string;
  name: string;
  description?: string;
  timeSlots: string[];
  timezone: string;
  videoDuration: number;
  countdownMinutes: number;
  days?: number[];
  repeatFrequency?: string;
  startDate?: string;
  botName?: string;
  botJoinMinutes?: number;
  enableBotAutomation?: boolean;
  zoomLink?: string;
  zoomId?: string;
  zoomPassword?: string;
  active: boolean;
  createdAt: string;
}

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles',
  'Australia/Sydney', 'UTC',
];

function getAdminAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const keys = ['crm_token', 'adminToken', 'admin_token', 'token', 'auth_token'];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v !== 'null' && v !== 'undefined' && v.trim()) return v.trim();
  }
  if (typeof document !== 'undefined' && document.cookie) {
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const [k, ...v] = part.trim().split('=');
      const key = k.trim();
      if (keys.includes(key)) {
        const val = decodeURIComponent(v.join('=')).trim();
        if (val && val !== 'null' && val !== 'undefined') return val;
      }
    }
  }
  return null;
}

export default function SadhanaProgramsPage() {
  const token = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [newProgram, setNewProgram] = useState({
    name: '', description: '',
    timeSlots: ['22:00', '', '', ''],
    timezone: 'Asia/Kolkata',
    videoDuration: 40,
    countdownMinutes: 3,
    days: [0, 1, 2, 3, 4, 5, 6],
    repeatFrequency: 'daily',
    startDate: new Date().toISOString().split('T')[0],
    botName: '🤖 Swar Yoga Bot',
    botJoinMinutes: 5,
    enableBotAutomation: true,
    zoomLink: '',
    zoomId: '',
    zoomPassword: '',
  });

  const [editProgram, setEditProgram] = useState({
    name: '', description: '',
    timeSlots: ['', '', '', ''],
    timezone: 'Asia/Kolkata',
    videoDuration: 40,
    countdownMinutes: 3,
    days: [0, 1, 2, 3, 4, 5, 6],
    repeatFrequency: 'daily',
    startDate: new Date().toISOString().split('T')[0],
    botName: '🤖 Swar Yoga Bot',
    botJoinMinutes: 5,
    enableBotAutomation: true,
    zoomLink: '',
    zoomId: '',
    zoomPassword: '',
  });

  const [effectiveToken, setEffectiveToken] = useState<string | null>(() => getAdminAuthToken());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      setEffectiveToken(token);
    } else {
      const stored = getAdminAuthToken();
      if (stored) setEffectiveToken(stored);
    }
  }, [token]);

  const activeToken = effectiveToken || token || getAdminAuthToken();

  const getAuthHeader = (overrideToken?: string): Record<string, string> => {
    const t = overrideToken || activeToken || getAdminAuthToken();
    return t ? { Authorization: `Bearer ${t.trim().replace(/^Bearer\s+/i, '')}` } : {};
  };

  const authHeader = getAuthHeader();

  const [restarting, setRestarting] = useState(false);

  const restartScheduler = async () => {
    if (!confirm('Are you sure you want to restart the Sadhana Scheduler? This will reset all active bot sessions and allow clean restarts.')) return;
    setRestarting(true);
    try {
      const res = await fetch('/api/admin/sadhana-scheduler/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast('✅ Sadhana Scheduler restarted successfully!');
        load();
      } else {
        setToast(`❌ Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setToast(`❌ Error: ${e.message}`);
    } finally {
      setRestarting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const load = async (tokenOverride?: string) => {
    setLoading(true);
    try {
      const headers = getAuthHeader(tokenOverride);
      const res = await fetch('/api/admin/crm/sadhana-programs', {
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.programs)) {
        setPrograms(data.programs);
      } else if (res.status === 401) {
        console.warn('Unauthorized when loading programs:', data.error);
        const fresh = getAdminAuthToken();
        if (fresh && (!headers.Authorization || headers.Authorization !== `Bearer ${fresh}`)) {
          const retryRes = await fetch('/api/admin/crm/sadhana-programs', {
            headers: { Authorization: `Bearer ${fresh.replace(/^Bearer\s+/i, '').trim()}` },
            credentials: 'include',
          });
          const retryData = await retryRes.json();
          if (retryRes.ok && retryData.success && Array.isArray(retryData.programs)) {
            setPrograms(retryData.programs);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeToken]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const timeSlots = newProgram.timeSlots.filter(t => t.trim());
    if (!timeSlots.length) {
      setToast('⚠️ Add at least one time slot');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/crm/sadhana-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        credentials: 'include',
        body: JSON.stringify({ ...newProgram, timeSlots }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast('✅ Program created successfully');
        setShowCreate(false);
        setNewProgram({
          name: '', description: '', timeSlots: ['22:00', '', '', ''], timezone: 'Asia/Kolkata',
          videoDuration: 40, countdownMinutes: 3, days: [0, 1, 2, 3, 4, 5, 6], repeatFrequency: 'daily',
          startDate: new Date().toISOString().split('T')[0], botName: '🤖 Swar Yoga Bot',
          botJoinMinutes: 5, enableBotAutomation: true, zoomLink: '', zoomId: '', zoomPassword: '',
        });
        load();
      } else {
        const errorMsg = data.error || (res.status === 401 ? 'Unauthorized: Please check admin login.' : 'Failed to create program');
        setToast(`❌ ${errorMsg}`);
      }
    } catch (err: any) {
      console.error(err);
      setToast(`❌ Error: ${err?.message || 'Failed to create'}`);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const openEdit = (p: Program) => {
    setEditingId(p.id);
    const slots = [...p.timeSlots];
    while (slots.length < 4) slots.push('');
    setEditProgram({
      name: p.name,
      description: p.description || '',
      timeSlots: slots.slice(0, 4),
      timezone: p.timezone,
      videoDuration: p.videoDuration,
      countdownMinutes: p.countdownMinutes,
      days: p.days || [0, 1, 2, 3, 4, 5, 6],
      repeatFrequency: p.repeatFrequency || 'daily',
      startDate: p.startDate || new Date().toISOString().split('T')[0],
      botName: p.botName || '🤖 Swar Yoga Bot',
      botJoinMinutes: p.botJoinMinutes || 5,
      enableBotAutomation: p.enableBotAutomation !== false,
      zoomLink: p.zoomLink || '',
      zoomId: p.zoomId || '',
      zoomPassword: p.zoomPassword || '',
    });
  };

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || submitting) return;
    const timeSlots = editProgram.timeSlots.filter(t => t.trim());
    if (!timeSlots.length) {
      setToast('⚠️ Add at least one time slot');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/crm/sadhana-programs/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        credentials: 'include',
        body: JSON.stringify({ ...editProgram, timeSlots }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast('✅ Program updated successfully');
        setEditingId(null);
        load();
      } else {
        const errorMsg = data.error || (res.status === 401 ? 'Unauthorized: Please check admin login.' : 'Failed to update program');
        setToast(`❌ ${errorMsg}`);
      }
    } catch (err: any) {
      console.error(err);
      setToast(`❌ Error: ${err?.message || 'Failed to update'}`);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete program "${name}"? All videos will be removed.`)) return;
    try {
      const res = await fetch(`/api/admin/crm/sadhana-programs/${id}`, {
        method: 'DELETE',
        headers: authHeader,
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast('🗑️ Program deleted');
        load();
      } else {
        setToast(`❌ ${data.error || 'Failed to delete'}`);
      }
    } catch (e: any) {
      setToast(`❌ Error: ${e.message}`);
    }
    setTimeout(() => setToast(''), 3000);
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/sadhana/live/${slug}`;
    navigator.clipboard.writeText(url);
    setToast('📋 Live URL copied');
    setTimeout(() => setToast(''), 2000);
  };

  const totalPrograms = programs.length;
  const activeSlots = programs.reduce((acc, p) => acc + p.timeSlots.filter(Boolean).length, 0);
  const botAutomated = programs.filter(p => p.enableBotAutomation).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Gradient Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">📚 Sadhana Programs</h1>
              <span className="bg-pink-100 text-pink-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-pink-200">
                {totalPrograms} Programs
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">One live URL per sadhana program — automated playback, countdowns & bot triggers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => load()}
              disabled={loading}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition shadow-xs cursor-pointer"
              title="Refresh programs"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-pink-600' : 'text-slate-500'} />
              <span>Refresh</span>
            </button>
            <button
              onClick={restartScheduler}
              disabled={restarting}
              className="border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition shadow-xs cursor-pointer"
              title="Restart Sadhana scheduler sessions"
            >
              <RefreshCw size={15} className={restarting ? 'animate-spin text-amber-600' : 'text-amber-600'} />
              <span>{restarting ? 'Restarting...' : 'Restart Scheduler'}</span>
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-pink-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-95 font-bold text-sm shadow-md shadow-pink-500/20 transition cursor-pointer"
            >
              <Plus size={18} /> New Program
            </button>
          </div>
        </div>

        {/* 4 Colorful Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-pink-200/80 shadow-xs">
            <span className="text-xs font-semibold text-pink-600 uppercase tracking-wider block">Total Programs</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{totalPrograms}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Configured Courses</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Active Broadcast Slots</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{activeSlots}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Daily Time Slots</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Bot Join Automation</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{botAutomated}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Automated Rooms</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-cyan-200/80 shadow-xs">
            <span className="text-xs font-semibold text-cyan-600 uppercase tracking-wider block">Playback Engine</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">Live Sadhana</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">CDN Stream + Bot</span>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">Loading programs...</div>
        ) : programs.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-slate-800 font-bold mb-2 text-lg">No programs configured yet</p>
            <p className="text-slate-500 text-sm mb-5 max-w-md mx-auto">
              Create a program like "21-Day Meditation" and assign a video for each day of the practice.
            </p>
            <button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-pink-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-pink-500/20 cursor-pointer">
              + Create your first program
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {programs.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200/90 hover:border-pink-300 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                      {p.description && <p className="text-xs text-slate-500 mt-1">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => del(p.id, p.name)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs mb-4">
                    {p.timeSlots.filter(Boolean).map((time, idx) => (
                      <span key={idx} className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1">
                        <Clock size={12} /> {time}
                      </span>
                    ))}
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1">
                      <CalendarCheck size={12} /> {p.timezone}
                    </span>
                    <span className="bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1">
                      <Video size={12} /> {p.videoDuration}m video
                    </span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1">
                      <Clock size={12} /> -{p.countdownMinutes}m countdown
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-4">
                    <p className="text-[11px] text-pink-600 uppercase font-bold tracking-wider mb-1">🔗 Live Program Link</p>
                    <code className="text-slate-700 text-xs font-mono break-all select-all">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/sadhana/live/{p.slug}
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Link
                    href={`/admin/crm/sadhana-programs/${p.id}`}
                    className="flex-1 bg-gradient-to-r from-pink-600 to-indigo-600 hover:opacity-95 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <Calendar size={14} /> Manage Calendar
                  </Link>
                  <button
                    onClick={() => copyUrl(p.slug)}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
                    title="Copy URL"
                  >
                    <Copy size={14} />
                  </button>
                  <a
                    href={`/sadhana/live/${p.slug}`} target="_blank" rel="noopener noreferrer"
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                    title="Open Live"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={create} className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-black text-slate-900">Create Sadhana Program</h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Program Name *</label>
              <input
                required value={newProgram.name}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                placeholder="21-Day Meditation Program"
                className="w-full bg-slate-50 text-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={newProgram.description}
                onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                placeholder="Daily guided meditation sessions..."
                rows={2}
                className="w-full bg-slate-50 text-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Time Slots (up to 4) *</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {newProgram.timeSlots.map((time, idx) => (
                  <input
                    key={idx}
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const slots = [...newProgram.timeSlots];
                      slots[idx] = e.target.value;
                      setNewProgram({ ...newProgram, timeSlots: slots });
                    }}
                    placeholder={`Slot ${idx + 1}`}
                    className="bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Timezone *</label>
              <select
                value={newProgram.timezone}
                onChange={(e) => setNewProgram({ ...newProgram, timezone: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Video Duration (min)</label>
                <input
                  type="number" min={5} max={180} value={newProgram.videoDuration}
                  onChange={(e) => setNewProgram({ ...newProgram, videoDuration: parseInt(e.target.value) || 40 })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Countdown (min before)</label>
                <input
                  type="number" min={0} max={30} value={newProgram.countdownMinutes}
                  onChange={(e) => setNewProgram({ ...newProgram, countdownMinutes: parseInt(e.target.value) || 3 })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Days of Week</label>
              <div className="grid grid-cols-4 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const days = [...(newProgram.days || [0,1,2,3,4,5,6])];
                      if (days.includes(idx)) {
                        setNewProgram({ ...newProgram, days: days.filter(d => d !== idx) });
                      } else {
                        setNewProgram({ ...newProgram, days: [...days, idx].sort() });
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      (newProgram.days || [0,1,2,3,4,5,6]).includes(idx)
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Repeat Frequency</label>
                <select
                  value={newProgram.repeatFrequency || 'daily'}
                  onChange={(e) => setNewProgram({ ...newProgram, repeatFrequency: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={newProgram.startDate}
                  onChange={(e) => setNewProgram({ ...newProgram, startDate: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Bot Name</label>
              <input
                type="text"
                value={newProgram.botName || ''}
                onChange={(e) => setNewProgram({ ...newProgram, botName: e.target.value })}
                placeholder="🤖 Swar Yoga Bot"
                className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
              />
            </div>

            <div className="pt-3 pb-2 border-t border-slate-100 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Zoom Bot Configuration</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Zoom Meeting Link</label>
                  <input
                    type="text"
                    value={newProgram.zoomLink || ''}
                    onChange={(e) => setNewProgram({ ...newProgram, zoomLink: e.target.value })}
                    placeholder="https://us06web.zoom.us/j/..."
                    className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-200 focus:border-pink-500 outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Meeting ID</label>
                    <input
                      type="text"
                      value={newProgram.zoomId || ''}
                      onChange={(e) => setNewProgram({ ...newProgram, zoomId: e.target.value })}
                      placeholder="123 4567 8901"
                      className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-200 focus:border-pink-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Password</label>
                    <input
                      type="text"
                      value={newProgram.zoomPassword || ''}
                      onChange={(e) => setNewProgram({ ...newProgram, zoomPassword: e.target.value })}
                      placeholder="Optional"
                      className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-200 focus:border-pink-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Bot Joins (min before session)</label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 5].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setNewProgram({ ...newProgram, botJoinMinutes: min })}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      (newProgram.botJoinMinutes || 5) === min
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="bot-automation"
                checked={newProgram.enableBotAutomation !== false}
                onChange={(e) => setNewProgram({ ...newProgram, enableBotAutomation: e.target.checked })}
                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
              />
              <label htmlFor="bot-automation" className="text-sm font-semibold text-slate-700">Enable Bot Automation</label>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-slate-100">
              <button type="button" disabled={submitting} onClick={() => setShowCreate(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-pink-600 to-indigo-600 hover:opacity-95 text-white py-2.5 rounded-xl font-bold text-sm shadow-md shadow-pink-500/20 transition cursor-pointer disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={update} className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-black text-slate-900">Edit Program</h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Program Name *</label>
              <input
                required value={editProgram.name}
                onChange={(e) => setEditProgram({ ...editProgram, name: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={editProgram.description}
                onChange={(e) => setEditProgram({ ...editProgram, description: e.target.value })}
                rows={2}
                className="w-full bg-slate-50 text-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Time Slots (up to 4) *</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {editProgram.timeSlots.map((time, idx) => (
                  <input
                    key={idx}
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const slots = [...editProgram.timeSlots];
                      slots[idx] = e.target.value;
                      setEditProgram({ ...editProgram, timeSlots: slots });
                    }}
                    placeholder={`Slot ${idx + 1}`}
                    className="bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Timezone *</label>
              <select
                value={editProgram.timezone}
                onChange={(e) => setEditProgram({ ...editProgram, timezone: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Video Duration (min)</label>
                <input
                  type="number" min={5} max={180} value={editProgram.videoDuration}
                  onChange={(e) => setEditProgram({ ...editProgram, videoDuration: parseInt(e.target.value) || 40 })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Countdown (min before)</label>
                <input
                  type="number" min={0} max={30} value={editProgram.countdownMinutes}
                  onChange={(e) => setEditProgram({ ...editProgram, countdownMinutes: parseInt(e.target.value) || 3 })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Days of Week</label>
              <div className="grid grid-cols-4 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const days = [...(editProgram.days || [0,1,2,3,4,5,6])];
                      if (days.includes(idx)) {
                        setEditProgram({ ...editProgram, days: days.filter(d => d !== idx) });
                      } else {
                        setEditProgram({ ...editProgram, days: [...days, idx].sort() });
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      (editProgram.days || [0,1,2,3,4,5,6]).includes(idx)
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Repeat Frequency</label>
                <select
                  value={editProgram.repeatFrequency || 'daily'}
                  onChange={(e) => setEditProgram({ ...editProgram, repeatFrequency: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={editProgram.startDate}
                  onChange={(e) => setEditProgram({ ...editProgram, startDate: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Bot Name</label>
              <input
                type="text"
                value={editProgram.botName || ''}
                onChange={(e) => setEditProgram({ ...editProgram, botName: e.target.value })}
                placeholder="🤖 Swar Yoga Bot"
                className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none text-sm"
              />
            </div>

            <div className="pt-3 pb-2 border-t border-slate-100 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Zoom Bot Configuration</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Zoom Meeting Link</label>
                  <input
                    type="text"
                    value={editProgram.zoomLink || ''}
                    onChange={(e) => setEditProgram({ ...editProgram, zoomLink: e.target.value })}
                    placeholder="https://us06web.zoom.us/j/..."
                    className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-200 focus:border-pink-500 outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Meeting ID</label>
                    <input
                      type="text"
                      value={editProgram.zoomId || ''}
                      onChange={(e) => setEditProgram({ ...editProgram, zoomId: e.target.value })}
                      placeholder="123 4567 8901"
                      className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-200 focus:border-pink-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Password</label>
                    <input
                      type="text"
                      value={editProgram.zoomPassword || ''}
                      onChange={(e) => setEditProgram({ ...editProgram, zoomPassword: e.target.value })}
                      placeholder="Optional"
                      className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-200 focus:border-pink-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Bot Joins (min before session)</label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 5].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setEditProgram({ ...editProgram, botJoinMinutes: min })}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      (editProgram.botJoinMinutes || 5) === min
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="bot-automation-edit"
                checked={editProgram.enableBotAutomation !== false}
                onChange={(e) => setEditProgram({ ...editProgram, enableBotAutomation: e.target.checked })}
                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
              />
              <label htmlFor="bot-automation-edit" className="text-sm font-semibold text-slate-700">Enable Bot Automation</label>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-slate-100">
              <button type="button" disabled={submitting} onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-pink-600 to-indigo-600 hover:opacity-95 text-white py-2.5 rounded-xl font-bold text-sm shadow-md shadow-pink-500/20 transition cursor-pointer disabled:opacity-50">
                {submitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white border border-slate-800 px-4 py-3 rounded-xl shadow-2xl z-50 text-sm font-medium">
          {toast}
        </div>
      )}
      </div>
    </div>
  );
}
