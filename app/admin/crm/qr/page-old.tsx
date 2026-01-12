// QR WhatsApp 1-1 Inbox (Shared WhatsApp Web session).
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function QRWhatsAppInboxPage() {
  const token = useAuth();

  const [status, setStatus] = useState('loading');
  const [qr, setQr] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [syncedMediaIds, setSyncedMediaIds] = useState<Set<string>>(new Set());
  const [syncingMediaIds, setSyncingMediaIds] = useState<Set<string>>(new Set());
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [selectedChat, setSelectedChat] = useState<any>(null);

  // Helper to safely get string ID from a chat object
  const getChatIdStr = (chat: any) => {
    if (!chat || !chat.id) return '';
    if (typeof chat.id === 'string') return chat.id;
    return chat.id._serialized || chat.id.id || '';
  };

  const selectedChatIdStr = useMemo(() => getChatIdStr(selectedChat), [selectedChat]);

  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<any[]>([]);
  const [messageLimit, setMessageLimit] = useState(5);
  const [newMessage, setNewMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video' | 'buttons' | 'document'>('text');
  const [buttonLabels, setButtonLabels] = useState<string[]>(['', '', '']);
  const [showRichControls, setShowRichControls] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [starToolsOpen, setStarToolsOpen] = useState(false);
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delayTime, setDelayTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [assignedUser, setAssignedUser] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [chatDirectionFilter, setChatDirectionFilter] = useState<'All' | 'Incoming' | 'Outgoing'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'white' | 'dark' | 'green' | 'blue' | 'lavender'>('white');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectInFlightRef = useRef(false);
  const lastReconnectAtRef = useRef<number>(0);
  const [lastBridgeError, setLastBridgeError] = useState<string | null>(null);
  const [lastStatusCheckAt, setLastStatusCheckAt] = useState<number | null>(null);
  const [lastConnectedAt, setLastConnectedAt] = useState<number | null>(null);
  const [adminUser, setAdminUser] = useState<{ userId?: string; name?: string } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(360);
  const isResizingRef = useRef(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(360);

  const themeConfig = {
    white: { bg: 'bg-white', border: 'border-slate-100', text: 'text-slate-900', sidebar: 'bg-slate-50/80', chatBg: '#efeae2', header: 'bg-white/90' },
    dark: { bg: 'bg-slate-950', border: 'border-slate-800', text: 'text-white', sidebar: 'bg-slate-900', chatBg: '#0b141a', header: 'bg-slate-900/95' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900', sidebar: 'bg-emerald-100/40', chatBg: '#dcfce7', header: 'bg-emerald-50/90' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', sidebar: 'bg-blue-100/40', chatBg: '#dbeafe', header: 'bg-blue-50/90' },
    lavender: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-900', sidebar: 'bg-purple-100/40', chatBg: '#f3e8ff', header: 'bg-purple-50/90' },
  };

  const currentTheme = themeConfig[theme];
  
  // NEW CRM SELECTIONS
  const [leadStatuses] = useState(['Leads', 'Prospect', 'Interested', 'Customer', 'Inactive']);
  const [leadLabels] = useState(['New', 'Chatting', 'Replying', 'Ready to call', 'Call done', 'Interested', 'Next time', 'Enrolled', 'No reply']);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [pollData, setPollData] = useState({ 
    question: '', 
    options: ['', ''] 
  });
  const [buttonModalOpen, setButtonModalOpen] = useState(false);
  const [buttonData, setButtonData] = useState({
    text: '',
    buttons: ['', '', '']
  });

  const [teamMembers, setTeamMembers] = useState<any[]>([
    { id: 'admin', name: 'System Admin' },
    { id: 'mohan', name: 'Mohan Kalburgi' },
    { id: 'sales_1', name: 'Sales Head' },
    { id: 'support_1', name: 'Customer Success' }
  ]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bridgeUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
  const bridgeSecret = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

  const bridgeFetch = (url: string, options: any = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-bridge-secret': bridgeSecret
      }
    });
  };

  useEffect(() => {
    // Load admin user info (stored at login) for display in the sidebar
    try {
      const raw = localStorage.getItem('admin_user') || localStorage.getItem('adminUser');
      if (raw) {
        const parsed = raw.startsWith('{') ? JSON.parse(raw) : { userId: raw };
        setAdminUser(parsed);
      }
      // Load cached chats (quick startup) so old saved chats are visible immediately
      const cached = localStorage.getItem('qr_chats');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length) {
            setChats(parsed);
          }
        } catch (e) {
          /* ignore */
        }
      }
    } catch (err) {
      // ignore
    }
  }, []);

  // Persist sidebar width and restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem('qr_sidebar_width');
      if (raw) setSidebarWidth(parseInt(raw, 10) || 280);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('qr_sidebar_width', String(sidebarWidth)); } catch (e) {}
  }, [sidebarWidth]);

  // Resizer handlers
  const startResize = (e: any) => {
    isResizingRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    startWidthRef.current = sidebarWidth;
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: any) => {
      if (!isResizingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const delta = clientX - startXRef.current;
      const next = Math.min(600, Math.max(200, Math.round(startWidthRef.current + delta)));
      setSidebarWidth(next);
    };
    const onUp = () => { isResizingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [sidebarWidth]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        if (!token) return;
        setLastStatusCheckAt(Date.now());
        const res = await bridgeFetch(`${bridgeUrl}/status`);
        if (!res.ok) throw new Error('Bridge unreachable');
        const data = await res.json();
        
        // Handle all valid bridge statuses from services/whatsapp-web/index.js
        // valid: disconnected, qr, connecting, connected, authenticated
        if (data.status === 'connected' || data.status === 'authenticated') {
          setStatus('connected');
          setLastBridgeError(null);
          setLastConnectedAt(Date.now());
          fetchChats();
        } else if (data.status === 'qr') {
          setStatus('qr');
          fetchQR();
        } else if (data.status === 'connecting') {
          setStatus('connecting');
        } else {
          setStatus('disconnected');
        }
      } catch (e) {
        console.error('Bridge not reachable');
        setLastBridgeError('Bridge not reachable');
        setStatus('disconnected'); 
      }
    };
    
    checkStatus();
    // Refresh status every 10s for better responsiveness
    const timer = setInterval(checkStatus, 10000);
    return () => clearInterval(timer);
  }, [bridgeUrl, token]);

  const fetchQR = async () => {
    try {
      const response = await bridgeFetch(`${bridgeUrl}/qr`);
      const data = await response.json();
      if (data.qr) setQr(data.qr);
    } catch (err) {
      console.error('Failed to fetch QR', err);
    }
  };

  const openQr = async () => {
    setQrModalOpen(true);
    await fetchQR(); // Fetch fresh QR code when modal opens
  };

  const logout = async () => {
    try {
      // Try a logout endpoint if bridge supports it, otherwise disconnect
      await bridgeFetch(`${bridgeUrl}/logout`, { method: 'POST' }).catch(() => Promise.resolve());
      await bridgeFetch(`${bridgeUrl}/disconnect`, { method: 'POST' }).catch(() => Promise.resolve());
      setStatus('disconnected');
      alert('Logged out of WhatsApp bridge');
    } catch (err: any) {
      console.error('Logout failed', err);
      alert('Logout failed: ' + (err?.message || String(err)));
    }
  };

  const fetchChats = async () => {
    if (loadingChats || !token) return;
    setLoadingChats(true);
    try {
      // 1. Try CRM API (with assignments logic)
      const res = await fetch('/api/admin/crm/whatsapp/qr/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.chats)) {
        setChats(data.chats);
        return;
      }
      
      // 2. Fallback: Try direct bridge (if CRM API is unreachable or fails)
      console.warn('CRM Chats API failed, trying direct bridge fallback...');
      const bridgeRes = await bridgeFetch(`${bridgeUrl}/chats`);
      const bridgeData = await bridgeRes.json();
      if (Array.isArray(bridgeData.chats)) {
        setChats(bridgeData.chats);
      }
    } catch (e) {
      console.error('Failed to fetch chats from all sources');
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    if (!selectedChatIdStr || selectedChatIdStr === '[object Object]') {
      setMessages([]);
      return;
    }
    
    fetchMessages(selectedChatIdStr);
    const msgInterval = setInterval(() => fetchMessages(selectedChatIdStr), 10000);
    return () => clearInterval(msgInterval);
  }, [selectedChatIdStr]);

  // Cache chats list locally so previously-loaded conversations show up instantly
  useEffect(() => {
    try {
      // Only persist when we have valid chat IDs; avoid overwriting cache with empty/partial data.
      const minimal = chats
        .map((c) => ({
          id: getChatIdStr(c),
          name: c.name,
          lastMessage: c.lastMessage,
          unreadCount: c.unreadCount,
          isGroup: (c as any).isGroup,
        }))
        .filter((c) => Boolean(c.id));
      if (minimal.length > 0) {
        localStorage.setItem('qr_chats', JSON.stringify(minimal));
        localStorage.setItem('qr_chats_updatedAt', String(Date.now()));
      }
    } catch (e) { /* ignore */ }
  }, [chats]);

  const readCachedMessages = (chatId: string) => {
    try {
      const raw = localStorage.getItem(`qr_messages:${chatId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const writeCachedMessages = (chatId: string, msgs: any[]) => {
    try {
      localStorage.setItem(`qr_messages:${chatId}`, JSON.stringify(msgs));
      localStorage.setItem(`qr_messages_updatedAt:${chatId}`, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const fetchMessages = async (chatId: string) => {
    if (!chatId || chatId === '[object Object]') return;
    // Show cached messages immediately (fast UX), then refresh in background.
    const cached = readCachedMessages(chatId);
    if (cached && cached.length) {
      setMessages(cached);
    }
    setLoadingMessages(true);
    try {
      const res = await bridgeFetch(`${bridgeUrl}/messages/${chatId}`);
      if (!res.ok) throw new Error('Messages fetch failed');
      const data = await res.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
        writeCachedMessages(chatId, data.messages);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (token) {
      await fetchChats();
      if (selectedChatIdStr) await fetchMessages(selectedChatIdStr);
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch chats and messages when the tab is active
        if (token) {
          fetchChats();
          if (selectedChatIdStr) fetchMessages(selectedChatIdStr);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedChatIdStr, token]);

  const sendMessage = async () => {
    if (!selectedChat || sending) return;
    
    const totalDelayMs = (delayTime.minutes * 60 + delayTime.seconds) * 1000;
    
    if (totalDelayMs > 0) {
      const confirmDelay = window.confirm(`Send this message in ${totalDelayMs/1000} seconds?`);
      if (!confirmDelay) return;
      
      setSending(true);
      // Wait for the delay
      await new Promise(resolve => setTimeout(resolve, totalDelayMs));
      setDelayTime({ ...delayTime, minutes: 0, seconds: 0 });
    }

    setSending(true);
    try {
      const payload: any = {
        to: selectedChatIdStr,
        message: newMessage,
        type: mediaType,
      };

      if (mediaType !== 'text' && mediaUrl) {
         payload.url = mediaUrl;
      }
      
      if (mediaType === 'buttons') {
         payload.buttons = buttonLabels.filter(l => l.trim() !== '');
      }

      // USE BACKEND SEND API (For attribution & logging)
      await fetch('/api/admin/crm/whatsapp/qr/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      setNewMessage('');
      setMediaUrl('');
      setMediaType('text');
      setShowRichControls(false);
      setTimeout(() => fetchMessages(selectedChatIdStr), 1500);
    } catch (e) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startConnection = async () => {
    try {
      await bridgeFetch(`${bridgeUrl}/connect`, { method: 'POST' });
      setStatus('connecting');
      setLastBridgeError(null);
    } catch (e) {
      setLastBridgeError('Failed to start connection');
      alert(`Could not reach WhatsApp Bridge at ${bridgeUrl}`);
    }
  };

  const closeConnectModal = async () => {
    // Close modal and attempt to stop any in-progress bridge connection
    setConnectModalOpen(false);
    try {
      await bridgeFetch(`${bridgeUrl}/disconnect`, { method: 'POST' });
      setStatus('disconnected');
    } catch (err) {
      // ignore errors - disconnect is best-effort
      console.warn('Disconnect request failed', err);
    }
  };

  // Auto-reconnect logic with exponential backoff. This will increment
  // reconnectAttempts and try startConnection() when the bridge is down.
  useEffect(() => {
    if (!token) return;

    // Always clear any previous timer before scheduling a new one.
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const shouldTry = status !== 'connected' && status !== 'authenticated';
    if (!shouldTry) {
      setReconnectAttempts(0);
      reconnectInFlightRef.current = false;
      return;
    }

    // If user dismissed the popup, we still keep background attempts, but be gentler.
    const baseDelayMs = popupDismissed ? 5000 : 2000;
    // compute delay based on attempts (clamped + jitter)
    const attempts = reconnectAttempts;
    const rawDelay = baseDelayMs * Math.pow(1.8, attempts);
    const clamped = Math.min(120000, Math.max(baseDelayMs, rawDelay));
    const jitter = 0.8 + Math.random() * 0.4; // 0.8x - 1.2x
    const delay = Math.round(clamped * jitter);

    reconnectTimeoutRef.current = window.setTimeout(async () => {
      try {
        // Prevent rapid-fire retries (ex: status polling + effect reruns)
        const now = Date.now();
        if (reconnectInFlightRef.current) return;
        if (now - lastReconnectAtRef.current < 1500) return;

        reconnectInFlightRef.current = true;
        lastReconnectAtRef.current = now;

        setReconnectAttempts((a) => a + 1);
        // Try a status check first
        const st = await bridgeFetch(`${bridgeUrl}/status`);
        if (st.ok) {
          const data = await st.json();
          if (data.status === 'connected' || data.status === 'authenticated') {
            setStatus('connected');
            setPopupDismissed(false);
            setReconnectAttempts(0);
            setLastBridgeError(null);
            setLastConnectedAt(Date.now());
            reconnectInFlightRef.current = false;
            return;
          }
        }
        // not connected -> attempt to start connection
        await startConnection();
        // show popup so user can see progress
        setConnectModalOpen(true);
      } catch (err) {
        console.warn('Auto-reconnect attempt failed', err);
        setLastBridgeError('Auto-reconnect attempt failed');
      } finally {
        reconnectInFlightRef.current = false;
      }
    }, delay);

    return () => {};
  }, [status, reconnectAttempts, bridgeUrl, token]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size - if > 5MB we warn about base64 size
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large for direct sending (>5MB). Please compress it first or use a direct URL.');
      return;
    }

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
        
        const confirmSend = window.confirm(`Send ${file.name} to this contact?`);
        if (!confirmSend) {
          setIsUploading(false);
          return;
        }

        try {
          const response = await fetch('/api/admin/crm/whatsapp/qr/send', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              to: selectedChatIdStr, 
              type: type, 
              url: base64Data, // Simple logic: send base64 directly to our bridge
              caption: '',
              message: ''
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to send file');
          }

          setIsUploading(false);
          alert('Message sent successfully!');
          // Refresh messages
          if (selectedChatIdStr) {
             fetchMessages(selectedChatIdStr);
          }
        } catch (err: any) {
          alert(err.message || 'Send failed');
          setIsUploading(false);
        }
      };
    } catch (err: any) {
      alert('Failed to process file');
      setIsUploading(false);
    }
  };

  const restartBridge = async () => {
    if (!window.confirm('Restart WhatsApp Bridge session?')) return;
    try {
      await bridgeFetch(`${bridgeUrl}/restart`, { method: 'POST' });
      setStatus('connecting');
      alert('Restarting... Please wait 10 seconds.');
    } catch (e) {
      alert('Failed to reach bridge');
    }
  };

  // Helper to create a lead for the currently selected chat.
  // Defined before effects that may reference it to avoid conditional hook lint issues.
  const handleAddAsLead = async () => {
    if (!selectedChatIdStr) return;
    const phone = selectedChatIdStr.split('@')[0];
    const name = selectedChat?.name || 'New Lead';
    
    try {
      const res = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          phoneNumber: phone,
          source: 'whatsapp'
        })
      });
      const data = await res.json();
      if (data.success) {
        const newLead = data.data;
        setSelectedLead(newLead);
        // Update chat list with real lead ID
        setChats(prev => prev.map(c => getChatIdStr(c) === selectedChatIdStr ? { ...c, leadId: newLead.id || newLead._id?.slice(-6) } : c));
        console.log('Lead created and connected!');
      } else {
        console.error(data.error || 'Failed to create lead');
      }
    } catch (err) {
      alert('Error creating lead');
    }
  };

  // Auto-linking chats to CRM leads
  useEffect(() => {
    if (!selectedChatIdStr || !token) return;

    const phone = selectedChatIdStr.split('@')[0];
    fetch(`/api/admin/crm/leads/search?phone=${phone}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.leads?.length > 0) {
          const lead = data.leads[0];
          setSelectedLead(lead);
          // Update chat list with real lead info
          setChats(prev => prev.map(c => 
            getChatIdStr(c) === selectedChatIdStr 
              ? { ...c, leadId: lead.id || lead._id } 
              : c
          ));
        } else {
          // Optional: handle auto-creation if desired
        }
      })
      .catch(err => console.error('Error fetching lead:', err));
  }, [selectedChatIdStr, token]);

  const handleAssignChange = async (userId: string) => {
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/admin/crm/leads/${selectedLead._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assignedToUserId: userId })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedLead({ ...selectedLead, assignedToUserId: userId });
        alert('Lead assigned successfully');
      }
    } catch (err) {
      alert('Failed to assign lead');
    }
  };

  // AUTO-SYNC INBOUND MEDIA TO S3
  // NOTE: Disabled for now. This hook uses dynamic `Math.random()` IDs and Set
  // dependencies, which makes eslint sometimes mis-detect hook order. We can
  // re-enable after refactoring to stable IDs + a dedicated media-sync hook.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  // useEffect(() => {
  //   const syncInboundMedia = async () => {
  //     // Filter for media messages that aren't synced or currently syncing
  //     const inboundMediaMsgs = messages.filter(m => {
  //       const mId = m.id;
  //       const msgIdStr = mId ? (typeof mId === 'string' ? mId : (mId._serialized || mId.id || `unknown-${Math.random()}`)) : `missing-${Math.random()}`;
  //       return !m.fromMe && 
  //              m.hasMedia && 
  //              !syncedMediaIds.has(msgIdStr) &&
  //              !syncingMediaIds.has(msgIdStr);
  //     });
  //     
  //     if (inboundMediaMsgs.length === 0) return;

  //     for (const msg of inboundMediaMsgs) {
  //       const mId = msg.id;
  //       const msgIdStr = mId ? (typeof mId === 'string' ? mId : (mId._serialized || mId.id || `unknown-${Math.random()}`)) : `missing-${Math.random()}`;
  //       
  //       try {
  //         // Double check to avoid race conditions
  //         if (syncingMediaIds.has(msgIdStr)) continue;
  //         
  //         setSyncingMediaIds(prev => new Set(prev).add(msgIdStr));
  //         
  //         const bridgeRes = await bridgeFetch(`${bridgeUrl}/messages/media/${msgIdStr}`);
  //         const bridgeData = await bridgeRes.json();
  //         
  //         if (!bridgeData.data) throw new Error('No media data from bridge');

  //         const response = await fetch('/api/admin/crm/upload/s3/base64', {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json',
  //             'Authorization': `Bearer ${token}`
  //           },
  //           body: JSON.stringify({
  //             base64: `data:${bridgeData.mimetype};base64,${bridgeData.data}`,
  //             fileName: `inbound-${msgIdStr.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
  //             category: 'inbox'
  //           })
  //         });
  //         
  //         const data = await response.json();
  //         if (data.success && data.data?.publicUrl) {
  //           setSyncedMediaIds(prev => new Set(prev).add(msgIdStr));
  //           setMediaUrls(prev => ({ ...prev, [msgIdStr]: data.data.publicUrl }));
  //         }
  //       } catch (err) {
  //         console.error(`Failed to sync media for ${msgIdStr}:`, err);
  //       } finally {
  //         setSyncingMediaIds(prev => {
  //           const next = new Set(prev);
  //           next.delete(msgIdStr);
  //           return next;
  //         });
  //       }
  //     }
  //   };

  //   if (messages.length > 0 && token) {
  //     syncInboundMedia();
  //   }
  // }, [messages, token, bridgeUrl, syncedMediaIds, syncingMediaIds]);

  const sendPoll = async () => {
    if (!pollData.question.trim()) return;
    const pollText = `📊 *POLL: ${pollData.question}*\n\n` + 
      pollData.options.map((opt, i) => `${i+1}. ${opt}`).filter(o => o.trim()).join('\n');
    
    setNewMessage(pollText);
    setPollModalOpen(false);
    // Auto-trigger send
    setTimeout(() => {
        const sendBtn = document.querySelector('button[title="Send Message"]') as HTMLButtonElement;
        sendBtn?.click();
    }, 100);
  };

  const sendButtons = async () => {
    if (!buttonData.text.trim()) return;
    const filteredButtons = buttonData.buttons.filter(b => b.trim() !== '');
    if (filteredButtons.length === 0) return;

    setSending(true);
    try {
      await fetch('/api/admin/crm/whatsapp/qr/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: selectedChatIdStr,
          message: buttonData.text,
          type: 'buttons',
          buttons: filteredButtons
        })
      });
      setButtonModalOpen(false);
      setButtonData({ text: '', buttons: ['', '', ''] });
      setTimeout(() => fetchMessages(selectedChatIdStr), 1500);
    } catch (e) {
      alert('Failed to send buttons');
    } finally {
      setSending(false);
    }
  };

  const toggleThreadSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedThreadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedThreadIds(next);
  };

  const handleBulkAction = async (action: 'lead' | 'delete' | 'archive') => {
     if (selectedThreadIds.size === 0) return;
     if (!window.confirm(`Perform ${action} on ${selectedThreadIds.size} selected threads?`)) return;
     
     alert(`${action} performed on ${selectedThreadIds.size} threads (Simulated)`);
     setSelectedThreadIds(new Set());
  };

  // Don't block the UI when the bridge is "loading". Render the inbox immediately
  // and let initialization work in the background. The full-screen initializing
  // view is converted into a modal that opens only when the user explicitly
  // clicks "Connect". This keeps the inbox/QR accessible while background
  // initialization happens.

  if (status === 'qr' && qr) return (
    <div className="h-screen bg-emerald-50/10 flex items-stretch p-6 font-jakarta">
      <div className="max-w-[1400px] mx-auto w-full rounded-2xl border-4 border-emerald-200/40 shadow-xl overflow-hidden flex">
        {/* Left sidebar */}
        <aside className="w-64 bg-white border-r border-emerald-100 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Inbox</h2>
              <div className="text-xs text-slate-500">Loading…</div>
            </div>
            <div>
              <button onClick={startConnection} className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-sm font-bold">Connect</button>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">U</div>
              <div>
                <div className="text-sm font-bold">admincrm</div>
                <div className="text-xs text-slate-400">Admin</div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <input placeholder="Search name or number..." className="w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 text-sm" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {/* Single sample chat preview */}
              <div onClick={() => { /* select chat */ }} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border-l-4 border-emerald-500 cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">+9</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800">+9309986820</div>
                    <div className="text-xs text-slate-400">Invalid Date</div>
                  </div>
                  <div className="text-sm text-slate-500">[media]</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 text-xs text-slate-400">Tips: Scan QR to connect your phone</div>
        </aside>

        {/* Center chat area */}
        <main className="flex-1 bg-[#f3ebe5] min-h-[600px] relative">
          <header className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold">+9</div>
              <div>
                <div className="font-bold">+9309986820</div>
                <div className="text-xs text-emerald-600">Realtime Sync</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={startConnection} className="px-3 py-1 bg-emerald-700 text-white rounded-lg font-bold text-sm">Connect</button>
              <button onClick={logout} className="px-3 py-1 bg-rose-500 text-white rounded-lg font-bold text-sm">Logout</button>
              <button onClick={openQr} className="px-3 py-1 bg-black text-white rounded-lg font-bold text-sm">QR</button>
            </div>
          </header>

          <div className="p-8 h-[520px] overflow-auto">
            {/* blank chat area - show large prompt to scan with QR preview on the right */}
            <div className="h-full rounded-md border border-dashed border-slate-200 bg-white/60 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold text-slate-700">Awaiting Scan</div>
                <div className="text-sm text-slate-500">Open WhatsApp → Linked Devices → Link a device</div>
                <div className="mt-2">
                  <img src={qr} alt="QR" className="w-48 h-48 mx-auto bg-white p-2 rounded-md shadow" />
                </div>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button onClick={openQr} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold">Open QR</button>
                  <button onClick={() => navigator.clipboard?.writeText(`${bridgeUrl}/qr`).then(()=>alert('Copied')).catch(()=>alert('Copy failed'))} className="px-4 py-2 bg-slate-100 rounded-lg">Copy Link</button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-white">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <button className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center"><i className="ph-bold ph-plus text-xl"></i></button>
              <input placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-full border border-slate-100" />
              <button className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center">→</button>
            </div>
          </div>
        </main>

        {/* Right contact panel */}
        <aside className="w-80 bg-white border-l border-emerald-100 p-6">
          <div className="text-center">
            <div className="w-28 h-28 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-4xl font-bold text-slate-500">93</div>
            <div className="mt-4 font-bold">+9309986820</div>
            <div className="text-sm text-slate-400">+919309986820</div>
          </div>
          <div className="mt-8">
            <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Link to CRM</button>
          </div>
        </aside>
      </div>
    </div>
  );

  if (status === 'disconnected') return (
    <div className="h-screen bg-rose-50 flex items-center justify-center p-6 font-jakarta">
       <div className="bg-white max-w-xl w-full rounded-[40px] shadow-2xl p-12 text-center space-y-6 overflow-y-auto max-h-[90vh]">
          <div className="w-24 h-24 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-5xl mb-4">
             <i className="ph-bold ph-plugs"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Bridge Unreachable</h2>
          <p className="text-slate-500 font-medium leading-relaxed">External service at <span className="font-bold underline text-rose-600">{bridgeUrl}</span> is not responding.</p>
          
          <div className="text-left bg-slate-50 rounded-3xl p-6 border border-rose-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="ph-fill ph-terminal text-rose-500"></i>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">VPS Troubleshooting Commands</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400">1. Check if Bridge is running:</p>
                <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">sudo docker ps | grep wa-bridge</code>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400">2. Restart Bridge service:</p>
                <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">cd ~/swaryoga/swaryoga.com-db/deploy/wa-bridge && sudo docker compose restart wa-bridge</code>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400">3. Check Nginx configuration:</p>
                <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">sudo nginx -t && sudo systemctl reload nginx</code>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400">4. Check Firewall (Port 443):</p>
                <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">sudo ufw status | grep 443</code>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => window.location.reload()} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl active:scale-95">Retry Sync</button>
            <button onClick={startConnection} className="flex-1 py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-600 transition-all shadow-xl active:scale-95">Force Connect</button>
          </div>
          
          <p className="text-[10px] font-bold text-slate-400 pt-4 border-t border-slate-100">
             Images, Videos, and Interactive Buttons are supported when bridge is online.
          </p>
       </div>
    </div>
  );

  return (
    <div className={`flex h-screen font-jakarta overflow-hidden transition-colors duration-500 ${currentTheme.bg}`}>
      {/* Persistent header buttons (visible across the inbox) */}
      <div className="absolute right-6 top-6 z-40 hidden md:flex items-center gap-3">
         <button onClick={startConnection} title="Connect" className="flex items-center gap-2 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-sm shadow">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.12.81.36 1.6.72 2.34a2 2 0 0 1-.45 2.11L9.91 10.09a16 16 0 0 0 6 6l1.92-1.92a2 2 0 0 1 2.11-.45c.74.36 1.53.6 2.34.72A2 2 0 0 1 22 16.92z"/><polyline points="20 6 9 17 4 12"/></svg>
           <span>Connect</span>
         </button>
         <button onClick={logout} title="Logout" className="flex items-center gap-2 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm shadow">
           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
           <span>Logout</span>
         </button>
         <button onClick={openQr} title="QR Connect" className="flex items-center gap-2 py-2 px-3 bg-black hover:bg-slate-900 text-white rounded-2xl font-black text-sm shadow">
           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><path d="M14 10v4h-4"/></svg>
           <span>QR</span>
         </button>
      </div>
      {/* Connect modal - shows initialization UI on-demand */}
      {connectModalOpen && !popupDismissed && (
        // Small persistent popup (bottom-right)
        <div className="fixed right-6 bottom-6 z-50">
          <div className="bg-white rounded-2xl p-4 w-[300px] shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 relative">
                  <div className="absolute inset-0 border-2 border-slate-100 rounded-lg"></div>
                  <div className="absolute inset-0 border-2 border-emerald-500 rounded-lg border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src="/logo-square.png" className="w-8 h-8 grayscale opacity-30" alt="" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-black">Initializing Core</div>
                  <div className="text-xs text-slate-400">{status === 'connecting' ? 'Connecting…' : status === 'disconnected' ? 'Bridge unreachable' : 'Please wait'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPopupDismissed(true); }} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={startConnection} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-[13px] font-bold">Force Reconnect</button>
              <button onClick={restartBridge} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-[13px] font-bold">Restart Bridge</button>
            </div>

            <div className="mt-3 text-[12px] text-slate-400">Attempts: {reconnectAttempts}</div>
            {lastBridgeError && (
              <div className="mt-1 text-[12px] text-rose-500 font-semibold">{lastBridgeError}</div>
            )}
          </div>
        </div>
      )}
      {/* Branded Meta Frame - emerald outline around the app container */}
      <div className={`flex-1 flex overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.1)] m-0 md:m-6 md:rounded-[28px] border-[12px] relative transition-all duration-700 ${
        theme === 'dark' ? 'border-slate-800' : 'border-emerald-200/60'
      } ${currentTheme.bg}`}>

        
        
  {/* WhatsApp-style left icon rail + compact sidebar */}
  <div className="flex-shrink-0 flex">
    {/* Icon rail (thin) */}
  <div className={`w-20 flex flex-col items-center py-4 gap-3 border-r ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
      <button className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm"><img src="/logo-square.png" className="w-6 h-6" alt="logo"/></button>
      <button title="Chats" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"><i className="ph ph-chat-text text-lg"></i></button>
      <button title="Status" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"><i className="ph ph-circle w-4 h-4"></i></button>
      <button title="Calls" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"><i className="ph ph-phone text-lg"></i></button>
      <div className="flex-1" />
      <button title="Settings" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"><i className="ph ph-gear text-lg"></i></button>
    </div>

  <aside className={`w-[300px] border-r flex flex-col shrink-0 transition-colors duration-500 ${currentTheme.sidebar} ${currentTheme.border}`}>
          <div className="p-6 pb-2 space-y-5">
            <div className="flex items-center justify-between">
              <div>
       <h1 className={`text-2xl font-black tracking-tighter transition-colors ${currentTheme.text}`}>Inbox</h1>
     <div className="flex items-center gap-2 mt-1">
             <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : status === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{status}</span>
           </div>
             <div className="mt-2 space-y-1">
               <div className="text-[11px] text-slate-400">
                 Last check: {lastStatusCheckAt ? new Date(lastStatusCheckAt).toLocaleTimeString() : '—'}
               </div>
               <div className="text-[11px] text-slate-400">
                 Last connected: {lastConnectedAt ? new Date(lastConnectedAt).toLocaleTimeString() : '—'}
               </div>
               {lastBridgeError && (
                 <div className="text-[11px] text-rose-500 font-semibold truncate" title={lastBridgeError}>
                   {lastBridgeError}
                 </div>
               )}
             </div>
           {/* Admin user preview */}
           <div className="flex items-center gap-3 mt-3">
             <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-sm font-bold text-slate-700 border border-slate-100">
               {adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : 'U'}
             </div>
             <div>
               <div className="text-sm font-bold">{adminUser?.name || adminUser?.userId || 'You'}</div>
               <div className="text-[11px] text-slate-400">Admin</div>
             </div>
           </div>
              </div>
          <div className="flex gap-2 items-center">
            <button onClick={handleRefresh} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isRefreshing ? 'animate-spin' : ''} ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-400 shadow-sm border border-slate-100/50 hover:bg-slate-50'}`}><i className="ph-bold ph-arrows-clockwise text-xl"></i></button>
          </div>
            </div>

            {/* Compact color dots */}
            <div className={`flex items-center gap-2`}>
              {(['white', 'dark', 'green', 'blue', 'lavender'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  title={t.charAt(0).toUpperCase() + t.slice(1)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${theme === t ? 'border-emerald-500 scale-105 shadow' : 'border-transparent opacity-60 hover:opacity-100'} ${
                    t === 'white' ? 'bg-white' : t === 'dark' ? 'bg-slate-800' : t === 'green' ? 'bg-emerald-500' : t === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${theme === t ? 'bg-white' : 'bg-white/60'}`}></div>
                </button>
              ))}
            </div>

            <div className="relative group">
              <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"></i>
              <input 
                type="text" 
                placeholder="Search name or number..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border-2 py-3.5 pl-12 pr-4 rounded-2xl outline-none transition-all font-bold text-[13px] tracking-tight ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700/50 focus:bg-slate-950 focus:border-emerald-500 text-white' : 'bg-slate-50 border-slate-100/30 focus:bg-white focus:border-emerald-500 text-slate-900'
                }`} 
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['All', 'Unread', 'Groups'].map((filter) => (
                <button 
                  key={filter} 
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    activeFilter === filter ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 
                    (theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100')
                  }`}
                >
                  {filter}
                </button>
              ))}
              <div className="ml-3 flex items-center gap-2">
                {(['All','Incoming','Outgoing'] as const).map((d) => (
                  <button key={d} onClick={() => setChatDirectionFilter(d)} className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                    chatDirectionFilter === d ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}>
                    {d === 'All' ? 'All' : d === 'Incoming' ? 'In' : 'Out'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loadingChats && chats.length === 0 ? (
               <div className="p-12 flex flex-col items-center justify-center gap-4 opacity-40">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Syncing Threads...</span>
               </div>
            ) : chats.length === 0 ? (
               <div className="p-12 text-center space-y-4 opacity-30 mt-10">
                  <i className="ph-bold ph-chats-teardrop text-6xl"></i>
                  <p className="text-[13px] font-bold">No conversations found</p>
                  <button onClick={handleRefresh} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-500">Retry Sync</button>
               </div>
            ) : (
                <div className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-50'}`}>
                  {chats.filter(chat => {
                    const chatId = getChatIdStr(chat);
                    if (!chatId) return false; // Filter out chats with empty IDs
                    const name = chat.name || chatId.split('@')[0] || '';
                    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
                    if (!matchesSearch) return false;
                    if (activeFilter === 'Groups') return chat.isGroup;
                    if (activeFilter === 'Unread') return (chat.unreadCount || 0) > 0;
                    // Directional filter based on lastMessage.fromMe (true => outgoing)
                    if (chatDirectionFilter && chatDirectionFilter !== 'All') {
                      const lastMsg = chat.lastMessage || {};
                      const isOutgoing = !!lastMsg.fromMe;
                      if (chatDirectionFilter === 'Incoming' && isOutgoing) return false;
                      if (chatDirectionFilter === 'Outgoing' && !isOutgoing) return false;
                    }
                    return true;
                  }).map((chat) => {
                    const chatId = getChatIdStr(chat);
                    if (!chatId) return null; // Safety check
                    const isSelected = selectedChatIdStr === chatId;
                    return (
                      <div 
                        key={chatId}
                        onClick={() => setSelectedChat(chat)}
                        className={`px-5 py-4 flex items-center gap-4 cursor-pointer transition-all relative group ${
                          isSelected ? (theme === 'dark' ? 'bg-emerald-900/40 border-l-4 border-emerald-500' : 'bg-emerald-50/60 border-l-4 border-emerald-500') : 
                          (theme === 'dark' ? 'hover:bg-slate-800 border-l-4 border-transparent' : 'hover:bg-slate-50 border-l-4 border-transparent')
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200/50 shadow-sm relative">
                           <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || chatId.split('@')[0] || 'User')}&bg=0ea5e9&color=fff&bold=true`} 
                            alt="" 
                            className="w-full h-full object-cover rounded-full"
                           />
                           {chat.isGroup && (
                             <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white rounded-full">
                               <i className="ph-fill ph-users text-lg"></i>
                             </div>
                           )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <h4 className={`text-[14px] font-semibold truncate tracking-tight transition-colors ${
                              isSelected ? 'text-emerald-500' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-900')
                            }`}>
                              {chat.name || chatId.split('@')[0] || 'Unknown'}
                            </h4>
                            <span className="text-[11px] font-medium text-slate-400">
                               {chat.lastMessage ? new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                             <p className={`text-[13px] truncate ${
                               (chat.unreadCount || 0) > 0 ? (theme === 'dark' ? 'text-white font-bold' : 'text-slate-900 font-bold') : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')
                             }`}>
                               {(() => {
                                  const lm = chat.lastMessage;
                                  if (!lm) return 'No messages';
                                  const prefix = lm.fromMe ? 'You: ' : '';
                                  return prefix + (lm.body || '[media]');
                               })()}
                             </p>
                             {(chat.unreadCount || 0) > 0 && (
                               <div className="bg-sky-500 text-white text-[11px] font-black h-5 min-w-[18px] px-2 rounded-full flex items-center justify-center shadow-md">
                                 {chat.unreadCount}
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            )}
          </div>
    </aside>
  </div>

    <main className={`flex-1 flex flex-col min-w-0 relative transition-colors duration-500 ${currentTheme.bg}`}>
          {selectedChat ? (
            <>
              <header className={`px-6 py-4 backdrop-blur-md border-b flex items-center justify-between z-30 shrink-0 sticky top-0 transition-colors duration-500 ${currentTheme.header} ${currentTheme.border}`}>
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setRightSidebarOpen(!rightSidebarOpen)} title="View Contact Info">
                  <div className="w-12 h-12 rounded-[18px] bg-slate-100 overflow-hidden shadow-sm border border-slate-200/50 relative hover:scale-105 transition-transform">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name || selectedChatIdStr.split('@')[0] || 'User')}&bg=0ea5e9&color=fff&bold=true&size=128`} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h3 className={`text-xl font-black leading-none mb-1 tracking-tighter ${currentTheme.text}`}>
                      {selectedChat?.name || (typeof selectedChatIdStr === 'string' && selectedChatIdStr ? selectedChatIdStr.split('@')[0] : 'Chat')}
                    </h3>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : status === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></div>
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                         {status === 'connected' ? 'Realtime Sync' : status === 'loading' ? 'Connecting...' : 'Disconnected'}
                       </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                   {/* Connection Status */}
                   <div className={`px-3 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${
                     status === 'connected' ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700') :
                     status === 'loading' ? (theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700') :
                     (theme === 'dark' ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-700')
                   }`}>
                     <div className={`w-2 h-2 rounded-full ${
                       status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                       status === 'loading' ? 'bg-amber-400 animate-pulse' :
                       'bg-rose-500 animate-pulse'
                     }`}></div>
                     {status === 'connected' ? '✓ Connected' : status === 'loading' ? '⟳ Connecting' : '✕ Offline'}
                   </div>

                   {/* QR Code Button */}
                   <button 
                     onClick={openQr} 
                     title="Scan QR Code"
                     className="w-10 h-10 flex items-center justify-center text-white bg-black hover:bg-slate-900 rounded-2xl transition-all shadow-md active:scale-95"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><path d="M14 10v4h-4"/></svg>
                   </button>

                   {/* Connect Button */}
                   {status !== 'connected' && (
                     <button 
                       onClick={async () => { setConnectModalOpen(true); await startConnection(); }} 
                       title="Connect to WhatsApp"
                       className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                       <span>Connect</span>
                     </button>
                   )}

                   {/* Disconnect Button */}
                   {status === 'connected' && (
                     <button 
                       onClick={logout} 
                       title="Disconnect from WhatsApp"
                       className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                       <span>Disconnect</span>
                     </button>
                   )}

                   <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all"><i className="ph-bold ph-phone text-lg"></i></button>
                   <button onClick={() => setRightSidebarOpen(!rightSidebarOpen)} className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${rightSidebarOpen ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}><i className="ph-bold ph-sidebar-simple text-lg"></i></button>
                </div>
              </header>

              <div 
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 relative custom-scrollbar"
                style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/744/548/wallpaper-whatsapp-dark-pattern.jpg")', backgroundBlendMode: 'overlay', opacity: theme === 'dark' ? '0.3' : '0.8', backgroundColor: currentTheme.chatBg }}
              >
                <div className="max-w-4xl mx-auto flex flex-col gap-2">
                   {messages.map((msg: any) => {
                     const isMe = msg.fromMe;
                     // Robust ID extraction
                     const mId = msg.id;
                     const msgIdStr = mId ? (typeof mId === 'string' ? mId : (mId._serialized || mId.id || `temp-${Math.random()}`)) : `temp-${Math.random()}`;
                     
                     // Robust Media Source Detection
                     const mediaSrc = mediaUrls[msgIdStr] || (msg.mediaData ? (msg.mediaData.startsWith('data:') ? msg.mediaData : `data:${msg.mimetype || 'image/jpeg'};base64,${msg.mediaData}`) : null) || msg.body;
                     
                     return (
                       <div key={msgIdStr} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-3xl shadow-sm text-[14px] relative group ${
                            isMe ? (theme === 'dark' ? 'bg-slate-800 text-slate-200 border border-slate-700/50' : 'bg-white text-slate-800') : 'bg-emerald-600 text-white'
                          } ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                             {msg.hasMedia && (
                               <div className="mb-2 rounded-2xl overflow-hidden border border-black/5 relative bg-black/5 min-h-[100px] flex items-center justify-center">
                                  {syncingMediaIds.has(msgIdStr) ? (
                                     <div className="flex flex-col items-center gap-2 p-6">
                                        <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Securely Syncing...</span>
                                     </div>
                                  ) : (
                                    <>
                                      {msg.type === 'image' && mediaSrc && <img src={mediaSrc} alt="Media" className="max-w-full cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(mediaSrc, '_blank')} />}
                                      {msg.type === 'video' && mediaSrc && <video src={mediaSrc} controls className="max-w-full" />}
                                      {msg.type === 'document' && (
                                        <div className="flex items-center gap-4 p-4 min-w-[200px]">
                                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><i className="ph-fill ph-file-pdf text-2xl text-white"></i></div>
                                          <div><p className="font-bold text-xs truncate">Document</p><a href={mediaUrls[msgIdStr] || mediaSrc} target="_blank" className="text-[10px] underline opacity-80">Download</a></div>
                                        </div>
                                      )}
                                    </>
                                  )}
                               </div>
                             )}
                             
                             {msg.body && <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.body}</p>}
                             
                             <div className={`flex items-center justify-end gap-1.5 mt-1 -mr-1 opacity-70`}>
                                <span className={`text-[10px] font-bold uppercase ${theme === 'dark' && !isMe ? 'text-white' : ''}`}>
                                   {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                   <i className={`ph-fill ph-checks text-[15px] ${msg.ack === 3 ? 'text-blue-400' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-300')}`}></i>
                                )}
                             </div>
                          </div>
                       </div>
                     );
                   })}
                   <div ref={chatEndRef} />
                </div>
              </div>

              <div className={`p-5 border-t shrink-0 z-40 transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                 <div className="max-w-5xl mx-auto flex items-end gap-4">
                    <div className={`flex-1 rounded-[28px] border-2 transition-all p-2 pr-4 flex items-end min-h-[56px] shadow-inner relative ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-800 focus-within:bg-slate-950 focus-within:border-emerald-500' : 'bg-slate-50 border-slate-50 focus-within:bg-white focus-within:border-emerald-500'
                    }`}>
                       <button onClick={() => setShowRichControls(!showRichControls)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showRichControls ? 'bg-slate-900 text-white rotate-45' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                          <i className="ph-bold ph-plus text-xl"></i>
                       </button>

                       {showRichControls && (
                          <div className={`absolute bottom-16 left-2 w-64 rounded-[32px] shadow-2xl border p-3 space-y-1 z-[60] animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                          }`}>
                             {[
                               { id: 'image', label: 'Photo & Video', icon: 'ph-fill ph-image', color: 'bg-emerald-50 text-emerald-600' },
                               { id: 'document', label: 'Document', icon: 'ph-fill ph-file-text', color: 'bg-blue-50 text-blue-600' },
                               { id: 'buttons', label: 'Interactive Buttons', icon: 'ph-fill ph-hand-tap', color: 'bg-indigo-50 text-indigo-600' },
                               { id: 'poll', label: 'Create Poll', icon: 'ph-fill ph-chart-bar', color: 'bg-rose-50 text-rose-600' },
                             ].map(item => (
                               <button 
                                 key={item.id} 
                                 onClick={() => { 
                                   if (item.id === 'poll') setPollModalOpen(true); 
                                   else if (item.id === 'buttons') setButtonModalOpen(true);
                                   else document.getElementById('bridge-file-upload')?.click(); 
                                   setShowRichControls(false); 
                                 }} 
                                 className={`flex items-center gap-4 w-full p-3 rounded-2xl transition-all group ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                               >
                                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-xl transition-transform group-hover:scale-110`}><i className={item.icon}></i></div>
                                  <span className={`text-[14px] font-bold group-hover:text-emerald-500 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                               </button>
                             ))}
                          </div>
                       )}

                       <textarea 
                          value={newMessage} 
                          onChange={(e) => { setNewMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          placeholder="Type a message..." 
                          rows={1}
                          className={`flex-1 bg-transparent border-none py-2 px-2 text-[15px] focus:outline-none font-medium resize-none max-h-48 overflow-y-auto custom-scrollbar leading-tight mb-0.5 ${
                            theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                          }`} 
                       />
                    </div>

                    <button 
                       onClick={sendMessage}
                       disabled={sending || (!newMessage.trim() && !mediaUrl)}
                       className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${newMessage.trim() ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-slate-100 text-slate-400'}`}
                    >
                       <i className="ph-fill ph-paper-plane-right text-2xl"></i>
                    </button>
                 </div>
              </div>
            </>
          ) : (
            <div className={`flex-1 flex flex-col items-center justify-center gap-8 relative overflow-hidden transition-colors duration-500 ${
              theme === 'dark' ? 'bg-slate-950 text-slate-600' : 'bg-slate-50/50'
            }`}>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse"></div>
               <div className="relative group">
                  <div className={`w-40 h-40 rounded-[48px] shadow-2xl flex items-center justify-center border-4 relative overflow-hidden transition-all duration-700 group-hover:scale-105 group-hover:rotate-3 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-emerald-500/5' : 'bg-white border-white shadow-slate-200/50'
                  }`}>
                     <img src="/logo-square.png" alt="" className="w-24 h-24 grayscale opacity-10 group-hover:scale-110 transition-transform duration-700" />
                     <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600"></div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-emerald-500 text-xl border-4 border-slate-50">
                    <i className="ph-fill ph-whatsapp-logo"></i>
                  </div>
               </div>
               <div className="text-center space-y-4 z-10">
                  <h3 className={`text-4xl font-black tracking-tighter ${currentTheme.text} opacity-20`}>Swar Yoga WhatsApp</h3>
                  <div className="flex flex-col items-center gap-2">
                     <p className={`text-[15px] font-bold max-w-sm mx-auto ${currentTheme.text} opacity-40`}>Select a conversation to start chatting.</p>
                     <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600">
                        <i className="ph-fill ph-shield-check"></i>
                        <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Secure</span>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </main>

        {selectedChat && rightSidebarOpen && (
           <aside className={`w-[400px] border-l flex flex-col shrink-0 animate-in slide-in-from-right duration-500 z-50 transition-colors duration-500 ${currentTheme.sidebar} ${currentTheme.border}`}>
              <div className={`p-6 border-b flex items-center justify-between ${currentTheme.border}`}>
                 <h3 className={`text-xl font-black tracking-tight ${currentTheme.text}`}>Contact Detail</h3>
                 <button onClick={() => setRightSidebarOpen(false)} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                   theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-900'
                 }`}><i className="ph-bold ph-x text-lg"></i></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                 <div className="text-center">
                    <div className="w-32 h-32 rounded-[48px] overflow-hidden mx-auto mb-6 border-4 border-white shadow-2xl">
                       <img src={`https://ui-avatars.com/api/?name=${selectedChat.name || "User"}&bg=0ea5e9&color=fff&size=200&bold=true`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <h4 className={`text-2xl font-black tracking-tighter ${currentTheme.text}`}>{selectedChat.name || "Unknown User"}</h4>
                    <p className="text-sm font-bold text-slate-500">+{getChatIdStr(selectedChat).split('@')[0]}</p>
                 </div>

                 <div className={`rounded-[32px] p-6 border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100/50'}`}>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">CRM Linking</h5>
                    {selectedLead ? (
                       <div className="space-y-4">
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                             <div className={`p-3 rounded-xl border font-bold ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>{selectedLead.status}</div>
                          </div>
                       </div>
                    ) : (
                       <button onClick={handleAddAsLead} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] shadow-xl">Link to CRM</button>
                    )}
                 </div>
              </div>
           </aside>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>

      {delayModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                   <h3 className="text-xl font-black text-slate-800 tracking-tighter">Delay Message</h3>
                   <button onClick={() => setDelayModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm"><i className="ph-bold ph-x text-lg"></i></button>
                </div>
                <div className="p-8 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <input type="number" value={delayTime.minutes} onChange={(e) => setDelayTime({...delayTime, minutes: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-center" placeholder="Mins" />
                      <input type="number" value={delayTime.seconds} onChange={(e) => setDelayTime({...delayTime, seconds: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-center" placeholder="Secs" />
                   </div>
                </div>
                <div className="p-8 pt-0">
                   <button onClick={() => setDelayModalOpen(false)} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[11px]">Apply</button>
                </div>
             </div>
          </div>
      )}

      {pollModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className={`w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
             <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className={`text-2xl font-black tracking-tighter ${currentTheme.text}`}>Create Poll</h2>
                   <button onClick={() => setPollModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"><i className="ph ph-x text-xl"></i></button>
                </div>
                
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Question</p>
                   <input 
                      type="text" 
                      placeholder="e.g. Can you join today's session?" 
                      className={`w-full border-2 p-4 rounded-2xl font-bold outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'}`}
                      value={pollData.question}
                      onChange={e => setPollData({...pollData, question: e.target.value})}
                   />
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Options</p>
                   {pollData.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder={`Option ${i+1}`}
                          className={`flex-1 border-2 p-3 rounded-xl font-bold outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'}`}
                          value={opt}
                          onChange={e => {
                            const next = [...pollData.options];
                            next[i] = e.target.value;
                            setPollData({...pollData, options: next});
                          }}
                        />
                        {pollData.options.length > 2 && (
                          <button onClick={() => setPollData({...pollData, options: pollData.options.filter((_, idx)=>idx!==i)})} className="text-rose-500 p-2"><i className="ph ph-trash"></i></button>
                        )}
                      </div>
                   ))}
                   {pollData.options.length < 5 && (
                     <button onClick={() => setPollData({...pollData, options: [...pollData.options, '']})} className="text-[11px] font-black uppercase tracking-widest text-emerald-500">+ Add Option</button>
                   )}
                </div>

                <button 
                  onClick={sendPoll}
                  className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30"
                >
                   Send as Text Fallback
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Button Modal */}
      {buttonModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className={`w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
             <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className={`text-2xl font-black tracking-tighter ${currentTheme.text}`}>Interactive Buttons</h2>
                   <button onClick={() => setButtonModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"><i className="ph ph-x text-xl"></i></button>
                </div>
                
                <p className="text-xs text-slate-400 font-medium leading-relaxed italic">Note: Real "blue buttons" work best with Cloud API. The Bridge uses WWebJS Buttons which may fallback to numbers on some phone OS versions.</p>

                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Message Text</p>
                   <textarea 
                      placeholder="e.g. Please choose an option below:" 
                      className={`w-full border-2 p-4 rounded-2xl font-bold outline-none transition-all min-h-[100px] resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'}`}
                      value={buttonData.text}
                      onChange={e => setButtonData({...buttonData, text: e.target.value})}
                   />
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Button Options</p>
                   {buttonData.buttons.map((btn, i) => (
                      <input 
                        key={i}
                        type="text" 
                        placeholder={`Button ${i+1} text (max 20 chars)`}
                        maxLength={20}
                        className={`w-full border-2 p-3 rounded-xl font-bold outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'}`}
                        value={btn}
                        onChange={e => {
                          const next = [...buttonData.buttons];
                          next[i] = e.target.value;
                          setButtonData({...buttonData, buttons: next});
                        }}
                      />
                   ))}
                </div>

                <button 
                  onClick={sendButtons}
                  disabled={sending || !buttonData.text.trim()}
                  className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30 disabled:opacity-50"
                >
                   {sending ? 'Sending...' : 'Send Interactive Message'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
             <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                   <div>
                      <h2 className={`text-3xl font-black tracking-tighter mb-1 ${currentTheme.text}`}>WhatsApp Link</h2>
                      <p className="text-sm text-slate-500">Scan to connect your phone</p>
                   </div>
                   <button 
                     onClick={() => setQrModalOpen(false)} 
                     className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} text-xl`}
                   >
                     ✕
                   </button>
                </div>

                {/* QR Code Display */}
                <div className="relative">
                   <div className={`w-full aspect-square rounded-[32px] flex items-center justify-center p-6 relative overflow-hidden border-4 ${
                     theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-white'
                   }`}>
                      {qr ? (
                        <img 
                          src={qr} 
                          alt="WhatsApp QR Code" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-bold text-slate-500">Loading QR Code...</span>
                        </div>
                      )}
                      
                      {/* Decorative corner markers */}
                      <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg"></div>
                      <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg"></div>
                   </div>
                </div>

                {/* Instructions */}
                <div className={`rounded-3xl p-6 space-y-4 ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-emerald-50 border border-emerald-100'}`}>
                   <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                      <div>
                        <p className={`font-bold text-sm ${currentTheme.text}`}>Open WhatsApp on your phone</p>
                        <p className="text-xs text-slate-500">Any iOS or Android device</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                      <div>
                        <p className={`font-bold text-sm ${currentTheme.text}`}>Go to Settings → Linked Devices</p>
                        <p className="text-xs text-slate-500">Usually found in Settings menu</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">3</div>
                      <div>
                        <p className={`font-bold text-sm ${currentTheme.text}`}>Tap "Link a Device"</p>
                        <p className="text-xs text-slate-500">Add this as a new linked device</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">4</div>
                      <div>
                        <p className={`font-bold text-sm ${currentTheme.text}`}>Point camera at this QR code</p>
                        <p className="text-xs text-slate-500">Hold steady for 2-3 seconds</p>
                      </div>
                   </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => setQrModalOpen(false)}
                     className={`py-3 px-4 rounded-2xl font-bold text-sm transition-all ${
                       theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                     }`}
                   >
                     Close
                   </button>
                   <button 
                     onClick={() => {
                       if (qr) {
                         const link = document.createElement('a');
                         link.href = qr;
                         link.download = 'whatsapp-qr.png';
                         document.body.appendChild(link);
                         link.click();
                         document.body.removeChild(link);
                       }
                     }}
                     className="py-3 px-4 rounded-2xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                     Download
                   </button>
                </div>

                {/* Connection Status Info */}
                <div className={`rounded-3xl p-4 text-center space-y-2 ${theme === 'dark' ? 'bg-slate-800/30 border border-slate-700' : 'bg-slate-50 border border-slate-100'}`}>
                   <div className="flex items-center justify-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : status === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></div>
                      <span className={`text-xs font-black uppercase tracking-widest ${
                        status === 'connected' ? 'text-emerald-600' : status === 'loading' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {status === 'connected' ? 'Connected' : status === 'loading' ? 'Connecting...' : 'Not Connected'}
                      </span>
                   </div>
                   <p className="text-[11px] text-slate-500">Connection will update automatically once scanned</p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
