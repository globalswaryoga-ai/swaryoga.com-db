'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';

interface MetaMessage {
  _id: string;
  phoneNumber: string;
  messageContent: string;
  direction: 'inbound' | 'outbound';
  status: string;
  createdAt: string;
  waMessageId?: string;
}

interface MetaConversation {
  _id: string;
  leadId?: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  status?: string;
  labels?: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface LeadNote {
  _id: string;
  note: string;
  pinned?: boolean;
  createdAt: string;
}

interface LeadFollowUp {
  _id: string;
  title?: string;
  description?: string;
  dueAt: string;
  status?: 'open' | 'done' | string;
  timezone?: string;
  createdAt: string;
}

function formatTime(dateLike?: string) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateLike?: string) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

// Helper to calculate followup status
function getFollowUpStatus(dueAt: string, currentStatus?: string): string {
  if (currentStatus === 'done') return 'done';
  const now = new Date();
  const due = new Date(dueAt);
  const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  if (daysOverdue >= 5) return 'overdue';
  return currentStatus || 'pending';
}

export default function MetaWhatsAppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();
  const crm = useCRM({ token });

  const [conversations, setConversations] = useState<MetaConversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selected, setSelected] = useState<MetaConversation | null>(null);
  const [messages, setMessages] = useState<MetaMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [followups, setFollowups] = useState<LeadFollowUp[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newFollowUpTitle, setNewFollowUpTitle] = useState('');
  const [newFollowUpDueAt, setNewFollowUpDueAt] = useState('');
  
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations (Meta only)
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await crm.fetch('/api/admin/crm/whatsapp/meta/conversations', {
        method: 'GET',
      });
      setConversations(res || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [crm]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (phoneNumber: string) => {
    try {
      setLoadingMessages(true);
      const res = await crm.fetch('/api/admin/crm/whatsapp/meta/messages', {
        method: 'GET',
        params: { phoneNumber },
      });
      setMessages(res || []);
      
      // Load lead details if leadId is available
      if (selected?.leadId) {
        setLoadingTools(true);
        await Promise.all([
          fetchNotes(selected.leadId),
          fetchFollowUps(selected.leadId)
        ]);
      }
      
      // Auto-scroll to bottom
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
      setLoadingTools(false);
    }
  }, [crm, selected]);

  const fetchNotes = useCallback(async (leadId: string) => {
    try {
      const res = await crm.fetch(`/api/admin/crm/leads/${leadId}/notes`, {
        params: { limit: 50, skip: 0 },
      });
      setNotes(res?.notes || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  }, [crm]);

  const fetchFollowUps = useCallback(async (leadId: string) => {
    try {
      const res = await crm.fetch(`/api/admin/crm/leads/${leadId}/followups`, {
        params: { limit: 50, skip: 0, status: 'all' },
      });
      setFollowups(res?.followups || []);
    } catch (err) {
      console.error('Failed to fetch followups:', err);
    }
  }, [crm]);

  const createNote = useCallback(async () => {
    if (!selected?.leadId || !newNote.trim()) return;
    try {
      setError(null);
      await crm.fetch(`/api/admin/crm/leads/${selected.leadId}/notes`, {
        method: 'POST',
        body: { note: newNote },
      });
      setNewNote('');
      await fetchNotes(selected.leadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    }
  }, [crm, selected?.leadId, newNote, fetchNotes]);

  const createFollowUp = useCallback(async () => {
    if (!selected?.leadId || !newFollowUpTitle.trim() || !newFollowUpDueAt) return;
    try {
      setError(null);
      await crm.fetch(`/api/admin/crm/leads/${selected.leadId}/followups`, {
        method: 'POST',
        body: { title: newFollowUpTitle, dueAt: newFollowUpDueAt },
      });
      setNewFollowUpTitle('');
      setNewFollowUpDueAt('');
      await fetchFollowUps(selected.leadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create followup');
    }
  }, [crm, selected?.leadId, newFollowUpTitle, newFollowUpDueAt, fetchFollowUps]);

  const updateLeadStatus = useCallback(
    async (next: string) => {
      if (!selected?.leadId) return;
      try {
        const res = await crm.fetch(`/api/admin/crm/leads/${selected.leadId}`, {
          method: 'PUT',
          body: { status: next },
        });
        const updatedStatus = String(res?.data?.status || next || '');
        setSelected((prev) => (prev ? { ...prev, status: updatedStatus } : prev));
        setConversations((prev) =>
          prev.map((c) => (c.leadId === selected.leadId ? { ...c, status: updatedStatus } : c))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status');
      }
    },
    [crm, selected?.leadId]
  );

  const updateFollowUpStatus = useCallback(
    async (followUpId: string, newStatus: string) => {
      try {
        await crm.fetch(`/api/admin/crm/leads/${selected?.leadId}/followups/${followUpId}`, {
          method: 'PUT',
          body: { status: newStatus },
        });
        // Refresh followups
        if (selected?.leadId) {
          const res = await crm.fetch(`/api/admin/crm/leads/${selected.leadId}/followups`, {
            params: { limit: 50, skip: 0, status: 'all' },
          });
          setFollowups(res?.followups || []);
        }
      } catch (err) {
        console.error('Failed to update followup status:', err);
      }
    },
    [crm, selected?.leadId]
  );

  const upsertLabels = useCallback(
    async (nextLabels: string[]) => {
      if (!selected?.leadId) return;
      try {
        const cleaned = Array.from(new Set(nextLabels.map((x) => String(x || '').trim()).filter(Boolean)));
        const res = await crm.fetch(`/api/admin/crm/leads/${selected.leadId}`, {
          method: 'PUT',
          body: { labels: cleaned },
        });
        const updatedLabels: string[] = Array.isArray(res?.data?.labels) ? res.data.labels : cleaned;
        setSelected((prev) => (prev ? { ...prev, labels: updatedLabels } : prev));
        setConversations((prev) =>
          prev.map((c) => (c.leadId === selected.leadId ? { ...c, labels: updatedLabels } : c))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update labels');
      }
    },
    [crm, selected?.leadId]
  );

  const addLabelToSelected = useCallback(async () => {
    if (!selected?.leadId) {
      setError('No lead selected');
      return;
    }
    const l = newLabel.trim();
    if (!l) {
      setError('Label cannot be empty');
      return;
    }
    try {
      setError(null);
      const current = Array.isArray(selected.labels) ? selected.labels : [];
      if (current.some((x) => String(x).toLowerCase() === l.toLowerCase())) {
        setError('This label already exists');
        return;
      }
      await upsertLabels([...current, l]);
      setNewLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add label');
    }
  }, [selected, newLabel, upsertLabels]);

  const removeLabelFromSelected = useCallback(
    async (labelToRemove: string) => {
      if (!selected?.leadId) return;
      try {
        setError(null);
        const current = Array.isArray(selected.labels) ? selected.labels : [];
        await upsertLabels(current.filter((x) => x !== labelToRemove));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove label');
      }
    },
    [selected?.leadId, upsertLabels]
  );

  // Send message via Meta
  const handleSendMessage = useCallback(async () => {
    if (!selectedPhone || !newMessage.trim()) return;

    try {
      setSending(true);
      setError(null);

      const res = await crm.fetch('/api/admin/crm/whatsapp/meta/send', {
        method: 'POST',
        body: {
          phoneNumber: selectedPhone,
          messageContent: newMessage,
        },
      });

      if (res?.messageId) {
        setNewMessage('');
        await fetchMessages(selectedPhone);
      } else {
        throw new Error(res?.error || 'Failed to send message');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }, [crm, selectedPhone, newMessage, fetchMessages]);

  // Check Meta API connection
  const checkMetaConnection = useCallback(async () => {
    try {
      setConnectionStatus('checking');
      const res = await crm.fetch('/api/admin/crm/whatsapp/meta/status', {
        method: 'GET',
      });

      if (res?.connected) {
        setConnectionStatus('connected');
        setTimeout(() => setConnectionStatus(null), 3000);
      } else {
        setConnectionStatus('disconnected');
        setError(res?.message || 'Meta API is not connected. Please check your credentials.');
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      setError(err instanceof Error ? err.message : 'Failed to check connection');
    }
  }, [crm]);

  const handleSelect = useCallback(
    async (row: MetaConversation) => {
      setSelected(row);
      setSelectedPhone(row.phoneNumber);
      await fetchMessages(row.phoneNumber);
    },
    [fetchMessages]
  );

  useEffect(() => {
    if (token === undefined) {
      router.push('/admin/login');
      return;
    }
    if (!token) return;
    void fetchConversations();
    const interval = setInterval(fetchConversations, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-select phone from query parameter
  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    if (phoneParam && conversations.length > 0 && !selected) {
      const normalizedPhone = phoneParam.replace(/\D+/g, '');
      const conv = conversations.find(
        (c) => c.phoneNumber.replace(/\D+/g, '') === normalizedPhone
      );
      if (conv) {
        void handleSelect(conv);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, conversations]);

  if (token === undefined) return null;

  const selectedLeadName = selected?.name || selected?.phoneNumber || 'Conversation';

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Meta Inbox</h1>
            <p className="text-sm text-gray-600">Official Business Number Messages</p>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={checkMetaConnection}
              disabled={connectionStatus === 'checking'}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                connectionStatus === 'connected'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : connectionStatus === 'disconnected'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } ${connectionStatus === 'checking' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {connectionStatus === 'checking' && <span className="animate-spin">⟳</span>}
              {connectionStatus === 'connected' && <span>✓</span>}
              {connectionStatus === 'disconnected' && <span>✕</span>}
              {!connectionStatus && <span>⚡</span>}
              {connectionStatus === 'checking' ? 'Checking...' : connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'disconnected' ? 'Disconnected' : 'Check Connection'}
            </button>
            <Link
              href="/admin/crm/leads"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              ← Back to Leads
            </Link>
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR: Conversations List */}
        <div className="w-1/4 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-200 sticky top-0 bg-white">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No conversations</div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv._id}
                    onClick={() => handleSelect(conv)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                      selectedPhone === conv.phoneNumber ? 'bg-green-50 border-l-green-600' : 'border-l-transparent'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{conv.name || conv.phoneNumber}</div>
                    <div className="text-sm text-gray-600 truncate">{conv.lastMessage}</div>
                    <div className="text-xs text-gray-500 mt-1">{conv.lastMessageTime}</div>
                    {conv.unreadCount && conv.unreadCount > 0 && (
                      <span className="inline-block bg-red-500 text-white text-xs rounded-full px-2 py-1 mt-2">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE: Chat Messages */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selected ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{selectedLeadName}</div>
                    <div className="text-sm text-gray-600">{selected.phoneNumber}</div>
                    {selected.status && (
                      <div className="mt-2 flex gap-2 items-center flex-wrap">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          Status: {selected.status}
                        </span>
                        {selected.labels?.slice(0, 3).map((l) => (
                          <span key={l} className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">Start a conversation</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.direction === 'outbound'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="break-words">{msg.messageContent}</p>
                        <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-green-100' : 'text-gray-500'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Message Composer */}
              <div className="border-t border-gray-200 bg-white p-4">
                <div className="flex gap-2">
                  <textarea
                    ref={composerRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    rows={3}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed h-fit"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Press Ctrl+Enter to send</p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium">Select a conversation to start</p>
                <p className="text-sm mt-2">Click on a chat from the list</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: Lead Details & Tools */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-200 sticky top-0 bg-white">
            <h3 className="font-bold text-gray-900">Lead Details</h3>
          </div>

          {!selected ? (
            <div className="p-4 text-center text-gray-500 text-sm">Select a conversation to view details.</div>
          ) : loadingTools ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Status</label>
                <select
                  value={selected.status || 'lead'}
                  onChange={(e) => updateLeadStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Follow-ups */}
              <details className="border rounded-lg" open>
                <summary className="p-3 font-semibold text-gray-700 cursor-pointer bg-gray-50 hover:bg-gray-100">
                  Follow-ups ({followups.length})
                </summary>
                <div className="p-3 space-y-3 border-t">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newFollowUpTitle}
                      onChange={(e) => setNewFollowUpTitle(e.target.value)}
                      placeholder="Title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="datetime-local"
                      value={newFollowUpDueAt}
                      onChange={(e) => setNewFollowUpDueAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={createFollowUp}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                    >
                      Add Follow-up
                    </button>
                  </div>

                  {followups.length ? (
                    <div className="space-y-2">
                      {followups.map((f) => (
                        <div key={f._id} className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="font-semibold text-blue-900 text-sm">{f.title || 'Follow up'}</div>
                          <div className="text-xs text-blue-700 mt-1">
                            Due: {formatDay(f.dueAt)} • {formatTime(f.dueAt)}
                          </div>
                          <span className="inline-block px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded mt-1">
                            {String(f.status || 'open')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No follow-ups yet.</div>
                  )}
                </div>
              </details>

              {/* Notes */}
              <details className="border rounded-lg">
                <summary className="p-3 font-semibold text-gray-700 cursor-pointer bg-gray-50 hover:bg-gray-100">
                  Notes ({notes.length})
                </summary>
                <div className="p-3 space-y-3 border-t">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Write a note..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void createNote();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={createNote}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                    >
                      Save
                    </button>
                  </div>

                  {notes.length ? (
                    <div className="space-y-2">
                      {notes.map((n) => (
                        <div key={n._id} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-900 whitespace-pre-wrap">{n.note}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDay(n.createdAt)} • {formatTime(n.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No notes yet.</div>
                  )}
                </div>
              </details>

              {/* Labels */}
              <details className="border rounded-lg" open>
                <summary className="p-3 font-semibold text-gray-700 cursor-pointer bg-gray-50 hover:bg-gray-100">
                  Labels ({(selected?.labels || []).length})
                </summary>
                <div className="p-3 space-y-3 border-t">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Add label"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void addLabelToSelected();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={addLabelToSelected}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(selected?.labels || []).length ? (
                      (selected?.labels || []).map((l) => (
                        <button
                          key={l}
                          onClick={() => void removeLabelFromSelected(String(l))}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold hover:bg-red-200 transition-colors"
                        >
                          {l} <span>×</span>
                        </button>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">No labels yet.</div>
                    )}
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
