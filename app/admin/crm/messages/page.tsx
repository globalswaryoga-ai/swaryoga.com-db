'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';
import { Phone, Video, MoreVertical, Paperclip, Smile, Send, Search } from 'lucide-react';

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

interface Thread {
  phoneNumber: string;
  leadId?: string;
  leadName?: string;
  messages: Message[];
  lastMessageAt: Date;
}

export default function MessagesPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [msgs, setMsgs] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const crmRef = useRef<any>(null);
  const selectedRef = useRef<Thread | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Build threads from messages
  const getThreads = (messages: Message[]): Thread[] => {
    const map = new Map<string, Thread>();
    messages.forEach((m) => {
      const phone = m.phoneNumber;
      const lead = typeof m.leadId === 'string' ? m.leadId : m.leadId?._id;
      const name = typeof m.leadId === 'string' ? 'Unknown' : (m.leadId?.name || 'Unknown');

      if (!map.has(phone)) {
        map.set(phone, {
          phoneNumber: phone,
          leadId: lead,
          leadName: name,
          messages: [],
          lastMessageAt: new Date(m.sentAt || m.createdAt),
        });
      }
      const t = map.get(phone)!;
      t.messages.push(m);

      // Update metadata if this message is newer
      const time = new Date(m.sentAt || m.createdAt);
      if (time > t.lastMessageAt) {
        t.lastMessageAt = time;
      }

      // Try to get a better name if current is Unknown
      if (t.leadName === 'Unknown' && name !== 'Unknown') {
        t.leadName = name;
        t.leadId = lead;
      }
    });

    const threads = Array.from(map.values());
    threads.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    threads.forEach((t) => {
      t.messages.sort((a, b) => {
        const at = new Date(a.sentAt || a.createdAt).getTime();
        const bt = new Date(b.sentAt || b.createdAt).getTime();
        return at - bt;
      });
    });
    return threads;
  };

  // Fetch function
  const doFetch = useCallback(async () => {
    if (!isMountedRef.current || !token) return;
    try {
      setError(null);
      // Fetch all messages (not just inbound) to show full conversation
      const result = await (crmRef.current || crm).fetch('/api/admin/crm/messages', {
        params: { limit: 1000 },
      });
      if (isMountedRef.current) {
        const data = result?.data?.messages || result?.messages || [];
        setMsgs(data);

        // Update selected thread with new messages
        if (selectedRef.current) {
          const threads = getThreads(data);
          const updated = threads.find(t => t.phoneNumber === selectedRef.current?.phoneNumber);
          if (updated) {
            setSelected(updated);
          }
        }
      }
    } catch (e) {
      if (isMountedRef.current) {
        setError(e instanceof Error ? e.message : 'Error');
      }
    }
  }, [token, crm]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    isMountedRef.current = true;

    // Sync crmRef with current crm object
    crmRef.current = crm;

    if (!token) {
      router.push(getLoginPath());
      return;
    }
    doFetch();
    intervalRef.current = setInterval(doFetch, 10000);
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, crm, doFetch, router]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const threads = getThreads(msgs);
  const filtered = threads.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, '');

    return (
      t.phoneNumber.includes(q) ||
      (qDigits && t.phoneNumber.includes(qDigits)) ||
      (t.leadName?.toLowerCase().includes(q) ?? false)
    );
  });

  const send = async () => {
    if (!selected || !reply.trim()) return;
    if (!selected.leadId) {
      setError('Cannot reply to unknown lead');
      return;
    }
    setSending(true);
    try {
      await crmRef.current.fetch('/api/admin/crm/messages', {
        method: 'POST',
        body: {
          leadId: selected.leadId,
          phoneNumber: selected.phoneNumber,
          messageContent: reply.trim(),
        },
      });
      setReply('');
      await doFetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSending(false);
    }
  };

  if (!hasMounted) return null;

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach((msg) => {
      const date = new Date(msg.sentAt || msg.createdAt).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return Object.entries(groups).map(([date, msgs]) => ({ date, messages: msgs }));
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-gradient-to-br from-blue-400 to-blue-600', 'bg-gradient-to-br from-green-400 to-green-600', 'bg-gradient-to-br from-purple-400 to-purple-600', 'bg-gradient-to-br from-pink-400 to-pink-600', 'bg-gradient-to-br from-orange-400 to-orange-600'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#ECE5DD] flex flex-col">
      <div className="flex-1 flex max-w-7xl mx-auto w-full gap-0 bg-white overflow-hidden rounded-lg shadow-2xl" style={{ height: 'calc(100vh - 2rem)' }}>
        {/* Contact List */}
        <div className={`${selected ? 'hidden md:flex' : 'flex'} md:flex w-full md:w-1/3 flex-col bg-white border-r border-gray-200`}>
          <div className="p-4 bg-gradient-to-r from-[#075E54] to-[#128C7E] text-white">
            <h1 className="text-2xl font-bold mb-4">Chats</h1>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#128C7E] bg-opacity-50 text-white placeholder-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {error && <div className="p-4"><AlertBox type="error" message={error} onClose={() => setError(null)} /></div>}
            {crm.loading ? (
              <div className="p-8 flex items-center justify-center"><LoadingSpinner /></div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <p className="text-lg">No messages yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((t) => {
                  const lastMsg = t.messages[t.messages.length - 1];
                  const msgPreview = lastMsg?.messageContent.substring(0, 50) + (lastMsg?.messageContent.length > 50 ? '...' : '');

                  return (
                    <button
                      key={t.phoneNumber}
                      onClick={() => setSelected(t)}
                      className={`w-full p-4 text-left transition-all hover:bg-gray-50 ${selected?.phoneNumber === t.phoneNumber ? 'bg-gray-100 border-l-4 border-[#25D366]' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className={`${getAvatarColor(t.leadName || 'Unknown')} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
                          {getInitials(t.leadName || 'Unknown')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{t.leadName}</h3>
                            <span className="text-xs text-gray-500 flex-shrink-0">{t.lastMessageAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{t.phoneNumber}</p>
                          <p className="text-xs text-gray-500 truncate">{msgPreview}</p>
                        </div>
                        <div className="w-2 h-2 bg-[#25D366] rounded-full flex-shrink-0 mt-2"></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selected && (
          <div className="flex-1 flex flex-col bg-[#ECE5DD] md:w-2/3 md:border-l border-gray-200">
            {/* Chat Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#075E54] to-[#128C7E] text-white flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`${getAvatarColor(selected.leadName || 'Unknown')} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                  {getInitials(selected.leadName || 'Unknown')}
                </div>
                <div>
                  <h2 className="font-semibold">{selected.leadName}</h2>
                  <p className="text-xs text-green-200 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Online now
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="p-2 hover:bg-[#128C7E] rounded-full transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-[#128C7E] rounded-full transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-[#128C7E] rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#ECE5DD' }}>
              {selected.messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {groupMessagesByDate(selected.messages).map((group, groupIdx) => (
                    <div key={groupIdx}>
                      <div className="flex justify-center mb-4">
                        <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">{group.date}</span>
                      </div>
                      {group.messages.map((m) => (
                        <div key={m._id} className={`flex animate-fadeIn ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs px-4 py-2 rounded-2xl shadow-sm ${
                            m.direction === 'outbound'
                              ? 'bg-[#DCF8C6] text-gray-900 rounded-br-none'
                              : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
                          }`}>
                            <p className="text-sm break-words leading-relaxed">{m.messageContent}</p>
                            <div className={`text-[11px] mt-1.5 flex items-center gap-1 ${m.direction === 'outbound' ? 'text-gray-700 justify-end' : 'text-gray-400'}`}>
                              {new Date(m.sentAt || m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {m.direction === 'outbound' && (
                                <span className="font-semibold">
                                  {m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : m.status === 'sent' ? '✓' : '⏱'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200 space-y-3">
              <div className="flex gap-2 items-end">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  value={reply}
                  onChange={(e) => {
                    setReply(e.target.value);
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 96) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-none overflow-hidden"
                  style={{ maxHeight: '96px' }}
                />
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  onClick={send}
                  disabled={!reply.trim() || sending}
                  className={`p-2 rounded-full transition-all ${
                    reply.trim() && !sending
                      ? 'bg-[#25D366] text-white hover:bg-[#20BA5A]'
                      : 'text-gray-400'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State on Desktop */}
        {!selected && (
          <div className="hidden md:flex flex-1 items-center justify-center bg-[#ECE5DD] flex-col gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white text-4xl">
              💬
            </div>
            <h2 className="text-2xl font-bold text-gray-700">Your Messages</h2>
            <p className="text-gray-500 text-center max-w-sm">Select a contact to start chatting or begin a new conversation</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
