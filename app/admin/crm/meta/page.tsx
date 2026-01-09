'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner, AlertBox } from '@/components/admin/crm';
import AdminSidebar from '@/components/AdminSidebar';

// --- Types ---

interface Message {
  _id: string;
  leadId?: any;
  phoneNumber: string;
  messageContent: string;
  direction: 'inbound' | 'outbound';
  status: string;
  sentAt: string;
  createdAt: string;
  provider?: 'meta';
  senderNumber?: string;
}

interface Conversation {
  leadId: string;
  phoneNumber: string;
  name: string;
  lastMessageContent: string;
  lastMessageAt: Date;
  unreadCount: number;
  status: string;
  assignedToUserId?: string;
}

// --- Helper Components ---

function Avatar({ name }: { name: string }) {
  const initials = String(name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  return (
    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
      {initials}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isOutbound = msg.direction === 'outbound';
  const time = new Date(msg.sentAt || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
        isOutbound 
          ? 'bg-emerald-600 text-white rounded-tr-none' 
          : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
      }`}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.messageContent}</p>
        <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOutbound ? 'text-emerald-100 justify-end' : 'text-slate-400'}`}>
          <span>{time}</span>
          {isOutbound && (
            <span className="ml-1">
              {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : '...'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function MetaInboxPage() {
  const token = useAuth();
  const router = useRouter();
  const crm = useCRM({ token });
  const searchParams = useSearchParams();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedLead, setSelectedLead] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInterval = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch conversations (the list on the left)
  const fetchConversations = useCallback(async (showLoading = true) => {
    if (!token) return;
    try {
      if (showLoading) setLoading(true);
      const res = await crm.fetch('/api/admin/crm/conversations', {
        params: { limit: 100 }
      });
      // Sort: newest messages first
      const sorted = (res?.conversations || []).sort((a: any, b: any) => 
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      setConversations(sorted);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [token, crm]);

  // Fetch messages for a specific lead
  const fetchMessages = useCallback(async (leadId: string, showLoading = true) => {
    if (!token) return;
    try {
      if (showLoading) setLoadingMsgs(true);
      const res = await crm.fetch('/api/admin/crm/messages', {
        params: { leadId, limit: 100, order: 'asc' }
      });
      setMessages(res?.messages || []);
      if (showLoading) setTimeout(() => scrollToBottom('auto'), 100);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      if (showLoading) setLoadingMsgs(false);
    }
  }, [token, crm]);

  // Initial load
  useEffect(() => {
    if (token) fetchConversations();
  }, [token, fetchConversations]);

  // Polling for new messages
  useEffect(() => {
    chatInterval.current = setInterval(() => {
      fetchConversations(false);
      if (selectedLead) {
        fetchMessages(selectedLead.leadId, false);
      }
    }, 10000); // 10 seconds
    return () => {
      if (chatInterval.current) clearInterval(chatInterval.current);
    }
  }, [fetchConversations, fetchMessages, selectedLead]);

  // Handle lead selection
  const handleSelectLead = (conv: Conversation) => {
    setSelectedLead(conv);
    fetchMessages(conv.leadId);
    // Mark as read in UI immediately
    setConversations(prev => prev.map(c => 
      c.leadId === conv.leadId ? { ...c, unreadCount: 0 } : c
    ));
  };

  // Send message
  const handleSend = async () => {
    if (!selectedLead || !reply.trim() || sending) return;
    setSending(true);
    try {
      setError(null);
      await crm.fetch('/api/admin/crm/whatsapp/send', {
        method: 'POST',
        body: {
          leadId: selectedLead.leadId,
          phoneNumber: selectedLead.phoneNumber,
          messageContent: reply.trim()
        }
      });
      setReply('');
      // Refresh messages
      await fetchMessages(selectedLead.leadId, false);
      setTimeout(() => scrollToBottom(), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = useMemo(() => {
    if (!q.trim()) return conversations;
    const low = q.toLowerCase();
    return conversations.filter(c => 
      c.name.toLowerCase().includes(low) || 
      c.phoneNumber.includes(low)
    );
  }, [conversations, q]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AdminSidebar />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Conversation List */}
        <div className="w-[350px] border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-white">
            <h1 className="text-xl font-bold text-slate-900 mb-4">Meta Inbox</h1>
            <div className="relative">
              <input
                type="text"
                placeholder="Search chats..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && !conversations.length ? (
              <div className="p-8 text-center"><LoadingSpinner /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No conversations found</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.phoneNumber}
                    onClick={() => handleSelectLead(conv)}
                    className={`w-full p-4 flex gap-3 text-left transition-colors hover:bg-slate-50 ${
                      selectedLead?.leadId === conv.leadId ? 'bg-emerald-50 border-r-4 border-emerald-500' : ''
                    }`}
                  >
                    <Avatar name={conv.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-slate-900 truncate text-sm">{conv.name || conv.phoneNumber}</h3>
                        <span className="text-[10px] text-slate-400">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{conv.lastMessageContent}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                        {conv.unreadCount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Chat Window */}
        <div className="flex-1 flex flex-col bg-slate-50">
          {selectedLead ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedLead.name} />
                  <div>
                    <h2 className="font-bold text-slate-900 leading-tight">{selectedLead.name || 'Unknown Lead'}</h2>
                    <p className="text-xs text-slate-500">{selectedLead.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <Link 
                     href={`/admin/crm/leads/${selectedLead.leadId}`}
                     className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg"
                   >
                     Profile
                   </Link>
                   <Link 
                     href="/admin/crm/templates"
                     className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg"
                   >
                     Templates
                   </Link>
                   <Link 
                     href="/admin/crm/whatsapp-meta"
                     className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg"
                   >
                     Setup
                   </Link>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col bg-[#F0F2F5]">
                {loadingMsgs && !messages.length ? (
                  <div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <span className="bg-white/70 backdrop-blur-sm text-slate-500 text-[10px] px-3 py-1 rounded-full border border-slate-100">
                        Messages are end-to-end encrypted via Meta API
                      </span>
                    </div>
                    {messages.map((m) => (
                      <MessageBubble key={m._id} msg={m} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-slate-200">
                {error && <div className="mb-2"><AlertBox type="error" message={error} onClose={() => setError(null)} /></div>}
                <div className="flex gap-2 items-end max-w-4xl mx-auto">
                  <div className="flex-1 relative">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all resize-none max-h-32"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!reply.trim() || sending}
                    className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                  >
                    {sending ? '...' : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 text-3xl">
                💬
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome to your Meta Inbox</h2>
              <p className="max-w-xs text-sm leading-relaxed">
                Select a conversation from the left to start chatting with your leads via WhatsApp Cloud API.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
