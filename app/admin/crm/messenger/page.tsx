'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/admin/crm';

/* ─── Types ─── */
interface Conversation {
  _id: string;
  name: string;
  pageId?: string;
  pageScopedId?: string;
  phoneNumber?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  status?: string;
  labels?: string[];
  assignedToUserId?: string;
  source?: string;
}

interface Message {
  _id: string;
  direction: 'inbound' | 'outbound';
  messageContent?: string;
  sentAt?: string;
  createdAt: string;
}

interface AdminUser {
  userId: string;
  name?: string;
}

/* ─── Helpers ─── */
function crmFetch(url: string, opts: any = {}) {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then(r => r.json());
}

/* ─── Page ─── */
export default function MessengerInboxPage() {
  const router = useRouter();
  const token = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [sidebarData, setSidebarData] = useState<any>({ labels: [], notes: '', assignedTo: '', status: 'new_lead' });
  const [savingSidebar, setSavingSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const tabRoutes: Record<string, string> = {
    Leads: '/admin/crm/leads',
    Followup: '/admin/crm/leads-followup',
    Sales: '/admin/crm/sales',
    Messages: '/admin/crm/meta',
    Analytics: '/admin/crm/analytics',
    Home: '/admin/crm',
  };

  const goToTab = (tab: string) => {
    const href = tabRoutes[tab];
    if (href) router.push(href);
  };

  // Load conversations placeholder
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    // Future: fetch from /api/admin/crm/messenger/conversations
    setTimeout(() => {
      setConversations([]);
      setLoading(false);
    }, 500);
  }, [token]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelected(conv);
    setLoadingMessages(true);
    // Future: fetch messages from /api/admin/crm/messenger/messages?id=...
    setTimeout(() => {
      setMessages([]);
      setLoadingMessages(false);
    }, 300);
  };

  const handleSaveSidebar = async () => {
    if (!selected) return;
    setSavingSidebar(true);
    // Future: save to API
    setTimeout(() => setSavingSidebar(false), 500);
  };

  const handleSendMessage = async () => {
    if (!composerText.trim() || !selected) return;
    // Future: send via Messenger API
    setComposerText('');
  };

  const filteredConversations = conversations.filter(c =>
    !searchQuery || (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.phoneNumber || '').includes(searchQuery)
  );

  if (!token) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* HEADER */}
      <header className="px-3 py-1.5 flex items-center shrink-0 z-20" style={{ background: 'linear-gradient(135deg, #0078FF 0%, #00A3FF 50%, #39B0FF 100%)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm p-[2px] cursor-pointer hover:bg-white/30 transition-all hover:scale-105 shadow-lg shadow-black/10" onClick={() => router.push('/admin/crm')}>
            <div className="h-full w-full rounded-[10px] bg-white flex items-center justify-center">
              <img src="/logo.png" alt="Swar Yoga" className="h-4.5 w-4.5" />
            </div>
          </div>
          <nav className="flex gap-0.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-0.5">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-all duration-200" title="WhatsApp" onClick={() => router.push('/admin/crm/meta')}>
              <i className="ph-fill ph-whatsapp-logo text-sm"></i>
              <span className="hidden lg:inline">WhatsApp</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white text-[#0078FF] shadow-md" title="Messenger">
              <i className="ph-fill ph-messenger-logo text-sm"></i>
              <span className="hidden lg:inline">Messenger</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-all duration-200" title="Instagram" onClick={() => router.push('/admin/crm/instagram')}>
              <i className="ph-fill ph-instagram-logo text-sm"></i>
              <span className="hidden lg:inline">Instagram</span>
            </button>
          </nav>
        </div>

        <div className="flex-1 flex justify-center">
          <nav className="flex gap-0.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-0.5">
            {['Leads', 'Followup', 'Sales', 'Messages', 'Analytics', 'Home'].map((tab) => (
              <button
                key={tab}
                onClick={() => goToTab(tab)}
                className="px-3 py-1.5 text-[11px] font-bold rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all duration-200"
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => router.push('/admin/crm/messenger-funnel')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-white/10 text-white/80 border-white/20 hover:bg-white/20 hover:text-white text-[10px] font-bold transition-all duration-200">
            <i className="ph-bold ph-funnel text-xs"></i>
            <span className="hidden lg:inline uppercase tracking-wider">Funnel</span>
          </button>
        </div>
      </header>

      {/* MAIN BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-[27rem] shrink-0 flex flex-col overflow-hidden border-r" style={{ background: 'linear-gradient(180deg, #F0F4FF 0%, #FAFCFF 100%)', borderColor: 'rgba(0,120,255,0.1)' }}>
          {/* Search */}
          <div className="p-2.5 flex gap-2">
            <div className="relative flex-1">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm border border-indigo-100 text-xs font-medium focus:ring-2 focus:ring-indigo-300/30 focus:border-indigo-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(0,120,255,0.08), rgba(0,120,255,0.15))' }}>
                  <i className="ph ph-messenger-logo text-3xl text-indigo-400/60"></i>
                </div>
                <p className="text-sm font-bold text-slate-500">No Messenger conversations yet</p>
                <p className="text-xs text-slate-400 text-center px-8">Connect your Facebook Page to start receiving Messenger chats here.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`px-3 py-2.5 flex gap-2.5 items-start cursor-pointer transition-all duration-300 group relative ${
                    selected?._id === conv._id
                      ? 'bg-indigo-50 border border-indigo-300/30 rounded-lg shadow-sm mx-1 my-0.5'
                      : 'bg-white border border-indigo-100/50 rounded-lg mx-1 my-0.5 hover:border-indigo-300/30 hover:shadow-sm hover:translate-x-[2px]'
                  }`}
                >
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: 'linear-gradient(135deg, #0078FF, #00A3FF)' }}>
                    {conv.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-bold text-slate-900 truncate">{conv.name || 'Unknown'}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{conv.lastMessage || 'No messages'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* CHAT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10" style={{ background: 'linear-gradient(180deg, #FAFCFF 0%, #F5F8FF 100%)', boxShadow: '0 8px 32px rgba(0,120,255,0.06)' }}>
          {selected ? (
            <>
              {/* Chat Header */}
              <div className="px-3 py-1.5 flex gap-2 items-center sticky top-0 z-30 shrink-0 backdrop-blur-md" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(224,240,255,0.4) 100%)', borderBottom: '1px solid rgba(0,120,255,0.1)' }}>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #0078FF, #00A3FF)' }}>
                  <i className="ph ph-user text-sm"></i>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-900 leading-none">{selected.name || 'Unknown'}</div>
                  <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{selected.pageId || 'Messenger'}</div>
                </div>
                <div className="ml-auto">
                  <button
                    className={`p-1.5 rounded-md transition-colors ${showSidebar ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    onClick={() => setShowSidebar(!showSidebar)}
                  >
                    <i className={`ph ${showSidebar ? 'ph-sidebar-simple' : 'ph-sidebar'} text-sm`}></i>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3" style={{ backgroundColor: '#F0F4FA', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(0,120,255,0.08), rgba(0,120,255,0.15))' }}>
                      <i className="ph ph-chat-circle-dots text-3xl text-indigo-400/60"></i>
                    </div>
                    <p className="text-sm font-bold text-slate-500">No messages yet</p>
                    <p className="text-xs text-slate-400">Messages will appear here once connected.</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div key={msg._id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[360px] rounded-lg text-[14px] px-3 py-2 ${
                          msg.direction === 'outbound'
                            ? 'text-white rounded-tr-sm shadow-sm'
                            : 'bg-white text-slate-900 rounded-tl-sm shadow-sm border border-indigo-100'
                        }`} style={msg.direction === 'outbound' ? { background: 'linear-gradient(135deg, #0078FF, #00A3FF)' } : {}}>
                          {msg.messageContent || ''}
                          <div className={`text-[9px] mt-1 ${msg.direction === 'outbound' ? 'text-white/60' : 'text-slate-400'}`}>
                            {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Composer */}
              <div className="px-3 pt-2 pb-6 shrink-0 z-30 backdrop-blur-md" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.98) 0%, rgba(240,244,255,0.9) 100%)', borderTop: '1px solid rgba(0,120,255,0.1)' }}>
                <div className="flex items-end gap-2 max-w-6xl mx-auto">
                  <div className="flex-1 rounded-lg bg-white/80 backdrop-blur-sm transition-all relative" style={{ border: '1px solid rgba(0,120,255,0.15)', boxShadow: '0 2px 8px rgba(0,120,255,0.06)' }}>
                    <textarea
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-3 py-2 border-none focus:ring-0 max-h-28 min-h-[36px] placeholder:text-slate-400 font-medium text-slate-700 text-[13px] resize-none bg-transparent outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!composerText.trim()}
                    className="text-white h-8 px-4 rounded-lg font-bold text-xs transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 self-end hover:shadow-lg hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #0078FF 0%, #00A3FF 100%)', boxShadow: '0 2px 8px rgba(0,120,255,0.3)' }}
                  >
                    <i className="ph-bold ph-paper-plane-right text-sm"></i>
                    <span className="hidden xl:inline">Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4" style={{ background: 'linear-gradient(180deg, #FAFCFF 0%, #F0F4FF 100%)' }}>
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(0,120,255,0.08) 0%, rgba(0,120,255,0.18) 100%)', boxShadow: '0 8px 24px rgba(0,120,255,0.1)' }}>
                <i className="ph ph-messenger-logo text-6xl text-indigo-400/40"></i>
              </div>
              <p className="font-bold text-lg text-slate-500">Messenger Inbox</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">Connect your Facebook Page to receive Messenger conversations. Select a conversation to start chatting.</p>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        {showSidebar && selected && (
          <aside className="w-72 p-4 overflow-y-auto shrink-0 backdrop-blur-sm" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,244,255,0.9) 100%)', borderLeft: '1px solid rgba(0,120,255,0.1)' }}>
            {/* Avatar */}
            <div className="mb-4 p-1 pb-3" style={{ borderBottom: '1px solid rgba(0,120,255,0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0" style={{ background: 'linear-gradient(135deg, #0078FF 0%, #00A3FF 50%, #0078FF 100%)', boxShadow: '0 4px 12px rgba(0,120,255,0.3)' }}>
                  {selected.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900 leading-tight">{selected.name || 'Unknown'}</h3>
                  <p className="text-xs text-slate-500">Messenger</p>
                </div>
              </div>
            </div>

            {/* CRM Details */}
            <div className="space-y-6">
              <section>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">CRM Details</label>
                <div className="space-y-2.5">
                  <div className="flex flex-col gap-1 text-sm py-1.5">
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Status</span>
                    <select
                      className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-300/20 focus:border-indigo-400 outline-none font-semibold text-indigo-600"
                      style={{ background: 'rgba(249,250,255,0.8)', borderColor: 'rgba(0,120,255,0.15)' }}
                      value={sidebarData.status}
                      onChange={(e) => setSidebarData({ ...sidebarData, status: e.target.value })}
                    >
                      {['new_lead','contacted','interested','demo_trial','negotiation','enrolled','completed','inactive','repeater','old_sadhak','only_for_post'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 text-sm py-1.5">
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Notes</span>
                    <textarea
                      className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-300/20 focus:border-indigo-400 outline-none resize-none"
                      style={{ background: 'rgba(249,250,255,0.8)', borderColor: 'rgba(0,120,255,0.15)' }}
                      rows={3}
                      value={sidebarData.notes}
                      onChange={(e) => setSidebarData({ ...sidebarData, notes: e.target.value })}
                      placeholder="Add notes..."
                    />
                  </div>
                </div>
              </section>

              <button
                onClick={handleSaveSidebar}
                disabled={savingSidebar}
                className="w-full py-2 rounded-lg text-white text-xs font-bold transition-all hover:shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0078FF, #00A3FF)', boxShadow: '0 2px 8px rgba(0,120,255,0.3)' }}
              >
                {savingSidebar ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Phosphor Icons CDN + Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F0F4FA; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #0078FF 0%, #00A3FF 100%); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #0060CC 0%, #0078FF 100%); }
        ::selection { background: rgba(0,120,255,0.2); color: inherit; }
      `}</style>
    </div>
  );
}
