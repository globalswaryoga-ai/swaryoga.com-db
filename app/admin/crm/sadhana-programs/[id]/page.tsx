 'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, ExternalLink, X, Pencil, Trash2, Users, MessageCircle, Clock, Video, CalendarCheck } from 'lucide-react';

interface Program {
  id: string; slug: string; name: string; description?: string;
  timeSlots: string[]; timezone: string;
  videoDuration: number; countdownMinutes: number; active: boolean;
  playerMode?: string; playerUrl?: string;
  botName?: string; botJoinMinutes?: number; enableBotAutomation?: boolean;
}
interface Video { id: string; date: string; title: string; videoUrl: string; hlsUrl?: string; order?: number; }
interface LiveStats {
  activeParticipants: number;
  chatMessages24h: number;
}

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
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [editDate, setEditDate] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', videoUrl: '', hlsUrl: '' });
  const [toast, setToast] = useState('');
  const [editingProgram, setEditingProgram] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', timeSlots: ['', '', '', ''], timezone: 'Asia/Kolkata', videoDuration: 40, countdownMinutes: 3, playerMode: 'player', playerUrl: '', botName: '', botJoinMinutes: 5, enableBotAutomation: true });
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [chatCount, setChatCount] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>('offline');
  const [participants, setParticipants] = useState<Array<{ name: string; joinedAt: string }>>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; name: string; message: string; createdAt: string }>>([]);
  const [showJoinedModal, setShowJoinedModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedDateForParticipants, setSelectedDateForParticipants] = useState<string | null>(null);
  const [participantsBySlot, setParticipantsBySlot] = useState<Record<string, any[]>>({});
  const [unlistedParticipants, setUnlistedParticipants] = useState<any[]>([]);
  const [participantCountsByDate, setParticipantCountsByDate] = useState<Record<string, number>>({});
  const [selectedDateForChat, setSelectedDateForChat] = useState<string | null>(null);
  const [selectedTimeSlotForChat, setSelectedTimeSlotForChat] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/crm/sadhana-programs/${params.id}`);
    const data = await res.json();
    if (data.success) {
      setProgram(data.program);
      setVideos(data.videos);
      setLiveStats(data.liveStats || null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  useEffect(() => {
    if (!program?.slug) return;
    fetchParticipantCountsForMonth(cursor.getFullYear(), cursor.getMonth());
  }, [cursor, program?.slug]);

  useEffect(() => {
    if (!program?.slug) return;
    const fetchLiveStats = async () => {
      try {
        const res = await fetch(`/api/sadhana/live/${program.slug}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: 'admin-stats' }),
        });
        const data = await res.json();
        if (data.success) {
          setLiveCount(typeof data.count === 'number' ? data.count : null);
          setChatCount(Array.isArray(data.chat) ? data.chat.length : null);
          setLiveStatus(data.session?.status || 'offline');
          setParticipants(Array.isArray(data.todaysParticipants) ? data.todaysParticipants :
                         Array.isArray(data.participants) ? data.participants : []);
          setChatMessages(Array.isArray(data.chat) ? data.chat : []);
        }
      } catch (err) {
        console.error('Failed to fetch sadhana live stats', err);
      }
    };
    fetchLiveStats();
  }, [program?.slug]);

  const videosByDate = videos.reduce<Record<string, Video>>((acc, v) => { acc[v.date] = v; return acc; }, {});

  const fetchParticipantsByDate = async (dateStr: string) => {
    if (!program?.slug) return;
    try {
      const res = await fetch(`/api/sadhana/live/${program.slug}/participants-by-date?date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setSelectedDateForParticipants(dateStr);
        setParticipantsBySlot(data.participantsBySlot || {});
        setUnlistedParticipants(data.unlistedParticipants || []);
        setShowJoinedModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }
  };

  const fetchParticipantCountsForMonth = async (year: number, monthIdx: number) => {
    if (!program?.slug) return;
    // Use the batch endpoint (1 request instead of 31)
    try {
      const month = monthIdx + 1; // Convert 0-indexed to 1-indexed
      const res = await fetch(`/api/sadhana/live/${program.slug}/participants-by-month?year=${year}&month=${month}`);
      if (!res.ok) {
        console.warn(`[Sadhana Calendar] Batch fetch failed: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.success && data.countsByDate) {
        setParticipantCountsByDate(data.countsByDate);
      }
    } catch (err) {
      console.error('Failed to fetch participant counts:', err);
    }
  };

  const fetchChatByDate = async (dateStr: string, timeSlot?: string) => {
    if (!program?.slug) return;
    try {
      const url = new URL(`/api/sadhana/live/${program.slug}/chat-by-date`, window.location.origin);
      url.searchParams.set('date', dateStr);
      if (timeSlot) url.searchParams.set('timeSlot', timeSlot);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setSelectedDateForChat(dateStr);
        setSelectedTimeSlotForChat(timeSlot || null);
        setChatMessages(data.messages || []);
        setShowChatModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    }
  };

  const openEditor = (dateStr: string) => {
    const existing = videosByDate[dateStr];
    setEditDate(dateStr);
    setForm({ title: existing?.title || '', videoUrl: existing?.videoUrl || '', hlsUrl: existing?.hlsUrl || '' });
  };

  const saveVideo = async () => {
    if (!editDate || (!form.videoUrl.trim() && !form.hlsUrl.trim())) return;
    await fetch(`/api/admin/crm/sadhana-programs/${params.id}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: editDate,
        title: form.title.trim(),
        videoUrl: form.videoUrl.trim() || null,
        hlsUrl: form.hlsUrl.trim() || null
      }),
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

  const openProgramEdit = () => {
    if (!program) return;
    const slots = [...program.timeSlots];
    while (slots.length < 4) slots.push('');
    setEditForm({
      name: program.name,
      description: program.description || '',
      timeSlots: slots.slice(0, 4),
      timezone: program.timezone,
      videoDuration: program.videoDuration,
      countdownMinutes: program.countdownMinutes,
      playerMode: program.playerMode || 'player',
      playerUrl: program.playerUrl || '',
      botName: program.botName || '🤖 Swar Yoga Bot',
      botJoinMinutes: program.botJoinMinutes || 5,
      enableBotAutomation: program.enableBotAutomation !== false,
    });
    setEditingProgram(true);
  };

  const updateProgram = async () => {
    if (!program) return;
    const timeSlots = editForm.timeSlots.filter(t => t.trim());
    if (!timeSlots.length) {
      setToast('⚠️ Add at least one time slot');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    try {
      const res = await fetch(`/api/admin/crm/sadhana-programs/${program.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, timeSlots }),
      });
      const data = await res.json();
      if (data.success) {
        setToast('✅ Program updated');
        setEditingProgram(false);
        load();
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) { console.error(err); }
  };

  const deleteProgram = async () => {
    if (!program) return;
    if (!confirm(`Delete program "${program.name}"? All videos will be removed.`)) return;
    try {
      await fetch(`/api/admin/crm/sadhana-programs/${program.id}`, { method: 'DELETE' });
      setToast('🗑️ Program deleted');
      setTimeout(() => router.push('/admin/crm/sadhana-programs'), 1500);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!program) return <div className="p-6 text-red-400">Program not found</div>;

  const year = cursor.getFullYear();
  const monthIdx = cursor.getMonth();
  const monthName = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });
  const matrix = getMonthMatrix(year, monthIdx);

  const liveUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/sadhana/live/${program.slug}`;

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto min-h-screen bg-gray-900">
      <div className="mb-4">
        <Link href="/admin/crm/sadhana-programs" className="text-gray-400 hover:text-white flex items-center gap-1 text-xs sm:text-sm w-fit">
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      <div className="bg-gradient-to-br from-purple-800 to-pink-800 border border-purple-400 rounded-lg sm:rounded-xl p-3 sm:p-5 mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:gap-4 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white mb-1">{program.name}</h1>
              {program.description && <p className="text-purple-50 text-xs sm:text-sm line-clamp-2">{program.description}</p>}
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-black/40 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-gray-200 border border-white/10">
                <span className="inline-flex items-center gap-1"><Users size={10} /> {liveStatus === 'live' ? 'Live now' : liveStatus === 'countdown' ? 'Starting soon' : liveStatus === 'waiting' ? 'Waiting' : 'Offline'}</span>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-1 flex-shrink-0">
              <button onClick={openProgramEdit} className="text-blue-300 hover:text-blue-200 p-2 sm:p-1 hover:bg-blue-900/20 rounded">
                <Pencil size={16} />
              </button>
              <button onClick={deleteProgram} className="text-red-300 hover:text-red-200 p-2 sm:p-1 hover:bg-red-900/20 rounded">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm mb-3 sm:mb-4">
          {program.timeSlots.map((time, idx) => (
            <span key={idx} className="bg-black/50 text-purple-100 px-2 py-1 rounded inline-flex items-center gap-1">
              <Clock size={14} /> {time}
            </span>
          ))}
          <span className="bg-black/50 text-indigo-100 px-2 py-1 rounded inline-flex items-center gap-1">
            <CalendarCheck size={14} /> {program.timezone}
          </span>
          <span className="bg-black/50 text-pink-100 px-2 py-1 rounded inline-flex items-center gap-1">
            <Video size={14} /> {program.videoDuration}min
          </span>
          <span className="bg-black/50 text-blue-100 px-2 py-1 rounded inline-flex items-center gap-1">
            <Clock size={14} /> -{program.countdownMinutes}m countdown
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 text-sm">
          <div className="bg-white/5 rounded-lg p-3 flex items-center gap-2 border border-white/10">
            <Users size={16} className="text-white" />
            <div>
              <div className="text-xs uppercase text-gray-400">Joined</div>
              <div className="font-semibold text-white">{liveCount !== null ? liveCount : '—'}</div>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 flex items-center gap-2 border border-white/10">
            <Clock size={16} className="text-white" />
            <div>
              <div className="text-xs uppercase text-gray-400">Duration</div>
              <div className="font-semibold text-white">{program.videoDuration} min</div>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 flex items-center gap-2 border border-white/10">
            <MessageCircle size={16} className="text-white" />
            <div>
              <div className="text-xs uppercase text-gray-400">Chat</div>
              <div className="font-semibold text-white">{chatCount !== null ? chatCount : '—'}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mb-4">
          <div className="bg-black/60 rounded-lg p-3 flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Live session</span>
            <span className="text-3xl font-bold text-white">{liveStats ? liveStats.activeParticipants : '—'}</span>
            <span className="text-sm text-gray-300">Currently joined</span>
          </div>
          <div className="bg-black/60 rounded-lg p-3 flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Recent chat</span>
            <span className="text-3xl font-bold text-white">{liveStats ? liveStats.chatMessages24h : '—'}</span>
            <span className="text-sm text-gray-300">Messages in last 24 hours</span>
          </div>
          <div className="bg-black/60 rounded-lg p-3 flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Program URL</span>
            <code className="text-purple-100 text-sm break-all">{liveUrl}</code>
          </div>
        </div>
        <div className="bg-black/60 rounded-lg p-3 flex items-center gap-2">
          <code className="flex-1 text-purple-100 text-sm break-all">{liveUrl}</code>
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
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-5">
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
                <div className="flex items-start justify-between gap-2">
                  <div className={`text-sm font-semibold ${video ? 'text-white' : 'text-gray-300'}`}>{day}</div>
                  {video && <Video size={12} className="text-yellow-300 mt-1" />}
                </div>
                {video ? (
                  <div className="flex-1 mt-1 overflow-hidden">
                    <div className="text-[10px] text-purple-200 line-clamp-2">{video.title || 'Video scheduled'}</div>
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                    <span className="text-yellow-300">+</span> Add video
                  </div>
                )}
                {(participantCountsByDate[key] !== undefined || liveStats) && (
                  <div className="mt-2 space-y-1 text-[10px]">
                    <div className="text-sky-200 flex items-center gap-1 cursor-pointer hover:text-sky-100">
                      <span>👥 {isToday ? (liveStats?.activeParticipants || 0) : (participantCountsByDate[key] !== undefined ? participantCountsByDate[key] : 0)} joined</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fetchParticipantsByDate(key);
                        }}
                        className="p-1 hover:bg-sky-500/20 rounded transition"
                        title="View joined users for this date"
                      >
                        👁️
                      </button>
                    </div>
                    {(isToday || day === parseInt(editDate?.split('-')[2] || '')) && liveStats && (
                      <div className="text-emerald-200 flex items-center gap-2">
                        <span>💬 {liveStats.chatMessages24h} chat</span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fetchChatByDate(key);
                          }}
                          className="p-1 hover:bg-emerald-500/20 rounded transition"
                          title="View chat messages for this date"
                        >
                          👁️
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm(`Delete all chats for ${editDate}?`)) {
                              console.log('Delete chats for', editDate);
                            }
                          }}
                          className="p-1 hover:bg-red-500/20 rounded transition"
                          title="Delete chats"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Video size={12} className="text-yellow-300" /> Video scheduled</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-800 border border-gray-700 rounded"></span> Empty (click to add)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-yellow-400 rounded"></span> Today</span>
        </div>
      </div>

      {/* Edit Modal */}
      {editDate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Video for {editDate}</h3>
              <button onClick={() => setEditDate(null)} className="text-gray-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-100 mb-1">Title (optional)</label>
                <input
                  type="text" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Day 1 - Introduction to breath"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-100 mb-1">
                  Player URL (for Player Mode)
                  {form.hlsUrl && <span className="text-gray-500 text-xs ml-2">← Clear HLS to enable</span>}
                </label>
                <input
                  type="url" value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value, hlsUrl: '' })}
                  disabled={!!form.hlsUrl}
                  placeholder="https://player.mediadelivery.net/play/638748/..."
                  className={`w-full px-3 py-2 rounded-lg border outline-none text-sm ${
                    form.hlsUrl
                      ? 'bg-gray-600 text-gray-400 border-gray-700 cursor-not-allowed'
                      : 'bg-gray-700 text-white border-gray-600 focus:border-pink-400'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-100 mb-1">
                  HLS URL (for HLS Mode)
                  {form.videoUrl && <span className="text-gray-500 text-xs ml-2">← Clear Player to enable</span>}
                </label>
                <input
                  type="url" value={form.hlsUrl}
                  onChange={(e) => setForm({ ...form, hlsUrl: e.target.value, videoUrl: '' })}
                  disabled={!!form.videoUrl}
                  placeholder="https://vz-fdeab82b-805.b-cdn.net/...playlist.m3u8"
                  className={`w-full px-3 py-2 rounded-lg border outline-none text-sm ${
                    form.videoUrl
                      ? 'bg-gray-600 text-gray-400 border-gray-700 cursor-not-allowed'
                      : 'bg-gray-700 text-white border-gray-600 focus:border-pink-400'
                  }`}
                />
              </div>
            </div>

            <div className="border-t border-gray-700 p-6 flex gap-2">
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

      {editingProgram && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Edit Program</h3>
              <button onClick={() => setEditingProgram(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">

            <div>
              <label className="block text-sm text-gray-100 mb-1">Program Name *</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-100 mb-1">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-100 mb-2">Time Slots (up to 4) *</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {editForm.timeSlots.map((time, idx) => (
                  <input
                    key={idx}
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const slots = [...editForm.timeSlots];
                      slots[idx] = e.target.value;
                      setEditForm({ ...editForm, timeSlots: slots });
                    }}
                    className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none text-sm"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-100 mb-1">Timezone *</label>
              <select
                value={editForm.timezone}
                onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none"
              >
                {['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC'].map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-100 mb-1">Video Duration (min)</label>
                <input
                  type="number" min={5} max={180} value={editForm.videoDuration}
                  onChange={(e) => setEditForm({ ...editForm, videoDuration: parseInt(e.target.value) || 40 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-100 mb-1">Countdown (min)</label>
                <input
                  type="number" min={0} max={30} value={editForm.countdownMinutes}
                  onChange={(e) => setEditForm({ ...editForm, countdownMinutes: parseInt(e.target.value) || 3 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-100 mb-1">Player Mode *</label>
              <select
                value={editForm.playerMode}
                onChange={(e) => setEditForm({ ...editForm, playerMode: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none"
              >
                <option value="player">🎬 Player Mode (Embedded Bunny Player)</option>
                <option value="hls">📡 HLS Mode (Live Streaming)</option>
              </select>
            </div>

            {editForm.playerMode === 'hls' && (
              <div>
                <label className="block text-sm text-gray-100 mb-1">HLS Playlist URL</label>
                <input
                  type="url" value={editForm.playerUrl}
                  onChange={(e) => setEditForm({ ...editForm, playerUrl: e.target.value })}
                  placeholder="https://vz-...cdn.net/...playlist.m3u8"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none text-sm"
                />
              </div>
            )}

              <div className="border-t border-gray-600 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-purple-300 mb-3">🤖 Bot Settings</h3>

                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={editForm.enableBotAutomation}
                    onChange={(e) => setEditForm({ ...editForm, enableBotAutomation: e.target.checked })}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  <label className="text-sm text-gray-100">Enable Bot Auto-Join</label>
                </div>

                {editForm.enableBotAutomation && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-100 mb-1">Bot Name</label>
                      <input
                        type="text" value={editForm.botName}
                        onChange={(e) => setEditForm({ ...editForm, botName: e.target.value })}
                        placeholder="🤖 Swar Yoga Bot"
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none text-sm"
                      />
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm text-gray-100 mb-1">Bot Join Minutes Before Session</label>
                      <input
                        type="number" min={0} max={30} value={editForm.botJoinMinutes}
                        onChange={(e) => setEditForm({ ...editForm, botJoinMinutes: parseInt(e.target.value) || 5 })}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-pink-400 outline-none text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">Default: 5 minutes before countdown</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-gray-700 p-6 flex gap-2">
              <button onClick={() => setEditingProgram(false)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={updateProgram} className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 text-white py-2 rounded-lg font-semibold">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Joined Users Modal */}
      {showJoinedModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-white">👥 Joined Users</h3>
                {selectedDateForParticipants && (
                  <p className="text-xs text-gray-400 mt-1">{new Date(selectedDateForParticipants).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                )}
              </div>
              <button onClick={() => setShowJoinedModal(false)} className="text-gray-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {Object.keys(participantsBySlot).length === 0 ? (
                <p className="text-gray-400 text-center py-8">No users joined during a scheduled session on this date</p>
              ) : (
                <div className="space-y-4">
                  {program?.timeSlots.map((timeSlot) => {
                    const usersInSlot = participantsBySlot[timeSlot] || [];

                    if (usersInSlot.length === 0) return null;

                    return (
                      <div key={timeSlot}>
                        <div className="text-sm font-semibold text-purple-300 mb-2 flex items-center justify-between">
                          <span>🕐 {timeSlot} Session ({usersInSlot.length})</span>
                          <button
                            onClick={() => fetchChatByDate(selectedDateForParticipants || '', timeSlot)}
                            className="text-xs bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded transition"
                            title="View chat for this session"
                          >
                            💬 Chat
                          </button>
                        </div>
                        <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-lg p-3 space-y-2">
                          {usersInSlot.map((user, idx) => (
                            <div key={idx} className="text-sm text-gray-200 flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-purple-500 flex-shrink-0"></span>
                              <span className="truncate font-medium flex-1">{user.name}</span>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {user.joinTime}{user.leaveTime ? ` – ${user.leaveTime}` : ''}
                              </span>
                              {user.duration != null && (
                                <span className="text-xs text-emerald-400 flex-shrink-0 font-semibold">
                                  {user.duration}m
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 p-6">
              <button onClick={() => setShowJoinedModal(false)} className="w-full bg-gray-700 text-white py-2 rounded-lg text-sm hover:bg-gray-600">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-white">💬 Chat Messages ({chatMessages.length})</h3>
                {selectedDateForChat && (
                  <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                    <p>{new Date(selectedDateForChat).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    {selectedTimeSlotForChat && <p>🕐 {selectedTimeSlotForChat} Session</p>}
                  </div>
                )}
              </div>
              <button onClick={() => setShowChatModal(false)} className="text-gray-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {chatMessages.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No chat messages yet</p>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="bg-gradient-to-r from-gray-700/40 to-gray-700/20 border border-gray-600/30 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-sm font-semibold text-emerald-300">{msg.name}</div>
                        <div className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                      <p className="text-sm text-gray-100 break-words leading-relaxed">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 p-6">
              <button onClick={() => setShowChatModal(false)} className="w-full bg-gray-700 text-white py-2 rounded-lg text-sm hover:bg-gray-600">
                Close
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
