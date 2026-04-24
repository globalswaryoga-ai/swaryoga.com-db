'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, ExternalLink, X } from 'lucide-react';

interface Program {
  id: string; slug: string; name: string; description?: string;
  scheduleTime: string; timezone: string;
  videoDuration: number; countdownMinutes: number; active: boolean;
}
interface Video { id: string; date: string; title: string; videoUrl: string; order?: number; }

function pad(n: number) { return String(n).padStart(2, '0'); }
function dateKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function getMonthMatrix(year: number, monthIdx: number): (number | null)[][] {
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const matrix: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { matrix.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [editDate, setEditDate] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', videoUrl: '' });
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/crm/sadhana-programs/${params.id}`);
    const data = await res.json();
    if (data.success) {
      setProgram(data.program);
      setVideos(data.videos);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const videosByDate = videos.reduce<Record<string, Video>>((acc, v) => { acc[v.date] = v; return acc; }, {});

  const openEditor = (dateStr: string) => {
    const existing = videosByDate[dateStr];
    setEditDate(dateStr);
    setForm({ title: existing?.title || '', videoUrl: existing?.videoUrl || '' });
  };

  const saveVideo = async () => {
    if (!editDate || !form.videoUrl.trim()) return;
    await fetch(`/api/admin/crm/sadhana-programs/${params.id}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: editDate, title: form.title.trim(), videoUrl: form.videoUrl.trim() }),
    });
    setToast('✅ Video saved');
    setEditDate(null);
    load();
    setTimeout(() => setToast(''), 2500);
  };

  const removeVideo = async () => {
    if (!editDate) return;
    if (!confirm(`Remove video for ${editDate}?`)) return;
    await fetch(`/api/admin/crm/sadhana-programs/${params.id}/videos?date=${editDate}`, { method: 'DELETE' });
    setToast('🗑️ Video removed');
    setEditDate(null);
    load();
    setTimeout(() => setToast(''), 2500);
  };

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!program) return <div className="p-6 text-red-400">Program not found</div>;

  const year = cursor.getFullYear();
  const monthIdx = cursor.getMonth();
  const monthName = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });
  const matrix = getMonthMatrix(year, monthIdx);

  const liveUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/sadhana/live/${program.slug}`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href="/admin/crm/sadhana-programs" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm w-fit">
          <ArrowLeft size={16} /> Back to programs
        </Link>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl p-5 mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">{program.name}</h1>
        {program.description && <p className="text-purple-200 text-sm mb-3">{program.description}</p>}

        <div className="flex flex-wrap gap-2 text-sm mb-4">
          <span className="bg-black/30 text-purple-200 px-2 py-1 rounded">⏰ Daily at {program.scheduleTime}</span>
          <span className="bg-black/30 text-indigo-200 px-2 py-1 rounded">🌏 {program.timezone}</span>
          <span className="bg-black/30 text-pink-200 px-2 py-1 rounded">🎥 {program.videoDuration}min video</span>
          <span className="bg-black/30 text-blue-200 px-2 py-1 rounded">⏱ {program.countdownMinutes}min countdown</span>
        </div>

        <div className="bg-black/40 rounded-lg p-3 flex items-center gap-2">
          <code className="flex-1 text-purple-200 text-sm break-all">{liveUrl}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(liveUrl);
              setToast('📋 URL copied');
              setTimeout(() => setToast(''), 2000);
            }}
            className="bg-pink-500 text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-pink-400 flex items-center gap-1"
          >
            <Copy size={14} /> Copy
          </button>
          <a
            href={liveUrl} target="_blank" rel="noopener noreferrer"
            className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-600 flex items-center gap-1"
          >
            <ExternalLink size={14} /> Preview
          </a>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">📅 Video Calendar</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => setCursor(new Date(year, monthIdx - 1, 1))} className="text-gray-300 hover:text-white p-1">
              <ChevronLeft size={20} />
            </button>
            <span className="text-white font-semibold min-w-[140px] text-center">{monthName}</span>
            <button onClick={() => setCursor(new Date(year, monthIdx + 1, 1))} className="text-gray-300 hover:text-white p-1">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-gray-400 text-xs uppercase py-2 font-semibold">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {matrix.flat().map((day, i) => {
            if (day === null) return <div key={i} className="aspect-square" />;
            const key = dateKey(year, monthIdx, day);
            const video = videosByDate[key];
            const today = new Date();
            const isToday = today.getFullYear() === year && today.getMonth() === monthIdx && today.getDate() === day;
            return (
              <button
                key={i}
                onClick={() => openEditor(key)}
                className={`aspect-square p-2 rounded-lg border text-left transition flex flex-col ${
                  video
                    ? 'bg-gradient-to-br from-purple-700/50 to-pink-700/50 border-purple-500/50 hover:from-purple-700/70 hover:to-pink-700/70'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                } ${isToday ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <div className={`text-sm font-semibold ${video ? 'text-white' : 'text-gray-300'}`}>{day}</div>
                {video ? (
                  <div className="flex-1 mt-1 overflow-hidden">
                    <div className="text-[10px] text-purple-200 line-clamp-2">{video.title || '🎥 Video set'}</div>
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-500 mt-1">+ Add video</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gradient-to-br from-purple-700 to-pink-700 rounded"></span> Video scheduled</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-800 border border-gray-700 rounded"></span> Empty (click to add)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-yellow-400 rounded"></span> Today</span>
        </div>
      </div>

      {/* Edit Modal */}
      {editDate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Video for {editDate}</h3>
              <button onClick={() => setEditDate(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Title (optional)</label>
              <input
                type="text" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Day 1 - Introduction to breath"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Bunny Video URL *</label>
              <input
                type="url" required value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="https://player.mediadelivery.net/play/638748/..."
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {videosByDate[editDate] && (
                <button onClick={removeVideo} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-500">
                  Remove
                </button>
              )}
              <button onClick={() => setEditDate(null)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg text-sm">
                Cancel
              </button>
              <button onClick={saveVideo} className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 text-white py-2 rounded-lg font-semibold text-sm">
                Save
              </button>
            </div>
          </div>
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
