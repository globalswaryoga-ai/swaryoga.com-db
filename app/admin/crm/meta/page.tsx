'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // Added useCallback
import { useAuth } from '@/hooks/useAuth';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner } from '@/components/admin/crm';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useModal } from '@/hooks/useModal';
import { useForm } from '@/hooks/useForm';
import { FormModal } from '@/components/admin/crm';
import { normalizePhoneForMeta } from '@/lib/utils/phone';
import LanguageSelector from './_components/LanguageSelector'; // Imported new component

type MetaInboxDiagnostics = {
  ok: boolean;
  phone: string;
  lead: null | {
    _id: string;
    name?: string;
    status?: string;
    assignedToUserId?: string;
    lastMessageAt?: string;
  };
  counts: {
    messages: number;
    webhookEvents: number;
  };
  messages: Array<{
    _id: string;
    direction: 'inbound' | 'outbound' | string;
    messageContent?: string;
    status?: string;
    createdAt?: string;
  }>;
  webhookEvents: Array<{
    _id: string;
    kind?: string;
    ok?: boolean;
    message?: string;
    status?: string;
    receivedAt?: string;
  }>;
};

// --- Types ---
type ConversationRow = {
  _id: string;
  leadId: string;
  leadNumber?: number | string; // ADDED
  name?: string;
  phoneNumber: string;
  lastMessageContent?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  status?: string;
  labels?: string[];
  assignedToUserId?: string;
};

type Message = {
  _id: string;
  leadId: string;
  messageContent: string;
  direction: 'inbound' | 'outbound';
  createdAt: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
};

type LeadFormValues = {
  name: string;
  email: string;
  phoneNumber: string;
  source: string;
  status: string;
  workshopName?: string;
  assignedToUserId?: string;
};

export default function MetaInboxPage() {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuth();
  const { fetch: crmFetch, loading: crmLoading, error: crmError } = useCRM({ token });

  // State
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true); // Added for sidebar toggle
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false); // Added for attachment popup
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker

  // Diagnostics UI state
  const [diagPhone, setDiagPhone] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagResult, setDiagResult] = useState<MetaInboxDiagnostics | null>(null);

  // AI State
  const [isBotMode, setIsBotMode] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  // 24h window countdown
  const [windowAnchorMs, setWindowAnchorMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Footer toolboxes
  const [toolsOpen, setToolsOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const [actionModal, setActionModal] = useState<null | {
    type: 'quick' | 'schedule' | 'template' | 'delay' | 'repeat';
  }>(null);
  const [delayConfig, setDelayConfig] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [repeatConfig, setRepeatConfig] = useState({
    mode: 'daily' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    customText: '',
  });

  // NEW: Quick Replies State
  const [quickReplies, setQuickReplies] = useState([
    { id: '1', text: 'Hello! How can I help you today?' },
    { id: '2', text: 'Thank you for your interest in Swar Yoga.' },
    { id: '3', text: 'Can we schedule a call for tomorrow?' },
  ]);
  const [newQuickReply, setNewQuickReply] = useState('');
  
  // NEW: File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'document'>('image');

  // Simple local lists (can be wired to real APIs later)
  const assignOptions = useMemo(
    () => [
      { id: 'admin', name: 'Admin' },
      { id: 'support', name: 'Support' },
      { id: 'sales', name: 'Sales' },
    ],
    []
  );
  // User Requested Labels: New, chatting replying, no reply, call pending, call done, intrested, enrolled
  const labelOptions = useMemo(() => [
    'New', 
    'Chatting Replying', 
    'No Reply', 
    'Call Pending', 
    'Call Done', 
    'Interested', 
    'Enrolled'
  ], []);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<ConversationRow | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Right Sidebar state
  const [sidebarData, setSidebarData] = useState({
    status: '',
    labels: [] as string[],
    notes: '',
    followUpDate: '',
  });
  const [savingSidebar, setSavingSidebar] = useState(false);

  // Tabs should reflect the current route (so browser navigation + redirects stay consistent)
  const activeTab = useMemo(() => {
    const p = pathname || '';
    if (p.startsWith('/admin/crm/leads-followup')) return 'Followup';
    if (p.startsWith('/admin/crm/leads')) return 'Leads';
    if (p.startsWith('/admin/crm/sales')) return 'Sales';
    if (p.startsWith('/admin/crm/messages')) return 'Messages';
    if (p.startsWith('/admin/crm/analytics')) return 'Analytics';
    if (p.startsWith('/admin/crm')) return 'Home';
    return 'Messages';
  }, [pathname]);

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

  // Initial Load
  useEffect(() => {
    if (!token) return;

    // Load once immediately
    loadConversations(searchQuery);

    // Auto-refresh every 30 seconds. Don't recreate the interval on every keystroke.
    const timer = setInterval(() => {
      loadConversations(searchQuery);
    }, 30000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Search-triggered reload (debounced)
  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => {
      loadConversations(searchQuery);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, token]);

  // Handle message polling for selected conversation
  useEffect(() => {
    if (!token) return;
    if (!selectedRef.current) return;

    const timer = setInterval(() => {
      const c = selectedRef.current;
      if (!c) return;
      loadMessages(c.leadId || c._id || c.phoneNumber);
    }, 10000); // Poll messages every 10s when active

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selected?._id]);

  const runDiagnostics = async (rawPhone: string) => {
    if (!token) {
      setDiagError('No admin token found. Please login via /admin/login and try again.');
      return;
    }
    const phone = String(rawPhone || '').trim();
    if (!phone) {
      setDiagError('Enter a phone number to debug.');
      return;
    }

    setDiagLoading(true);
    setDiagError(null);
    try {
      const data = await crmFetch('/api/admin/crm/diagnostics/meta-inbox', {
        params: { phone },
      });
      // Endpoint returns CRM-style `{ success: true, data: payload }`.
      // `useCRM.fetch` usually unwraps to the `data` object already, but keep a fallback.
      const payload = (data as any)?.ok ? data : (data as any)?.data;
      setDiagResult(payload as MetaInboxDiagnostics);
    } catch (e: any) {
      setDiagResult(null);
      const msg = e instanceof Error ? e.message : String(e || 'Diagnostics failed');
      if (msg.toLowerCase().includes('login')) {
        setDiagError(`${msg} (Go to /admin/login and sign in again)`);
      } else if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
        setDiagError('Unauthorized (401). Your admin session is missing/expired. Please login again.');
      } else {
        setDiagError(msg || 'Diagnostics failed');
      }
    } finally {
      setDiagLoading(false);
    }
  };

  // Update now clock (for countdown)
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Reset 24h window anchor whenever newest inbound message changes
  useEffect(() => {
    if (!selected) {
      setWindowAnchorMs(null);
      return;
    }

    const inbound = messages
      .filter((m) => m.direction === 'inbound')
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const lastInbound = inbound[0];
    if (!lastInbound) {
      setWindowAnchorMs(null);
      return;
    }

    const ts = new Date(lastInbound.createdAt).getTime();
    if (!Number.isFinite(ts)) return;

    setWindowAnchorMs((prev) => (prev === ts ? prev : ts));
  }, [messages, selected]);

  const windowRemaining = useMemo(() => {
    if (!windowAnchorMs) return null;
    const end = windowAnchorMs + 24 * 60 * 60 * 1000;
    const diff = Math.max(0, end - nowMs);
    const hh = Math.floor(diff / 3600000);
    const mm = Math.floor((diff % 3600000) / 60000);
    const ss = Math.floor((diff % 60000) / 1000);
    return { diff, hh, mm, ss };
  }, [windowAnchorMs, nowMs]);

  const loadConversations = async (q = '') => {
    try {
      const data = await crmFetch('/api/admin/crm/conversations', {
        params: { q, limit: 50 },
      });
      if (data?.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (id?: string) => {
    if (!id) return;
    setLoadingMessages(true);
    try {
      // Determine if id is an ObjectId or phoneNumber
      const isObjectId = id.length === 24 && /^[0-9a-fA-F]+$/.test(id);
      const params: any = isObjectId ? { leadId: id } : { phoneNumber: id };
      
      const data = await crmFetch(`/api/admin/crm/messages`, { params });
      if (data?.messages) {
        // Reverse needed so oldest is at top (standard chat view)
        setMessages([...data.messages].reverse());
        // Scroll to bottom after state update
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const appendToComposer = (text: string) => {
    setComposerText((prev) => (prev ? `${prev}${text}` : text));
  };

  const wrapComposerSelection = (before: string, after: string) => {
    // We don't have selection refs wired yet; apply to full text as a safe default.
    setComposerText((prev) => {
      const t = prev || '';
      if (!t.trim()) return `${before}${after}`;
      return `${before}${t}${after}`;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);

      const res = await fetch('/api/admin/crm/upload/s3', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}` 
        },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      if (data.url) {
        // Append URL to composer with a newline
        setComposerText(prev => {
           const prefix = prev ? prev + '\n' : '';
           return prefix + data.url;
        });
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTranslationCall = useCallback(async (text: string, target: string) => {
     const res = await fetch('/api/cloud-translate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, targetLang: target })
     });
     if (!res.ok) throw new Error('Failed');
     const data = await res.json();
     return data.translatedText;
  }, [token]);

  const handleToolAction = (key: string) => {
    switch (key) {
      case 'emoji':
        setShowEmojiPicker(!showEmojiPicker); // Toggle picker
        break;
      case 'image':
      case 'video':
      case 'document':
        setUploadType(key as any);
        // Defer click to ensure state updates or just trigger
        setTimeout(() => fileInputRef.current?.click(), 0);
        break;
      case 'translate':
        // Now handled by component directly, but kept for fallback or other logic
        break;
      case 'symbols':
        appendToComposer(' ✓ ★ →');
        break;
      case 'bold':
        wrapComposerSelection('*', '*');
        break;
      case 'italic':
        wrapComposerSelection('_', '_');
        break;
      default:
        // Placeholder until we wire real implementations
        console.log('Tool action:', key);
        break;
    }
    setToolsOpen(false);
  };

  const openAction = (type: 'quick' | 'schedule' | 'template' | 'delay' | 'repeat') => {
    setQuickActionsOpen(false);
    setActionModal({ type });
  };

  const closeActionModal = () => setActionModal(null);

  const handleSelectConversation = (conv: ConversationRow) => {
    setSelected(conv);
    loadMessages(conv.leadId || conv._id || conv.phoneNumber);
    
    // Reset sidebar data based on selected conversation
    setSidebarData({
      status: conv.status || 'lead',
      labels: conv.labels || [],
      notes: '', // Notes need a separate fetch usually
      followUpDate: '', // Follow-ups need a separate fetch usually
    });

    // Fetch notes and followups for this lead
    if (conv.leadId) {
      loadLeadDetails(conv.leadId);
    }

    // Mark as read
    if (conv.unreadCount && conv.unreadCount > 0) {
      markThreadAsRead(conv.leadId, conv.phoneNumber);
    }
  };

  const toggleBulk = (id: string, checked: boolean) => {
    setBulkSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const selectedIds = useMemo(() => Object.keys(bulkSelected).filter((k) => bulkSelected[k]), [bulkSelected]);
  const bulkClear = () => setBulkSelected({});

  const loadLeadDetails = async (leadId: string) => {
    try {
      const [notesRes, followupsRes] = await Promise.all([
        crmFetch(`/api/admin/crm/leads/${leadId}/notes`),
        crmFetch(`/api/admin/crm/leads/${leadId}/followups`, { params: { status: 'open' } })
      ]);

      setSidebarData(prev => ({
        ...prev,
        notes: notesRes?.notes?.[0]?.note || '', // Simplification: show latest note
        followUpDate: followupsRes?.followups?.[0]?.dueAt?.split('T')[0] || '', // Simplification: show next followup
      }));
    } catch (err) {
      console.error('Failed to load lead details:', err);
    }
  };

  const markThreadAsRead = async (leadId?: string, phoneNumber?: string) => {
    if (!leadId && !phoneNumber) return;
    try {
      await crmFetch('/api/admin/crm/messages', {
        method: 'PUT',
        body: { leadId, phoneNumber, action: 'markThreadAsRead' }
      });
      // Optionally refresh conversations to update unread counts
      loadConversations(searchQuery);
    } catch (err) {
      console.error('Failed to mark thread as read:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!selected || !composerText.trim() || sending) return;

    setSending(true);
    try {
      const leadId = selected.leadId;
      const phoneNumber = selected.phoneNumber || selected._id;
      
      await crmFetch(`/api/admin/crm/whatsapp/send`, {
        method: 'POST',
        body: {
          leadId,
          phoneNumber,
          messageContent: composerText,
        },
      });
      setComposerText('');
      // Refresh messages and conversations
      await Promise.all([
        loadMessages(leadId || phoneNumber),
        loadConversations(searchQuery)
      ]);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSaveSidebar = async () => {
    if (!selected || !selected.leadId) return;
    setSavingSidebar(true);
    try {
      // 1. Update Lead Status & Labels
      const updateLeadPromise = crmFetch(`/api/admin/crm/leads/${selected.leadId}`, {
        method: 'PUT',
        body: {
          status: sidebarData.status,
          labels: sidebarData.labels,
        }
      });

      const addNotePromise = sidebarData.notes.trim() 
        ? crmFetch(`/api/admin/crm/leads/${selected.leadId}/notes`, {
            method: 'POST',
            body: { note: sidebarData.notes }
          })
        : Promise.resolve();

      const addFollowupPromise = sidebarData.followUpDate 
        ? crmFetch(`/api/admin/crm/leads/${selected.leadId}/followups`, {
            method: 'POST',
            body: { dueAt: sidebarData.followUpDate, title: 'Follow up from Meta Inbox' }
          })
        : Promise.resolve();

      await Promise.all([updateLeadPromise, addNotePromise, addFollowupPromise]);
      
      loadConversations(searchQuery);
    } catch (err) {
      console.error('Failed to save sidebar data:', err);
    } finally {
      setSavingSidebar(false);
    }
  };

  // Quick reply handler
  const handleQuickReply = (text: string) => {
    setComposerText(text);
    setActionModal(null);
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const lower = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.name?.toLowerCase().includes(lower) || 
      c.phoneNumber?.includes(lower)
    );
  }, [conversations, searchQuery]);

  const anyChecked = selectedIds.length > 0;
  const allChecked = useMemo(() => {
    if (filteredConversations.length === 0) return false;
    return filteredConversations.every((c) => bulkSelected[c._id]);
  }, [filteredConversations, bulkSelected]);

  const setAllChecked = (checked: boolean) => {
    setBulkSelected((prev) => {
      const next = { ...prev };
      for (const c of filteredConversations) next[c._id] = checked;
      return next;
    });
  };

  // Add Lead Modal & Form
  const modal = useModal();
  const form = useForm<LeadFormValues>({
    initialValues: {
      name: '',
      email: '',
      phoneNumber: '',
      source: 'website',
      status: 'lead',
      workshopName: '',
      assignedToUserId: '',
    },
    onSubmit: async (values) => {
      try {
        const response = await fetch('/api/admin/crm/leads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
        const data = await response.json();
        if (!response.ok) {
           throw new Error(data.error || 'Failed to create lead');
        }
        modal.close();
        form.resetForm();
        loadConversations(searchQuery); 
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to create lead');
      }
    },
  });

  const handleAIFix = async () => {
    if (!composerText.trim()) return;
    setIsFixing(true);
    try {
      const res = await fetch('/api/admin/crm/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: composerText,
          mode: 'fix'
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        setComposerText(data.result);
      }
    } catch (err) {
      console.error('AI Fix failed:', err);
    } finally {
      setIsFixing(false);
    }
  };

  const handleAIReply = async () => {
    setIsReplying(true);
    try {
      // Get last inbound message for context
      const lastInbound = messages.filter(m => m.direction === 'inbound').pop();
      const context = lastInbound ? lastInbound.messageContent : '';

      const res = await fetch('/api/admin/crm/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: 'reply',
          context
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        setComposerText(data.result);
      }
    } catch (err) {
      console.error('AI Reply failed:', err);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="bg-white text-slate-900 h-screen flex flex-col font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="border-b border-slate-200/80 px-4 py-3 flex items-center justify-between bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.02),0_1px_2px_0_rgba(0,0,0,0.06)] shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3.5 group cursor-pointer" onClick={() => router.push('/admin/crm')}>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 via-emerald-500 to-indigo-600 p-[1.5px] shadow-lg transition-transform hover:scale-105 active:scale-95 duration-200">
              <div className="h-full w-full rounded-[14px] bg-white flex items-center justify-center">
                <img src="/logo.png" alt="Swar Yoga" className="h-7 w-7" />
              </div>
            </div>
            <div className="leading-tight">
              <h1 className="text-[17px] font-[900] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">Meta Inbox</h1>
              <p className="text-[11px] font-[700] text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-wider">WhatsApp Portal</p>
            </div>
          </div>

          <nav className="flex gap-1 bg-slate-100/80 border border-slate-200/60 rounded-2xl p-1.5 shadow-inner">
            {['Leads', 'Followup', 'Sales', 'Messages', 'Analytics', 'Home'].map((tab) => (
              <button 
                key={tab}
                onClick={() => goToTab(tab)}
                className={`px-4 py-2 text-[12px] font-extrabold rounded-xl transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-white text-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.12)] ring-1 ring-blue-100/50 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border transition-all active:scale-95 ${
              isBotMode 
                ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/30 ring-2 ring-violet-500/20' 
                : 'bg-white text-slate-500 border-slate-200/60 hover:border-violet-200 hover:text-violet-600'
            }`}
            onClick={() => setIsBotMode(!isBotMode)}
            title="Toggle AI Auto-Reply"
          >
             <i className={`ph-fill ph-robot text-lg ${isBotMode ? 'animate-pulse' : ''}`}></i>
             <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">{isBotMode ? 'AI Active' : 'AI Offline'}</span>
          </button>

          <button
            className="p-2.5 text-slate-500 hover:text-blue-700 hover:bg-white rounded-2xl border border-slate-200/60 hover:border-blue-200 transition-all hover:shadow-md active:scale-90"
            title="Chatbot Config"
            onClick={() => router.push('/admin/crm/chatbots')}
          >
            <i className="ph-fill ph-gear text-xl"></i>
          </button>
          <button
            className="p-2.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-2xl border border-slate-200/60 hover:border-emerald-200 transition-all hover:shadow-md active:scale-90"
            title="Automation"
            onClick={() => router.push('/admin/crm/automation')}
          >
            <i className="ph-fill ph-lightning text-xl"></i>
          </button>
          <button
            className="p-2.5 text-slate-500 hover:text-indigo-700 hover:bg-white rounded-2xl border border-slate-200/60 hover:border-indigo-200 transition-all hover:shadow-md active:scale-90"
            title="Templates"
            onClick={() => router.push('/admin/crm/templates')}
          >
            <i className="ph-fill ph-note text-xl"></i>
          </button>
          <button
            className="p-2.5 text-slate-500 hover:text-red-700 hover:bg-white rounded-2xl border border-slate-200/60 hover:border-red-200 transition-all hover:shadow-md active:scale-90"
            title="Broadcast"
            onClick={() => router.push('/admin/crm/broadcast')}
          >
            <i className="ph-fill ph-megaphone text-xl"></i>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden bg-white">

        {/* LEFT CHAT LIST */}
        <aside className="w-80 border-r border-slate-200/70 flex flex-col bg-white overflow-hidden">

          <div className="p-4 border-b border-slate-200/70 flex gap-2.5 items-center shrink-0 bg-white">
            <div className="relative flex-1 group">
              <i className="ph ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
              <input 
                className="w-full border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-[13px] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all bg-slate-50/50 placeholder:text-slate-400 font-medium" 
                placeholder="Search name or phone..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="p-3 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl border border-red-200/50 transition-all shadow-sm hover:shadow-lg active:scale-90"
              title="Add New Lead"
              onClick={modal.open}
              type="button"
            >
              <i className="ph ph-plus-bold text-lg"></i>
            </button>
          </div>

          {/* Diagnostics panel (quick verification for inbound messages) */}
          <div className="px-4 py-3 border-b border-slate-200/70 bg-slate-50/50">
            <div className="text-[11px] font-extrabold text-slate-700 tracking-wide">Diagnostics</div>

            {crmError ? (
              <div className="mt-2 text-[12px] font-semibold text-red-700">
                {crmError}
              </div>
            ) : null}

            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 border border-slate-200/80 rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 bg-white"
                placeholder="Phone (e.g. 9075358557)"
                value={diagPhone}
                onChange={(e) => setDiagPhone(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-2 rounded-xl text-[12px] font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={() => runDiagnostics(diagPhone)}
                disabled={!token || diagLoading}
                title="Run diagnostics for this phone"
              >
                {diagLoading ? '...' : 'Debug'}
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="flex-1 px-3 py-2 rounded-xl text-[12px] font-extrabold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 disabled:opacity-60"
                onClick={() => {
                  const p = selected?.phoneNumber || '';
                  setDiagPhone(p);
                  runDiagnostics(p);
                }}
                disabled={!token || !selected?.phoneNumber || diagLoading}
                title="Debug selected conversation"
              >
                Debug selected
              </button>
              <button
                type="button"
                className="flex-1 px-3 py-2 rounded-xl text-[12px] font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-60"
                onClick={() => {
                  setDiagResult(null);
                  setDiagError(null);
                }}
                disabled={diagLoading}
              >
                Clear
              </button>
            </div>

            {diagError ? (
              <div className="mt-2 text-[12px] font-semibold text-red-700">{diagError}</div>
            ) : null}

            {diagResult?.ok ? (
              <div className="mt-2 rounded-xl border border-slate-200/70 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] font-extrabold text-slate-800">
                    Phone: <span className="font-black">{diagResult.phone}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    msgs: {diagResult.counts.messages} • events: {diagResult.counts.webhookEvents}
                  </div>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-slate-600">
                  Lead: {diagResult.lead ? `${diagResult.lead.name || 'Unnamed'} (${diagResult.lead.status || 'lead'})` : 'Not found'}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                    <div className="text-[10px] font-extrabold text-slate-600">Latest message</div>
                    <div className="text-[11px] font-semibold text-slate-800 truncate">
                      {diagResult.messages?.[0]
                        ? `${diagResult.messages[0].direction}: ${diagResult.messages[0].messageContent || ''}`
                        : '—'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {diagResult.messages?.[0]?.createdAt ? new Date(diagResult.messages[0].createdAt).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                    <div className="text-[10px] font-extrabold text-slate-600">Latest webhook</div>
                    <div className="text-[11px] font-semibold text-slate-800 truncate">
                      {diagResult.webhookEvents?.[0]
                        ? `${diagResult.webhookEvents[0].kind || 'event'}: ${diagResult.webhookEvents[0].status || ''}`
                        : '—'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {diagResult.webhookEvents?.[0]?.receivedAt ? new Date(diagResult.webhookEvents[0].receivedAt).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-semibold text-slate-500">
                  Tip: Send a WhatsApp message now, then click Debug again. If “events” increases but “msgs” doesn’t, webhook logging works but message persistence needs attention.
                </div>
              </div>
            ) : null}
          </div>

          {/* Bulk select + actions */}
          <div className="px-4 py-2 border-b border-slate-200/70 bg-white flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={allChecked}
                onChange={(e) => setAllChecked(e.target.checked)}
              />
              Check all
            </label>
            <span className="ml-auto text-[11px] font-semibold text-slate-500">
              {anyChecked ? `${selectedIds.length} selected` : `${filteredConversations.length} total`}
            </span>
          </div>

          {anyChecked ? (
            <div className="px-4 py-2 border-b border-slate-200/70 bg-white flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
                onClick={() => {
                  // Minimal bulk action: mark read by phoneNumber where possible
                  const toMark = filteredConversations.filter((c) => bulkSelected[c._id]);
                  toMark.forEach((c) => markThreadAsRead(c.leadId, c.phoneNumber));
                  bulkClear();
                }}
              >
                Mark read
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
                onClick={() => {
                  router.push('/admin/crm/leads');
                }}
              >
                Bulk assign
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100"
                onClick={() => {
                  router.push('/admin/crm/labels');
                }}
              >
                Bulk labels
              </button>
              <button
                type="button"
                className="ml-auto px-3 py-1.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-700 hover:bg-red-100 border border-red-100"
                onClick={bulkClear}
              >
                Clear
              </button>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto">
            {crmLoading && conversations.length === 0 ? (
              <div className="p-10 flex justify-center"><LoadingSpinner /></div>
            ) : (
              filteredConversations.map((conv) => (
                <div 
                  key={conv._id} 
                  onClick={() => handleSelectConversation(conv)}
                  className={`px-4 py-4 border-b border-slate-100/60 flex gap-3 items-start cursor-pointer transition-all duration-200 group relative ${
                    selected?._id === conv._id
                      ? 'bg-blue-50/60 border-l-[5px] border-l-blue-600 shadow-[inset_0_0_15px_rgba(59,130,246,0.08)]'
                      : 'hover:bg-slate-50/80 border-l-[5px] border-l-transparent'
                  }`}
                >
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4.5 w-4.5 rounded-lg border-slate-300 text-blue-600 focus:ring-offset-0 focus:ring-blue-500 transition-all transform group-hover:scale-110"
                      checked={!!bulkSelected[conv._id]}
                      onChange={(e) => toggleBulk(conv._id, e.target.checked)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-[800] text-slate-900 truncate tracking-tight text-[14px]">
                        {conv.name || conv.phoneNumber}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100/50 px-2 py-0.5 rounded-lg shrink-0">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString([], { day: '2-digit', month: 'short' }) : 'Jan 10'}
                      </div>
                    </div>
                    
                    <div className="text-[11px] font-semibold text-slate-500 truncate opacity-70 mb-1.5 flex flex-wrap items-center gap-2">
                       {/* Lead ID Display */}
                       {conv.leadNumber && (
                         <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200">
                           #{conv.leadNumber}
                         </span>
                       )}
                       <span className="flex items-center gap-1">
                         <i className="ph ph-phone-call text-[10px]"></i>
                         <span>{conv.phoneNumber}</span>
                       </span>
                    </div>

                    {/* Labels Display */}
                    {conv.labels && conv.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {conv.labels.slice(0, 3).map((label, idx) => (
                          <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100 truncate max-w-[80px]">
                            {label}
                          </span>
                        ))}
                        {conv.labels.length > 3 && (
                          <span className="text-[9px] text-slate-400 px-1">+ {conv.labels.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${conv.unreadCount ? 'bg-blue-600' : 'bg-emerald-500'}`}></span>
                      {/* NEW: User ID Button */}
                      <span className={`text-[9px] font-[900] px-2 py-1 rounded-lg bg-pink-50 text-pink-700 border border-pink-200 uppercase tracking-wide`} title="User ID">
                        ID: {conv.leadNumber || 'N/A'}
                      </span>

                      {/* Status Button */}
                      <span className={`text-[9px] font-[900] px-2.5 py-1 rounded-lg uppercase tracking-[0.05em] border ${
                        (conv.status || 'lead').toLowerCase() === 'customer' 
                          ? 'text-indigo-700 bg-indigo-50 border-indigo-100'
                          : (conv.status || 'lead').toLowerCase() === 'prospect'
                            ? 'text-amber-700 bg-amber-50 border-amber-100'
                            : (conv.status || 'lead').toLowerCase() === 'inactive'
                              ? 'text-slate-500 bg-slate-100 border-slate-200'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                      }`}>
                        {conv.status || 'Lead'}
                      </span>

                      {/* NEW: Labels Count/First Label Button */}
                      <span className="text-[9px] font-[900] px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 uppercase tracking-wide truncate max-w-[80px]" title="Main Label">
                        {conv.labels?.[0] || 'No Label'}
                      </span>

                      {conv.unreadCount ? (
                        <span className="ml-auto bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-[0_4px_10px_rgba(37,99,235,0.3)] animate-pulse">
                          {conv.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

    {/* CHAT AREA */}
    <main className="flex-1 flex flex-col bg-white overflow-hidden shadow-2xl relative z-10">

          {selected ? (
            <>
              <div className="border-b border-slate-200/70 px-6 py-4 flex gap-4 items-center bg-white/95 backdrop-blur-md sticky top-0 z-30 shrink-0 shadow-sm">
                <div className="flex items-center gap-3 mr-4">
                   <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shadow-sm">
                      <i className="ph ph-user text-xl"></i>
                   </div>
                   <div>
                     <div className="text-[15px] font-[900] text-slate-900 leading-none">{selected.name || "Unknown User"}</div>
                     <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{selected.phoneNumber}</div>
                   </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    className={`p-2 rounded-xl border transition-all ${
                      assignOpen
                        ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50 border-slate-200/70'
                    }`}
                    title="Assign User"
                    onClick={() => {
                      setAssignOpen((v) => !v);
                      setLabelOpen(false);
                    }}
                  >
                    <i className="ph ph-user-plus text-lg"></i>
                  </button>

                  {assignOpen ? (
                    <div className="absolute top-full mt-2 left-0 w-[220px] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50">
                      <div className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 px-2 py-1">
                        Assign to
                      </div>
                      <div className="space-y-1">
                        {assignOptions.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full px-3 py-2 text-sm text-left rounded-xl hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors"
                            onClick={() => {
                              setSidebarData((prev) => ({ ...prev }));
                              // Save assignment via existing lead update (if leadId exists)
                              if (selected?.leadId) {
                                crmFetch(`/api/admin/crm/leads/${selected.leadId}`, {
                                  method: 'PUT',
                                  body: { assignedToUserId: u.id },
                                }).catch((e) => console.error('Assign failed', e));
                              }
                              setAssignOpen(false);
                            }}
                          >
                            {u.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-sm text-left rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
                          onClick={() => {
                            router.push('/admin/crm/permissions');
                            setAssignOpen(false);
                          }}
                        >
                          Manage users…
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    className={`p-2 rounded-xl border transition-all ${
                      labelOpen
                        ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                        : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border-slate-200/70'
                    }`}
                    title="Label"
                    onClick={() => {
                      setLabelOpen((v) => !v);
                      setAssignOpen(false);
                    }}
                  >
                    <i className="ph ph-tag text-lg"></i>
                  </button>

                  {labelOpen ? (
                    <div className="absolute top-full mt-2 left-0 w-[260px] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50">
                      <div className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 px-2 py-1">
                        Labels
                      </div>
                      <div className="flex flex-wrap gap-1 px-1 py-1">
                        {(sidebarData.labels || []).map((l) => (
                          <button
                            key={l}
                            type="button"
                            className="px-2 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-colors"
                            title="Remove"
                            onClick={() =>
                              setSidebarData((prev) => ({
                                ...prev,
                                labels: prev.labels.filter((x) => x !== l),
                              }))
                            }
                          >
                            {l} ×
                          </button>
                        ))}
                      </div>
                      <div className="mt-1 space-y-1">
                        {labelOptions.map((l) => (
                          <button
                            key={l}
                            type="button"
                            className="w-full px-3 py-2 text-sm text-left rounded-xl hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition-colors"
                            onClick={() => {
                              setSidebarData((prev) => ({
                                ...prev,
                                labels: prev.labels.includes(l) ? prev.labels : [...prev.labels, l],
                              }));
                              setLabelOpen(false);
                            }}
                          >
                            {l}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-sm text-left rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
                          onClick={() => {
                            router.push('/admin/crm/labels');
                            setLabelOpen(false);
                          }}
                        >
                          Manage labels…
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <button 
                  className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-200/70 transition-all" 
                  title="Read or Unread"
                  onClick={() => markThreadAsRead(selected.leadId, selected.phoneNumber)}
                >
                  <i className="ph ph-check text-lg"></i>
                </button>
                <button
                  className={`p-2 rounded-xl border transition-all ${showSidebar ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-slate-600 hover:bg-slate-50 border-slate-200/70'}`}
                  title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  <i className={`ph ${showSidebar ? 'ph-sidebar-simple' : 'ph-sidebar'} text-lg`}></i>
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-70"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-[11px] font-extrabold text-red-700 uppercase tracking-widest bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                    {windowRemaining
                      ? `24h window • ${String(windowRemaining.hh).padStart(2, '0')}:${String(windowRemaining.mm).padStart(2, '0')}:${String(windowRemaining.ss).padStart(2, '0')}`
                      : '24h window'}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto bg-white flex flex-col gap-5">
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <i className="ph ph-chat-circle-dots text-5xl opacity-20"></i>
                    <p className="text-sm font-semibold">No messages yet</p>
                    <p className="text-xs text-slate-400">Send a hello to start the conversation.</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div 
                        key={msg._id} 
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[72%] px-6 py-4 rounded-3xl text-[15px] relative group transition-all duration-300 hover:scale-[1.01] ${
                          msg.direction === 'outbound'
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-[0_8px_20px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/10'
                            : 'bg-emerald-500 text-white rounded-tl-none shadow-[0_8px_15px_rgba(16,185,129,0.15)] border border-emerald-400'
                        }`}>
                          <div className="whitespace-pre-wrap leading-relaxed font-medium">{msg.messageContent}</div>
                          <div className={`text-[10px] mt-2.5 flex items-center gap-1.5 ${msg.direction === 'outbound' ? 'justify-end text-blue-100' : 'justify-start text-emerald-50 font-[800]'}`}>
                            <span className="uppercase tracking-wider">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.direction === 'outbound' && (
                              <div className="flex items-center">
                                <i className={`ph ph-checks text-xs ${msg.status === 'read' ? 'text-emerald-300 drop-shadow-[0_0_5px_rgba(110,231,183,1)]' : 'text-blue-200'}`}></i>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="border-t border-slate-200/80 p-6 bg-white/95 backdrop-blur-md shrink-0 z-30">
                <div className="flex items-end gap-3 max-w-6xl mx-auto">
                  
                  {/* Quick Actions (Plus Button) */}
                  <div className="relative group self-end mb-1">
                    <button
                      type="button"
                      onClick={() => setQuickActionsOpen((v) => !v)}
                      className={`h-10 w-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300 active:scale-95 ${
                        quickActionsOpen
                          ? 'border-blue-500 text-blue-700 ring-2 ring-blue-500/10'
                          : 'text-slate-400 hover:text-blue-600 hover:border-blue-300'
                      }`}
                      title="Quick actions"
                    >
                      <i className="ph-bold ph-lightning text-[20px]"></i>
                    </button>

                    {quickActionsOpen ? (
                      <div className="absolute bottom-full mb-3 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl flex-col p-2 min-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                        <div className="px-2 py-1.5 flex items-center justify-between">
                          <div className="text-xs font-extrabold tracking-widest uppercase text-slate-400">Actions</div>
                          <button
                            type="button"
                            onClick={() => setQuickActionsOpen(false)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50"
                            title="Close"
                          >
                            <i className="ph ph-x"></i>
                          </button>
                        </div>

                        <div className="space-y-1 px-1 pb-1">
                          <button
                            type="button"
                            onClick={() => openAction('quick')}
                            className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-lightning text-lg"></i>
                            Quick message
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('schedule')}
                            className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-calendar-plus text-lg"></i>
                            Schedule message
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('template')}
                            className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-note text-lg"></i>
                            Template
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('delay')}
                            className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-timer text-lg"></i>
                            Delay message
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction('repeat')}
                            className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <i className="ph ph-repeat text-lg"></i>
                            Repeat mode
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Main Input Box with Top Toolbar */}
                  <div className="flex-1 border-2 border-slate-100 rounded-3xl bg-slate-50/50 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all shadow-sm relative z-20">
                      
                      {/* Top Toolbar */}
                      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200/50 bg-white/50 rounded-t-3xl relative">
                          <button onClick={() => handleToolAction('bold')} title="Bold" className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"><i className="ph ph-text-bolder text-lg"></i></button>
                          <button onClick={() => handleToolAction('italic')} title="Italic" className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"><i className="ph ph-text-italic text-lg"></i></button>
                          
                          {/* Emoji Toggle */}
                          <button 
                            onClick={() => handleToolAction('emoji')} 
                            title="Emoji" 
                            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${showEmojiPicker ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                          >
                            <i className="ph ph-smiley text-lg"></i>
                          </button>

                           {/* AI Tools */}
                           <div className="flex items-center gap-1 mx-1 pl-2 border-l border-slate-200/60">
                             <button
                               onClick={handleAIFix}
                               disabled={isFixing || !composerText}
                               className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isFixing ? 'bg-violet-100 text-violet-700' : 'text-violet-600 hover:bg-violet-50'}`}
                               title="AI Spell Check"
                             >
                               {isFixing ? <LoadingSpinner size="sm"/> : <i className="ph-fill ph-magic-wand text-lg"></i>}
                               <span className="hidden xl:inline">Fix Spelling</span>
                             </button>

                             <button
                               onClick={handleAIReply}
                               disabled={isReplying}
                               className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isReplying ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-fuchsia-600 hover:bg-fuchsia-50'}`}
                               title="Generate AI Reply"
                             >
                               {isReplying ? <LoadingSpinner size="sm"/> : <i className="ph-fill ph-sparkle text-lg"></i>}
                               <span className="hidden xl:inline">AI Suggest</span>
                             </button>
                           </div>

                           {/* Translator Button Component */}
                           <LanguageSelector 
                              currentText={composerText} 
                              onTextTranslated={(t) => setComposerText(t)}
                              onTranslate={handleTranslationCall}
                           />
                          
                          <div className="w-px h-4 bg-slate-300/50 mx-2"></div>

                          {/* Attachment Button */}
                          <div className="relative">
                            <button 
                                onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)} 
                                title="Attach" 
                                className={`h-8 px-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold ${attachmentMenuOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
                            >
                                <i className="ph ph-paperclip text-lg"></i>
                                <span className="hidden sm:inline">Attach</span>
                            </button>
                            {/* Attachment Popup */}
                            {attachmentMenuOpen && (
                                <div className="absolute bottom-full mb-3 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col p-2 min-w-[180px] z-50 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="text-[10px] font-extrabold uppercase text-slate-400 px-3 py-1.5 tracking-wider">Add Attachment</div>
                                    <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-xl text-left transition-colors" onClick={() => { handleToolAction('image'); setAttachmentMenuOpen(false); }}>
                                        <div className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><i className="ph-fill ph-image"></i></div> Image
                                    </button>
                                    <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-xl text-left transition-colors" onClick={() => { handleToolAction('video'); setAttachmentMenuOpen(false); }}>
                                        <div className="h-6 w-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600"><i className="ph-fill ph-video-camera"></i></div> Video
                                    </button>
                                    <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-xl text-left transition-colors" onClick={() => { handleToolAction('document'); setAttachmentMenuOpen(false); }}>
                                        <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><i className="ph-fill ph-file-text"></i></div> Document
                                    </button>
                                </div>
                            )}
                          </div>

                          {/* Emoji Picker Popover */}
                          {showEmojiPicker && (
                            <div className="absolute bottom-full mb-2 left-0 z-50 shadow-2xl rounded-2xl border border-slate-200">
                              <EmojiPicker 
                                theme={Theme.LIGHT} 
                                onEmojiClick={(e) => {
                                  appendToComposer(e.emoji);
                                  setShowEmojiPicker(false);
                                }}
                                width={300}
                                height={350}
                              />
                            </div>
                          )}
                      </div>
                      
                      {/* Hidden File Input */}
                      <input 
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        accept={uploadType === 'image' ? "image/*" : uploadType === 'video' ? "video/*" : "*"}
                      />

                      <textarea 
                          className="w-full px-5 py-3 bg-transparent border-none focus:ring-0 resize-none max-h-40 min-h-[52px] placeholder:text-slate-400 font-medium text-slate-700 text-[15px]" 
                          placeholder="Type your message..."
                          rows={1}
                          value={composerText}
                          onChange={(e) => setComposerText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                  </div>

                  <button 
                    onClick={handleSendMessage}
                    disabled={!composerText.trim() || sending}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 rounded-2xl font-[900] text-sm shadow-[0_8px_25px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_30px_rgba(37,99,235,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:transform-none flex items-center gap-2 mb-1"
                  >
                    {sending ? <LoadingSpinner size="sm" /> : <i className="ph-bold ph-paper-plane-right text-lg"></i>}
                    <span className="uppercase tracking-wider hidden xl:inline">Send</span>
                  </button>
                </div>
              </div>

              {/* Quick-action modal (UI now, wiring later) */}
              {actionModal ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                  <button
                    type="button"
                    className="absolute inset-0 bg-slate-900/20"
                    onClick={closeActionModal}
                    aria-label="Close"
                  />
                  <div className="relative w-[min(560px,92vw)] rounded-2xl bg-white border border-slate-200 shadow-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-extrabold tracking-widest uppercase text-slate-400">
                          {actionModal.type === 'quick'
                            ? 'Quick message'
                            : actionModal.type === 'schedule'
                              ? 'Schedule message'
                              : actionModal.type === 'template'
                                ? 'Templates'
                                : actionModal.type === 'delay'
                                  ? 'Delay message'
                                  : 'Repeat mode'}
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {selected ? selected.name || selected.phoneNumber : 'No lead selected'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="p-2 rounded-xl text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-200/70"
                        onClick={closeActionModal}
                        title="Close"
                      >
                        <i className="ph ph-x text-lg"></i>
                      </button>
                    </div>

                    {actionModal.type === 'delay' ? (
                      <div className="mt-4">
                        <div className="text-sm font-bold text-slate-700 mb-2">Delay duration</div>
                        <div className="grid grid-cols-4 gap-2">
                          {(
                            [
                              ['days', 'Days'],
                              ['hours', 'Hours'],
                              ['minutes', 'Minutes'],
                              ['seconds', 'Seconds'],
                            ] as const
                          ).map(([k, label]) => (
                            <label key={k} className="text-xs font-semibold text-slate-600">
                              <span className="block mb-1">{label}</span>
                              <input
                                type="number"
                                min={0}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                value={delayConfig[k]}
                                onChange={(e) =>
                                  setDelayConfig((prev) => ({
                                    ...prev,
                                    [k]: Math.max(0, Number(e.target.value || 0)),
                                  }))
                                }
                              />
                            </label>
                          ))}
                        </div>
                        <div className="mt-4 text-right">
                          <button
                            type="button"
                            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-extrabold text-sm shadow-sm"
                            onClick={() => {
                              console.log('Delay config:', delayConfig);
                              closeActionModal();
                            }}
                            disabled={!selected}
                          >
                            Save delay
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {actionModal.type === 'repeat' ? (
                      <div className="mt-4">
                        <div className="text-sm font-bold text-slate-700 mb-2">Repeat mode</div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs font-semibold text-slate-600">
                            <span className="block mb-1">Mode</span>
                            <select
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                              value={repeatConfig.mode}
                              onChange={(e) =>
                                setRepeatConfig((prev) => ({
                                  ...prev,
                                  mode: e.target.value as any,
                                }))
                              }
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                              <option value="custom">Custom</option>
                            </select>
                          </label>
                          <label className="text-xs font-semibold text-slate-600">
                            <span className="block mb-1">Custom rule</span>
                            <input
                              type="text"
                              placeholder="e.g. every 2 days at 10:00"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                              value={repeatConfig.customText}
                              onChange={(e) =>
                                setRepeatConfig((prev) => ({
                                  ...prev,
                                  customText: e.target.value,
                                }))
                              }
                              disabled={repeatConfig.mode !== 'custom'}
                            />
                          </label>
                        </div>
                        <div className="mt-4 text-right">
                          <button
                            type="button"
                            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-extrabold text-sm shadow-sm"
                            onClick={() => {
                              console.log('Repeat config:', repeatConfig);
                              closeActionModal();
                            }}
                            disabled={!selected}
                          >
                            Save repeat
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Quick Reply CRUD UI */}
                    {actionModal.type === 'quick' ? (
                      <div className="mt-4">
                        <div className="text-sm font-bold text-slate-700 mb-2">Manage Quick Replies</div>
                        
                        {/* Add New */}
                        <div className="flex gap-2 mb-4">
                          <input 
                            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            placeholder="Type new quick reply..."
                            value={newQuickReply}
                            onChange={(e) => setNewQuickReply(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (newQuickReply.trim()) {
                                  setQuickReplies(prev => [...prev, { id: Date.now().toString(), text: newQuickReply }]);
                                  setNewQuickReply('');
                                }
                              }
                            }}
                          />
                          <button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-sm font-bold"
                            onClick={() => {
                              if (newQuickReply.trim()) {
                                setQuickReplies(prev => [...prev, { id: Date.now().toString(), text: newQuickReply }]);
                                setNewQuickReply('');
                              }
                            }}
                          >
                            Add
                          </button>
                        </div>

                        {/* List */}
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {quickReplies.map(qr => (
                            <div key={qr.id} className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-all">
                              <p 
                                className="text-sm text-slate-700 font-medium cursor-pointer flex-1"
                                onClick={() => {
                                  appendToComposer(qr.text);
                                  closeActionModal();
                                }}
                              >
                                {qr.text}
                              </p>
                              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickReplies(prev => prev.filter(p => p.id !== qr.id));
                                  }}
                                  title="Delete"
                                >
                                  <i className="ph ph-trash"></i>
                                </button>
                              </div>
                            </div>
                          ))}
                          {quickReplies.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-4 italic">No quick replies yet.</p>
                          )}
                        </div>

                      </div>
                    ) : null}

                    {actionModal.type === 'schedule' || actionModal.type === 'template' ? (
                      <div className="mt-4">
                        <div className="text-sm font-semibold text-slate-700">
                          This is wired as UI first.
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Next we can connect it to templates/scheduler APIs and storage.
                        </div>
                        <div className="mt-4 text-right">
                          <button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-extrabold text-sm shadow-sm"
                            onClick={closeActionModal}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white text-slate-300 gap-4">
              <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200/70">
                <i className="ph ph-whatsapp-logo text-6xl text-slate-200"></i>
              </div>
              <p className="font-semibold text-lg text-slate-500">Select a conversation to start chatting</p>
              <p className="text-xs text-slate-400">Your chats will appear here.</p>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        {showSidebar && (
          <aside className="w-72 border-l border-slate-200/70 p-4 overflow-y-auto bg-white shrink-0">
            {selected ? (
              <>
              <div className="flex items-center gap-3 mb-6 p-1 border-b border-slate-200/70 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
                  {selected.name ? selected.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 leading-tight">{selected.name || selected.phoneNumber}</h3>
                  <p className="text-xs text-slate-500">{selected.phoneNumber}</p>
                </div>
              </div>

              <div className="space-y-6">
                <section>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">CRM Details</label>
                  <div className="space-y-2.5">
                    <div className="flex flex-col gap-1 text-sm py-1.5 border-b border-gray-50">
                      <span className="text-slate-500 text-[10px] uppercase font-extrabold opacity-70">Status</span>
                      <select 
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50 font-semibold text-blue-700"
                        value={sidebarData.status}
                        onChange={(e) => setSidebarData({ ...sidebarData, status: e.target.value })}
                      >
                        <option value="lead">Lead</option>
                        <option value="prospect">Prospect</option>
                        <option value="customer">Customer</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                      <span className="text-slate-500">Assigned To</span>
                      <span className="font-semibold text-slate-900">Admin</span>
                    </div>
                  </div>
                </section>

                <section>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Labels</label>
                  <select 
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-slate-50"
                    value={sidebarData.labels[0] || ''}
                    onChange={(e) => setSidebarData({ ...sidebarData, labels: [e.target.value] })}
                  >
                    <option value="">Select label...</option>
                    {labelOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </section>

                <section>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Internal Notes</label>
                  <textarea 
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[110px] bg-slate-50 placeholder:text-slate-400"
                    placeholder="Add a remark about this customer..."
                    value={sidebarData.notes}
                    onChange={(e) => setSidebarData({ ...sidebarData, notes: e.target.value })}
                  />
                </section>

                <section>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Follow Up Schedule</label>
                  <div className="relative">
                    <i className="ph ph-calendar absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                      type="date"
                      className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-slate-50" 
                      value={sidebarData.followUpDate}
                      onChange={(e) => setSidebarData({ ...sidebarData, followUpDate: e.target.value })}
                    />
                  </div>
                </section>

                <button 
                  onClick={handleSaveSidebar}
                  disabled={savingSidebar}
                  className="w-full bg-blue-600 text-white flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-extrabold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingSidebar ? <LoadingSpinner size="sm" /> : <i className="ph ph-floppy-disk text-lg"></i>}
                  <span>Save Changes</span>
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 space-y-2">
              <i className="ph ph-user-circle text-6xl"></i>
              <p className="text-xs font-bold uppercase tracking-widest text-center px-4">Select lead for info</p>
            </div>
          )}
        </aside>
        )}

      </div>

      {/* Create Lead Modal */}
      {modal.isOpen && (
        <FormModal
          isOpen={true}
          onClose={modal.close}
          onSubmit={form.handleSubmit}
          title="Create New Lead"
          submitLabel="Create Lead"
          cancelLabel="Cancel"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 text-sm mb-2 font-semibold">Name *</label>
              <input
                type="text"
                required
                name="name"
                value={form.values.name}
                onChange={form.handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                placeholder="Lead name"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm mb-2 font-semibold">Email *</label>
              <input
                type="email"
                required
                name="email"
                value={form.values.email}
                onChange={form.handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm mb-2 font-semibold">Phone Number *</label>
              <input
                type="tel"
                required
                name="phoneNumber"
                value={form.values.phoneNumber}
                onChange={form.handleChange}
                onBlur={(e) => {
                  const normalized = normalizePhoneForMeta(e.target.value);
                  if (normalized) form.setFieldValue('phoneNumber', normalized);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                placeholder="+919876543210"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm mb-2 font-semibold">Source</label>
              <select
                name="source"
                value={form.values.source}
                onChange={form.handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 text-sm mb-2 font-semibold">Status</label>
              <select
                name="status"
                value={form.values.status}
                onChange={form.handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
              >
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </FormModal>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #fff;
        }
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }

        .animate-in {
          animation: animate-in 0.2s ease-out;
        }

        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
