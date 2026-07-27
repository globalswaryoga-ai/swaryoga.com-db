'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/admin/crm';

/* ─── Types ─── */
interface Conversation {
  _id: string;
  participantName?: string;
  participantId?: string;
  participantUsername?: string;
  igScopedId?: string;
  phoneNumber?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  status?: string;
  labels?: string[];
  assignedToUserId?: string;
  source?: string;
  profilePic?: string;
  notes?: string;
  isArchived?: boolean;
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
  isConnected?: boolean;
  metadata?: {
    autoConnectedVia?: string;
    linkedPageName?: string;
    followers?: number;
    postsCount?: number;
    lastSyncedAt?: string;
  };
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
export default function InstagramInboxPage() {
  const router = useRouter();
  const token = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const quickReplies = [
    { label: 'Thank you! 🙏', text: 'Thank you for your interest! We\'ll get back to you soon.' },
    { label: 'Enrolled ✅', text: 'Great! You\'re successfully enrolled. Check your email for course details.' },
    { label: 'Thanks for feedback', text: 'Thank you for the feedback! We appreciate your input.' },
    { label: 'Welcome 👋', text: 'Welcome to Swar Yoga! We\'re excited to have you here.' },
    { label: 'Need info? 📚', text: 'Sure! What information would you like to know about our programs?' },
    { label: 'Bye! 👋', text: 'Thank you! See you soon. Namaste 🙏' },
  ];
  const [showSidebar, setShowSidebar] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [sidebarData, setSidebarData] = useState<any>({ labels: [], notes: '', assignedTo: '', status: 'new_lead' });
  const [savingSidebar, setSavingSidebar] = useState(false);
  const [instagramAccount, setInstagramAccount] = useState<ConnectedSocialAccount | null>(null);
  const [facebookAccount, setFacebookAccount] = useState<ConnectedSocialAccount | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionRestricted, setConnectionRestricted] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [settingsScope, setSettingsScope] = useState<SettingsScopeInfo | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [pageOptions, setPageOptions] = useState<{ pageId: string; name: string; picture?: string | null; hasInstagram?: boolean }[] | null>(null);
  const [pendingUserToken, setPendingUserToken] = useState('');
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

  // Connect a specific Page (its linked Instagram business account is auto-connected).
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
        throw new Error(data?.error || 'Failed to connect Instagram account');
      }
      setPageOptions(null);
      setPendingUserToken('');
      await loadInstagramShell();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect Instagram account');
    } finally {
      setConnecting(false);
    }
  };

  // Instagram DMs flow through the linked Facebook Page, so we run the same Page connect.
  const connectMetaAccount = async () => {
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
        throw new Error('No Facebook Pages found. Instagram messaging requires a Page linked to your Instagram professional account.');
      }
      // Prefer Pages that already have a linked Instagram account.
      const igPages = pages.filter((p: any) => p.hasInstagram);
      const choices = igPages.length > 0 ? igPages : pages;
      if (choices.length === 1) {
        await connectSelectedPage(userAccessToken, choices[0].pageId);
        return;
      }
      setPendingUserToken(userAccessToken);
      setPageOptions(choices);
      setConnecting(false);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect Instagram account');
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
      followUpDate: sidebarData.followUpDate || '',
    });
  }, [sidebarData.followUpDate]);

  const loadInstagramMessages = useCallback(async (conversationId: string) => {
    const adminToken = getStoredAdminToken();
    if (!adminToken || !conversationId) return;

    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/crm/social-inbox/messages?platform=instagram&conversationId=${encodeURIComponent(conversationId)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load Instagram messages');
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
      setConnectionError(error instanceof Error ? error.message : 'Failed to load Instagram messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [getStoredAdminToken, syncSidebarFromConversation]);

  const loadInstagramConversations = useCallback(async () => {
    const adminToken = getStoredAdminToken();
    if (!adminToken) return;

    try {
      const res = await fetch('/api/admin/crm/social-inbox/conversations?platform=instagram', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load Instagram conversations');
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
      setConnectionError(error instanceof Error ? error.message : 'Failed to load Instagram conversations');
      setConversations([]);
    }
  }, [getStoredAdminToken, selected?._id, syncSidebarFromConversation]);

  const loadInstagramShell = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setCheckingConnection(true);
    setConnectionError(null);
    setConnectionRestricted(false);

    try {
      const adminToken = getStoredAdminToken();
      if (!adminToken) throw new Error('Admin token missing. Please sign in again.');

      const res = await fetch('/api/admin/social-media/accounts', {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        setConnectionRestricted(true);
        setFacebookAccount(null);
        setInstagramAccount(null);
        setSettingsScope(null);
      } else if (!res.ok) {
        setConnectionError(data?.error || 'Failed to check Meta connection status');
        setFacebookAccount(null);
        setInstagramAccount(null);
        setSettingsScope(null);
      } else {
        const accounts = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.accounts)
            ? data.accounts
            : [];

        setFacebookAccount(accounts.find((account: ConnectedSocialAccount) => account?.platform === 'facebook' && account?.isConnected !== false) || null);
        setInstagramAccount(accounts.find((account: ConnectedSocialAccount) => account?.platform === 'instagram' && account?.isConnected !== false) || null);
        setSettingsScope(data?.scope || null);

        await loadAdminUsers();
        if (accounts.find((account: ConnectedSocialAccount) => account?.platform === 'instagram' && account?.isConnected !== false)) {
          await loadInstagramConversations();
        } else {
          setConversations([]);
          setSelected(null);
          setMessages([]);
        }
      }
    } catch (error) {
      setFacebookAccount(null);
      setInstagramAccount(null);
      setSettingsScope(null);
      setConnectionError(error instanceof Error ? error.message : 'Failed to load Instagram connection status');
    } finally {
      setCheckingConnection(false);
      setLoading(false);
    }
  }, [token, getStoredAdminToken, loadAdminUsers, loadInstagramConversations]);

  useEffect(() => {
    if (!token) return;
    loadInstagramShell();
  }, [token, loadInstagramShell]);

  const handleDisconnectInstagram = useCallback(async () => {
    const targetId = instagramAccount?._id || facebookAccount?._id;
    if (!targetId || disconnecting) return;

    const label = instagramAccount ? 'Instagram connection' : 'Facebook Page connection';
    if (!window.confirm(`Disconnect this ${label} for this settings scope?`)) return;

    try {
      setDisconnecting(true);
      const adminToken = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
      const res = await fetch(`/api/admin/social-media/accounts/${targetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to disconnect Meta connection');
      }
      setSelected(null);
      setMessages([]);
      setConversations([]);
      await loadInstagramShell();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to disconnect Meta connection');
    } finally {
      setDisconnecting(false);
    }
  }, [instagramAccount?._id, facebookAccount?._id, disconnecting, loadInstagramShell]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-refresh conversations every 5 seconds
  useEffect(() => {
    if (!token || !instagramAccount) return;

    const interval = setInterval(() => {
      loadInstagramConversations();
      if (selected?._id) {
        loadInstagramMessages(selected._id);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [token, instagramAccount, selected?._id, loadInstagramConversations, loadInstagramMessages]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelected(conv);
    syncSidebarFromConversation(conv);
    await loadInstagramMessages(conv._id);
  };

  const handleSaveSidebar = async () => {
    if (!selected) return;
    setSavingSidebar(true);
    try {
      const adminToken = getStoredAdminToken();
      const res = await fetch(`/api/admin/crm/social-inbox/conversations/${selected._id}?platform=instagram`, {
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
        throw new Error(data?.error || 'Failed to save Instagram conversation');
      }
      const updated = data?.data;
      if (updated) {
        setSelected(updated);
        setConversations((prev) => prev.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)));
        syncSidebarFromConversation(updated);
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to save Instagram conversation');
    } finally {
      setSavingSidebar(false);
    }
  };

  const handleArchiveConversation = async () => {
    if (!selected) return;
    try {
      const adminToken = getStoredAdminToken();
      const res = await fetch(`/api/admin/crm/social-inbox/conversations/${selected._id}?platform=instagram`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          isArchived: !selected.isArchived,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to archive conversation');
      }
      const updated = data?.data;
      if (updated) {
        setSelected(null);
        setMessages([]);
        setConversations((prev) => prev.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)));
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to archive conversation');
    }
  };

  const handleSendMessage = async () => {
    if (!composerText.trim() || !selected) return;
    const messageText = composerText.trim();
    setComposerText('');

    // Show message optimistically immediately
    const optimisticMessage: Message = {
      _id: `temp-${Date.now()}`,
      direction: 'outbound',
      messageContent: messageText,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setMessages([...messages, optimisticMessage]);

    try {
      const adminToken = getStoredAdminToken();
      const res = await fetch('/api/admin/crm/social-inbox/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          platform: 'instagram',
          conversationId: selected._id,
          messageContent: messageText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send Instagram message');
      }
      // Refresh to get actual message ID and confirmation
      await loadInstagramMessages(selected._id);
      await loadInstagramConversations();
    } catch (error) {
      setComposerText(messageText);
      // Remove optimistic message on error
      setMessages(messages.filter(m => m._id !== optimisticMessage._id));
      setConnectionError(error instanceof Error ? error.message : 'Failed to send Instagram message');
    }
  };

  const filteredConversations = conversations.filter(c => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || (c.participantName || '').toLowerCase().includes(query)
      || (c.participantUsername || '').toLowerCase().includes(query)
      || (c.participantId || '').toLowerCase().includes(query)
      || (c.phoneNumber || '').toLowerCase().includes(query)
      || (c.notes || '').toLowerCase().includes(query);
    const matchesArchiveFilter = showArchived ? c.isArchived : !c.isArchived;
    return matchesSearch && matchesArchiveFilter;
  });

  const filteredMessages = messages.filter(m =>
    !messageSearchQuery || (m.messageContent || '').toLowerCase().includes(messageSearchQuery.toLowerCase())
  );

  const connectionBadgeLabel = instagramAccount
    ? `Connected · ${instagramAccount.accountName}`
    : facebookAccount
      ? 'Instagram not linked on Page yet'
      : connectionRestricted
        ? 'Super Admin setup required'
        : 'Instagram not connected';

  if (!token) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* HEADER */}
      <header className="px-3 py-1.5 flex items-center shrink-0 z-20" style={{ background: 'linear-gradient(135deg, #833AB4 0%, #C13584 35%, #E1306C 60%, #F77737 85%, #FCAF45 100%)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
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
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-all duration-200" title="Messenger" onClick={() => router.push('/admin/crm/messenger')}>
              <i className="ph-fill ph-messenger-logo text-sm"></i>
              <span className="hidden lg:inline">Messenger</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white text-[#C13584] shadow-md" title="Instagram">
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
          <div className={`hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${instagramAccount ? 'bg-white/15 text-white border-white/25' : 'bg-white/10 text-white/80 border-white/20'}`}>
            <i className={`ph-bold ${instagramAccount ? 'ph-check-circle' : 'ph-plug'} text-xs`}></i>
            <span className="uppercase tracking-wider">{connectionBadgeLabel}</span>
          </div>
          {settingsScope && (
            <div className="hidden 2xl:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-white/10 text-white/80 border-white/20 text-[10px] font-bold uppercase tracking-wider">
              <i className="ph-bold ph-buildings text-xs"></i>
              <span>{settingsScope.label}</span>
            </div>
          )}
          {instagramAccount && typeof instagramAccount.metadata?.followers === 'number' && (
            <div
              className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-white/15 text-white border-white/25 text-[10px] font-bold uppercase tracking-wider"
              title={instagramAccount.metadata?.lastSyncedAt ? `Last synced ${new Date(instagramAccount.metadata.lastSyncedAt).toLocaleString()}` : undefined}
            >
              <i className="ph-bold ph-users text-xs"></i>
              <span>{instagramAccount.metadata.followers.toLocaleString()} Followers</span>
              {typeof instagramAccount.metadata?.postsCount === 'number' && (
                <span className="opacity-70">· {instagramAccount.metadata.postsCount.toLocaleString()} Posts</span>
              )}
            </div>
          )}
          {!connectionRestricted && (
            <>
              <button onClick={connectMetaAccount} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-white/10 text-white/80 border-white/20 hover:bg-white/20 hover:text-white text-[10px] font-bold transition-all duration-200">
                <i className={`ph-bold ${instagramAccount ? 'ph-gear-six' : 'ph-plug'} text-xs`}></i>
                <span className="hidden lg:inline uppercase tracking-wider">{instagramAccount ? 'Manage Meta' : 'Connect Meta'}</span>
              </button>
              {(instagramAccount || facebookAccount) && (
                <button onClick={handleDisconnectInstagram} disabled={disconnecting} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-rose-500/15 text-white/90 border-rose-200/30 hover:bg-rose-500/25 hover:text-white text-[10px] font-bold transition-all duration-200 disabled:opacity-50">
                  <i className="ph-bold ph-plug-charging text-xs"></i>
                  <span className="hidden lg:inline uppercase tracking-wider">{disconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
                </button>
              )}
            </>
          )}
          <button onClick={() => router.push('/admin/crm/instagram-funnel')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-white/10 text-white/80 border-white/20 hover:bg-white/20 hover:text-white text-[10px] font-bold transition-all duration-200">
            <i className="ph-bold ph-funnel text-xs"></i>
            <span className="hidden lg:inline uppercase tracking-wider">Funnel</span>
          </button>
        </div>
      </header>

      {/* MAIN BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-[27rem] shrink-0 flex flex-col overflow-hidden border-r" style={{ background: 'linear-gradient(180deg, #FFF0F5 0%, #FFFAFC 100%)', borderColor: 'rgba(193,53,132,0.1)' }}>
          {/* Search & Archive Toggle */}
          <div className="p-2.5 flex gap-2">
            <div className="relative flex-1">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, @username, or user ID..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm border text-xs font-medium focus:ring-2 focus:ring-pink-300/30 focus:border-pink-400 outline-none transition-all"
                style={{ borderColor: 'rgba(193,53,132,0.15)' }}
              />
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              title={showArchived ? 'Show active conversations' : 'Show archived conversations'}
              className={`px-2 py-2 rounded-lg transition-all text-xs font-bold ${
                showArchived
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-white/60 text-slate-500 hover:bg-slate-100'
              }`}
              style={showArchived ? { borderColor: 'rgba(193,53,132,0.2)' } : {}}
            >
              <i className="ph ph-archive text-sm"></i>
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {connectionError ? (
              <div className="mx-3 mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                <div className="font-bold">Instagram connection check failed</div>
                <div className="mt-0.5">{connectionError}</div>
              </div>
            ) : null}

            {loading || checkingConnection ? (
              <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(193,53,132,0.08), rgba(225,48,108,0.15))' }}>
                  <i className="ph ph-instagram-logo text-3xl" style={{ color: 'rgba(193,53,132,0.5)' }}></i>
                </div>
                <p className="text-sm font-bold text-slate-500">
                  {instagramAccount ? 'Instagram connected' : facebookAccount ? 'Link Instagram to this Facebook Page' : connectionRestricted ? 'Instagram setup is restricted' : 'No Instagram conversations yet'}
                </p>
                <p className="text-xs text-slate-400 text-center px-8 max-w-sm">
                  {instagramAccount
                    ? `Connected to ${instagramAccount.accountName}. Instagram DMs will appear here as soon as Meta delivers webhook events for the connected Instagram inbox.`
                    : facebookAccount
                      ? 'Your Facebook Page is connected. Link an Instagram Professional account to that same Page in Meta, then this CRM can auto-connect it here.'
                      : connectionRestricted
                        ? 'Only the Super Admin can connect the shared Meta Page and its linked Instagram account.'
                        : 'Connect your Meta Facebook Page first. If an Instagram Professional account is linked to that Page, this CRM will auto-connect it.'}
                </p>
                {!connectionRestricted && (
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <button onClick={connectMetaAccount} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #833AB4 0%, #C13584 50%, #E1306C 100%)' }}>
                      <i className={`ph-bold ${instagramAccount ? 'ph-gear-six' : 'ph-plug'} text-sm`}></i>
                      {instagramAccount ? 'Manage Meta Connection' : 'Connect Meta'}
                    </button>
                    {(instagramAccount || facebookAccount) && (
                      <button onClick={handleDisconnectInstagram} disabled={disconnecting} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50">
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
                      ? 'border rounded-lg shadow-sm mx-1 my-0.5'
                      : 'bg-white border rounded-lg mx-1 my-0.5 hover:shadow-sm hover:translate-x-[2px]'
                  }`}
                  style={{
                    background: selected?._id === conv._id ? 'rgba(193,53,132,0.04)' : undefined,
                    borderColor: selected?._id === conv._id ? 'rgba(193,53,132,0.2)' : 'rgba(193,53,132,0.08)',
                  }}
                >
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: 'linear-gradient(135deg, #833AB4, #C13584, #E1306C, #F77737)' }}>
                    {conv.participantName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-bold text-slate-900 truncate">{conv.participantName || 'Unknown'}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}</span>
                    </div>
                    {conv.participantUsername && <p className="text-[10px] text-pink-500/70 font-semibold">@{conv.participantUsername}</p>}
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{conv.lastMessage || 'No messages'}</p>
                  </div>
                  {(conv.unreadCount || 0) > 0 && (
                    <div className="absolute top-2 right-2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1" style={{ background: 'linear-gradient(135deg, #E1306C, #F77737)' }}>
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* CHAT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10" style={{ background: 'linear-gradient(180deg, #FFFAFC 0%, #FFF5F8 100%)', boxShadow: '0 8px 32px rgba(193,53,132,0.06)' }}>
          {selected ? (
            <>
              {/* Chat Header */}
              <div className="px-3 py-1.5 flex gap-2 items-center sticky top-0 z-30 shrink-0 backdrop-blur-md flex-col lg:flex-row" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,240,245,0.4) 100%)', borderBottom: '1px solid rgba(193,53,132,0.1)' }}>
                <div className="flex gap-2 items-center w-full lg:w-auto">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0" style={{ background: 'linear-gradient(135deg, #833AB4, #C13584, #E1306C)' }}>
                    <i className="ph ph-user text-sm"></i>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-900 leading-none">{selected.participantName || 'Unknown'}</div>
                    <div className="text-[10px] font-semibold mt-0.5" style={{ color: '#C13584' }}>{selected.participantUsername ? `@${selected.participantUsername}` : selected.participantId || 'Instagram'}</div>
                  </div>
                  <div className="ml-auto lg:ml-0">
                    <button
                      className={`p-1.5 rounded-md transition-colors ${showSidebar ? 'text-pink-600' : 'text-slate-500 hover:bg-slate-50'}`}
                      style={showSidebar ? { background: 'rgba(193,53,132,0.08)' } : {}}
                      onClick={() => setShowSidebar(!showSidebar)}
                    >
                      <i className={`ph ${showSidebar ? 'ph-sidebar-simple' : 'ph-sidebar'} text-sm`}></i>
                    </button>
                  </div>
                </div>
                <div className="w-full lg:w-auto relative flex-1 lg:flex-none">
                  <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                  <input
                    type="text"
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm border text-[11px] font-medium focus:ring-2 focus:ring-pink-300/30 focus:border-pink-400 outline-none transition-all"
                    style={{ borderColor: 'rgba(193,53,132,0.15)' }}
                  />
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3" style={{ backgroundColor: '#FFF8FA', backgroundImage: 'radial-gradient(circle, rgba(193,53,132,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(193,53,132,0.08), rgba(225,48,108,0.15))' }}>
                      <i className="ph ph-chat-circle-dots text-3xl" style={{ color: 'rgba(193,53,132,0.4)' }}></i>
                    </div>
                    <p className="text-sm font-bold text-slate-500">No messages yet</p>
                    <p className="text-xs text-slate-400">Messages will appear here once connected.</p>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(193,53,132,0.08), rgba(225,48,108,0.15))' }}>
                      <i className="ph ph-magnifying-glass text-3xl" style={{ color: 'rgba(193,53,132,0.4)' }}></i>
                    </div>
                    <p className="text-sm font-bold text-slate-500">No messages found</p>
                    <p className="text-xs text-slate-400">Try searching for different words.</p>
                  </div>
                ) : (
                  <>
                    {filteredMessages.map((msg) => (
                      <div key={msg._id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[360px] rounded-2xl text-[14px] px-3.5 py-2.5 ${
                          msg.direction === 'outbound'
                            ? 'text-white rounded-tr-sm shadow-sm'
                            : 'bg-white text-slate-900 rounded-tl-sm shadow-sm'
                        }`} style={
                          msg.direction === 'outbound'
                            ? { background: 'linear-gradient(135deg, #833AB4, #C13584, #E1306C)' }
                            : { border: '1px solid rgba(193,53,132,0.1)' }
                        }>
                          {msg.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden">
                              {msg.mediaType === 'image' ? (
                                <img src={msg.mediaUrl} alt="" className="max-w-full rounded-xl" />
                              ) : msg.mediaType === 'video' ? (
                                <video src={msg.mediaUrl} controls className="max-w-full rounded-xl" />
                              ) : null}
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
                          <div className={`text-[9px] mt-1 flex items-center gap-1 ${msg.direction === 'outbound' ? 'text-white/60' : 'text-slate-400'}`}>
                            <span>
                              {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.direction === 'outbound' && (
                              <span className="ml-1">
                                {msg._id.startsWith('temp-') ? '⏱️' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Composer */}
              <div className="px-3 pt-2 pb-6 shrink-0 z-30 backdrop-blur-md relative" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.98) 0%, rgba(255,240,245,0.9) 100%)', borderTop: '1px solid rgba(193,53,132,0.1)' }}>
                {/* Quick Replies Dropdown */}
                {showQuickReplies && (
                  <div className="absolute bottom-20 left-3 bg-white rounded-xl border shadow-lg p-2 w-80 max-h-48 overflow-y-auto z-50" style={{ borderColor: 'rgba(193,53,132,0.2)' }}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-1">Quick Replies</p>
                    {quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setComposerText(reply.text);
                          setShowQuickReplies(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-pink-50 text-[12px] font-medium text-slate-700 transition-colors"
                      >
                        {reply.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2 max-w-6xl mx-auto">
                  <button
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    title="Quick replies"
                    className="text-slate-500 h-9 px-3 rounded-2xl font-bold text-sm transition-all hover:bg-slate-100 hover:text-slate-700"
                  >
                    <i className="ph-bold ph-lightning text-lg"></i>
                  </button>

                  <div className="flex-1 rounded-2xl bg-white/80 backdrop-blur-sm transition-all relative" style={{ border: '1px solid rgba(193,53,132,0.15)', boxShadow: '0 2px 8px rgba(193,53,132,0.06)' }}>
                    <textarea
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder="Send a message..."
                      rows={1}
                      className="w-full px-4 py-2.5 border-none focus:ring-0 max-h-28 min-h-[36px] placeholder:text-slate-400 font-medium text-slate-700 text-[13px] resize-none bg-transparent outline-none rounded-2xl"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!composerText.trim()}
                    className="text-white h-9 px-4 rounded-2xl font-bold text-xs transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 self-end hover:shadow-lg hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #833AB4 0%, #C13584 50%, #E1306C 100%)', boxShadow: '0 2px 12px rgba(193,53,132,0.35)' }}
                  >
                    <i className="ph-bold ph-paper-plane-right text-sm"></i>
                    <span className="hidden xl:inline">Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4" style={{ background: 'linear-gradient(180deg, #FFFAFC 0%, #FFF0F5 100%)' }}>
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(131,58,180,0.1) 0%, rgba(193,53,132,0.15) 30%, rgba(225,48,108,0.12) 60%, rgba(247,119,55,0.1) 100%)', boxShadow: '0 8px 24px rgba(193,53,132,0.1)' }}>
                <i className="ph ph-instagram-logo text-6xl" style={{ color: 'rgba(193,53,132,0.35)' }}></i>
              </div>
              <p className="font-bold text-lg text-slate-500">Instagram Inbox</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                {instagramAccount
                  ? `Instagram account ${instagramAccount.accountName} is connected. Conversations now use the CRM social inbox backend and will show here once Meta inbox webhook events arrive.`
                  : facebookAccount
                    ? 'Your Facebook Page is connected. Link the Instagram Professional account to that Page in Meta to auto-connect Instagram here.'
                    : 'Connect your Instagram Professional Account through Meta to receive DMs. Select a conversation to start chatting.'}
              </p>
              {!connectionRestricted && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button onClick={connectMetaAccount} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-xs font-bold shadow-sm transition hover:bg-pink-50" style={{ borderColor: 'rgba(193,53,132,0.2)', color: '#C13584' }}>
                    <i className={`ph-bold ${instagramAccount ? 'ph-gear-six' : 'ph-plug'} text-sm`}></i>
                    {instagramAccount ? 'Manage Meta Connection' : 'Connect Meta'}
                  </button>
                  {(instagramAccount || facebookAccount) && (
                    <button onClick={handleDisconnectInstagram} disabled={disconnecting} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50">
                      <i className="ph-bold ph-plug-charging text-sm"></i>
                      {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  )}
                </div>
              )}

              {/* How-to-connect helper — shown only before Instagram is connected */}
              {!instagramAccount && !connectionRestricted && (
                <div className="mt-2 w-full max-w-sm rounded-2xl border p-4 text-left shadow-sm bg-white/70" style={{ borderColor: 'rgba(193,53,132,0.15)' }}>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#C13584' }}>How to connect</div>
                  <ol className="space-y-2">
                    {[
                      'Click “Connect Meta” and log in with the Facebook account that manages your Page.',
                      'Approve the permissions, then pick the Facebook Page that has your Instagram linked.',
                      'Done — Instagram auto-connects, old DMs import, and new messages start arriving.',
                    ].map((step, i) => (
                      <li key={i} className="flex gap-2.5 items-start">
                        <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #833AB4, #C13584, #E1306C)' }}>{i + 1}</span>
                        <span className="text-[11px] leading-snug text-slate-600">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200/60 px-2.5 py-1.5">
                    <i className="ph-bold ph-info text-amber-500 text-xs mt-0.5"></i>
                    <span className="text-[10px] leading-snug text-amber-700">Instagram must be a <b>Professional (Business/Creator) account linked to your Facebook Page</b>. Personal IG accounts won’t connect.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        {showSidebar && selected && (
          <aside className="w-72 p-4 overflow-y-auto shrink-0 backdrop-blur-sm" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,240,245,0.9) 100%)', borderLeft: '1px solid rgba(193,53,132,0.1)' }}>
            {/* Avatar */}
            <div className="mb-4 p-1 pb-3" style={{ borderBottom: '1px solid rgba(193,53,132,0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0" style={{ background: 'linear-gradient(135deg, #833AB4 0%, #C13584 35%, #E1306C 70%, #F77737 100%)', boxShadow: '0 4px 12px rgba(193,53,132,0.3)' }}>
                  {selected.participantName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900 leading-tight">{selected.participantName || 'Unknown'}</h3>
                  <p className="text-xs font-semibold" style={{ color: '#C13584' }}>{selected.participantUsername ? `@${selected.participantUsername}` : 'Instagram'}</p>
                </div>
              </div>
            </div>

            {/* CRM Details */}
            <div className="space-y-6">
              <section>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">CRM Details</label>
                <div className="space-y-2.5">
                  {/* Assign To */}
                  <div className="flex flex-col gap-1 text-sm py-1.5">
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Assign To</span>
                    <select
                      className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-pink-300/20 focus:border-pink-400 outline-none font-semibold"
                      style={{ background: 'rgba(255,250,252,0.8)', borderColor: 'rgba(193,53,132,0.15)', color: '#C13584' }}
                      value={sidebarData.assignedTo}
                      onChange={(e) => setSidebarData({ ...sidebarData, assignedTo: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {adminUsers.map(u => (
                        <option key={u.userId} value={u.userId}>{u.name || u.userId}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col gap-1 text-sm py-1.5">
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Status</span>
                    <select
                      className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-pink-300/20 focus:border-pink-400 outline-none font-semibold"
                      style={{ background: 'rgba(255,250,252,0.8)', borderColor: 'rgba(193,53,132,0.15)', color: '#C13584' }}
                      value={sidebarData.status}
                      onChange={(e) => setSidebarData({ ...sidebarData, status: e.target.value })}
                    >
                      {['new_lead','contacted','interested','demo_trial','negotiation','enrolled','completed','inactive','repeater','old_sadhak','only_for_post'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>

                  {/* Labels */}
                  <div className="flex flex-col gap-1 text-sm py-1.5">
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Labels</span>
                    <select
                      className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-pink-300/20 focus:border-pink-400 outline-none font-semibold"
                      style={{ background: 'rgba(255,250,252,0.8)', borderColor: 'rgba(193,53,132,0.15)', color: '#C13584' }}
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !sidebarData.labels.includes(val)) {
                          setSidebarData({ ...sidebarData, labels: [...sidebarData.labels, val] });
                        }
                      }}
                    >
                      <option value="">+ Add label...</option>
                      {['New', 'Chatting Replying', 'No Reply', 'Call Pending', 'Call Done', 'Interested', 'Enrolled'].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    {sidebarData.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sidebarData.labels.map((l: string) => (
                          <span key={l} className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white cursor-pointer hover:opacity-80 transition-opacity" style={{ background: 'linear-gradient(135deg, #C13584, #E1306C)' }} onClick={() => setSidebarData({ ...sidebarData, labels: sidebarData.labels.filter((x: string) => x !== l) })}>
                            {l} ×
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1 text-sm py-1.5">
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Internal Notes</span>
                    <textarea
                      className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-pink-300/20 focus:border-pink-400 outline-none resize-none"
                      style={{ background: 'rgba(255,250,252,0.8)', borderColor: 'rgba(193,53,132,0.15)' }}
                      rows={3}
                      value={sidebarData.notes}
                      onChange={(e) => setSidebarData({ ...sidebarData, notes: e.target.value })}
                      placeholder="Add notes..."
                    />
                  </div>

                  {/* Follow Up */}
                  <div className="flex flex-col gap-1 text-sm py-1.5">
                    <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Follow Up Schedule</span>
                    <input
                      type="date"
                      className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-pink-300/20 focus:border-pink-400 outline-none font-semibold"
                      style={{ background: 'rgba(255,250,252,0.8)', borderColor: 'rgba(193,53,132,0.15)', color: '#C13584' }}
                      value={sidebarData.followUpDate || ''}
                      onChange={(e) => setSidebarData({ ...sidebarData, followUpDate: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <button
                onClick={handleSaveSidebar}
                disabled={savingSidebar}
                className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #833AB4, #C13584, #E1306C)', boxShadow: '0 2px 12px rgba(193,53,132,0.3)' }}
              >
                <i className="ph-bold ph-floppy-disk text-sm"></i>
                {savingSidebar ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                onClick={handleArchiveConversation}
                className="w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border"
                style={{
                  color: selected?.isArchived ? '#047857' : '#f59e0b',
                  borderColor: selected?.isArchived ? 'rgba(4,120,87,0.3)' : 'rgba(245,158,11,0.3)',
                  background: selected?.isArchived ? 'rgba(4,120,87,0.05)' : 'rgba(245,158,11,0.05)',
                }}
              >
                <i className={`ph-bold ${selected?.isArchived ? 'ph-arrow-counter-clockwise' : 'ph-archive'} text-sm`}></i>
                {selected?.isArchived ? 'Unarchive' : 'Archive'}
              </button>

              <button className="w-full py-2 rounded-xl text-xs font-bold transition-all text-red-500 hover:bg-red-50 border border-red-200 flex items-center justify-center gap-2">
                <i className="ph-bold ph-prohibit text-sm"></i>
                Block User
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Page picker modal — pick the Page whose linked Instagram should connect */}
      {pageOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => { if (!connecting) { setPageOptions(null); setPendingUserToken(''); } }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)' }}>
              <div className="text-sm font-extrabold">Choose a Facebook Page</div>
              <div className="text-[11px] text-white/80 mt-0.5">Instagram DMs flow through the Page linked to your Instagram professional account.</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {pageOptions.map((p) => (
                <button
                  key={p.pageId}
                  disabled={connecting}
                  onClick={() => connectSelectedPage(pendingUserToken, p.pageId)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pink-50 transition text-left disabled:opacity-50"
                >
                  {p.picture ? (
                    <img src={p.picture} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)' }}>
                      {p.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.hasInstagram ? 'Has linked Instagram' : 'No Instagram linked'}</div>
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

      {/* Phosphor Icons CDN + Font + Instagram Theme Scrollbar */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #FFF8FA; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #833AB4 0%, #C13584 50%, #E1306C 100%); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #6A2E94 0%, #A12B6E 50%, #C12860 100%); }
        ::selection { background: rgba(193,53,132,0.2); color: inherit; }
      `}</style>
    </div>
  );
}
