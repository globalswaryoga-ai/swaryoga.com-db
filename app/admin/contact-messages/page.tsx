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
  isArchived?: boolean;
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
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');

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

  const handleArchiveMessage = async (id: string) => {
    try {
      setMessages(messages.map(msg => 
        msg._id === id ? { ...msg, isArchived: true } : msg
      ));
      if (selectedMessage?._id === id) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Error archiving message:', err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.ok) {
        setMessages(messages.filter(msg => msg._id !== id));
        if (selectedMessage?._id === id) {
          setSelectedMessage(null);
        }
      } else {
        alert('Failed to delete message');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Error deleting message');
    }
  };

  // Filter messages based on search and read status
  const filteredMessages = messages.filter((msg) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      msg.name.toLowerCase().includes(query) ||
      msg.email.toLowerCase().includes(query) ||
      (msg.phone && msg.phone.includes(query)) ||
      msg.subject.toLowerCase().includes(query);
    
    const matchesReadFilter = 
      readFilter === 'all' || 
      (readFilter === 'read' && msg.isRead) ||
      (readFilter === 'unread' && !msg.isRead);
    
    return matchesSearch && matchesReadFilter && !msg.isArchived;
  });

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
              <div className="w-96 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                <div className="bg-swar-primary-light px-4 py-3 border-b border-swar-border">
                  <p className="text-sm font-semibold text-swar-text mb-3">Messages ({filteredMessages.length})</p>
                  
                  {/* Search Bar */}
                  <input
                    type="text"
                    placeholder="🔍 Search by name, email, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm mb-3 focus:outline-none focus:border-swar-primary"
                  />
                  
                  {/* Read Status Filter */}
                  <select
                    value={readFilter}
                    onChange={(e) => setReadFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-swar-border rounded-lg text-sm focus:outline-none focus:border-swar-primary"
                  >
                    <option value="all">All Messages</option>
                    <option value="unread">Unread Only</option>
                    <option value="read">Read Only</option>
                  </select>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredMessages.map((msg) => (
                    <button
                      key={msg._id}
                      onClick={() => handleViewMessage(msg)}
                      className={`w-full text-left px-4 py-3 border-b border-swar-border transition-colors ${
                        selectedMessage?._id === msg._id
                          ? 'bg-blue-50 border-l-4 border-l-swar-primary'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
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
                  ))}
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

                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="submit"
                          disabled={submitting || !replyMessage.trim()}
                          className="flex-1 min-w-[120px] bg-swar-primary text-white px-4 py-2 rounded-lg hover:bg-swar-primary disabled:bg-gray-400 transition-colors font-medium text-sm"
                        >
                          {submitting ? 'Sending...' : 'Send Reply'}
                        </button>
                        {!selectedMessage.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(selectedMessage._id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                          >
                            ✓ Mark Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleArchiveMessage(selectedMessage._id)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                        >
                          📁 Archive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(selectedMessage._id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                        >
                          🗑️ Delete
                        </button>
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
