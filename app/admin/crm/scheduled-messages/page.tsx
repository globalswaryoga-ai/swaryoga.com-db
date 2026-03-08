'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Send,
  Loader,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';

interface ScheduledMessage {
  _id: string;
  messageType: 'text' | 'template' | 'media';
  messageText?: string;
  status: 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
  scheduledFor: string;
  campaignName?: string;
  createdByName?: string;
  sentCount?: number;
  failedCount?: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
  processing: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: Loader },
  sent: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
  failed: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  cancelled: { bg: 'bg-gray-50', text: 'text-gray-700', icon: X },
};

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    messageText: '',
    messageType: 'text' as 'text' | 'template' | 'media',
    scheduledFor: '',
    campaignName: '',
  });

  useEffect(() => {
    fetchMessages();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/admin/crm/scheduled-messages', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      url.searchParams.set('limit', '50');

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data?.messages || []);
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMessage = () => {
    setEditingMessage(null);
    setFormData({
      messageText: '',
      messageType: 'text',
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // 1 hour from now
      campaignName: '',
    });
    setShowModal(true);
  };

  const handleEditMessage = (msg: ScheduledMessage) => {
    setEditingMessage(msg);
    setFormData({
      messageText: msg.messageText || '',
      messageType: msg.messageType,
      scheduledFor: new Date(msg.scheduledFor).toISOString().slice(0, 16),
      campaignName: msg.campaignName || '',
    });
    setShowModal(true);
  };

  const handleSaveMessage = async () => {
    if (!formData.messageText.trim() || !formData.scheduledFor) {
      setError('Message text and scheduled time required');
      return;
    }

    try {
      const method = editingMessage ? 'PUT' : 'POST';
      const url = editingMessage
        ? `/api/admin/crm/scheduled-messages?id=${editingMessage._id}`
        : '/api/admin/crm/scheduled-messages';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          scheduledFor: new Date(formData.scheduledFor).toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        setShowModal(false);
        setError('');
      } else {
        setError(data.error || 'Failed to save message');
      }
    } catch (err) {
      setError('Failed to save message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Cancel this scheduled message?')) return;

    try {
      const res = await fetch(`/api/admin/crm/scheduled-messages?id=${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const data = await res.json();
      if (data.success) {
        await fetchMessages();
      } else {
        setError(data.error || 'Failed to cancel message');
      }
    } catch (err) {
      setError('Failed to cancel message');
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-8 h-8 text-indigo-600" />
            Scheduled Messages
          </h1>
          <p className="text-gray-600 mt-2">Schedule WhatsApp messages to send at specific times</p>
        </div>
        <button
          onClick={handleAddMessage}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" /> Schedule Message
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'scheduled', 'sent', 'failed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg transition ${
              statusFilter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status || 'All'} ({messages.filter((m) => !status || m.status === status).length})
          </button>
        ))}
      </div>

      {/* Messages Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Campaign / Time
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No messages scheduled yet</p>
                  </td>
                </tr>
              ) : (
                messages.map((msg) => {
                  const StatusIcon = STATUS_COLORS[msg.status].icon;
                  return (
                    <tr key={msg._id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{msg.campaignName || '—'}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(msg.scheduledFor).toLocaleString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {msg.messageText?.slice(0, 100) || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[msg.status].bg} ${STATUS_COLORS[msg.status].text}`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          {msg.status}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {msg.status === 'sent' ? (
                          <div className="text-sm space-y-1">
                            <p className="text-green-700">✓ Sent: {msg.sentCount || 0}</p>
                            {msg.failedCount ? <p className="text-red-700">✗ Failed: {msg.failedCount}</p> : null}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">—</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {msg.status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => handleEditMessage(msg)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg._id)}
                                className="text-red-600 hover:text-red-700"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMessage ? 'Edit Message' : 'Schedule New Message'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Weekend Promotion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Type
                </label>
                <select
                  value={formData.messageType}
                  onChange={(e) => setFormData({ ...formData, messageType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="text">Text Message</option>
                  <option value="template">Template Message</option>
                  <option value="media">Media Message</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Text
                </label>
                <textarea
                  value={formData.messageText}
                  onChange={(e) => setFormData({ ...formData, messageText: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your message..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule For
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMessage}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
