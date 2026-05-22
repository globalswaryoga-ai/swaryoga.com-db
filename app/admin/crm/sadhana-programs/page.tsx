'use client';

import { useAuth } from '@/hooks/useAuth';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Copy, ExternalLink, Trash2, Pencil, Clock, Video, CalendarCheck } from 'lucide-react';

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
  active: boolean;
  createdAt: string;
}

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles',
  'Australia/Sydney', 'UTC',
];

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
  });

  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/sadhana-programs', { headers: authHeader });
      const data = await res.json();
      if (data.success) setPrograms(data.programs);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { if (token) load(); }, [token]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const timeSlots = newProgram.timeSlots.filter(t => t.trim());
    if (!timeSlots.length) {
      setToast('⚠️ Add at least one time slot');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    try {
      const res = await fetch('/api/admin/crm/sadhana-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...newProgram, timeSlots }),
      });
      const data = await res.json();
      if (data.success) {
        setToast('✅ Program created');
        setShowCreate(false);
        setNewProgram({
          name: '', description: '', timeSlots: ['22:00', '', '', ''], timezone: 'Asia/Kolkata',
          videoDuration: 40, countdownMinutes: 3, days: [0, 1, 2, 3, 4, 5, 6], repeatFrequency: 'daily',
          startDate: new Date().toISOString().split('T')[0], botName: '🤖 Swar Yoga Bot',
          botJoinMinutes: 5, enableBotAutomation: true,
        });
        load();
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) { console.error(err); }
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
    });
  };

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const timeSlots = editProgram.timeSlots.filter(t => t.trim());
    if (!timeSlots.length) {
      setToast('⚠️ Add at least one time slot');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    try {
      const res = await fetch(`/api/admin/crm/sadhana-programs/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...editProgram, timeSlots }),
      });
      const data = await res.json();
      if (data.success) {
        setToast('✅ Program updated');
        setEditingId(null);
        load();
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) { console.error(err); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete program "${name}"? All videos will be removed.`)) return;
    await fetch(`/api/admin/crm/sadhana-programs/${id}`, { method: 'DELETE', headers: authHeader });
    setToast('🗑️ Program deleted');
    load();
    setTimeout(() => setToast(''), 3000);
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/sadhana/live/${slug}`;
    navigator.clipboard.writeText(url);
    setToast('📋 Live URL copied');
    setTimeout(() => setToast(''), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">📚 Sadhana Programs</h1>
          <p className="text-gray-600">One link per program — play different videos each day</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-pink-500 to-violet-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 font-semibold"
        >
          <Plus size={18} /> New Program
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : programs.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-gray-300 mb-2 text-lg">No programs yet</p>
          <p className="text-gray-500 text-sm mb-4">
            Create a program like "21-Day Meditation" and add a video for each day
          </p>
          <button onClick={() => setShowCreate(true)} className="bg-pink-500 text-white px-5 py-2 rounded-lg font-semibold">
            + Create your first program
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map((p) => (
            <div key={p.id} className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white">{p.name}</h3>
                  {p.description && <p className="text-sm text-gray-400 mt-1">{p.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="text-blue-400 hover:text-blue-300 p-1">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => del(p.id, p.name)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-sm mb-4">
                {p.timeSlots.map((time, idx) => (
                  <span key={idx} className="bg-purple-900/50 text-purple-200 px-2 py-1 rounded inline-flex items-center gap-1">
                    <Clock size={13} /> {time}
                  </span>
                ))}
                <span className="bg-indigo-900/50 text-indigo-200 px-2 py-1 rounded inline-flex items-center gap-1">
                  <CalendarCheck size={13} /> {p.timezone}
                </span>
                <span className="bg-pink-900/50 text-pink-200 px-2 py-1 rounded inline-flex items-center gap-1">
                  <Video size={13} /> {p.videoDuration}min
                </span>
                <span className="bg-blue-900/50 text-blue-200 px-2 py-1 rounded inline-flex items-center gap-1">
                  <Clock size={13} /> -{p.countdownMinutes}min countdown
                </span>
              </div>

              <div className="bg-black/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-purple-300 uppercase font-semibold mb-1">🔗 Live URL</p>
                <code className="text-purple-200 text-xs break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/sadhana/live/{p.slug}
                </code>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/admin/crm/sadhana-programs/${p.id}`}
                  className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-purple-500 flex items-center justify-center gap-2"
                >
                  <Calendar size={15} /> Manage Calendar
                </Link>
                <button
                  onClick={() => copyUrl(p.slug)}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600 flex items-center gap-1"
                >
                  <Copy size={15} />
                </button>
                <a
                  href={`/sadhana/live/${p.slug}`} target="_blank" rel="noopener noreferrer"
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600 flex items-center gap-1"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <form onSubmit={create} className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full space-y-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white">Create Program</h2>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Program Name *</label>
              <input
                required value={newProgram.name}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                placeholder="21-Day Meditation Program"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea
                value={newProgram.description}
                onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                placeholder="Daily guided meditation sessions..."
                rows={2}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Time Slots (up to 4) *</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
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
                    className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none text-sm"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Timezone *</label>
              <select
                value={newProgram.timezone}
                onChange={(e) => setNewProgram({ ...newProgram, timezone: e.target.value })}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Video Duration (min)</label>
                <input
                  type="number" min={5} max={180} value={newProgram.videoDuration}
                  onChange={(e) => setNewProgram({ ...newProgram, videoDuration: parseInt(e.target.value) || 40 })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Countdown (min before)</label>
                <input
                  type="number" min={0} max={30} value={newProgram.countdownMinutes}
                  onChange={(e) => setNewProgram({ ...newProgram, countdownMinutes: parseInt(e.target.value) || 3 })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Days of Week</label>
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
                    className={`py-2 rounded-lg text-sm font-semibold transition ${
                      (newProgram.days || [0,1,2,3,4,5,6]).includes(idx)
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Repeat Frequency</label>
                <select
                  value={newProgram.repeatFrequency || 'daily'}
                  onChange={(e) => setNewProgram({ ...newProgram, repeatFrequency: e.target.value })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newProgram.startDate}
                  onChange={(e) => setNewProgram({ ...newProgram, startDate: e.target.value })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Bot Name</label>
              <input
                type="text"
                value={newProgram.botName || ''}
                onChange={(e) => setNewProgram({ ...newProgram, botName: e.target.value })}
                placeholder="🤖 Swar Yoga Bot"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Bot Joins (min before session)</label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 5].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setNewProgram({ ...newProgram, botJoinMinutes: min })}
                    className={`py-2 rounded-lg text-sm font-semibold transition ${
                      (newProgram.botJoinMinutes || 5) === min
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="bot-automation"
                checked={newProgram.enableBotAutomation !== false}
                onChange={(e) => setNewProgram({ ...newProgram, enableBotAutomation: e.target.checked })}
                className="w-4 h-4 rounded accent-pink-500"
              />
              <label htmlFor="bot-automation" className="text-sm text-gray-300">Enable Bot Automation</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Cancel</button>
              <button type="submit" className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 text-white py-2 rounded-lg font-semibold">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <form onSubmit={update} className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full space-y-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white">Edit Program</h2>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Program Name *</label>
              <input
                required value={editProgram.name}
                onChange={(e) => setEditProgram({ ...editProgram, name: e.target.value })}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea
                value={editProgram.description}
                onChange={(e) => setEditProgram({ ...editProgram, description: e.target.value })}
                rows={2}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Time Slots (up to 4) *</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
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
                    className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none text-sm"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Timezone *</label>
              <select
                value={editProgram.timezone}
                onChange={(e) => setEditProgram({ ...editProgram, timezone: e.target.value })}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Video Duration (min)</label>
                <input
                  type="number" min={5} max={180} value={editProgram.videoDuration}
                  onChange={(e) => setEditProgram({ ...editProgram, videoDuration: parseInt(e.target.value) || 40 })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Countdown (min before)</label>
                <input
                  type="number" min={0} max={30} value={editProgram.countdownMinutes}
                  onChange={(e) => setEditProgram({ ...editProgram, countdownMinutes: parseInt(e.target.value) || 3 })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Days of Week</label>
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
                    className={`py-2 rounded-lg text-sm font-semibold transition ${
                      (editProgram.days || [0,1,2,3,4,5,6]).includes(idx)
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Repeat Frequency</label>
                <select
                  value={editProgram.repeatFrequency || 'daily'}
                  onChange={(e) => setEditProgram({ ...editProgram, repeatFrequency: e.target.value })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={editProgram.startDate}
                  onChange={(e) => setEditProgram({ ...editProgram, startDate: e.target.value })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Bot Name</label>
              <input
                type="text"
                value={editProgram.botName || ''}
                onChange={(e) => setEditProgram({ ...editProgram, botName: e.target.value })}
                placeholder="🤖 Swar Yoga Bot"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Bot Joins (min before session)</label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 5].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setEditProgram({ ...editProgram, botJoinMinutes: min })}
                    className={`py-2 rounded-lg text-sm font-semibold transition ${
                      (editProgram.botJoinMinutes || 5) === min
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="bot-automation-edit"
                checked={editProgram.enableBotAutomation !== false}
                onChange={(e) => setEditProgram({ ...editProgram, enableBotAutomation: e.target.checked })}
                className="w-4 h-4 rounded accent-pink-500"
              />
              <label htmlFor="bot-automation-edit" className="text-sm text-gray-300">Enable Bot Automation</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditingId(null)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Cancel</button>
              <button type="submit" className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 text-white py-2 rounded-lg font-semibold">Update</button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-900/90 border border-green-700 text-green-100 px-4 py-3 rounded-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
