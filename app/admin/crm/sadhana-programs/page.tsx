'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Copy, ExternalLink, Trash2 } from 'lucide-react';

interface Program {
  id: string;
  slug: string;
  name: string;
  description?: string;
  scheduleTime: string;
  timezone: string;
  videoDuration: number;
  countdownMinutes: number;
  active: boolean;
  createdAt: string;
}

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles',
  'Australia/Sydney', 'UTC',
];

export default function SadhanaProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState('');

  const [newProgram, setNewProgram] = useState({
    name: '', description: '',
    scheduleTime: '22:00',
    timezone: 'Asia/Kolkata',
    videoDuration: 40,
    countdownMinutes: 3,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/sadhana-programs');
      const data = await res.json();
      if (data.success) setPrograms(data.programs);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/crm/sadhana-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProgram),
      });
      const data = await res.json();
      if (data.success) {
        setToast('✅ Program created');
        setShowCreate(false);
        setNewProgram({ name: '', description: '', scheduleTime: '22:00', timezone: 'Asia/Kolkata', videoDuration: 40, countdownMinutes: 3 });
        load();
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) { console.error(err); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete program "${name}"? All videos will be removed.`)) return;
    await fetch(`/api/admin/crm/sadhana-programs/${id}`, { method: 'DELETE' });
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
                <button onClick={() => del(p.id, p.name)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 text-sm mb-4">
                <span className="bg-purple-900/50 text-purple-200 px-2 py-1 rounded">⏰ {p.scheduleTime}</span>
                <span className="bg-indigo-900/50 text-indigo-200 px-2 py-1 rounded">🌏 {p.timezone}</span>
                <span className="bg-pink-900/50 text-pink-200 px-2 py-1 rounded">🎥 {p.videoDuration}min</span>
                <span className="bg-blue-900/50 text-blue-200 px-2 py-1 rounded">⏱ -{p.countdownMinutes}min countdown</span>
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
          <form onSubmit={create} className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full space-y-4">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Daily Time *</label>
                <input
                  type="time" required value={newProgram.scheduleTime}
                  onChange={(e) => setNewProgram({ ...newProgram, scheduleTime: e.target.value })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
                />
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

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Cancel</button>
              <button type="submit" className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 text-white py-2 rounded-lg font-semibold">Create</button>
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
