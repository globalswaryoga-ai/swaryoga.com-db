'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';

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
        if (selected) {
          const threads = getThreads(data);
          const updated = threads.find(t => t.phoneNumber === selected.phoneNumber);
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
  }, [token, selected, crm]); // Redraw selected if it changes elsewhere

  // Initial fetch + auto-refresh
  useEffect(() => {
    isMountedRef.current = true;
    
    // Sync crmRef with current crm object
    crmRef.current = crm;
    
    if (!token) {
      router.push('/admin/login');
      return;
    }
    doFetch();
    intervalRef.current = setInterval(doFetch, 10000); // 10s refresh is enough
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, crm, doFetch, router]);

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
      // Don't clear selected! Keep chat open.
      await doFetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSending(false);
    }
  };

  if (!hasMounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <PageHeader
            title="📥 Incoming WhatsApp Messages"
            action={<button onClick={doFetch} className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">�� Refresh</button>}
          />
        </div>
      </div>

      <div className="flex-1 flex max-w-7xl mx-auto w-full gap-4 p-4">
        <div className={`${selected ? 'w-1/3' : 'w-full'} bg-white rounded-lg shadow`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {error && <div className="p-4"><AlertBox type="error" message={error} onClose={() => setError(null)} /></div>}
              {crm.loading ? <div className="p-8 flex items-center justify-center"><LoadingSpinner /></div>
              : filtered.length === 0 ? <div className="p-6 text-center text-gray-500"><p>📭 No messages</p></div>
              : <div className="divide-y">
                  {filtered.map((t) => (
                    <button key={t.phoneNumber} onClick={() => setSelected(t)} className={`w-full p-4 text-left hover:bg-green-50 border-l-4 ${selected?.phoneNumber === t.phoneNumber ? 'bg-green-100 border-green-500' : 'border-transparent'}`}>
                      <div className="flex justify-between mb-2">
                        <div><div className="font-semibold">{t.leadName}</div><div className="text-sm text-gray-600">{t.phoneNumber}</div></div>
                        <div className="text-xs text-gray-400">{t.lastMessageAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2">{t.messages[t.messages.length - 1]?.messageContent}</div>
                    </button>
                  ))}
                </div>
              }
            </div>
          </div>
        </div>

        {selected && (
          <div className="w-2/3 bg-white rounded-lg shadow flex flex-col">
            <div className="border-b p-6 flex justify-between bg-green-50">
              <div>
                <h2 className="text-xl font-bold">{selected.leadName}</h2>
                <p className="text-sm text-gray-600">{selected.phoneNumber}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {selected.messages.map((m) => (
                <div key={m._id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
                    m.direction === 'outbound' 
                      ? 'bg-green-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                  }`}>
                    <p className="text-sm break-words leading-relaxed">{m.messageContent}</p>
                    <div className={`text-[10px] mt-2 flex items-center gap-1 ${m.direction === 'outbound' ? 'text-green-100 justify-end' : 'text-gray-400'}`}>
                      {m.provider && (
                        <span className={`px-1 rounded ${m.direction === 'outbound' ? 'bg-green-700' : 'bg-gray-100'}`}>
                          Meta API
                        </span>
                      )}
                      {new Date(m.sentAt || m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.direction === 'outbound' && (
                        <span>
                          {m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : m.status === 'sent' ? '✓' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-6 space-y-3">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type reply..." rows={3} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500" />
              <button onClick={send} disabled={!reply.trim() || sending} className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg">
                {sending ? 'Sending...' : '📤 Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
