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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sadhana-chat');
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
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
    try {
      const res = await fetch('/api/admin/sadhana-chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setToast('🗑️ Message deleted');
        setMessages(messages.filter((m) => m.id !== id));
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
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return <div className="p-6 text-gray-400">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link href="/admin/crm/sadhana-programs" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm w-fit mb-6">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl p-6 mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">💬 Sadhana Live Chat Messages</h1>
        <p className="text-purple-200 text-sm">View and manage all chat messages from Sadhana Live sessions</p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, message, or program..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-pink-500 outline-none"
        />
        <p className="text-xs text-gray-400 mt-2">Total messages: {messages.length} • Filtered: {filteredMessages.length}</p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-800/50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Program</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Message</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Time</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    {filter ? 'No messages match your search' : 'No messages yet'}
                  </td>
                </tr>
              ) : (
                filteredMessages.map((msg) => (
                  <tr key={msg.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition">
                    <td className="px-6 py-4 text-sm text-purple-200">{msg.programSlug}</td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{msg.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-md truncate">{msg.message}</td>
                    <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(msg.createdAt)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="text-red-400 hover:text-red-300 transition p-1"
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
        <div className="fixed bottom-4 right-4 bg-green-900/90 border border-green-700 text-green-100 px-4 py-3 rounded-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
