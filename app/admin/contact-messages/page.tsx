'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, LogOut, Menu, X, Download, Eye } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status?: string;
  isRead: boolean;
  createdAt: string;
}

export default function ContactMessages() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');

    if (!adminToken) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      fetchMessages();
    }
  }, [router]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/contacts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to fetch contact messages');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Subject', 'Message', 'Status', 'Date'].join(','),
      ...messages.map(msg =>
        [msg.name, msg.email, msg.subject, msg.message.replace(/,/g, ';'), msg.isRead ? 'Read' : 'Unread', new Date(msg.createdAt).toLocaleDateString()].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact_messages.csv';
    a.click();
  };

  const handleViewMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplyMessage('');
    if (!msg.isRead) {
      handleMarkAsRead(msg._id);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyMessage.trim()) return;

    setSubmitting(true);
    const adminToken = localStorage.getItem('adminToken');

    try {
      const response = await fetch('/api/admin/reply-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          contactId: selectedMessage._id,
          userEmail: selectedMessage.email,
          subject: `Re: ${selectedMessage.subject}`,
          reply: replyMessage,
        }),
      });

      if (response.ok) {
        alert('Reply sent successfully!');
        setReplyMessage('');
        setSelectedMessage(null);
        // Refresh messages
        fetchMessages();
      } else {
        const error = await response.json();
        alert('Failed to send reply: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    // Update in state
    setMessages(messages.map(msg => 
      msg._id === id ? { ...msg, isRead: true } : msg
    ));
    if (selectedMessage?._id === id) {
      setSelectedMessage({ ...selectedMessage, isRead: true });
    }
  };

  // Filter messages by search query
  const filteredMessages = messages.filter((msg) => {
    const query = searchQuery.toLowerCase();
    return (
      msg.name.toLowerCase().includes(query) ||
      msg.email.toLowerCase().includes(query) ||
      (msg.phone && msg.phone.includes(query))
    );
  });

  // Mark all selected messages as read
  const handleMarkAllRead = () => {
    if (selectedIds.size === 0) return;
    if (!confirm('Mark selected messages as read?')) return;
    setMessages(messages.map(msg => 
      selectedIds.has(msg._id) ? { ...msg, isRead: true } : msg
    ));
    setSelectedIds(new Set());
  };

  // Mark all selected messages as unread
  const handleMarkAllUnread = () => {
    if (selectedIds.size === 0) return;
    if (!confirm('Mark selected messages as unread?')) return;
    setMessages(messages.map(msg => 
      selectedIds.has(msg._id) ? { ...msg, isRead: false } : msg
    ));
    setSelectedIds(new Set());
  };

  // Delete all selected messages
  const handleDeleteAll = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} message(s)? This cannot be undone.`)) return;
    try {
      const adminToken = localStorage.getItem('adminToken');
      for (const id of selectedIds) {
        await fetch(`/api/admin/contacts/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        });
      }
      setMessages(messages.filter(m => !selectedIds.has(m._id)));
      setSelectedIds(new Set());
      setSelectedMessage(null);
      alert('Messages deleted successfully!');
    } catch (err) {
      console.error('Error deleting messages:', err);
      alert('Error deleting messages');
    }
  };

  // Archive all selected messages
  const handleArchiveAll = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Archive ${selectedIds.size} message(s)?`)) return;
    try {
      setMessages(messages.map(msg => 
        selectedIds.has(msg._id) ? { ...msg, status: 'archived' } : msg
      ));
      setSelectedIds(new Set());
      setSelectedMessage(null);
      alert('Messages archived successfully!');
    } catch (err) {
      console.error('Error archiving messages:', err);
    }
  };

  // Toggle selection of a message
  const toggleSelectMessage = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select/deselect all filtered messages
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMessages.map(m => m._id)));
    }
  };

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-swar-primary-light">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg bg-swar-primary-light hover:bg-swar-primary-light"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <h1 className="text-2xl font-bold text-swar-text flex items-center space-x-2">
                <MessageSquare className="h-8 w-8 text-orange-600" />
                <span>Contact Messages</span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors flex items-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-swar-primary-light text-red-600 hover:bg-red-200 transition-colors"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - Split View */}
        <main className="flex-1 overflow-hidden flex gap-6 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 flex-1">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex-1">
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-swar-bg border border-swar-border rounded-lg p-8 text-center flex-1">
              <MessageSquare className="h-12 w-12 text-swar-text-secondary mx-auto mb-4" />
              <p className="text-swar-text-secondary text-lg">No contact messages yet</p>
            </div>
          ) : (
            <>
              {/* Messages List - Left Column */}
              <div className="w-80 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                {/* Header with Title */}
                <div className="bg-swar-primary-light px-4 py-3 border-b border-swar-border">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-swar-text">Messages ({filteredMessages.length})</p>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === filteredMessages.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-swar-border"
                      />
                      <span className="text-xs font-semibold text-swar-text">
                        {selectedIds.size > 0 ? `${selectedIds.size}` : 'All'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Search Box */}
                <div className="px-4 py-3 border-b border-swar-border">
                  <input
                    type="text"
                    placeholder="Search by name, email, or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm text-swar-text placeholder-swar-text-secondary focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  />
                </div>

                {/* Action Buttons */}
                <div className="px-4 py-3 border-b border-swar-border bg-gray-50 flex flex-col gap-2">
                  {selectedIds.size > 0 && (
                    <div className="text-xs font-semibold text-swar-text bg-blue-50 px-2 py-1 rounded-lg">
                      {selectedIds.size} message(s) selected
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <select
                      onChange={(e) => {
                        if (e.target.value === 'read') handleMarkAllRead();
                        else if (e.target.value === 'unread') handleMarkAllUnread();
                        e.target.value = '';
                      }}
                      disabled={selectedIds.size === 0}
                      className="flex-1 px-2 py-1 border border-swar-border rounded-lg text-xs font-semibold text-swar-text bg-white focus:outline-none disabled:opacity-50"
                    >
                      <option value="">Mark Selected...</option>
                      <option value="read">Mark Read</option>
                      <option value="unread">Mark Unread</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleArchiveAll}
                      disabled={selectedIds.size === 0}
                      className="flex-1 px-2 py-1 bg-yellow-100 text-yellow-900 rounded-lg text-xs font-semibold hover:bg-yellow-200 disabled:opacity-50 transition-colors"
                    >
                      Archive ({selectedIds.size})
                    </button>
                    <button
                      onClick={handleDeleteAll}
                      disabled={selectedIds.size === 0}
                      className="flex-1 px-2 py-1 bg-red-100 text-red-900 rounded-lg text-xs font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                    >
                      Delete ({selectedIds.size})
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredMessages.length === 0 ? (
                    <div className="px-4 py-8 text-center text-swar-text-secondary text-sm">
                      No messages found
                    </div>
                  ) : (
                    filteredMessages.map((msg) => (
                      <button
                        key={msg._id}
                        onClick={() => handleViewMessage(msg)}
                        className={`w-full text-left px-4 py-3 border-b border-swar-border transition-colors ${
                          selectedMessage?._id === msg._id
                            ? 'bg-blue-50 border-l-4 border-l-swar-primary'
                            : selectedIds.has(msg._id)
                            ? 'bg-blue-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(msg._id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectMessage(msg._id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-swar-border flex-shrink-0 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-swar-text truncate">{msg.name}</p>
                            <p className="text-xs text-swar-text-secondary truncate">{msg.subject}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(msg.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!msg.isRead && (
                            <div className="ml-2 w-3 h-3 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                      </div>
                    </button>
                    ))
                  )}
                </div>

                <div className="bg-swar-bg border-t border-swar-border px-4 py-3">
                  <p className="text-xs text-swar-text-secondary">
                    Unread: {messages.filter(m => !m.isRead).length}
                  </p>
                </div>
              </div>

              {/* Chat View - Right Column */}
              {selectedMessage ? (
                <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                  {/* Chat Header */}
                  <div className="bg-swar-primary-light px-6 py-4 border-b border-swar-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-swar-text">{selectedMessage.name}</h2>
                        <p className="text-sm text-swar-text-secondary">{selectedMessage.email}</p>
                        {selectedMessage.phone && (
                          <p className="text-sm text-swar-text-secondary">{selectedMessage.phone}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          selectedMessage.isRead 
                            ? 'bg-white text-swar-text' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedMessage.isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                    {/* Original Message */}
                    <div className="flex gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {selectedMessage.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg px-4 py-3">
                          <p className="text-sm font-semibold text-swar-text mb-1">{selectedMessage.subject}</p>
                          <p className="text-sm text-swar-text whitespace-pre-wrap">{selectedMessage.message}</p>
                        </div>
                        <p className="text-xs text-swar-text-secondary mt-1">
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* TODO: Display existing replies here */}
                  </div>

                  {/* Reply Form */}
                  <div className="border-t border-swar-border p-6 bg-white">
                    <form onSubmit={handleSendReply} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">
                          Your Reply
                        </label>
                        <textarea
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          className="w-full px-3 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent resize-none text-sm"
                          rows={3}
                          placeholder="Type your reply message here..."
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={submitting || !replyMessage.trim()}
                          className="flex-1 bg-swar-primary text-white px-4 py-2 rounded-lg hover:bg-swar-primary disabled:bg-gray-400 transition-colors font-medium text-sm"
                        >
                          {submitting ? 'Sending...' : 'Send Reply'}
                        </button>
                        {!selectedMessage.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(selectedMessage._id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-white rounded-lg shadow flex items-center justify-center text-center">
                  <div>
                    <MessageSquare className="h-12 w-12 text-swar-text-secondary mx-auto mb-4" />
                    <p className="text-swar-text-secondary">Select a message to reply</p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
