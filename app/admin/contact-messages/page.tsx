'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, LogOut, Menu, X, Download, Search, RefreshCw,
  ArrowLeft, Mail, Phone, Clock, Calendar, Check, CheckCircle2,
  Trash2, Archive, Send, Sparkles, Filter, AlertCircle, Eye, EyeOff
} from 'lucide-react';
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
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'read'>('all');

  const getStoredToken = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('token') ||
      ''
    );
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = getStoredToken();
      const response = await fetch('/api/admin/contacts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setMessages(Array.isArray(data) ? data : []);
      } else {
        const errJson = response ? await response.json().catch(() => ({})) : {};
        setError(errJson.error || 'Failed to fetch contact messages');
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to fetch contact messages');
      console.error(err);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [getStoredToken]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      fetchMessages();
    }
  }, [router, getStoredToken, fetchMessages]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter((m) => !m.isRead).length;
    const read = total - unread;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = messages.filter((m) => {
      const d = new Date(m.createdAt);
      return !Number.isNaN(d.getTime()) && d >= today;
    }).length;

    return { total, unread, read, todayCount };
  }, [messages]);

  // Filter messages by search and read status
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (filterTab === 'unread' && msg.isRead) return false;
      if (filterTab === 'read' && !msg.isRead) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        msg.name.toLowerCase().includes(q) ||
        msg.email.toLowerCase().includes(q) ||
        msg.subject.toLowerCase().includes(q) ||
        (msg.phone && msg.phone.includes(q))
      );
    });
  }, [messages, filterTab, searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleExport = () => {
    const dataToExport = filteredMessages.length > 0 ? filteredMessages : messages;
    const csv = [
      ['Name', 'Email', 'Phone', 'Subject', 'Message', 'Status', 'Date'].join(','),
      ...dataToExport.map((msg) =>
        [
          `"${(msg.name || '').replace(/"/g, '""')}"`,
          `"${msg.email || ''}"`,
          `"${msg.phone || ''}"`,
          `"${(msg.subject || '').replace(/"/g, '""')}"`,
          `"${(msg.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${msg.isRead ? 'Read' : 'Unread'}"`,
          `"${new Date(msg.createdAt).toLocaleDateString()}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact_messages_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplyMessage('');
    if (!msg.isRead) {
      handleMarkAsRead(msg._id);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, isRead: true } : m)));
    if (selectedMessage?._id === id) {
      setSelectedMessage((prev) => (prev ? { ...prev, isRead: true } : null));
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyMessage.trim()) return;

    setSubmitting(true);
    const token = getStoredToken();

    try {
      const response = await fetch('/api/admin/reply-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contactId: selectedMessage._id,
          userEmail: selectedMessage.email,
          subject: `Re: ${selectedMessage.subject}`,
          reply: replyMessage,
        }),
      });

      if (response.ok) {
        alert('Reply email dispatched successfully!');
        setReplyMessage('');
        fetchMessages();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert('Failed to send reply: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Network error sending reply');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectMessage = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMessages.map((m) => m._id)));
    }
  };

  const handleMarkAllRead = () => {
    if (selectedIds.size === 0) return;
    setMessages((prev) =>
      prev.map((msg) => (selectedIds.has(msg._id) ? { ...msg, isRead: true } : msg))
    );
    setSelectedIds(new Set());
  };

  const handleMarkAllUnread = () => {
    if (selectedIds.size === 0) return;
    setMessages((prev) =>
      prev.map((msg) => (selectedIds.has(msg._id) ? { ...msg, isRead: false } : msg))
    );
    setSelectedIds(new Set());
  };

  const handleDeleteAll = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Permanently delete ${selectedIds.size} message(s)? This cannot be undone.`)) return;

    try {
      const token = getStoredToken();
      for (const id of selectedIds) {
        await fetch(`/api/admin/contacts/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setMessages((prev) => prev.filter((m) => !selectedIds.has(m._id)));
      setSelectedIds(new Set());
      setSelectedMessage(null);
    } catch (err) {
      console.error('Error deleting messages:', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top vibrant accent stripe */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 w-full" />

        {/* Header Bar */}
        <header className="bg-white border-b border-slate-200/80 shadow-xs z-10">
          <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <Link
                href="/admin/crm/web-admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Web Admin</span>
              </Link>

              <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Contact Messages
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Inbound Feed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    Inquiries, feedback & direct questions submitted from the website Contact page
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={fetchMessages}
                title="Refresh messages"
                className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 space-y-4">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 flex-shrink-0">
            {/* Card 1: Total */}
            <div
              onClick={() => setFilterTab('all')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                filterTab === 'all'
                  ? 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-white border-emerald-400 shadow-md shadow-emerald-500/10'
                  : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inquiries</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{metrics.total}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>All submitted inquiries</span>
              </div>
            </div>

            {/* Card 2: Unread */}
            <div
              onClick={() => setFilterTab('unread')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                filterTab === 'unread'
                  ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-white border-amber-400 shadow-md shadow-amber-500/10'
                  : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unread</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">{metrics.unread}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/25">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Awaiting response</span>
              </div>
            </div>

            {/* Card 3: Processed */}
            <div
              onClick={() => setFilterTab('read')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                filterTab === 'read'
                  ? 'bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-white border-blue-400 shadow-md shadow-blue-500/10'
                  : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Answered / Read</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">{metrics.read}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-700 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Processed messages</span>
              </div>
            </div>

            {/* Card 4: Today */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Received Today</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-1">{metrics.todayCount}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-700 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>New messages today</span>
              </div>
            </div>
          </div>

          {/* Split View Container */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 min-h-0">
            {/* Left Inbox List Column */}
            <div className="w-full md:w-96 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden flex-shrink-0">
              {/* Header with Search and Filter Pills */}
              <div className="p-3.5 border-b border-slate-200/80 space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      onClick={() => setFilterTab('all')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      All ({metrics.total})
                    </button>
                    <button
                      onClick={() => setFilterTab('unread')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        filterTab === 'unread' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Unread ({metrics.unread})
                    </button>
                    <button
                      onClick={() => setFilterTab('read')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        filterTab === 'read' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Read ({metrics.read})
                    </button>
                  </div>

                  <label className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredMessages.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                    <span className="text-[11px]">{selectedIds.size > 0 ? selectedIds.size : 'All'}</span>
                  </label>
                </div>

                {/* Batch Action Bar */}
                {selectedIds.size > 0 && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2 flex items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-amber-900 text-[11px]">
                      {selectedIds.size} selected
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleMarkAllRead}
                        className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold transition"
                      >
                        Read
                      </button>
                      <button
                        onClick={handleMarkAllUnread}
                        className="px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold transition"
                      >
                        Unread
                      </button>
                      <button
                        onClick={handleDeleteAll}
                        className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Scroll List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {isLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
                    <p className="text-xs text-slate-500">Loading messages...</p>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No contact messages found
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const initials = (msg.name || 'U').slice(0, 2).toUpperCase();
                    const isSelected = selectedMessage?._id === msg._id;
                    const isChecked = selectedIds.has(msg._id);

                    return (
                      <div
                        key={msg._id}
                        onClick={() => handleViewMessage(msg)}
                        className={`p-3.5 transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                            : isChecked
                            ? 'bg-slate-100/80'
                            : !msg.isRead
                            ? 'bg-amber-50/30 hover:bg-amber-50/60 font-semibold'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectMessage(msg._id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 mt-1 flex-shrink-0"
                        />

                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                          {initials}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{msg.name}</p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {new Date(msg.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 truncate font-medium">{msg.subject}</p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{msg.message}</p>
                        </div>

                        {!msg.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Message Details / Chat Card */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden min-h-0">
              {selectedMessage ? (
                <>
                  {/* Message Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/20 flex-shrink-0">
                        {(selectedMessage.name || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">{selectedMessage.name}</h2>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {selectedMessage.email}
                          </span>
                          {selectedMessage.phone && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {selectedMessage.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                          selectedMessage.isRead
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {selectedMessage.isRead ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{selectedMessage.subject}</h3>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedMessage.message}
                      </p>
                    </div>
                  </div>

                  {/* Reply Form */}
                  <div className="border-t border-slate-200/80 p-4 sm:p-5 bg-white">
                    <form onSubmit={handleSendReply} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Compose Response via Email
                        </label>
                        <textarea
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          rows={3}
                          placeholder={`Type your reply to ${selectedMessage.name}...`}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs transition resize-none"
                          required
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="submit"
                          disabled={submitting || !replyMessage.trim()}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{submitting ? 'Sending...' : 'Send Reply'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Select an Inquiry</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Choose a message from the list on the left to read details and send a reply.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
