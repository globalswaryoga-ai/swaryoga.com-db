'use client';

import { useAuth } from '@/hooks/useAuth';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  programSlug: string;
  name: string;
  message: string;
  createdAt: string;
}

export default function SadhanaChatPage() {
  const token = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('');

  const getEffectiveToken = () => {
    return token || (typeof window !== 'undefined' ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '') : '');
  };

  const load = async () => {
    setLoading(true);
    const activeToken = getEffectiveToken();
    try {
      const res = await fetch('/api/admin/sadhana-chat', {
        headers: activeToken ? { Authorization: `Bearer ${activeToken.trim().replace(/^Bearer\s+/i, '')}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deleteMessage = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    const activeToken = getEffectiveToken();
    try {
      const res = await fetch('/api/admin/sadhana-chat', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken.trim().replace(/^Bearer\s+/i, '')}` } : {}),
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setToast('🗑️ Message deleted');
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMessages = messages.filter(
    (m) =>
      m.name.toLowerCase().includes(filter.toLowerCase()) ||
      m.message.toLowerCase().includes(filter.toLowerCase()) ||
      m.programSlug.toLowerCase().includes(filter.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const uniqueSenders = new Set(messages.map(m => m.name.toLowerCase().trim())).size;
  const uniquePrograms = new Set(messages.map(m => m.programSlug.toLowerCase().trim())).size;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 font-medium">Loading chat messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Gradient Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Link href="/admin/crm/sadhana-programs" className="text-slate-500 hover:text-slate-800 transition mr-1">
                <ArrowLeft size={18} />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">💬 Sadhana Live Chat</h1>
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                Live Feed
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">Monitor, review and moderate student live chat messages during Sadhana sessions.</p>
          </div>
          <button
            onClick={load}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer"
          >
            Refresh Messages
          </button>
        </div>

        {/* 4 Colorful Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-xs">
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider block">Total Messages</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{messages.length}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Stored chat entries</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-pink-200/80 shadow-xs">
            <span className="text-xs font-semibold text-pink-600 uppercase tracking-wider block">Active Participants</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{uniqueSenders}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Unique commentators</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Active Programs</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{uniquePrograms}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">With chat activity</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Moderation</span>
            <span className="text-lg font-black text-emerald-700 mt-1 block">Live & Active</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">One-click remove</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <input
            type="text"
            placeholder="Search by participant name, message content, or program slug..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 focus:bg-white outline-none text-sm transition"
          />
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-1">
            <span>Showing <strong>{filteredMessages.length}</strong> of <strong>{messages.length}</strong> messages</span>
            {filter && (
              <button onClick={() => setFilter('')} className="text-purple-600 font-semibold hover:underline">
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Messages Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="px-6 py-3.5">Program</th>
                  <th className="px-6 py-3.5">Participant</th>
                  <th className="px-6 py-3.5">Message</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {filter ? 'No messages match your search filter' : 'No live chat messages recorded yet'}
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4">
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 font-mono text-xs px-2.5 py-1 rounded-md font-semibold">
                          {msg.programSlug}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{msg.name}</td>
                      <td className="px-6 py-4 text-slate-700 max-w-lg break-words leading-relaxed">{msg.message}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(msg.createdAt)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete message"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-4 right-4 bg-slate-900 text-white border border-slate-800 px-4 py-3 rounded-xl shadow-2xl z-50 text-sm font-semibold">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
