'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/admin/crm';
import SocialComposer from '@/components/admin/crm/SocialComposer';
import SocialBulkSendModal from '@/components/admin/crm/SocialBulkSendModal';

/* ─── Types ─── */
interface Conversation {
  _id: string;
  participantName?: string;
  participantId?: string;
  participantUsername?: string;
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
  notes?: string;
}

interface Message {
  _id: string;
  direction: 'inbound' | 'outbound';
  messageContent?: string;
  messageType?: string;
  mediaUrl?: string;
  mediaType?: string;
  sentAt?: string;
  createdAt: string;
}

interface AdminUser {
  userId: string;
  name?: string;
}

interface ConnectedSocialAccount {
  _id: string;
  platform: string;
  accountName: string;
  accountHandle: string;
  accountId?: string;
  connectedAt?: string;
  isConnected?: boolean;
}

interface SettingsScopeInfo {
  type: 'super_admin' | 'tenant';
  key: string;
  label: string;
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
  const [facebookAccount, setFacebookAccount] = useState<ConnectedSocialAccount | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionRestricted, setConnectionRestricted] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [settingsScope, setSettingsScope] = useState<SettingsScopeInfo | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [pageOptions, setPageOptions] = useState<{ pageId: string; name: string; picture?: string | null; hasInstagram?: boolean }[] | null>(null);
  const [pendingUserToken, setPendingUserToken] = useState('');

  // Send failures are shown separately from connection failures — a rejected
  // send does not mean the Page connection is broken.
  const [sendError, setSendError] = useState<string | null>(null);

  // Bulk selection for sending one template/message to many conversations.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const quickReplies = [
    { label: 'Thank you! 🙏', text: 'Thank you for your interest! We\'ll get back to you soon.' },
    { label: 'Enrolled ✅', text: 'Great! You\'re successfully enrolled. Check your email for course details.' },
    { label: 'Thanks for feedback', text: 'Thank you for the feedback! We appreciate your input.' },
    { label: 'Welcome 👋', text: 'Welcome to Swar Yoga! We\'re excited to have you here.' },
    { label: 'Need info? 📚', text: 'Sure! What information would you like to know about our programs?' },
    { label: 'Bye! 👋', text: 'Thank you! See you soon. Namaste 🙏' },
  ];
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

  // Ensure the Facebook JS SDK is loaded + initialised (mirrors SocialLoginButtons).
  const ensureFacebookSdk = async (): Promise<any> => {
    if (typeof window === 'undefined') throw new Error('Facebook SDK unavailable');
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
    if (!appId) throw new Error('Facebook App ID is not configured (NEXT_PUBLIC_FACEBOOK_APP_ID).');

    if (!document.getElementById('facebook-sdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-sdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v24.0';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    let retries = 20;
    while (!window.FB && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      retries -= 1;
    }
    if (!window.FB) throw new Error('Facebook SDK failed to load. Disable blockers and retry.');

    window.FB.init({ appId, xfbml: false, version: 'v24.0' });
    return window.FB;
  };

  // Send the connect-page request for a specific Page id.
  const connectSelectedPage = async (userAccessToken: string, pageId: string) => {
    setConnecting(true);
    setConnectionError(null);
    try {
      const adminToken = getStoredAdminToken();
      const res = await fetch('/api/admin/crm/social-inbox/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'connect-page', userAccessToken, pageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to connect Facebook Page');
      }
      setPageOptions(null);
      setPendingUserToken('');
      await loadMessengerShell();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect Facebook Page');
    } finally {
      setConnecting(false);
    }
  };

  // Step 1: FB.login → fetch the Pages this user manages → pick one (or auto-pick).
  const connectFacebookAccount = async () => {
    setConnectionError(null);
    setConnecting(true);
    try {
      const FB = await ensureFacebookSdk();
      const authResponse: any = await new Promise((resolve) => {
        FB.login(
          (response: any) => resolve(response),
          {
            scope: 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_manage_messages,instagram_content_publish,business_management',
            ...(process.env.NEXT_PUBLIC_FB_MESSENGER_CONFIG_ID
              ? { config_id: process.env.NEXT_PUBLIC_FB_MESSENGER_CONFIG_ID }
              : {}),
          },
        );
      });

      const userAccessToken = authResponse?.authResponse?.accessToken;
      if (!userAccessToken) {
        setConnecting(false);
        if (authResponse?.status !== 'connected') setConnectionError('Facebook login was cancelled.');
        return;
      }

      const adminToken = getStoredAdminToken();
      const res = await fetch('/api/admin/crm/social-inbox/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'list-pages', userAccessToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to read your Facebook Pages');
      }

      const pages = Array.isArray(data.pages) ? data.pages : [];
      if (pages.length === 0) {
        throw new Error('No Facebook Pages found on your account.');
      }
      if (pages.length === 1) {
        await connectSelectedPage(userAccessToken, pages[0].pageId);
        return;
      }
      // Multiple Pages — let the admin choose which one to connect.
      setPendingUserToken(userAccessToken);
      setPageOptions(pages);
      setConnecting(false);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect Facebook account');
      setConnecting(false);
    }
  };

  const getStoredAdminToken = useCallback(() => {
    return localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
  }, []);

  const loadAdminUsers = useCallback(async () => {
    const adminToken = getStoredAdminToken();
    if (!adminToken) return;

    try {
      const res = await fetch('/api/admin/auth/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdminUsers(Array.isArray(data?.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Failed to load admin users:', error);
    }
  }, [getStoredAdminToken]);

  const syncSidebarFromConversation = useCallback((conversation: Conversation | null) => {
    setSidebarData({
      labels: Array.isArray(conversation?.labels) ? conversation?.labels : [],
      notes: conversation?.notes || '',
      assignedTo: conversation?.assignedToUserId || '',
      status: conversation?.status || 'new_lead',
    });
  }, []);

  const loadMessengerMessages = useCallback(async (conversationId: string) => {
    const adminToken = getStoredAdminToken();
    if (!adminToken || !conversationId) return;

    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/crm/social-inbox/messages?platform=messenger&conversationId=${encodeURIComponent(conversationId)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load Messenger messages');
      }

      const conversation = data?.data?.conversation || null;
      const loadedMessages = Array.isArray(data?.data?.messages) ? data.data.messages : [];
      setMessages(loadedMessages);
      if (conversation) {
        setSelected(conversation);
        syncSidebarFromConversation(conversation);
        setConversations((prev) => prev.map((item) => (item._id === conversation._id ? { ...item, ...conversation, unreadCount: 0 } : item)));
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to load Messenger messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [getStoredAdminToken, syncSidebarFromConversation]);

  const loadMessengerConversations = useCallback(async () => {
    const adminToken = getStoredAdminToken();
    if (!adminToken) return;

    try {
      const res = await fetch('/api/admin/crm/social-inbox/conversations?platform=messenger', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load Messenger conversations');
      }

      const rows = Array.isArray(data?.data?.conversations) ? data.data.conversations : [];
      setConversations(rows);
      if (selected?._id) {
        const refreshedSelected = rows.find((item: Conversation) => item._id === selected._id) || null;
        if (refreshedSelected) {
          setSelected(refreshedSelected);
          syncSidebarFromConversation(refreshedSelected);
        }
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to load Messenger conversations');
      setConversations([]);
    }
  }, [getStoredAdminToken, selected?._id, syncSidebarFromConversation]);

  const loadMessengerShell = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setCheckingConnection(true);
    setConnectionError(null);
    setConnectionRestricted(false);

    try {
      const adminToken = getStoredAdminToken();

      if (!adminToken) {
        throw new Error('Admin token missing. Please sign in again.');
      }

      const res = await fetch('/api/admin/social-media/accounts', {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        setConnectionRestricted(true);
        setFacebookAccount(null);
        setSettingsScope(null);
      } else if (!res.ok) {
        setConnectionError(data?.error || 'Failed to check Facebook Page connection');
        setFacebookAccount(null);
        setSettingsScope(null);
      } else {
        const accounts = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.accounts)
            ? data.accounts
            : [];

        const connectedFacebook = accounts.find((account: ConnectedSocialAccount) => account?.platform === 'facebook' && account?.isConnected !== false) || null;
        setFacebookAccount(connectedFacebook);
        setSettingsScope(data?.scope || null);

        await loadAdminUsers();
        if (connectedFacebook) {
          await loadMessengerConversations();
        } else {
          setConversations([]);
          setSelected(null);
          setMessages([]);
        }
      }
    } catch (error) {
      setFacebookAccount(null);
      setSettingsScope(null);
      setConnectionError(error instanceof Error ? error.message : 'Failed to load Messenger connection status');
    } finally {
      setCheckingConnection(false);
      setLoading(false);
    }
  }, [token, getStoredAdminToken, loadAdminUsers, loadMessengerConversations]);

  useEffect(() => {
    if (!token) return;
    loadMessengerShell();
  }, [token, loadMessengerShell]);

  const handleDisconnectFacebook = useCallback(async () => {
    if (!facebookAccount?._id || disconnecting) return;
    if (!window.confirm('Disconnect this Facebook Page and its Messenger connection for this settings scope?')) return;

    try {
      setDisconnecting(true);
      const adminToken = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
      const res = await fetch(`/api/admin/social-media/accounts/${facebookAccount._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to disconnect Facebook Page');
      }
      setSelected(null);
      setMessages([]);
      setConversations([]);
      await loadMessengerShell();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to disconnect Facebook Page');
    } finally {
      setDisconnecting(false);
    }
  }, [facebookAccount?._id, disconnecting, loadMessengerShell]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelected(conv);
    syncSidebarFromConversation(conv);
    await loadMessengerMessages(conv._id);
  };

  const handleSaveSidebar = async () => {
    if (!selected) return;
    setSavingSidebar(true);
    try {
      const adminToken = getStoredAdminToken();
      const res = await fetch(`/api/admin/crm/social-inbox/conversations/${selected._id}?platform=messenger`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: sidebarData.status,
          notes: sidebarData.notes,
          assignedToUserId: sidebarData.assignedTo,
          labels: sidebarData.labels,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save conversation details');
      }
      const updated = data?.data;
      if (updated) {
        setSelected(updated);
        setConversations((prev) => prev.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)));
        syncSidebarFromConversation(updated);
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to save conversation details');
    } finally {
      setSavingSidebar(false);
    }
  };

  const handleSendMessage = async () => {
    if (!composerText.trim() || !selected) return;
    const messageText = composerText.trim();
    setComposerText('');
    try {
      const adminToken = getStoredAdminToken();
      const res = await fetch('/api/admin/crm/social-inbox/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          platform: 'messenger',
          conversationId: selected._id,
          messageContent: messageText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send Messenger message');
      }
      await loadMessengerMessages(selected._id);
      await loadMessengerConversations();
    } catch (error) {
      setComposerText(messageText);
      setSendError(error instanceof Error ? error.message : 'Failed to send Messenger message');
    }
  };

  const filteredConversations = conversations.filter(c => {
    const query = searchQuery.trim().toLowerCase();
    return !query
      || (c.participantName || '').toLowerCase().includes(query)
      || (c.participantUsername || '').toLowerCase().includes(query)
      || (c.participantId || '').toLowerCase().includes(query)
      || (c.phoneNumber || '').toLowerCase().includes(query)
      || (c.notes || '').toLowerCase().includes(query);
  });

  const connectionBadgeLabel = facebookAccount
    ? `Connected · ${facebookAccount.accountName}`
    : connectionRestricted
      ? 'Super Admin setup required'
      : 'Facebook Page not connected';

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
          <div className={`hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${facebookAccount ? 'bg-emerald-500/15 text-white border-emerald-200/30' : 'bg-white/10 text-white/80 border-white/20'}`}>
            <i className={`ph-bold ${facebookAccount ? 'ph-check-circle' : 'ph-plug'} text-xs`}></i>
            <span className="uppercase tracking-wider">{connectionBadgeLabel}</span>
          </div>
          {settingsScope && (
            <div className="hidden 2xl:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-white/10 text-white/80 border-white/20 text-[10px] font-bold uppercase tracking-wider">
              <i className="ph-bold ph-buildings text-xs"></i>
              <span>{settingsScope.label}</span>
            </div>
          )}
          {!connectionRestricted && (
            <>
              <button
                onClick={connectFacebookAccount}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-white/10 text-white/80 border-white/20 hover:bg-white/20 hover:text-white text-[10px] font-bold transition-all duration-200"
              >
                <i className={`ph-bold ${facebookAccount ? 'ph-gear-six' : 'ph-plug'} text-xs`}></i>
                <span className="hidden lg:inline uppercase tracking-wider">{facebookAccount ? 'Manage Page' : 'Connect Page'}</span>
              </button>
              {facebookAccount && (
                <button
                  onClick={handleDisconnectFacebook}
                  disabled={disconnecting}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-rose-500/15 text-white/90 border-rose-200/30 hover:bg-rose-500/25 hover:text-white text-[10px] font-bold transition-all duration-200 disabled:opacity-50"
                >
                  <i className="ph-bold ph-plug-charging text-xs"></i>
                  <span className="hidden lg:inline uppercase tracking-wider">{disconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
                </button>
              )}
            </>
          )}
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
                placeholder="Search by name or user ID..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm border border-indigo-100 text-xs font-medium focus:ring-2 focus:ring-indigo-300/30 focus:border-indigo-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Bulk selection bar */}
          {filteredConversations.length > 0 && (
            <div className="px-3 pb-2 flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 cursor-pointer accent-[#0078FF]"
                  checked={filteredConversations.length > 0 && filteredConversations.every((c) => selectedIds.has(c._id))}
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? new Set(filteredConversations.map((c) => c._id)) : new Set())
                  }
                />
                Select all
              </label>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-[11px] text-slate-400">{selectedIds.size} selected</span>
                  <button
                    onClick={() => setBulkOpen(true)}
                    className="ml-auto px-2.5 py-1 rounded-lg text-[11px] font-bold text-white transition-all active:scale-95 flex items-center gap-1"
                    style={{ background: 'linear-gradient(135deg, #0078FF 0%, #00A3FF 100%)' }}
                  >
                    <i className="ph-bold ph-paper-plane-right text-xs"></i>
                    Send template
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100"
                    title="Clear selection"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {connectionError ? (
              <div className="mx-3 mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                <div className="font-bold">Facebook connection check failed</div>
                <div className="mt-0.5">{connectionError}</div>
              </div>
            ) : null}

            {sendError ? (
              <div className="mx-3 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">
                      {/(#10)|outside of allowed window/i.test(sendError)
                        ? "Outside Meta's 24-hour reply window"
                        : 'Message not sent'}
                    </div>
                    <div className="mt-0.5 leading-snug">
                      {/(#10)|outside of allowed window/i.test(sendError)
                        ? 'Meta only lets a Page reply within 24 hours of the person\'s last message. This chat is older than that, so replies are blocked until they message you again.'
                        : sendError}
                    </div>
                  </div>
                  <button onClick={() => setSendError(null)} className="p-1 rounded hover:bg-amber-100 shrink-0" title="Dismiss">
                    <i className="ph ph-x"></i>
                  </button>
                </div>
              </div>
            ) : null}

            {loading || checkingConnection ? (
              <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(0,120,255,0.08), rgba(0,120,255,0.15))' }}>
                  <i className="ph ph-messenger-logo text-3xl text-indigo-400/60"></i>
                </div>
                <p className="text-sm font-bold text-slate-500">
                  {facebookAccount ? 'Facebook Page connected' : connectionRestricted ? 'Facebook Page setup is restricted' : 'No Messenger conversations yet'}
                </p>
                <p className="text-xs text-slate-400 text-center px-8 max-w-sm">
                  {facebookAccount
                    ? `Connected to ${facebookAccount.accountName}. Messenger chats will appear here as soon as people message the connected Page and the Meta inbox webhook is subscribed.`
                    : connectionRestricted
                      ? 'Only the Super Admin can connect the shared Facebook Page from Social Media Setup.'
                      : 'Connect your Facebook Page to receive Messenger chats here and to publish videos/posts to Facebook and Instagram from Social Media.'}
                </p>
                {!connectionRestricted && (
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={connectFacebookAccount}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0078FF] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0067d9]"
                    >
                      <i className={`ph-bold ${facebookAccount ? 'ph-gear-six' : 'ph-plug'} text-sm`}></i>
                      {facebookAccount ? 'Manage Facebook Page' : 'Connect Facebook Page'}
                    </button>
                    {facebookAccount && (
                      <button
                        onClick={handleDisconnectFacebook}
                        disabled={disconnecting}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        <i className="ph-bold ph-plug-charging text-sm"></i>
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    )}
                  </div>
                )}
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
                  <input
                    type="checkbox"
                    checked={selectedIds.has(conv._id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelected(conv._id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2.5 h-4 w-4 shrink-0 cursor-pointer accent-[#0078FF]"
                    title="Select for bulk send"
                  />
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: 'linear-gradient(135deg, #0078FF, #00A3FF)' }}>
                    {conv.participantName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-bold text-slate-900 truncate">{conv.participantName || 'Unknown'}</span>
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
                  <div className="text-[13px] font-bold text-slate-900 leading-none">{selected.participantName || 'Unknown'}</div>
                  <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{selected.participantId || selected.pageId || 'Messenger'}</div>
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
                          {msg.mediaUrl && msg.mediaType === 'image' && (
                            <div className="mb-2 rounded-lg overflow-hidden">
                              <img src={msg.mediaUrl} alt="" className="max-w-full rounded-lg" />
                            </div>
                          )}
                          {msg.messageContent && msg.messageContent !== '[unsupported message]'
                            ? msg.messageContent
                            : !msg.mediaUrl && msg.messageType === 'unsupported'
                              ? <span className="italic opacity-60 text-[13px]">📎 Unsupported message type</span>
                              : msg.messageContent === '[unsupported message]'
                                ? <span className="italic opacity-60 text-[13px]">📎 Shared something</span>
                                : null
                          }
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
                <SocialComposer
                  value={composerText}
                  onChange={setComposerText}
                  onSend={handleSendMessage}
                  token={token}
                  replyContext={[...messages].reverse().find((m) => m.direction === 'inbound')?.messageContent || ''}
                  quickReplies={quickReplies}
                  accent={{
                    color: '#0078FF',
                    soft: 'rgba(0,120,255,0.08)',
                    border: 'rgba(0,120,255,0.15)',
                    sendBg: 'linear-gradient(135deg, #0078FF 0%, #00A3FF 100%)',
                    sendShadow: '0 2px 8px rgba(0,120,255,0.3)',
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4" style={{ background: 'linear-gradient(180deg, #FAFCFF 0%, #F0F4FF 100%)' }}>
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(0,120,255,0.08) 0%, rgba(0,120,255,0.18) 100%)', boxShadow: '0 8px 24px rgba(0,120,255,0.1)' }}>
                <i className="ph ph-messenger-logo text-6xl text-indigo-400/40"></i>
              </div>
              <p className="font-bold text-lg text-slate-500">Messenger Inbox</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                {facebookAccount
                  ? `Facebook Page ${facebookAccount.accountName} is connected. Messenger conversations from that Page now use the CRM social inbox backend and will show here once Meta delivers webhook events.`
                  : 'Connect your Facebook Page to receive Messenger conversations. Select a conversation to start chatting.'}
              </p>
              {!connectionRestricted && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={connectFacebookAccount}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-[#0078FF] shadow-sm transition hover:bg-indigo-50"
                  >
                    <i className={`ph-bold ${facebookAccount ? 'ph-gear-six' : 'ph-plug'} text-sm`}></i>
                    {facebookAccount ? 'Manage Facebook Page' : 'Connect Facebook Page'}
                  </button>
                  {facebookAccount && (
                    <button
                      onClick={handleDisconnectFacebook}
                      disabled={disconnecting}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      <i className="ph-bold ph-plug-charging text-sm"></i>
                      {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  )}
                </div>
              )}

              {/* How-to-connect helper — shown only before a Page is connected */}
              {!facebookAccount && !connectionRestricted && (
                <div className="mt-2 w-full max-w-sm rounded-2xl border border-indigo-100 bg-white/70 p-4 text-left shadow-sm">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0078FF] mb-2">How to connect</div>
                  <ol className="space-y-2">
                    {[
                      'Click “Connect Facebook Page” and log in with the Facebook account that manages your Page.',
                      'Approve the permissions, then pick the Facebook Page you want to receive Messenger chats for.',
                      'Done — your old conversations import and new messages start arriving automatically.',
                    ].map((step, i) => (
                      <li key={i} className="flex gap-2.5 items-start">
                        <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#0078FF] text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="text-[11px] leading-snug text-slate-600">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200/60 px-2.5 py-1.5">
                    <i className="ph-bold ph-info text-amber-500 text-xs mt-0.5"></i>
                    <span className="text-[10px] leading-snug text-amber-700">You must be an <b>admin of a Facebook Page</b> — a personal profile alone won’t appear.</span>
                  </div>
                </div>
              )}
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
                  {selected.participantName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900 leading-tight">{selected.participantName || 'Unknown'}</h3>
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

      {/* Page picker modal — shown when the user manages more than one Facebook Page */}
      {pageOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => { if (!connecting) { setPageOptions(null); setPendingUserToken(''); } }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg, #0078FF, #00A3FF)' }}>
              <div className="text-sm font-extrabold">Choose a Facebook Page</div>
              <div className="text-[11px] text-white/80 mt-0.5">Connect the Page whose Messenger chats should land in this inbox.</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {pageOptions.map((p) => (
                <button
                  key={p.pageId}
                  disabled={connecting}
                  onClick={() => connectSelectedPage(pendingUserToken, p.pageId)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition text-left disabled:opacity-50"
                >
                  {p.picture ? (
                    <img src={p.picture} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #0078FF, #00A3FF)' }}>
                      {p.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.hasInstagram ? 'Facebook + Instagram' : 'Facebook Page'}</div>
                  </div>
                  <i className="ph-bold ph-caret-right text-slate-300"></i>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
              <button
                disabled={connecting}
                onClick={() => { setPageOptions(null); setPendingUserToken(''); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <SocialBulkSendModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        platform="messenger"
        conversationIds={Array.from(selectedIds)}
        token={token}
        accentColor="#0078FF"
        accentGradient="linear-gradient(135deg, #0078FF 0%, #00A3FF 100%)"
        onSent={() => { setSelectedIds(new Set()); loadMessengerConversations(); }}
      />

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
